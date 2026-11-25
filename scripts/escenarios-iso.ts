/**
 * Dibuja los escenarios escritos como ficha (`components/casa/escenarios/`): cada uno sale como
 * `public/arte/<id>/cuarto_<id>.svg` (1000 x 1000 unidades, 2000 x 2000 px) y con sus partes para Krita
 * (`arte-krita/fuentes/cuarto_<id>__NN_<parte>.svg`). Lo llama `scripts/arte-iso.ts` (`npm run arte:generar`),
 * que además los pone en la casa entera.
 *
 * Cada mueble del catálogo (`tipo` en la ficha) se dibuja con una función de este archivo. Un mueble nuevo se
 * programa una vez aquí y queda para todos los escenarios. Ver docs/escenarios.md.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { proyectar } from "../components/casa/cocina/iso";
import { ESCENARIOS } from "../components/casa/escenarios";
import type { Base, Colgado, DefEscenario, Mueble, Pared, Tono } from "../components/casa/escenarios/tipos";
import { baseDe, ordenDeDibujo, problemasEscenario } from "../components/casa/escenarios/validar";
import {
  C, L, H, LOSA, T, archivo, caja, cara, cilindro, circulo, circuloPared, cantosParedes, degradado, escribirPartes, f, linea,
  pisoDeTablas, planta, rectU, rectV, rectZ, trazo, type P3,
} from "./iso/dibujo";

export type Dibujo = { defs: string[]; cuerpo: string };

const BLANCO: Tono = { a: "#FFFFFF", i: "#EEF3F3", d: "#D9E3E4" };
const CREMA: Tono = { a: "#FCF4E4", i: "#F0E1C6", d: "#DDC7A2" };
const MADERA_OSC: Tono = { a: "#D4A16B", i: "#B98754", d: "#9E7044" };
const FRASCOS = [C.terracota, C.salvia.i, "#F6C2BA", "#A8D3E6", C.mostaza];

// ---------- paredes: un punto o un rectángulo sobre la pared izquierda (u = 0) o la derecha (v = 0) ----------
/** Punto a lo largo de la pared (`s`), a la altura z, despegado `e` de ella. */
const enPared = (p: Pared, e: number, s: number, z: number): P3 => (p === "izq" ? [e, s, z] : [s, e, z]);
const rectPared = (p: Pared, e: number, a: number, b: number, z0: number, z1: number, fill: string, g = 1.6, extra = "") =>
  p === "izq" ? rectU(e, a, b, z0, z1, fill, g, extra) : rectV(e, a, b, z0, z1, fill, g, extra);

// =====================================================================================
// AMBIENTE: piso, paredes y lo que cuelga
// =====================================================================================
function piso(def: DefEscenario, defs: string[]): string[] {
  const p = def.ambiente.piso;
  if (p.tipo === "tablas") return pisoDeTablas(defs);
  const out: string[] = [];
  defs.push(`<filter id="difuso" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>`);
  out.push(cara([[0, 0, -LOSA], [L + 0.4, 0, -LOSA], [L + 0.4, L + 0.4, -LOSA], [0, L + 0.4, -LOSA]], "rgba(120,80,40,0.22)", 0, 'filter="url(#difuso)" transform="translate(10 16)"'));
  out.push(cara([[0, L, -LOSA], [L, L, -LOSA], [L, L, 0], [0, L, 0]], C.losaIzq));
  out.push(cara([[L, 0, -LOSA], [L, L, -LOSA], [L, L, 0], [L, 0, 0]], C.losaDer));
  out.push(cara([[0, 0, 0], [L, 0, 0], [L, L, 0], [0, L, 0]], p.color));
  for (let k = p.paso; k < L - 0.01; k += p.paso) {
    out.push(linea([0, k, 0], [L, k, 0], p.linea, 1.2));
    out.push(linea([k, 0, 0], [k, L, 0], p.linea, 1.2));
  }
  out.push(cara([[0, 0, 0], [L, 0, 0], [L, L, 0], [0, L, 0]], "none", 2.2));
  return out;
}

