import type { CSSProperties } from "react";
import { DibujoObjeto } from "../arte/DibujoObjeto";
import type { ObjetoId } from "../cocina/datos";
import styles from "./PrimerPlano.module.css";

export type Mordida = { u: number; v: number; r: number };

/** Máscara SVG (con `<mask>`) sobre TODO el dibujo: opaca salvo los círculos de los mordiscos. */
function mascara(mordidas: Mordida[]): string {
  const circulos = mordidas.map((m) => `<circle cx='${(m.u * 120).toFixed(1)}' cy='${(m.v * 120).toFixed(1)}' r='${m.r}' fill='black'/>`).join("");
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120' preserveAspectRatio='none'>` +
    `<defs><mask id='m'><rect width='120' height='120' fill='white'/>${circulos}</mask></defs>` +
    `<rect width='120' height='120' mask='url(#m)'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** 吃: cada toque deja un mordisco; al terminar el dibujo se desvanece. */
export function Morder({
  id, estado, mordidas, comido,
}: { id: ObjetoId; estado: string; mordidas: Mordida[]; comido: boolean }) {
  const ultima = mordidas[mordidas.length - 1];
  const m = mordidas.length ? mascara(mordidas) : undefined;
  const estilo: CSSProperties = m
    ? { maskImage: m, WebkitMaskImage: m, maskSize: "100% 100%", WebkitMaskSize: "100% 100%" }
    : {};
  return (
    <div className={styles.pieza}>
      <div className={styles.llena} style={{ ...estilo, opacity: comido ? 0 : 1, transition: "opacity .4s" }} data-mordidas={mordidas.length}>
        <DibujoObjeto id={id} estado={estado} />
      </div>
      {ultima &&
        [-1, -0.5, 0, 0.5, 1].map((d) => (
          <div
            key={`${mordidas.length}-${d}`}
            className={styles.miga}
            style={{ left: `${ultima.u * 100}%`, top: `${ultima.v * 100}%`, "--dx": `${d * 40}px`, "--dy": `${30 + Math.abs(d) * 25}px` } as CSSProperties}
            aria-hidden="true"
          />
        ))}
    </div>
  );
}
