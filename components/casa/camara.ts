import { FREGADERO, OBJETOS, type EstadoCocina, type ObjetoId } from "@/components/casa/cocina/datos";

// Unidades de cuarto: 0-1000 en ambos ejes. Porcentajes de pantalla: 0-100.
export type Camara = { x: number; y: number; s: number };

const limitar = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Cámara centrada en (x, y) con zoom s, sin mostrar fuera del cuarto. */
export function enfocar(x: number, y: number, s: number): Camara {
  const mitad = 500 / s;
  return { x: limitar(x, mitad, 1000 - mitad), y: limitar(y, mitad, 1000 - mitad), s };
}

export function transformCSS(c: Camara): string {
  const tx = 50 - (c.x * c.s) / 10;
  const ty = 50 - (c.y * c.s) / 10;
  return `translate(${tx}%, ${ty}%) scale(${c.s})`;
}

/** De unidades del cuarto a % de la pantalla, contando el zoom. */
export function enPantalla(c: Camara, x: number, y: number): { x: number; y: number } {
  return { x: 50 + ((x - c.x) * c.s) / 10, y: 50 + ((y - c.y) * c.s) / 10 };
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

/** Abanico de opciones hacia el centro de la pantalla. `vertical`: celular en vertical (x más ancho). */
export function ubicarOpciones(
  c: Camara,
  id: ObjetoId,
  n: number,
  vertical = false,
): { x: number; y: number }[] {
  const o = OBJETOS[id];
  const p = enPantalla(c, o.x, o.y);
  const base = Math.atan2(55 - p.y, 50 - p.x);
  const [xmin, xmax] = vertical ? [12, 88] : [16, 84];
  const R = 20;
  return Array.from({ length: n }, (_, i) => {
    const ang = base + (i - (n - 1) / 2) * 0.85;
    return {
      x: limitar(p.x + Math.cos(ang) * R, xmin, xmax),
      y: limitar(p.y + Math.sin(ang) * R, 12, 90),
    };
  });
}
