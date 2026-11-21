"use client";
import { useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type ReactNode, type Ref } from "react";
import { textoHanzi } from "@/lib/silabas";
import { sfx } from "../audio/sonido";
import { FondoCuarto } from "../arte/Capa";
import { FONDO_CUARTO } from "../arte/registro";
import { aspectoDe, encuadrar, enPantalla, transformCSS, type Camara } from "../camara";
import { proyectar } from "../cocina/iso";
import { Globo } from "../Globo";
import { RelojSolar } from "../RelojSolar";
import type { AlEvento } from "../useCasa";
import { useEscenario } from "../useEscenario";
import { Vaca, VacaSentada } from "../Vaca";
import { Bandeja } from "./Bandeja";
import { FichaGanada } from "./FichaGanada";
import { completo, fichaId, fichasDe, horaDe, todasLasFichas } from "./progreso";
import { silabasDeFichas, useCuarto } from "./useCuarto";
import type { CuartoId, DefCuarto, ProgresoCuarto } from "./tipos";
import cs from "../Casa.module.css";
import styles from "./Motor.module.css";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const pct = (n: number) => `${n / 10}%`;
const VER_TODO: Camara = { x: 500, y: 500, s: 1 };
/** Lo que parpadean las siluetas de la bandeja al tocar la puerta cerrada. */
const PARPADEO_MS = 1200;

/** Nombre de cada cuarto en hanzi (el de la puerta). */
const NOMBRE_CUARTO: Record<CuartoId, string> = { living: "客厅", cocina: "厨房", bano: "浴室", dormitorio: "卧室" };

/**
 * La puerta, en la pared izquierda (u 0, v 5.4, a media altura): bajo la ventana redonda, lejos de la tele
 * y visible también en el encuadre vertical del celular. Todos los cuartos son la misma caja isométrica.
 */
export const PUERTA = (() => {
  const c = proyectar(0, 5.4, 1.1);
  return { x: Math.round(c.x) - 35, y: Math.round(c.y) - 45, w: 70, h: 90 };
})();

/** Lo que la casa puede pedirle al cuarto desde afuera (el minimapa). */
export interface ControlCuarto {
  /** Lo mismo que tocar la puerta: cerrada, boing (si nada suena) y la bandeja parpadea; completa, `alSalir`. */
  tocarPuerta(): void;
}

const tieneFondo = (id: CuartoId): id is keyof typeof FONDO_CUARTO => id in FONDO_CUARTO;

