import { idAudio, type Silaba } from "@/lib/silabas";
import { cargar, contexto, listo } from "./motor";
import { musica } from "./sonido";

export { desbloquearAudio } from "./motor";

export interface OpcionesDecir {
  alBoca?: (abierta: number) => void;
}

let cortarActual: (() => void) | null = null;

/** Corta la frase que esté sonando (su `decir` resuelve). */
export function callar(): void {
  cortarActual?.();
}

/**
 * Toca la frase con la voz de la vaca. SIEMPRE resuelve: al terminar, ante un error (fetch 404,
 * decodificación, play() rechazado), si se pide otra frase, o al pasar 500 + 380·sílabas + 1500 ms
 * sin que empiece (ya sonando: la duración real + 1500 ms).
 * Resuelve `true` solo si el audio llegó a sonar.
 */
export function decir(s: Silaba[], opciones: OpcionesDecir = {}): Promise<boolean> {
  cortarActual?.();
  const { alBoca } = opciones;
  const src = `/audio/cocina/${idAudio(s)}.mp3`;

  return new Promise<boolean>((resolver) => {
    let terminado = false;
    let sono = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let intervalo: ReturnType<typeof setInterval> | undefined;
    let audio: HTMLAudioElement | null = null;
    let fuente: AudioBufferSourceNode | null = null;
    let analizador: AnalyserNode | null = null;

    const terminar = () => {
      if (terminado) return;
      terminado = true;
      if (timeout !== undefined) clearTimeout(timeout);
      if (intervalo !== undefined) clearInterval(intervalo);
      if (cortarActual === terminar) {
        cortarActual = null;
        musica.bajar(false);
      }
      try {
        if (fuente) {
          fuente.onended = null;
          fuente.stop();
        }
      } catch { /* ya terminó */ }
      try {
        if (audio) {
          audio.onended = null;
          audio.onerror = null;
          audio.pause();
        }
      } catch { /* nada */ }
      try { fuente?.disconnect(); analizador?.disconnect(); } catch { /* nada */ }
      try { alBoca?.(0); } catch { /* nada */ }
      resolver(sono);
    };

    /** La boca se mueve recién cuando suena: por el analizador, o alternando si no hay Web Audio. */
    const mover = (an: AnalyserNode | null) => {
      if (!alBoca || terminado) return;
      if (an) {
        const datos = new Uint8Array(an.fftSize);
        intervalo = setInterval(() => {
          try {
            an.getByteTimeDomainData(datos);
            let suma = 0;
            for (const d of datos) suma += ((d - 128) / 128) ** 2;
            alBoca(Math.min(1, Math.sqrt(suma / datos.length) * 4));
          } catch {
            try { alBoca(0); } catch { /* nada */ }
          }
        }, 33);
      } else {
        let abierta = 0;
        intervalo = setInterval(() => {
          abierta = abierta ? 0 : 1;
          alBoca(abierta);
        }, 130);
      }
    };

    /** Sin Web Audio (o sin poder desbloquearlo): HTMLAudio como antes. */
    const conElemento = () => {
      if (typeof Audio === "undefined") throw new Error("sin Audio");
      audio = new Audio(src);
      audio.onended = terminar;
      audio.onerror = terminar;
      void Promise.resolve(audio.play()).then(() => {
        if (terminado) return;
        sono = true;
        mover(null);
      }, terminar);
    };

    const conBuffer = async () => {
      const c = await listo();
      if (terminado) return;
      if (!c) return conElemento();
      const b = await cargar(src);
      if (terminado) return;
      if (!b) return terminar();
      fuente = c.createBufferSource();
      fuente.buffer = b;
      if (alBoca) {
        try {
          analizador = c.createAnalyser();
          analizador.fftSize = 256;
        } catch {
          analizador = null;
        }
      }
      if (analizador) {
        fuente.connect(analizador);
        analizador.connect(c.destination);
      } else {
        fuente.connect(c.destination);
      }
      fuente.onended = terminar;
      fuente.start();
      sono = true;
      if (timeout !== undefined) clearTimeout(timeout);
      timeout = setTimeout(terminar, (b.duration || 0) * 1000 + 1500);
      mover(analizador);
    };

    cortarActual = terminar;
    musica.bajar(true);
    timeout = setTimeout(terminar, 500 + 380 * s.length + 1500);

    try {
      if (contexto()) conBuffer().catch(terminar);
      else conElemento();
    } catch {
      terminar();
    }
  });
}
