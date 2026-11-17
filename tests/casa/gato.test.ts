import { describe, expect, it } from "vitest";
import { siguienteEscondite, gatoSeVe } from "@/components/casa/cocina/gato";

describe("gato escondido", () => {
  it("orden refri → mesa → lajitong → chuanghu → refri", () => {
    expect(siguienteEscondite("refri", true)).toBe("mesa");
    expect(siguienteEscondite("mesa", true)).toBe("lajitong");
    expect(siguienteEscondite("lajitong", true)).toBe("chuanghu");
    expect(siguienteEscondite("chuanghu", true)).toBe("refri");
  });
  it("con la ventana cerrada se salta chuanghu", () => {
    expect(siguienteEscondite("lajitong", false)).toBe("refri");
  });
  it("un valor raro vuelve al refri", () => {
    expect(siguienteEscondite("xyz", true)).toBe("refri");
  });
  it("se ve la cola salvo en el basurero o en la ventana cerrada; encontrado siempre", () => {
    expect(gatoSeVe("refri", "cerrada", false)).toBe(true);
    expect(gatoSeVe("mesa", "cerrada", false)).toBe(true);
    expect(gatoSeVe("lajitong", "abierta", false)).toBe(false);
    expect(gatoSeVe("chuanghu", "cerrada", false)).toBe(false);
    expect(gatoSeVe("chuanghu", "abierta", false)).toBe(true);
    expect(gatoSeVe("lajitong", "cerrada", true)).toBe(true);
  });
});
