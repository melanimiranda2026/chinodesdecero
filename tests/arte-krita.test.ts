import { describe, expect, it } from "vitest";
import { ultimoBotonPlay } from "../scripts/arte-krita";

describe("arte:krita-importar, botón Play", () => {
  it("elige la versión más alta de boton play*.ora (v2 < v10)", () => {
    expect(ultimoBotonPlay(["guo.ora", "boton playv1.ora", "boton playv10.ora", "boton playv2.ora"])).toBe("boton playv10.ora");
  });
  it("ignora mayúsculas y lo que no es .ora (el .kra no cuenta)", () => {
    expect(ultimoBotonPlay(["Boton PlayV1.ora", "boton playv3.ora.kra"])).toBe("Boton PlayV1.ora");
  });
  it("sin botón, nada", () => {
    expect(ultimoBotonPlay(["guo.ora", "cuarto_living.ora"])).toBeNull();
  });
});
