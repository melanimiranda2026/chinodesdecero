"use client";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as EventoPuntero } from "react";
import { textoHanzi, type Silaba } from "@/lib/silabas";
import { COLOR_TONO } from "@/lib/tonos";
import type { Accion } from "../cocina/acciones";
import type { EstadoCocina, ObjetoId } from "../cocina/datos";
import { HAO, HEN_HAO, TAI_BANG_LE } from "../cocina/frases";
import { decir } from "../audio/voz";
import { musica, sfx, type Pista } from "../audio/sonido";
import { GESTO_DE, medalla as medallaDe, type Medalla, type TipoGesto } from "../gestos/medalla";
import type { Gesto, P } from "../gestos/tipos";
import { crearCortar } from "../gestos/cortar";
import { crearFrotar } from "../gestos/frotar";
import { crearLlenar } from "../gestos/llenar";
import { crearBeber } from "../gestos/beber";
import { crearGirar } from "../gestos/girar";
import { crearMorder } from "../gestos/morder";
import { Vaca, type Hocico, type Ojos, type Orejas } from "../Vaca";
import { Cortar, type Linea } from "./Cortar";
import { Frotar, type Burbuja } from "./Frotar";
import { Morder, type Mordida } from "./Morder";
import { Vaso } from "./Vaso";
import { Olla } from "./Olla";
import styles from "./PrimerPlano.module.css";

/**
 * entra: iris + la vaca dice la frase (no se aceptan toques) · juega: corre el reloj ·
 * remate: se ve el resultado del gesto · medalla: medalla + elogio · sale: iris de salida.
 */
type Fase = "entra" | "juega" | "remate" | "medalla" | "sale";

const CREAR: Record<TipoGesto, () => Gesto> = {
  cortar: crearCortar, frotar: crearFrotar, llenar: crearLlenar, beber: crearBeber, girar: crearGirar, morder: crearMorder,
};
const FONDO: Record<TipoGesto, string> = {
  cortar: "tabla", frotar: "agua", llenar: "mesa", beber: "mesa", girar: "fuego", morder: "comer",
};
const MANO: Record<TipoGesto, [string, string]> = {
  cortar: ["🔪", styles.mCortar], frotar: ["🧽", styles.mFrotar], llenar: ["👆", styles.mMantener],
  beber: ["👆", styles.mMantener], girar: ["🥄", styles.mGirar], morder: ["👆", styles.mTocar],
};
const ELOGIO: Record<Medalla, Silaba[]> = { oro: TAI_BANG_LE, plata: HEN_HAO, bronce: HAO };
const ICONO_MEDALLA: Record<Medalla, string> = { oro: "🥇", plata: "🥈", bronce: "🥉" };
const TE = "#C98E3A";
const AGUA = "#7FC3E8";
/** El reloj da una vuelta en 12 s (solo decide la medalla: nunca se pierde). */
const RELOJ_MS = 12000;
const MAX_ESPUMA = 28;
const CONFETI = ["#E0473C", "#E8930C", "#2E9B57", "#3A6FD6", "#F2C14E", "#F59AC0"];

const ahora = () => performance.now();
const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const nivelDe = (g: Gesto) => ("nivel" in g && typeof g.nivel === "function" ? (g.nivel as () => number)() : 0);
const bocaDe = (a: number): Hocico => (a > 0.5 ? "abierta" : a > 0.15 ? "o" : "sonrisa");
/** `decir` que nunca rechaza: sin voz, el juego sigue igual. */
async function hablar(s: Silaba[], alBoca: (a: number) => void): Promise<void> {
  try {
    await decir(s, { alBoca });
  } catch {
    /* sin voz */
  }
}

/** Un cuadro de animación (requestAnimationFrame, o setTimeout donde no existe). Devuelve cómo cancelarlo. */
function pedirCuadro(f: () => void): () => void {
  if (typeof requestAnimationFrame === "function") {
    const id = requestAnimationFrame(() => f());
    return () => cancelAnimationFrame(id);
  }
  const id = setTimeout(f, 16);
  return () => clearTimeout(id);
}

interface Cuadro { progreso: number; nivel: number; reloj: number }

/**
 * Primer plano a pantalla completa: el verbo se hace con el dedo. Los punteros se capturan en todo el
 * primer plano (un corte puede empezar fuera del objeto) y se normalizan a la zona del objeto (0–1).
 * Llama a `alTerminar` una sola vez, con la medalla según el tiempo desde que terminó la frase de entrada.
 */
