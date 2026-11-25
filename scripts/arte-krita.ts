/**
 * Puente con Krita (ver docs/arte.md, "Pintar en Krita con capas").
 *
 *   npm run arte:krita            arma arte-krita/<objeto>.ora: un archivo por objeto con sus capas separadas y con
 *                                 nombre, y arte-krita/cuarto_<cuarto>.ora (cocina, living, baño, dormitorio) con cada cuarto partido
 *                                 en piezas.
 *                                 No pisa un .ora que ya exista (es tu trabajo); con `-- --forzar` lo rehace.
 *   npm run arte:krita-importar   lee los .ora que guardaste en Krita y deja en public/arte/<cuarto>/ un PNG
 *                                 por cada capa que cambiaste (las que no tocaste siguen con su dibujo actual).
 *
 * OpenRaster (.ora) es un zip con un PNG por capa y un stack.xml; Krita lo abre y lo guarda con capas.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { crc32, deflateRawSync, inflateRawSync } from "node:zlib";
import sharp from "sharp";

const RAIZ = process.cwd();
const ARTE = join(RAIZ, "public", "arte", "cocina");
/** Carpeta de public/arte/ de cada cuarto. */
const CUARTOS: Record<string, string> = { cuarto_cocina: "cocina", cuarto_living: "living", cuarto_bano: "bano", cuarto_dormitorio: "dormitorio" };
const KRITA = join(RAIZ, "arte-krita");
/** El botón Play dibujado en Krita (`boton play<versión>.ora`) queda guardado ahí, pero por ahora no se usa ni se importa. */
const BOTON_PLAY = /^boton play.*\.ora$/i;
const FUENTES = join(KRITA, "fuentes");

/** Capas de cada objeto, de atrás hacia adelante (el mismo orden en que el juego las apila). */
const OBJETOS: Record<string, { capas: string[]; ocultas?: string[] }> = {
  bingxiang: { capas: ["cuerpo", "interior", "puerta"] },
  pingguo: { capas: ["entera", "mugre", "mitad_izq", "mitad_der"], ocultas: ["mitad_izq", "mitad_der"] },
  beizi: { capas: ["agua", "te", "vaso", "mugre"], ocultas: ["te"] },
  panzi: { capas: ["plato", "jiaozi", "mugre"] },
  wan: { capas: ["bol", "arroz", "mugre"] },
  guo: { capas: ["olla", "arroz", "mugre"] },
  chahu: { capas: ["tetera"] },
  kuaizi: { capas: ["palillos"] },
};

// ---------------------------------------------------------------- zip mínimo (lo justo para OpenRaster)
type Entrada = { nombre: string; datos: Buffer; guardar?: boolean };

function zip(entradas: Entrada[]): Buffer {
  const locales: Buffer[] = [];
  const centrales: Buffer[] = [];
  let offset = 0;
  for (const e of entradas) {
    const nombre = Buffer.from(e.nombre, "utf8");
    const comprimido = e.guardar ? e.datos : deflateRawSync(e.datos);
    const metodo = e.guardar ? 0 : 8;
    const crc = crc32(e.datos);
    const loc = Buffer.alloc(30);
    loc.writeUInt32LE(0x04034b50, 0); loc.writeUInt16LE(20, 4); loc.writeUInt16LE(0x0800, 6); loc.writeUInt16LE(metodo, 8);
    loc.writeUInt16LE(0, 10); loc.writeUInt16LE(0x21, 12); loc.writeUInt32LE(crc, 14);
    loc.writeUInt32LE(comprimido.length, 18); loc.writeUInt32LE(e.datos.length, 22); loc.writeUInt16LE(nombre.length, 26);
    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0); cen.writeUInt16LE(20, 4); cen.writeUInt16LE(20, 6); cen.writeUInt16LE(0x0800, 8);
    cen.writeUInt16LE(metodo, 10); cen.writeUInt16LE(0, 12); cen.writeUInt16LE(0x21, 14); cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(comprimido.length, 20); cen.writeUInt32LE(e.datos.length, 24); cen.writeUInt16LE(nombre.length, 28);
    cen.writeUInt32LE(offset, 42);
    locales.push(loc, nombre, comprimido);
    centrales.push(cen, nombre);
    offset += loc.length + nombre.length + comprimido.length;
  }
  const dir = Buffer.concat(centrales);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0); fin.writeUInt16LE(entradas.length, 8); fin.writeUInt16LE(entradas.length, 10);
  fin.writeUInt32LE(dir.length, 12); fin.writeUInt32LE(offset, 16);
  return Buffer.concat([...locales, dir, fin]);
}

