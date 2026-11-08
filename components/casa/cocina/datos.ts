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
