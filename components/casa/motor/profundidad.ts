/**
 * Delante o detrás: la vaca y los muebles de un cuarto isométrico. Los muebles ya vienen dibujados en el fondo;
 * los que tienen capa propia (`DefPieza`) se vuelven a dibujar encima de la vaca cuando ella queda detrás.
 *
 * La regla, con la huella de cada mueble en el piso: la vaca (un punto u, v) está delante si pasó su borde de
 * adelante en u o en v (`u >= u1` o `v >= v1`). Si no, está detrás. Un mueble que se cruza en pantalla con uno
 * que va encima también va encima: así el orden de pintura del fondo (la silla de adelante sobre la mesa) se
 * mantiene.
 */
import { alPiso, PISO_LIBRE, proyectar } from "../cocina/iso";
import type { DefPieza } from "./tipos";

type UV = { u: number; v: number };
type Caja = { x0: number; x1: number; y0: number; y1: number };

/** El rectángulo de pantalla que encierra la pieza (sus 8 esquinas). */
export function cajaPieza(p: DefPieza): Caja {
  const ps = [p.u0, p.u1].flatMap((u) => [p.v0, p.v1].flatMap((v) => [0, p.alto].map((z) => proyectar(u, v, z))));
  const xs = ps.map((q) => q.x), ys = ps.map((q) => q.y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

const seCruzan = (a: Caja, b: Caja) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/** La vaca en (u, v) está detrás de la pieza. */
export const detrasDe = (p: DefPieza, c: UV) => !(c.u >= p.u1 || c.v >= p.v1);

/**
 * Las piezas que van encima de la vaca. `sentadaEn`: el objeto en cuyo asiento está sentada; su mueble queda
 * detrás de ella y los demás se comparan con el centro de ese mueble.
 */
export function piezasDelante(piezas: readonly DefPieza[], vaca: UV, sentadaEn?: string | null): Set<string> {
  const asiento = sentadaEn ? piezas.find((p) => p.asientoDe === sentadaEn) : undefined;
  const c = asiento ? { u: (asiento.u0 + asiento.u1) / 2, v: (asiento.v0 + asiento.v1) / 2 } : vaca;
  const cajas = piezas.map(cajaPieza);
  const encima = new Set<string>();
  piezas.forEach((p, k) => {
    if (p === asiento) return;
    const tapa = detrasDe(p, c) || piezas.some((q, j) => j < k && encima.has(q.id) && seCruzan(cajas[j], cajas[k]));
    if (tapa) encima.add(p.id);
  });
  return encima;
}

/** La vaca de pie en el punto de pantalla (x, y): dónde está en el piso. */
export const vacaEnElPiso = (x: number, y: number): UV => alPiso(x, y);

/** Lo que se separan las patas de la vaca de un mueble al dejarla en el piso. */
const MARGEN = 0.35;

/** El punto está dentro de alguna huella (con margen) o fuera del piso libre. */
function ocupado(piezas: readonly DefPieza[], u: number, v: number): boolean {
  if (u < PISO_LIBRE.min || u > PISO_LIBRE.max || v < PISO_LIBRE.min || v > PISO_LIBRE.max) return true;
  return piezas.some((p) => u > p.u0 - MARGEN && u < p.u1 + MARGEN && v > p.v0 - MARGEN && v < p.v1 + MARGEN);
}

/**
 * Un punto del piso fuera de los muebles: si cae dentro de una huella (con margen), se va al lugar libre más
 * cercano (anillos cada 0.1 unidades). Así la vaca nunca queda parada dentro de la mesa ni de una silla.
 */
export function fueraDePiezas(piezas: readonly DefPieza[], c: UV): UV {
  if (!ocupado(piezas, c.u, c.v)) return c;
  for (let r = 0.1; r <= 6; r += 0.1) {
    const n = Math.max(8, Math.round(r * 40));
    let mejor: UV | null = null;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const u = c.u + Math.cos(a) * r, v = c.v + Math.sin(a) * r;
      if (!ocupado(piezas, u, v)) {
        mejor = { u: Math.round(u * 100) / 100, v: Math.round(v * 100) / 100 };
        break;
      }
    }
    if (mejor) return mejor;
  }
  return c;
}
