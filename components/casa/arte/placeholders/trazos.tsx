/** Helpers de dibujo a crayón para los placeholders (los dibujos a mano no los usan). */
export const TINTA = "#4A2A1C";

/** Forma rellena con contorno; grosor 0 = sin contorno. */
export function Forma({ d, fill, grosor = 4 }: { d: string; fill: string; grosor?: number }) {
  return (
    <>
      <path d={d} fill={fill} filter="url(#crayon-relleno)" />
      {grosor > 0 && (
        <path d={d} fill="none" stroke={TINTA} strokeWidth={grosor} strokeLinejoin="round" strokeLinecap="round" filter="url(#crayon)" />
      )}
    </>
  );
}

/** Línea suelta a crayón. */
export function Trazo({ d, color = TINTA, grosor = 4 }: { d: string; color?: string; grosor?: number }) {
  return <path d={d} fill="none" stroke={color} strokeWidth={grosor} strokeLinecap="round" filter="url(#crayon)" />;
}

export const elip = (cx: number, cy: number, rx: number, ry: number) =>
  `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${2 * rx} 0 a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;

/** Rectángulo redondeado como trayecto. */
export const rr = (x: number, y: number, w: number, h: number, r = 10) =>
  `M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`;
