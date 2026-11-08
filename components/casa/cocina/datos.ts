import { S, type Silaba } from "@/lib/silabas";

export type ObjetoId =
  | "beizi" | "wan" | "panzi" | "kuaizi" | "pingguo" | "bingxiang" | "guo" | "chahu";

export type EstadoCocina = Record<ObjetoId, string>;

export const ESTADO_INICIAL: EstadoCocina = {
  beizi: "vacio", wan: "vacio", panzi: "lleno", kuaizi: "limpio",
  pingguo: "sucio", bingxiang: "cerrado", guo: "vacio", chahu: "lleno",
};

export const OBJETOS: Record<
  ObjetoId,
  { nombre: Silaba[]; x: number; y: number; w: number; fijo?: boolean }
> = {
  beizi: { nombre: S("杯子", "bēi zi", "15"), x: 600, y: 668, w: 62 },
  wan: { nombre: S("碗", "wǎn", "3"), x: 700, y: 640, w: 80 },
  panzi: { nombre: S("盘子", "pán zi", "25"), x: 700, y: 730, w: 100 },
  kuaizi: { nombre: S("筷子", "kuài zi", "45"), x: 810, y: 700, w: 80 },
  pingguo: { nombre: S("苹果", "píng guǒ", "23"), x: 594, y: 300, w: 58 },
  bingxiang: { nombre: S("冰箱", "bīng xiāng", "11"), x: 100, y: 345, w: 210, fijo: true },
  guo: { nombre: S("锅", "guō", "1"), x: 741, y: 292, w: 96 },
  chahu: { nombre: S("茶壶", "chá hú", "22"), x: 310, y: 292, w: 84 },
};

export const FREGADERO = { x: 450, y: 318 };

export type Rel = { dx: number; dy: number };

/** Punto `rel` desplazado desde `base` (unidades del cuarto). */
export const junto = (base: { x: number; y: number }, rel: Rel) => ({ x: base.x + rel.dx, y: base.y + rel.dy });

/**
 * ANCLAS de los efectos: de dónde sale el agua, dónde se sirve el té, por dónde sale la manzana…
 * Si se redibuja el arte, solo se ajustan estos números; ninguna animación depende del dibujo.
 * Los relativos (`dx`, `dy`) se miden desde el centro del objeto, o desde las patas de la vaca.
 */
export const ANCLAS = {
  /** Chorro de la llave del fregadero (absoluto). */
  llave: { x: 490, y: 278 },
  /** Donde se deja un objeto para lavarlo (relativo a FREGADERO). */
  enFregadero: { dx: 0, dy: -6 },
  /** Pico de la tetera (relativo a chahu). */
  picoTetera: { dx: 52, dy: -6 },
  /** Donde se pone el vaso para servir té (relativo a chahu). */
  bajoPicoTetera: { dx: 80, dy: 30 },
  /** Donde va el bol para servir arroz (relativo a guo). */
  bajoOlla: { dx: 0, dy: 80 },
  /** De donde cae el arroz al servir (relativo a guo). */
  bocaOlla: { dx: 0, dy: 40 },
  /** Por donde sale algo del refri (relativo a bingxiang). */
  salidaRefri: { dx: 0, dy: -45 },
  /** La vaca sostiene algo para beber o tomar (relativo a sus patas). */
  manoVaca: { dx: 40, dy: -120 },
  /** La vaca acerca la comida a la boca (relativo a sus patas). */
  bocaVaca: { dx: 30, dy: -110 },
  /** De donde caen las migas al comer (relativo a sus patas). */
  migasVaca: { dx: 20, dy: -110 },
} as const;