function paredes(def: DefEscenario): string[] {
  const { paredes: pa, friso } = def.ambiente;
  const out: string[] = [cara([[0, 0, 0], [0, L, 0], [0, L, H], [0, 0, H]], pa.izq), cara([[0, 0, 0], [L, 0, 0], [L, 0, H], [0, 0, H]], pa.der)];
  if (friso) {
    for (const p of ["izq", "der"] as Pared[]) {
      out.push(rectPared(p, 0.001, 0, L, 0, friso.alto, friso.color, 1.4));
      const paso = friso.azulejo ?? 0.5;
      for (let s = paso; s < L - 0.01; s += paso) out.push(linea(enPared(p, 0.001, s, 0.35), enPared(p, 0.001, s, friso.alto), friso.linea, 1.1));
      if (friso.azulejo) for (let z = 0.35 + paso; z < friso.alto - 0.01; z += paso) out.push(linea(enPared(p, 0.001, 0, z), enPared(p, 0.001, L, z), friso.linea, 1.1));
      out.push(rectPared(p, 0.002, 0, L, friso.alto, friso.alto + 0.12, pa.zocalo, 1.3));
    }
  }
  for (const p of ["izq", "der"] as Pared[]) out.push(rectPared(p, 0.002, 0, L, 0, 0.35, pa.zocalo, 1.4));
  return out;
}

function ventana(c: Extract<Colgado, { tipo: "ventana" }>, defs: string[]): string[] {
  const out: string[] = [];
  const { pared: p, desde: a, hasta: b, z0, z1 } = c;
  const [gVid, uVid] = degradado("#E6F6FB", "#A9D6EA", true);
  defs.push(gVid);
  out.push(rectPared(p, 0.003, a - 0.12, b + 0.12, z0 - 0.12, z1 + 0.12, C.madera.i, 2));
  out.push(rectPared(p, 0.004, a, b, z0, z1, uVid, 1.6));
  // árboles de afuera y el marco en cruz
  const s = (a + b) / 2, zm = (z0 + z1) / 2;
  for (const [ds, dz, r] of [[-0.35, -0.45, 0.32], [0.2, -0.55, 0.38], [0.6, -0.4, 0.22]] as const)
    out.push(circuloPared(p === "izq" ? "u" : "v", 0.005, s + ds * (b - a) / 2, zm + dz * (z1 - z0) / 2, r * (b - a) / 2, "#BFDDB0", 0));
  out.push(rectPared(p, 0.004, a, b, z0, z1, "none", 1.6));
  out.push(linea(enPared(p, 0.005, s, z0), enPared(p, 0.005, s, z1), C.madera.d, 3.5));
  out.push(linea(enPared(p, 0.005, a, zm), enPared(p, 0.005, b, zm), C.madera.d, 3.5));
  out.push(linea(enPared(p, 0.006, a + 0.2, z1 - 0.25), enPared(p, 0.006, a + 0.5, z1 - 0.6), "#ffffff", 2.2, 'opacity="0.85"'));
  // repisa de abajo
  out.push(p === "izq" ? caja(0, 0.3, a - 0.2, b + 0.2, z0 - 0.22, z0 - 0.1, C.madera, 1.4) : caja(a - 0.2, b + 0.2, 0, 0.3, z0 - 0.22, z0 - 0.1, C.madera, 1.4));
  if (c.cortina) {
    const ancho = (b - a) * 0.28, zt = z1 + 0.3;
    out.push(linea(enPared(p, 0.25, a - 0.35, zt), enPared(p, 0.25, b + 0.35, zt), C.madera.d, 3));
    for (const [x0, x1] of [[a - 0.3, a - 0.3 + ancho], [b + 0.3 - ancho, b + 0.3]]) {
      out.push(rectPared(p, 0.2, x0, x1, z0 - 0.5, zt, c.cortina, 1.6));
      for (let k = 1; k < 3; k++) out.push(linea(enPared(p, 0.21, x0 + (k * (x1 - x0)) / 3, z0 - 0.45), enPared(p, 0.21, x0 + (k * (x1 - x0)) / 3, zt - 0.05), "rgba(107,74,53,0.35)", 1.2));
    }
  }
  return out;
}