export function PrimerPlano({
  accion, objeto, estado, alTerminar,
}: { accion: Accion; objeto: ObjetoId; estado: EstadoCocina; alTerminar: (m: Medalla) => void }) {
  const tipo: TipoGesto = GESTO_DE[accion.anim] ?? "morder";

  const [fase, setFase] = useState<Fase>("entra");
  const [cuadro, setCuadro] = useState<Cuadro>(() => ({ progreso: 0, nivel: nivelDe(CREAR[tipo]()), reloj: 0 }));
  const [mano, setMano] = useState(true);
  const [ojos, setOjos] = useState<Ojos>("abiertos");
  const [hocico, setHocico] = useState<Hocico>("sonrisa");
  const [orejas, setOrejas] = useState<Orejas>("normales");
  const [salta, setSalta] = useState(false);
  const [medalla, setMedalla] = useState<Medalla | null>(null);
  // visuales de cada gesto
  const [cortes, setCortes] = useState<Linea[]>([]);
  const [trazo, setTrazo] = useState<Linea | null>(null);
  const [espuma, setEspuma] = useState<Burbuja[]>([]);
  const [mordidas, setMordidas] = useState<Mordida[]>([]);
  const [cuchara, setCuchara] = useState<P | null>(null);
  const [chorro, setChorro] = useState(false);
  const [derrame, setDerrame] = useState(false);

  const gestoRef = useRef<Gesto | null>(null);
  const faseRef = useRef<Fase>("entra");
  const sesionRef = useRef({ vivo: false });
  const terminadoRef = useRef(false);
  const t0Ref = useRef(0);
  const apretadoRef = useRef(false);
  const inicioTrazo = useRef<P | null>(null);
  const zonaRef = useRef<HTMLDivElement>(null);
  const ultimoSfx = useRef(0);
  const contador = useRef(0);
  const alTerminarRef = useRef(alTerminar);
  useEffect(() => {
    alTerminarRef.current = alTerminar;
  }, [alTerminar]);

  const ponerFase = (f: Fase) => {
    faseRef.current = f;
    setFase(f);
  };

  // ---- entrada: iris, música del gesto y la frase; al salir vuelve la música de la cocina ----
  useEffect(() => {
    const sesion = { vivo: true };
    sesionRef.current = sesion;
    gestoRef.current = CREAR[tipo]();
    terminadoRef.current = false;
    faseRef.current = "entra";
    musica.tocar(`g-${tipo}` as Pista);
    void (async () => {
      await esperar(500);
      if (!sesion.vivo) return;
      await hablar(accion.frase, (a) => sesion.vivo && setHocico(bocaDe(a)));
      if (!sesion.vivo) return;
      setHocico("sonrisa");
      t0Ref.current = ahora();
      faseRef.current = "juega";
      setFase("juega");
    })();
    return () => {
      sesion.vivo = false;
      musica.tocar("cocina");
    };
  }, [accion, tipo]);

  const golpe = () => {
    const z = zonaRef.current;
    if (z && typeof z.animate === "function") z.animate([{ scale: "1" }, { scale: "1.04" }, { scale: "1" }], { duration: 180 });
  };

  const pintar = () => {
    const g = gestoRef.current;
    if (!g) return;
    setCuadro({ progreso: g.progreso(), nivel: nivelDe(g), reloj: Math.min(1, (ahora() - t0Ref.current) / RELOJ_MS) });
  };

  /** Si el gesto está listo, arranca el final (una sola vez). */
  const revisar = (): boolean => {
    const g = gestoRef.current;
    if (!g || terminadoRef.current || !g.listo()) return false;
    terminadoRef.current = true;
    const m = medallaDe((ahora() - t0Ref.current) / 1000);
    const sesion = sesionRef.current;
    apretadoRef.current = false;
    ponerFase("remate");
    setCuadro((c) => ({ ...c, progreso: 1 }));
    setMano(false);
    setTrazo(null);
    setChorro(false);
    setCuchara(null);
    setOjos("abiertos");
    void (async () => {
      await esperar(500);
      if (!sesion.vivo) return;
      setMedalla(m);
      ponerFase("medalla");
      setOjos("felices");
      setOrejas("arriba");
      setSalta(true);
      sfx("ding");
      await esperar(450); // el efecto nunca encima del mandarín
      if (!sesion.vivo) return;
      await hablar(ELOGIO[m], (a) => sesion.vivo && setHocico(bocaDe(a)));
      if (!sesion.vivo) return;
      setHocico("sonrisa");
      await esperar(400);
      if (!sesion.vivo) return;
      ponerFase("sale");
      await esperar(450);
      if (!sesion.vivo) return;
      alTerminarRef.current(m);
    })();
    return true;
  };

  // ---- reloj y gestos con tiempo (llenar, beber) ----
  useEffect(() => {
    if (fase !== "juega") return;
    let cancelar = () => {};
    const paso = () => {
      const g = gestoRef.current;
      if (!g || faseRef.current !== "juega") return;
      const t = ahora();
      g.tic(t);
      if (tipo === "llenar" && "rebalso" in g && (g.rebalso as () => boolean)()) {
        sfx("boing");
        setOjos("sorpresa");
        setDerrame(true);
        setTimeout(() => {
          setOjos("abiertos");
          setDerrame(false);
        }, 600);
      }
      if ((tipo === "llenar" || tipo === "beber") && apretadoRef.current && t - ultimoSfx.current > 650) {
        ultimoSfx.current = t;
        sfx("tragos");
      }
      pintar();
      if (revisar()) return;
      cancelar = pedirCuadro(paso);
    };
    cancelar = pedirCuadro(paso);
    return () => cancelar();
    // pintar/revisar solo leen refs y setters estables
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, tipo]);

  // ---- punteros ----
  const punto = (e: EventoPuntero): P => {
    const r = zonaRef.current?.getBoundingClientRect();
    if (!r || !r.width || !r.height) return { u: -1, v: -1 };
    return { u: (e.clientX - r.left) / r.width, v: (e.clientY - r.top) / r.height };
  };

  const abajo = (e: EventoPuntero<HTMLDivElement>) => {
    const g = gestoRef.current;
    if (!g || faseRef.current !== "juega") return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* jsdom / navegadores viejos */
    }
    const p = punto(e);
    const antes = g.progreso();
    g.abajo(p, ahora());
    apretadoRef.current = true;
    setMano(false);
    if (tipo === "cortar") {
      inicioTrazo.current = p;
      setTrazo({ a: p, b: p });
    } else if (tipo === "morder" && g.progreso() > antes) {
      setMordidas((ms) => [...ms, { u: p.u, v: p.v, r: 17 + (ms.length + 1) * 2 }]);
      sfx("nam");
      golpe();
      setHocico("abierta");
      setTimeout(() => setHocico("sonrisa"), 200);
    } else if (tipo === "girar") {
      setCuchara(p);
    } else if (tipo === "llenar") {
      setChorro(true);
    } else if (tipo === "beber") {
      setOjos("cerrados");
    }
    pintar();
    revisar();
  };

  const mover = (e: EventoPuntero<HTMLDivElement>) => {
    const g = gestoRef.current;
    if (!g || faseRef.current !== "juega") return;
    const p = punto(e);
    const antes = g.progreso();
    g.mover(p, ahora());
    if (!apretadoRef.current) return;
    if (tipo === "cortar" && inicioTrazo.current) {
      setTrazo({ a: inicioTrazo.current, b: p });
    } else if (tipo === "frotar" && g.progreso() > antes) {
      const n = ++contador.current;
      if (n % 3 === 0) {
        const s = 5 + ((n * 37) % 9);
        setEspuma((b) => [...b.slice(-(MAX_ESPUMA - 1)), { k: n, u: p.u, v: p.v, s }]);
      }
      const t = ahora();
      if (t - ultimoSfx.current > 350) {
        ultimoSfx.current = t;
        sfx("pop-burbuja");
      }
    } else if (tipo === "girar") {
      setCuchara(p);
    }
    pintar();
    revisar();
  };

  const arriba = (e: EventoPuntero<HTMLDivElement>) => {
    const g = gestoRef.current;
    if (!g || faseRef.current !== "juega") return;
    const p = punto(e);
    const antes = g.progreso();
    g.arriba(p, ahora());
    apretadoRef.current = false;
    if (tipo === "cortar") {
      const a = inicioTrazo.current;
      if (a && g.progreso() > antes) {
        setCortes((cs) => [...cs, { a, b: p }]);
        sfx("golpe");
        golpe();
      }
      inicioTrazo.current = null;
      setTrazo(null);
    } else if (tipo === "llenar") {
      setChorro(false);
    } else if (tipo === "beber") {
      setOjos("abiertos");
    } else if (tipo === "girar") {
      setCuchara(null);
    }
    pintar();
    revisar();
  };

  const cancelado = () => {
    gestoRef.current?.reiniciar();
    apretadoRef.current = false;
    inicioTrazo.current = null;
    setTrazo(null);
    setChorro(false);
    setCuchara(null);
    if (tipo === "beber") setOjos("abiertos");
  };

  // ---- vista ----
  const fin = fase !== "entra" && fase !== "juega";
  const estadoObjeto = estado[objeto];
  const visual = (() => {
    switch (tipo) {
      case "cortar":
        return <Cortar id={objeto} estado={estadoObjeto} cortado={fin} cortes={cortes} trazo={trazo} />;
      case "frotar":
        return <Frotar id={objeto} estado={estadoObjeto} limpio={cuadro.progreso} espuma={espuma} fin={fin} />;
      case "llenar":
        return <Vaso nivel={cuadro.nivel} color={accion.anim === "servirTe" ? TE : AGUA} metas chorro={chorro} derrame={derrame} />;
      case "beber":
        return <Vaso nivel={cuadro.nivel} color={estado.beizi === "te" ? TE : AGUA} metas={false} chorro={false} derrame={false} />;
      case "girar":
        return <Olla giro={cuadro.progreso * 3 * 360} cuchara={cuchara} humea={cuadro.progreso > 0} />;
      case "morder":
        return <Morder id={objeto} estado={estadoObjeto} mordidas={mordidas} comido={fin} />;
    }
  })();

  const [iconoMano, claseMano] = MANO[tipo];
  const hz = textoHanzi(accion.verbo);

  return (
    <div
      data-testid="primer-plano"
      data-gesto={tipo}
      data-fase={fase}
      data-fondo={FONDO[tipo]}
      className={cx(styles.pp, fase === "sale" && styles.sale)}
      onPointerDown={abajo}
      onPointerMove={mover}
      onPointerUp={arriba}
      onPointerCancel={cancelado}
    >
      <div className={styles.mesa} />
      <div ref={zonaRef} className={styles.zona} data-testid="pp-zona">
        {visual}
      </div>

      <div className={styles.cartel}>
        <span className={styles.icono} aria-hidden="true">{accion.icono}</span>
        <span>
          <span className={styles.hz} data-texto>{hz}</span>
          <span className={styles.py} data-texto data-pinyin>
            {accion.verbo.map(([, py, t], j) => (
              <span key={j} style={{ color: COLOR_TONO[t] }}>
                {j > 0 ? " " : ""}
                {py}
              </span>
            ))}
          </span>
        </span>
      </div>

      <div className={styles.barra} aria-hidden="true">
        <i style={{ width: `${Math.min(100, cuadro.progreso * 100)}%` }} />
      </div>
      <div className={styles.reloj} style={{ "--r": `${cuadro.reloj * 100}%` } as CSSProperties} aria-hidden="true">
        ⏱
      </div>

      {mano && !fin && (
        <div className={cx(styles.mano, claseMano)} aria-hidden="true">
          {iconoMano}
        </div>
      )}

      <div className={styles.vaca}>
        <Vaca ojos={ojos} hocico={hocico} orejas={orejas} salta={salta} />
      </div>

      {medalla && (fase === "medalla" || fase === "sale") && (
        <div className={styles.medalla} data-medalla={medalla}>
          <div className={styles.rayos} aria-hidden="true" />
          <div className={styles.m} aria-hidden="true">{ICONO_MEDALLA[medalla]}</div>
          {CONFETI_PIEZAS.map((c, i) => (
            <div
              key={i}
              className={styles.confeti}
              style={{ left: `${c.x}%`, top: `${c.y}%`, background: c.color, animationDelay: `${c.retraso}s`, "--dx": `${c.dx}vmin` } as CSSProperties}
              aria-hidden="true"
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** 40 papelitos con posiciones fijas (pseudoaleatorias, iguales en cada render). */
const CONFETI_PIEZAS = Array.from({ length: 40 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return { x: r(1) * 100, y: -5 - r(2) * 20, dx: (r(3) - 0.5) * 30, retraso: r(4) * 0.4, color: CONFETI[i % CONFETI.length] };
});
