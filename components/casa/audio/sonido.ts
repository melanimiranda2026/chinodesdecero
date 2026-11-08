/** Efectos y música de fondo. Todo es opcional: si el navegador no deja, se ignora. */

export const VOLUMEN_MUSICA = 0.16;
export const VOLUMEN_MUSICA_BAJO = 0.03;
const VOLUMEN_SFX = 0.55;

export type Pista = "cocina" | "g-cortar" | "g-frotar" | "g-llenar" | "g-beber" | "g-girar" | "g-morder";

export function sfx(nombre: string): void {
  if (typeof Audio === "undefined") return;
  try {
    const a = new Audio(`/sfx/${nombre}.mp3`);
    a.volume = VOLUMEN_SFX;
    void Promise.resolve(a.play()).catch(() => {});
  } catch {
    /* sin sonido */
  }
}

let el: HTMLAudioElement | null = null;
let base = VOLUMEN_MUSICA;
let bajada = false;

function aplicarVolumen() {
  if (el) el.volume = bajada ? Math.min(base, VOLUMEN_MUSICA_BAJO) : base;
}

export const musica = {
  tocar(pista: Pista): void {
    if (typeof Audio === "undefined") return;
    try {
      if (el) el.pause();
      el = new Audio(`/musica/${pista}.mp3`);
      el.loop = true;
      aplicarVolumen();
      void Promise.resolve(el.play()).catch(() => {});
    } catch {
      /* sin música */
    }
  },
  parar(): void {
    try { el?.pause(); } catch { /* nada */ }
    el = null;
  },
  /** Volumen normal de la música (0–1). */
  volumen(v: number): void {
    base = Math.max(0, Math.min(1, v));
    aplicarVolumen();
  },
  /** La voz baja la música a 0.03 mientras suena mandarín y la restaura al terminar. */
  bajar(si: boolean): void {
    bajada = si;
    aplicarVolumen();
  },
};
