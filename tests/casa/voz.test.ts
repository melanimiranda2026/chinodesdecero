import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { S } from "@/lib/silabas";
import { callar, decir, desbloquearAudio } from "@/components/casa/audio/voz";
import { musica, sfx } from "@/components/casa/audio/sonido";
import { efectoYLuegoVoz, ESPERA_SFX_DEFECTO } from "@/components/casa/audio/turnos";
import { reiniciarMotor } from "@/components/casa/audio/motor";

class AudioFalso {
  static instancias: AudioFalso[] = [];
  static playRechaza = false;
  src: string;
  volume = 1;
  loop = false;
  paused = true;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(src?: string) {
    this.src = src ?? "";
    AudioFalso.instancias.push(this);
  }
  play() {
    this.paused = false;
    return AudioFalso.playRechaza ? Promise.reject(new Error("bloqueado")) : Promise.resolve();
  }
  pause() { this.paused = true; }
  load() {}
}

// ---- Web Audio falso ----
class Nodo {
  connect = vi.fn((n: unknown) => n);
  disconnect = vi.fn();
}
class Fuente extends Nodo {
  buffer: { duration: number } | null = null;
  loop = false;
  onended: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
}
class Ganancia extends Nodo {
  gain = { value: 1, setTargetAtTime(v: number) { this.value = v; }, cancelScheduledValues() {} };
}
const red = { fetches: [] as string[], status: 200, colgar: false, decodeFalla: false };
class Ctx {
  static ultimo: Ctx;
  static resumeFunciona = true;
  state: AudioContextState = "suspended";
  currentTime = 0;
  destination = {};
  fuentes: Fuente[] = [];
  ganancias: Ganancia[] = [];
  constructor() { Ctx.ultimo = this; }
  resume = vi.fn(async () => { if (Ctx.resumeFunciona) this.state = "running"; });
  createBuffer() { return { duration: 0 }; }
  createBufferSource() { const f = new Fuente(); this.fuentes.push(f); return f; }
  createGain() { const g = new Ganancia(); this.ganancias.push(g); return g; }
  createAnalyser() { return Object.assign(new Nodo(), { fftSize: 0, getByteTimeDomainData: (d: Uint8Array) => d.fill(200) }); }
  decodeAudioData = vi.fn(async () => {
    if (red.decodeFalla) throw new Error("decode");
    return { duration: 1 };
  });
  /** Las fuentes con audio de verdad (sin el buffer mudo del desbloqueo). */
  sonando = () => this.fuentes.filter((f) => f.buffer && f.buffer.duration > 0 && f.start.mock.calls.length);
}

const NI_HAO = S("你好", "ní hǎo", "23");
const WO = S("我", "wǒ", "3");
const TIEMPO_NI_HAO = 500 + 380 * 2 + 1500;
const vaciar = () => vi.advanceTimersByTimeAsync(0);

beforeEach(() => {
  reiniciarMotor();
  musica.bajar(false);
  AudioFalso.instancias = [];
  AudioFalso.playRechaza = false;
  vi.stubGlobal("Audio", AudioFalso);
});
afterEach(() => {
  musica.parar();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete (window as unknown as { AudioContext?: unknown }).AudioContext;
});