function cuadro(c: Extract<Colgado, { tipo: "cuadro" }>): string[] {
  const { pared: p, desde: a, hasta: b, z0, z1 } = c;
  const plano = p === "izq" ? "u" : "v";
  const out = [rectPared(p, 0.004, a, b, z0, z1, C.madera.i, 2)];
  const fondo = c.motivo === "luna" ? "#6F7FA8" : "#CFE3EE";
  out.push(rectPared(p, 0.005, a + 0.12, b - 0.12, z0 + 0.12, z1 - 0.12, fondo, 1.4));
  const s = (a + b) / 2, zm = (z0 + z1) / 2, r = Math.min(b - a, z1 - z0) * 0.22;
  if (c.motivo === "luna") {
    out.push(circuloPared(plano, 0.006, s - r * 0.3, zm + r * 0.2, r, "#FBEFC8", 0));
    out.push(circuloPared(plano, 0.007, s + r * 0.15, zm + r * 0.45, r * 0.85, fondo, 0));
    for (const [ds, dz] of [[0.32, -0.25], [0.2, 0.3], [-0.3, -0.3]] as const) out.push(circuloPared(plano, 0.007, s + ds * (b - a), zm + dz * (z1 - z0), 0.045, "#FBEFC8", 0));
  } else {
    const pts: P3[] = [enPared(p, 0.006, a + 0.15, z0 + 0.15), enPared(p, 0.006, s - 0.1, zm + r), enPared(p, 0.006, b - 0.15, z0 + 0.15)];
    out.push(cara(pts, C.salvia.i, 0));
  }
  return out;
}

function repisa(c: Extract<Colgado, { tipo: "repisa" }>): string[] {
  const { pared: p, desde: a, hasta: b, z0, z1 } = c;
  const out = [p === "izq" ? caja(0, 0.45, a, b, z0, z1, C.madera, 1.5) : caja(a, b, 0, 0.45, z0, z1, C.madera, 1.5)];
  // frascos de skincare encima, de atrás hacia adelante
  const n = Math.max(2, Math.floor((b - a) / 0.45));
  for (let k = 0; k < n; k++) {
    const s = a + ((k + 0.5) * (b - a)) / n;
    const q = proyectar(...(enPared(p, 0.22, s, z1) as [number, number, number]));
    const alto = [18, 12, 22, 14, 16][k % 5], rx = [6, 8, 5, 7, 6][k % 5];
    out.push(cilindro(q.x, q.y, rx, alto, FRASCOS[k % FRASCOS.length], "#FFF8EC", 1.3));
    if (k % 2 === 0) out.push(`<rect x="${f(q.x - rx * 0.6)}" y="${f(q.y - alto - 5)}" width="${f(rx * 1.2)}" height="5" fill="${C.crema}" ${trazo(1.1)}/>`);
  }
  return out;
}

function toallero(c: Extract<Colgado, { tipo: "toallero" }>): string[] {
  const { pared: p, desde: a, hasta: b, z0, z1, color } = c;
  const out: string[] = [];
  const zb = z1 - 0.1;
  for (const s of [a, b]) out.push(linea(enPared(p, 0.005, s, zb), enPared(p, 0.2, s, zb), C.aceroOsc, 3));
  out.push(linea(enPared(p, 0.2, a, zb), enPared(p, 0.2, b, zb), C.acero, 3.5));
  // la toalla, doblada sobre la barra, con dos franjas
  const [t0, t1] = [a + 0.15, b - 0.15];
  out.push(rectPared(p, 0.24, t0, t1, z0, zb + 0.06, color, 1.8));
  for (const z of [z0 + 0.25, z0 + 0.42]) out.push(rectPared(p, 0.245, t0, t1, z, z + 0.08, C.crema, 0));
  return out;
}

function colgado(c: Colgado, defs: string[]): string[] {
  switch (c.tipo) {
    case "ventana": return ventana(c, defs);
    case "cuadro": return cuadro(c);
    case "repisa": return repisa(c);
    case "toallero": return toallero(c);
  }
}

// =====================================================================================
// CATÁLOGO DE MUEBLES
// =====================================================================================
function alfombra(b: Base, color: string, borde: string): string[] {
  return [
    rectZ(0.001, b.u0, b.u1, b.v0, b.v1, borde, 2),
    rectZ(0.002, b.u0 + 0.15, b.u1 - 0.15, b.v0 + 0.15, b.v1 - 0.15, color, 1.3),
    rectZ(0.003, b.u0 + 0.35, b.u1 - 0.35, b.v0 + 0.35, b.v1 - 0.35, "none", 1.2, `stroke="${borde}" stroke-dasharray="5 4"`),
  ];
}

