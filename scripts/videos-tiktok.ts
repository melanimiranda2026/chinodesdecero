/**
 * Trae de Tu Parrilla los videos de TikTok de la cuenta "second brain" y escribe
 * `lib/videos/publicados.json`: por cada `pieza`, su id de TikTok (si ya salió) o su fecha programada.
 *
 * Correr con `npm run videos` y volver a publicar la web: así los videos programados pasan a verse.
 * La llave se lee de `../.env.local` (API_KEY_PARRILLA) y nunca se escribe en ningún archivo.
 * El JSON solo guarda datos públicos (id del video y fecha), ni textos ni métricas.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = "https://tu-parrilla.cl";
const CUENTA = "second brain";
const DESDE = "2026-10-01";
const SALIDA = "lib/videos/publicados.json";

export type Publicado = { estado: "publicado"; tiktok: string; fecha: string };
export type Programado = { estado: "programado"; fecha: string };
export type Catalogo = { generado: string; videos: Record<string, Publicado | Programado> };

type FilaMetrica = {
  red: string;
  cuenta: { nombre: string };
  externalId: string | null;
  publicadoEl: string;
  atributos: { pieza?: string } | null;
  metricas: { views: number | null };
};
type PostProgramado = {
  fecha: string;
  atributos: { pieza?: string } | null;
  redes: { red: string; handle: string; estado: string }[];
};

function llave(): string {
  const env = readFileSync(join("..", ".env.local"), "utf8");
  const m = env.match(/^API_KEY_PARRILLA=(.*)$/m);
  if (!m) throw new Error("Falta API_KEY_PARRILLA en ../.env.local");
  return m[1].trim().replace(/^["']|["']$/g, "");
}

async function pedir<T>(ruta: string, k: string): Promise<T> {
  const r = await fetch(BASE + ruta, { headers: { Authorization: `Bearer ${k}` } });
  if (!r.ok) throw new Error(`${ruta}: ${r.status} ${await r.text()}`);
  return (await r.json()) as T;
}

/** Une lo publicado y lo programado. Si una pieza salió dos veces, gana la de más vistas. */
export function armarCatalogo(publicadas: FilaMetrica[], programadas: PostProgramado[], ahora = new Date()): Catalogo {
  const videos: Catalogo["videos"] = {};
  const vistas: Record<string, number> = {};
  for (const f of publicadas) {
    const pieza = f.atributos?.pieza;
    if (f.red !== "tiktok" || f.cuenta.nombre !== CUENTA || !pieza || !f.externalId) continue;
    const v = f.metricas.views ?? 0;
    if (pieza in vistas && vistas[pieza] >= v) continue;
    vistas[pieza] = v;
    videos[pieza] = { estado: "publicado", tiktok: f.externalId, fecha: f.publicadoEl };
  }
  for (const p of programadas) {
    const pieza = p.atributos?.pieza;
    const aTikTok = p.redes.some((r) => r.red === "tiktok" && r.handle === CUENTA);
    if (!pieza || !aTikTok) continue;
    const previa = videos[pieza];
    if (previa?.estado === "publicado") continue;
    if (!previa || p.fecha < previa.fecha) videos[pieza] = { estado: "programado", fecha: p.fecha };
  }
  return { generado: ahora.toISOString(), videos };
}

async function main() {
  const k = llave();
  const hoy = new Date().toISOString().slice(0, 10);
  const met = await pedir<{ truncado: boolean; posts: FilaMetrica[] }>(`/api/metrics/posts?desde=${DESDE}&hasta=${hoy}`, k);
  if (met.truncado) console.warn("Ojo: la API cortó la lista de métricas (truncado). Subir DESDE.");
  const prog = await pedir<{ posts: PostProgramado[] }>("/api/schedule/posts?estado=scheduled", k);
  const cat = armarCatalogo(met.posts, prog.posts);
  writeFileSync(SALIDA, JSON.stringify(cat, null, 2) + "\n");
  const n = Object.values(cat.videos);
  console.log(
    `${n.filter((v) => v.estado === "publicado").length} publicados, ${n.filter((v) => v.estado === "programado").length} programados → ${SALIDA}`,
  );
}

if (process.argv[1]?.endsWith("videos-tiktok.ts")) void main();