function unzip(buf: Buffer): Map<string, Buffer> {
  let fin = buf.length - 22;
  while (fin >= 0 && buf.readUInt32LE(fin) !== 0x06054b50) fin--;
  if (fin < 0) throw new Error("no es un zip");
  const total = buf.readUInt16LE(fin + 10);
  let p = buf.readUInt32LE(fin + 16);
  const salida = new Map<string, Buffer>();
  for (let i = 0; i < total; i++) {
    const metodo = buf.readUInt16LE(p + 10);
    const tam = buf.readUInt32LE(p + 20);
    const largoNombre = buf.readUInt16LE(p + 28), extra = buf.readUInt16LE(p + 30), coment = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const nombre = buf.subarray(p + 46, p + 46 + largoNombre).toString("utf8");
    const ini = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const crudo = buf.subarray(ini, ini + tam);
    salida.set(nombre, metodo === 0 ? Buffer.from(crudo) : inflateRawSync(crudo));
    p += 46 + largoNombre + extra + coment;
  }
  return salida;
}

// ---------------------------------------------------------------- imágenes
type Rgba = { w: number; h: number; px: Buffer };

async function rgba(entrada: Buffer | string): Promise<Rgba> {
  const { data, info } = await sharp(entrada).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, px: data };
}
const aPng = (img: Rgba) => sharp(img.px, { raw: { width: img.w, height: img.h, channels: 4 } }).png().toBuffer();
const vacia = (w: number, h: number): Rgba => ({ w, h, px: Buffer.alloc(w * h * 4) });

/** Pega `capa` sobre `base` (en su lugar x, y), con su opacidad. */
function pegar(base: Rgba, capa: Rgba, x: number, y: number, opacidad: number) {
  for (let j = 0; j < capa.h; j++) {
    const by = y + j;
    if (by < 0 || by >= base.h) continue;
    for (let i = 0; i < capa.w; i++) {
      const bx = x + i;
      if (bx < 0 || bx >= base.w) continue;
      const s = (j * capa.w + i) * 4, d = (by * base.w + bx) * 4;
      const as = (capa.px[s + 3] / 255) * opacidad;
      if (as === 0) continue;
      const ad = base.px[d + 3] / 255;
      const ao = as + ad * (1 - as);
      for (let c = 0; c < 3; c++) base.px[d + c] = Math.round((capa.px[s + c] * as + base.px[d + c] * ad * (1 - as)) / ao);
      base.px[d + 3] = Math.round(ao * 255);
    }
  }
}

/** ¿Cambió el dibujo? Cuenta los píxeles que se ven distintos (ignora el color de lo que es transparente). */
function cambio(a: Rgba, b: Rgba): number {
  if (a.w !== b.w || a.h !== b.h) return 1;
  let distintos = 0;
  for (let k = 0; k < a.px.length; k += 4) {
    const aa = a.px[k + 3], ab = b.px[k + 3];
    if (aa < 4 && ab < 4) continue;
    if (Math.abs(aa - ab) > 6 || Math.abs(a.px[k] - b.px[k]) > 6 || Math.abs(a.px[k + 1] - b.px[k + 1]) > 6 || Math.abs(a.px[k + 2] - b.px[k + 2]) > 6) distintos++;
  }
  return distintos / (a.w * a.h);
}

/** El dibujo que usa hoy el juego para una capa: tu WebP/PNG si existe, si no el SVG generado. */
function archivoActual(nombre: string, dir = ARTE): string {
  for (const ext of [".webp", ".png", ".svg"]) {
    const ruta = join(dir, nombre + ext);
    if (existsSync(ruta)) return ruta;
  }
  throw new Error(`falta ${join(dir, nombre)}.svg (corre npm run arte:generar)`);
}
async function dibujoActual(nombre: string, lado: number, dir = ARTE): Promise<Rgba> {
  const img = await rgba(readFileSync(archivoActual(nombre, dir)));
  if (img.w === lado && img.h === lado) return img;
  return rgba(await sharp(readFileSync(archivoActual(nombre, dir))).resize(lado, lado).png().toBuffer());
}

// ---------------------------------------------------------------- exportar
type CapaOra = { nombre: string; img: Rgba; visible: boolean };