function tina(b: Base, cortina: string): string[] {
  const out: string[] = [];
  const z1 = 1.5, t = 0.22;
  // la ducha en la pared derecha (v = 0), sobre la punta de la tina pegada a la pared izquierda
  const ud = b.u0 + 0.7;
  out.push(linea([ud, 0.06, z1], [ud, 0.06, 4.9], C.aceroOsc, 3.5));
  out.push(linea([ud, 0.06, 4.9], [ud, 0.6, 4.9], C.aceroOsc, 3.5));
  out.push(circulo(ud, 0.68, 4.82, 0.22, C.acero, 1.5));
  out.push(caja(ud - 0.12, ud + 0.12, 0, 0.12, 2.4, 2.6, { a: C.acero, i: C.aceroOsc, d: "#8F9B9E" }, 1.2));
  // la tina: caras de afuera, borde y el agua con espuma
  out.push(cara([[b.u0, b.v1, 0], [b.u1, b.v1, 0], [b.u1, b.v1, z1], [b.u0, b.v1, z1]], BLANCO.i, 2));
  out.push(cara([[b.u1, b.v0, 0], [b.u1, b.v1, 0], [b.u1, b.v1, z1], [b.u1, b.v0, z1]], BLANCO.d, 2));
  out.push(rectZ(z1, b.u0, b.u1, b.v0, b.v1, BLANCO.a, 2));
  out.push(rectZ(z1 + 0.001, b.u0 + t, b.u1 - t, b.v0 + t, b.v1 - t, "#CFEAF2", 1.5));
  for (const [u, v, r] of [[1.2, 0.9, 0.28], [1.7, 1.25, 0.34], [2.3, 0.85, 0.24], [2.9, 1.3, 0.3], [3.4, 0.9, 0.22], [2.1, 1.55, 0.2]] as const)
    out.push(circulo(b.u0 + u, b.v0 + v, z1 + 0.02, r, "#FFFFFF", 1.1, 'stroke="#A8D3E6"'));
  // patitas
  for (const u of [b.u0 + 0.3, b.u1 - 0.4]) out.push(caja(u, u + 0.14, b.v1 - 0.02, b.v1 + 0.08, 0, 0.18, MADERA_OSC, 1.1));
  // la barra y la cortina recogida junto a la pared izquierda, delante de la tina
  out.push(linea([b.u0 + 0.02, b.v1 - 0.05, 5.3], [b.u1, b.v1 - 0.05, 5.3], C.aceroOsc, 3));
  out.push(linea([b.u1, b.v1 - 0.05, 5.3], [b.u1, 0.05, 5.3], C.aceroOsc, 3));
  const [c0, c1] = [b.u0 + 0.05, b.u0 + 1.25];
  out.push(rectV(b.v1 - 0.02, c0, c1, z1 + 0.35, 5.3, cortina, 1.8));
  for (let k = 1; k < 4; k++) out.push(linea([c0 + (k * (c1 - c0)) / 4, b.v1 - 0.01, z1 + 0.45], [c0 + (k * (c1 - c0)) / 4, b.v1 - 0.01, 5.25], "rgba(107,74,53,0.35)", 1.2));
  return out;
}

