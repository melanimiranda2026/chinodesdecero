"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as EventoPuntero, type ReactNode } from "react";
import { textoHanzi } from "@/lib/silabas";
import { OBJETOS, type EstadoCocina, type ObjetoId } from "./cocina/datos";
import { aspectoDe, centroBase, encuadrar, encuadreInicial, enPantalla, objetoBajo, transformCSS } from "./camara";
import { DibujoObjeto } from "./arte/DibujoObjeto";
import { FondoCuarto } from "./arte/Capa";
import { Vaca } from "./Vaca";
import { Globo } from "./Globo";
import { Opciones } from "./Opciones";
import { PrimerPlano } from "./primer-plano/PrimerPlano";
import { Minimapa } from "./Minimapa";
import { Tarjetas, type CapaTarjeta } from "./Tarjetas";
import { desbloquearAudio } from "./audio/voz";
import { musica } from "./audio/sonido";
import { useCasa, type AlEvento, type CasaApi, type Punto } from "./useCasa";
import { NOMBRES_EVENTO, type NombreEvento } from "@/lib/eventos-nombres";
import { EVENTO_AVANCE, avanceInicial, cargarAviso, cargarAvance, guardarAvance, sincronizar, subirAvance, fusionar, type Avance, type DetalleAvance } from "./avance";
import { registrar } from "./eventos";
import { Correo } from "@/components/pagina/Correo";
import styles from "./Casa.module.css";

const IDS = Object.keys(OBJETOS) as ObjetoId[];
/** Menos de esto (unidades del cuarto) es un toque, no un arrastre. */
const UMBRAL_TOQUE = 12;
/** Distancia a (vaca.x, vaca.y - 100) para que el objeto "llegue" a la vaca. */
const RADIO_VACA = 130;

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const pct = (u: number) => `${u / 10}%`;
/** Una secuencia que falla (p. ej. un onEvento que lanza) se registra; nunca queda como rechazo sin atender. */
const registrarFallo = (e: unknown) => console.error("[casa]", e);

type Inicio =
  | { tipo: "obj"; id: ObjetoId; cx: number; cy: number; movio: boolean }
  | { tipo: "vaca"; cx: number; cy: number; x0: number; y0: number; movio: boolean };

const llegaALaVaca = (p: Punto, vaca: Punto) => Math.hypot(p.x - vaca.x, p.y - (vaca.y - 100)) < RADIO_VACA;

const CONOCIDOS = new Set<string>(NOMBRES_EVENTO);
/** Nombres internos de la casa a nombres del registro de eventos. */
const ALIAS: Record<string, NombreEvento> = { quiz_fin: "quiz_completo" };
const ORDEN_MEDALLA = { bronce: 1, plata: 2, oro: 3 } as const;
const GUARDAR_MS = 500;

