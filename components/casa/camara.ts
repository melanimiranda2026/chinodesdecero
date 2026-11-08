import { FREGADERO, OBJETOS, type EstadoCocina, type ObjetoId } from "@/components/casa/cocina/datos";

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

/** Centro x del encuadre vertical: un poco a la izquierda del medio para que la vaca (parte en x=250) se vea entera. */
export const X_VERTICAL = 390;

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
 * La cámara que de verdad se ve: la de la casa (pensada para un escenario cuadrado) llevada al escenario real,
 * más el paneo del dedo. En vertical el zoom nunca baja del encuadre inicial, así el cuarto siempre llena el alto.
 */
export function encuadrar(c: Camara, anchoPx: number, altoPx: number, pan: { x: number; y: number } = { x: 0, y: 0 }): Camara {
  const a = aspectoDe(anchoPx, altoPx);
  if (a === 1 && pan.x === 0 && pan.y === 0) return c;
  const ini = encuadreInicial(anchoPx, altoPx);
  // "ver todo" (s = 1) en vertical es el encuadre inicial; un enfoque de la casa conserva su centro
  const base = c.s <= 1 ? ini : c;
  return enfocar(base.x + pan.x, base.y + pan.y, Math.max(c.s, ini.s), a);
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

/** Dónde se para la vaca para usar algo. */
export function puntoJunto(id: ObjetoId | "fregadero"): { x: number; y: number } {
  if (id === "fregadero") return { x: FREGADERO.x, y: 560 };
  if (id === "bingxiang") return { x: 270, y: 580 };
  const o = OBJETOS[id];
  if (o.y < 400) return { x: o.x, y: 560 }; // cosas del mesón
  return { x: 430, y: o.y + 130 }; // cosas de la mesa
}

export function limitarVaca(x: number, y: number): { x: number; y: number } {
  return { x: limitar(x, 80, 920), y: limitar(y, 520, 990) };
}

/** Objeto más cercano a (vaca.x, vaca.y - 90), dentro de w/2 + 70; ignora los "nada". */
export function objetoBajo(vaca: { x: number; y: number }, e: EstadoCocina): ObjetoId | null {
  let mejor: ObjetoId | null = null;
  let dist = Infinity;
  for (const id of Object.keys(OBJETOS) as ObjetoId[]) {
    if (e[id] === "nada") continue;
    const o = OBJETOS[id];
    const d = Math.hypot(o.x - vaca.x, o.y - (vaca.y - 90));
    if (d < o.w / 2 + 70 && d < dist) {
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
