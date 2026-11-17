import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ARTE, ARTE_PRIMER_PLANO, ARTE_REFRI, ARTE_REFRI_FONDO, ARTE_VACA, FONDO_CUARTO } from "@/components/casa/arte/registro";
import { Capa, FondoCuarto } from "@/components/casa/arte/Capa";
import { Vaca } from "@/components/casa/Vaca";
import { estadosAlcanzables } from "@/components/casa/cocina/acciones";
import { COMIDAS, OBJETOS, VALORES, type ObjetoId } from "@/components/casa/cocina/datos";

const ids = Object.keys(OBJETOS) as ObjetoId[];

describe("registro de arte", () => {
  it("la vaca sale del registro y cada capa existe en public/ (WebP)", () => {
    const rutas = [ARTE_VACA.cuerpo, ARTE_VACA.orejas, ...Object.values(ARTE_VACA.ojos), ...Object.values(ARTE_VACA.hocico)];
    for (const r of rutas) {
      expect(r).toMatch(/\.webp$/);
      expect(existsSync(join(process.cwd(), "public", r)), r).toBe(true);
    }
    const { container } = render(<Vaca ojos="abiertos" hocico="sonrisa" orejas="normales" />);
    const srcs = [...container.querySelectorAll("img")].map((i) => i.getAttribute("src"));
    expect(srcs.sort()).toEqual([...rutas].sort());
  });
  it("panzi", () => {
    expect(ARTE.panzi.visibles("lleno")).toEqual(["plato", "jiaozi"]);
    expect(ARTE.panzi.visibles("sucio")).toEqual(["plato", "mugre"]);
    expect(ARTE.panzi.visibles("limpio")).toEqual(["plato"]);
  });
  it("pingguo", () => {
    expect(ARTE.pingguo.visibles("cortado")).toEqual(["mitad_izq", "mitad_der"]);
    expect(ARTE.pingguo.visibles("nada")).toEqual([]);
  });
  it("todos los estados alcanzables usan capas que existen", () => {
    for (const E of estadosAlcanzables())
      for (const id of ids)
        for (const nombre of ARTE[id].visibles(E[id])) expect(ARTE[id].capas[nombre]).toBeDefined();
    // los objetos nuevos no están en el producto de estados: se recorren sus VALORES
    for (const id of ids)
      for (const e of VALORES[id])
        for (const nombre of ARTE[id].visibles(e)) expect(ARTE[id].capas[nombre], `${id} ${e} ${nombre}`).toBeDefined();
  });
  it("capas de los objetos nuevos", () => {
    expect(ARTE.kafeibei.visibles("cafe")).toEqual(["taza", "cafe"]);
    expect(ARTE.kafeibei.visibles("sucio")).toEqual(["taza", "mugre"]);
    expect(ARTE.deng.visibles("encendida")).toContain("luz");
    expect(ARTE.deng.visibles("apagada")).not.toContain("luz");
    expect(ARTE.chuanghu.visibles("abierta")).toContain("abierta");
    expect(ARTE.chuanghu.visibles("cerrada")).toContain("vidrio");
    expect(ARTE.chuanghu.capas.pajaro).toBeDefined();
    expect(Object.keys(ARTE.lajitong.capas)).toEqual(expect.arrayContaining(["tarro", "tapa"]));
    expect(Object.keys(ARTE.mao.capas)).toEqual(expect.arrayContaining(["cola", "gato"]));
    expect(ARTE.yizi.capas.silla).toBeDefined();
    expect(ARTE.shouji.capas.telefono).toBeDefined();
    expect(ARTE.zhuozi.visibles("fijo")).toEqual(["zona"]);
  });
  it("guo cocido y wan lleno llevan zanahoria sobre el arroz", () => {
    expect(ARTE.guo.visibles("cocido")).toEqual(["olla", "arroz", "zanahoria"]);
    expect(ARTE.wan.visibles("lleno")).toEqual(["bol", "arroz", "zanahoria"]);
    expect(ARTE.guo.capas.zanahoria).toBeDefined();
    expect(ARTE.wan.capas.zanahoria).toBeDefined();
    expect(ARTE.wan.visibles("vacio")).not.toContain("zanahoria");
  });
  it("cada comida del refri tiene su dibujo de frente (cuadrado) y el fondo del refri existe", () => {
    expect([...COMIDAS].sort()).toEqual(
      ["pingguo", "xiangjiao", "xigua", "caomei", "huluobo", "xihongshi", "tudou", "xilanhua", "mogu", "niunai", "jidan", "mianbao", "mi"].sort(),
    );
    expect(Object.keys(ARTE_REFRI).sort()).toEqual([...COMIDAS].sort());
    const capas = [...COMIDAS.map((id) => [id, ARTE_REFRI[id]] as const), ["interior", ARTE_REFRI_FONDO] as const];
    for (const [id, capa] of capas) {
      expect(capa.tipo, id).toBe("img");
      if (capa.tipo !== "img") continue;
      expect(capa.src).toMatch(new RegExp(`^/arte/cocina/refri_${id}\.(svg|png|webp)$`));
      const ruta = join(process.cwd(), "public", capa.src);
      expect(existsSync(ruta), capa.src).toBe(true);
      if (capa.src.endsWith(".svg")) {
        const m = readFileSync(ruta, "utf8").match(/viewBox="([^"]+)"/)!;
        const [, , w, h] = m[1].split(" ").map(Number);
        expect(w, id).toBe(h);
      }
    }
    if (ARTE_REFRI_FONDO.tipo === "img" && ARTE_REFRI_FONDO.src.endsWith(".svg"))
      expect(readFileSync(join(process.cwd(), "public", ARTE_REFRI_FONDO.src), "utf8")).toContain("水果");
  });
  it("todo objeto con estado sucio tiene la capa mugre", () => {
    const sucios = new Set<ObjetoId>();
    for (const E of estadosAlcanzables()) for (const id of ids) if (E[id] === "sucio") sucios.add(id);
    expect(sucios.size).toBeGreaterThan(0);
    for (const id of sucios) {
      expect(ARTE[id].capas.mugre).toBeDefined();
      expect(ARTE[id].visibles("sucio")).toContain("mugre");
    }
  });
  it("capas mínimas", () => {
    expect(Object.keys(ARTE.bingxiang.capas)).toEqual(expect.arrayContaining(["cuerpo", "interior", "puerta"]));
    expect(Object.keys(ARTE.pingguo.capas)).toEqual(expect.arrayContaining(["entera", "mugre", "mitad_izq", "mitad_der"]));
    expect(Object.keys(ARTE.beizi.capas)).toEqual(expect.arrayContaining(["vaso", "agua", "te", "mugre"]));
    expect(Object.keys(ARTE.wan.capas)).toEqual(expect.arrayContaining(["bol", "arroz", "mugre"]));
    expect(Object.keys(ARTE.guo.capas)).toEqual(expect.arrayContaining(["olla", "arroz", "mugre"]));
    expect(ARTE.chahu.capas.tetera).toBeDefined();
    expect(ARTE.kuaizi.capas.palillos).toBeDefined();
    for (const k of ["vaso_grande", "vaso_mascara", "olla_grande", "trozos"]) expect(ARTE_PRIMER_PLANO[k]).toBeDefined();
    expect(FONDO_CUARTO.cocina).toBeDefined();
  });
});

