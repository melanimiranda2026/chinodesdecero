import type { ObjetoId } from "@/components/casa/cocina/datos";

/** Textos de la página (fuera de la casa: español, segunda persona, cercano). */

export type Idea = { titulo: string; texto: string; dibujo: ObjetoId | "vaca" };
/** Si alguna idea cita un estudio, lleva su fuente (va en letra chica). Sin fuente, sin números. */
export const METODO: { titulo: string; ideas: Idea[]; fuente?: string } = {
  titulo: "Cómo funciona el Método Jìn",
  ideas: [
    {
      titulo: "Escuchas primero",
      texto: "Cada palabra te llega primero por el oído, en la voz de la vaca. Así te acostumbras a los tonos desde el día uno.",
      dibujo: "vaca",
    },
    {
      titulo: "La imagen te dice qué significa",
      texto: "Tocas el 杯子 y ves un vaso: nadie te traduce nada. El dibujo carga el significado.",
      dibujo: "beizi",
    },
    {
      titulo: "Repites jugando",
      texto: "La misma palabra vuelve en acciones, juegos y videos distintos. Aquí hacemos los repasos por ti.",
      dibujo: "pingguo",
    },
  ],
};

export type Material = { titulo: string; descripcion: string; estado: "pronto" | { url: string } };
/** Agregar material nuevo es agregar una tarjeta aquí. */
export const MATERIAL: Material[] = [
  {
    titulo: "Mazos de Anki por bloque de videos",
    descripcion: "Las palabras de cada 10 videos, con su audio, listas para repasar en tu celular cuando quieras.",
    estado: "pronto",
  },
];

export type VideoTikTok = { titulo: string; miniatura: string; url: string };
// CONFIRMAR con la dueña el @ exacto
export const TIKTOK: { nombre: string; url: string; videos: VideoTikTok[] } = {
  nombre: "chino comprensible",
  url: "https://www.tiktok.com/@chinocomprensible",
  videos: [],
};
