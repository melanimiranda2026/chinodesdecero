import publicados from "./publicados.json";
import { SERIES, type Serie, type VideoSerie } from "./series";

type Entrada = { estado: "publicado"; tiktok: string; fecha: string } | { estado: "programado"; fecha: string };
export type Catalogo = { generado: string; videos: Record<string, Entrada> };

export type VideoListo = VideoSerie & { estado: "publicado"; tiktok: string };
export type VideoPronto = VideoSerie & { estado: "programado"; fecha: string };
export type VideoEnSerie = VideoListo | VideoPronto;
export type ParteLista = { titulo?: string; videos: VideoEnSerie[] };

/** Cruza un video de la serie con lo que dice Tu Parrilla. Sin publicar ni programar: no se muestra. */
export function estadoDe(v: VideoSerie, cat: Catalogo): VideoEnSerie | null {
  if (v.tiktok) return { ...v, estado: "publicado", tiktok: v.tiktok };
  const e = cat.videos[v.pieza];
  if (!e) return null;
  return e.estado === "publicado" ? { ...v, estado: "publicado", tiktok: e.tiktok } : { ...v, estado: "programado", fecha: e.fecha };
}

export function partesDe(serie: Serie, cat: Catalogo = publicados as Catalogo): ParteLista[] {
  return serie.partes
    .map((p) => ({ titulo: p.titulo, videos: p.videos.map((v) => estadoDe(v, cat)).filter((v): v is VideoEnSerie => v !== null) }))
    .filter((p) => p.videos.length > 0);
}

/** Las series con al menos un video publicado o programado. */
export function seriesVisibles(cat: Catalogo = publicados as Catalogo) {
  return SERIES.map((s) => {
    const partes = partesDe(s, cat);
    const todos = partes.flatMap((p) => p.videos);
    return { serie: s, partes, listos: todos.filter((v) => v.estado === "publicado").length, prontos: todos.filter((v) => v.estado === "programado").length };
  }).filter((s) => s.listos + s.prontos > 0);
}

export function serieDe(slug: string) {
  return seriesVisibles().find((s) => s.serie.slug === slug) ?? null;
}

/** Reproductor oficial de TikTok: la vista cuenta en TikTok. Sin videos sugeridos al final (rel=0). */
export function urlReproductor(id: string) {
  return `https://www.tiktok.com/player/v1/${id}?rel=0&description=1&music_info=0&native_context_menu=1&closed_caption=1`;
}

export function urlTikTok(id: string) {
  return `https://www.tiktok.com/@chinocomprensible/video/${id}`;
}

/** "28 nov." en hora de Chile. */
export function fechaCorta(iso: string) {
  return new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short", timeZone: "America/Santiago" }).format(new Date(iso));
}