describe("decir sin Web Audio (HTMLAudio de respaldo)", () => {
  it("toca el mp3 de la frase y resuelve true con onended", async () => {
    const p = decir(NI_HAO);
    await Promise.resolve();
    const a = AudioFalso.instancias[0];
    expect(a.src).toBe("/audio/cocina/ni2_hao3.mp3");
    a.onended?.();
    await expect(p).resolves.toBe(true);
  });

  it("resuelve false si play() es rechazado", async () => {
    AudioFalso.playRechaza = true;
    await expect(decir(NI_HAO)).resolves.toBe(false);
  });

  it("resuelve false con onerror (404)", async () => {
    const p = decir(NI_HAO);
    AudioFalso.instancias[0].onerror?.();
    await expect(p).resolves.toBe(false);
  });

  it("resuelve con el timeout aunque el audio nunca avise", async () => {
    vi.useFakeTimers();
    let listo = false;
    const p = decir(NI_HAO).then(() => { listo = true; });
    await vi.advanceTimersByTimeAsync(TIEMPO_NI_HAO - 10);
    expect(listo).toBe(false);
    await vi.advanceTimersByTimeAsync(20);
    await p;
    expect(listo).toBe(true);
  });

  it("un segundo decir hace resolver al primero", async () => {
    vi.useFakeTimers();
    let primero = false;
    const p1 = decir(NI_HAO).then(() => { primero = true; });
    await vi.advanceTimersByTimeAsync(10);
    const p2 = decir(WO);
    await vi.advanceTimersByTimeAsync(10);
    expect(primero).toBe(true);
    await p1;
    AudioFalso.instancias[1].onended?.();
    await p2;
  });

  it("callar() hace resolver la frase en curso", async () => {
    const p = decir(NI_HAO);
    callar();
    await expect(p).resolves.toBeTypeOf("boolean");
  });

  it("la boca alterna abierta/cerrada y termina cerrada", async () => {
    vi.useFakeTimers();
    const valores: number[] = [];
    const p = decir(NI_HAO, { alBoca: (v) => valores.push(v) });
    await vi.advanceTimersByTimeAsync(300);
    expect(valores).toContain(1);
    expect(valores).toContain(0);
    AudioFalso.instancias[0].onended?.();
    await p;
    expect(valores[valores.length - 1]).toBe(0);
  });

  it("restaura la música tras el timeout y tras ser reemplazado", async () => {
    vi.useFakeTimers();
    musica.tocar("cocina");
    const m = AudioFalso.instancias[0];
    expect(m.loop).toBe(true);
    expect(m.volume).toBe(0.16);
    const p1 = decir(NI_HAO);
    expect(m.volume).toBe(0.03);
    await vi.advanceTimersByTimeAsync(TIEMPO_NI_HAO + 10);
    await p1;
    expect(m.volume).toBe(0.16);
    const p2 = decir(NI_HAO);
    expect(m.volume).toBe(0.03);
    const p3 = decir(WO);
    await p2;
    expect(m.volume).toBe(0.03); // la voz nueva sigue sonando
    AudioFalso.instancias[AudioFalso.instancias.length - 1].onended?.();
    await p3;
    expect(m.volume).toBe(0.16);
  });
});