function lavamanos(b: Base, defs: string[]): string[] {
  const out: string[] = [];
  const vm = (b.v0 + b.v1) / 2, zt = 1.9, r = (b.v1 - b.v0) * 0.27;
  // espejo redondo en la pared, encima
  const [gE, uE] = degradado("#EAF6F8", "#BFDCE4", true);
  defs.push(gE);
  out.push(circuloPared("u", 0.004, vm, 3.6, 0.95, C.madera.i, 2));
  out.push(circuloPared("u", 0.005, vm, 3.6, 0.8, uE, 1.5));
  out.push(linea([0.006, vm - 0.45, 3.95], [0.006, vm - 0.15, 4.25], "#ffffff", 2.4, 'opacity="0.9"'));
  // mueble con dos puertas (miran a +u) y la cubierta
  out.push(caja(b.u0, b.u1, b.v0, b.v1, 0.1, zt, C.salvia, 2));
  for (const [a, c] of [[b.v0 + 0.12, vm - 0.05], [vm + 0.05, b.v1 - 0.12]] as [number, number][]) {
    out.push(rectU(b.u1 + 0.001, a, c, 0.3, zt - 0.2, C.salvia.i, 1.3));
    const k = proyectar(b.u1 + 0.01, a < vm ? c - 0.15 : a + 0.15, 1.2);
    out.push(`<circle cx="${f(k.x)}" cy="${f(k.y)}" r="2.6" fill="${C.oro}" ${trazo(1)}/>`);
  }
  out.push(caja(b.u0, b.u1 + 0.08, b.v0 - 0.06, b.v1 + 0.06, zt, zt + 0.14, C.meson, 1.8));
  // el lavamanos (bol blanco), la llave y el vaso con los cepillos
  const uc = b.u0 + (b.u1 - b.u0) * 0.58, z = zt + 0.14;
  out.push(circulo(uc, vm, z + 0.001, r, "#FFFFFF", 1.8));
  out.push(circulo(uc + 0.04, vm + 0.04, z + 0.002, r * 0.7, "#DCEBEE", 1.2));
  const ll = proyectar(b.u0 + 0.22, vm, z);
  out.push(cilindro(ll.x, ll.y, 4, 18, C.acero, C.aceroOsc, 1.3));
  out.push(linea([b.u0 + 0.22, vm, z + 0.45], [b.u0 + 0.55, vm, z + 0.45], C.aceroOsc, 3.5));
  const vs = proyectar(b.u0 + 0.3, b.v0 + 0.25, z);
  out.push(`<path d="M${f(vs.x - 4)} ${f(vs.y - 30)} l-5 -16 M${f(vs.x + 3)} ${f(vs.y - 30)} l4 -18" stroke="${C.terracota}" stroke-width="3" stroke-linecap="round" fill="none"/>`);
  out.push(cilindro(vs.x, vs.y, 7, 24, "#D2ECF4", "#A8D3E6", 1.3));
  return out;
}

function inodoro(b: Base): string[] {
  const out: string[] = [];
  const vm = (b.v0 + b.v1) / 2;
  out.push(caja(b.u0, b.u0 + 0.5, b.v0 + 0.05, b.v1 - 0.05, 1.3, 2.7, BLANCO, 1.8)); // estanque
  out.push(caja(b.u0 - 0.02, b.u0 + 0.56, b.v0, b.v1, 2.7, 2.82, BLANCO, 1.5)); // tapa del estanque
  out.push(caja(b.u0 + 0.5, b.u0 + 0.8, vm - 0.3, vm + 0.3, 0.85, 1.32, BLANCO, 1.4)); // unión con el estanque
  out.push(caja(b.u0 + 0.5, b.u1 - 0.35, vm - 0.28, vm + 0.28, 0, 0.85, BLANCO, 1.8)); // pie
  const uc = b.u0 + 0.5 + (b.u1 - b.u0 - 0.5) / 2;
  out.push(cara([[b.u0 + 0.5, vm - 0.5, 0.85], [b.u0 + 0.5, vm + 0.5, 0.85], [b.u0 + 0.5, vm + 0.5, 1.12], [b.u0 + 0.5, vm - 0.5, 1.12]], BLANCO.d, 1.2));
  out.push(circulo(uc, vm, 1.12, 0.52, "#FFFFFF", 1.8));
  out.push(circulo(uc + 0.03, vm, 1.121, 0.32, "#DCEBEE", 1.2));
  return out;
}

