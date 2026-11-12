import { S, type Silaba } from "@/lib/silabas";
import { MUEBLES, proyectar, type Punto } from "./iso";

export type ObjetoId =
  | "beizi" | "wan" | "panzi" | "kuaizi" | "pingguo" | "bingxiang" | "guo" | "chahu";

export type EstadoCocina = Record<ObjetoId, string>;

export const ESTADO_INICIAL: EstadoCocina = {
  beizi: "vacio", wan: "vacio", panzi: "lleno", kuaizi: "limpio",
  pingguo: "sucio", bingxiang: "cerrado", guo: "vacio", chahu: "lleno",
};

/**
 * Dónde está cada cosa, en coordenadas del cuarto isométrico (ver `iso.ts`): `en` es el punto donde el objeto
 * se apoya (u, v, altura de la superficie), `pie` es donde se para la vaca para usarlo y `alzar` cuánto sube el
 * centro del cuadro de arte sobre el punto de apoyo (en fracción de `w`). x, y salen de ahí.
 */
const LUGARES: Record<ObjetoId, { en: [number, number, number]; pie: [number, number]; w: number; alzar?: number; fijo?: boolean }> = {
  pingguo: { en: [0.9, 4.7, MUEBLES.mesonIzq.alto], pie: [2.6, 4.7], w: 48 },
  guo: { en: [2.8, 0.85, MUEBLES.mesonDer.alto], pie: [2.8, 2.6], w: 84 },
  chahu: { en: [4.6, 0.85, MUEBLES.mesonDer.alto], pie: [4.6, 2.6], w: 64 },
  beizi: { en: [0.9, 1.9, MUEBLES.mesonIzq.alto], pie: [2.6, 1.9], w: 48 },
  // en la mesa, a 1.5 de distancia: a 360 px de ancho, las zonas para tocar (44 px) no se pisan
  wan: { en: [6.2, 0.85, MUEBLES.mesa.alto], pie: [6.2, 2.7], w: 58 },
  panzi: { en: [7.7, 0.95, MUEBLES.mesa.alto], pie: [7.7, 2.7], w: 72 },
  kuaizi: { en: [9.2, 0.85, MUEBLES.mesa.alto], pie: [9.2, 2.7], w: 60 },
  bingxiang: { en: [0.95, 7.3, 0], pie: [2.7, 7.3], w: 300, alzar: 0.327, fijo: true },
};

const NOMBRES: Record<ObjetoId, Silaba[]> = {
  beizi: S("杯子", "bēi zi", "15"),
  wan: S("碗", "wǎn", "3"),
  panzi: S("盘子", "pán zi", "25"),
  kuaizi: S("筷子", "kuài zi", "45"),
  pingguo: S("苹果", "píng guǒ", "23"),
  bingxiang: S("冰箱", "bīng xiāng", "11"),
  guo: S("锅", "guō", "1"),
  chahu: S("茶壶", "chá hú", "22"),
};

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Centro del cuadro de arte de cada objeto (unidades del cuarto) y su ancho. */
export const OBJETOS: Record<
  ObjetoId,
  { nombre: Silaba[]; x: number; y: number; w: number; fijo?: boolean; apoyo: Punto; pie: Punto }
> = Object.fromEntries(
  (Object.keys(LUGARES) as ObjetoId[]).map((id) => {
    const l = LUGARES[id];
    const apoyo = proyectar(...l.en);
    const pie = proyectar(l.pie[0], l.pie[1]);
    const o = {
      nombre: NOMBRES[id], x: r1(apoyo.x), y: r1(apoyo.y - l.w * (l.alzar ?? 0.25)), w: l.w,
      apoyo: { x: r1(apoyo.x), y: r1(apoyo.y) }, pie: { x: r1(pie.x), y: r1(pie.y) },
      ...(l.fijo ? { fijo: true } : {}),
    };
    return [id, o];
  }),
) as never;

/** El hueco del lavaplatos (donde se lava) y donde se para la vaca para usarlo. */
const L = MUEBLES.lavaplatos;
export const FREGADERO = (() => {
  const p = proyectar((L.u0 + L.u1) / 2, (L.v0 + L.v1) / 2, MUEBLES.mesonIzq.alto - 0.1);
  return { x: r1(p.x), y: r1(p.y) };
})();
export const PIE_FREGADERO = (() => {
  const p = proyectar(2.6, (L.v0 + L.v1) / 2);
  return { x: r1(p.x), y: r1(p.y) };
})();

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
  llave: (() => { const p = proyectar(0.75, 3, 3.05); return { x: r1(p.x), y: r1(p.y) }; })(),
  /** Donde se deja un objeto para lavarlo (relativo a FREGADERO). */
  enFregadero: { dx: 0, dy: -8 },
  /** Pico de la tetera (relativo a chahu). */
  picoTetera: { dx: 24, dy: -6 },
  /** Donde se pone el vaso para servir té (relativo a chahu). */
  bajoPicoTetera: { dx: 30, dy: 14 },
  /** Donde va el bol para servir arroz (relativo a guo). */
  bajoOlla: { dx: -44, dy: 30 },
  /** De donde cae el arroz al servir (relativo a guo). */
  bocaOlla: { dx: -18, dy: -6 },
  /** Por donde sale algo del refri (relativo a bingxiang). */
  salidaRefri: { dx: 60, dy: 10 },
  /** La vaca sostiene algo para beber o tomar (relativo a sus patas). */
  manoVaca: { dx: 31, dy: -92 },
  /** La vaca acerca la comida a la boca (relativo a sus patas). */
  bocaVaca: { dx: 23, dy: -85 },
  /** De donde caen las migas al comer (relativo a sus patas). */
  migasVaca: { dx: 15, dy: -85 },
} as const;
