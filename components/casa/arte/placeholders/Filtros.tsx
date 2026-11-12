/** Filtros de crayón (valores de video/src/Texto.tsx, desplazamiento 4). Se monta una sola vez en app/layout.tsx. */
export function Filtros() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <filter id="crayon">
        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="7" />
        <feDisplacementMap in="SourceGraphic" scale="4" />
      </filter>
      <filter id="crayon-relleno" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" seed="2" result="ruido" />
        <feColorMatrix in="ruido" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -3 0 0 0 2.6" result="huecos" />
        <feComposite in="SourceGraphic" in2="huecos" operator="in" result="pintado" />
        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="7" result="onda" />
        <feDisplacementMap in="pintado" in2="onda" scale="4" />
      </filter>
    </svg>
  );
}