export function Casa({ onEvento }: { onEvento?: AlEvento }) {
  const avance = useRef<Avance>(avanceInicial());
  const listo = useRef(false);
  const montado = useRef(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Hubo cambios reales (acción, medalla, escuchada) que el servidor aún no tiene. Restaurar nunca lo marca. */
  const sucio = useRef(false);
  /** Cuenta los cambios reales: detecta los que ocurren mientras el GET está en vuelo. */
  const cambios = useRef(0);
  /** Cuenta solo los cambios del estado de la cocina (acciones). */
  const cambiosEstado = useRef(0);
  /** Ya se comparó con la cuenta en esta sesión: recién ahora se puede subir. */
  const sincronizado = useRef(false);
  const enSync = useRef(false);
  /** El estado que acabamos de restaurar: su efecto no cuenta como cambio. */
  const restaurado = useRef<EstadoCocina | null>(null);
  const restaurarRef = useRef<(e: EstadoCocina) => void>(() => {});
  /** Pidió que le avisemos (marcó la casilla): solo entonces "ya estás anotada/o". */
  const [avisado, setAvisado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const guardarYSubir = useCallback(() => {
    guardarAvance(avance.current);
    if (sincronizado.current && sucio.current) {
      const v = cambios.current;
      void subirAvance(avance.current).then((ok) => {
        if (ok && cambios.current === v) sucio.current = false;
      });
    }
  }, []);

  /** Compara con la cuenta; si no se puede (sin sesión o falla el GET) no sube nada y reintenta en el próximo cambio. */
  const intentarSync = useCallback(async () => {
    if (enSync.current || sincronizado.current) return;
    enSync.current = true;
    const v0 = cambios.current;
    const e0 = cambiosEstado.current;
    let r;
    try {
      r = await sincronizar(avance.current, sucio.current);
    } finally {
      enSync.current = false;
    }
    if (!montado.current || r.tipo === "sin-sesion" || r.tipo === "fallo") return;
    sincronizado.current = true;
    if (cambios.current !== v0) {
      // Hubo cambios locales durante el GET: se conservan y se les suma lo del servidor.
      // El estado de la cocina solo es el local si el estado mismo cambió durante el GET.
      if (r.tipo === "remoto") {
        const f = fusionar(avance.current, r.avance, cambiosEstado.current !== e0);
        avance.current = f;
        if (cambiosEstado.current === e0) {
          restaurado.current = f.estado;
          restaurarRef.current(f.estado);
        }
      }
      sucio.current = true;
      guardarYSubir();
      return;
    }
    if (r.tipo === "remoto") {
      // un correo dejado mientras volaba el GET gana sobre el del servidor
      const correo = avance.current.correo ?? r.avance.correo;
      avance.current = correo ? { ...r.avance, correo } : r.avance;
      sucio.current = false; // no queda nada que subir
      guardarAvance(avance.current);
      restaurado.current = r.avance.estado;
      restaurarRef.current(r.avance.estado);
    } else {
      sucio.current = true;
      guardarYSubir();
    }
  }, [guardarYSubir]);

  /** Guarda tras ~500 ms sin cambios; mientras no se haya comparado con la cuenta, lo intenta de nuevo. */
  const programar = useCallback(() => {
    if (!listo.current) return;
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => {
      temporizador.current = null;
      guardarAvance(avance.current);
      if (!sincronizado.current) void intentarSync();
      else guardarYSubir();
    }, GUARDAR_MS);
  }, [guardarYSubir, intentarSync]);
  const marcar = useCallback(() => {
    sucio.current = true;
    cambios.current++;
    programar();
  }, [programar]);

  const alEvento = useCallback<AlEvento>(
    (nombre, datos) => {
      const n = ALIAS[nombre] ?? nombre;
      if (CONOCIDOS.has(n)) registrar(n as NombreEvento, datos);
      if (nombre === "gesto_completo" && datos && typeof datos.anim === "string" && typeof datos.medalla === "string") {
        const m = datos.medalla as keyof typeof ORDEN_MEDALLA;
        const previa = avance.current.medallas[datos.anim];
        if (m in ORDEN_MEDALLA && (!previa || ORDEN_MEDALLA[m] > ORDEN_MEDALLA[previa])) {
          avance.current = { ...avance.current, medallas: { ...avance.current.medallas, [datos.anim]: m } };
          marcar();
        }
      }
      onEvento?.(nombre, datos);
    },
    [onEvento, marcar],
  );
  const alEscuchar = useCallback(
    (id: string) => {
      if (avance.current.escuchadas.includes(id)) return;
      avance.current = { ...avance.current, escuchadas: [...avance.current.escuchadas, id] };
      marcar();
    },
    [marcar],
  );
  const casa = useCasa(alEvento, { alEscuchar });
  const { restaurar } = casa;
  useEffect(() => {
    restaurarRef.current = restaurar;
  }, [restaurar]);

  // Una acción cambió el estado de la cocina: se guarda. Restaurar no cuenta como cambio.
  useEffect(() => {
    if (!listo.current || casa.estado === restaurado.current) return;
    avance.current = { ...avance.current, estado: casa.estado };
    cambiosEstado.current++;
    marcar();
  }, [casa.estado, marcar]);

  // Al montar: restaura el avance guardado, lee la URL y se compara con la cuenta (si hay sesión).
  useEffect(() => {
    montado.current = true;
    avance.current = cargarAvance();
    restaurado.current = avance.current.estado;
    restaurar(avance.current.estado);
    setAvisado(cargarAviso());
    listo.current = true;

    const url = new URL(window.location.href);
    const ok = url.searchParams.get("bienvenida") === "1";
    const fallo = url.searchParams.get("enlace") === "fallo";
    if (ok || fallo) {
      setAviso(
        ok
          ? "¡Listo! Tu avance quedó guardado en esta cuenta."
          : "Ese enlace ya no funciona. Pide uno nuevo dejando tu correo otra vez.",
      );
      url.searchParams.delete("bienvenida");
      url.searchParams.delete("enlace");
      try {
        window.history.replaceState(null, "", url.pathname + url.search + url.hash);
      } catch {
        /* nada */
      }
    }
    void intentarSync();

    // El correo se deja desde un formulario (tarjeta o pie de página): llega por este aviso, en memoria.
    const alCambiar = (e: Event) => {
      const d = (e as CustomEvent<DetalleAvance>).detail;
      if (d?.avisar) setAvisado(true);
      const c = d?.correo;
      if (!c) return;
      avance.current = { ...avance.current, correo: c };
      programar();
    };
    const guardarYa = () => {
      if (temporizador.current) clearTimeout(temporizador.current);
      temporizador.current = null;
      guardarAvance(avance.current);
    };
    const alOcultar = () => {
      if (document.visibilityState === "hidden") guardarYa();
    };
    window.addEventListener(EVENTO_AVANCE, alCambiar);
    window.addEventListener("pagehide", guardarYa);
    document.addEventListener("visibilitychange", alOcultar);
    return () => {
      montado.current = false;
      window.removeEventListener(EVENTO_AVANCE, alCambiar);
      window.removeEventListener("pagehide", guardarYa);
      document.removeEventListener("visibilitychange", alOcultar);
      if (temporizador.current) {
        clearTimeout(temporizador.current);
        temporizador.current = null;
        guardarAvance(avance.current); // lo pendiente (<500 ms) no se pierde
      }
    };
  }, [restaurar, intentarSync, programar]);

  // El aviso (enlace bueno o vencido) va en la tarjeta de entrada, no encima del cuarto.
  return <CasaVista casa={casa} anotado={avisado} aviso={aviso} formulario={<Correo origen="pronto" />} />;
}

/** La vista de la casa: recibe el estado del hook y traduce los punteros a sus funciones. */
export function CasaVista({
  casa,
  anotado = false,
  aviso = null,
  formulario,
}: {
  casa: CasaApi;
  /** Pidió que le avisemos cuando abran los cuartos. */
  anotado?: boolean;
  /** Mensaje del enlace del correo (se muestra en la tarjeta de entrada). */
  aviso?: string | null;
  formulario?: ReactNode;
}) {
  const { estado, camara, vaca, cara, globo, opciones, ocupado, posiciones, clases, particulas } = casa;
  const mundoRef = useRef<HTMLDivElement>(null);
  const ini = useRef<Inicio | null>(null);
  const sinClick = useRef(false);
  const [arrObj, setArrObj] = useState<{ id: ObjetoId; x: number; y: number } | null>(null);
  const [arrVaca, setArrVaca] = useState<Punto | null>(null);
  // La entrada se pinta ya en el servidor; solo el botón toca el audio (en el cliente).
  const [entrada, setEntrada] = useState(true);
  const [pronto, setPronto] = useState(false);
  // Tamaño real del escenario: en celular vertical deja de ser cuadrado y la cámara se encuadra con zoom y paneo.
  const escenarioRef = useRef<HTMLDivElement>(null);
  const [tam, setTam] = useState({ w: 0, h: 0 });
  // medido antes de pintar (después de hidratar), para no animar el salto al encuadre vertical
  useLayoutEffect(() => {
    const el = escenarioRef.current;
    if (!el) return;
    const medir = () => {
      const r = el.getBoundingClientRect();
      setTam((t) => (t.w === r.width && t.h === r.height ? t : { w: r.width, h: r.height }));
    };
    medir();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // La transición de la cámara se enciende recién un cuadro después de la primera medida.
  const [medido, setMedido] = useState(false);
  useEffect(() => {
    if (medido || tam.w === 0) return;
    const id = requestAnimationFrame(() => setMedido(true));
    return () => cancelAnimationFrame(id);
  }, [medido, tam.w]);
  const aspecto = aspectoDe(tam.w, tam.h);
  const vertical = aspecto > 1;
  // Paneo del dedo sobre el piso; cada vez que la casa mueve la cámara (enfoque, ⤢, quiz) se olvida.
  const [paneo, setPaneo] = useState<{ x: number; y: number } | null>(null);
  const [camaraPrevia, setCamaraPrevia] = useState(camara);
  if (camaraPrevia !== camara) {
    setCamaraPrevia(camara);
    setPaneo(null);
  }
  const pan = paneo ?? { x: 0, y: 0 };
  const vista = encuadrar(camara, tam.w, tam.h, pan);
  const piso = useRef<{ cx: number; cy: number; x0: number; y0: number; movio: boolean } | null>(null);
  const [paneando, setPaneando] = useState(false);
  const quiz = casa.quiz;
  const capa: CapaTarjeta | null = entrada
    ? "entrada"
    : quiz?.fase === "fin"
      ? "metodo"
      : pronto
        ? "pronto"
        : null;

  // La tarjeta del método aparece una vez al terminar el 玩.
  useEffect(() => {
    if (capa === "metodo") registrar("ver_metodo");
  }, [capa]);

  /** px de pantalla → unidades del cuarto (el ancho del mundo ya incluye el zoom). */
  const aUnidades = (px: number) => {
    const w = mundoRef.current?.getBoundingClientRect().width ?? 0;
    return w ? (px / w) * 1000 : 0;
  };
  const delta = (e: EventoPuntero, i: Inicio) => ({ dx: aUnidades(e.clientX - i.cx), dy: aUnidades(e.clientY - i.cy) });
  const capturar = (e: EventoPuntero<HTMLElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* jsdom / navegadores viejos */
    }
  };

  // ---- objetos ----
  const objetoAbajo = (e: EventoPuntero<HTMLElement>, id: ObjetoId) => {
    sinClick.current = false;
    if (ocupado || estado[id] === "nada") return;
    e.stopPropagation();
    capturar(e);
    ini.current = { tipo: "obj", id, cx: e.clientX, cy: e.clientY, movio: false };
  };
  const objetoMueve = (e: EventoPuntero<HTMLElement>, id: ObjetoId) => {
    const i = ini.current;
    if (!i || i.tipo !== "obj" || i.id !== id) return;
    const { dx, dy } = delta(e, i);
    if (!i.movio && Math.hypot(dx, dy) < UMBRAL_TOQUE) return;
    if (OBJETOS[id].fijo) return; // el refri no se arrastra: se le lleva la vaca
    if (!i.movio) {
      i.movio = true;
      casa.empezarArrastre();
    }
    setArrObj({ id, x: OBJETOS[id].x + dx, y: OBJETOS[id].y + dy });
  };
  const objetoSuelta = (e: EventoPuntero<HTMLElement>, id: ObjetoId, cancelado: boolean) => {
    const i = ini.current;
    if (!i || i.tipo !== "obj" || i.id !== id) return;
    ini.current = null;
    setArrObj(null); // vuelve a su lugar con la transición de left/top
    if (!i.movio) return; // el click que sigue es el toque
    sinClick.current = true;
    const { dx, dy } = delta(e, i);
    if (!cancelado && llegaALaVaca({ x: OBJETOS[id].x + dx, y: OBJETOS[id].y + dy }, vaca)) casa.soltarObjetoEnVaca(id).catch(registrarFallo);
  };
  const objetoClick = (id: ObjetoId) => {
    if (sinClick.current) {
      sinClick.current = false;
      return;
    }
    casa.tocar(id).catch(registrarFallo);
  };

  // ---- vaca ----
  const vacaAbajo = (e: EventoPuntero<HTMLElement>) => {
    sinClick.current = false;
    if (ocupado) return;
    e.stopPropagation();
    capturar(e);
    ini.current = { tipo: "vaca", cx: e.clientX, cy: e.clientY, x0: vaca.x, y0: vaca.y, movio: false };
  };
  const vacaMueve = (e: EventoPuntero<HTMLElement>) => {
    const i = ini.current;
    if (!i || i.tipo !== "vaca") return;
    const { dx, dy } = delta(e, i);
    if (!i.movio && Math.hypot(dx, dy) < UMBRAL_TOQUE) return;
    if (!i.movio) {
      i.movio = true;
      casa.empezarArrastre();
    }
    setArrVaca({ x: i.x0 + dx, y: i.y0 + dy });
  };
  const vacaSuelta = (e: EventoPuntero<HTMLElement>, cancelado: boolean) => {
    const i = ini.current;
    if (!i || i.tipo !== "vaca") return;
    ini.current = null;
    setArrVaca(null);
    if (!i.movio) return;
    sinClick.current = true;
    const { dx, dy } = delta(e, i);
    casa.soltarVaca(cancelado ? i.x0 : i.x0 + dx, cancelado ? i.y0 : i.y0 + dy).catch(registrarFallo);
  };
  const vacaClick = () => {
    if (sinClick.current) {
      sinClick.current = false;
      return;
    }
    casa.tocarVaca();
  };

  // ---- lo que se ve mientras se arrastra ----
  const vacaVista = arrVaca ?? vaca;
  const vacaEsObjetivo = !!arrObj && llegaALaVaca(arrObj, vaca);
  const objetoObjetivo = arrVaca ? objetoBajo(arrVaca, estado) : null;
  const ojos = vacaEsObjetivo || objetoObjetivo ? "sorpresa" : cara.ojos;

  // ---- piso: tocar vuelve a ver todo; en vertical, arrastrar panea la cámara ----
  const pisoAbajo = (e: EventoPuntero<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (!vertical) {
      casa.verTodo(); // en cuadrado, como siempre: al tocar
      return;
    }
    if (ocupado) return;
    capturar(e);
    // el paneo se mide desde el mismo centro que usa encuadrar (en "ver todo" vertical, X_VERTICAL)
    const b = centroBase(camara, tam.w, tam.h);
    piso.current = { cx: e.clientX, cy: e.clientY, x0: vista.x - b.x, y0: vista.y - b.y, movio: false };
  };
  const pisoMueve = (e: EventoPuntero<HTMLDivElement>) => {
    const p = piso.current;
    if (!p) return;
    const dx = aUnidades(e.clientX - p.cx);
    const dy = aUnidades(e.clientY - p.cy);
    if (!p.movio && Math.hypot(dx, dy) < UMBRAL_TOQUE) return;
    if (!p.movio) {
      p.movio = true;
      setPaneando(true);
    }
    setPaneo({ x: p.x0 - dx, y: p.y0 - dy });
  };
  const pisoSuelta = (cancelado: boolean) => {
    const p = piso.current;
    if (!p) return;
    piso.current = null;
    setPaneando(false);
    if (p.movio || cancelado) return;
    setPaneo(null);
    casa.verTodo();
  };

  // el zoom que cuenta para el globo es el relativo al encuadre de "ver todo" (en vertical ya parte con zoom)
  const zoomRel = vista.s / encuadreInicial(tam.w, tam.h).s;
  const pGlobo = enPantalla(vista, vaca.x, vaca.y - 215 / Math.max(1, zoomRel * 0.8), aspecto);

  return (
    <div
      className={styles.casa}
      data-casa
      data-vertical={vertical || undefined}
      data-ocupado={ocupado || undefined}
      data-primer-plano={casa.primerPlano ? `${casa.primerPlano.objeto}:${casa.primerPlano.accion.anim}` : undefined}
    >
      <div className={styles.interior} inert={capa !== null}>
      <div ref={escenarioRef} className={styles.escenario} data-medido={medido || undefined}>
        <div
          ref={mundoRef}
          className={cx(styles.mundo, paneando && styles.paneando)}
          style={{ transform: transformCSS(vista, aspecto) }}
          onPointerDown={pisoAbajo}
          onPointerMove={pisoMueve}
          onPointerUp={() => pisoSuelta(false)}
          onPointerCancel={() => pisoSuelta(true)}
        >
          <FondoCuarto cuarto="cocina" />

          {IDS.map((id, i) => {
            const o = OBJETOS[id];
            const arrastrado = arrObj?.id === id;
            const p = arrastrado ? arrObj : posiciones[id] ?? o;
            const extra = clases[id] ?? [];
            const abierto = estado.bingxiang === "abierto";
            return (
              <button
                key={id}
                type="button"
                data-objeto={id}
                aria-label={textoHanzi(o.nombre)}
                className={cx(
                  styles.objeto,
                  !arrastrado && !posiciones[id] && styles.idle,
                  arrastrado && styles.arrastrando,
                  !!posiciones[id] && styles.llevado,
                  extra.includes("directo") && styles.directo,
                  objetoObjetivo === id && styles.objetivo,
                  estado[id] === "nada" && styles.nada,
                )}
                style={{ left: pct(p.x), top: pct(p.y), width: pct(o.w), animationDelay: `${-(i * 0.7)}s` }}
                onPointerDown={(e) => objetoAbajo(e, id)}
                onPointerMove={(e) => objetoMueve(e, id)}
                onPointerUp={(e) => objetoSuelta(e, id, false)}
                onPointerCancel={(e) => objetoSuelta(e, id, true)}
                onClick={() => objetoClick(id)}
              >
                <div
                  className={cx(
                    styles.dibujo,
                    extra.includes("tiembla") && styles.tiembla,
                    extra.includes("inclina") && styles.inclina,
                    extra.includes("encoge") && styles.encoge,
                  )}
                >
                  <DibujoObjeto
                    id={id}
                    estado={estado[id]}
                    claseCapa={
                      id === "bingxiang"
                        ? (n) => (n === "puerta" ? cx(styles.puerta, abierto && styles.puertaAbierta) : "")
                        : undefined
                    }
                  />
                </div>
              </button>
            );
          })}

          {particulas.map((q) => {
            const estilo: CSSProperties & Record<string, string | number | undefined> = {
              left: pct(q.x),
              top: pct(q.y),
              background: q.color,
              animationDelay: q.retraso ? `${q.retraso}s` : undefined,
            };
            if (q.tam) Object.assign(estilo, { width: `${q.tam}%`, height: `${q.tam}%` });
            if (q.dx !== undefined) Object.assign(estilo, { "--dx": `${q.dx}px`, "--dy": `${q.dy}px` });
            return (
              <div key={q.clave} className={styles[q.tipo]} style={estilo} aria-hidden="true">
                {q.tipo === "brillo" ? "✦" : null}
              </div>
            );
          })}

          <button
            type="button"
            aria-label="牛"
            data-vaca
            className={cx(styles.vaca, arrVaca && styles.vacaArrastrando, vacaEsObjetivo && styles.vacaObjetivo)}
            style={{ left: pct(vacaVista.x), top: pct(vacaVista.y) }}
            onPointerDown={vacaAbajo}
            onPointerMove={vacaMueve}
            onPointerUp={(e) => vacaSuelta(e, false)}
            onPointerCancel={(e) => vacaSuelta(e, true)}
            onClick={vacaClick}
          >
            <div className={styles.sombra} />
            <Vaca ojos={ojos} hocico={cara.hocico} orejas={cara.orejas} salta={cara.salta} />
          </button>
        </div>

        {/* botón 玩, marcador de estrellas y 🔊 */}
        <button
          type="button"
          className={styles.jugar}
          aria-label="玩"
          aria-pressed={!!quiz}
          data-activo={quiz ? "true" : undefined}
          disabled={ocupado || (!!quiz && quiz.fase !== "juego")}
          onClick={() => casa.empezarQuiz()}
        >
          <span className={styles.jugarHz}>玩</span>
          <span data-pinyin>wán</span>
        </button>
        {quiz && (
          <>
            <div className={styles.marcador} data-testid="marcador" aria-hidden="true">
              {"★".repeat(quiz.aciertos) + "☆".repeat(quiz.rondas.length - quiz.aciertos)}
            </div>
            {quiz.fase === "juego" && (
              <button type="button" className={styles.repetir} aria-label="🔊" disabled={ocupado} onClick={() => casa.repetirQuiz()}>
                🔊
              </button>
            )}
          </>
        )}
        <Minimapa cuartoActual="cocina" anotado={anotado} alTocarBloqueado={() => {
          registrar("tocar_bloqueado");
          setPronto(true);
        }} />

        {globo && <Globo silabas={globo} x={Math.max(12, Math.min(88, pGlobo.x))} y={Math.max(16, pGlobo.y)} />}

        {opciones && (
          <Opciones
            id={opciones.id}
            lista={opciones.lista}
            camara={vista}
            vertical={vertical}
            aspecto={aspecto}
            alElegir={(a) => casa.elegir(opciones.id, a).catch(registrarFallo)}
          />
        )}

        {camara.s > 1 && (
          <button type="button" className={styles.alejar} aria-label="全部" title="全部 quán bù" disabled={ocupado} onClick={() => casa.verTodo()}>
            ⤢
          </button>
        )}

        {/* El primer plano va encima de todo el escenario y avisa con la medalla al terminar. */}
        {casa.primerPlano && (
          <PrimerPlano
            key={`${casa.primerPlano.objeto}:${casa.primerPlano.accion.anim}`}
            accion={casa.primerPlano.accion}
            objeto={casa.primerPlano.objeto}
            estado={estado}
            alTerminar={casa.terminarPrimerPlano}
            alCancelar={casa.cancelarPrimerPlano}
          />
        )}
      </div>
      </div>

      <Tarjetas
        capa={capa}
        anotado={anotado}
        aviso={aviso}
        formulario={formulario}
        alEntrar={() => {
          registrar("entrar");
          desbloquearAudio(); // dentro del toque: así iOS deja sonar el audio
          musica.tocar("cocina");
          setEntrada(false);
          casa.saludar();
        }}
        alSeguir={() => {
          // después del método, la invitación a dejar el correo
          casa.cerrarQuiz();
          setPronto(true);
        }}
        alCerrar={() => setPronto(false)}
      />
    </div>
  );
}
