import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Reproductor } from "@/components/videos/Reproductor";
import { armarCatalogo } from "@/scripts/videos-tiktok";
import { estadoDe, partesDe, seriesVisibles, type Catalogo } from "@/lib/videos/catalogo";
import { SERIES } from "@/lib/videos/series";

const cuenta = { nombre: "second brain" };
const fila = (pieza: string, id: string, views: number, red = "tiktok", nombre = "second brain") => ({
  red,
  cuenta: { nombre },
  externalId: id,
  publicadoEl: "2026-11-20T11:00:00-03:00",
  atributos: { pieza },
  metricas: { views },
});
const prog = (pieza: string, fecha: string) => ({
  fecha,
  atributos: { pieza },
  redes: [{ red: "tiktok", handle: cuenta.nombre, estado: "scheduled" }],
});

describe("catálogo de Tu Parrilla", () => {
  it("si una pieza salió dos veces, gana la de más vistas; ignora otras cuentas y redes", () => {
    const c = armarCatalogo(
      [fila("puzzle-1", "a", 600), fila("puzzle-1", "b", 11000), fila("x", "c", 9, "tiktok", "chinesebymeli"), fila("y", "d", 9, "instagram")],
      [],
    );
    expect(c.videos).toEqual({ "puzzle-1": { estado: "publicado", tiktok: "b", fecha: "2026-11-20T11:00:00-03:00" } });
  });

  it("lo publicado le gana a lo programado; de dos programados queda el más temprano", () => {
    const c = armarCatalogo(
      [fila("flash-chi", "1", 5)],
      [prog("flash-chi", "2026-11-27T11:00:00-03:00"), prog("flash-he", "2026-12-02T11:00:00-03:00"), prog("flash-he", "2026-11-28T21:45:00-03:00")],
    );
    expect(c.videos["flash-chi"].estado).toBe("publicado");
    expect(c.videos["flash-he"]).toEqual({ estado: "programado", fecha: "2026-11-28T21:45:00-03:00" });
  });
});

describe("series", () => {
  const cat: Catalogo = {
    generado: "",
    videos: {
      "kou-bocado": { estado: "publicado", tiktok: "111", fecha: "2026-11-23T21:45:00-03:00" },
      "radical-boca": { estado: "programado", fecha: "2026-11-28T11:00:00-03:00" },
    },
  };

  it("las piezas no se repiten entre series", () => {
    const piezas = SERIES.flatMap((s) => s.partes.flatMap((p) => p.videos.map((v) => v.pieza)));
    expect(new Set(piezas).size).toBe(piezas.length);
  });

  it("lo que no está publicado ni programado no se muestra, y la parte vacía tampoco", () => {
    const boca = SERIES.find((s) => s.slug === "radical-boca")!;
    const partes = partesDe(boca, cat);
    expect(partes.map((p) => p.videos.map((v) => v.pieza))).toEqual([["radical-boca"], ["kou-bocado"]]);
    expect(estadoDe({ pieza: "nada", hanzi: "无", titulo: "" }, cat)).toBeNull();
  });

  it("un video fijado por id se muestra aunque no esté en el catálogo", () => {
    expect(estadoDe({ pieza: "gratis-4", hanzi: "披萨", titulo: "Pizza", tiktok: "77" }, cat)).toMatchObject({ estado: "publicado", tiktok: "77" });
  });

  it("la boca 口 es la primera serie de /videos", () => {
    expect(seriesVisibles()[0].serie.slug).toBe("radical-boca");
  });
});

describe("reproductor", () => {
  afterEach(cleanup);
  const partes = [
    {
      titulo: "口 + algo",
      videos: [
        { pieza: "a", hanzi: "一口", titulo: "Bocado", estado: "publicado" as const, tiktok: "111" },
        { pieza: "b", hanzi: "出口", titulo: "Salida", estado: "publicado" as const, tiktok: "222" },
        { pieza: "c", hanzi: "口红", titulo: "Labial", estado: "programado" as const, fecha: "2026-11-26T11:00:00-03:00" },
      ],
    },
  ];

  it("parte con el primer video, sin autoplay, en el reproductor oficial de TikTok", () => {
    render(<Reproductor partes={partes} />);
    const src = screen.getByTitle("一口 · Bocado").getAttribute("src")!;
    expect(src).toMatch(/^https:\/\/www\.tiktok\.com\/player\/v1\/111\?/);
    expect(src).not.toContain("autoplay");
  });

  it("al tocar otro video cambia el reproductor y lo marca como actual", () => {
    render(<Reproductor partes={partes} />);
    fireEvent.click(screen.getByRole("button", { name: /^出口/ }));
    expect(screen.getByTitle("出口 · Salida").getAttribute("src")).toContain("/222?");
    expect(screen.getByRole("button", { name: /^出口/ }).getAttribute("aria-current")).toBe("true");
  });

  it("el programado no es botón y dice cuándo sale", () => {
    render(<Reproductor partes={partes} />);
    expect(screen.queryByRole("button", { name: /口红/ })).toBeNull();
    expect(screen.getByLabelText("Sale el 26 nov")).toBeTruthy();
  });

  it("“Siguiente” lleva al próximo publicado", () => {
    render(<Reproductor partes={partes} />);
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/ }));
    expect(screen.getByTitle("出口 · Salida")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Siguiente/ })).toBeNull();
  });
});
