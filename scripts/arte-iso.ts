/**
 * Genera el arte isométrico de la cocina como archivos SVG en public/arte/cocina/.
 * Correr con `npm run arte:generar`. Cada capa es un archivo propio para que se pueda abrir y repintar
 * en Krita (ver docs/arte.md). Las posiciones salen de components/casa/cocina/iso.ts y datos.ts.
 *
 * Si ya existe un PNG o WebP con el mismo nombre (un dibujo a mano), el juego usa ese y no el SVG:
 * este script nunca toca los PNG/WebP.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ISO, MUEBLES, proyectar } from "../components/casa/cocina/iso";
import { OBJETOS, type ObjetoId } from "../components/casa/cocina/datos";

const SALIDA = join(process.cwd(), "public", "arte", "cocina");
mkdirSync(SALIDA, { recursive: true });
/** Partes del cuarto por separado, solo para armar las capas de Krita (scripts/arte-krita.ts). */
const PARTES = join(process.cwd(), "arte-krita", "fuentes");

// ---------- paleta (tomada de la imagen de inspiración: salvia, crema, madera, toques terracota) ----------
const T = "#6B4A35"; // tinta: contorno café
const C = {
  paredIzq: "#EEDBBB", paredDer: "#F6E8CF", paredCanto: "#FBF3E4", zocalo: "#D7AE80",
  pisoA: "#EAC69B", pisoB: "#E2BB8D", pisoLinea: "#C99B68", losaIzq: "#C99560", losaDer: "#AD7C4B",
  salvia: { a: "#BCD4A8", i: "#A5C391", d: "#8DAE7B", linea: "#6F9161" },
  meson: { a: "#FBF5E8", i: "#EADDC3", d: "#D8C7A7" },
  madera: { a: "#E6B985", i: "#D4A16B", d: "#B98754" },
  azulejo: "#EEF2E4", azulejoLinea: "#CFDCC2",
  acero: "#C9D2D4", aceroOsc: "#A3AFB2", negro: "#4D4845", negroOsc: "#34302E",
  vidrio: "#D2ECF4", vidrioOsc: "#A8D3E6",
  terracota: "#E0896A", terracotaOsc: "#C46C50", mostaza: "#F2C14E", rojo: "#D9604C", oro: "#E8B64C",
  hoja: "#8DB36F", hojaOsc: "#6E9653", crema: "#FFF8EC",
};

// ---------- utilidades de SVG ----------
const f = (n: number) => (Math.round(n * 10) / 10).toString();
type P3 = [number, number, number];
const xy = ([u, v, z]: P3) => proyectar(u, v, z);
const camino = (pts: { x: number; y: number }[]) => "M" + pts.map((p) => `${f(p.x)} ${f(p.y)}`).join(" L") + " Z";
const trazo = (g = 2, color = T) => `stroke="${color}" stroke-width="${g}" stroke-linejoin="round" stroke-linecap="round"`;
/** Un `stroke="…"` en `extra` reemplaza el color del contorno. */
const conTrazo = (g: number, extra: string) => {
  const m = extra.match(/stroke="([^"]+)"/);
  return [g ? trazo(g, m ? m[1] : T) : 'stroke="none"', m ? extra.replace(m[0], "") : extra].join(" ");
};

function cara(pts: P3[], fill: string, g = 2, extra = ""): string {
  return `<path d="${camino(pts.map(xy))}" fill="${fill}" ${conTrazo(g, extra)}/>`;
}
function linea(a: P3, b: P3, color = T, g = 1.5, extra = ""): string {
  const p = xy(a), q = xy(b);
  return `<path d="M${f(p.x)} ${f(p.y)} L${f(q.x)} ${f(q.y)}" stroke="${color}" stroke-width="${g}" stroke-linecap="round" fill="none" ${extra}/>`;
}

type Colores = { a: string; i: string; d: string };
/** Caja de u0..u1, v0..v1, z0..z1: dibuja las tres caras visibles (arriba, izquierda = v1, derecha = u1). */
function caja(u0: number, u1: number, v0: number, v1: number, z0: number, z1: number, c: Colores, g = 2): string {
  return [
    cara([[u0, v1, z0], [u1, v1, z0], [u1, v1, z1], [u0, v1, z1]], c.i, g),
    cara([[u1, v0, z0], [u1, v1, z0], [u1, v1, z1], [u1, v0, z1]], c.d, g),
    cara([[u0, v0, z1], [u1, v0, z1], [u1, v1, z1], [u0, v1, z1]], c.a, g),
  ].join("");
}
/** Rectángulo sobre el plano v = constante (cara que mira abajo a la izquierda). */
const rectV = (v: number, u0: number, u1: number, z0: number, z1: number, fill: string, g = 1.6, extra = "") =>
  cara([[u0, v, z0], [u1, v, z0], [u1, v, z1], [u0, v, z1]], fill, g, extra);
/** Rectángulo sobre el plano u = constante (cara que mira abajo a la derecha). */
const rectU = (u: number, v0: number, v1: number, z0: number, z1: number, fill: string, g = 1.6, extra = "") =>
  cara([[u, v0, z0], [u, v1, z0], [u, v1, z1], [u, v0, z1]], fill, g, extra);
/** Rectángulo horizontal a la altura z. */
const rectZ = (z: number, u0: number, u1: number, v0: number, v1: number, fill: string, g = 1.6, extra = "") =>
  cara([[u0, v0, z], [u1, v0, z], [u1, v1, z], [u0, v1, z]], fill, g, extra);

/** Elipse de un círculo horizontal de radio r (unidades) centrado en (u, v, z). */
function circulo(u: number, v: number, z: number, r: number, fill: string, g = 1.8, extra = ""): string {
  const p = proyectar(u, v, z);
  const rx = Math.SQRT2 * r * ISO.A;
  return `<ellipse cx="${f(p.x)}" cy="${f(p.y)}" rx="${f(rx)}" ry="${f(rx / 2)}" fill="${fill}" ${conTrazo(g, extra)}/>`;
}

/** Cilindro vertical en pantalla (px): base en (x, yb), radio rx, alto h. Elipses 2:1. */
function cilindro(x: number, yb: number, rx: number, h: number, lado: string, tapa: string, g = 1.8): string {
  const ry = rx / 2;
  const cuerpo = `M${f(x - rx)} ${f(yb - h)} L${f(x - rx)} ${f(yb)} A${f(rx)} ${f(ry)} 0 0 0 ${f(x + rx)} ${f(yb)} L${f(x + rx)} ${f(yb - h)} Z`;
  return `<path d="${cuerpo}" fill="${lado}" ${trazo(g)}/><ellipse cx="${f(x)}" cy="${f(yb - h)}" rx="${f(rx)}" ry="${f(ry)}" fill="${tapa}" ${trazo(g)}/>`;
}

let nGrad = 0;
/** Degradado horizontal (luz desde la izquierda). Devuelve [defs, url]. */
function degradado(c1: string, c2: string, vertical = false): [string, string] {
  const id = `g${++nGrad}`;
  const dir = vertical ? 'x1="0" y1="0" x2="0" y2="1"' : 'x1="0" y1="0" x2="1" y2="0"';
  return [`<linearGradient id="${id}" ${dir}><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`, `url(#${id})`];
}