async function escribirOra(destino: string, lado: number, capas: CapaOra[]) {
  // stack.xml va de adelante hacia atrás; `capas` viene de atrás hacia adelante
  const arriba = [...capas].reverse();
  const fusion = vacia(lado, lado);
  for (const c of capas) if (c.visible) pegar(fusion, c.img, 0, 0, 1);
  const pila = arriba
    .map((c) => `<layer name="${c.nombre}" src="data/${c.nombre}.png" x="0" y="0" opacity="1.000" visibility="${c.visible ? "visible" : "hidden"}" composite-op="svg:src-over"/>`)
    .join("");
  const mezcla = await aPng(fusion);
  const entradas: Entrada[] = [
    { nombre: "mimetype", datos: Buffer.from("image/openraster"), guardar: true },
    { nombre: "stack.xml", datos: Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>\n<image version="0.0.5" w="${lado}" h="${lado}" xres="72" yres="72"><stack>${pila}</stack></image>\n`) },
    ...(await Promise.all(capas.map(async (c) => ({ nombre: `data/${c.nombre}.png`, datos: await aPng(c.img), guardar: true })))),
    { nombre: "mergedimage.png", datos: mezcla, guardar: true },
    { nombre: "Thumbnails/thumbnail.png", datos: await sharp(mezcla).resize(256, 256).png().toBuffer(), guardar: true },
  ];
  writeFileSync(destino, zip(entradas));
}

async function exportar(forzar: boolean) {
  mkdirSync(KRITA, { recursive: true });
  let hechos = 0, saltados = 0;
  const toca = (nombre: string) => {
    const ya = existsSync(join(KRITA, `${nombre}.ora`));
    if (ya && !forzar) { saltados++; console.log(`· ${nombre}.ora ya existe (no lo toco; usa --forzar para rehacerlo)`); }
    return !ya || forzar;
  };

  for (const [id, o] of Object.entries(OBJETOS)) {
    if (!toca(id)) continue;
    const capas = await Promise.all(
      o.capas.map(async (c) => ({ nombre: c, img: await dibujoActual(`${id}_${c}`, 1024), visible: !o.ocultas?.includes(c) })),
    );
    await escribirOra(join(KRITA, `${id}.ora`), 1024, capas);
    hechos++;
    console.log(`✓ ${id}.ora (${o.capas.join(", ")})`);
  }

  for (const [cuarto, carpeta] of Object.entries(CUARTOS)) {
    if (!toca(cuarto)) continue;
    const dir = join(RAIZ, "public", "arte", carpeta);
    const propio = [".webp", ".png"].some((e) => existsSync(join(dir, cuarto + e)));
    const partes = existsSync(FUENTES) ? readdirSync(FUENTES).filter((n) => n.startsWith(cuarto + "__") && n.endsWith(".svg")).sort() : [];
    if (!partes.length) throw new Error("faltan las partes del cuarto en arte-krita/fuentes/ (corre npm run arte:generar)");
    const capas: CapaOra[] = await Promise.all(
      partes.map(async (n) => ({ nombre: n.slice(cuarto.length + 2, -4).replace(/^\d+_/, ""), img: await rgba(readFileSync(join(FUENTES, n))), visible: true })),
    );
    // si ya repintaste el cuarto entero, tu dibujo va arriba y las piezas generadas quedan ocultas debajo
    if (propio) {
      for (const c of capas) c.visible = false;
      capas.push({ nombre: "tu_dibujo", img: await dibujoActual(cuarto, 2000, dir), visible: true });
    }
    await escribirOra(join(KRITA, `${cuarto}.ora`), 2000, capas);
    hechos++;
    console.log(`✓ ${cuarto}.ora (${capas.map((c) => c.nombre).join(", ")})`);
  }
  console.log(`listo: ${hechos} archivo(s) en arte-krita/${saltados ? `, ${saltados} sin tocar` : ""}`);
}

// ---------------------------------------------------------------- importar
type Nodo = { tipo: "capa" | "grupo"; nombre: string; src?: string; x: number; y: number; opacidad: number; visible: boolean; hijos: Nodo[] };

function leerPila(xml: string): Nodo {
  const raiz: Nodo = { tipo: "grupo", nombre: "", x: 0, y: 0, opacidad: 1, visible: true, hijos: [] };
  const pila: Nodo[] = [];
  const attrs = (s: string) => Object.fromEntries([...s.matchAll(/([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)].map((m) => [m[1], m[3] ?? m[4]]));
  const nodo = (tipo: Nodo["tipo"], a: Record<string, string>): Nodo => ({
    tipo, nombre: a.name ?? "", src: a.src, x: Number(a.x ?? 0), y: Number(a.y ?? 0),
    opacidad: a.opacity === undefined ? 1 : Number(a.opacity), visible: a.visibility !== "hidden", hijos: [],
  });
  for (const m of xml.matchAll(/<(\/?)(stack|layer)\b([^>]*?)(\/?)>/g)) {
    const [, cierra, etiqueta, resto, solo] = m;
    if (etiqueta === "layer") { (pila.at(-1) ?? raiz).hijos.push(nodo("capa", attrs(resto))); continue; }
    if (cierra) { pila.pop(); continue; }
    const g = pila.length === 0 ? raiz : nodo("grupo", attrs(resto));
    if (pila.length) pila.at(-1)!.hijos.push(g);
    if (!solo) pila.push(g);
  }
  return raiz;
}

/** Aplana un nodo (capa o grupo) sobre un lienzo vacío, respetando lo oculto y la opacidad de lo que va dentro. */
async function aplanar(n: Nodo, archivos: Map<string, Buffer>, w: number, h: number): Promise<Rgba> {
  const lienzo = vacia(w, h);
  const dibujar = async (m: Nodo, ox: number, oy: number, op: number) => {
    if (m.tipo === "capa") {
      const datos = m.src ? archivos.get(m.src) : undefined;
      if (datos) pegar(lienzo, await rgba(datos), ox + m.x, oy + m.y, op * m.opacidad);
      return;
    }
    for (const hijo of [...m.hijos].reverse()) if (hijo.visible) await dibujar(hijo, ox + m.x, oy + m.y, op * m.opacidad);
  };
  await dibujar(n, 0, 0, 1);
  return lienzo;
}

async function guardarSiCambio(nombre: string, img: Rgba, lado: number, dir = ARTE): Promise<boolean> {
  const antes = await dibujoActual(nombre, lado, dir);
  if (cambio(antes, img) < 0.0002) return false;
  writeFileSync(join(dir, `${nombre}.png`), await aPng(img));
  return true;
}

async function importar() {
  if (!existsSync(KRITA)) throw new Error("no hay carpeta arte-krita/ (corre npm run arte:krita)");
  const oras = readdirSync(KRITA).filter((n) => n.toLowerCase().endsWith(".ora"));
  const kras = readdirSync(KRITA).filter((n) => n.toLowerCase().endsWith(".kra"));
  if (kras.length) console.log(`! ${kras.join(", ")}: los .kra no se leen. En Krita usa Archivo → Guardar como… → OpenRaster (.ora).`);
  let escritos = 0;

  for (const archivo of oras) {
    if (BOTON_PLAY.test(archivo)) continue;
    const id = basename(archivo, ".ora");
    const archivos = unzip(readFileSync(join(KRITA, archivo)));
    const xml = archivos.get("stack.xml")?.toString("utf8");
    if (!xml) { console.log(`! ${archivo}: no tiene stack.xml, lo salto`); continue; }
    const w = Number(xml.match(/<image\b[^>]*\bw\s*=\s*["'](\d+)/)?.[1]);
    const h = Number(xml.match(/<image\b[^>]*\bh\s*=\s*["'](\d+)/)?.[1]);

    if (id in CUARTOS) {
      if (w !== 2000 || h !== 2000) { console.log(`! ${archivo}: el lienzo es ${w}×${h}, tiene que ser 2000×2000. No lo importo.`); continue; }
      const fusion = archivos.get("mergedimage.png");
      const img = fusion ? await rgba(fusion) : await aplanar(leerPila(xml), archivos, w, h);
      if (await guardarSiCambio(id, img, 2000, join(RAIZ, "public", "arte", CUARTOS[id]))) { escritos++; console.log(`✓ ${id}.png (todo lo visible, junto)`); }
      else console.log(`· ${id}: sin cambios`);
      continue;
    }

    const obj = OBJETOS[id];
    if (!obj) { console.log(`! ${archivo}: no sé qué objeto es (los nombres válidos son ${Object.keys(OBJETOS).join(", ")})`); continue; }
    if (w !== 1024 || h !== 1024) { console.log(`! ${archivo}: el lienzo es ${w}×${h}, tiene que ser 1024×1024. No lo importo.`); continue; }
    const raiz = leerPila(xml);
    const cambiadas: string[] = [];
    for (const hijo of raiz.hijos) {
      if (!obj.capas.includes(hijo.nombre)) {
        console.log(`! ${archivo}: la capa "${hijo.nombre}" no es de ${id} (${obj.capas.join(", ")}). Píntala dentro de una de esas, o métela en un grupo con ese nombre.`);
        continue;
      }
      // la capa de arriba se exporta aunque esté oculta: el juego decide cuándo se ve
      const img = await aplanar({ ...hijo, visible: true }, archivos, w, h);
      if (await guardarSiCambio(`${id}_${hijo.nombre}`, img, 1024)) cambiadas.push(hijo.nombre);
    }
    escritos += cambiadas.length;
    console.log(cambiadas.length ? `✓ ${id}: ${cambiadas.map((c) => `${id}_${c}.png`).join(", ")}` : `· ${id}: sin cambios`);
  }
  console.log(`listo: ${escritos} PNG nuevo(s) o actualizado(s) en public/arte/`);
}

if (process.argv[1]?.endsWith("arte-krita.ts")) {
  const args = process.argv.slice(2);
  (args[0] === "importar" ? importar() : exportar(args.includes("--forzar"))).catch((e) => {
    console.error("✗", e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
