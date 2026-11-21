import { describe, expect, it } from "vitest";
import { siguienteEscondite, gatoSeVe, LUGAR_GATO } from "@/components/casa/cocina/gato";
import { OBJETOS, type ObjetoId } from "@/components/casa/cocina/datos";

/** La vaca (17 % = 170 unidades de ancho, patas a 92 % del alto) parada en el `pie` de un objeto: ¿tapa el punto? */
const tapaLaVaca = (id: ObjetoId, p: { x: number; y: number }) => {
  const v = OBJETOS[id].pie;
  return Math.abs(p.x - v.x) < 85 && p.y > v.y - 156 && p.y < v.y + 14;
};
/** A 360 × 640, 44 px son ~69 unidades del cuarto. */
const ZONA = 69;

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
  it("al salir del basurero el gato no queda detrás de la vaca ni pisa la zona del basurero", () => {
    expect(tapaLaVaca("lajitong", LUGAR_GATO.lajitong)).toBe(false);
    const o = OBJETOS.lajitong;
    expect(Math.hypot(o.x - LUGAR_GATO.lajitong.x, o.y - LUGAR_GATO.lajitong.y)).toBeGreaterThanOrEqual(ZONA);
  });
  it("bajo la mesa, la vaca parada junto a lo de la mesa no tapa la cola", () => {
    for (const id of ["wan", "panzi", "kuaizi", "zhuozi"] as ObjetoId[]) expect(tapaLaVaca(id, LUGAR_GATO.mesa), id).toBe(false);
    for (const id of ["kuaizi", "lajitong", "yizi"] as ObjetoId[]) {
      const o = OBJETOS[id];
      expect(Math.hypot(o.x - LUGAR_GATO.mesa.x, o.y - LUGAR_GATO.mesa.y), id).toBeGreaterThanOrEqual(ZONA);
    }
  });
});
