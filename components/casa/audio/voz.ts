import { idAudio, type Silaba } from "@/lib/silabas";
import { musica } from "./sonido";

export interface OpcionesDecir {
  alBoca?: (abierta: number) => void;
  lento?: boolean;
}

let ctx: AudioContext | null = null;

/** Se llama en el primer toque (botón "Entrar"): crea/reanuda el AudioContext. */
export function desbloquearAudio(): void {
  try {
    const Ctor =
      typeof window !== "undefined"
        ? window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        : undefined;
    if (!Ctor) return;
    ctx ??= new Ctor();
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  } catch {
    ctx = null;
  }
}

let cortarActual: (() => void) | null = null;

/**
 * Toca la frase con la voz de la vaca. SIEMPRE resuelve: al terminar, ante un error,
 * si play() es rechazado, si se pide otra frase, o al pasar 500 + 380·sílabas + 1500 ms.
 */
export function decir(s: Silaba[], opciones: OpcionesDecir = {}): Promise<void> {
  cortarActual?.();
  const { alBoca, lento } = opciones;
  const src = `/audio/cocina/${idAudio(s)}${lento ? "_lento" : ""}.mp3`;

  return new Promise<void>((resolver) => {
    let terminado = false;
    // eslint-disable-next-line prefer-const -- se lee en terminar() antes de asignarse
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let intervalo: ReturnType<typeof setInterval> | undefined;
    let audio: HTMLAudioElement | null = null;
    let fuente: MediaElementAudioSourceNode | null = null;
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
        if (audio) {
          audio.onended = null;
          audio.onerror = null;
          audio.pause();
        }
      } catch { /* nada */ }
      try { fuente?.disconnect(); analizador?.disconnect(); } catch { /* nada */ }
      try { alBoca?.(0); } catch { /* nada */ }
      resolver();
    };

    cortarActual = terminar;
    musica.bajar(true);
    timeout = setTimeout(terminar, 500 + 380 * s.length + 1500);

    try {
      if (typeof Audio === "undefined") throw new Error("sin Audio");
      audio = new Audio(src);
      audio.onended = terminar;
      audio.onerror = terminar;

      if (ctx && ctx.state === "suspended") void ctx.resume().catch(() => {});
      // Solo se enruta por el analizador si el contexto ya está corriendo:
      // con un contexto suspendido la voz quedaría muda.
      if (ctx && alBoca && ctx.state === "running") {
        try {
          fuente = ctx.createMediaElementSource(audio);
          analizador = ctx.createAnalyser();
          analizador.fftSize = 256;
          fuente.connect(analizador);
          analizador.connect(ctx.destination);
        } catch {
          analizador = null;
        }
      }

      if (alBoca) {
        if (analizador) {
          const datos = new Uint8Array(analizador.fftSize);
          const an = analizador;
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
      }

      void Promise.resolve(audio.play()).catch(terminar);
    } catch {
      terminar();
    }
  });
}