function cama(b: Base, colcha: Tono, almohada: string): string[] {
  const out: string[] = [];
  const vc = b.v0 + 0.28;
  out.push(caja(b.u0 - 0.1, b.u1 + 0.1, b.v0, vc, 0, 3.0, C.madera, 2)); // cabecera
  out.push(caja(b.u0 - 0.16, b.u1 + 0.16, b.v0, vc + 0.06, 3.0, 3.14, MADERA_OSC, 1.4)); // moldura
  out.push(caja(b.u0, b.u1, vc, b.v1, 0.15, 0.75, C.madera, 2)); // base
  for (const u of [b.u0 + 0.05, b.u1 - 0.2]) out.push(caja(u, u + 0.15, b.v1 - 0.2, b.v1 - 0.05, 0, 0.15, MADERA_OSC, 1.1));
  out.push(caja(b.u0 + 0.05, b.u1 - 0.05, vc, b.v1 - 0.05, 0.75, 1.25, CREMA, 1.8)); // colchón
  // dos almohadas
  const um = (b.u0 + b.u1) / 2;
  const almo: Tono = { a: almohada, i: "#EFE4D2", d: "#DCCDB5" };
  for (const [a, c] of [[b.u0 + 0.2, um - 0.08], [um + 0.08, b.u1 - 0.2]]) out.push(caja(a, c, vc + 0.12, vc + 1.05, 1.25, 1.62, almo, 1.6));
  // la colcha cae por los lados; arriba, la sábana doblada
  const vb = vc + 1.25;
  out.push(caja(b.u0 - 0.04, b.u1 + 0.04, vb + 0.35, b.v1 + 0.02, 0.6, 1.33, colcha, 2));
  out.push(caja(b.u0 - 0.04, b.u1 + 0.04, vb, vb + 0.35, 0.62, 1.36, CREMA, 1.8));
  // pespuntes de la colcha
  for (let v = vb + 1.0; v < b.v1 - 0.3; v += 0.8) out.push(linea([b.u0 + 0.1, v, 1.331], [b.u1 - 0.1, v, 1.331], colcha.d, 1.2, 'stroke-dasharray="4 4"'));
  for (let u = b.u0 + 0.8; u < b.u1 - 0.3; u += 0.8) out.push(linea([u, vb + 0.45, 1.331], [u, b.v1 - 0.1, 1.331], colcha.d, 1.2, 'stroke-dasharray="4 4"'));
  return out;
}

function velador(b: Base, encima?: "lampara" | "despertador"): string[] {
  const out: string[] = [];
  const zt = 1.6;
  out.push(caja(b.u0, b.u1, b.v0, b.v1, 0, zt, C.madera, 1.8));
  out.push(rectV(b.v1 + 0.001, b.u0 + 0.12, b.u1 - 0.12, zt - 0.6, zt - 0.15, C.madera.i, 1.3));
  const k = proyectar((b.u0 + b.u1) / 2, b.v1 + 0.01, zt - 0.37);
  out.push(`<circle cx="${f(k.x)}" cy="${f(k.y)}" r="2.6" fill="${C.oro}" ${trazo(1)}/>`);
  const c = proyectar((b.u0 + b.u1) / 2, (b.v0 + b.v1) / 2, zt);
  if (encima === "lampara") {
    out.push(cilindro(c.x, c.y, 9, 6, C.terracota, C.terracotaOsc, 1.3));
    out.push(`<path d="M${f(c.x)} ${f(c.y - 6)} L${f(c.x)} ${f(c.y - 34)}" stroke="${T}" stroke-width="2"/>`);
    out.push(`<path d="M${f(c.x - 12)} ${f(c.y - 56)} L${f(c.x + 12)} ${f(c.y - 56)} L${f(c.x + 19)} ${f(c.y - 32)} L${f(c.x - 19)} ${f(c.y - 32)} Z" fill="${C.mostaza}" ${trazo(1.6)}/>`);
    out.push(`<ellipse cx="${f(c.x)}" cy="${f(c.y - 32)}" rx="19" ry="5" fill="#F8D77E" ${trazo(1.3)}/>`);
  } else if (encima === "despertador") {
    const y = c.y - 15;
    for (const dx of [-8, 8]) out.push(`<circle cx="${f(c.x + dx)}" cy="${f(y - 11)}" r="4.5" fill="${C.oro}" ${trazo(1.2)}/>`);
    out.push(`<circle cx="${f(c.x)}" cy="${f(y)}" r="12" fill="${C.terracota}" ${trazo(1.6)}/>`);
    out.push(`<circle cx="${f(c.x)}" cy="${f(y)}" r="8.5" fill="${C.crema}" ${trazo(1.1)}/>`);
    out.push(`<path d="M${f(c.x)} ${f(y)} L${f(c.x)} ${f(y - 6)} M${f(c.x)} ${f(y)} L${f(c.x + 4.5)} ${f(y + 1.5)}" stroke="${T}" stroke-width="1.8" stroke-linecap="round"/>`);
    out.push(`<path d="M${f(c.x - 7)} ${f(y + 10)} l-3 5 M${f(c.x + 7)} ${f(y + 10)} l3 5" stroke="${T}" stroke-width="2" stroke-linecap="round"/>`);
  }
  return out;
}

