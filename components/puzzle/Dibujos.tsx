import type { ReactNode } from "react";

/**
 * Dibujos del puzzle, a crayón como la cocina: contorno café #4A2A1C y el filtro `crayon` del layout.
 * Todos en un viewBox de 100×100. Son íconos de la escena, no imágenes de redes.
 */
const TINTA = "#4A2A1C";
const trazo = { stroke: TINTA, strokeWidth: 5, strokeLinejoin: "round", strokeLinecap: "round" } as const;

function Lienzo({ children, titulo, className }: { children: ReactNode; titulo?: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role={titulo ? "img" : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
      focusable="false"
    >
      <g filter="url(#crayon)">{children}</g>
    </svg>
  );
}

/**
 * Vaso de leche: `nivel` 1 lleno, 0 vacío. Lleno = leche blanca con su borde celeste; vacío = vaso
 * transparente y apagado, para que se distingan de un vistazo incluso a 22 px.
 */
export function VasoLeche({ nivel, className, id }: { nivel: number; className?: string; id: string }) {
  const lleno = nivel > 0;
  const alto = 64 * Math.max(0, Math.min(1, nivel));
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
      focusable="false"
      data-lleno={lleno || undefined}
      style={{ opacity: lleno ? 1 : 0.42, transition: "opacity 300ms ease" }}
    >
      <defs>
        <clipPath id={`vaso-${id}`}>
          <path d="M22 14 L78 14 L71 90 Q50 96 29 90 Z" />
        </clipPath>
      </defs>
      <path d="M22 14 L78 14 L71 90 Q50 96 29 90 Z" fill={lleno ? "#d9ecf8" : "none"} />
      <g clipPath={`url(#vaso-${id})`}>
        <rect
          x="0"
          width="100"
          y={92 - alto}
          height={alto + 8}
          fill="#ffffff"
          style={{ transition: "y 420ms cubic-bezier(0.23, 1, 0.32, 1), height 420ms cubic-bezier(0.23, 1, 0.32, 1)" }}
        />
        {lleno && <path d={`M20 ${92 - alto} Q50 ${98 - alto} 80 ${92 - alto}`} fill="none" stroke="#9cc4e4" strokeWidth="5" />}
      </g>
      <path d="M22 14 L78 14 L71 90 Q50 96 29 90 Z" fill="none" stroke={TINTA} strokeWidth="8" strokeLinejoin="round" />
    </svg>
  );
}