function archivo(nombre: string, vista: [number, number, number, number], px: number, defs: string[], cuerpo: string) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="${vista.map(f).join(" ")}">` +
    (defs.length ? `<defs>${defs.join("")}</defs>` : "") +
    cuerpo +
    `</svg>\n`;
  writeFileSync(join(SALIDA, `${nombre}.svg`), svg);
  console.log("✓", `${nombre}.svg`);
}

// =====================================================================================
// EL CUARTO
// =====================================================================================
function cuarto() {
  const defs: string[] = [];
  const out: string[] = [];
  /** Partes del cuarto para las capas de Krita (arte-krita/cuarto_cocina.ora): cada una empieza donde se marca. */
  const partes: [string, number][] = [];
  const parte = (nombre: string) => partes.push([nombre, out.length]);
  const L = ISO.lado, H = ISO.altoPared, t = 0.35, losa = 0.6;

  parte("piso");
  // sombra suave del diorama sobre el fondo
  defs.push(`<filter id="difuso" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>`);
  out.push(cara([[0, 0, -losa], [L + 0.4, 0, -losa], [L + 0.4, L + 0.4, -losa], [0, L + 0.4, -losa]], "rgba(120,80,40,0.22)", 0, 'filter="url(#difuso)" transform="translate(10 16)"'));

  // losa del piso (canto)
  out.push(cara([[0, L, -losa], [L, L, -losa], [L, L, 0], [0, L, 0]], C.losaIzq));
  out.push(cara([[L, 0, -losa], [L, L, -losa], [L, L, 0], [L, 0, 0]], C.losaDer));
  // piso de tablas (a lo largo de u)
  out.push(cara([[0, 0, 0], [L, 0, 0], [L, L, 0], [0, L, 0]], C.pisoA));
  const ancho = 0.72;
  let k = 0;
  for (let v = 0; v < L - 0.01; v += ancho, k++) {
    const v1 = Math.min(L, v + ancho);
    if (k % 2) out.push(rectZ(0, 0, L, v, v1, C.pisoB, 0));
    out.push(linea([0, v1, 0], [L, v1, 0], C.pisoLinea, 1.3));
    for (let u = ((k * 1.7) % 3) + 0.6; u < L - 0.2; u += 3.1) out.push(linea([u, v + 0.06, 0], [u, v1 - 0.06, 0], C.pisoLinea, 1.3));
  }
  out.push(cara([[0, 0, 0], [L, 0, 0], [L, L, 0], [0, L, 0]], "none", 2.2));

  // luz de la ventana sobre el piso
  out.push(rectZ(0, 2.0, 4.6, 2.1, 4.4, "rgba(255,248,222,0.45)", 0));
  // alfombra redonda
  out.push(circulo(6.1, 6.2, 0, 2.35, C.terracota, 2));
  out.push(circulo(6.1, 6.2, 0, 2.0, C.crema, 1.4));
  out.push(circulo(6.1, 6.2, 0, 1.55, "#A9C995", 1.4));
  out.push(circulo(6.1, 6.2, 0, 1.0, C.crema, 1.4));
  out.push(circulo(6.1, 6.2, 0, 0.45, C.terracota, 1.4));
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const r0 = 2.35, r1 = 2.55;
    out.push(linea([6.1 + Math.cos(a) * r0, 6.2 + Math.sin(a) * r0, 0], [6.1 + Math.cos(a) * r1, 6.2 + Math.sin(a) * r1, 0], C.terracotaOsc, 1.6));
  }

  parte("paredes");
  // paredes
  out.push(cara([[0, 0, 0], [0, L, 0], [0, L, H], [0, 0, H]], C.paredIzq));
  out.push(cara([[0, 0, 0], [L, 0, 0], [L, 0, H], [0, 0, H]], C.paredDer));
  // zócalo
  out.push(rectU(0.001, 5.5, L, 0, 0.35, C.zocalo, 1.4));
  out.push(rectV(0.001, 9.8, L, 0, 0.35, C.zocalo, 1.4));
  // canto superior y extremos de las paredes
  out.push(cara([[0, L, H], [0, 0, H], [L, 0, H], [L, -t, H], [-t, -t, H], [-t, L, H]], C.paredCanto));
  out.push(cara([[-t, L, -losa], [0, L, -losa], [0, L, H], [-t, L, H]], C.paredCanto));
  out.push(cara([[L, -t, -losa], [L, 0, -losa], [L, 0, H], [L, -t, H]], "#E9D6B6"));
  // esquina del fondo
  out.push(linea([0, 0, 0], [0, 0, H], T, 1.6));

  // azulejos detrás de los mesones
  const zA0 = MUEBLES.mesonIzq.alto, zA1 = 3.0;
  out.push(rectU(0.002, 0, MUEBLES.mesonIzq.v1, zA0, zA1, C.azulejo, 1.6));
  out.push(rectV(0.002, 0, MUEBLES.mesonDer.u1, zA0, zA1, C.azulejo, 1.6));
  for (let z = zA0 + 0.27; z < zA1; z += 0.27) {
    out.push(linea([0.002, 0, z], [0.002, MUEBLES.mesonIzq.v1, z], C.azulejoLinea, 1.2));
    out.push(linea([0, 0.002, z], [MUEBLES.mesonDer.u1, 0.002, z], C.azulejoLinea, 1.2));
  }
  for (let s = 0.4; s < MUEBLES.mesonIzq.v1; s += 0.4) out.push(linea([0.002, s, zA0], [0.002, s, zA1], C.azulejoLinea, 1.2));
  for (let s = 0.4; s < MUEBLES.mesonDer.u1; s += 0.4) out.push(linea([s, 0.002, zA0], [s, 0.002, zA1], C.azulejoLinea, 1.2));

  parte("ventana");
  // ---- ventana (pared izquierda) ----
  const [wv0, wv1, wz0, wz1] = [1.9, 4.1, 3.25, 5.35];
  const [gVid, uVid] = degradado("#E6F6FB", "#A9D6EA", true);
  defs.push(gVid);
  out.push(rectU(0.003, wv0, wv1, wz0, wz1, C.madera.i, 2));
  out.push(rectU(0.004, wv0 + 0.13, wv1 - 0.13, wz0 + 0.13, wz1 - 0.13, uVid, 1.6));
  // árboles afuera
  for (const [v, z, r] of [[2.4, 3.6, 0.42], [2.9, 3.5, 0.5], [3.6, 3.65, 0.38]] as const) {
    const p = proyectar(0.005, v, z);
    out.push(`<ellipse cx="${f(p.x)}" cy="${f(p.y)}" rx="${f(r * ISO.A * 0.9)}" ry="${f(r * ISO.Z * 1.1)}" fill="#BFDDB0" stroke="none" transform="translate(${f(p.x)} ${f(p.y)}) skewY(-26.57) translate(${f(-(p.x))} ${f(-(p.y))})"/>`);
  }
  out.push(linea([0.005, (wv0 + wv1) / 2, wz0 + 0.13], [0.005, (wv0 + wv1) / 2, wz1 - 0.13], C.madera.d, 4));
  out.push(linea([0.005, wv0 + 0.13, (wz0 + wz1) / 2], [0.005, wv1 - 0.13, (wz0 + wz1) / 2], C.madera.d, 4));
  out.push(linea([0.005, 2.25, 5.0], [0.005, 2.65, 4.45], "#ffffff", 2.4, 'opacity="0.9"'));
  out.push(linea([0.005, 2.45, 5.05], [0.005, 2.75, 4.65], "#ffffff", 2, 'opacity="0.7"'));
  // cenefa de encaje
  {
    const n = 9, pasos: string[] = [];
    const a = proyectar(0.006, wv0 + 0.1, wz1 - 0.12);
    pasos.push(`M${f(a.x)} ${f(a.y)}`);
    for (let i = 0; i < n; i++) {
      const v0 = wv0 + 0.1 + ((wv1 - wv0 - 0.2) * i) / n, v1 = wv0 + 0.1 + ((wv1 - wv0 - 0.2) * (i + 1)) / n;
      const m = proyectar(0.006, (v0 + v1) / 2, wz1 - 0.5), e = proyectar(0.006, v1, wz1 - 0.3);
      pasos.push(`Q${f(m.x)} ${f(m.y)} ${f(e.x)} ${f(e.y)}`);
    }
    const b = proyectar(0.006, wv1 - 0.1, wz1 - 0.12);
    pasos.push(`L${f(b.x)} ${f(b.y)} Z`);
    out.push(`<path d="${pasos.join(" ")}" fill="#FFFDF7" ${trazo(1.5)}/>`);
    for (let i = 0; i < n; i++) {
      const v = wv0 + 0.1 + ((wv1 - wv0 - 0.2) * (i + 0.5)) / n, p = proyectar(0.006, v, wz1 - 0.3);
      out.push(`<circle cx="${f(p.x)}" cy="${f(p.y)}" r="2.2" fill="none" stroke="${C.azulejoLinea}" stroke-width="1.2"/>`);
    }
  }
  // repisa de la ventana con dos maceteros
  out.push(caja(0, 0.38, wv0 - 0.15, wv1 + 0.15, wz0 - 0.12, wz0, C.madera, 1.8));
  for (const v of [2.45, 3.55]) {
    const p = proyectar(0.2, v, wz0);
    out.push(cilindro(p.x, p.y, 8, 11, C.terracota, C.terracotaOsc, 1.6));
    out.push(`<path d="M${f(p.x)} ${f(p.y - 11)} q-10 -14 -4 -22 q6 8 4 22 q4 -16 12 -18 q2 10 -12 18z" fill="${C.hoja}" ${trazo(1.4)}/>`);
  }

  parte("repisa_izq");
  // repisa con frascos (pared izquierda, entre la ventana y el refri)
  out.push(caja(0, 0.55, 4.4, 5.9, 4.0, 4.1, C.madera, 1.8));
  for (const [v, col, h] of [[4.65, C.mostaza, 22], [5.05, C.rojo, 17], [5.5, "#A9D3C2", 26]] as const) {
    const p = proyectar(0.28, v, 4.1);
    out.push(cilindro(p.x, p.y, 7.5, h, "rgba(226,242,246,0.85)", "#F7FBFC", 1.5));
    out.push(cilindro(p.x, p.y - 2, 6, h - 7, col, col, 1.2));
    out.push(cilindro(p.x, p.y - h, 7.8, 4, C.madera.i, C.madera.a, 1.5));
  }

  parte("pared_der");
  // ---- pared derecha: repisas, utensilios colgados y cuadros ----
  out.push(caja(1.9, 4.9, 0, 0.6, 4.0, 4.1, C.madera, 1.8));
  out.push(caja(1.9, 4.9, 0, 0.6, 4.95, 5.05, C.madera, 1.8));
  // frascos (repisa baja)
  for (const [u, col, h] of [[2.3, C.terracota, 20], [2.8, C.mostaza, 26], [3.3, "#A9D3C2", 18], [3.8, C.rojo, 23]] as const) {
    const p = proyectar(u, 0.3, 4.1);
    out.push(cilindro(p.x, p.y, 7.5, h, "rgba(226,242,246,0.85)", "#F7FBFC", 1.5));
    out.push(cilindro(p.x, p.y - 2, 6, h - 8, col, col, 1.2));
    out.push(cilindro(p.x, p.y - h, 7.8, 4, C.crema, "#FFFFFF", 1.5));
  }
  // platos apoyados (repisa baja, al final)
  for (const [u, col] of [[4.35, "#FFFFFF"], [4.55, "#F3F7FA"]] as const) {
    const p = proyectar(u, 0.18, 4.1);
    out.push(`<ellipse cx="${f(p.x)}" cy="${f(p.y - 15)}" rx="9" ry="15" fill="${col}" ${trazo(1.5)} transform="rotate(-18 ${f(p.x)} ${f(p.y - 15)})"/>`);
    out.push(`<ellipse cx="${f(p.x)}" cy="${f(p.y - 15)}" rx="6" ry="10.5" fill="none" stroke="#7DA5D8" stroke-width="1.4" transform="rotate(-18 ${f(p.x)} ${f(p.y - 15)})"/>`);
  }
  // botellas verdes (repisa alta)
  for (const u of [2.2, 2.6, 3.0]) {
    const p = proyectar(u, 0.3, 5.05);
    out.push(cilindro(p.x, p.y, 7, 24, "#5E8C55", "#4E7A46", 1.6));
    out.push(`<path d="M${f(p.x - 3)} ${f(p.y - 27)} L${f(p.x - 3)} ${f(p.y - 37)} L${f(p.x + 3)} ${f(p.y - 37)} L${f(p.x + 3)} ${f(p.y - 27)} Z" fill="#4E7A46" ${trazo(1.4)}/>`);
    out.push(`<rect x="${f(p.x - 5)}" y="${f(p.y - 18)}" width="10" height="8" fill="${C.crema}" ${trazo(1)}/>`);
  }
  // tetera chica y tazas (repisa alta)
  for (const u of [3.65, 4.05, 4.45]) {
    const p = proyectar(u, 0.3, 5.05);
    out.push(cilindro(p.x, p.y, 7, 9, "#F7FBFC", "#E9EEF0", 1.4));
    out.push(`<path d="M${f(p.x + 7)} ${f(p.y - 7)} q6 0 5 5 q-1 3 -5 2" fill="none" ${trazo(1.4)}/>`);
  }
  // barra con utensilios
  out.push(linea([3.1, 0.04, 3.55], [4.9, 0.04, 3.55], C.aceroOsc, 3.2));
  const utensilio = (u: number, cabeza: string) => {
    const p = proyectar(u, 0.05, 3.55);
    return `<g transform="translate(${f(p.x)} ${f(p.y)})"><path d="M0 0 L0 22" stroke="${T}" stroke-width="3.6" stroke-linecap="round"/><path d="M0 0 L0 22" stroke="${C.madera.i}" stroke-width="2" stroke-linecap="round"/>${cabeza}</g>`;
  };
  out.push(utensilio(3.4, `<ellipse cx="0" cy="27" rx="4.5" ry="6" fill="${C.acero}" ${trazo(1.4)}/>`));
  out.push(utensilio(3.85, `<rect x="-5" y="21" width="10" height="11" rx="2" fill="${C.acero}" ${trazo(1.4)}/>`));
  out.push(utensilio(4.3, `<path d="M-4 22 Q-6 34 0 35 Q6 34 4 22" fill="none" ${trazo(1.4)}/><path d="M-1.5 22 Q-2 33 0 35 Q2 33 1.5 22" fill="none" stroke="${T}" stroke-width="1"/>`));
  out.push(utensilio(4.7, `<path d="M-6 26 a6 6 0 0 0 12 0 Z" fill="${C.acero}" ${trazo(1.4)}/>`));

  // cuadro sobre la mesa: 福
  {
    const uc = 6.65, zc = 4.2, r = 0.62; // corrido a la izquierda: la hoja abierta de la ventana no lo tapa
    out.push(cara([[uc, 0.006, zc + r * 1.1], [uc + r, 0.006, zc], [uc, 0.006, zc - r * 1.1], [uc - r, 0.006, zc]], C.rojo, 2));
    out.push(cara([[uc, 0.007, zc + r * 0.9], [uc + r * 0.82, 0.007, zc], [uc, 0.007, zc - r * 0.9], [uc - r * 0.82, 0.007, zc]], "none", 1.2, `stroke="${C.oro}"`));
    const p = proyectar(uc, 0.008, zc);
    out.push(`<text x="0" y="0" font-family="'Noto Serif SC','Songti SC','SimSun',serif" font-size="30" font-weight="700" fill="${C.oro}" text-anchor="middle" dominant-baseline="central" transform="matrix(1 0.5 0 1 ${f(p.x)} ${f(p.y)})">福</text>`);
    // borla
    out.push(linea([uc, 0.006, zc - r * 1.1], [uc, 0.006, zc - r * 1.1 - 0.45], C.rojo, 2));
    const q = proyectar(uc, 0.006, zc - r * 1.1 - 0.45);
    out.push(`<path d="M${f(q.x - 4)} ${f(q.y + 12)} L${f(q.x)} ${f(q.y)} L${f(q.x + 4)} ${f(q.y + 12)} Z" fill="${C.rojo}" ${trazo(1.2)}/>`);
  }
  // (a la derecha del 福 iba un par de cuadros: ahora ahí está la ventana 窗户, que es un objeto aparte)

  parte("sombras");
  // ---- sombras en el piso ----
  const sombra = "rgba(110,70,35,0.14)";
  out.push(rectZ(0, 1.7, 2.05, 1.7, 5.5, sombra, 0));
  out.push(rectZ(0, 1.7, 5.2, 1.7, 2.0, sombra, 0));
  out.push(rectZ(0, 1.9, 2.25, 6.1, 8.5, sombra, 0));
  out.push(rectZ(0, 5.6, 9.8, 1.6, 1.95, "rgba(110,70,35,0.10)", 0));

  parte("meson_izq");
  // ---- mesón izquierdo (lavaplatos) ----
  {
    const m = MUEBLES.mesonIzq;
    out.push(caja(0, 1.45, m.v0, m.v1 - 0.05, 0, 0.18, { a: C.negro, i: "#7D6A5C", d: "#6A584B" }, 1.6));
    out.push(caja(0, 1.6, m.v0, m.v1 - 0.05, 0.18, 2.0, C.salvia));
    // puertas y cajones en la cara derecha (u = 1.6)
    const puertas: [number, number][] = [[1.8, 3.1], [3.15, 4.3], [4.35, 5.4]];
    for (const [a, b] of puertas) {
      out.push(rectU(1.601, a, b, 0.32, 1.55, C.salvia.a, 1.4));
      out.push(rectU(1.602, a + 0.12, b - 0.12, 0.45, 1.42, C.salvia.d, 1.2));
      out.push(rectU(1.601, a, b, 1.62, 1.92, C.salvia.a, 1.4));
      const h = proyectar(1.61, (a + b) / 2, 1.77);
      out.push(`<rect x="${f(h.x - 6)}" y="${f(h.y - 1.5)}" width="12" height="3" rx="1.5" fill="${C.oro}" ${trazo(1)} transform="rotate(-26.57 ${f(h.x)} ${f(h.y)})"/>`);
      const k2 = proyectar(1.61, a + 0.2, 1.0);
      out.push(`<circle cx="${f(k2.x)}" cy="${f(k2.y)}" r="2.6" fill="${C.oro}" ${trazo(1)}/>`);
    }
    out.push(caja(0, 1.78, m.v0, m.v1 + 0.05, 2.0, 2.2, C.meson));
    // lavaplatos
    const lv = MUEBLES.lavaplatos;
    out.push(rectZ(2.2, lv.u0, lv.u1, lv.v0, lv.v1, C.aceroOsc, 1.8));
    out.push(cara([[lv.u0 + 0.08, lv.v0 + 0.08, 2.2], [lv.u1 - 0.08, lv.v0 + 0.08, 2.2], [lv.u1 - 0.08, lv.v1 - 0.08, 2.2], [lv.u0 + 0.08, lv.v1 - 0.08, 2.2]], C.acero, 1.2));
    out.push(cara([[lv.u0 + 0.08, lv.v0 + 0.08, 2.2], [lv.u1 - 0.08, lv.v0 + 0.08, 2.2], [lv.u1 - 0.08, lv.v0 + 0.08, 2.0], [lv.u0 + 0.08, lv.v0 + 0.08, 2.0]], C.aceroOsc, 0));
    out.push(circulo((lv.u0 + lv.u1) / 2, (lv.v0 + lv.v1) / 2, 2.2, 0.08, C.aceroOsc, 1.2));
    // llave (cuello de ganso)
    const b = proyectar(0.2, 3.0, 2.2), a1 = proyectar(0.2, 3.0, 3.35), a2 = proyectar(0.75, 3.0, 3.35), e = proyectar(0.75, 3.0, 3.05);
    const d = `M${f(b.x)} ${f(b.y)} L${f(a1.x)} ${f(a1.y)} Q${f((a1.x + a2.x) / 2)} ${f(a1.y - 14)} ${f(a2.x)} ${f(a2.y)} L${f(e.x)} ${f(e.y)}`;
    out.push(`<path d="${d}" fill="none" stroke="${T}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`);
    out.push(`<path d="${d}" fill="none" stroke="${C.acero}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`);
    out.push(cilindro(b.x, b.y, 6, 4, C.aceroOsc, C.acero, 1.4));
    const mango = proyectar(0.2, 3.35, 2.2);
    out.push(cilindro(mango.x, mango.y, 3.5, 9, C.acero, C.acero, 1.2));
    // tabla de picar bajo la manzana
    out.push(caja(0.35, 1.45, 4.1, 5.3, 2.2, 2.26, C.madera, 1.6));
    out.push(circulo(0.6, 5.12, 2.26, 0.06, C.madera.d, 1));
    // tostadora en la esquina
    out.push(caja(0.35, 1.15, 0.45, 1.5, 2.2, 2.85, { a: "#EAF1E2", i: "#D7E4CB", d: "#C1D3B2" }));
    out.push(rectZ(2.851, 0.55, 0.95, 0.65, 0.85, C.negroOsc, 1.2));
    out.push(rectZ(2.851, 0.55, 0.95, 1.05, 1.25, C.negroOsc, 1.2));
    out.push(caja(0.6, 0.9, 0.68, 0.82, 2.85, 3.05, { a: "#F3D6A2", i: "#E8C185", d: "#D5A966" }, 1.4));
    const pal = proyectar(1.151, 1.2, 2.6);
    out.push(`<rect x="${f(pal.x - 2)}" y="${f(pal.y - 4)}" width="4" height="9" rx="2" fill="${C.negro}" ${trazo(1)}/>`);
  }

  parte("meson_der");
  // ---- mesón derecho (cocina) ----
  {
    const m = MUEBLES.mesonDer;
    out.push(caja(m.u0, m.u1 - 0.05, 0, 1.45, 0, 0.18, { a: C.negro, i: "#7D6A5C", d: "#6A584B" }, 1.6));
    out.push(caja(m.u0, m.u1 - 0.05, 0, 1.6, 0.18, 2.0, C.salvia));
    // horno
    out.push(rectV(1.601, 2.4, 4.05, 0.3, 1.58, C.negro, 1.8));
    const [gH, uH] = degradado("#3A3431", "#6B4A2E", true);
    defs.push(gH);
    out.push(rectV(1.602, 2.6, 3.85, 0.5, 1.25, uH, 1.4));
    out.push(linea([2.75, 1.603, 1.15], [3.0, 1.603, 0.7], "#ffffff", 1.6, 'opacity="0.35"'));
    out.push(linea([2.6, 1.61, 1.42], [3.85, 1.61, 1.42], C.acero, 3));
    out.push(rectV(1.601, 2.4, 4.05, 1.62, 1.95, C.salvia.a, 1.4));
    for (const u of [2.7, 3.05, 3.4, 3.75]) {
      const p = proyectar(u, 1.61, 1.78);
      out.push(`<circle cx="${f(p.x)}" cy="${f(p.y)}" r="3.4" fill="${C.crema}" ${trazo(1.2)}/>`);
    }
    // otras puertas
    for (const [a, b] of [[1.75, 2.35], [4.1, 5.1]] as [number, number][]) {
      out.push(rectV(1.601, a, b, 0.32, 1.55, C.salvia.a, 1.4));
      out.push(rectV(1.602, a + 0.1, b - 0.1, 0.45, 1.42, C.salvia.i, 1.2));
      out.push(rectV(1.601, a, b, 1.62, 1.92, C.salvia.a, 1.4));
      const h = proyectar((a + b) / 2, 1.61, 1.77);
      out.push(`<rect x="${f(h.x - 6)}" y="${f(h.y - 1.5)}" width="12" height="3" rx="1.5" fill="${C.oro}" ${trazo(1)} transform="rotate(26.57 ${f(h.x)} ${f(h.y)})"/>`);
    }
    out.push(caja(m.u0, m.u1 + 0.05, 0, 1.78, 2.0, 2.2, C.meson));
    // placa
    const pl = MUEBLES.placa;
    out.push(rectZ(2.2, pl.u0, pl.u1, pl.v0, pl.v1, C.negro, 1.8));
    for (const u of [2.8, 3.6]) {
      out.push(circulo(u, 0.85, 2.2, 0.36, C.negroOsc, 1.4));
      out.push(circulo(u, 0.85, 2.2, 0.22, "none", 1.2, `stroke="#6A625E"`));
    }
    // frasco de utensilios en la esquina
    const p = proyectar(2.0, 0.45, 2.2);
    for (const [dx, h, col] of [[-3, 30, C.madera.i], [2, 34, C.madera.d], [5, 27, C.acero]] as const)
      out.push(`<path d="M${f(p.x + dx)} ${f(p.y - 8)} L${f(p.x + dx * 1.8)} ${f(p.y - h)}" stroke="${T}" stroke-width="4.4" stroke-linecap="round"/><path d="M${f(p.x + dx)} ${f(p.y - 8)} L${f(p.x + dx * 1.8)} ${f(p.y - h)}" stroke="${col}" stroke-width="2.4" stroke-linecap="round"/>`);
    out.push(cilindro(p.x, p.y, 8, 16, C.terracota, C.terracotaOsc, 1.6));
  }

  parte("mesa");
  // ---- mesa de comer y pisos ----
  {
    const m = MUEBLES.mesa;
    const pata = (u: number, v: number) => caja(u, u + 0.16, v, v + 0.16, 0, m.alto - 0.15, C.madera, 1.5);
    out.push(pata(m.u0 + 0.1, m.v0 + 0.05), pata(m.u1 - 0.26, m.v0 + 0.05));
    out.push(pata(m.u0 + 0.1, m.v1 - 0.21), pata(m.u1 - 0.26, m.v1 - 0.21));
    out.push(caja(m.u0, m.u1, m.v0, m.v1, m.alto - 0.15, m.alto, C.madera));
    // camino de mesa
    out.push(rectZ(m.alto + 0.001, m.u0 + 0.25, m.u1 - 0.25, 0.65, 1.15, "#F6EEDC", 1.2));
    out.push(linea([m.u0 + 0.25, 0.75, m.alto], [m.u1 - 0.25, 0.75, m.alto], C.terracota, 1.2));
    out.push(linea([m.u0 + 0.25, 1.05, m.alto], [m.u1 - 0.25, 1.05, m.alto], C.terracota, 1.2));
    // pisos (taburetes)
    for (const u of [6.8, 8.7]) {
      const v = 2.0, zs = 1.25;
      for (const [du, dv] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) out.push(linea([u + du, v + dv, 0], [u + du * 0.7, v + dv * 0.7, zs], T, 4.4), linea([u + du, v + dv, 0], [u + du * 0.7, v + dv * 0.7, zs], C.madera.d, 2.4));
      out.push(linea([u - 0.2, v + 0.2, 0.5], [u + 0.2, v + 0.2, 0.5], C.madera.d, 2));
      const p = proyectar(u, v, zs);
      out.push(cilindro(p.x, p.y + 5, 21, 5, C.madera.d, C.madera.a, 1.6));
      out.push(`<ellipse cx="${f(p.x)}" cy="${f(p.y - 2)}" rx="17" ry="8.5" fill="#A9C995" ${trazo(1.4)}/>`);
      out.push(`<ellipse cx="${f(p.x - 3)}" cy="${f(p.y - 4)}" rx="7" ry="3" fill="#C5DCB4" stroke="none"/>`);
    }
  }

  parte("planta");
  // ---- planta alta en el rincón delantero izquierdo ----
  {
    const p = proyectar(0.45, 9.45, 0);
    out.push(cilindro(p.x, p.y, 14, 52, "#F6EAD6", "#E9D8BE", 1.8));
    out.push(`<path d="M${f(p.x - 14)} ${f(p.y - 52)} q-2 -10 6 -14 h16 q8 4 6 14" fill="#F6EAD6" ${trazo(1.8)}/>`);
    const ramas = [[-22, -150], [-4, -175], [14, -138], [-34, -112]];
    for (const [dx, dy] of ramas) out.push(`<path d="M${f(p.x)} ${f(p.y - 60)} Q${f(p.x + dx * 0.4)} ${f(p.y + dy * 0.6)} ${f(p.x + dx)} ${f(p.y + dy)}" fill="none" stroke="#7A5A3E" stroke-width="2.4" stroke-linecap="round"/>`);
    const hojas: [number, number, number][] = [[-22, -150, -30], [-4, -175, 10], [14, -138, 40], [-34, -112, -60], [-12, -128, -20], [-28, -132, 20], [4, -158, -40], [10, -118, 60], [-18, -96, 30]];
    for (const [dx, dy, r] of hojas)
      out.push(`<path d="M0 0 q7 -10 0 -20 q-7 10 0 20z" fill="${C.hoja}" ${trazo(1.3)} transform="translate(${f(p.x + dx)} ${f(p.y + dy)}) rotate(${r})"/>`);
  }

  archivo("cuarto_cocina", [0, 0, 1000, 1000], 2000, defs, out.join(""));

  // las mismas piezas, cada parte en su archivo (no las usa el juego: son las capas de Krita)
  mkdirSync(PARTES, { recursive: true });
  partes.forEach(([nombre, desde], i) => {
    const hasta = i + 1 < partes.length ? partes[i + 1][1] : out.length;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="2000" viewBox="0 0 1000 1000"><defs>${defs.join("")}</defs>${out.slice(desde, hasta).join("")}</svg>
`;
    writeFileSync(join(PARTES, `cuarto_cocina__${String(i + 1).padStart(2, "0")}_${nombre}.svg`), svg);
  });
  console.log("✓", `${partes.length} partes del cuarto en arte-krita/fuentes/`);
}

// =====================================================================================
// OBJETOS: cada capa en un archivo con el cuadro del objeto en coordenadas del cuarto
// =====================================================================================
function vistaDe(id: ObjetoId): [number, number, number, number] {
  const o = OBJETOS[id];
  return [o.x - o.w / 2, o.y - o.w / 2, o.w, o.w];
}
/** Dibuja en px relativos al punto de apoyo del objeto. */
function enApoyo(id: ObjetoId, s: string): string {
  const a = OBJETOS[id].apoyo;
  return `<g transform="translate(${f(a.x)} ${f(a.y)})">${s}</g>`;
}
function capas(id: ObjetoId, lista: Record<string, { defs?: string[]; cuerpo: string }>) {
  for (const [nombre, c] of Object.entries(lista)) archivo(`${id}_${nombre}`, vistaDe(id), 1024, c.defs ?? [], enApoyo(id, c.cuerpo));
}
const sombraObj = (rx: number) => `<ellipse cx="0" cy="0" rx="${rx}" ry="${rx / 2.6}" fill="rgba(90,55,30,0.18)"/>`;

function manzana() {
  const [g, u] = degradado("#F06A57", "#C23F35");
  const cuerpo = `M0 -24 C-6 -29 -16 -27 -16 -15 C-16 -5 -8 1 -3 0 Q0 -1 3 0 C8 1 16 -5 16 -15 C16 -27 6 -29 0 -24 Z`;
  const entera = `${sombraObj(15)}<path d="${cuerpo}" fill="${u}" ${trazo(1.8)}/><ellipse cx="-8" cy="-18" rx="3" ry="4.5" fill="#fff" opacity="0.75"/><path d="M0 -24 Q1 -30 3 -33" fill="none" ${trazo(2)}/><path d="M2 -30 Q9 -35 13 -30 Q7 -26 2 -30 Z" fill="${C.hoja}" ${trazo(1.4)}/>`;
  const mugre = `<g fill="#9C7A4E" opacity="0.85"><ellipse cx="-7" cy="-10" rx="3.5" ry="2.5"/><ellipse cx="6" cy="-6" rx="3" ry="2"/><ellipse cx="8" cy="-17" rx="2.5" ry="2"/><ellipse cx="-2" cy="-4" rx="2" ry="1.5"/><circle cx="-11" cy="-15" r="1.4"/></g>`;
  const mitad = (lado: -1 | 1) => {
    const x = lado * 9;
    return `<g transform="translate(${x} 0) scale(${lado} 1)">${sombraObj(10)}<path d="M-12 -4 Q-13 -14 -2 -16 L10 -10 Q12 0 2 2 Q-8 2 -12 -4 Z" fill="${u}" ${trazo(1.6)}/><ellipse cx="0" cy="-8" rx="9.5" ry="6.5" fill="#FBEFD4" ${trazo(1.4)} transform="rotate(-20 0 -8)"/><path d="M0 -12 q-3 4 0 8 q3 -4 0 -8" fill="#F3DDB0" stroke="none"/><ellipse cx="-1.5" cy="-8" rx="1.2" ry="2" fill="${T}"/><ellipse cx="2" cy="-7" rx="1.2" ry="2" fill="${T}"/></g>`;
  };
  capas("pingguo", {
    entera: { defs: [g], cuerpo: entera },
    mugre: { cuerpo: mugre },
    mitad_izq: { defs: [g], cuerpo: mitad(-1) },
    mitad_der: { defs: [g], cuerpo: mitad(1) },
  });
}

function vaso() {
  const rx = 11, h = 30;
  const liquido = (c1: string, c2: string, alto: number) => {
    const ry = rx / 2;
    const r2 = rx - 1.6;
    return `<path d="M${-r2} ${-alto} L${-r2} -2 A${r2} ${r2 / 2} 0 0 0 ${r2} -2 L${r2} ${-alto} Z" fill="${c1}" stroke="none"/><ellipse cx="0" cy="${-alto}" rx="${r2}" ry="${ry - 0.8}" fill="${c2}" stroke="none"/>`;
  };
  const vidrio = `${sombraObj(13)}<path d="M${-rx} ${-h} L${-rx + 1} -1 A${rx - 1} ${(rx - 1) / 2} 0 0 0 ${rx - 1} -1 L${rx} ${-h}" fill="rgba(220,240,248,0.35)" ${trazo(1.8)}/><ellipse cx="0" cy="${-h}" rx="${rx}" ry="${rx / 2}" fill="rgba(240,250,253,0.4)" ${trazo(1.6)}/><path d="M-6 ${-h + 6} L-5 -5" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity="0.9"/><path d="M${-rx + 1.5} -3 A${rx - 2.5} ${(rx - 2.5) / 2} 0 0 0 ${rx - 1.5} -3" fill="none" stroke="${T}" stroke-width="1" opacity="0.5"/>`;
  capas("beizi", {
    agua: { cuerpo: liquido("rgba(127,195,232,0.85)", "#A9DBF2", 20) },
    te: { cuerpo: liquido("rgba(201,142,58,0.9)", "#DDB06A", 20) },
    vaso: { cuerpo: vidrio },
    mugre: { cuerpo: `${liquido("rgba(176,150,100,0.55)", "rgba(196,170,120,0.7)", 5)}<g fill="#9C7A4E" opacity="0.7"><circle cx="-4" cy="-12" r="1.4"/><circle cx="5" cy="-17" r="1.1"/><circle cx="2" cy="-9" r="1"/></g>` },
  });
}

function bol() {
  const R = 23, top = -19;
  const [g, u] = degradado("#FFFFFF", "#E5E0D4");
  const bol = `${sombraObj(17)}<path d="M${-R} ${top} Q${-R + 2} -3 -8 -1 L-8 1 A8 4 0 0 0 8 1 L8 -1 Q${R - 2} -3 ${R} ${top} Z" fill="${u}" ${trazo(1.8)}/><path d="M${-R + 3} ${top + 6} Q0 ${top + 14} ${R - 3} ${top + 6}" fill="none" stroke="#4C7FC9" stroke-width="2.2"/><path d="M-14 ${top + 11} q4 -4 8 0 t8 0 t8 0" fill="none" stroke="#4C7FC9" stroke-width="1.5"/><ellipse cx="0" cy="${top}" rx="${R}" ry="${R / 2}" fill="#F4F0E8" ${trazo(1.8)}/><ellipse cx="0" cy="${top + 1.5}" rx="${R - 3}" ry="${(R - 3) / 2}" fill="#E7E1D5" stroke="none"/>`;
  const arroz = `<path d="M${-R + 3} ${top} Q${-R + 6} ${top - 13} 0 ${top - 14} Q${R - 6} ${top - 13} ${R - 3} ${top} Q0 ${top + 9} ${-R + 3} ${top} Z" fill="#FFFDF6" ${trazo(1.6)}/>${[[-9, -6], [-3, -10], [4, -7], [10, -4], [-12, -2], [2, -2], [7, -11], [-6, -1]].map(([x, y]) => `<ellipse cx="${x}" cy="${top + y}" rx="1.8" ry="1" fill="none" stroke="#D9CDB4" stroke-width="1"/>`).join("")}`;
  const mugre = `<ellipse cx="0" cy="${top + 2}" rx="${R - 6}" ry="${(R - 6) / 2.3}" fill="rgba(170,135,85,0.45)"/>${[[-8, 1], [5, 3], [10, -1], [-2, 5]].map(([x, y]) => `<ellipse cx="${x}" cy="${top + y}" rx="1.8" ry="1" fill="#FFFDF6" stroke="${T}" stroke-width="0.6"/>`).join("")}`;
  capas("wan", { bol: { defs: [g], cuerpo: bol }, arroz: { cuerpo: arroz }, mugre: { cuerpo: mugre } });
}

function plato() {
  const plato = `${sombraObj(27)}<ellipse cx="0" cy="-2" rx="31" ry="15" fill="#E7E3DA" ${trazo(1.8)}/><ellipse cx="0" cy="-5" rx="31" ry="15" fill="#FFFFFF" ${trazo(1.8)}/><ellipse cx="0" cy="-5" rx="27" ry="12.8" fill="none" stroke="#7DA5D8" stroke-width="1.6"/><ellipse cx="0" cy="-4" rx="19" ry="8.6" fill="#F3F1EC" stroke="#E2DED4" stroke-width="1"/>`;
  const jiaozi = (x: number, y: number, r: number) =>
    `<g transform="translate(${x} ${y}) rotate(${r})"><path d="M-11 2 Q-12 -9 0 -10 Q12 -9 11 2 Q0 6 -11 2 Z" fill="#F8EEDA" ${trazo(1.4)}/><path d="M-7 -6 q1 3 0 5 M-3 -8 q1 3 0 6 M1 -8 q1 3 0 6 M5 -7 q1 3 0 5" fill="none" stroke="#D8C29A" stroke-width="1.1"/><path d="M-10 1 Q0 4 10 1" fill="none" stroke="#E5D2AE" stroke-width="1.4"/></g>`;
  const relleno = [jiaozi(-9, -7, -12), jiaozi(8, -9, 10), jiaozi(-1, -1, 4), jiaozi(13, -1, 24)].join("");
  const mugre = `<path d="M-14 -6 q6 -5 14 -2 q8 3 4 6 q-8 3 -16 1 q-5 -2 -2 -5z" fill="rgba(150,85,45,0.55)"/><g fill="#C9A672"><circle cx="9" cy="-8" r="1.5"/><circle cx="12" cy="-3" r="1.1"/><circle cx="-4" cy="-10" r="1.2"/></g>`;
  capas("panzi", { plato: { cuerpo: plato }, jiaozi: { cuerpo: relleno }, mugre: { cuerpo: mugre } });
}

function palillos() {
  const dir = [0.894, 0.447], per = [-0.447, 0.894];
  const palo = (o: number) => {
    const cx = per[0] * o, cy = per[1] * o - 6;
    const a = [cx - dir[0] * 24, cy - dir[1] * 24], b = [cx + dir[0] * 24, cy + dir[1] * 24];
    const m = [cx - dir[0] * 13, cy - dir[1] * 13];
    return `<path d="M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])}" stroke="${T}" stroke-width="5.6" stroke-linecap="round"/><path d="M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])}" stroke="#D59A5E" stroke-width="3.4" stroke-linecap="round"/><path d="M${f(a[0])} ${f(a[1])} L${f(m[0])} ${f(m[1])}" stroke="${C.rojo}" stroke-width="3.4" stroke-linecap="round"/>`;
  };
  const apoyo = `<path d="M-19 -10 l7 -3 l7 3 l-7 4 z" fill="#A9C995" ${trazo(1.2)}/><path d="M-19 -10 l0 3 l7 4 l0 -3 z" fill="#8DAE7B" ${trazo(1.2)}/>`;
  capas("kuaizi", { palillos: { cuerpo: `<ellipse cx="0" cy="0" rx="24" ry="7" fill="rgba(90,55,30,0.14)"/>${apoyo}${palo(-2.5)}${palo(3)}` } });
}

function tetera() {
  const [g, u] = degradado("#B9DDCD", "#7FAF9C");
  const cuerpo = `${sombraObj(20)}<path d="M-25 -16 Q-33 -16 -32 -24 Q-31 -31 -19 -27" fill="none" stroke="${T}" stroke-width="5.4" stroke-linecap="round"/><path d="M-25 -16 Q-33 -16 -32 -24 Q-31 -31 -19 -27" fill="none" stroke="#8DBFAC" stroke-width="3" stroke-linecap="round"/><path d="M15 -14 Q22 -16 25 -26 L29 -26 Q27 -12 17 -7 Z" fill="#9CCAB8" ${trazo(1.6)}/><path d="M-18 -3 Q-24 -16 -16 -26 Q0 -34 16 -26 Q24 -16 18 -3 Q0 3 -18 -3 Z" fill="${u}" ${trazo(1.8)}/><path d="M-19 -14 Q0 -8 19 -14" fill="none" stroke="#FFF8EC" stroke-width="2"/><path d="M-14 -11 q3 -3 6 0 t6 0 t6 0 t6 0" fill="none" stroke="#E0896A" stroke-width="1.4"/><ellipse cx="0" cy="-27" rx="11" ry="4.6" fill="#A9D3C2" ${trazo(1.6)}/><ellipse cx="0" cy="-32" rx="4" ry="3.4" fill="#E0896A" ${trazo(1.4)}/><ellipse cx="-9" cy="-20" rx="3" ry="4.5" fill="#fff" opacity="0.6"/><ellipse cx="0" cy="-1" rx="12" ry="3.5" fill="none" stroke="${T}" stroke-width="1.2" opacity="0.5"/>`;
  capas("chahu", { tetera: { defs: [g], cuerpo } });
}

function olla() {
  const R = 29, h = 21;
  const [g, u] = degradado("#7FA898", "#4F7668");
  const olla = `${sombraObj(30)}<path d="M${-R - 7} ${-h + 3} q-4 0 -4 4 q0 4 5 3 L${-R} ${-h + 7}" fill="#5C8576" ${trazo(1.6)}/><path d="M${R + 7} ${-h + 3} q4 0 4 4 q0 4 -5 3 L${R} ${-h + 7}" fill="#4F7668" ${trazo(1.6)}/><path d="M${-R} ${-h} L${-R + 1} -3 A${R - 1} ${(R - 1) / 2} 0 0 0 ${R - 1} -3 L${R} ${-h} Z" fill="${u}" ${trazo(1.8)}/><path d="M${-R + 1} ${-h + 7} A${R - 1} ${(R - 1) / 2} 0 0 0 ${R - 1} ${-h + 7}" fill="none" stroke="#3F5F54" stroke-width="1.4"/><ellipse cx="0" cy="${-h}" rx="${R}" ry="${R / 2}" fill="#9CC0B1" ${trazo(1.8)}/><ellipse cx="0" cy="${-h + 1}" rx="${R - 3.5}" ry="${(R - 3.5) / 2}" fill="#33443E" stroke="none"/><ellipse cx="-17" cy="${-h + 9}" rx="3" ry="5" fill="#fff" opacity="0.35"/>`;
  const arroz = `<path d="M${-R + 4} ${-h + 1} Q${-R + 8} ${-h - 12} 0 ${-h - 13} Q${R - 8} ${-h - 12} ${R - 4} ${-h + 1} Q0 ${-h + 13} ${-R + 4} ${-h + 1} Z" fill="#FFFDF6" ${trazo(1.6)}/>${[[-12, -4], [-4, -8], [5, -6], [13, -3], [-8, 2], [3, 1], [9, -9]].map(([x, y]) => `<ellipse cx="${x}" cy="${-h + y}" rx="2" ry="1.1" fill="none" stroke="#D9CDB4" stroke-width="1"/>`).join("")}`;
  const mugre = `<ellipse cx="0" cy="${-h + 2}" rx="${R - 7}" ry="${(R - 7) / 2.3}" fill="rgba(170,120,70,0.6)"/><path d="M-10 ${-h + 6} q2 6 0 9 M8 ${-h + 7} q2 5 0 7" fill="none" stroke="rgba(150,100,55,0.8)" stroke-width="2.4" stroke-linecap="round"/>`;
  capas("guo", { olla: { defs: [g], cuerpo: olla }, arroz: { cuerpo: arroz }, mugre: { cuerpo: mugre } });
}

/** Refri: dibujado a escala del cuarto, con las coordenadas de MUEBLES.refri. La puerta gira sobre su borde del fondo. */
function refri() {
  const r = MUEBLES.refri;
  const v = (a: number, b: number) => [a, b] as const;
  const col = { a: "#D3E5C4", i: "#BBD5A8", d: "#A6C594" };
  const vb = vistaDe("bingxiang");
  const cuerpo =
    caja(r.u0 + 0.1, r.u1 - 0.1, r.v0 + 0.1, r.v1 - 0.1, 0, 0.12, { a: C.negro, i: C.negroOsc, d: C.negroOsc }, 1.4) +
    caja(r.u0, r.u1, r.v0, r.v1, 0.12, r.alto, col) +
    // hueco interior (se ve cuando la puerta se abre)
    rectU(r.u1 + 0.001, r.v0 + 0.12, r.v1 - 0.12, 0.3, r.alto - 0.15, "#7E9C6E", 1.6) +
    // adornos encima: cesta
    caja(r.u0 + 0.4, r.u1 - 0.5, r.v0 + 0.5, r.v0 + 1.4, r.alto, r.alto + 0.35, { a: "#E8C796", i: "#D9AE73", d: "#C49660" }, 1.6);
  const [vi0, vi1, zi0, zi1] = [r.v0 + 0.22, r.v1 - 0.22, 0.4, r.alto - 0.25];
  const uI = r.u1 + 0.002;
  const repisas = [1.45, 2.55, 3.65];
  const cosas: string[] = [];
  cosas.push(rectU(uI, vi0, vi1, zi0, zi1, "#F6F9F2", 1.4));
  cosas.push(rectU(uI, vi0, vi1, zi1 - 0.25, zi1, "#FFFBE6", 0));
  for (const z of repisas) cosas.push(linea([uI, vi0, z], [uI, vi1, z], "#C9D6C0", 2.6));
  // botellas, huevos, leche, verduras, queso — planos sobre la cara del refri
  const enCara = (vv: number, z: number) => proyectar(uI, vv, z);
  const bot = (vv: number, color: string) => {
    const p = enCara(vv, repisas[2]);
    return `<path d="M${f(p.x - 5)} ${f(p.y)} L${f(p.x - 5)} ${f(p.y - 26)} Q${f(p.x)} ${f(p.y - 36)} ${f(p.x + 5)} ${f(p.y - 26)} L${f(p.x + 5)} ${f(p.y)} Z" fill="${color}" ${trazo(1.4)} transform="translate(${f(p.x)} ${f(p.y)}) skewY(-26.57) translate(${f(-(p.x))} ${f(-(p.y))})"/>`;
  };
  cosas.push(bot(6.65, "#8FC1DE"), bot(6.95, "#E7A25C"), bot(7.25, "#F4F0E2"));
  {
    const p = enCara(7.85, repisas[2]);
    cosas.push(`<g transform="translate(${f(p.x)} ${f(p.y)}) skewY(-26.57)"><rect x="-9" y="-20" width="18" height="20" fill="#FFFFFF" ${trazo(1.4)}/><path d="M-9 -20 L0 -27 L9 -20" fill="#E9F2FA" ${trazo(1.4)}/><rect x="-6" y="-14" width="12" height="7" fill="#7DA5D8" stroke="none"/></g>`);
  }
  for (const vv of [6.7, 6.95, 7.2, 7.45]) {
    const p = enCara(vv, repisas[1]);
    cosas.push(`<ellipse cx="${f(p.x)}" cy="${f(p.y - 6)}" rx="5" ry="6.5" fill="#FBF3E3" ${trazo(1.2)}/>`);
  }
  {
    const p = enCara(7.95, repisas[1]);
    cosas.push(`<path d="M${f(p.x - 14)} ${f(p.y)} Q${f(p.x - 16)} ${f(p.y - 20)} ${f(p.x)} ${f(p.y - 22)} Q${f(p.x + 16)} ${f(p.y - 20)} ${f(p.x + 14)} ${f(p.y)} Z" fill="${C.hoja}" ${trazo(1.4)}/><path d="M${f(p.x)} ${f(p.y - 2)} L${f(p.x)} ${f(p.y - 18)} M${f(p.x)} ${f(p.y - 8)} l-7 -5 M${f(p.x)} ${f(p.y - 12)} l7 -5" fill="none" stroke="${C.hojaOsc}" stroke-width="1.4"/>`);
  }
  {
    const p = enCara(6.9, repisas[0]);
    cosas.push(`<g transform="translate(${f(p.x)} ${f(p.y)}) skewY(-26.57)"><path d="M-14 0 L14 0 L14 -12 L-14 -4 Z" fill="${C.mostaza}" ${trazo(1.4)}/><circle cx="-4" cy="-4" r="2" fill="#E5A93A"/><circle cx="6" cy="-6" r="1.6" fill="#E5A93A"/></g>`);
    const q = enCara(7.7, repisas[0]);
    cosas.push(`<circle cx="${f(q.x - 8)}" cy="${f(q.y - 8)}" r="8" fill="${C.rojo}" ${trazo(1.4)}/><circle cx="${f(q.x + 8)}" cy="${f(q.y - 9)}" r="8" fill="#F28C5A" ${trazo(1.4)}/>`);
  }
  {
    const p = enCara(7.3, 0.4);
    cosas.push(`<g transform="translate(${f(p.x)} ${f(p.y)}) skewY(-26.57)"><rect x="-28" y="-22" width="56" height="22" rx="3" fill="rgba(220,236,240,0.7)" ${trazo(1.4)}/><circle cx="-14" cy="-9" r="6" fill="#F28C5A" ${trazo(1)}/><circle cx="0" cy="-10" r="6" fill="#8DB36F" ${trazo(1)}/><circle cx="14" cy="-9" r="6" fill="#E8584A" ${trazo(1)}/></g>`);
  }
  // puerta: placa delgada delante de la cara del refri; bisagra en v0 (el borde de atrás)
  const [pv0, pv1] = v(r.v0 + 0.08, r.v1 - 0.06);
  const uP0 = r.u1, uP1 = r.u1 + 0.1;
  const puerta =
    caja(uP0, uP1, pv0, pv1, 0.2, r.alto - 0.08, col, 2) +
    rectU(uP1 + 0.001, pv0 + 0.15, pv1 - 0.15, 0.45, r.alto - 0.35, "#ADCB9A", 1.3) +
    rectU(uP1 + 0.002, pv0 + 0.25, pv1 - 0.25, 0.55, r.alto - 0.45, col.d, 0) +
    // manilla vertical cerca del borde libre (v1)
    (() => {
      const a = proyectar(uP1 + 0.02, pv1 - 0.32, 2.2), b = proyectar(uP1 + 0.02, pv1 - 0.32, 3.4);
      return `<path d="M${f(a.x)} ${f(a.y)} L${f(b.x)} ${f(b.y)}" stroke="${T}" stroke-width="7" stroke-linecap="round"/><path d="M${f(a.x)} ${f(a.y)} L${f(b.x)} ${f(b.y)}" stroke="${C.oro}" stroke-width="4.4" stroke-linecap="round"/>`;
    })() +
    // nota con imán y un dibujito de la vaca
    (() => {
      const p = proyectar(uP1 + 0.003, (pv0 + pv1) / 2 - 0.2, 3.9);
      return `<g transform="translate(${f(p.x)} ${f(p.y)}) skewY(-26.57)"><rect x="-13" y="-15" width="26" height="30" fill="#FFFBEA" ${trazo(1.2)} transform="rotate(-6)"/><circle cx="0" cy="-15" r="3.6" fill="${C.rojo}" ${trazo(1)}/><ellipse cx="0" cy="3" rx="8" ry="6.5" fill="#fff" ${trazo(1.1)}/><ellipse cx="-3" cy="2" rx="2.4" ry="2" fill="${T}"/><ellipse cx="0" cy="7" rx="4.2" ry="2.4" fill="#F4B6B0" ${trazo(0.8)}/></g>`;
    })() +
    (() => {
      const p = proyectar(uP1 + 0.003, pv0 + 0.55, 1.4);
      return `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="4.5" fill="${C.mostaza}" ${trazo(1.1)}/>`;
    })();

  for (const [nombre, cuerpo2] of [["cuerpo", cuerpo], ["interior", cosas.join("")], ["puerta", puerta]] as const)
    archivo(`bingxiang_${nombre}`, vb, 1024, [], cuerpo2);

  // dónde queda la bisagra dentro del cuadro (para la animación de la puerta en Casa.module.css)
  const bisagra = proyectar(uP0, pv0, 0).x;
  console.log(`  bisagra de la puerta del refri: ${(((bisagra - vb[0]) / vb[2]) * 100).toFixed(1)}% del ancho del cuadro`);
}

// =====================================================================================
// OBJETOS NUEVOS (Entrega 2)
// =====================================================================================
/** Punto relativo al apoyo del objeto, en unidades del cuarto (du, dv, dz) → px. */
const iso = (du: number, dv: number, dz = 0) => ({ x: (du - dv) * ISO.A, y: ((du + dv) * ISO.A) / 2 - dz * ISO.Z });
const caraR = (pts: P3[], fill: string, g = 1.6, extra = "") =>
  `<path d="${camino(pts.map((p) => iso(...p)))}" fill="${fill}" ${conTrazo(g, extra)}/>`;
/** Segmento relativo al apoyo. */
const segR = (a: P3, b: P3, color: string, g: number, extra = "") => {
  const p = iso(...a), q = iso(...b);
  return `<path d="M${f(p.x)} ${f(p.y)} L${f(q.x)} ${f(q.y)}" stroke="${color}" stroke-width="${g}" stroke-linecap="round" fill="none" ${extra}/>`;
};
/** Caja relativa al apoyo (mismas tres caras que `caja`). */
const cajaR = (u0: number, u1: number, v0: number, v1: number, z0: number, z1: number, c: Colores, g = 1.4) =>
  caraR([[u0, v1, z0], [u1, v1, z0], [u1, v1, z1], [u0, v1, z1]], c.i, g) +
  caraR([[u1, v0, z0], [u1, v1, z0], [u1, v1, z1], [u1, v0, z1]], c.d, g) +
  caraR([[u0, v0, z1], [u1, v0, z1], [u1, v1, z1], [u0, v1, z1]], c.a, g);
const NARANJA = { a: "#F7A24E", i: "#E07B2A", d: "#C9651E" };

/** Trocitos de zanahoria (cubitos) sobre el arroz de la olla y del bol: se ven junto con la capa `arroz`. */
function zanahorias() {
  const cubito = ([x, y]: number[]) =>
    `<g transform="translate(${x} ${y})"><path d="M-3 0 L-3 2.6 L0 4.1 L0 1.5 Z" fill="${NARANJA.i}" ${trazo(0.8)}/><path d="M3 0 L3 2.6 L0 4.1 L0 1.5 Z" fill="${NARANJA.d}" ${trazo(0.8)}/><path d="M-3 0 L0 -1.5 L3 0 L0 1.5 Z" fill="${NARANJA.a}" ${trazo(0.8)}/></g>`;
  capas("guo", { zanahoria: { cuerpo: [[-13, -25], [-4, -30], [6, -27], [12, -23], [-4, -22], [10, -31]].map(cubito).join("") } });
  capas("wan", { zanahoria: { cuerpo: [[-10, -25], [-2, -30], [7, -26], [11, -22], [-1, -21]].map(cubito).join("") } });
}

/** 咖啡杯: taza blanca con asa y franja terracota; el café humea. */
function taza() {
  const rx = 10, h = 18;
  const [g, u] = degradado("#FFFFFF", "#E2DCCF");
  const asaD = `M${rx - 1} -14 Q${rx + 9} -15 ${rx + 8} -9 Q${rx + 7} -4 ${rx - 1} -5`;
  const asa = `<path d="${asaD}" fill="none" stroke="${T}" stroke-width="5" stroke-linecap="round"/><path d="${asaD}" fill="none" stroke="#F4F0E8" stroke-width="2.6" stroke-linecap="round"/>`;
  const cuerpo = `M${-rx} ${-h} L${-rx + 1} -1 A${rx - 1} ${(rx - 1) / 2} 0 0 0 ${rx - 1} -1 L${rx} ${-h} Z`;
  const tazaSvg =
    `${sombraObj(13)}${asa}<path d="${cuerpo}" fill="${u}" ${trazo(1.8)}/>` +
    `<path d="M${-rx + 0.6} -9 A${rx - 0.6} ${(rx - 0.6) / 2} 0 0 0 ${rx - 0.6} -9" fill="none" stroke="${C.terracota}" stroke-width="3"/>` +
    `<ellipse cx="0" cy="${-h}" rx="${rx}" ry="${rx / 2}" fill="#F4F0E8" ${trazo(1.6)}/>` +
    `<ellipse cx="0" cy="${-h + 0.8}" rx="${rx - 2}" ry="${(rx - 2) / 2}" fill="#DCD3C3" stroke="none"/>` +
    `<path d="M-6 ${-h + 5} L-5.5 -5" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.8"/>`;
  const humo = (x: number) => `<path d="M${x} -23 q-3 -3 0 -6 q3 -3 0 -6" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity="0.85"/>`;
  const cafe = `<ellipse cx="0" cy="${-h + 0.8}" rx="${rx - 2}" ry="${(rx - 2) / 2}" fill="#7A4A2A" stroke="none"/><ellipse cx="-2" cy="${-h + 0.2}" rx="3" ry="1.2" fill="#A0703F" opacity="0.8"/>${humo(-3)}${humo(3)}`;
  const mugre = `<ellipse cx="0" cy="${-h + 1.4}" rx="${rx - 3.5}" ry="${(rx - 3.5) / 2.2}" fill="rgba(122,74,42,0.55)"/><path d="M-6 ${-h + 2.5} q0 4 0.5 7" fill="none" stroke="rgba(122,74,42,0.6)" stroke-width="2.2" stroke-linecap="round"/><g fill="#9C7A4E" opacity="0.8"><circle cx="4" cy="-12" r="1.2"/><circle cx="-2" cy="-6" r="1"/></g>`;
  capas("kafeibei", { taza: { defs: [g], cuerpo: tazaSvg }, cafe: { cuerpo: cafe }, mugre: { cuerpo: mugre } });
}

/** 灯: lámpara colgante sobre la mesa (el cordón sube hasta el borde del cuadro). `luz` = halo amarillo, encendida. */
function lampara() {
  const [g, u] = degradado("#EFA184", C.terracotaOsc);
  const lamparaSvg =
    `<path d="M0 -60 L0 -31" stroke="${T}" stroke-width="1.8" stroke-linecap="round"/>` +
    `<rect x="-3.5" y="-34" width="7" height="5" rx="1.5" fill="${C.oro}" ${trazo(1.2)}/>` +
    `<path d="M-19 -14 Q-17 -29 0 -30 Q17 -29 19 -14 Z" fill="${u}" ${trazo(1.8)}/>` +
    `<path d="M-16.5 -19 Q0 -16 16.5 -19" fill="none" stroke="${C.mostaza}" stroke-width="1.8"/>` +
    `<ellipse cx="0" cy="-14" rx="19" ry="4.5" fill="${C.crema}" ${trazo(1.6)}/>` +
    `<circle cx="0" cy="-12.5" r="4.2" fill="#E8E2D0" ${trazo(1.3)}/>` +
    `<ellipse cx="-9" cy="-23" rx="2.2" ry="3.4" fill="#fff" opacity="0.5"/>`;
  const halo = `<radialGradient id="luzDeng"><stop offset="0" stop-color="#FFEFA8" stop-opacity="0.9"/><stop offset="0.45" stop-color="#FFE38A" stop-opacity="0.4"/><stop offset="1" stop-color="#FFE38A" stop-opacity="0"/></radialGradient>`;
  const luz = `<ellipse cx="0" cy="-11" rx="27" ry="16.5" fill="url(#luzDeng)"/><circle cx="0" cy="-12.5" r="4.2" fill="#FFF6C9" ${trazo(1.3)}/><circle cx="-1.2" cy="-13.6" r="1.4" fill="#fff"/>`;
  capas("deng", { lampara: { defs: [g], cuerpo: lamparaSvg }, luz: { defs: [halo], cuerpo: luz } });
}

/**
 * 窗户: ventana en la pared derecha (plano v = 0; el apoyo es el centro del borde de abajo).
 * `marco` = madera, cielo y repisa; `vidrio` = las dos hojas cerradas; `abierta` = las hojas giradas 90° hacia la cocina.
 */
function ventana() {
  const a = 0.64, m = 0.78, z0 = 0.14, z1 = 1.95, zt = 2.09, dv = 0.012;
  const [gC, uC] = degradado("#E6F6FB", "#A9D6EA", true);
  const enPared = (du: number, dz: number, s: string) => {
    const p = iso(du, dv, dz);
    return `<g transform="translate(${f(p.x)} ${f(p.y)}) skewY(26.57)">${s}</g>`;
  };
  const nube = (du: number, dz: number) =>
    enPared(du, dz, `<g fill="#FFFFFF" opacity="0.9"><ellipse cx="0" cy="0" rx="9" ry="4"/><ellipse cx="6" cy="-2.5" rx="6" ry="4"/><ellipse cx="-5" cy="-1.5" rx="5" ry="3"/></g>`);
  const arbusto = (du: number, r: number) => enPared(du, z0, `<ellipse cx="0" cy="${f(-r * 0.6)}" rx="${r}" ry="${f(r * 0.75)}" fill="#BFDDB0"/>`);
  const vano = (fill: string, g: number, d = 0.008) => caraR([[-a, d, z0], [a, d, z0], [a, d, z1], [-a, d, z1]], fill, g);
  const marco =
    caraR([[-m, 0.004, 0], [m, 0.004, 0], [m, 0.004, zt], [-m, 0.004, zt]], C.madera.i, 2) +
    vano(uC, 0) + nube(-0.25, 1.55) + nube(0.35, 1.2) + arbusto(-0.4, 7) + arbusto(0.1, 9) + arbusto(0.5, 6) + vano("none", 1.6, 0.009) +
    cajaR(-m - 0.12, m + 0.12, 0, 0.22, -0.1, 0, C.madera, 1.6);
  const hojaCerrada = (u0: number, u1: number) =>
    caraR([[u0, dv, z0], [u1, dv, z0], [u1, dv, z1], [u0, dv, z1]], "rgba(210,236,244,0.55)", 1.4) +
    caraR([[u0 + 0.06, dv, z0 + 0.08], [u1 - 0.06, dv, z0 + 0.08], [u1 - 0.06, dv, z1 - 0.08], [u0 + 0.06, dv, z1 - 0.08]], "none", 3, `stroke="${C.madera.d}"`);
  const brillo = (du: number) => segR([du, dv, 1.55], [du + 0.18, dv, 1.15], "#fff", 2.2, 'opacity="0.9"');
  const zm = (z0 + z1) / 2;
  const vidrio =
    hojaCerrada(-a, 0) + hojaCerrada(0, a) +
    segR([0, dv, z0], [0, dv, z1], C.madera.d, 3.4) + segR([-a, dv, zm], [a, dv, zm], C.madera.d, 2.6) +
    brillo(-0.5) + brillo(0.12);
  // hojas abiertas: giran sobre las bisagras de los costados hacia la cocina (plano u = constante)
  const hojaAbierta = (u: number) =>
    caraR([[u, 0, z0], [u, a, z0], [u, a, z1], [u, 0, z1]], "rgba(210,236,244,0.6)", 1.6) +
    caraR([[u, 0.06, z0 + 0.08], [u, a - 0.06, z0 + 0.08], [u, a - 0.06, z1 - 0.08], [u, 0.06, z1 - 0.08]], "none", 3, `stroke="${C.madera.d}"`);
  const abierta = hojaAbierta(-a) + hojaAbierta(a);
  // pájaro posado en la repisa (la animación lo hace entrar volando)
  const p = iso(0.2, 0.11, 0);
  const pajaro =
    `<g transform="translate(${f(p.x)} ${f(p.y)})">` +
    `<path d="M-7 -4 L-13 -7 L-12 -2 Z" fill="#5E94C2" ${trazo(1.1)}/>` +
    `<ellipse cx="-1" cy="-5" rx="7" ry="5" fill="#7DB3D9" ${trazo(1.3)}/>` +
    `<ellipse cx="0" cy="-3" rx="3.5" ry="2" fill="#F6E8CF" stroke="none"/>` +
    `<path d="M-5 -6 Q-1 -9 3 -5 Q-1 -3 -5 -6 Z" fill="#5E94C2" ${trazo(0.9)}/>` +
    `<circle cx="5" cy="-10" r="4" fill="#7DB3D9" ${trazo(1.3)}/>` +
    `<path d="M8.6 -10.8 L12 -9.6 L8.6 -8.6 Z" fill="${C.mostaza}" ${trazo(0.8)}/>` +
    `<circle cx="6" cy="-11" r="0.9" fill="${T}"/>` +
    `<path d="M-1 0 L-1 2 M2 0 L2 2" stroke="${T}" stroke-width="1" stroke-linecap="round"/></g>`;
  capas("chuanghu", { marco: { defs: [gC], cuerpo: marco }, vidrio: { cuerpo: vidrio }, abierta: { cuerpo: abierta }, pajaro: { cuerpo: pajaro } });
}

/** 垃圾桶: tarro con pedal; la `tapa` va aparte porque se levanta. */
function basurero() {
  const [g, u] = degradado(C.salvia.a, C.salvia.d);
  const tarro =
    `${sombraObj(17)}<path d="M-15 -34 L-13 -1 A13 6.5 0 0 0 13 -1 L15 -34 Z" fill="${u}" ${trazo(1.8)}/>` +
    `<path d="M-14.6 -27 A14.6 7 0 0 0 14.6 -27" fill="none" stroke="${C.salvia.linea}" stroke-width="1.6"/>` +
    `<path d="M-13.4 -8 A13.4 6.5 0 0 0 13.4 -8" fill="none" stroke="${C.salvia.linea}" stroke-width="1.6"/>` +
    `<ellipse cx="0" cy="-34" rx="15" ry="7" fill="${C.salvia.linea}" ${trazo(1.6)}/>` +
    `<rect x="-6" y="2" width="12" height="4" rx="2" fill="${C.aceroOsc}" ${trazo(1.2)}/>` +
    `<ellipse cx="-8" cy="-20" rx="2.4" ry="6" fill="#fff" opacity="0.4"/>`;
  const tapa =
    `<path d="M-16.5 -34 Q-16 -43 0 -43 Q16 -43 16.5 -34 A16.5 7 0 0 1 -16.5 -34 Z" fill="${C.salvia.i}" ${trazo(1.8)}/>` +
    `<path d="M-16.3 -34 A16.3 6.8 0 0 0 16.3 -34" fill="none" stroke="${C.salvia.linea}" stroke-width="1.4"/>` +
    `<ellipse cx="0" cy="-43" rx="4.5" ry="2" fill="${C.oro}" ${trazo(1.2)}/>` +
    `<path d="M-9 -39 Q-5 -41.5 0 -41.5" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity="0.7"/>`;
  capas("lajitong", { tarro: { defs: [g], cuerpo: tarro }, tapa: { cuerpo: tapa } });
}

/** 椅子: silla de madera con cojín; el respaldo da a la derecha (u+), así se lee de perfil. */
function silla() {
  const s = 0.36, l = 0.09, zs = 0.66;
  const pata = (u: number, v: number) => cajaR(u, u + l, v, v + l, 0, zs, C.madera, 1.3);
  const respaldo =
    cajaR(s - l, s, -s, -s + l, zs + 0.1, 1.25, C.madera, 1.3) +
    cajaR(s - l, s, s - l, s, zs + 0.1, 1.25, C.madera, 1.3) +
    cajaR(s - l, s, -s, s, 0.9, 0.98, C.madera, 1.3) +
    cajaR(s - l, s, -s, s, 1.07, 1.25, C.madera, 1.4);
  const sillaSvg =
    sombraObj(24) +
    pata(-s, -s) + pata(s - l, -s) + pata(-s, s - l) + pata(s - l, s - l) +
    cajaR(-s, s, -s, s, zs, zs + 0.1, C.madera, 1.5) +
    cajaR(-s + 0.05, s - 0.12, -s + 0.05, s - 0.05, zs + 0.1, zs + 0.17, C.salvia, 1.3) +
    respaldo;
  capas("yizi", { silla: { cuerpo: sillaSvg } });
}

/** 桌子: solo una zona de toque sobre la mesa (la mesa ya está dibujada en el cuarto). No se ve nada. */
function zona() {
  capas("zhuozi", { zona: { cuerpo: `<ellipse cx="0" cy="0" rx="1" ry="1" fill="none" stroke="none"/>` } });
}

/** 手机: teléfono parado con la pantalla hacia la cocina (plano u = constante) y el botón verde de llamar. */
function telefono() {
  const tel =
    `<ellipse cx="0" cy="3" rx="11" ry="3.5" fill="rgba(90,55,30,0.18)"/>` +
    `<g transform="skewY(-26.57)">` +
    `<rect x="-6" y="-22" width="16" height="25" rx="3.2" fill="${C.negroOsc}" ${trazo(1.4)}/>` +
    `<rect x="-8" y="-21" width="16" height="25" rx="3.2" fill="${C.negro}" ${trazo(1.6)}/>` +
    `<rect x="-6" y="-18" width="12" height="17.5" rx="1.4" fill="#BFE3F0" stroke="none"/>` +
    `<path d="M-6 -18 L1 -18 L-6 -9 Z" fill="#fff" opacity="0.45"/>` +
    `<circle cx="0" cy="-7" r="3.4" fill="${C.hoja}" ${trazo(1)}/>` +
    `<path d="M-1.6 -8.4 q0 3 3.2 3.2" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>` +
    `<circle cx="0" cy="-19.6" r="0.7" fill="#8A8480"/>` +
    `<path d="M-2.5 1.8 L2.5 1.8" stroke="#8A8480" stroke-width="1" stroke-linecap="round"/>` +
    `</g>`;
  capas("shouji", { telefono: { cuerpo: tel } });
}

/**
 * 猫: gato naranjo atigrado. `cola` = lo que asoma desde el escondite; `gato` = entero, sentado de frente.
 * Los dos se dibujan alrededor del apoyo: la casa los lleva a cada escondite con `llevarA`.
 */
function gato() {
  const N = { c: "#F2A65A", o: "#D9803A", l: "#FFE3C2", rosa: "#F4B6B0" };
  const rayada = (d: string, g: number) =>
    `<path d="${d}" fill="none" stroke="${T}" stroke-width="${g + 3}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${N.c}" stroke-width="${g}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${N.o}" stroke-width="${g}" stroke-dasharray="2 4.5"/>`;
  const cola = rayada("M0 2 C-2 -8 8 -12 6 -20 C5 -26 -1 -27 -2 -23", 5);
  const gatoSvg =
    sombraObj(16) +
    rayada("M11 -3 Q25 -2 23 -13 Q22 -19 17 -18", 4.4) +
    `<path d="M-14 0 C-17 -10 -12 -20 0 -21 C12 -20 17 -10 14 0 Q0 3.5 -14 0 Z" fill="${N.c}" ${trazo(1.8)}/>` +
    `<path d="M-13 -10 q3 1 5 0 M13 -10 q-3 1 -5 0 M-14 -5 q3 1 5 0 M14 -5 q-3 1 -5 0" fill="none" stroke="${N.o}" stroke-width="1.8" stroke-linecap="round"/>` +
    `<ellipse cx="0" cy="-9" rx="6.5" ry="8" fill="${N.l}" stroke="none"/>` +
    `<ellipse cx="-5" cy="-1" rx="4" ry="2.6" fill="${N.l}" ${trazo(1.2)}/><ellipse cx="5" cy="-1" rx="4" ry="2.6" fill="${N.l}" ${trazo(1.2)}/>` +
    `<path d="M-11 -30 L-10 -41 L-2.5 -35.5 Z" fill="${N.c}" ${trazo(1.6)}/><path d="M11 -30 L10 -41 L2.5 -35.5 Z" fill="${N.c}" ${trazo(1.6)}/>` +
    `<path d="M-9.5 -32 L-9.2 -38 L-5 -35 Z" fill="${N.rosa}" stroke="none"/><path d="M9.5 -32 L9.2 -38 L5 -35 Z" fill="${N.rosa}" stroke="none"/>` +
    `<ellipse cx="0" cy="-27" rx="12.5" ry="10.5" fill="${N.c}" ${trazo(1.8)}/>` +
    `<path d="M-3 -36.5 l0.6 3.5 M0 -37.2 l0 4 M3 -36.5 l-0.6 3.5" fill="none" stroke="${N.o}" stroke-width="1.6" stroke-linecap="round"/>` +
    `<ellipse cx="0" cy="-22.5" rx="6.5" ry="4" fill="${N.l}" stroke="none"/>` +
    `<ellipse cx="-5" cy="-27.5" rx="1.8" ry="2.4" fill="${T}"/><ellipse cx="5" cy="-27.5" rx="1.8" ry="2.4" fill="${T}"/>` +
    `<circle cx="-4.4" cy="-28.4" r="0.7" fill="#fff"/><circle cx="5.6" cy="-28.4" r="0.7" fill="#fff"/>` +
    `<ellipse cx="-8.5" cy="-23" rx="2.4" ry="1.4" fill="${N.rosa}" opacity="0.7"/><ellipse cx="8.5" cy="-23" rx="2.4" ry="1.4" fill="${N.rosa}" opacity="0.7"/>` +
    `<path d="M-1.4 -24.6 L1.4 -24.6 L0 -23 Z" fill="${N.rosa}" ${trazo(0.8)}/>` +
    `<path d="M-2.6 -21.6 q1.3 1.4 2.6 0 q1.3 1.4 2.6 0" fill="none" stroke="${T}" stroke-width="0.9" stroke-linecap="round"/>` +
    `<path d="M-9 -23.5 L-16 -25 M-9 -22 L-16 -21 M9 -23.5 L16 -25 M9 -22 L16 -21" stroke="${T}" stroke-width="0.7" stroke-linecap="round"/>`;
  capas("mao", { cola: { cuerpo: cola }, gato: { cuerpo: gatoSvg } });
}

// =====================================================================================
// COMIDA DEL REFRI: de frente (no isométrica), en un cuadro cuadrado. Mismas formas y colores que las frutas
// del video (../video/src/Frutas.tsx, solo como referencia), sin filtro de crayón, como el resto de la cocina.
// =====================================================================================
type Pieza = { d: string; color: string; sombra?: string; rayas?: string[]; contorno?: number };
type Comida = {
  cuerpo: string; color: string; sombra: string; rayas: string[]; brillo: string[];
  trama?: string[]; piezas?: Pieza[]; sinContorno?: boolean; atras?: string; extras?: string;
};
const VISTA_COMIDA: [number, number, number, number] = [30, 25, 350, 350];
const circ = (cx: number, cy: number, r: number) => `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
const elip = (cx: number, cy: number, rx: number, ry: number) => `M ${cx - rx} ${cy} a ${rx} ${ry} 0 1 0 ${2 * rx} 0 a ${rx} ${ry} 0 1 0 ${-2 * rx} 0 Z`;
const huevo = (cx: number, cy: number, rx: number, ry: number) =>
  `M ${cx} ${cy - ry} C ${cx + rx * 0.75} ${cy - ry}, ${cx + rx} ${cy - ry * 0.1}, ${cx + rx} ${cy + ry * 0.3} C ${cx + rx} ${cy + ry * 0.85}, ${cx + rx * 0.55} ${cy + ry}, ${cx} ${cy + ry} C ${cx - rx * 0.55} ${cy + ry}, ${cx - rx} ${cy + ry * 0.85}, ${cx - rx} ${cy + ry * 0.3} C ${cx - rx} ${cy - ry * 0.1}, ${cx - rx * 0.75} ${cy - ry}, ${cx} ${cy - ry} Z`;
const raya = (d: string, color: string, g: number, op: number) =>
  `<path d="${d}" stroke="${color}" stroke-width="${g}" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="${op}"/>`;

function comida(id: string, c: Comida) {
  const defs = [`<clipPath id="r"><path d="${c.cuerpo}"/></clipPath>`, ...(c.piezas ?? []).map((p, i) => `<clipPath id="r${i}"><path d="${p.d}"/></clipPath>`)];
  const out = [
    c.atras ?? "",
    `<path d="${c.cuerpo}" fill="${c.color}"/>`,
    `<g clip-path="url(#r)">${c.rayas.map((r) => raya(r, c.sombra, 22, 0.55)).join("")}${c.brillo.map((b) => raya(b, "#FFF6E6", 13, 0.75)).join("")}${(c.trama ?? []).map((t) => raya(t, c.sombra, 5, 0.8)).join("")}</g>`,
    ...(c.piezas ?? []).map((p, i) =>
      `<path d="${p.d}" fill="${p.color}"/>` +
      (p.rayas && p.sombra ? `<g clip-path="url(#r${i})">${p.rayas.map((r) => raya(r, p.sombra!, 16, 0.55)).join("")}</g>` : "") +
      (p.contorno ? `<path d="${p.d}" fill="none" stroke="${T}" stroke-width="${p.contorno}" stroke-linejoin="round"/>` : ""),
    ),
    c.extras ?? "",
    c.sinContorno ? "" : `<path d="${c.cuerpo}" fill="none" stroke="${T}" stroke-width="9" stroke-linejoin="round"/>`,
  ];
  archivo(`refri_${id}`, VISTA_COMIDA, 512, defs, out.join(""));
}

function comidaRefri() {
  const HOJA = { color: "#8DB561", sombra: "#5E8C3A" }, TALLO = "#7A4B2A";
  const hojas = (ds: string[], color = "#6FA84A") =>
    `<g fill="${color}" stroke="${T}" stroke-width="6" stroke-linejoin="round">${ds.map((d) => `<path d="${d}"/>`).join("")}</g>`;
  comida("pingguo", {
    cuerpo: "M200 122 C 168 94, 96 98, 76 162 C 56 228, 88 318, 142 344 C 166 356, 186 346, 200 338 C 214 346, 234 356, 258 344 C 312 318, 344 228, 324 162 C 304 98, 232 94, 200 122 Z",
    color: "#D9574A", sombra: "#A8392F",
    rayas: ["M300 170 C 322 230, 300 300, 250 332", "M280 150 C 305 215, 290 290, 240 325", "M160 330 C 190 338, 215 336, 240 328"],
    brillo: ["M118 180 C 110 205, 112 230, 124 252", "M140 150 C 150 140, 162 136, 172 136"],
    extras: `<path d="M200 128 C 198 100, 204 82, 216 62" stroke="${TALLO}" stroke-width="15" stroke-linecap="round" fill="none"/><path d="M212 92 C 230 60, 276 54, 298 68 C 282 96, 246 108, 212 92 Z" fill="${HOJA.color}" stroke="${T}" stroke-width="6" stroke-linejoin="round"/><path d="M218 90 C 245 80, 268 74, 290 70" stroke="${HOJA.sombra}" stroke-width="5" stroke-linecap="round" fill="none"/>`,
  });
  comida("xiangjiao", {
    cuerpo: "M64 232 C 108 322, 264 334, 332 236 C 356 202, 362 166, 352 130 L 330 124 C 324 160, 298 192, 248 208 C 188 228, 122 218, 86 196 C 66 186, 54 212, 64 232 Z",
    color: "#F0C04A", sombra: "#C9932E",
    rayas: ["M84 250 C 160 306, 268 300, 330 222", "M120 282 C 180 306, 260 300, 312 260"],
    brillo: ["M106 214 C 168 236, 240 228, 296 196"],
    extras: `<path d="M330 128 L 334 100 L 356 104 L 352 134 Z" fill="${TALLO}" stroke="${T}" stroke-width="5" stroke-linejoin="round"/><circle cx="66" cy="222" r="10" fill="${TALLO}"/>`,
  });
  const PEPAS = [[118, 190, -40], [158, 182, -20], [216, 194, 6], [268, 185, 26], [288, 204, 38], [140, 228, -30], [186, 234, -8], [246, 222, 18], [210, 248, 2]];
  comida("xigua", {
    cuerpo: "M54 150 A 150 150 0 0 0 354 150 Z", color: "#6E9F4F", sombra: "#4D7A36",
    rayas: ["M70 190 C 100 260, 160 296, 204 300", "M338 190 C 308 260, 248 296, 204 300"], brillo: [],
    piezas: [
      { d: "M72 150 A 132 132 0 0 0 336 150 Z", color: "#EDE6C2" },
      { d: "M86 150 A 118 118 0 0 0 322 150 Z", color: "#E2574E", sombra: "#C23E37", rayas: ["M110 168 C 140 230, 200 262, 270 236"] },
    ],
    extras:
      PEPAS.map(([x, y, g]) => `<ellipse cx="${x}" cy="${y}" rx="6" ry="10" fill="#3B2418" transform="rotate(${g} ${x} ${y})"/>`).join("") +
      `<path d="M120 165 C 160 170, 230 170, 290 164" stroke="#FFF6E6" stroke-width="9" stroke-linecap="round" fill="none" opacity="0.6"/>`,
  });
  const PEPITAS = [[150, 170], [205, 160], [260, 170], [120, 215], [178, 215], [234, 215], [290, 215], [150, 262], [205, 262], [260, 262], [178, 308], [232, 308]];
  comida("caomei", {
    cuerpo: "M205 124 C 150 96, 84 124, 84 190 C 84 262, 150 340, 205 362 C 260 340, 326 262, 326 190 C 326 124, 260 96, 205 124 Z",
    color: "#DE4A42", sombra: "#A62E28",
    rayas: ["M304 178 C 312 240, 270 310, 226 344", "M284 160 C 296 230, 256 300, 214 340"],
    brillo: ["M112 176 C 110 200, 118 226, 132 246"],
    extras:
      PEPITAS.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="7" ry="10" fill="#F8DB7A" stroke="${T}" stroke-width="3"/>`).join("") +
      hojas(["M205 128 C 170 92, 124 92, 92 112 C 112 142, 166 156, 205 128 Z", "M205 128 C 240 92, 286 92, 318 112 C 298 142, 244 156, 205 128 Z", "M205 128 C 188 96, 196 66, 205 52 C 214 66, 222 96, 205 128 Z"], HOJA.color),
  });
  const ESTRIAS = [0.18, 0.32, 0.46, 0.6, 0.74].map((t, i) => {
    const cx = 290 - 180 * t, cy = 158 + 175 * t, L = 24 * (1 - t) + 8, lado = i % 2 ? 0.2 : -0.2;
    return `M ${f(cx - 0.707 * L * (0.5 - lado))} ${f(cy - 0.707 * L * (0.5 - lado))} L ${f(cx + 0.707 * L * (0.5 + lado))} ${f(cy + 0.707 * L * (0.5 + lado))}`;
  });
  comida("huluobo", {
    cuerpo: "M246 118 C 268 96, 318 110, 326 150 C 330 168, 322 178, 310 190 C 250 250, 160 320, 92 354 C 82 358, 76 350, 82 342 C 130 284, 200 182, 246 118 Z",
    color: "#F08A2E", sombra: "#C9651E",
    rayas: ["M312 182 C 260 236, 190 296, 120 338"], brillo: ["M246 136 C 220 170, 196 206, 172 240"], trama: ESTRIAS,
    atras: hojas(["M282 124 C 270 90, 262 64, 270 34 C 290 62, 296 94, 292 122 Z", "M286 126 C 256 104, 238 82, 232 52 C 260 70, 280 96, 292 122 Z", "M294 128 C 306 92, 328 66, 356 52 C 346 86, 322 112, 300 132 Z", "M302 138 C 330 122, 354 118, 370 122 C 352 142, 326 148, 304 146 Z"]),
  });
  comida("xihongshi", {
    cuerpo: "M205 135 C 245 118, 330 130, 342 210 C 352 290, 290 348, 205 348 C 120 348, 58 290, 68 210 C 80 130, 165 118, 205 135 Z",
    color: "#E0473C", sombra: "#B0302A",
    rayas: ["M322 200 C 334 260, 302 320, 252 340"], brillo: ["M108 200 C 106 228, 114 256, 128 276", "M140 162 C 152 152, 168 148, 180 148"],
    extras:
      `<path d="M206 140 C 206 120, 212 104, 222 92" stroke="${TALLO}" stroke-width="10" stroke-linecap="round" fill="none"/>` +
      hojas(["M205 140 C 190 128, 165 122, 140 126 C 160 140, 182 148, 205 146 Z", "M205 140 C 220 128, 245 122, 270 126 C 250 140, 228 148, 205 146 Z", "M205 142 C 196 152, 182 168, 172 180 C 192 176, 206 162, 210 146 Z", "M205 142 C 214 152, 228 168, 238 180 C 218 176, 204 162, 200 146 Z"]),
  });
  const OJOS = [[150, 190], [250, 170], [290, 250], [190, 280], [120, 260], [230, 225]];
  comida("tudou", {
    cuerpo: "M110 190 C 120 130, 200 112, 260 128 C 330 146, 350 210, 330 266 C 312 318, 250 344, 186 336 C 116 328, 70 290, 82 240 C 88 218, 104 206, 110 190 Z",
    color: "#D6AE6C", sombra: "#A87C40",
    rayas: ["M318 220 C 324 270, 290 316, 230 330"], brillo: ["M122 200 C 130 172, 160 150, 196 142"],
    trama: OJOS.map(([x, y]) => `M ${x - 8} ${y} C ${x - 3} ${y - 6}, ${x + 3} ${y - 6}, ${x + 8} ${y}`),
    extras: OJOS.map(([x, y]) => `<circle cx="${x + 14}" cy="${y + 12}" r="3" fill="#A87C40" opacity="0.7"/>`).join(""),
  });
  const RAMILLETES = [[205, 118, 48], [150, 145, 48], [260, 145, 48], [104, 192, 44], [306, 192, 44], [160, 208, 52], [250, 208, 52], [205, 198, 56]];
  const talloBrocoli = "M176 230 C 182 270, 178 310, 166 350 C 190 362, 222 362, 244 350 C 232 310, 228 270, 234 230 Z";
  comida("xilanhua", {
    cuerpo: talloBrocoli, color: "#A9CC6E", sombra: "#7FA34A", sinContorno: true, rayas: [], brillo: [],
    piezas: [
      { d: talloBrocoli, color: "#A9CC6E", sombra: "#7FA34A", rayas: ["M226 250 C 230 290, 232 320, 236 348"], contorno: 8 },
      ...RAMILLETES.map(([x, y, r]) => ({
        d: circ(x, y, r), color: "#5E9A3E", sombra: "#3F7428", contorno: 7,
        rayas: [`M ${f(x + r * 0.2)} ${f(y + r * 0.8)} C ${f(x + r * 0.7)} ${f(y + r * 0.5)}, ${f(x + r * 0.85)} ${f(y + r * 0.1)}, ${f(x + r * 0.8)} ${f(y - r * 0.3)}`],
      })),
    ],
    extras: RAMILLETES.map(([x, y, r]) =>
      `<circle cx="${f(x - r * 0.35)}" cy="${f(y - r * 0.3)}" r="5" fill="#D3EAAE" opacity="0.85"/><circle cx="${f(x - r * 0.05)}" cy="${f(y - r * 0.45)}" r="4" fill="#D3EAAE" opacity="0.85"/><circle cx="${f(x - r * 0.5)}" cy="${f(y + r * 0.05)}" r="4" fill="#D3EAAE" opacity="0.85"/>`).join(""),
  });
  const SOMBRERO = "M62 208 C 62 112, 130 62, 205 62 C 280 62, 348 112, 348 208 A 143 32 0 0 1 62 208 Z";
  const PIE = "M150 226 Q 205 206 260 226 C 262 262, 272 296, 284 318 C 296 346, 276 360, 250 360 L 160 360 C 134 360, 114 346, 126 318 C 138 296, 148 262, 150 226 Z";
  const LAMINAS = Array.from({ length: 22 }, (_, i) => {
    const a = (i / 22) * 2 * Math.PI;
    return `M ${f(205 + 40 * Math.cos(a))} ${f(210 + 9 * Math.sin(a))} L ${f(205 + 140 * Math.cos(a))} ${f(208 + 31 * Math.sin(a))}`;
  });
  comida("mogu", {
    cuerpo: SOMBRERO, color: "#E6C89E", sombra: "#B88E5E", sinContorno: true, rayas: [], brillo: [],
    piezas: [
      { d: SOMBRERO, color: "#E6C89E", sombra: "#B88E5E", rayas: ["M318 130 C 338 160, 344 186, 340 206", "M296 106 C 322 136, 330 170, 326 204", "M90 190 C 120 204, 160 212, 205 212"], contorno: 8 },
      { d: elip(205, 208, 143, 32), color: "#E8BDA6", sombra: "#8E5E48", rayas: LAMINAS, contorno: 8 },
      { d: PIE, color: "#F6EAD5", sombra: "#CDB89A", rayas: ["M250 244 C 252 280, 264 314, 272 336"], contorno: 8 },
    ],
    extras: `<path d="M100 150 C 112 118, 142 96, 176 88" stroke="#FFFDF6" stroke-width="13" stroke-linecap="round" fill="none" opacity="0.85"/>`,
  });
  // 牛奶: caja de leche con techo de dos aguas, franja azul con una gota y manchas de vaca
  comida("niunai", {
    cuerpo: "M120 352 L 120 150 L 160 104 L 250 104 L 290 150 L 290 352 Z", color: "#FFFFFF", sombra: "#D9E2EA",
    rayas: ["M276 160 L 276 340", "M130 340 L 280 340"], brillo: [],
    piezas: [
      { d: "M120 236 L 290 236 L 290 300 L 120 300 Z", color: "#7DA5D8", sombra: "#5B86BE", rayas: ["M282 244 L 282 296"] },
      { d: "M160 104 L 250 104 L 290 150 L 120 150 Z", color: "#EEF3F7", contorno: 6 },
      { d: "M168 82 L 242 82 L 242 104 L 168 104 Z", color: "#FFFFFF", contorno: 6 },
    ],
    extras:
      `<path d="M150 178 q12 -8 22 2 q4 12 -10 14 q-14 -2 -12 -16 Z" fill="${C.negro}"/><path d="M232 196 q14 -6 20 6 q-2 12 -14 10 q-10 -4 -6 -16 Z" fill="${C.negro}"/><circle cx="262" cy="172" r="6" fill="${C.negro}"/>` +
      `<path d="M205 248 C 194 264, 190 272, 190 280 a 15 15 0 0 0 30 0 C 220 272, 216 264, 205 248 Z" fill="#FFFFFF" stroke="${T}" stroke-width="4" stroke-linejoin="round"/>`,
  });
  // 鸡蛋: dos huevos
  const h1 = huevo(158, 236, 66, 92), h2 = huevo(266, 262, 60, 82);
  comida("jidan", {
    cuerpo: h1, color: "#F6E6C8", sombra: "#D9C29A", sinContorno: true, rayas: [], brillo: [],
    piezas: [
      { d: h1, color: "#F6E6C8", sombra: "#D9C29A", rayas: ["M206 220 C 214 270, 196 310, 160 324"], contorno: 9 },
      { d: h2, color: "#E9C9A0", sombra: "#C9A06E", rayas: ["M310 250 C 316 296, 300 326, 268 338"], contorno: 9 },
    ],
    extras: `<path d="M118 190 C 120 168, 134 152, 150 146" stroke="#FFFDF6" stroke-width="12" stroke-linecap="round" fill="none" opacity="0.85"/><path d="M232 232 C 234 214, 246 200, 258 196" stroke="#FFF6E6" stroke-width="10" stroke-linecap="round" fill="none" opacity="0.75"/>`,
  });
  // 面包: rebanada de pan de molde (corteza y miga)
  const MIGA = "M112 318 L 112 196 C 96 186, 98 138, 128 132 C 152 126, 178 136, 205 134 C 232 136, 258 126, 282 132 C 312 138, 314 186, 298 196 L 298 318 Q 205 330 112 318 Z";
  comida("mianbao", {
    cuerpo: "M90 332 L 90 192 C 66 180, 70 118, 120 110 C 150 102, 176 114, 205 112 C 234 114, 260 102, 290 110 C 340 118, 344 180, 320 192 L 320 332 Q 205 348 90 332 Z",
    color: "#D9954A", sombra: "#A8692E", rayas: ["M330 150 C 336 200, 320 260, 318 330"], brillo: [],
    piezas: [{ d: MIGA, color: "#FCEBC8", sombra: "#EBCB92", rayas: ["M290 200 C 292 250, 290 290, 286 312"] }],
    extras:
      [[150, 190], [230, 172], [184, 240], [258, 236], [150, 286], [220, 292], [268, 286]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="6" ry="4" fill="#E3C58E"/>`).join("") +
      `<path d="${MIGA}" fill="none" stroke="#C88A45" stroke-width="3"/>`,
  });
  // 米: saco abierto con arroz crudo
  const GRANOS = [[170, 136, -20], [196, 124, 10], [222, 130, 30], [244, 146, -10], [186, 150, 40], [212, 148, -30], [160, 156, 15], [234, 160, 20], [204, 112, 0]];
  comida("mi", {
    cuerpo: "M110 352 C 86 300, 92 214, 132 164 L 278 164 C 318 214, 324 300, 300 352 Q 205 370 110 352 Z",
    color: "#E8D3A8", sombra: "#BFA06A",
    rayas: ["M296 210 C 312 260, 308 310, 290 344", "M120 340 C 170 352, 240 352, 290 340"], brillo: ["M132 210 C 120 250, 120 290, 128 320"],
    trama: ["M150 200 L 160 340", "M205 196 L 205 348", "M260 200 L 250 340"],
    extras:
      `<path d="M176 250 L 205 226 L 234 250 L 205 274 Z" fill="${C.rojo}" stroke="${T}" stroke-width="5" stroke-linejoin="round"/>` +
      `<path d="${elip(205, 164, 84, 24)}" fill="#F3E4C2" stroke="${T}" stroke-width="7"/>` +
      `<path d="M134 164 Q 148 108 205 102 Q 262 108 276 164 Q 205 182 134 164 Z" fill="#FFFDF6" stroke="${T}" stroke-width="7" stroke-linejoin="round"/>` +
      GRANOS.map(([x, y, g]) => `<ellipse cx="${x}" cy="${y}" rx="7" ry="3.6" fill="none" stroke="#D9CDB4" stroke-width="2.4" transform="rotate(${g} ${x} ${y})"/>`).join(""),
  });
}

/** Interior del refri de frente: estantes de vidrio y abajo el cajón de la fruta rotulado 水果 (único texto: hanzi). */
function interiorRefri() {
  const col = { a: "#D3E5C4", i: "#BBD5A8" };
  const [gF, uF] = degradado("#FBFDF8", "#E3EDDB", true);
  const out: string[] = [];
  out.push(`<rect x="0" y="0" width="1000" height="1000" fill="${col.a}"/>`);
  out.push(`<rect x="14" y="14" width="972" height="972" rx="40" fill="none" ${trazo(8)}/>`);
  out.push(`<rect x="70" y="56" width="860" height="890" rx="26" fill="${uF}" ${trazo(7)}/>`);
  // luz de arriba
  out.push(`<rect x="300" y="70" width="400" height="26" rx="13" fill="#FFFBE6" ${trazo(4)}/>`);
  // estantes de vidrio sobre sus rieles
  for (const y of [280, 500, 700]) {
    out.push(`<rect x="72" y="${y - 6}" width="20" height="34" fill="${col.i}" stroke="none"/><rect x="908" y="${y - 6}" width="20" height="34" fill="${col.i}" stroke="none"/>`);
    out.push(`<rect x="76" y="${y}" width="848" height="22" rx="6" fill="rgba(206,232,240,0.9)" ${trazo(5)}/>`);
    out.push(`<path d="M96 ${y + 7} L904 ${y + 7}" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity="0.9"/>`);
  }
  // cajón de la fruta: frente transparente, la fruta asoma detrás
  out.push(`<rect x="110" y="726" width="780" height="200" rx="24" fill="#E7EFE2" ${trazo(6)}/>`);
  for (const [x, r, c] of [[200, 46, "#D9574A"], [290, 40, "#F0C04A"], [700, 44, "#E2574E"], [790, 38, "#F08A2E"]] as const)
    out.push(`<circle cx="${x}" cy="${760 + r}" r="${r}" fill="${c}" ${trazo(5)}/>`);
  out.push(`<rect x="110" y="780" width="780" height="146" rx="24" fill="rgba(206,232,240,0.78)" ${trazo(6)}/>`);
  out.push(`<path d="M140 800 L 860 800" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" opacity="0.8"/>`);
  out.push(`<rect x="390" y="812" width="220" height="86" rx="16" fill="${C.crema}" ${trazo(5)}/>`);
  out.push(`<text x="500" y="857" font-family="'Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif" font-size="56" font-weight="700" fill="${T}" text-anchor="middle" dominant-baseline="central">水果</text>`);
  // escarcha en las esquinas
  for (const [x, y] of [[100, 120], [128, 150], [880, 130], [858, 168], [104, 640], [890, 610]])
    out.push(`<path d="M${x - 9} ${y} L${x + 9} ${y} M${x} ${y - 9} L${x} ${y + 9} M${x - 6} ${y - 6} L${x + 6} ${y + 6} M${x + 6} ${y - 6} L${x - 6} ${y + 6}" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.9"/>`);
  archivo("refri_interior", [0, 0, 1000, 1000], 2000, [gF], out.join(""));
}

cuarto();
manzana();
vaso();
bol();
plato();
palillos();
tetera();
olla();
refri();
zanahorias();
taza();
lampara();
ventana();
basurero();
silla();
zona();
telefono();
gato();
comidaRefri();
interiorRefri();
