/**
 * La tele del living encendida (después de 看): se prende como las antiguas (una raya blanca que se abre),
 * saltan chispitas, el vidrio pasa un dibujito que se mueve (nubes, sol y una pelota que rebota) y la luz
 * parpadea sobre el piso. Va dentro del mundo, encima del dibujo del cuarto y debajo de las zonas de toque.
 *
 * El vidrio sale de `MUEBLES_LIVING.tele` (los mismos números que usa `scripts/arte-iso.ts`): el dibujito se
 * pinta en un cuadro de 160 x 90 y una matriz lo lleva al plano de la pantalla en isometría.
 */
import { proyectar } from "../cocina/iso";
import { MUEBLES_LIVING } from "./lugares";
import styles from "./Tele.module.css";

const { tele: tv } = MUEBLES_LIVING;
const W = 160, H = 90;
const u = tv.u1 + 0.002;
// el vidrio, visto desde adelante: su borde izquierdo es el de v alto
const arribaIzq = proyectar(u, tv.v1 - tv.marco, tv.z1 - tv.marco);
const arribaDer = proyectar(u, tv.v0 + tv.marco, tv.z1 - tv.marco);
const abajoIzq = proyectar(u, tv.v1 - tv.marco, tv.z0 + tv.marco);
const r = (n: number) => Math.round(n * 1000) / 1000;
const MATRIZ = `matrix(${r((arribaDer.x - arribaIzq.x) / W)} ${r((arribaDer.y - arribaIzq.y) / W)} ${r((abajoIzq.x - arribaIzq.x) / H)} ${r((abajoIzq.y - arribaIzq.y) / H)} ${r(arribaIzq.x)} ${r(arribaIzq.y)})`;

/** Mancha de luz en el piso frente a la tele: un óvalo isométrico (polígono). */
const LUZ_PISO = Array.from({ length: 40 }, (_, i) => {
  const a = (i / 40) * Math.PI * 2;
  const p = proyectar(1.9 + Math.cos(a) * 1.5, (tv.v0 + tv.v1) / 2 + Math.sin(a) * 1.5, 0);
  return `${r(p.x)},${r(p.y)}`;
}).join(" ");

/** Chispitas: zigzags alrededor de la tele, en px del cuarto. */
const CHISPAS = [
  proyectar(tv.u1, tv.v1 + 0.15, tv.z1 + 0.25),
  proyectar(tv.u1, (tv.v0 + tv.v1) / 2, tv.z1 + 0.45),
  proyectar(tv.u1, tv.v0 - 0.15, tv.z1 + 0.25),
];

export function Tele() {
  return (
    <svg data-tele="encendida" aria-hidden="true" className={styles.tele} viewBox="0 0 1000 1000">
      <defs>
        <radialGradient id="teleLuz">
          <stop offset="0" stopColor="#e6f6ff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#d9f2ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="teleCielo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fd3f4" />
          <stop offset="1" stopColor="#e3f5ff" />
        </linearGradient>
        <clipPath id="teleVidrio">
          <rect width={W} height={H} />
        </clipPath>
        <pattern id="teleLineas" width="4" height="3" patternUnits="userSpaceOnUse">
          <rect width="4" height="1" fill="#1d2b33" opacity="0.12" />
        </pattern>
      </defs>

      <polygon className={styles.luzPiso} points={LUZ_PISO} fill="url(#teleLuz)" />

      <g transform={MATRIZ}>
        <rect className={styles.halo} x={-14} y={-14} width={W + 28} height={H + 28} rx={18} />
        <g clipPath="url(#teleVidrio)">
          <g className={styles.dibujo}>
            <rect width={W} height={H} fill="url(#teleCielo)" />
            <g className={styles.sol}>
              <circle cx={132} cy={20} r={10} fill="#ffc83d" stroke="#4a2a1c" strokeWidth={1.5} />
            </g>
            <g className={styles.nubes}>
              {[0, 1].map((k) => (
                <g key={k} transform={`translate(${k * 170} 0)`}>
                  <path d="M20 30 q6 -10 16 -4 q8 -8 16 2 q8 0 6 8 h-40 q-6 -4 2 -6z" fill="#fff" stroke="#4a2a1c" strokeWidth={1.2} />
                  <path d="M95 18 q5 -7 12 -3 q6 -6 12 1 q6 0 4 6 h-30 q-4 -3 2 -4z" fill="#fff" stroke="#4a2a1c" strokeWidth={1.2} />
                </g>
              ))}
            </g>
            <ellipse cx={40} cy={98} rx={70} ry={34} fill="#a5c391" stroke="#4a2a1c" strokeWidth={1.5} />
            <ellipse cx={128} cy={102} rx={66} ry={36} fill="#8dae7b" stroke="#4a2a1c" strokeWidth={1.5} />
            <g className={styles.pelotaX}>
              <g className={styles.pelotaY}>
                <circle cx={0} cy={0} r={7} fill="#e0896a" stroke="#4a2a1c" strokeWidth={1.4} />
                <path d="M-7 0 q7 -4 14 0" fill="none" stroke="#fff8ec" strokeWidth={1.6} />
              </g>
            </g>
            <rect width={W} height={H} fill="url(#teleLineas)" />
            <path d="M8 6 L40 6 L18 40 Z" fill="#fff" opacity="0.14" />
          </g>
          {/* el encendido: una raya blanca que se abre y se apaga */}
          <rect className={styles.encender} width={W} height={H} fill="#f4fbff" />
        </g>
      </g>

      {CHISPAS.map((p, i) => (
        <path
          key={i}
          className={styles.chispa}
          style={{ animationDelay: `${i * 0.08}s` }}
          d={`M${r(p.x - 10)} ${r(p.y)} l10 -17 l-3 13 l14 -7 l-10 20 l2 -12 z`}
          fill="#ffe36b"
          stroke="#4a2a1c"
          strokeWidth={1.3}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
