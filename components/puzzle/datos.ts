import { S, type Silaba } from "@/lib/silabas";

/**
 * CONTENIDO DEL PUZZLE. 6 temas × 3 etapas. Las frases salen de la serie "El chino es un puzzle" y
 * "El chino no tiene pasado"; los audios son copias del banco (`video/public/audio/banco/`) en
 * public/audio/puzzle/<audio>.mp3. Agregar una frase = agregar un objeto aquí y su mp3.
 */

export type Rol = "quien" | "cuando" | "donde" | "hace" | "que" | "ma" | "le" | "guo" | "mei";

/** Etiqueta del rol (bajo la pieza en las etapas 1 y 2) y color de la pieza. */
export const ROLES: Record<Rol, { etiqueta: string; fondo: string }> = {
  quien: { etiqueta: "quién", fondo: "#ffd9a8" },
  cuando: { etiqueta: "cuándo", fondo: "#cde7f7" },
  donde: { etiqueta: "dónde", fondo: "#d6efc9" },
  hace: { etiqueta: "hace", fondo: "#f9c9c4" },
  que: { etiqueta: "qué", fondo: "#e8d7f5" },
  ma: { etiqueta: "¿sí o no?", fondo: "#fff1a8" },
  le: { etiqueta: "ya", fondo: "#fff1a8" },
  guo: { etiqueta: "alguna vez", fondo: "#fff1a8" },
  mei: { etiqueta: "no", fondo: "#fff1a8" },
};

export interface Pieza {
  silabas: Silaba[];
  rol: Rol;
  /** Traducción breve (solo en la etapa 1). */
  glosa: string;
  /** Palabra de pregunta: pieza blanca con borde rojo, como en el video. */
  pregunta?: boolean;
}

const P = (hz: string, py: string, t: string, rol: Rol, glosa: string, pregunta = false): Pieza => ({
  silabas: S(hz, py, t),
  rol,
  glosa,
  ...(pregunta ? { pregunta } : {}),
});

const PZ = {
  wo: P("我", "wǒ", "3", "quien", "yo"),
  ni: P("你", "nǐ", "3", "quien", "tú"),
  shei: P("谁", "shéi", "2", "quien", "¿quién?", true),
  jintian: P("今天", "jīn tiān", "11", "cuando", "hoy"),
  mingtian: P("明天", "míng tiān", "21", "cuando", "mañana"),
  shenmeshihou: P("什么时候", "shén me shí hou", "2525", "cuando", "¿cuándo?", true),
  zaijia: P("在家", "zài jiā", "41", "donde", "en casa"),
  zainali: P("在哪里", "zài nǎ li", "435", "donde", "¿dónde?", true),
  chi: P("吃", "chī", "1", "hace", "comer"),
  he: P("喝", "hē", "1", "hace", "beber"),
  pingguo: P("苹果", "píng guǒ", "23", "que", "manzana"),
  kafei: P("咖啡", "kā fēi", "11", "que", "café"),
  niunai: P("牛奶", "niú nǎi", "23", "que", "leche"),
  hanbao: P("汉堡", "hàn bǎo", "43", "que", "hamburguesa"),
  pisa: P("披萨", "pī sà", "14", "que", "pizza"),
  shenme: P("什么", "shén me", "25", "que", "¿qué?", true),
  ma: P("吗", "ma", "5", "ma", "¿sí o no?"),
  le: P("了", "le", "5", "le", "ya está"),
  guo: P("过", "guo", "5", "guo", "alguna vez"),
  mei: P("没", "méi", "2", "mei", "no (pasó)"),
} as const;

/** Lo que muestra el dibujo de la escena (etapas 2 y 3): quién, cuándo, dónde, qué y una marca. */
export type Cosa = "pingguo" | "kafei" | "niunai" | "hanbao" | "pisa";
export interface Escena {
  quien: "yo" | "tu" | "?";
  cuando?: "hoy" | "manana" | "?";
  donde?: "casa" | "?";
  cosa?: Cosa | "?";
  /** hecho: ✓ ya pasó · alguna: estrella "alguna vez" · no: no pasó · pregunta: "?" de sí o no. */
  marca?: "hecho" | "alguna" | "no" | "pregunta";
}

export interface Frase {
  id: string;
  piezas: Pieza[];
  /** Órdenes válidos (índices de `piezas`). El primero es el que dice el audio. */
  ordenes: number[][];
  espanol: string;
  /** Archivo en public/audio/puzzle/ (sin .mp3). */
  audio: string;
  escena: Escena;
  /** La vaca responde después (preguntas de sí o no): sílabas y audio. */
  respuesta?: { silabas: Silaba[]; audio: string; espanol: string };
}

