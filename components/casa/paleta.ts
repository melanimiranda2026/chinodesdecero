/**
 * Paleta "mantel" de la casa: la misma de los videos de TikTok (video/src/estilo-mantel.ts, aprobada el 22 nov.
 * 2026), sacada de "inspiracion y referencias/paleta de colores..jpg": chocolate, crema, matcha, lavanda y el verde
 * del estanque. La usan el generador de arte (`scripts/iso/dibujo.ts`) y, como variables CSS (`--m-*` en
 * app/globals.css), la interfaz de la casa.
 *
 * Los colores de los tonos NO salen de aquí: son fijos en todo el proyecto (lib/tonos.ts).
 */
export const PALETA = {
  chocolate: "#44120A",
  cacao: "#5D321B",
  crema: "#F7D7B3",
  cremaClara: "#FCEBD6",
  matcha: "#B7B666",
  matchaOscuro: "#919146",
  lavanda: "#B7A6DA",
  lavandaOscura: "#7E62B8",
  estanque: "#258574",
  menta: "#58AD92",
  naranja: "#E59D45",
} as const;

/** Tonos intermedios para dar volumen en isometría (cara de arriba, izquierda y derecha) sin salir de la paleta. */
export const MATICES = {
  /** crema más clara que `cremaClara`: cantos, papel, lo iluminado */
  papel: "#FFF6EA",
  matchaClaro: "#CFCE8C",
  lavandaClara: "#D3C8EA",
  mentaClara: "#A9D8C6",
  naranjaClara: "#F2C08A",
  naranjaOscura: "#C47E2C",
  cacaoClaro: "#8A5634",
} as const;
