/**
 * Las series de videos de TikTok que muestra /videos, en orden de aprendizaje (no de publicación).
 *
 * Cada video se identifica por su `pieza` (el atributo `pieza` con que se programó en Tu Parrilla).
 * El id de TikTok y la fecha salen de `publicados.json`, que arma `npm run videos`.
 * Un video viejo sin `pieza` se fija con `tiktok` (su id de TikTok, de la API de métricas).
 */

export type VideoSerie = {
  pieza: string;
  /** Lo que se ve grande en la tarjeta (hanzi). */
  hanzi: string;
  /** Qué enseña, en español corto. */
  titulo: string;
  /** Solo para videos programados antes de que existiera `pieza`. */
  tiktok?: string;
};

export type Parte = { titulo?: string; videos: VideoSerie[] };

export type Serie = {
  slug: string;
  titulo: string;
  /** Hanzi del sello de la serie. */
  sello: string;
  bajada: string;
  partes: Parte[];
};

export const SERIES: Serie[] = [
  {
    slug: "radical-boca",
    titulo: "La boca 口",
    sello: "口",
    bajada: "口 es «boca». Cuando la ves dentro de un carácter, ya sabes que tiene que ver con la boca.",
    partes: [
      {
        titulo: "口 dentro del carácter",
        videos: [
          { pieza: "radical-boca", hanzi: "口", titulo: "Todo lo que hace la boca" },
          { pieza: "flash-chi", hanzi: "吃", titulo: "Comer" },
          { pieza: "flash-he", hanzi: "喝", titulo: "Beber" },
          { pieza: "flash-jiao", hanzi: "叫", titulo: "Llamarse" },
          { pieza: "flash-chang", hanzi: "唱", titulo: "Cantar" },
          { pieza: "flash-chui", hanzi: "吹", titulo: "Soplar" },
          { pieza: "flash-han", hanzi: "喊", titulo: "Gritar" },
          { pieza: "flash-yao", hanzi: "咬", titulo: "Morder" },
          { pieza: "flash-ku", hanzi: "哭", titulo: "Llorar" },
          { pieza: "kou-sonido", hanzi: "吗", titulo: "La boca que suena" },
          { pieza: "kou-cuantas", hanzi: "品", titulo: "¿Cuántas bocas ves?" },
        ],
      },
      {
        titulo: "口 + algo",
        videos: [
          { pieza: "kou-bocado", hanzi: "一口", titulo: "Un bocado, un sorbo" },
          { pieza: "kou-salida", hanzi: "出口", titulo: "Salida y entrada" },
          { pieza: "kou-familia", hanzi: "三口人", titulo: "Tu familia en bocas" },
          { pieza: "kou-literal", hanzi: "口红", titulo: "Labial: boca roja" },
          { pieza: "kou-habla", hanzi: "口音", titulo: "Acento, sabor y habla" },
        ],
      },
    ],
  },
  {
    slug: "radical-planta",
    titulo: "Las plantas 艹",
    sello: "艹",
    bajada: "Si ves 艹 arriba de un carácter, piensa en plantas: flor, té, verdura, medicina.",
    partes: [
      {
        videos: [
          { pieza: "radical-1", hanzi: "艹", titulo: "Te presento los radicales" },
          { pieza: "radical-2", hanzi: "花", titulo: "Flor, té y medicina" },
          { pieza: "radical-pasto", hanzi: "菜", titulo: "Todo viene de una planta" },
        ],
      },
    ],
  },
  {
    slug: "sin-pasado",
    titulo: "El chino no tiene pasado",
    sello: "了",
    bajada: "El verbo nunca cambia: con 了, 过 y 没 ya dices «comí», «he probado» y «no comí».",
    partes: [
      {
        videos: [
          { pieza: "pasado-1", hanzi: "了", titulo: "Comí" },
          { pieza: "pasado-2", hanzi: "过", titulo: "Lo he probado" },
          { pieza: "pasado-3", hanzi: "没", titulo: "No comí" },
        ],
      },
    ],
  },
  {
    slug: "puzzle",
    titulo: "El chino es un puzzle",
    sello: "吗",
    bajada: "Cada pieza tiene su lugar. Para preguntar, solo cambias la pieza que no sabes.",
    partes: [
      {
        videos: [
          { pieza: "puzzle-1", hanzi: "我吃", titulo: "Cada pieza en su lugar" },
          { pieza: "puzzle-3", hanzi: "我喝", titulo: "Cambia una pieza" },
          { pieza: "puzzle-2", hanzi: "吗", titulo: "Preguntar sí o no" },
          { pieza: "puzzle-4", hanzi: "坐", titulo: "¿Dónde te sientas?" },
        ],
      },
    ],
  },
  {
    slug: "hao-mas",
    titulo: "好 + algo",
    sello: "好",
    bajada: "Sabes una palabra y ya dices muchas: 好 + comer = rico, 好 + mirar = lindo.",
    partes: [
      {
        videos: [
          { pieza: "hao-1", hanzi: "好吃", titulo: "Rico y lindo" },
          { pieza: "hao-2", hanzi: "好玩", titulo: "Divertido y chistoso" },
        ],
      },
    ],
  },
  {
    slug: "palabras-gratis",
    titulo: "Palabras gratis",
    sello: "沙拉",
    bajada: "Palabras prestadas: si las sabes en español, ya casi las sabes en chino.",
    partes: [
      {
        videos: [
          { pieza: "gratis-4", hanzi: "披萨", titulo: "Pizza", tiktok: "7701347159710453012" },
          { pieza: "gratis-5", hanzi: "布丁", titulo: "Budín" },
          { pieza: "gratis-6", hanzi: "可乐", titulo: "Cola" },
          { pieza: "gratis-7", hanzi: "汉堡", titulo: "Hamburguesa" },
          { pieza: "gratis-8", hanzi: "卡布奇诺", titulo: "Capuchino" },
          { pieza: "gratis-9", hanzi: "沙拉", titulo: "Ensalada" },
        ],
      },
    ],
  },
];
