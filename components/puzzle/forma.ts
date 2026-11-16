/**
 * Silueta de pieza de puzzle: pestaña semicircular hacia afuera a la derecha y
 * hueco semicircular hacia adentro a la izquierda, ambos centrados en vertical.
 * Sentido horario desde arriba a la izquierda. La pestaña sobresale `r` px del ancho `w`.
 */
const ESQUINA = 10;

export function caminoPieza(w: number, h: number, r = 8): string {
  if (!(w > 0) || !(h > 0)) return "";
  const c = Math.min(ESQUINA, w / 2, h / 2);
  const rr = Math.max(0, Math.min(r, (h - 2 * c) / 2));
  const y1 = h / 2 - rr;
  const y2 = h / 2 + rr;
  return [
    `M ${c} 0`,
    `H ${w - c}`,
    `A ${c} ${c} 0 0 1 ${w} ${c}`,
    `V ${y1}`,
    `A ${rr} ${rr} 0 0 1 ${w} ${y2}`,
    `V ${h - c}`,
    `A ${c} ${c} 0 0 1 ${w - c} ${h}`,
    `H ${c}`,
    `A ${c} ${c} 0 0 1 0 ${h - c}`,
    `V ${y2}`,
    `A ${rr} ${rr} 0 0 0 0 ${y1}`,
    `V ${c}`,
    `A ${c} ${c} 0 0 1 ${c} 0`,
    "Z",
  ].join(" ");
}
