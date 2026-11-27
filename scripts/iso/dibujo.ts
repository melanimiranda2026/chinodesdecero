/**
 * Piezas de dibujo isométrico compartidas por los generadores de arte (`scripts/arte-iso.ts` y
 * `scripts/escenarios-iso.ts`): paleta, primitivas SVG (caras, cajas, círculos) y las piezas comunes de un
 * cuarto (piso, paredes, cantos, planta). Todo en las coordenadas u, v, z de `components/casa/cocina/iso.ts`.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ISO, proyectar } from "../../components/casa/cocina/iso";
import { MATICES as M, PALETA as P } from "../../components/casa/paleta";

/** Partes del cuarto por separado, solo para armar las capas de Krita (scripts/arte-krita.ts). */
export const PARTES = join(process.cwd(), "arte-krita", "fuentes");

// ---------- paleta "mantel" (components/casa/paleta.ts, la misma de los videos): chocolate, crema, matcha, lavanda, estanque ----------
export const T = "#4E2414"; // tinta: contorno entre chocolate y cacao (más fino que el chocolate puro)
export const C = {
  paredIzq: P.crema, paredDer: P.cremaClara, paredCanto: M.papel, zocalo: M.cacaoClaro,
  pisoA: "#E2B583", pisoB: "#D8A874", pisoLinea: "#B8834F", losaIzq: M.cacaoClaro, losaDer: P.cacao,
  // el friso y lo verde: matcha
  salvia: { a: M.matchaClaro, i: P.matcha, d: P.matchaOscuro, linea: "#77772F" },
  meson: { a: M.papel, i: P.cremaClara, d: P.crema },
  madera: { a: "#D39A62", i: "#B97E48", d: "#97602F" },
  azulejo: "#F3F1DF", azulejoLinea: M.matchaClaro,
  acero: "#CFCBD8", aceroOsc: "#A69FB8", negro: "#4A2A22", negroOsc: "#33190F",
  // vidrio: lavanda pálida (el cielo de la paleta)
  vidrio: "#E4DDF3", vidrioOsc: M.lavandaClara,
  terracota: P.naranja, terracotaOsc: M.naranjaOscura, mostaza: M.naranjaClara, rojo: "#D9773A", oro: "#E8B055",
  // plantas: menta y estanque
  hoja: P.menta, hojaOsc: P.estanque, crema: M.papel,
  // tela de los sillones y cojines: lavanda
  lavanda: { a: M.lavandaClara, i: P.lavanda, d: P.lavandaOscura },
  menta: { a: M.mentaClara, i: P.menta, d: P.estanque },
};

// ---------- utilidades de SVG ----------
export const f = (n: number) => (Math.round(n * 10) / 10).toString();
export type P3 = [number, number, number];
export const xy = ([u, v, z]: P3) => proyectar(u, v, z);
export const camino = (pts: { x: number; y: number }[]) => "M" + pts.map((p) => `${f(p.x)} ${f(p.y)}`).join(" L") + " Z";
export const trazo = (g = 2, color = T) => `stroke="${color}" stroke-width="${g}" stroke-linejoin="round" stroke-linecap="round"`;
/** Un `stroke="…"` en `extra` reemplaza el color del contorno. */
export const conTrazo = (g: number, extra: string) => {
  const m = extra.match(/stroke="([^"]+)"/);
  return [g ? trazo(g, m ? m[1] : T) : 'stroke="none"', m ? extra.replace(m[0], "") : extra].join(" ");
};

export function cara(pts: P3[], fill: string, g = 2, extra = ""): string {
  return `<path d="${camino(pts.map(xy))}" fill="${fill}" ${conTrazo(g, extra)}/>`;
}
export function linea(a: P3, b: P3, color = T, g = 1.5, extra = ""): string {
  const p = xy(a), q = xy(b);
  return `<path d="M${f(p.x)} ${f(p.y)} L${f(q.x)} ${f(q.y)}" stroke="${color}" stroke-width="${g}" stroke-linecap="round" fill="none" ${extra}/>`;
}

export type Colores = { a: string; i: string; d: string };
/** Caja de u0..u1, v0..v1, z0..z1: dibuja las tres caras visibles (arriba, izquierda = v1, derecha = u1). */
export function caja(u0: number, u1: number, v0: number, v1: number, z0: number, z1: number, c: Colores, g = 2): string {
  return [
    cara([[u0, v1, z0], [u1, v1, z0], [u1, v1, z1], [u0, v1, z1]], c.i, g),
    cara([[u1, v0, z0], [u1, v1, z0], [u1, v1, z1], [u1, v0, z1]], c.d, g),
    cara([[u0, v0, z1], [u1, v0, z1], [u1, v1, z1], [u0, v1, z1]], c.a, g),
  ].join("");
}
/** Rectángulo sobre el plano v = constante (cara que mira abajo a la izquierda). */
export const rectV = (v: number, u0: number, u1: number, z0: number, z1: number, fill: string, g = 1.6, extra = "") =>
  cara([[u0, v, z0], [u1, v, z0], [u1, v, z1], [u0, v, z1]], fill, g, extra);
