import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ARTE, ARTE_PRIMER_PLANO, FONDO_CUARTO } from "@/components/casa/arte/registro";
import { Capa, FondoCuarto } from "@/components/casa/arte/Capa";
import { Vaca } from "@/components/casa/Vaca";
import { estadosAlcanzables } from "@/components/casa/cocina/acciones";
import { OBJETOS, type ObjetoId } from "@/components/casa/cocina/datos";

const ids = Object.keys(OBJETOS) as ObjetoId[];

describe("registro de arte", () => {
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
  it("siempre usa el encuadre 0 0 1000 1000", () => {
    const { container } = render(<FondoCuarto cuarto="cocina" />);
    expect(container.querySelector("svg")!.getAttribute("viewBox")).toBe("0 0 1000 1000");
  });
});