function closet(b: Base, alto: number): string[] {
  const out: string[] = [];
  for (const v of [b.v0 + 0.1, b.v1 - 0.25]) out.push(caja(b.u1 - 0.25, b.u1 - 0.1, v, v + 0.15, 0, 0.2, MADERA_OSC, 1.1));
  out.push(caja(b.u0, b.u1, b.v0, b.v1, 0.2, alto, C.madera, 2));
  out.push(caja(b.u0, b.u1 + 0.1, b.v0 - 0.1, b.v1 + 0.1, alto, alto + 0.18, MADERA_OSC, 1.6)); // cornisa
  // dos puertas con su panel; en la de adelante, un espejo largo
  const vm = (b.v0 + b.v1) / 2;
  const puertas: [number, number][] = [[b.v0 + 0.1, vm - 0.04], [vm + 0.04, b.v1 - 0.1]];
  puertas.forEach(([a, c], i) => {
    out.push(rectU(b.u1 + 0.001, a, c, 0.35, alto - 0.12, C.madera.i, 1.4));
    out.push(rectU(b.u1 + 0.002, a + 0.2, c - 0.2, 0.6, alto - 0.4, i === 1 ? "#D2ECF4" : C.madera.d, 1.2));
    if (i === 1) out.push(linea([b.u1 + 0.003, a + 0.45, alto - 0.8], [b.u1 + 0.003, a + 0.9, alto - 1.6], "#ffffff", 2.2, 'opacity="0.8"'));
    const k = proyectar(b.u1 + 0.01, i === 0 ? c - 0.12 : a + 0.12, alto * 0.48);
    out.push(`<rect x="${f(k.x - 2)}" y="${f(k.y - 9)}" width="4" height="18" rx="2" fill="${C.oro}" ${trazo(1)}/>`);
  });
  return out;
}

function mueble(m: Mueble, defs: string[]): string[] {
  switch (m.tipo) {
    case "alfombra": return alfombra(m.base, m.color, m.borde);
    case "tina": return tina(m.base, m.cortina);
    case "lavamanos": return lavamanos(m.base, defs);
    case "inodoro": return inodoro(m.base);
    case "cama": return cama(m.base, m.colcha, m.almohada);
    case "velador": return velador(m.base, m.encima);
    case "closet": return closet(m.base, m.alto);
    case "planta": return planta(m.u, m.v);
  }
}

// =====================================================================================
// UN ESCENARIO ENTERO
// =====================================================================================
/** Dibuja la ficha y escribe su SVG y sus partes para Krita. Devuelve el dibujo para la casa entera. */
export function dibujarEscenario(def: DefEscenario): Dibujo {
  const problemas = problemasEscenario(def);
  if (problemas.length) throw new Error("ficha de escenario con problemas:\n  " + problemas.join("\n  "));
  const defs: string[] = [];
  const out: string[] = [];
  const partes: [string, number][] = [];
  const parte = (nombre: string) => partes.push([nombre, out.length]);

  parte("piso");
  out.push(...piso(def, defs));
  parte("paredes");
  out.push(...paredes(def));
  for (const c of def.colgados) out.push(...colgado(c, defs));
  out.push(...cantosParedes());

  const orden = ordenDeDibujo(def.muebles);
  const planos = orden.filter((m) => m.tipo === "alfombra");
  for (const m of planos) { parte(m.id); out.push(...mueble(m, defs)); }
  parte("sombras");
  for (const m of orden) {
    if (m.tipo === "alfombra" || m.tipo === "planta") continue;
    const b = baseDe(m);
    out.push(rectZ(0.006, b.u0, b.u1 + 0.25, b.v0, b.v1 + 0.25, "rgba(110,70,35,0.14)", 0));
  }
  for (const m of orden) if (m.tipo !== "alfombra") { parte(m.id); out.push(...mueble(m, defs)); }

  const salida = join(process.cwd(), "public", "arte", def.id);
  mkdirSync(salida, { recursive: true });
  archivo(`cuarto_${def.id}`, [0, 0, 1000, 1000], 2000, defs, out.join(""), salida);
  escribirPartes(`cuarto_${def.id}`, partes, out, defs);
  return { defs, cuerpo: out.join("") };
}

/** Todos los escenarios de `components/casa/escenarios/`, por id. */
export function dibujarEscenarios(): Record<string, Dibujo> {
  return Object.fromEntries(ESCENARIOS.map((d) => [d.id, dibujarEscenario(d)]));
}
