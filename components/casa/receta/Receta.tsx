"use client";
import { useEffect, useRef, useState, type PointerEvent as EventoPuntero } from "react";
import { textoHanzi, type Silaba } from "@/lib/silabas";
import { COLOR_TONO } from "@/lib/tonos";
import type { Accion } from "../cocina/acciones";
import { WO_ZUO_HAO_FAN_LE } from "../cocina/frases";
import { callar, decir } from "../audio/voz";
import { musica } from "../audio/sonido";
import { efectoYLuegoVoz } from "../audio/turnos";
import { ARTE_RECETA, ARTE_REFRI, type Capa as TipoCapa } from "../arte/registro";
import { Capa } from "../arte/Capa";
import { crearGirar } from "../gestos/girar";
import { medalla as medallaDe, type Medalla } from "../gestos/medalla";
import type { Gesto, P } from "../gestos/tipos";
import { Vaca, type Hocico, type Ojos, type Orejas } from "../Vaca";
import { echar, INGREDIENTES, lista, NOMBRE_INGREDIENTE, type Ingrediente } from "./ingredientes";
import pp from "../primer-plano/PrimerPlano.module.css";
import styles from "./Receta.module.css";

/**
 * entra: iris + 我做饭 (no se aceptan toques) · echar: se echan los ingredientes ·
 * revolver: con los tres, la cuchara · remate: 我做好饭了 · sale: iris de salida.
 */
type Fase = "entra" | "echar" | "revolver" | "remate" | "sale";

const DIBUJO: Record<Ingrediente, TipoCapa> = { mi: ARTE_REFRI.mi, shui: ARTE_RECETA.jarro, huluobo: ARTE_REFRI.huluobo };
/** Rodajas de zanahoria en la olla (posición %, tamaño %), iguales en cada render. */
const RODAJAS = [[36, 38, 11], [58, 34, 10], [64, 56, 12], [42, 62, 10], [50, 48, 9], [30, 54, 9]] as const;
/** Más que esto (px) ya es arrastre, no toque. */
const UMBRAL_ARRASTRE = 8;

const ahora = () => performance.now();
const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const bocaDe = (a: number): Hocico => (a > 0.5 ? "abierta" : a > 0.15 ? "o" : "sonrisa");

function Pinyin({ s }: { s: Silaba[] }) {
  return (
    <span className={styles.py} data-texto data-pinyin>
      {s.map(([, py, t], j) => (
        <span key={j} style={{ color: COLOR_TONO[t] }}>
          {j > 0 ? " " : ""}
          {py}
        </span>
      ))}
    </span>
  );
}

/**
 * La receta del 米饭 (la acción 做饭 de la olla vacía), a pantalla completa con el contenedor e iris del
 * primer plano. Arriba la tarjeta 米 + 水 + 胡萝卜; abajo la olla y los ingredientes, que se arrastran o se
 * tocan para echarlos. Con los tres aparece la cuchara y se revuelve (`crearGirar`). Al terminar, la vaca
 * dice 我做好饭了 y `alTerminar` recibe la medalla (tiempo desde que apareció la cuchara), una sola vez.
 */
