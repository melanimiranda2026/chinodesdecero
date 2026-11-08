/**
 * Motor de audio compartido: UN AudioContext (se desbloquea en el toque "Entrar a la casa") y un caché
 * de buffers ya decodificados. Voz, efectos y música suenan por este grafo (también en iOS, donde un
 * HTMLAudio creado fuera de un toque queda mudo). Si el navegador no tiene Web Audio, `contexto()` es null
 * y cada módulo usa HTMLAudio como antes.
 */

let ctx: AudioContext | null = null;
const buffers = new Map<string, Promise<AudioBuffer | null>>();

function constructor(): typeof AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

export function contexto(): AudioContext | null {
  return ctx;
}

/** Se llama DENTRO del toque "Entrar a la casa": crea/reanuda el contexto y toca un buffer mudo (iOS). */
export function desbloquearAudio(): void {
  try {
    const Ctor = constructor();
    if (!Ctor) return;
    ctx ??= new Ctor();
    if (ctx.state !== "running") void Promise.resolve(ctx.resume?.()).catch(() => {});
    try {
      const mudo = ctx.createBuffer(1, 1, 22050);
      const s = ctx.createBufferSource();
      s.buffer = mudo;
      s.connect(ctx.destination);
      s.start(0);
    } catch {
      /* el desbloqueo con buffer mudo es opcional */
    }
  } catch {
    ctx = null;
  }
}

/** El contexto listo para sonar (lo reanuda si estaba suspendido), o null si no se puede. */
export async function listo(): Promise<AudioContext | null> {
  const c = ctx;
  if (!c) return null;
  if (c.state !== "running") {
    try {
      await c.resume();
    } catch {
      /* sigue suspendido */
    }
  }
  return c.state === "running" ? c : null;
}

function decodificar(c: AudioContext, datos: ArrayBuffer): Promise<AudioBuffer> {
  // Safari viejo solo acepta callbacks; los demás devuelven promesa. Se aceptan las dos.
  return new Promise<AudioBuffer>((res, rej) => {
    try {
      const p = c.decodeAudioData(datos, res, rej) as Promise<AudioBuffer> | undefined;
      if (p && typeof p.then === "function") p.then(res, rej);
    } catch (e) {
      rej(e);
    }
  });
}

/**
 * fetch + decodeAudioData, con caché. Nunca rechaza: null si no hay contexto, el archivo no existe (404)
 * o no se pudo decodificar. Un fallo no queda en el caché (se reintenta la próxima vez).
 */
export function cargar(url: string): Promise<AudioBuffer | null> {
  const c = ctx;
  if (!c) return Promise.resolve(null);
  let p = buffers.get(url);
  if (!p) {
    p = (async () => {
      const r = await fetch(url);
      if (!r.ok) throw new Error(String(r.status));
      return decodificar(c, await r.arrayBuffer());
    })().catch(() => {
      buffers.delete(url);
      return null;
    });
    buffers.set(url, p);
  }
  return p;
}

/** Solo para pruebas. */
export function reiniciarMotor(): void {
  ctx = null;
  buffers.clear();
}
