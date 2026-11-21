import styles from "./RelojSolar.module.css";

/** Dónde está el astro: sol de 6 a 18, luna de 18 a 6; t va de 0 a 1 a lo largo del arco. */
export function posicionAstro(hora: number): { astro: "sol" | "luna"; t: number } {
  const h = ((hora % 24) + 24) % 24;
  if (h >= 6 && h < 18) return { astro: "sol", t: (h - 6) / 12 };
  return { astro: "luna", t: (h >= 18 ? h - 18 : h + 6) / 12 };
}

/** Franja del día en hanzi (dentro de la casa no hay español). */
function franja(hora: number): string {
  const h = ((hora % 24) + 24) % 24;
  if (h >= 6 && h < 11) return "早上";
  if (h >= 11 && h < 14) return "中午";
  if (h >= 14 && h < 18) return "下午";
  return "晚上";
}

/** Color del cielo del arco: amanecer, día, tarde, noche. */
function cielo(hora: number): string {
  const h = ((hora % 24) + 24) % 24;
  if (h >= 6 && h < 9) return "#ffd9b0";
  if (h >= 9 && h < 16) return "#bfe6f5";
  if (h >= 16 && h < 18) return "#ffb98a";
  return "#2f3b6b";
}

// Arco elíptico en un lienzo de 120 x 44: de (10, 40) a (110, 40), cima en (60, 8).
const CX = 60, CY = 40, RX = 50, RY = 32;

export function RelojSolar({ hora }: { hora: number }) {
  const { astro, t } = posicionAstro(hora);
  const ang = Math.PI * (1 - t);
  const x = CX + RX * Math.cos(ang);
  const y = CY - RY * Math.sin(ang);
  const arco = `M ${CX - RX} ${CY} A ${RX} ${RY} 0 0 1 ${CX + RX} ${CY}`;
  return (
    <div className={styles.reloj} role="img" aria-label={franja(hora)}>
      <svg className={styles.svg} viewBox="0 0 120 44" aria-hidden="true">
        <path className={styles.cielo} d={`${arco} Z`} style={{ fill: cielo(hora) }} />
        <path className={styles.arco} d={arco} />
        <line className={styles.suelo} x1={CX - RX - 4} y1={CY} x2={CX + RX + 4} y2={CY} />
        <g className={styles.astro} style={{ transform: `translate(${x}px, ${y}px)` }}>
          {astro === "sol" ? (
            <>
              {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                <line
                  key={a}
                  className={styles.rayo}
                  x1={0}
                  y1={-8}
                  x2={0}
                  y2={-11}
                  transform={`rotate(${a})`}
                />
              ))}
              <circle className={styles.sol} r={6} />
            </>
          ) : (
            <path className={styles.luna} d="M 3 -7 A 7 7 0 1 0 7 3 A 5.5 5.5 0 0 1 3 -7 Z" />
          )}
        </g>
      </svg>
    </div>
  );
}
