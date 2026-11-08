"use client";
import { useRef, useState, type CSSProperties, type PointerEvent as EventoPuntero } from "react";
import { textoHanzi } from "@/lib/silabas";
import { OBJETOS, type ObjetoId } from "./cocina/datos";
import { enPantalla, objetoBajo, transformCSS } from "./camara";
import { DibujoObjeto } from "./arte/DibujoObjeto";
import { FondoCuarto } from "./arte/Capa";
import { Vaca } from "./Vaca";
import { Globo } from "./Globo";
import { Opciones } from "./Opciones";
import { useCasa, type AlEvento, type CasaApi, type Punto } from "./useCasa";
import styles from "./Casa.module.css";

const IDS = Object.keys(OBJETOS) as ObjetoId[];
/** Menos de esto (unidades del cuarto) es un toque, no un arrastre. */
const UMBRAL_TOQUE = 12;
/** Distancia a (vaca.x, vaca.y - 100) para que el objeto "llegue" a la vaca. */
const RADIO_VACA = 130;

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const pct = (u: number) => `${u / 10}%`;

type Inicio =
  | { tipo: "obj"; id: ObjetoId; cx: number; cy: number; movio: boolean }
  | { tipo: "vaca"; cx: number; cy: number; x0: number; y0: number; movio: boolean };

const llegaALaVaca = (p: Punto, vaca: Punto) => Math.hypot(p.x - vaca.x, p.y - (vaca.y - 100)) < RADIO_VACA;

export function Casa({ onEvento }: { onEvento?: AlEvento }) {
  const casa = useCasa(onEvento);
  return <CasaVista casa={casa} />;
}

/** La vista de la casa: recibe el estado del hook y traduce los punteros a sus funciones. */
export function CasaVista({ casa }: { casa: CasaApi }) {
  const { estado, camara, vaca, cara, globo, opciones, ocupado, posiciones, clases, particulas } = casa;
  const mundoRef = useRef<HTMLDivElement>(null);
  const ini = useRef<Inicio | null>(null);
  const sinClick = useRef(false);
  const [arrObj, setArrObj] = useState<{ id: ObjetoId; x: number; y: number } | null>(null);
  const [arrVaca, setArrVaca] = useState<Punto | null>(null);

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
    if (!cancelado && llegaALaVaca({ x: OBJETOS[id].x + dx, y: OBJETOS[id].y + dy }, vaca)) void casa.soltarObjetoEnVaca(id);
  };
  const objetoClick = (id: ObjetoId) => {
    if (sinClick.current) {
      sinClick.current = false;
      return;
    }
    void casa.tocar(id);
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
    void casa.soltarVaca(cancelado ? i.x0 : i.x0 + dx, cancelado ? i.y0 : i.y0 + dy);
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

        {globo && <Globo silabas={globo} x={Math.max(12, Math.min(88, pGlobo.x))} y={Math.max(16, pGlobo.y)} />}

        {opciones && (
          <Opciones
            id={opciones.id}
            lista={opciones.lista}
            camara={camara}
            alElegir={(a) => void casa.elegir(opciones.id, a)}
          />
        )}

        {/* El primer plano (casa.primerPlano) lo dibuja la Task 9 y llama a casa.terminarPrimerPlano. */}

        {camara.s > 1 && (
          <button type="button" className={styles.alejar} aria-label="⤢" onClick={() => casa.verTodo()}>
            ⤢
          </button>
        )}
      </div>
    </div>
  );
}
