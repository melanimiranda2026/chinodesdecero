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
  const L = ISO.lado, H = ISO.altoPared, t = 0.35, losa = 0.6;

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

  // ---- ventana (pared izquierda) ----
  const [wv0, wv1, wz0, wz1] = [1.9, 4.1, 3.25, 5.35];
  const [gVid, uVid] = degradado("#E6F6FB", "#A9D6EA", true);
  defs.push(gVid);
  out.push(rectU(0.003, wv0, wv1, wz0, wz1, C.madera.i, 2));
  out.push(rectU(0.004, wv0 + 0.13, wv1 - 0.13, wz0 + 0.13, wz1 - 0.13, uVid, 1.6));
  // árboles afuera
  for (const [v, z, r] of [[2.4, 3.6, 0.42], [2.9, 3.5, 0.5], [3.6, 3.65, 0.38]] as const) {
    const p = proyectar(0.005, v, z);
    out.push(`<ellipse cx="${f(p.x)}" cy="${f(p.y)}" rx="${f(r * ISO.A * 0.9)}" ry="${f(r * ISO.Z * 1.1)}" fill="#BFDDB0" stroke="none" transform="skewY(-26.57)" transform-origin="${f(p.x)} ${f(p.y)}"/>`);
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

  // repisa con frascos (pared izquierda, entre la ventana y el refri)
  out.push(caja(0, 0.55, 4.4, 5.9, 4.0, 4.1, C.madera, 1.8));
  for (const [v, col, h] of [[4.65, C.mostaza, 22], [5.05, C.rojo, 17], [5.5, "#A9D3C2", 26]] as const) {
    const p = proyectar(0.28, v, 4.1);
    out.push(cilindro(p.x, p.y, 7.5, h, "rgba(226,242,246,0.85)", "#F7FBFC", 1.5));
    out.push(cilindro(p.x, p.y - 2, 6, h - 7, col, col, 1.2));
    out.push(cilindro(p.x, p.y - h, 7.8, 4, C.madera.i, C.madera.a, 1.5));
  }

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

  // cuadros sobre la mesa: 福 y una planta
  {
    const uc = 7.0, zc = 4.2, r = 0.62;
    out.push(cara([[uc, 0.006, zc + r * 1.1], [uc + r, 0.006, zc], [uc, 0.006, zc - r * 1.1], [uc - r, 0.006, zc]], C.rojo, 2));
    out.push(cara([[uc, 0.007, zc + r * 0.9], [uc + r * 0.82, 0.007, zc], [uc, 0.007, zc - r * 0.9], [uc - r * 0.82, 0.007, zc]], "none", 1.2, `stroke="${C.oro}"`));
    const p = proyectar(uc, 0.008, zc);
    out.push(`<text x="0" y="0" font-family="'Noto Serif SC','Songti SC','SimSun',serif" font-size="30" font-weight="700" fill="${C.oro}" text-anchor="middle" dominant-baseline="central" transform="matrix(1 0.5 0 1 ${f(p.x)} ${f(p.y)})">福</text>`);
    // borla
    out.push(linea([uc, 0.006, zc - r * 1.1], [uc, 0.006, zc - r * 1.1 - 0.45], C.rojo, 2));
    const q = proyectar(uc, 0.006, zc - r * 1.1 - 0.45);
    out.push(`<path d="M${f(q.x - 4)} ${f(q.y + 12)} L${f(q.x)} ${f(q.y)} L${f(q.x + 4)} ${f(q.y + 12)} Z" fill="${C.rojo}" ${trazo(1.2)}/>`);
  }
  for (const [u0, z0] of [[8.4, 3.75], [9.15, 4.25]] as const) {
    out.push(rectV(0.006, u0, u0 + 0.6, z0, z0 + 0.8, C.madera.i, 1.8));
    out.push(rectV(0.007, u0 + 0.08, u0 + 0.52, z0 + 0.08, z0 + 0.72, "#F4F8EE", 1.2));
    const p = proyectar(u0 + 0.3, 0.008, z0 + 0.18);
    out.push(`<path d="M${f(p.x)} ${f(p.y + 2)} q-1 -14 0 -20 M${f(p.x)} ${f(p.y - 6)} q-7 -3 -8 -9 q6 1 8 9 M${f(p.x)} ${f(p.y - 12)} q7 -3 8 -9 q-6 1 -8 9" fill="${C.hoja}" ${trazo(1.2)}/>`);
  }

  // ---- sombras en el piso ----
  const sombra = "rgba(110,70,35,0.14)";
  out.push(rectZ(0, 1.7, 2.05, 1.7, 5.5, sombra, 0));
  out.push(rectZ(0, 1.7, 5.2, 1.7, 2.0, sombra, 0));
  out.push(rectZ(0, 1.9, 2.25, 6.1, 8.5, sombra, 0));
  out.push(rectZ(0, 5.6, 9.8, 1.6, 1.95, "rgba(110,70,35,0.10)", 0));

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
    return `<path d="M${f(p.x - 5)} ${f(p.y)} L${f(p.x - 5)} ${f(p.y - 26)} Q${f(p.x)} ${f(p.y - 36)} ${f(p.x + 5)} ${f(p.y - 26)} L${f(p.x + 5)} ${f(p.y)} Z" fill="${color}" ${trazo(1.4)} transform="skewY(-26.57)" transform-origin="${f(p.x)} ${f(p.y)}"/>`;
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

cuarto();
manzana();
vaso();
bol();
plato();
palillos();
tetera();
olla();
refri();