describe("decir con Web Audio (contexto compartido y buffers)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    red.fetches = [];
    red.status = 200;
    red.colgar = false;
    red.decodeFalla = false;
    Ctx.resumeFunciona = true;
    (window as unknown as { AudioContext: unknown }).AudioContext = Ctx;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        red.fetches.push(url);
        if (red.colgar) return new Promise(() => {});
        return Promise.resolve(new Response(red.status === 200 ? new ArrayBuffer(8) : null, { status: red.status }));
      }),
    );
    desbloquearAudio();
  });

  it("el desbloqueo crea el contexto, lo reanuda y toca un buffer mudo (iOS)", () => {
    expect(Ctx.ultimo.resume).toHaveBeenCalled();
    expect(Ctx.ultimo.fuentes[0].start).toHaveBeenCalled();
  });

  it("toca la frase con un AudioBufferSourceNode y resuelve true al terminar; la música vuelve", async () => {
    let fin: boolean | undefined;
    const p = decir(NI_HAO).then((v) => (fin = v));
    await vaciar();
    expect(red.fetches).toEqual(["/audio/cocina/ni2_hao3.mp3"]);
    const [f] = Ctx.ultimo.sonando();
    expect(f).toBeTruthy();
    expect(fin).toBeUndefined();
    f.onended?.();
    await p;
    expect(fin).toBe(true);
  });

  it("los buffers decodificados quedan en caché", async () => {
    const p1 = decir(NI_HAO);
    await vaciar();
    Ctx.ultimo.sonando()[0].onended?.();
    await p1;
    const p2 = decir(NI_HAO);
    await vaciar();
    expect(red.fetches).toHaveLength(1);
    expect(Ctx.ultimo.decodeAudioData).toHaveBeenCalledTimes(1);
    Ctx.ultimo.sonando()[1].onended?.();
    await expect(p2).resolves.toBe(true);
  });

  it("fetch 404 → resuelve false (no sonó)", async () => {
    red.status = 404;
    const p = decir(NI_HAO);
    await vaciar();
    await expect(p).resolves.toBe(false);
  });

  it("error al decodificar → resuelve false", async () => {
    red.decodeFalla = true;
    const p = decir(NI_HAO);
    await vaciar();
    await expect(p).resolves.toBe(false);
  });

  it("si el archivo nunca llega, resuelve false con el timeout", async () => {
    red.colgar = true;
    let fin: boolean | undefined;
    const p = decir(NI_HAO).then((v) => (fin = v));
    await vi.advanceTimersByTimeAsync(TIEMPO_NI_HAO - 10);
    expect(fin).toBeUndefined();
    await vi.advanceTimersByTimeAsync(20);
    await p;
    expect(fin).toBe(false);
  });

  it("ya sonando, si onended nunca llega resuelve true a la duración + 1500 ms", async () => {
    let fin: boolean | undefined;
    const p = decir(NI_HAO).then((v) => (fin = v));
    await vaciar();
    await vi.advanceTimersByTimeAsync(1000 + 1500 - 10);
    expect(fin).toBeUndefined();
    await vi.advanceTimersByTimeAsync(20);
    await p;
    expect(fin).toBe(true);
  });

  it("reemplazada mientras suena: la primera resuelve true y su fuente se detiene", async () => {
    const p1 = decir(NI_HAO);
    await vaciar();
    const f1 = Ctx.ultimo.sonando()[0];
    const p2 = decir(WO);
    await expect(p1).resolves.toBe(true);
    expect(f1.stop).toHaveBeenCalled();
    await vaciar();
    Ctx.ultimo.sonando()[1].onended?.();
    await expect(p2).resolves.toBe(true);
  });

  it("reemplazada antes de empezar: resuelve false y no llega a sonar", async () => {
    red.colgar = true;
    const p1 = decir(NI_HAO);
    red.colgar = false;
    const p2 = decir(WO);
    await expect(p1).resolves.toBe(false);
    await vaciar();
    expect(Ctx.ultimo.sonando()).toHaveLength(1);
    Ctx.ultimo.sonando()[0].onended?.();
    await p2;
  });

  it("la boca sigue al AnalyserNode del mismo grafo", async () => {
    const valores: number[] = [];
    const p = decir(NI_HAO, { alBoca: (v) => valores.push(v) });
    await vaciar();
    await vi.advanceTimersByTimeAsync(100);
    expect(valores.some((v) => v > 0)).toBe(true);
    Ctx.ultimo.sonando()[0].onended?.();
    await p;
    expect(valores.at(-1)).toBe(0);
  });

  it("si el contexto no se deja reanudar, cae a HTMLAudio y resuelve igual", async () => {
    reiniciarMotor();
    Ctx.resumeFunciona = false;
    desbloquearAudio();
    const p = decir(NI_HAO);
    await vaciar();
    expect(Ctx.ultimo.sonando()).toHaveLength(0);
    AudioFalso.instancias.at(-1)!.onended?.();
    await expect(p).resolves.toBe(true);
  });

  it("música: buffer en loop con GainNode; baja a 0.03 con la voz y vuelve a 0.16", async () => {
    musica.tocar("cocina");
    await vaciar();
    const fm = Ctx.ultimo.sonando()[0];
    expect(fm.loop).toBe(true);
    expect(red.fetches).toContain("/musica/cocina.mp3");
    const g = Ctx.ultimo.ganancias.at(-1)!;
    expect(g.gain.value).toBe(0.16);
    const p = decir(NI_HAO);
    expect(g.gain.value).toBe(0.03);
    await vaciar();
    Ctx.ultimo.sonando()[1].onended?.();
    await p;
    expect(g.gain.value).toBe(0.16);
    musica.tocar("g-cortar");
    expect(fm.stop).toHaveBeenCalled();
  });

  it("los efectos no suenan mientras habla la vaca, y el mandarín corta un efecto que sonaba", async () => {
    sfx("pop");
    await vaciar();
    const efecto = Ctx.ultimo.sonando()[0];
    expect(efecto).toBeTruthy();
    const p = decir(NI_HAO);
    expect(efecto.stop).toHaveBeenCalled();
    sfx("boing");
    await vaciar();
    expect(red.fetches).not.toContain("/sfx/boing.mp3");
    Ctx.ultimo.sonando().at(-1)!.onended?.();
    await p;
    sfx("boing");
    await vaciar();
    expect(red.fetches).toContain("/sfx/boing.mp3");
  });
});

describe("efectoYLuegoVoz", () => {
  it("toca el efecto y recién después de su duración empieza a hablar", async () => {
    vi.useFakeTimers();
    const hablar = vi.fn(async () => true);
    const p = efectoYLuegoVoz("pop", hablar);
    expect(AudioFalso.instancias.map((a) => a.src)).toEqual(["/sfx/pop.mp3"]);
    await vi.advanceTimersByTimeAsync(ESPERA_SFX_DEFECTO - 1);
    expect(hablar).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(hablar).toHaveBeenCalledTimes(1);
    await expect(p).resolves.toBe(true);
  });
  it("la espera se configura por efecto", async () => {
    vi.useFakeTimers();
    const hablar = vi.fn(async () => true);
    void efectoYLuegoVoz("tragos", hablar);
    await vi.advanceTimersByTimeAsync(ESPERA_SFX_DEFECTO + 10);
    expect(hablar).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(700);
    expect(hablar).toHaveBeenCalled();
  });
});