/** Plato: vacío con migas (ya comí) o con una manzana intacta (no comí). */
export function Plato({ lleno, className }: { lleno: boolean; className?: string }) {
  return (
    <Lienzo className={className}>
      <ellipse cx="50" cy="70" rx="42" ry="16" fill="#fff" {...trazo} />
      <ellipse cx="50" cy="68" rx="26" ry="8" fill="none" stroke="#c9b8a8" strokeWidth="3" />
      {lleno ? (
        <g transform="translate(26 18) scale(0.48)">
          <path d="M50 30 C30 18 12 34 18 58 C24 82 40 90 50 84 C60 90 76 82 82 58 C88 34 70 18 50 30 Z" fill="#e0473c" {...trazo} strokeWidth={9} />
          <path d="M50 30 q2 -12 10 -18" fill="none" {...trazo} strokeWidth={9} />
        </g>
      ) : (
        <g fill="#d98b3a">
          <circle cx="40" cy="66" r="3" />
          <circle cx="56" cy="70" r="2.5" />
          <circle cx="62" cy="64" r="2" />
          <path d="M44 72 q4 -6 8 0" fill="none" stroke="#e0473c" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
    </Lienzo>
  );
}

export function Taza({ className, titulo }: { className?: string; titulo?: string }) {
  return (
    <Lienzo className={className} titulo={titulo}>
      <path d="M70 46 q18 0 16 14 q-2 12 -18 10" fill="none" {...trazo} />
      <path d="M18 36 L74 36 L68 82 Q46 90 24 82 Z" fill="#fff6e6" {...trazo} />
      <ellipse cx="46" cy="38" rx="26" ry="5" fill="#7a4a2a" />
      <path d="M38 24 q-5 -7 0 -14 M52 24 q-5 -7 0 -14" fill="none" stroke="#c9b8a8" strokeWidth="4" strokeLinecap="round" />
    </Lienzo>
  );
}

export function Leche({ className, titulo }: { className?: string; titulo?: string }) {
  return (
    <Lienzo className={className} titulo={titulo}>
      <path d="M30 30 L42 14 L58 14 L70 30 L70 86 L30 86 Z" fill="#fffdf6" {...trazo} />
      <path d="M30 46 L70 46 L70 70 L30 70 Z" fill="#3a6fd6" />
      <path d="M40 58 q10 -10 20 0" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <path d="M30 30 L70 30 L70 86 L30 86 Z" fill="none" {...trazo} />
    </Lienzo>
  );
}

export function Manzana({ className, titulo }: { className?: string; titulo?: string }) {
  return (
    <Lienzo className={className} titulo={titulo}>
      <path d="M50 30 C30 18 12 34 18 58 C24 82 40 90 50 84 C60 90 76 82 82 58 C88 34 70 18 50 30 Z" fill="#e0473c" {...trazo} />
      <path d="M50 30 q2 -12 10 -18" fill="none" {...trazo} />
      <path d="M54 22 q14 -10 22 -2 q-12 8 -22 2 Z" fill="#2e9b57" {...trazo} strokeWidth={3.5} />
      <path d="M30 44 q-4 8 -2 16" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.7" />
    </Lienzo>
  );
}

export function Hamburguesa({ className, titulo }: { className?: string; titulo?: string }) {
  return (
    <Lienzo className={className} titulo={titulo}>
      <path d="M16 46 Q18 18 50 18 Q82 18 84 46 Z" fill="#e8a85c" {...trazo} />
      <path d="M14 52 q9 8 18 0 q9 8 18 0 q9 8 18 0 q9 8 18 0" fill="#7ac36a" {...trazo} strokeWidth={4} />
      <rect x="16" y="56" width="68" height="12" rx="6" fill="#7a4a2a" {...trazo} />
      <path d="M18 72 L82 72 Q82 86 50 86 Q18 86 18 72 Z" fill="#e8a85c" {...trazo} />
      <path d="M38 30 l3 2 M54 26 l3 2 M64 34 l3 2" stroke="#fff6e6" strokeWidth="4" strokeLinecap="round" />
    </Lienzo>
  );
}

export function Pizza({ className, titulo }: { className?: string; titulo?: string }) {
  return (
    <Lienzo className={className} titulo={titulo}>
      <path d="M14 26 Q50 8 86 26 L50 90 Z" fill="#ffd24a" {...trazo} />
      <path d="M14 26 Q50 8 86 26 L82 34 Q50 18 18 34 Z" fill="#d98b3a" {...trazo} strokeWidth={4} />
      <circle cx="42" cy="42" r="6" fill="#e0473c" />
      <circle cx="60" cy="48" r="6" fill="#e0473c" />
      <circle cx="50" cy="64" r="5" fill="#e0473c" />
    </Lienzo>
  );
}

export function Casa({ className, titulo }: { className?: string; titulo?: string }) {
  return (
    <Lienzo className={className} titulo={titulo}>
      <path d="M22 48 L22 86 L78 86 L78 48" fill="#fff6e6" {...trazo} />
      <path d="M12 52 L50 18 L88 52" fill="none" {...trazo} />
      <path d="M12 52 L50 18 L88 52 Z" fill="#e2574e" stroke="none" />
      <path d="M12 52 L50 18 L88 52" fill="none" {...trazo} />
      <rect x="42" y="62" width="16" height="24" fill="#a0673e" {...trazo} strokeWidth={4} />
      <rect x="62" y="58" width="12" height="12" fill="#cde7f7" {...trazo} strokeWidth={4} />
    </Lienzo>
  );
}

/** Calendario: `cual` marca hoy (primer cuadro) o mañana (el siguiente, con flecha). */
export function Calendario({ cual, className, titulo }: { cual: "hoy" | "manana"; className?: string; titulo?: string }) {
  const marcado = cual === "hoy" ? 0 : 1;
  return (
    <Lienzo className={className} titulo={titulo}>
      <rect x="12" y="20" width="76" height="66" rx="8" fill="#fff" {...trazo} />
      <path d="M12 38 L88 38" {...trazo} />
      <rect x="14" y="22" width="72" height="14" rx="4" fill="#e0473c" />
      <path d="M30 12 L30 26 M70 12 L70 26" {...trazo} />
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={20 + i * 22}
          y="50"
          width="16"
          height="16"
          rx="3"
          fill={i === marcado ? "#ffd24a" : "#f2e6d4"}
          stroke={TINTA}
          strokeWidth={i === marcado ? 4 : 2.5}
        />
      ))}
      {cual === "manana" && <path d="M28 76 Q38 84 48 74 M44 72 L49 74 L47 79" fill="none" {...trazo} strokeWidth={3.5} />}
      {cual === "hoy" && <circle cx="28" cy="58" r="3.5" fill={TINTA} />}
    </Lienzo>
  );
}

