import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cargarAvance, guardarAvance, CLAVE_AVANCE, validarAvance, avanceInicial } from "@/components/casa/avance";
import { registrar, enviarEventos, reiniciarEventos } from "@/components/casa/eventos";
import { ESTADO_INICIAL } from "@/components/casa/cocina/datos";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  reiniciarEventos();
});
afterEach(() => vi.restoreAllMocks());

describe("avance", () => {
  it("sin nada guardado devuelve el inicial", () => {
    expect(cargarAvance()).toEqual({ estado: ESTADO_INICIAL, medallas: {}, escuchadas: [] });
  });
  it("si localStorage.getItem lanza, devuelve el inicial; guardar no lanza", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("lleno");
    });
    expect(cargarAvance()).toEqual(avanceInicial());
    expect(() => guardarAvance(avanceInicial())).not.toThrow();
  });
  it("guarda y recupera en cdc.avance.v1", () => {
    const a = { ...avanceInicial(), escuchadas: ["ni3"], medallas: { cortar: "oro" as const } };
    guardarAvance(a);
    expect(localStorage.getItem(CLAVE_AVANCE)).toBeTruthy();
    expect(cargarAvance()).toEqual(a);
  });
  it("JSON roto o forma desconocida cae al inicial por objeto", () => {
    localStorage.setItem(CLAVE_AVANCE, "{no es json");
    expect(cargarAvance()).toEqual(avanceInicial());
    const v = validarAvance({ estado: { beizi: "vacio", extra: "x" }, medallas: { a: "diamante", b: "plata" }, escuchadas: ["x", 3, "x"] });
    expect(v.estado).toEqual(ESTADO_INICIAL);
    expect(v.medallas).toEqual({ b: "plata" });
    expect(v.escuchadas).toEqual(["x"]);
  });
});

describe("eventos", () => {
  it("junta en cola, envía como Blob application/json con sendBeacon al salir y nunca lanza", async () => {
    const beacon = vi.fn(() => true);
    Object.defineProperty(navigator, "sendBeacon", { value: beacon, configurable: true });
    registrar("entrar");
    registrar("tocar_objeto", { id: "beizi" });
    enviarEventos(true);
    expect(beacon).toHaveBeenCalledTimes(1);
    const [url, blob] = beacon.mock.calls[0] as unknown as [string, Blob];
    expect(url).toBe("/api/eventos");
    expect(blob.type).toBe("application/json");
    const cuerpo = JSON.parse(await blob.text());
    expect(cuerpo.eventos.map((e: { nombre: string }) => e.nombre)).toEqual(["entrar", "tocar_objeto"]);
    expect(typeof cuerpo.sesion).toBe("string");
  });
  it("ignora nombres desconocidos", () => {
    const beacon = vi.fn(() => true);
    Object.defineProperty(navigator, "sendBeacon", { value: beacon, configurable: true });
    // @ts-expect-error nombre fuera de la lista
    registrar("inventado");
    enviarEventos(true);
    expect(beacon).not.toHaveBeenCalled();
  });
});

import { estadoValido } from "@/components/casa/avance";
import { estadosAlcanzables } from "@/components/casa/cocina/acciones";

describe("estadoValido: valores y combinaciones", () => {
  it("acepta un estado alcanzable", () => {
    const e = estadosAlcanzables().find((x) => x.pingguo === "limpio")!;
    expect(estadoValido(e)).toEqual(e);
  });
  it("forma valida con un valor inexistente cae al inicial", () => {
    expect(estadoValido({ ...ESTADO_INICIAL, pingguo: "xyz" })).toEqual(ESTADO_INICIAL);
  });
  it("un valor real de otro objeto pero inalcanzable en este (kuaizi sucio) cae al inicial", () => {
    // El espacio alcanzable es el producto completo de valores por objeto (864 estados): no hay
    // "combinacion" imposible, solo valores imposibles; los palillos nunca se ensucian.
    const e = { ...ESTADO_INICIAL, kuaizi: "sucio" };
    expect(estadosAlcanzables().some((x) => x.kuaizi === "sucio")).toBe(false);
    expect(estadoValido(e)).toEqual(ESTADO_INICIAL);
  });
});
