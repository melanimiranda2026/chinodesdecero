import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { S } from "@/lib/silabas";
import { decir } from "@/components/casa/audio/voz";

class AudioFalso {
  static instancias: AudioFalso[] = [];
  static playRechaza = false;
  src: string;
  volume = 1;
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

const NI_HAO = S("你好", "ní hǎo", "23");
const WO = S("我", "wǒ", "3");

beforeEach(() => {
  AudioFalso.instancias = [];
  AudioFalso.playRechaza = false;
  vi.stubGlobal("Audio", AudioFalso);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("decir", () => {
  it("toca el mp3 de la frase y resuelve con onended", async () => {
    const p = decir(NI_HAO);
    await Promise.resolve();
    const a = AudioFalso.instancias[0];
    expect(a.src).toBe("/audio/cocina/ni2_hao3.mp3");
    a.onended?.();
    await expect(p).resolves.toBeUndefined();
  });

  it("usa el sufijo _lento", async () => {
    const p = decir(NI_HAO, { lento: true });
    await Promise.resolve();
    expect(AudioFalso.instancias[0].src).toBe("/audio/cocina/ni2_hao3_lento.mp3");
    AudioFalso.instancias[0].onended?.();
    await p;
  });

  it("resuelve si play() es rechazado", async () => {
    AudioFalso.playRechaza = true;
    await expect(decir(NI_HAO)).resolves.toBeUndefined();
  });

  it("resuelve con el timeout aunque el audio nunca avise", async () => {
    vi.useFakeTimers();
    let listo = false;
    const p = decir(NI_HAO).then(() => { listo = true; });
    await vi.advanceTimersByTimeAsync(500 + 380 * 2 + 1500 - 10);
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

  it("sin WebAudio la boca alterna abierta/cerrada", async () => {
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
});
