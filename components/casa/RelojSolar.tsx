import { useId } from "react";
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

/** Color del cielo bajo el arco: amanecer, día, tarde, noche. */
function cielo(hora: number): string {
  const h = ((hora % 24) + 24) % 24;
  // paleta mantel: amanecer crema, día lavanda pálido, tarde naranja suave, noche lavanda oscura
  if (h >= 6 && h < 9) return "#f7d7b3";
  if (h >= 9 && h < 16) return "#e4ddf3";
  if (h >= 16 && h < 18) return "#f2c08a";
  return "#7e62b8";
}

// Lienzo de 120 x 44: el camino es medio arco de (20, 38) a (100, 38) con la cima en (60, 12).
// El sol espera en la punta izquierda y la luna en la derecha.
const CX = 60, CY = 38, RX = 40, RY = 26;
const SOL = { x: 9, y: 33 }, LUNA = { x: 111, y: 33 };

/** Punto del camino en t (0 = junto al sol, 1 = junto a la luna). */
export function puntoCamino(t: number): { x: number; y: number } {
  const a = Math.PI * (1 - Math.min(1, Math.max(0, t)));
  return { x: CX + RX * Math.cos(a), y: CY - RY * Math.sin(a) };
}

const r1 = (n: number) => Math.round(n * 100) / 100;

/**
 * Reloj del día de un cuarto: un camino del sol a la luna. Lo recorrido se pinta (del amarillo al azul de la
 * noche), una marca dice dónde va el día y cada paso del cuarto (objeto tocado o acción lograda) es un punto que
 * se llena. Al terminar el cuarto el camino queda lleno y la luna se enciende.
 *
 * - `hora`: la del cuarto; da el color del cielo y el nombre que se lee (早上, 中午…).
 * - `hechos` / `total`: los pasos del cuarto. Sin `total`, el reloj muestra solo la hora (camino a la mitad, sin puntos).
 * - `className`: ajuste de lugar o tamaño en un cuarto (en la cocina, angosto para no pisar ⤢ ni el minimapa).
 */
export function RelojSolar({ hora, hechos = 0, total = 0, className }: { hora: number; hechos?: number; total?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const avance = total > 0 ? Math.min(1, hechos / total) : 0.5;
  const lleno = total > 0 && avance >= 1;
  const inicio = puntoCamino(0), fin = puntoCamino(1), ahora = puntoCamino(avance);
  const camino = `M ${inicio.x} ${inicio.y} A ${RX} ${RY} 0 0 1 ${fin.x} ${fin.y}`;
  const recorrido = `M ${inicio.x} ${inicio.y} A ${RX} ${RY} 0 0 1 ${r1(ahora.x)} ${r1(ahora.y)}`;
  const pasos = Array.from({ length: total }, (_, i) => ({ ...puntoCamino((i + 1) / total), hecho: i < hechos }));
  return (
    <div
      className={className ? `${styles.reloj} ${className}` : styles.reloj}
      role="img"
      aria-label={franja(hora)}
      data-avance={r1(avance)}
      data-lleno={lleno ? "true" : undefined}
    >
      <svg className={styles.svg} viewBox="0 0 120 44" aria-hidden="true">
        <defs>
          <linearGradient id={`dia${id}`} gradientUnits="userSpaceOnUse" x1={inicio.x} y1="0" x2={fin.x} y2="0">
            <stop offset="0" stopColor="#e59d45" />
            <stop offset="0.55" stopColor="#b7a6da" />
            <stop offset="1" stopColor="#7e62b8" />
          </linearGradient>
        </defs>
        <path className={styles.cielo} d={`${camino} Z`} style={{ fill: cielo(hora) }} />
        <line className={styles.suelo} x1={2} y1={CY} x2={118} y2={CY} />
        {/* el camino que falta, punteado, y encima lo recorrido */}
        <path className={styles.falta} d={camino} />
        {avance > 0 && <path className={styles.recorrido} d={recorrido} style={{ stroke: `url(#dia${id})` }} />}
        {pasos.map((p, i) => (
          <circle key={i} className={p.hecho ? styles.pasoHecho : styles.paso} cx={r1(p.x)} cy={r1(p.y)} r={2.2} data-paso={p.hecho ? "hecho" : "falta"} />
        ))}
        {/* el sol: brilla al empezar y se va apagando a medida que avanza el día */}
        <g className={styles.sol} transform={`translate(${SOL.x} ${SOL.y})`} style={{ opacity: r1(1 - 0.45 * avance) }}>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <line key={a} className={styles.rayo} x1={0} y1={-6.5} x2={0} y2={-8.5} transform={`rotate(${a})`} />
          ))}
          <circle className={styles.disco} r={5} />
        </g>
        {/* la luna: tenue hasta que se termina el cuarto; entonces se enciende */}
        <g className={styles.luna} transform={`translate(${LUNA.x} ${LUNA.y})`} data-encendida={lleno ? "true" : undefined}>
          <circle className={styles.halo} r={8.5} />
          <path className={styles.creciente} d="M 2 -6 A 6 6 0 1 0 6 2.5 A 4.6 4.6 0 0 1 2 -6 Z" />
        </g>
        {/* dónde va el día */}
        <g className={styles.marca} style={{ transform: `translate(${r1(ahora.x)}px, ${r1(ahora.y)}px)` }}>
          <circle r={4} />
        </g>
      </svg>
    </div>
  );
}