/** Rectángulo sobre el plano u = constante (cara que mira abajo a la derecha). */
export const rectU = (u: number, v0: number, v1: number, z0: number, z1: number, fill: string, g = 1.6, extra = "") =>
  cara([[u, v0, z0], [u, v1, z0], [u, v1, z1], [u, v0, z1]], fill, g, extra);
/** Rectángulo horizontal a la altura z. */
export const rectZ = (z: number, u0: number, u1: number, v0: number, v1: number, fill: string, g = 1.6, extra = "") =>
  cara([[u0, v0, z], [u1, v0, z], [u1, v1, z], [u0, v1, z]], fill, g, extra);

/** Elipse de un círculo horizontal de radio r (unidades) centrado en (u, v, z). */
export function circulo(u: number, v: number, z: number, r: number, fill: string, g = 1.8, extra = ""): string {
  const p = proyectar(u, v, z);
  const rx = Math.SQRT2 * r * ISO.A;
  return `<ellipse cx="${f(p.x)}" cy="${f(p.y)}" rx="${f(rx)}" ry="${f(rx / 2)}" fill="${fill}" ${conTrazo(g, extra)}/>`;
}

/** Cilindro vertical en pantalla (px): base en (x, yb), radio rx, alto h. Elipses 2:1. */
export function cilindro(x: number, yb: number, rx: number, h: number, lado: string, tapa: string, g = 1.8): string {
  const ry = rx / 2;
  const cuerpo = `M${f(x - rx)} ${f(yb - h)} L${f(x - rx)} ${f(yb)} A${f(rx)} ${f(ry)} 0 0 0 ${f(x + rx)} ${f(yb)} L${f(x + rx)} ${f(yb - h)} Z`;
  return `<path d="${cuerpo}" fill="${lado}" ${trazo(g)}/><ellipse cx="${f(x)}" cy="${f(yb - h)}" rx="${f(rx)}" ry="${f(ry)}" fill="${tapa}" ${trazo(g)}/>`;
}

let nGrad = 0;
/** Degradado horizontal (luz desde la izquierda). Devuelve [defs, url]. */
export function degradado(c1: string, c2: string, vertical = false): [string, string] {
  const id = `g${++nGrad}`;
  const dir = vertical ? 'x1="0" y1="0" x2="0" y2="1"' : 'x1="0" y1="0" x2="1" y2="0"';
  return [`<linearGradient id="${id}" ${dir}><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`, `url(#${id})`];
}

