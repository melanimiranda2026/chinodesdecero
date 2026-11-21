import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ARTE, ARTE_MESA, ARTE_PRIMER_PLANO, ARTE_REFRI, ARTE_REFRI_FONDO, ARTE_VACA, FONDO_CASA, FONDO_CUARTO } from "@/components/casa/arte/registro";
import { MESA_LIVING, PARADA_VACA } from "@/components/casa/living/lugares";
import { alPiso } from "@/components/casa/cocina/iso";
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
      expect(capa.src).toMatch(new RegExp(`^/arte/cocina/refri_${id}\\.(svg|png|webp)$`));
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

/** Un SVG generado de 1000 x 1000 unidades (o el dibujo a mano que lo reemplaza). */
function esCuadroDeMil(capa: { tipo: string; src?: string }, patron: RegExp) {
  expect(capa.tipo).toBe("img");
  const src = capa.src!;
  expect(src).toMatch(patron);
  const ruta = join(process.cwd(), "public", src);
  expect(existsSync(ruta), src).toBe(true);
  if (src.endsWith(".svg")) expect(readFileSync(ruta, "utf8")).toContain('viewBox="0 0 1000 1000"');
}

describe("arte del living", () => {
  it("el cuarto del living sale del manifiesto y es de 1000 x 1000", () => {
    esCuadroDeMil(FONDO_CUARTO.living, /^\/arte\/living\/cuarto_living\.(svg|png|webp)$/);
    const { container } = render(<FondoCuarto cuarto="living" />);
    expect(container.querySelector('[data-capa="cuarto_living"]')).not.toBeNull();
  });
  it("la mesa vista desde arriba sale del manifiesto y es de 1000 x 1000", () => {
    esCuadroDeMil(ARTE_MESA, /^\/arte\/living\/mesa_arriba\.(svg|png|webp)$/);
  });
  it("la mesa cae dentro del cuarto", () => {
    const { x, y, w, h } = MESA_LIVING;
    expect(w).toBeGreaterThan(0);
    expect(h).toBeGreaterThan(0);
    expect(x).toBeGreaterThanOrEqual(0);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(x + w).toBeLessThanOrEqual(1000);
    expect(y + h).toBeLessThanOrEqual(1000);
  });
  it("la vaca se para en el piso, al lado de la mesa y sin taparla", () => {
    const { x, y } = PARADA_VACA;
    const m = MESA_LIVING;
    const dentro = x >= m.x && x <= m.x + m.w && y >= m.y && y <= m.y + m.h;
    expect(dentro).toBe(false);
    // sobre el piso del cuarto (el rombo de 0 a 10 en u y v)
    const { u, v } = alPiso(x, y);
    for (const c of [u, v]) {
      expect(c).toBeGreaterThan(0);
      expect(c).toBeLessThan(10);
    }
    // la vaca mide 170 de ancho y se apoya en las patas: su cuadro no se monta sobre la mesa
    const vaca = { x0: x - 85, x1: x + 85, y0: y - 160, y1: y };
    const choca = vaca.x0 < m.x + m.w && vaca.x1 > m.x && vaca.y0 < m.y + m.h && vaca.y1 > m.y;
    expect(choca).toBe(false);
    // y queda cerca: a menos de un cuerpo de vaca del borde de la mesa
    const dx = Math.max(m.x - x, 0, x - (m.x + m.w));
    const dy = Math.max(m.y - y, 0, y - (m.y + m.h));
    expect(Math.hypot(dx, dy)).toBeLessThan(170);
  });
});

describe("arte de la casa entera", () => {
  it("FONDO_CASA sale del manifiesto y el SVG existe en public/arte/casa/, de 1000 x 1000", () => {
    expect(FONDO_CASA).toBeDefined();
    esCuadroDeMil(FONDO_CASA, /^\/arte\/casa\/casa_entera\.(svg|png|webp)$/);
    expect(existsSync(join(process.cwd(), "public", "arte", "casa", "casa_entera.svg"))).toBe(true);
  });
});
