import { cargar, contexto, listo } from "./motor";

/** Efectos y música de fondo. Todo es opcional: si el navegador no deja, se ignora. */

export const VOLUMEN_MUSICA = 0.16;
export const VOLUMEN_MUSICA_BAJO = 0.03;
const VOLUMEN_SFX = 0.55;

export type Pista = "cocina" | "g-cortar" | "g-frotar" | "g-llenar" | "g-beber" | "g-girar" | "g-morder";

/** Mientras habla la vaca: la música baja y los efectos no suenan. */
let vozActiva = false;
/** Efectos sonando ahora (para cortarlos si empieza el mandarín). */
const sonando = new Set<() => void>();

/** Toca un efecto. Nunca encima del mandarín: si la vaca está hablando, no suena. */
export function sfx(nombre: string): void {
  if (vozActiva) return;
  const url = `/sfx/${nombre}.mp3`;
  if (contexto()) {
    void (async () => {
      const c = await listo();
      const b = c && (await cargar(url));
      if (!c || !b || vozActiva) return;
      const g = c.createGain();
      g.gain.value = VOLUMEN_SFX;
      const s = c.createBufferSource();
      s.buffer = b;
      s.connect(g);
      g.connect(c.destination);
      const cortar = () => {
        sonando.delete(cortar);
        try {
          s.stop();
          s.disconnect();
          g.disconnect();
        } catch {
          /* ya terminó */
        }
      };
      s.onended = cortar;
      sonando.add(cortar);
      s.start();
    })().catch(() => {});
    return;
  }
  if (typeof Audio === "undefined") return;
  try {
    const a = new Audio(url);
    a.volume = VOLUMEN_SFX;
    const cortar = () => {
      sonando.delete(cortar);
      try { a.pause(); } catch { /* nada */ }
    };
    a.onended = cortar;
    sonando.add(cortar);
    void Promise.resolve(a.play()).catch(cortar);
  } catch {
    /* sin sonido */
  }
}

// ---- música: un buffer en loop con su GainNode (o HTMLAudio sin Web Audio) ----
let fuente: AudioBufferSourceNode | null = null;
let ganancia: GainNode | null = null;
let el: HTMLAudioElement | null = null;
let pedido = 0;

const volumen = () => (vozActiva ? Math.min(VOLUMEN_MUSICA, VOLUMEN_MUSICA_BAJO) : VOLUMEN_MUSICA);

function aplicarVolumen() {
  const v = volumen();
  if (el) el.volume = v;
  if (ganancia) {
    try {
      const c = contexto();
      if (c && typeof ganancia.gain.setTargetAtTime === "function") {
        ganancia.gain.cancelScheduledValues?.(c.currentTime);
        ganancia.gain.setTargetAtTime(v, c.currentTime, 0.05);
      } else {
        ganancia.gain.value = v;
      }
    } catch {
      ganancia.gain.value = v;
    }
  }
}

function soltarMusica() {
  try {
    fuente?.stop();
    fuente?.disconnect();
    ganancia?.disconnect();
  } catch {
    /* nada */
  }
  fuente = null;
  ganancia = null;
  try { el?.pause(); } catch { /* nada */ }
  el = null;
}

export const musica = {
  tocar(pista: Pista): void {
    soltarMusica();
    const n = ++pedido;
    const url = `/musica/${pista}.mp3`;
    if (contexto()) {
      void (async () => {
        const c = await listo();
        const b = c && (await cargar(url));
        if (!c || !b || n !== pedido) return;
        const g = c.createGain();
        g.gain.value = volumen();
        const s = c.createBufferSource();
        s.buffer = b;
        s.loop = true;
        s.connect(g);
        g.connect(c.destination);
        s.start();
        fuente = s;
        ganancia = g;
      })().catch(() => {});
      return;
    }
    if (typeof Audio === "undefined") return;
    try {
      el = new Audio(url);
      el.loop = true;
      aplicarVolumen();
      void Promise.resolve(el.play()).catch(() => {});
    } catch {
      /* sin música */
    }
  },
  parar(): void {
    pedido++;
    soltarMusica();
  },
  /**
   * La voz avisa que empieza (true) o termina (false) el mandarín: la música baja a 0.03 y se restaura,
   * y mientras tanto los efectos no suenan (los que sonaban se cortan).
   */
  bajar(si: boolean): void {
    vozActiva = si;
    if (si) for (const cortar of [...sonando]) cortar();
    aplicarVolumen();
  },
};