export function archivo(nombre: string, vista: [number, number, number, number], px: number, defs: string[], cuerpo: string, salida: string) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="${vista.map(f).join(" ")}">` +
    (defs.length ? `<defs>${defs.join("")}</defs>` : "") +
    cuerpo +
    `</svg>\n`;
  writeFileSync(join(salida, `${nombre}.svg`), svg);
  console.log("✓", `${nombre}.svg`);
}

// =====================================================================================
// PIEZAS COMUNES DE LOS CUARTOS (cocina y living)
// =====================================================================================
export const L = ISO.lado, H = ISO.altoPared, GROSOR = 0.35, LOSA = 0.6;

/** Sombra del diorama, canto de la losa y piso de tablas a lo largo de u. */
export function pisoDeTablas(defs: string[]): string[] {
  const out: string[] = [];
  // sombra suave del diorama sobre el fondo
  defs.push(`<filter id="difuso" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>`);
  out.push(cara([[0, 0, -LOSA], [L + 0.4, 0, -LOSA], [L + 0.4, L + 0.4, -LOSA], [0, L + 0.4, -LOSA]], "rgba(120,80,40,0.22)", 0, 'filter="url(#difuso)" transform="translate(10 16)"'));

  // losa del piso (canto)
  out.push(cara([[0, L, -LOSA], [L, L, -LOSA], [L, L, 0], [0, L, 0]], C.losaIzq));
  out.push(cara([[L, 0, -LOSA], [L, L, -LOSA], [L, L, 0], [L, 0, 0]], C.losaDer));
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
  return out;
}

/** Las dos paredes lisas (el zócalo y lo que se cuelga cambian en cada cuarto). */
export function paredesLisas(): string[] {
  return [
    cara([[0, 0, 0], [0, L, 0], [0, L, H], [0, 0, H]], C.paredIzq),
    cara([[0, 0, 0], [L, 0, 0], [L, 0, H], [0, 0, H]], C.paredDer),
  ];
}

/** Canto superior, extremos de las paredes y la esquina del fondo. */
export function cantosParedes(): string[] {
  const t = GROSOR;
  return [
    cara([[0, L, H], [0, 0, H], [L, 0, H], [L, -t, H], [-t, -t, H], [-t, L, H]], C.paredCanto),
    cara([[-t, L, -LOSA], [0, L, -LOSA], [0, L, H], [-t, L, H]], C.paredCanto),
    cara([[L, -t, -LOSA], [L, 0, -LOSA], [L, 0, H], [L, -t, H]], "#E9D6B6"),
    linea([0, 0, 0], [0, 0, H], T, 1.6),
  ];
}

/** Planta alta en su macetero, apoyada en el punto (u, v) del piso. */
export function planta(u: number, v: number): string[] {
  const out: string[] = [];
  const p = proyectar(u, v, 0);
  out.push(cilindro(p.x, p.y, 14, 52, M.papel, P.cremaClara, 1.8));
  out.push(`<path d="M${f(p.x - 14)} ${f(p.y - 52)} q-2 -10 6 -14 h16 q8 4 6 14" fill="${M.papel}" ${trazo(1.8)}/>`);
  const ramas = [[-22, -150], [-4, -175], [14, -138], [-34, -112]];
  for (const [dx, dy] of ramas) out.push(`<path d="M${f(p.x)} ${f(p.y - 60)} Q${f(p.x + dx * 0.4)} ${f(p.y + dy * 0.6)} ${f(p.x + dx)} ${f(p.y + dy)}" fill="none" stroke="#7A5A3E" stroke-width="2.4" stroke-linecap="round"/>`);
  const hojas: [number, number, number][] = [[-22, -150, -30], [-4, -175, 10], [14, -138, 40], [-34, -112, -60], [-12, -128, -20], [-28, -132, 20], [4, -158, -40], [10, -118, 60], [-18, -96, 30]];
  for (const [dx, dy, r] of hojas)
    out.push(`<path d="M0 0 q7 -10 0 -20 q-7 10 0 20z" fill="${C.hoja}" ${trazo(1.3)} transform="translate(${f(p.x + dx)} ${f(p.y + dy)}) rotate(${r})"/>`);
  return out;
}

/** Las mismas piezas del cuarto, cada parte en su archivo (no las usa el juego: son las capas de Krita). */
export function escribirPartes(nombre: string, partes: [string, number][], out: string[], defs: string[]) {
  mkdirSync(PARTES, { recursive: true });
  partes.forEach(([parte, desde], i) => {
    const hasta = i + 1 < partes.length ? partes[i + 1][1] : out.length;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="2000" viewBox="0 0 1000 1000"><defs>${defs.join("")}</defs>${out.slice(desde, hasta).join("")}</svg>
`;
    writeFileSync(join(PARTES, `${nombre}__${String(i + 1).padStart(2, "0")}_${parte}.svg`), svg);
  });
  console.log("✓", `${partes.length} partes de ${nombre} en arte-krita/fuentes/`);
}

/** Círculo sobre una pared (plano u = cte o v = cte), como polígono: así no hace falta transformar nada. */
export function circuloPared(plano: "u" | "v", pos: number, c: number, zc: number, r: number, fill: string, g = 1.8, extra = ""): string {
  const pts: P3[] = Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2, s = c + Math.cos(a) * r, z = zc + Math.sin(a) * r;
    return plano === "u" ? [pos, s, z] : [s, pos, z];
  });
  return cara(pts, fill, g, extra);
}

/** Cojín apoyado en un respaldo (plano v = cte): un cuadrado de lados abombados, con su costura. */
export function cojin(u0: number, u1: number, v: number, z0: number, z1: number, fill: string): string {
  const q = [xy([u0, v, z0]), xy([u1, v, z0]), xy([u1, v, z1]), xy([u0, v, z1])];
  const c = { x: q.reduce((s, p) => s + p.x, 0) / 4, y: q.reduce((s, p) => s + p.y, 0) / 4 };
  /** Punto medio de un lado, empujado hacia afuera del centro. */
  const bulto = (a: { x: number; y: number }, b: { x: number; y: number }, k: number) => {
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    return { x: m.x + (m.x - c.x) * k, y: m.y + (m.y - c.y) * k };
  };
  const borde = (k: number, e: number) => {
    const r = q.map((p) => ({ x: c.x + (p.x - c.x) * e, y: c.y + (p.y - c.y) * e }));
    return `M${f(r[0].x)} ${f(r[0].y)} ` + r.map((p, i) => {
      const n = r[(i + 1) % 4], m = bulto(p, n, k);
      return `Q${f(m.x)} ${f(m.y)} ${f(n.x)} ${f(n.y)}`;
    }).join(" ") + " Z";
  };
  return `<path d="${borde(0.28, 1)}" fill="${fill}" ${trazo(1.5)}/><path d="${borde(0.2, 0.72)}" fill="none" stroke="#FFFFFF" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.7"/>`;
}