describe("Capa", () => {
  it("img se renderiza como <img> con su src", () => {
    const { container } = render(<Capa capa={{ tipo: "img", src: "/arte/x.png" }} />);
    const img = container.querySelector("img")!;
    expect(img.getAttribute("src")).toBe("/arte/x.png");
    expect(container.querySelector("svg")).toBeNull();
  });
  it("svg se renderiza como su componente", () => {
    const Prueba = () => <circle data-testid="mi-dibujo" r="5" />;
    const { container } = render(<Capa capa={{ tipo: "svg", Componente: Prueba }} />);
    expect(container.querySelector('[data-testid="mi-dibujo"]')).not.toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });
});

describe("Vaca", () => {
  it("ojos felices deja una sola capa de ojos visible", () => {
    const { container } = render(<Vaca ojos="felices" hocico="sonrisa" orejas="normales" />);
    const ojos = [...container.querySelectorAll<HTMLImageElement>("img[data-ojos]")];
    expect(ojos).toHaveLength(5);
    const visibles = ojos.filter((i) => i.style.opacity === "1");
    expect(visibles).toHaveLength(1);
    expect(visibles[0].dataset.ojos).toBe("felices");
  });
});

describe("FondoCuarto", () => {
  it("es el archivo del cuarto, cuadrado de 1000 x 1000 unidades", () => {
    const { container } = render(<FondoCuarto cuarto="cocina" />);
    const src = container.querySelector("img")!.getAttribute("src")!;
    expect(src).toMatch(/^\/arte\/cocina\/cuarto_cocina\.(svg|png|webp)$/);
    if (src.endsWith(".svg")) {
      const svg = readFileSync(join(process.cwd(), "public", src), "utf8");
      expect(svg).toContain('viewBox="0 0 1000 1000"');
    }
  });
});
