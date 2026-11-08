import { useId } from "react";
import { ARTE_PRIMER_PLANO } from "../arte/registro";
import { Capa, VISTA_OBJETO } from "../arte/Capa";
import { BANDA_LLENAR } from "../gestos/llenar";
import styles from "./PrimerPlano.module.css";

/**
 * Altura del interior del vaso en el cuadrado de la pieza (unidades de VISTA_OBJETO, -60..60):
 * nivel 0 = fondo (y 56), nivel 1 = borde (y -46). docs/arte.md pide que `vaso_grande` respete esa altura.
 */
const FONDO = 56;
const BORDE = -46;
export const nivelY = (n: number) => FONDO - Math.max(0, Math.min(1, n)) * (FONDO - BORDE);
const fraccionDesdeArriba = (n: number) => (nivelY(n) + 60) / 120;

/**
 * El vaso grande del primer plano. El líquido lo dibuja el código DETRÁS de la capa `vaso_grande`
 * y lo recorta la capa `vaso_mascara`:
 * - si la máscara es un PNG, se usa como `mask-image` CSS de un div con el líquido;
 * - si es el placeholder SVG, su forma va dentro de un `<clipPath>` (mismo encuadre) que recorta el rect.
 */
export function Vaso({
  nivel, color, metas, chorro, derrame,
}: { nivel: number; color: string; metas: boolean; chorro: boolean; derrame: boolean }) {
  const id = `vaso${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const mascara = ARTE_PRIMER_PLANO.vaso_mascara;
  const y = nivelY(nivel);
  return (
    <div className={styles.pieza} data-nivel={nivel.toFixed(2)}>
      {mascara.tipo === "img" ? (
        <div
          className={styles.llena}
          style={{
            maskImage: `url(${mascara.src})`, WebkitMaskImage: `url(${mascara.src})`,
            maskSize: "100% 100%", WebkitMaskSize: "100% 100%",
          }}
        >
          <div className={styles.liquido} style={{ top: `${fraccionDesdeArriba(nivel) * 100}%`, background: color }} />
        </div>
      ) : (
        <svg viewBox={VISTA_OBJETO} className={styles.llena} aria-hidden="true">
          <defs>
            <clipPath id={id}>
              <mascara.Componente />
            </clipPath>
          </defs>
          <rect clipPath={`url(#${id})`} x={-60} y={y} width={120} height={120} fill={color} />
        </svg>
      )}
      {metas && (
        <svg viewBox={VISTA_OBJETO} className={styles.llena} aria-hidden="true">
          {[BANDA_LLENAR.min, BANDA_LLENAR.max].map((n) => (
            <path key={n} d={`M-36 ${nivelY(n)} L36 ${nivelY(n)}`} stroke="#2E9B57" strokeWidth={2.5} strokeDasharray="5 4" />
          ))}
        </svg>
      )}
      <Capa capa={ARTE_PRIMER_PLANO.vaso_grande} nombre="vaso_grande" />
      <svg viewBox={VISTA_OBJETO} className={styles.llena} aria-hidden="true">
        {chorro && <rect x={-4} y={-120} width={8} height={y + 120} rx={4} fill={color} />}
        {derrame &&
          [-30, -12, 12, 30].map((x, i) => (
            <circle key={x} cx={x} cy={BORDE} r={4} fill={color} className={styles.gota} style={{ animationDelay: `${i * 0.06}s` }} />
          ))}
      </svg>
    </div>
  );
}