const enOrden = (n: number) => [Array.from({ length: n }, (_, i) => i)];
/** "今天我…" vale igual que "我今天…": el tiempo puede ir antes del sujeto. */
const conTiempoAdelante = (n: number) => [enOrden(n)[0], [1, 0, ...Array.from({ length: n - 2 }, (_, i) => i + 2)]];

const F = (
  id: string,
  piezas: Pieza[],
  espanol: string,
  audio: string,
  escena: Escena,
  extra: Partial<Pick<Frase, "ordenes" | "respuesta">> = {},
): Frase => ({ id, piezas, ordenes: extra.ordenes ?? enOrden(piezas.length), espanol, audio, escena, ...extra });

export interface Tema {
  id: string;
  titulo: string;
  /** Lo que se ve en el mapa junto al título. */
  muestra: string;
  /** Micro-nota del tema (una sola regla), al entrar a la etapa 1. */
  regla: string;
  /** Id de la frase que la nota muestra y la vaca dice. */
  ejemplo: string;
  frases: Frase[];
}

export const TEMAS: Tema[] = [
  {
    id: "orden",
    titulo: "El orden",
    muestra: "我吃苹果",
    regla: "Cada pieza tiene su lugar: quién · cuándo · dónde · qué hace · qué. Siempre en ese orden.",
    ejemplo: "wo-jintian-pingguo",
    frases: [
      F("wo-chi-pingguo", [PZ.wo, PZ.chi, PZ.pingguo], "Como manzana.", "wochi_pingguo", { quien: "yo", cosa: "pingguo" }),
      F("wo-he-kafei", [PZ.wo, PZ.he, PZ.kafei], "Bebo café.", "wohe_kafei", { quien: "yo", cosa: "kafei" }),
      F(
        "wo-jintian-pingguo",
        [PZ.wo, PZ.jintian, PZ.zaijia, PZ.chi, PZ.pingguo],
        "Hoy como manzana en casa.",
        "wo_jintian_pingguo",
        { quien: "yo", cuando: "hoy", donde: "casa", cosa: "pingguo" },
        { ordenes: conTiempoAdelante(5) },
      ),
      F(
        "wo-jintian-kafei",
        [PZ.wo, PZ.jintian, PZ.zaijia, PZ.he, PZ.kafei],
        "Hoy bebo café en casa.",
        "wo_jintian_kafei",
        { quien: "yo", cuando: "hoy", donde: "casa", cosa: "kafei" },
        { ordenes: conTiempoAdelante(5) },
      ),
    ],
  },
  {
    id: "preguntas",
    titulo: "Preguntas",
    muestra: "谁 · 什么",
    regla: "Para preguntar no cambias el orden: pones la palabra de pregunta en el lugar de lo que no sabes.",
    ejemplo: "ni-chi-shenme",
    frases: [
      F(
        "shei-jintian",
        [PZ.shei, PZ.jintian, PZ.zaijia, PZ.chi, PZ.pingguo],
        "¿Quién come manzana en casa hoy?",
        "shei_jintian_pingguo",
        { quien: "?", cuando: "hoy", donde: "casa", cosa: "pingguo" },
        { ordenes: conTiempoAdelante(5) },
      ),
      F(
        "ni-shenmeshihou",
        [PZ.ni, PZ.shenmeshihou, PZ.zaijia, PZ.chi, PZ.pingguo],
        "¿Cuándo comes manzana en casa?",
        "ni_shenmeshihou_pingguo",
        { quien: "tu", cuando: "?", donde: "casa", cosa: "pingguo" },
        { ordenes: conTiempoAdelante(5) },
      ),
      F(
        "ni-zainali",
        [PZ.ni, PZ.jintian, PZ.zainali, PZ.chi, PZ.pingguo],
        "¿Dónde comes manzana hoy?",
        "ni_zainali_pingguo",
        { quien: "tu", cuando: "hoy", donde: "?", cosa: "pingguo" },
        { ordenes: conTiempoAdelante(5) },
      ),
      F(
        "ni-chi-shenme",
        [PZ.ni, PZ.jintian, PZ.zaijia, PZ.chi, PZ.shenme],
        "¿Qué comes hoy en casa?",
        "ni_chi_shenme",
        { quien: "tu", cuando: "hoy", donde: "casa", cosa: "?" },
        { ordenes: conTiempoAdelante(5) },
      ),
    ],
  },
  {
    id: "ma",
    titulo: "Sí o no",
    muestra: "…吗？",
    regla: "Para preguntar sí o no, no cambias nada: solo agregas 吗 al final. Y para responder, repites el verbo.",
    ejemplo: "ni-he-kafei-ma",
    frases: [
      F("ni-he-kafei-ma", [PZ.ni, PZ.he, PZ.kafei, PZ.ma], "¿Bebes café?", "ni_he_kafei_ma", { quien: "tu", cosa: "kafei", marca: "pregunta" }, {
        respuesta: { silabas: S("喝", "hē", "1"), audio: "he", espanol: "Sí (bebo)." },
      }),
      F("ni-he-niunai-ma", [PZ.ni, PZ.he, PZ.niunai, PZ.ma], "¿Bebes leche?", "ni_he_niunai_ma", { quien: "tu", cosa: "niunai", marca: "pregunta" }, {
        respuesta: { silabas: S("不喝", "bù hē", "41"), audio: "bu_he", espanol: "No (no bebo)." },
      }),
      F("ni-chi-pingguo-ma", [PZ.ni, PZ.chi, PZ.pingguo, PZ.ma], "¿Comes manzana?", "ni_chi_pingguo_ma", { quien: "tu", cosa: "pingguo", marca: "pregunta" }, {
        respuesta: { silabas: S("吃", "chī", "1"), audio: "chi", espanol: "Sí (como)." },
      }),
    ],
  },
  {
    id: "pasado",
    titulo: "Ya pasó",
    muestra: "了 · 过",
    regla: "El chino no cambia el verbo para el pasado. 了 dice «ya está hecho» y 过 dice «alguna vez».",
    ejemplo: "wo-chi-le",
    frases: [
      F("wo-chi-le", [PZ.wo, PZ.chi, PZ.le], "Ya comí.", "wochi_le", { quien: "yo", marca: "hecho" }),
      F("ni-chi-le-ma", [PZ.ni, PZ.chi, PZ.le, PZ.ma], "¿Ya comiste?", "nichi_le_ma", { quien: "tu", marca: "pregunta" }),
      F("wo-chi-guo-hanbao", [PZ.wo, PZ.chi, PZ.guo, PZ.hanbao], "He comido hamburguesa (alguna vez).", "wochi_guo_hanbao", {
        quien: "yo",
        cosa: "hanbao",
        marca: "alguna",
      }),
      F("wo-chi-guo-pisa", [PZ.wo, PZ.chi, PZ.guo, PZ.pisa], "He comido pizza (alguna vez).", "wochi_guo_pisa", {
        quien: "yo",
        cosa: "pisa",
        marca: "alguna",
      }),
    ],
  },
  {
    id: "mei",
    titulo: "No lo hice",
    muestra: "没…",
    regla: "Para decir que algo no pasó, pones 没 antes del verbo. Y el 了 se va: ¡más corto todavía!",
    ejemplo: "wo-mei-chi",
    frases: [
      F("wo-mei-chi", [PZ.wo, PZ.mei, PZ.chi], "No comí.", "womei_chi", { quien: "yo", marca: "no" }),
      F("wo-mei-he-kafei", [PZ.wo, PZ.mei, PZ.he, PZ.kafei], "No bebí café.", "womei_he_kafei", { quien: "yo", cosa: "kafei", marca: "no" }),
      F("wo-mei-chi-pingguo", [PZ.wo, PZ.mei, PZ.chi, PZ.pingguo], "No comí manzana.", "womei_chi_pingguo", {
        quien: "yo",
        cosa: "pingguo",
        marca: "no",
      }),
    ],
  },
  {
    id: "futuro",
    titulo: "Mañana",
    muestra: "明天…",
    regla: "El chino tampoco cambia el verbo para el futuro: dices cuándo (明天, mañana) y listo.",
    ejemplo: "wo-mingtian-pingguo",
    frases: [
      F("wo-mingtian-pingguo", [PZ.wo, PZ.mingtian, PZ.chi, PZ.pingguo], "Mañana como manzana.", "wo_mingtian_pingguo", {
        quien: "yo",
        cuando: "manana",
        cosa: "pingguo",
      }, { ordenes: conTiempoAdelante(4) }),
      F("wo-mingtian-kafei", [PZ.wo, PZ.mingtian, PZ.he, PZ.kafei], "Mañana bebo café.", "wo_mingtian_kafei", {
        quien: "yo",
        cuando: "manana",
        cosa: "kafei",
      }, { ordenes: conTiempoAdelante(4) }),
      F("ni-mingtian-shenme", [PZ.ni, PZ.mingtian, PZ.chi, PZ.shenme], "¿Qué comes mañana?", "ni_mingtian_chi_shenme", {
        quien: "tu",
        cuando: "manana",
        cosa: "?",
      }, { ordenes: conTiempoAdelante(4) }),
    ],
  },
];

export type Etapa = 1 | 2 | 3;
export const ETAPAS: { etapa: Etapa; nombre: string; detalle: string }[] = [
  { etapa: 1, nombre: "Con ayuda", detalle: "Con español" },
  { etapa: 2, nombre: "Menos ayuda", detalle: "Dibujo y voz" },
  { etapa: 3, nombre: "Solo chino", detalle: "Cero español" },
];

export const idNivel = (tema: string, etapa: Etapa) => `${tema}-${etapa}`;
