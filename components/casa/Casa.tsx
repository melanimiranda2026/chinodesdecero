"use client";
import { useRef, useState, type CSSProperties, type PointerEvent as EventoPuntero, type ReactNode } from "react";
import { textoHanzi } from "@/lib/silabas";
import { OBJETOS, type ObjetoId } from "./cocina/datos";
import { enPantalla, objetoBajo, transformCSS } from "./camara";
import { DibujoObjeto } from "./arte/DibujoObjeto";
import { FondoCuarto } from "./arte/Capa";
import { Vaca } from "./Vaca";
import { Globo } from "./Globo";
import { Opciones } from "./Opciones";
import { PrimerPlano } from "./primer-plano/PrimerPlano";
import { Minimapa } from "./Minimapa";
import { Tarjetas, type CapaTarjeta } from "./Tarjetas";
import { desbloquearAudio } from "./audio/voz";
import { useCasa, type AlEvento, type CasaApi, type Punto } from "./useCasa";
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

export function Casa({
  onEvento,
  anotado = false,
  formulario,
}: {
  onEvento?: AlEvento;
  /** Ya dejó su correo (la Task 12 lo conecta). */
  anotado?: boolean;
  /** Formulario de correo para la tarjeta "pronto" (la Task 12 pasa <Correo origen="pronto" />). */
  formulario?: ReactNode;
}) {
  const casa = useCasa(onEvento);
  return <CasaVista casa={casa} anotado={anotado} formulario={formulario} />;
}

/** La vista de la casa: recibe el estado del hook y traduce los punteros a sus funciones. */
export function CasaVista({
  casa,
  anotado = false,
  formulario,
}: {
  casa: CasaApi;
  anotado?: boolean;
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
  const quiz = casa.quiz;
  const capa: CapaTarjeta | null = entrada
    ? "entrada"
    : quiz?.fase === "fin"
      ? "metodo"
      : pronto
        ? "pronto"
        : null;

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

  const pGlobo = enPantalla(camara, vaca.x, vaca.y - 215 / Math.max(1, camara.s * 0.8));

  return (
    <div
      className={styles.casa}
      data-ocupado={ocupado || undefined}
      data-primer-plano={casa.primerPlano ? `${casa.primerPlano.objeto}:${casa.primerPlano.accion.anim}` : undefined}
    >
      <div className={styles.escenario}>
        <div
          ref={mundoRef}
          className={styles.mundo}
          style={{ transform: transformCSS(camara) }}
          onPointerDown={(e) => {
            // tocar el piso: cierra las opciones y vuelve a la vista completa
            if (e.target === e.currentTarget) casa.verTodo();
          }}
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
        <button type="button" className={styles.jugar} aria-label="玩" disabled={ocupado || !!quiz} onClick={() => casa.empezarQuiz()}>
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
        <Minimapa cuartoActual="cocina" alTocarBloqueado={() => setPronto(true)} />

        {globo && <Globo silabas={globo} x={Math.max(12, Math.min(88, pGlobo.x))} y={Math.max(16, pGlobo.y)} />}

        {opciones && (
          <Opciones
            id={opciones.id}
            lista={opciones.lista}
            camara={camara}
            alElegir={(a) => casa.elegir(opciones.id, a).catch(registrarFallo)}
          />
        )}

        {camara.s > 1 && (
          <button type="button" className={styles.alejar} aria-label="⤢" disabled={ocupado} onClick={() => casa.verTodo()}>
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
          />
        )}
      </div>

      <Tarjetas
        capa={capa}
        anotado={anotado}
        formulario={formulario}
        alEntrar={() => {
          desbloquearAudio();
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