export function CuartoMotor({
  def, progreso: progresoGuardado, activo, alCambiar, alEvento, alSalir, alAbrir, hijos, camara = VER_TODO, sorpresa = false, decorado, ref,
}: {
  def: DefCuarto;
  progreso: ProgresoCuarto;
  activo: boolean;
  alCambiar: (p: ProgresoCuarto, nuevas: string[]) => void;
  alEvento?: AlEvento;
  /** Tocar la puerta con el cuarto completo. */
  alSalir: () => void;
  /** Objeto con `abre`. */
  alAbrir?: (que: "mesa") => void;
  /** Capas extra (la mesa a pantalla completa). */
  hijos?: ReactNode;
  /** A dónde mira la cámara (el zoom del living a la mesa); por defecto, todo el cuarto. */
  camara?: Camara;
  /** La vaca se sorprende: orejas arriba, ojos grandes y un saltito (al llegar a la mesa). */
  sorpresa?: boolean;
  /** Dibujos sobre los muebles, dentro del mundo (el zoom los lleva); debajo de las zonas de toque. */
  decorado?: ReactNode;
  ref?: Ref<ControlCuarto>;
}) {
  const c = useCuarto(def, { progreso: progresoGuardado, alCambiar, alEvento, activo, alAbrir });
  const { ref: raiz, tam, medido } = useEscenario();
  const aspecto = aspectoDe(tam.w, tam.h);
  const vista = encuadrar(camara, tam.w, tam.h);

  const [parpadeo, setParpadeo] = useState(0);
  const parpadeoT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(parpadeoT.current), []);

  const listo = completo(def, c.progreso);
  const tocarPuerta = () => {
    if (listo) return alSalir();
    // cerrada: boing (nunca encima del mandarín ni a mitad de la caminata) y la bandeja muestra lo que falta
    if (!c.ocupado && c.puedeSonar()) sfx("boing", "cocina");
    setParpadeo((n) => n + 1);
    clearTimeout(parpadeoT.current);
    parpadeoT.current = setTimeout(() => setParpadeo(0), PARPADEO_MS);
  };
  useImperativeHandle(ref, () => ({ tocarPuerta }));

  const sil = silabasDeFichas(def);
  const todas = todasLasFichas(def).map((id) => ({ id, silabas: sil.get(id)! }));
  const elegido = c.elegido ? def.objetos.find((o) => o.id === c.elegido) : undefined;
  const pendientes = elegido
    ? def.acciones.filter((a) => elegido.acciones.includes(a.id) && !c.progreso.logros.includes(`${a.id}@${elegido.id}`))
    : [];
  const pPildora = elegido ? enPantalla(vista, elegido.zona.x + elegido.zona.w / 2, elegido.zona.y, aspecto) : null;
  const pGlobo = enPantalla(vista, c.vaca.x, c.vaca.y - 170, aspecto);
  const ficha = c.cola[0];
  /** Qué se puede tocar: lo no tocado late (nuevo); lo tocado con acciones por hacer queda con un brillo suave. */
  const pistaDe = (o: DefCuarto["objetos"][number]): "nuevo" | "pendiente" | undefined =>
    !c.progreso.tocados.includes(o.id)
      ? "nuevo"
      : o.acciones.some((a) => !c.progreso.logros.includes(`${a}@${o.id}`))
        ? "pendiente"
        : undefined;

  const estiloVaca: CSSProperties = {
    left: pct(c.vaca.x),
    top: pct(c.vaca.y),
    transition: `left ${c.pasoMs}ms ease-in-out, top ${c.pasoMs}ms ease-in-out`,
  };

  return (
    <div
      ref={raiz}
      className={styles.cuarto}
      data-cuarto-motor={def.id}
      data-ocupado={c.ocupado ? "true" : undefined}
    >
      <div
        data-mundo
        className={cs.mundo}
        style={{ transform: transformCSS(vista, aspecto), transition: medido ? undefined : "none" }}
      >
        {tieneFondo(def.id) && <FondoCuarto cuarto={def.id} />}
        {decorado}

        {def.objetos.map((o) => (
          <button
            key={o.id}
            type="button"
            data-objeto={o.id}
            data-pista={pistaDe(o)}
            aria-label={textoHanzi(o.nombre)}
            className={cx(styles.zona, c.brillo === o.id && styles.brilla)}
            style={{ left: pct(o.zona.x), top: pct(o.zona.y), width: pct(o.zona.w), height: pct(o.zona.h) }}
            onClick={() => void c.tocarObjeto(o.id)}
          />
        ))}

        <button
          type="button"
          data-puerta
          data-lista={listo ? "true" : undefined}
          aria-label={NOMBRE_CUARTO[def.salida]}
          className={cx(styles.puerta, listo && styles.puertaLista)}
          style={{ left: pct(PUERTA.x), top: pct(PUERTA.y), width: pct(PUERTA.w), height: pct(PUERTA.h) }}
          onClick={tocarPuerta}
        >
          <span className={styles.puertaIcono} aria-hidden="true">🚪</span>
          <span className={styles.puertaHz} aria-hidden="true">{NOMBRE_CUARTO[def.salida]}</span>
        </button>

        <div
          data-vaca
          data-pose={c.pose ?? undefined}
          role="img"
          aria-label="牛"
          className={cx(cs.vaca, styles.vaca)}
          style={estiloVaca}
        >
          <div className={cs.sombra} />
          {c.pose === "sentada" ? (
            <VacaSentada />
          ) : (
            <Vaca
              ojos={sorpresa ? "sorpresa" : c.pose === "mira" ? "izquierda" : "abiertos"}
              hocico={c.hocico}
              orejas={sorpresa ? "arriba" : "normales"}
              salta={sorpresa}
            />
          )}
        </div>
      </div>

      {c.globo && <Globo silabas={c.globo} x={Math.max(12, Math.min(88, pGlobo.x))} y={Math.max(16, pGlobo.y)} />}

      {elegido && pPildora && pendientes.length > 0 && (
        <div
          className={styles.pildoras}
          style={{ left: `${Math.max(14, Math.min(86, pPildora.x))}%`, top: `${Math.max(10, Math.min(80, pPildora.y))}%` }}
        >
          {pendientes.map((a) => {
            const hz = textoHanzi(a.verbo);
            return (
              <button
                key={a.id}
                type="button"
                data-pildora={a.id}
                aria-label={hz}
                className={styles.pildora}
                onClick={() => void c.hacer(a.id, elegido.id)}
              >
                <span aria-hidden="true">{a.icono}</span>
                <span className={styles.pildoraHz} aria-hidden="true">{hz}</span>
              </button>
            );
          })}
        </div>
      )}

      <RelojSolar hora={horaDe(def, c.progreso)} className={styles.reloj} />
      <div className={styles.bandejaCaja} data-parpadea={parpadeo ? "true" : undefined} key={parpadeo}>
        <Bandeja fichas={fichasDe(def, c.progreso)} todas={todas} />
      </div>

      {ficha && <FichaGanada key={fichaId(ficha)} silabas={ficha} alTerminar={c.sacarDeCola} />}

      {hijos}
    </div>
  );
}