/** Un "?" grande dentro de una burbuja: lo que no sabemos (quién, cuándo, dónde, qué). */
export function Incognita({ className, titulo }: { className?: string; titulo?: string }) {
  return (
    <Lienzo className={className} titulo={titulo}>
      <circle cx="50" cy="50" r="38" fill="#fff" stroke="#e0473c" strokeWidth="6" strokeDasharray="10 8" />
      <path d="M38 38 q0 -14 13 -14 q13 0 13 12 q0 9 -13 13 l0 9" fill="none" stroke="#e0473c" strokeWidth="8" strokeLinecap="round" />
      <circle cx="51" cy="74" r="5" fill="#e0473c" />
    </Lienzo>
  );
}

/** ✓ dibujado (ya pasó). */
export function Hecho({ className, titulo }: { className?: string; titulo?: string }) {
  return (
    <Lienzo className={className} titulo={titulo}>
      <circle cx="50" cy="50" r="38" fill="#2e9b57" {...trazo} />
      <path d="M30 52 L44 66 L72 36" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    </Lienzo>
  );
}

/** Círculo tachado (no pasó). Se pone encima de la cosa. */
export function NoPaso({ className, titulo }: { className?: string; titulo?: string }) {
  return (
    <Lienzo className={className} titulo={titulo}>
      <circle cx="50" cy="50" r="38" fill="none" stroke="#e0473c" strokeWidth="9" />
      <path d="M24 76 L76 24" stroke="#e0473c" strokeWidth="9" strokeLinecap="round" />
    </Lienzo>
  );
}

/** Estrella con "1×": alguna vez en la vida. */
export function AlgunaVez({ className, titulo }: { className?: string; titulo?: string }) {
  return (
    <Lienzo className={className} titulo={titulo}>
      <path
        d="M50 8 L61 36 L91 38 L68 58 L76 88 L50 71 L24 88 L32 58 L9 38 L39 36 Z"
        fill="#ffd24a"
        {...trazo}
      />
      <path d="M44 46 L50 42 L50 66 M42 66 L58 66" fill="none" stroke={TINTA} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </Lienzo>
  );
}

/** Burbuja "✓ / ✗ ?": pregunta de sí o no. */
export function SiNo({ className, titulo }: { className?: string; titulo?: string }) {
  return (
    <Lienzo className={className} titulo={titulo}>
      <path d="M12 20 Q12 10 22 10 L78 10 Q88 10 88 20 L88 62 Q88 72 78 72 L40 72 L24 88 L28 72 L22 72 Q12 72 12 62 Z" fill="#fff" {...trazo} />
      <path d="M22 42 L30 50 L42 32" fill="none" stroke="#2e9b57" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M58 32 L76 50 M76 32 L58 50" stroke="#e0473c" strokeWidth="7" strokeLinecap="round" />
      <path d="M46 26 L54 56" stroke={TINTA} strokeWidth="3" strokeLinecap="round" opacity="0.4" />
    </Lienzo>
  );
}

/** Mano que apunta a la vaca: "tú" (le preguntamos a ella). */
export function Apunta({ className, titulo }: { className?: string; titulo?: string }) {
  return (
    <Lienzo className={className} titulo={titulo}>
      <path
        d="M10 44 L56 44 Q64 44 64 50 Q64 56 56 56 L52 56 Q58 58 56 64 Q54 68 48 68 L46 68 Q50 72 46 76 Q42 80 36 78 L24 78 Q10 78 10 64 Z"
        fill="#ffd9a8"
        {...trazo}
        strokeWidth={4}
      />
      <path d="M56 44 L86 44 Q92 44 92 50 Q92 56 86 56 L56 56" fill="#ffd9a8" {...trazo} strokeWidth={4} />
    </Lienzo>
  );
}

/** Ícono de parlante (escuchar otra vez). */
export function Parlante({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M16 9 Q18 12 16 15 M18.5 6.5 Q22.5 12 18.5 17.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Flecha({ className, atras = false }: { className?: string; atras?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false" style={atras ? { transform: "scaleX(-1)" } : undefined}>
      <path d="M4 12 H19 M13 6 L19 12 L13 18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Candado({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor" />
      <path d="M8 10.5 V8 a4 4 0 0 1 8 0 V10.5" fill="none" stroke="currentColor" strokeWidth="2.6" />
    </svg>
  );
}

export function Check({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path d="M5 12.5 L10 17.5 L19 7" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Reloj({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <path d="M12 7.5 V12 L15 14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/** Pieza de puzzle (ícono del juego en la portada y la barra). */
export function PiezaIcono({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path
        d="M4 7 H9 a2.5 2.5 0 1 1 5 0 H19 V11 a2.5 2.5 0 1 1 0 5 V20 H14 a2.5 2.5 0 1 0 -5 0 H4 Z"
        fill="currentColor"
        stroke="#4A2A1C"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
