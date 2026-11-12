import { OBJETOS, PIE_FREGADERO, type EstadoCocina, type ObjetoId } from "@/components/casa/cocina/datos";
import { PISO_LIBRE, alPiso, proyectar } from "@/components/casa/cocina/iso";

// Unidades de cuarto: 0-1000 en ambos ejes. Porcentajes de pantalla: 0-100.
export type Camara = { x: number; y: number; s: number };

const limitar = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/**
 * Cámara centrada en (x, y) con zoom s, sin mostrar fuera del cuarto. Nunca aleja más que la vista completa (s ≥ 1).
 * `aspecto` = alto / ancho del escenario (1 en cuadrado): en vertical se ven 1000/s unidades de ancho y aspecto·1000/s de alto.
 */
export function enfocar(x: number, y: number, s: number, aspecto = 1): Camara {
  const z = Math.max(1, s);
  const mx = 500 / z;
  const my = Math.min(500, (500 * aspecto) / z);
  return { x: limitar(x, mx, 1000 - mx), y: limitar(y, my, 1000 - my), s: z };
}

/** Centro x del encuadre vertical: un poco a la izquierda del medio: el lavaplatos, la cocina y la vaca. */
export const X_VERTICAL = 440;

/**
 * Lo que la casa quiere mirar: centro y zoom sin limitar (s ≥ 1). La vista lo limita con `encuadrar`
 * según el escenario real; así en vertical un objeto del borde (el refri) puede quedar contra el borde del cuarto.
 */
export function apuntar(x: number, y: number, s: number): Camara {
  return { x, y, s: Math.max(1, s) };
}

/** Encuadre de "ver todo" para un escenario de ancho x alto px: cuadrado → identidad; vertical → el cuarto llena el alto. */
export function encuadreInicial(anchoPx: number, altoPx: number): Camara {
  if (!(anchoPx > 0 && altoPx > anchoPx)) return { x: 500, y: 500, s: 1 };
  return enfocar(X_VERTICAL, 500, altoPx / anchoPx, altoPx / anchoPx);
}

/** alto / ancho del escenario; 1 si aún no se midió o no es vertical. */
export function aspectoDe(anchoPx: number, altoPx: number): number {
  return anchoPx > 0 && altoPx > anchoPx ? altoPx / anchoPx : 1;
}

/**
 * En vertical el encuadre base ya acerca (~2×): un enfoque de la casa de s acerca ini.s · (1 + (s − 1) · ZOOM_VERTICAL),
 * así el objeto y la vaca (la casa centra entre ambos) entran enteros a 360 px de ancho.
 */
export const ZOOM_VERTICAL = 0.3;

/** Centro antes del paneo: "ver todo" (s ≤ 1) es el encuadre inicial; un enfoque de la casa conserva su centro. */
export function centroBase(c: Camara, anchoPx: number, altoPx: number): { x: number; y: number } {
  return c.s <= 1 ? encuadreInicial(anchoPx, altoPx) : c;
}

/**
 * La cámara que de verdad se ve: la de la casa (pensada para un escenario cuadrado) llevada al escenario real,
 * más el paneo del dedo. El zoom es relativo al encuadre inicial y amortiguado (ver ZOOM_VERTICAL); en cuadrado
 * ini.s = 1 y queda igual. `enfocar` limita el centro.
 */
export function encuadrar(c: Camara, anchoPx: number, altoPx: number, pan: { x: number; y: number } = { x: 0, y: 0 }): Camara {
  const a = aspectoDe(anchoPx, altoPx);
  if (a === 1 && pan.x === 0 && pan.y === 0) return enfocar(c.x, c.y, c.s);
  const ini = encuadreInicial(anchoPx, altoPx);
  const b = centroBase(c, anchoPx, altoPx);
  const s = c.s <= 1 ? ini.s : a > 1 ? ini.s * (1 + (c.s - 1) * ZOOM_VERTICAL) : c.s;
  return enfocar(b.x + pan.x, b.y + pan.y, s, a);
}

/** El mundo mide ancho x ancho px (1000 unidades = el ancho); en vertical se corre para centrar en el alto. */
export function transformCSS(c: Camara, aspecto = 1): string {
  const tx = 50 - (c.x * c.s) / 10;
  const ty = 50 * aspecto - (c.y * c.s) / 10;
  return `translate(${tx}%, ${ty}%) scale(${c.s})`;
}

/** De unidades del cuarto a % de la pantalla (del escenario), contando el zoom y el aspecto. */
export function enPantalla(c: Camara, x: number, y: number, aspecto = 1): { x: number; y: number } {
  return { x: 50 + ((x - c.x) * c.s) / 10, y: 50 + ((y - c.y) * c.s) / 10 / aspecto };
}

/** Dónde se para la vaca para usar algo (en el piso, frente al mueble). */
export function puntoJunto(id: ObjetoId | "fregadero"): { x: number; y: number } {
  if (id === "fregadero") return PIE_FREGADERO;
  return OBJETOS[id].pie;
}

/** La vaca no sale del piso libre (el rombo del piso sin los muebles). */
export function limitarVaca(x: number, y: number): { x: number; y: number } {
  const { u, v } = alPiso(x, y);
  const p = proyectar(limitar(u, PISO_LIBRE.min, PISO_LIBRE.max), limitar(v, PISO_LIBRE.min, PISO_LIBRE.max));
  return { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 };
}

/** Objeto más cercano a (vaca.x, vaca.y - 90), dentro de min(w/2, 50) + 70; ignora los "nada". */
export function objetoBajo(vaca: { x: number; y: number }, e: EstadoCocina): ObjetoId | null {
  let mejor: ObjetoId | null = null;
  let dist = Infinity;
  for (const id of Object.keys(OBJETOS) as ObjetoId[]) {
    if (e[id] === "nada") continue;
    const o = OBJETOS[id];
    const d = Math.hypot(o.x - vaca.x, o.y - (vaca.y - 90));
    // el alcance no crece con el cuadro del refri (300 de ancho): si no, "ganaría" a todo lo cercano
    if (d < Math.min(o.w / 2, 50) + 70 && d < dist) {
      mejor = id;
      dist = d;
    }
  }
  return mejor;
}

/**
 * Abanico de opciones hacia el centro de la pantalla. `vertical`: celular en vertical (x más ancho).
 * `aspecto` (alto / ancho): el radio se mide en px, así el abanico es un círculo también en un escenario alto.
 */
export function ubicarOpciones(
  c: Camara,
  id: ObjetoId,
  n: number,
  vertical = false,
  aspecto = 1,
): { x: number; y: number }[] {
  const o = OBJETOS[id];
  const p = enPantalla(c, o.x, o.y, aspecto);
  const [xmin, xmax] = vertical ? [12, 88] : [16, 84];
  // en vertical el ancho es chico: radio mayor (en % del ancho) para que las píldoras no se pisen
  const rx = vertical ? 30 : 20;
  const ry = rx / aspecto;
  const base = Math.atan2((55 - p.y) * aspecto, 50 - p.x);
  return Array.from({ length: n }, (_, i) => {
    const ang = base + (i - (n - 1) / 2) * 0.85;
    return {
      x: limitar(p.x + Math.cos(ang) * rx, xmin, xmax),
      y: limitar(p.y + Math.sin(ang) * ry, 12, 90),
    };
  });
}