export function Receta({
  accion, alTerminar, alCancelar,
}: {
  accion: Accion;
  alTerminar: (m: Medalla) => void;
  /** ✕: salir sin cocinar. */
  alCancelar: () => void;
}) {
  const [fase, setFase] = useState<Fase>("entra");
  const [en, setEn] = useState<Set<Ingrediente>>(() => new Set());
  const [progreso, setProgreso] = useState(0);
  /** Dónde está la cuchara en la olla (null: aún no se toca; se ve la mano guía). */
  const [cuchara, setCuchara] = useState<P | null>(null);
  const [fantasma, setFantasma] = useState<{ i: Ingrediente; x: number; y: number } | null>(null);
  const [chapoteo, setChapoteo] = useState(0);
  const [ojos, setOjos] = useState<Ojos>("abiertos");
  const [hocico, setHocico] = useState<Hocico>("sonrisa");
  const [orejas, setOrejas] = useState<Orejas>("normales");
  const [salta, setSalta] = useState(false);

  const raizRef = useRef<HTMLDivElement>(null);
  const zonaRef = useRef<HTMLDivElement>(null);
  const faseRef = useRef<Fase>("entra");
  const enRef = useRef<Set<Ingrediente>>(en);
  const sesionRef = useRef({ vivo: false });
  const gestoRef = useRef<Gesto | null>(null);
  const terminadoRef = useRef(false);
  const t0Ref = useRef(0);
  const apretadoRef = useRef(false);
  /** Frases en la cola o sonando: el pop nunca suena encima del mandarín. */
  const hablando = useRef(0);
  /** Las frases van en fila (`decir` corta la anterior). */
  const colaRef = useRef<Promise<unknown>>(Promise.resolve());
  const arrastreRef = useRef<{ i: Ingrediente; x0: number; y0: number; movido: boolean } | null>(null);
  /** Después de un arrastre, el click que lo sigue no vuelve a echar. */
  const sinClickRef = useRef(false);
  const alTerminarRef = useRef(alTerminar);
  useEffect(() => {
    alTerminarRef.current = alTerminar;
  }, [alTerminar]);

  const ponerFase = (f: Fase) => {
    faseRef.current = f;
    setFase(f);
  };

  /** Pone `f` al final de la fila de voz (efecto + frase). `decir` nunca rechaza aquí: sin voz, sigue. */
  const enFila = (f: () => Promise<unknown>): Promise<void> => {
    hablando.current++;
    const p = colaRef.current.then(f).catch(() => {}).then(() => {
      hablando.current--;
    });
    colaRef.current = p;
    return p;
  };
  const voz = (s: Silaba[]) => {
    const sesion = sesionRef.current;
    if (!sesion.vivo) return Promise.resolve();
    return decir(s, { alBoca: (a) => sesion.vivo && setHocico(bocaDe(a)), juego: "cocina" }).finally(() => {
      if (sesion.vivo) setHocico("sonrisa"); // también si decir rechaza: la boca no queda abierta
    }).then(() => {});
  };

  // ---- entrada: iris, música de revolver y 我做饭; al salir vuelve la música de la cocina ----
  useEffect(() => {
    const sesion = { vivo: true };
    sesionRef.current = sesion;
    const enCurso = hablando; // el contador vivo (no un nodo): se lee al salir
    musica.tocar("g-girar");
    void (async () => {
      await esperar(500);
      if (!sesion.vivo) return;
      await enFila(() => voz(accion.frase));
      if (sesion.vivo) ponerFase("echar");
    })();
    return () => {
      sesion.vivo = false;
      if (enCurso.current > 0) callar(); // ✕ o pestaña oculta a mitad de una frase: se calla
      musica.tocar("cocina");
    };
  }, [accion]); // enFila/voz/ponerFase solo usan refs y setters estables

  // ---- echar ----
  const echarIngrediente = (i: Ingrediente) => {
    if (faseRef.current !== "echar") return;
    const antes = enRef.current;
    const despues = echar(antes, i);
    if (despues === antes) return; // repetido: nada
    enRef.current = despues;
    setEn(despues);
    setChapoteo((n) => n + 1);
    const nombre = () => voz(NOMBRE_INGREDIENTE[i]);
    // el pop solo si nada suena ni espera: nunca encima del mandarín
    void enFila(hablando.current === 0 ? () => efectoYLuegoVoz("pop", nombre, { juego: "cocina" }) : nombre);
    if (lista(despues)) {
      gestoRef.current = crearGirar();
      t0Ref.current = ahora(); // la medalla cuenta desde que aparece la cuchara
      ponerFase("revolver");
    }
  };

  const dentroDeOlla = (x: number, y: number) => {
    const r = zonaRef.current?.getBoundingClientRect();
    return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };
  const enRaiz = (x: number, y: number) => {
    const r = raizRef.current?.getBoundingClientRect();
    return { x: x - (r?.left ?? 0), y: y - (r?.top ?? 0) };
  };

  const ingredienteAbajo = (i: Ingrediente) => (e: EventoPuntero<HTMLButtonElement>) => {
    sinClickRef.current = false;
    if (faseRef.current !== "echar" || enRef.current.has(i)) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* jsdom / navegadores viejos */
    }
    arrastreRef.current = { i, x0: e.clientX, y0: e.clientY, movido: false };
  };
  const ingredienteMueve = (e: EventoPuntero<HTMLButtonElement>) => {
    const a = arrastreRef.current;
    if (!a) return;
    if (!a.movido && Math.hypot(e.clientX - a.x0, e.clientY - a.y0) > UMBRAL_ARRASTRE) a.movido = true;
    if (a.movido) setFantasma({ i: a.i, ...enRaiz(e.clientX, e.clientY) });
  };
  const ingredienteArriba = (e: EventoPuntero<HTMLButtonElement>) => {
    const a = arrastreRef.current;
    arrastreRef.current = null;
    setFantasma(null);
    if (!a?.movido) return; // un toque: lo echa el click
    sinClickRef.current = true;
    if (dentroDeOlla(e.clientX, e.clientY)) echarIngrediente(a.i);
  };
  const ingredienteCancela = () => {
    arrastreRef.current = null;
    setFantasma(null);
  };
  const ingredienteClick = (i: Ingrediente) => {
    if (sinClickRef.current) {
      sinClickRef.current = false;
      return;
    }
    echarIngrediente(i);
  };

  // ---- revolver (punteros capturados en toda la receta, normalizados a la olla) ----
  const punto = (e: EventoPuntero): P => {
    const r = zonaRef.current?.getBoundingClientRect();
    if (!r || !r.width || !r.height) return { u: -1, v: -1 };
    return { u: (e.clientX - r.left) / r.width, v: (e.clientY - r.top) / r.height };
  };

  /** Si se revolvió todo, arranca el final (una sola vez). */
  const revisar = () => {
    const g = gestoRef.current;
    if (!g || terminadoRef.current || !g.listo()) return;
    terminadoRef.current = true;
    const m = medallaDe((ahora() - t0Ref.current) / 1000);
    const sesion = sesionRef.current;
    apretadoRef.current = false;
    ponerFase("remate");
    setProgreso(1);
    void (async () => {
      await esperar(500);
      if (!sesion.vivo) return;
      setOjos("felices");
      setOrejas("arriba");
      setSalta(true);
      // después del último nombre; el ding termina antes de 我做好饭了
      await enFila(() => (sesion.vivo ? efectoYLuegoVoz("ding", () => voz(WO_ZUO_HAO_FAN_LE), { juego: "cocina" }) : Promise.resolve()));
      if (!sesion.vivo) return;
      await esperar(400);
      if (!sesion.vivo) return;
      ponerFase("sale");
      await esperar(450);
      if (!sesion.vivo) return;
      alTerminarRef.current(m);
    })();
  };

  const abajo = (e: EventoPuntero<HTMLDivElement>) => {
    const g = gestoRef.current;
    if (!g || faseRef.current !== "revolver") return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* jsdom / navegadores viejos */
    }
    const p = punto(e);
    g.abajo(p, ahora());
    apretadoRef.current = true;
    setCuchara(p);
    setProgreso(g.progreso());
    revisar();
  };
  const mover = (e: EventoPuntero<HTMLDivElement>) => {
    const g = gestoRef.current;
    if (!g || faseRef.current !== "revolver" || !apretadoRef.current) return;
    const p = punto(e);
    g.mover(p, ahora());
    setCuchara(p);
    setProgreso(g.progreso());
    revisar();
  };
  const arriba = (e: EventoPuntero<HTMLDivElement>) => {
    const g = gestoRef.current;
    if (!g || faseRef.current !== "revolver") return;
    g.arriba(punto(e), ahora());
    apretadoRef.current = false;
  };
  const cancelado = () => {
    gestoRef.current?.reiniciar();
    apretadoRef.current = false;
  };

  // ---- vista ----
  const revolviendo = fase === "revolver" || fase === "remate" || fase === "sale";
  const giro = progreso * 3 * 360;

  return (
    <div
      ref={raizRef}
      data-testid="receta"
      data-fase={fase}
      data-fondo="fuego"
      className={cx(pp.pp, styles.receta, fase === "sale" && pp.sale)}
      onPointerDown={abajo}
      onPointerMove={mover}
      onPointerUp={arriba}
      onPointerCancel={cancelado}
    >
      {/* la tarjeta de receta: 米 + 水 + 胡萝卜, sin español */}
      <div className={styles.tarjeta} data-testid="tarjeta-receta">
        {INGREDIENTES.map((i, k) => (
          <div key={i} className={styles.paso}>
            {k > 0 && <span className={styles.mas} aria-hidden="true">+</span>}
            <div className={styles.item} data-ingrediente={i} data-listo={en.has(i) || undefined}>
              <span className={styles.mini}>
                <Capa capa={DIBUJO[i]} nombre={`receta_${i}`} />
              </span>
              <span className={styles.hz} data-texto>{textoHanzi(NOMBRE_INGREDIENTE[i])}</span>
              <Pinyin s={NOMBRE_INGREDIENTE[i]} />
              {en.has(i) && <span className={styles.check} aria-hidden="true">✓</span>}
            </div>
          </div>
        ))}
      </div>

      {/* la olla grande sobre el fogón */}
      <div className={styles.fogon} aria-hidden="true" />
      <div ref={zonaRef} className={styles.olla} data-testid="receta-olla">
        <div className={styles.borde} />
        <div className={styles.fondo}>
          {en.has("shui") && <div className={styles.agua} data-en-olla="shui" />}
          <div className={styles.contenido} style={{ transform: `rotate(${giro}deg)` }}>
            {en.has("mi") && <div className={styles.arroz} data-en-olla="mi" />}
            {en.has("huluobo") && (
              <div className={styles.zanahoria} data-en-olla="huluobo">
                {RODAJAS.map(([x, y, s], k) => (
                  <i key={k} style={{ left: `${x}%`, top: `${y}%`, width: `${s}%`, height: `${s}%` }} />
                ))}
              </div>
            )}
          </div>
          {chapoteo > 0 && <div key={chapoteo} className={styles.chapoteo} aria-hidden="true" />}
        </div>
        {progreso > 0 && [32, 50, 68].map((x, k) => (
          <div key={x} className={pp.vapor} style={{ left: `${x}%`, animationDelay: `${k * 0.45}s` }} aria-hidden="true" />
        ))}
        {fase === "revolver" && cuchara && (
          <div className={pp.cuchara} data-testid="cuchara" style={{ left: `${cuchara.u * 100}%`, top: `${cuchara.v * 100}%` }} aria-hidden="true">
            🥄
          </div>
        )}
      </div>

      {/* la mano guía de revolver, como en el primer plano de hoy, hasta el primer toque */}
      {fase === "revolver" && !cuchara && (
        <div className={cx(pp.mano, pp.mGirar, styles.guia)} data-testid="cuchara" aria-hidden="true">
          🥄
        </div>
      )}

      {revolviendo ? (
        <div className={cx(pp.barra, styles.barra)} aria-hidden="true">
          <i style={{ width: `${Math.min(100, progreso * 100)}%` }} />
        </div>
      ) : (
        <div className={styles.ingredientes}>
          {INGREDIENTES.map((i) => (
            <button
              key={i}
              type="button"
              className={styles.ingrediente}
              data-ingrediente={i}
              data-usado={en.has(i) || undefined}
              aria-label={textoHanzi(NOMBRE_INGREDIENTE[i])}
              aria-disabled={en.has(i) || undefined}
              onPointerDown={ingredienteAbajo(i)}
              onPointerMove={ingredienteMueve}
              onPointerUp={ingredienteArriba}
              onPointerCancel={ingredienteCancela}
              onClick={() => ingredienteClick(i)}
            >
              <Capa capa={DIBUJO[i]} nombre={`receta_${i}`} />
            </button>
          ))}
        </div>
      )}

      {fantasma && (
        <div className={styles.fantasma} style={{ left: fantasma.x, top: fantasma.y }} aria-hidden="true">
          <Capa capa={DIBUJO[fantasma.i]} nombre={`receta_${fantasma.i}`} />
        </div>
      )}

      {fase !== "remate" && fase !== "sale" && (
        <button
          type="button"
          className={pp.cerrar}
          aria-label="关"
          data-pinyin="guān"
          title="关 guān"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => {
            sesionRef.current.vivo = false;
            alCancelar();
          }}
        >
          <span aria-hidden="true">✕</span>
        </button>
      )}

      <div className={pp.vaca}>
        <Vaca ojos={ojos} hocico={hocico} orejas={orejas} salta={salta} />
      </div>
    </div>
  );
}
