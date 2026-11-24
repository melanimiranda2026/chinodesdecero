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

export type VideoTikTok = { titulo: string; miniatura: string; url: string };
// PENDIENTE: la dueña confirma la cuenta oficial y su @ (spec §11.1)
export const TIKTOK: { nombre: string; url: string; videos: VideoTikTok[] } = {
  nombre: "chino comprensible",
  url: "https://www.tiktok.com/@chinocomprensible",
  videos: [],
};

/** El hero de la landing (primera pantalla). El 浸 del subtítulo se dibuja aparte, con su línea de tono 4. */
export const PORTADA = {
  marca: "chino con la vaca",
  h1: "Tus primeras palabras en chino, jugando",
  subtitulo: "Toca, arrastra, escucha y explora con la vaca.",
  confianza: "Gratis · funciona en tu celular",
} as const;

/** Menú de arriba, en todas las páginas. En celular, "corto" reemplaza al texto largo. */
export const MENU = {
  etiqueta: "Principal",
  enlaces: [
    { clave: "casa", icono: "🏠", texto: "Casa", corto: "Casa", href: "/" },
    { clave: "puzzle", icono: "🧩", texto: "Puzzle", corto: "Puzzle", href: "/puzzle" },
    { clave: "videos", icono: "📺", texto: "Videos", corto: "Videos", href: "/videos" },
    { clave: "metodo", icono: "浸", texto: "Método", corto: "Método", href: "/sobre#metodo" },
    { clave: "sobre", icono: "🐄", texto: "Sobre nosotros", corto: "Nosotros", href: "/sobre" },
  ],
} as const;

/** Página /sobre (la dueña corrige el texto después). */
export const SOBRE = {
  titulo: "Sobre nosotros",
  p1: "Somos un canal de TikTok que enseña chino mandarín a hispanohablantes. La profe es una vaca dibujada a crayón que solo habla chino.",
  p2antes: "Aprender chino es fácil si eres estratégico. Por eso usamos el ",
  p2metodo: "Método Jìn 浸",
  p2despues: " («sumergirse»): escuchas primero, la imagen te dice qué significa y repasas en días distintos. Aquí hacemos los repasos por ti.",
  p3: "Nuestra promesa es honesta: ser tus primeras 50 horas de chino y llevarte a practicar fuera de TikTok.",
  contactoAntes: "¿Ideas o preguntas? Escríbenos a ",
  jugar: "Jugar ahora",
  tiktok: "Síguenos en TikTok",
} as const;
