import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { idNivel, TEMAS } from "@/components/puzzle/datos";
import {
  abierto, cabe, despuesDe, desordenar, gastar, primerLibre, proximoVaso, RECARGA_MS, recargar, siguienteNivel, sumar,
  VASOS_MAX, type Fila,
} from "@/components/puzzle/logica";
import { validarAvancePuzzle } from "@/components/puzzle/avance";

const frase = (id: string) => TEMAS.flatMap((t) => t.frases).find((f) => f.id === id)!;

describe("contenido", () => {
  it("cada frase tiene su audio, órdenes completos y 3 o 4 frases por tema", () => {
    for (const t of TEMAS) {
      expect(t.frases.length).toBeGreaterThanOrEqual(3);
      expect(t.frases.length).toBeLessThanOrEqual(4);
      for (const f of t.frases) {
        expect(existsSync(join(process.cwd(), "public/audio/puzzle", `${f.audio}.mp3`)), f.audio).toBe(true);
        if (f.respuesta) expect(existsSync(join(process.cwd(), "public/audio/puzzle", `${f.respuesta.audio}.mp3`))).toBe(true);
        for (const o of f.ordenes) expect([...o].sort()).toEqual(f.piezas.map((_, i) => i));
      }
    }
  });
});

describe("cabe", () => {
  const f = frase("wo-jintian-pingguo"); // 我 今天 在家 吃 苹果, también 今天 我 …
  const vacia: Fila = [null, null, null, null, null];

  it("acepta la pieza en su lugar y la rechaza fuera de él", () => {
    expect(cabe(f, vacia, 0, 0)).toBe(true);
    expect(cabe(f, vacia, 3, 3)).toBe(true);
    expect(cabe(f, vacia, 0, 4)).toBe(false);
  });

  it("acepta el tiempo antes del sujeto, pero después ya no mezcla órdenes", () => {
    expect(cabe(f, vacia, 0, 1)).toBe(true);
    const conTiempo: Fila = [1, null, null, null, null];
    expect(cabe(f, conTiempo, 1, 0)).toBe(true);
    const conYo: Fila = [0, null, null, null, null];
    expect(cabe(f, conYo, 1, 0)).toBe(false);
    expect(cabe(f, conYo, 1, 1)).toBe(true);
  });

  it("no pisa un hueco ocupado", () => {
    expect(cabe(f, [0, null, null, null, null], 0, 0)).toBe(false);
  });

  it("primerLibre", () => {
    expect(primerLibre([0, null, 2])).toBe(1);
    expect(primerLibre([0, 1])).toBe(-1);
  });
});

describe("desordenar", () => {
  it("nunca entrega el orden correcto", () => {
    let s = 0;
    const azar = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 200; i++) {
      const a = desordenar(3, azar);
      expect(a).not.toEqual([0, 1, 2]);
      expect([...a].sort()).toEqual([0, 1, 2]);
    }
    expect(desordenar(3, () => 0.999)).not.toEqual([0, 1, 2]);
  });
});

describe("vasos", () => {
  const t0 = 1_000_000_000_000;

  it("un error vacía un vaso y la recarga parte en ese momento", () => {
    const v = gastar({ vasos: VASOS_MAX, desde: 0 }, t0);
    expect(v).toEqual({ vasos: 4, desde: t0 });
    expect(proximoVaso(v, t0)).toBe(RECARGA_MS);
  });

  it("se recarga uno cada 4 horas, sin pasarse de 5", () => {
    const v = { vasos: 1, desde: t0 };
    expect(recargar(v, t0 + RECARGA_MS - 1).vasos).toBe(1);
    expect(recargar(v, t0 + RECARGA_MS).vasos).toBe(2);
    expect(recargar(v, t0 + 2.5 * RECARGA_MS)).toEqual({ vasos: 3, desde: t0 + 2 * RECARGA_MS });
    expect(recargar(v, t0 + 100 * RECARGA_MS).vasos).toBe(VASOS_MAX);
  });

  it("un reloj que retrocede no regala vasos", () => {
    const v = recargar({ vasos: 2, desde: t0 }, t0 - 10 * RECARGA_MS);
    expect(v.vasos).toBe(2);
  });

  it("no baja de 0 y sumar no pasa de 5", () => {
    expect(gastar({ vasos: 0, desde: t0 }, t0).vasos).toBe(0);
    expect(sumar({ vasos: 4, desde: t0 }, 3, t0).vasos).toBe(VASOS_MAX);
    expect(proximoVaso(sumar({ vasos: 4, desde: t0 }, 1, t0), t0)).toBeNull();
  });
});

describe("niveles", () => {
  it("al inicio solo está abierta la primera etapa del primer tema", () => {
    const g = new Set<string>();
    expect(abierto(g, 0, 1)).toBe(true);
    expect(abierto(g, 0, 2)).toBe(false);
    expect(abierto(g, 1, 1)).toBe(false);
    expect(siguienteNivel(g)).toEqual({ tema: 0, etapa: 1 });
  });

  it("ganar la etapa 1 abre la etapa 2 y el tema siguiente", () => {
    const g = new Set([idNivel("orden", 1)]);
    expect(abierto(g, 0, 2)).toBe(true);
    expect(abierto(g, 1, 1)).toBe(true);
    expect(abierto(g, 2, 1)).toBe(false);
    expect(despuesDe(g, 0, 1)).toEqual({ tema: 0, etapa: 2 });
  });

  it("después de ganar todo, no hay siguiente", () => {
    const g = new Set(TEMAS.flatMap((t) => [1, 2, 3].map((e) => `${t.id}-${e}`)));
    expect(siguienteNivel(g)).toBeNull();
    expect(despuesDe(g, TEMAS.length - 1, 3)).toBeNull();
  });
});

describe("avance guardado", () => {
  it("descarta lo raro y recarga los vasos al leer", () => {
    const t0 = 1_000_000_000_000;
    const a = validarAvancePuzzle({ ganados: ["orden-1", 3, "orden-1"], vasos: { vasos: 99, desde: t0 }, correoLleno: "si" }, t0);
    expect(a.ganados).toEqual(["orden-1"]);
    expect(a.vasos.vasos).toBe(VASOS_MAX);
    expect(a.correoLleno).toBe(false);
    expect(validarAvancePuzzle(null, t0).vasos.vasos).toBe(VASOS_MAX);
    expect(validarAvancePuzzle({ vasos: { vasos: 0, desde: t0 } }, t0 + RECARGA_MS).vasos.vasos).toBe(1);
  });
});

describe("ejemplos", () => {
  it("el ejemplo de cada tema es una de sus frases", () => {
    for (const t of TEMAS) expect(t.frases.some((f) => f.id === t.ejemplo), t.id).toBe(true);
  });
});
