import type { CSSProperties } from "react";
import { FONDO_CUARTO, type Capa as TipoCapa } from "./registro";

export const VISTA_OBJETO = "-60 -60 120 120";
export const VISTA_CUARTO = "0 0 1000 1000";

const llena: CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" };

/** Dibuja una capa del registro: SVG (placeholder) o imagen (dibujo a mano). Mismo encuadre cuadrado en ambos casos. */
export function Capa({
  capa, className, style, vista = VISTA_OBJETO, nombre,
}: { capa: TipoCapa; className?: string; style?: CSSProperties; vista?: string; nombre?: string }) {
  if (capa.tipo === "img") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={capa.src} alt="" draggable={false} className={className} data-capa={nombre} style={{ ...llena, pointerEvents: "none", ...style }} />;
  }
  const { Componente } = capa;
  return (
    <svg viewBox={vista} className={className} data-capa={nombre} style={{ ...llena, pointerEvents: "none", ...style }} aria-hidden="true">
      <Componente />
    </svg>
  );
}

/** El cuarto completo: siempre con el encuadre de 1000 x 1000 unidades, para que no se pueda dibujar mal. */
export function FondoCuarto({ cuarto, className, style }: { cuarto: keyof typeof FONDO_CUARTO; className?: string; style?: CSSProperties }) {
  return <Capa capa={FONDO_CUARTO[cuarto]} vista={VISTA_CUARTO} nombre={`cuarto_${cuarto}`} className={className} style={style} />;
}
