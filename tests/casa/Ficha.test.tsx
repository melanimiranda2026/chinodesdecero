import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { Ficha } from "@/components/casa/living/Ficha";
import { LineaTono } from "@/components/casa/living/LineaTono";
import { PALABRAS, SELLO, type Palabra } from "@/components/casa/living/palabras";
import { textoHanzi } from "@/lib/silabas";
import { COLOR_TONO } from "@/lib/tonos";

const de = (hz: string): Palabra => PALABRAS.find((p) => textoHanzi(p.s) === hz)!;

/** Color CSS normalizado (jsdom devuelve rgb()). */
function rgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

function montar(palabra: Palabra, hablando = false) {
  const alRepetir = vi.fn();
  const alCerrar = vi.fn();
  const r = render(<Ficha palabra={palabra} hablando={hablando} alRepetir={alRepetir} alCerrar={alCerrar} />);
  return { ...r, alRepetir, alCerrar, ficha: screen.getByRole("dialog") };
}

const cuerpo = (ficha: HTMLElement) => ficha.querySelector("[data-cuerpo]") as HTMLElement;
const plano = (el: Element) => (el.textContent ?? "").replace(/\s+/g, " ").trim();

describe("Ficha de una palabra", () => {
  it("es un diálogo con el hanzi como nombre y muestra sello, hanzi, pinyin por tono, significado y frase", () => {
    const pal = de("西红柿");
    const { ficha } = montar(pal);
    expect(screen.getByRole("dialog", { name: "西红柿" })).toBe(ficha);
    expect(within(ficha).getByText(SELLO.literal)).toBeTruthy();
    expect(ficha.querySelector("[data-hanzi]")?.textContent).toBe("西红柿");
    const sil = ficha.querySelectorAll("[data-pinyin] [data-tono]");
    expect([...sil].map((s) => s.textContent?.trim())).toEqual(["xī", "hóng", "shì"]);
    expect([...sil].map((s) => (s as HTMLElement).style.color)).toEqual([rgb(COLOR_TONO[1]), rgb(COLOR_TONO[2]), rgb(COLOR_TONO[4])]);
    expect(ficha.querySelector("[data-significado]")?.textContent).toBe("tomate");
    expect(plano(ficha)).toContain(pal.frase);
  });

  it("en todas las palabras se ve su sello, su significado y su frase", () => {
    for (const pal of PALABRAS) {
      const { ficha, unmount } = montar(pal);
      expect(plano(ficha)).toContain(SELLO[pal.tecnica]);
      expect(ficha.querySelector("[data-significado]")?.textContent).toBe(pal.es);
      expect(plano(ficha)).toContain(pal.frase);
      unmount();
    }
  });

  it("suma: piezas con + entre ellas y = antes del significado", () => {
    const { ficha } = montar(de("电脑"));
    expect(plano(cuerpo(ficha))).toMatch(/^电 electricidad \+ 脑 cerebro = computador/);
  });

  it("好 + algo: también con + y =", () => {
    const { ficha } = montar(de("好吃"));
    expect(plano(cuerpo(ficha))).toMatch(/^好 bueno \+ 吃 comer = rico \(comida\)/);
  });

  it("literal: piezas separadas por · y luego la frase", () => {
    const { ficha } = montar(de("西红柿"));
    const t = plano(cuerpo(ficha));
    expect(t).toMatch(/^西 oeste · 红 rojo · 柿 kaki/);
    expect(t.indexOf("kaki rojo del oeste")).toBeGreaterThan(t.indexOf("柿 kaki"));
  });

  it("dibujo: las piezas en fila con → y el hanzi al final", () => {
    const { ficha } = montar(de("水"));
    expect(plano(cuerpo(ficha))).toMatch(/^💧 agua → 水/);
  });

  it("cada pieza entra con su retraso (--i)", () => {
    const { ficha } = montar(de("长颈鹿"));
    const piezas = cuerpo(ficha).querySelectorAll("[data-pieza]");
    expect(piezas).toHaveLength(3);
    expect([...piezas].map((p) => (p as HTMLElement).style.getPropertyValue("--i"))).toEqual(["0", "1", "2"]);
  });

  it("🔊 repite; ✕ y Escape cierran", () => {
    const { alRepetir, alCerrar } = montar(de("猫"));
    fireEvent.click(screen.getByRole("button", { name: /escuchar/i }));
    expect(alRepetir).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /cerrar/i }));
    expect(alCerrar).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(alCerrar).toHaveBeenCalledTimes(2);
  });

  it("con nota se ve la línea de nota; sin nota, nada", () => {
    const con = montar(de("你好"));
    expect(con.ficha.querySelector("[data-nota]")?.textContent).toContain("ní hǎo");
    con.unmount();
    const sin = montar(de("猫"));
    expect(sin.ficha.querySelector("[data-nota]")).toBeNull();
  });

  it("lleva la línea de tono, que se dibuja mientras habla", () => {
    const { ficha, rerender, alRepetir, alCerrar } = montar(de("你好"));
    const linea = ficha.querySelector("[data-linea-tono]")!;
    expect(linea.getAttribute("data-activa")).toBe("false");
    rerender(<Ficha palabra={de("你好")} hablando alRepetir={alRepetir} alCerrar={alCerrar} />);
    expect(ficha.querySelector("[data-linea-tono]")!.getAttribute("data-activa")).toBe("true");
  });
});

describe("LineaTono", () => {
  it("un trazo por sílaba con el color de su tono: 你好 = 2 y 3", () => {
    const { container } = render(<LineaTono s={de("你好").s} activa={false} />);
    const trazos = container.querySelectorAll("path[data-tono]");
    expect([...trazos].map((t) => t.getAttribute("data-tono"))).toEqual(["2", "3"]);
    expect([...trazos].map((t) => t.getAttribute("stroke"))).toEqual([COLOR_TONO[2], COLOR_TONO[3]]);
  });

  it("formas: 1 plano alto, 2 sube, 3 baja y sube, 4 baja, 5 punto corto", () => {
    const { container } = render(<LineaTono s={de("胡萝卜").s.concat(de("西红柿").s, de("长颈鹿").s)} activa />);
    const forma = (t: string) => {
      const d = container.querySelector(`path[data-tono="${t}"]`)!.getAttribute("d")!;
      return d.match(/-?\d+(\.\d+)?/g)!.map(Number);
    };
    const [, y1a, , y1b] = forma("1");
    expect(y1a).toBe(y1b);
    const [, y2a, , y2b] = forma("2");
    expect(y2b).toBeLessThan(y2a); // sube (y hacia arriba)
    const p3 = forma("3");
    expect(p3).toHaveLength(6);
    expect(p3[3]).toBeGreaterThan(p3[1]);
    expect(p3[5]).toBeLessThan(p3[3]);
    const [, y4a, , y4b] = forma("4");
    expect(y4b).toBeGreaterThan(y4a);
    const [x5a, , x5b] = forma("5");
    const [x1a, , x1b] = forma("1");
    expect(x5b - x5a).toBeLessThan((x1b - x1a) / 2);
  });

  it("marca si está activa", () => {
    const { container } = render(<LineaTono s={de("猫").s} activa />);
    expect(container.querySelector("[data-linea-tono]")!.getAttribute("data-activa")).toBe("true");
  });
});
