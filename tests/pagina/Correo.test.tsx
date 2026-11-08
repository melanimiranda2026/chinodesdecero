import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Correo } from "@/components/pagina/Correo";
import { CLAVE_AVANCE, EVENTO_AVANCE, cargarAvance } from "@/components/casa/avance";
import { ESTADO_INICIAL } from "@/components/casa/cocina/datos";

const respuesta = (status: number) => new Response(status === 200 ? '{"ok":true}' : '{"error":"x"}', { status });

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => vi.restoreAllMocks());

describe("Correo", () => {
  it("la casilla empieza sin marcar", () => {
    render(<Correo origen="pronto" />);
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
    expect(screen.getByText(/Quiero recibir novedades de Chino desde cero/)).toBeTruthy();
  });
  it("envía consentimiento:false si no se marca", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(respuesta(200));
    render(<Correo origen="pronto" />);
    fireEvent.change(screen.getByLabelText("Tu correo"), { target: { value: "a@b.cl" } });
    fireEvent.click(screen.getByRole("button", { name: "Avísame" }));
    await screen.findByText(/¡Listo! Guardamos tu correo para tu avance/);
    const cuerpo = JSON.parse((f.mock.calls[0][1] as RequestInit).body as string);
    expect(cuerpo).toMatchObject({ email: "a@b.cl", consentimiento: false, origen: "pronto", sitio: "" });
    expect(cargarAvance().correo).toBe("a@b.cl");
  });
  it("doble clic en Avísame hace un solo fetch y deshabilita el botón", async () => {
    let resolver!: (r: Response) => void;
    const f = vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise((r) => (resolver = r)));
    render(<Correo origen="pie" />);
    fireEvent.change(screen.getByLabelText("Tu correo"), { target: { value: "a@b.cl" } });
    fireEvent.click(screen.getByRole("checkbox"));
    const boton = screen.getByRole("button", { name: "Avísame" });
    fireEvent.click(boton);
    fireEvent.click(boton);
    expect(f).toHaveBeenCalledTimes(1);
    expect((boton as HTMLButtonElement).disabled).toBe(true);
    expect(JSON.parse((f.mock.calls[0][1] as RequestInit).body as string).consentimiento).toBe(true);
    resolver(respuesta(200));
    await screen.findByRole("status");
  });
  it("si falla, muestra un error amable y vuelve a habilitar el botón", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(respuesta(503));
    render(<Correo origen="pronto" />);
    fireEvent.change(screen.getByLabelText("Tu correo"), { target: { value: "a@b.cl" } });
    fireEvent.click(screen.getByRole("button", { name: "Avísame" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/No pudimos guardar tu correo/);
    await waitFor(() => expect((screen.getByRole("button", { name: "Avísame" }) as HTMLButtonElement).disabled).toBe(false));
    expect(cargarAvance().correo).toBeUndefined();
  });
  it("dos submit seguidos hacen un solo fetch", () => {
    const f = vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(() => {}));
    const { container } = render(<Correo origen="pie" />);
    fireEvent.change(screen.getByLabelText("Tu correo"), { target: { value: "a@b.cl" } });
    const form = container.querySelector("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(f).toHaveBeenCalledTimes(1);
  });

  const llenar = (valor = "a@b.cl") => fireEvent.change(screen.getByLabelText("Tu correo"), { target: { value: valor } });
  const enviar = () => fireEvent.click(screen.getByRole("button", { name: "Avísame" }));

  it("con la casilla: dice que te avisamos, deja la línea del enlace y quita el formulario", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(respuesta(200));
    render(<Correo origen="pie" />);
    llenar();
    fireEvent.click(screen.getByRole("checkbox"));
    enviar();
    const estado = await screen.findByRole("status");
    expect(estado.textContent).toContain("Ya estás anotada/o. Te avisamos cuando abra.");
    expect(estado.textContent).toContain("Te llegará un enlace para guardar tu avance en cualquier dispositivo.");
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("sin la casilla: no promete avisar, invita a marcarla y el formulario sigue para marcarla", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(respuesta(200));
    render(<Correo origen="pie" />);
    llenar();
    enviar();
    const estado = await screen.findByRole("status");
    expect(estado.textContent).not.toContain("Te avisamos");
    expect(estado.textContent).toContain("Si quieres que te avisemos cuando abra, marca la casilla.");
    expect(estado.textContent).toContain("Te llegará un enlace para guardar tu avance en cualquier dispositivo.");
    fireEvent.click(screen.getByRole("checkbox"));
    await waitFor(() => expect((screen.getByRole("button", { name: "Avísame" }) as HTMLButtonElement).disabled).toBe(false));
    enviar();
    await screen.findByText(/Ya estás anotada\/o/);
    expect(JSON.parse((f.mock.calls[1][1] as RequestInit).body as string).consentimiento).toBe(true);
  });

  it("avisa a la casa con el correo y si marcó la casilla", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(respuesta(200));
    const avisos: unknown[] = [];
    const oir = (e: Event) => avisos.push((e as CustomEvent).detail);
    window.addEventListener(EVENTO_AVANCE, oir);
    render(<Correo origen="pie" />);
    llenar();
    fireEvent.click(screen.getByRole("checkbox"));
    enviar();
    await screen.findByRole("status");
    window.removeEventListener(EVENTO_AVANCE, oir);
    expect(avisos).toEqual([{ correo: "a@b.cl", avisar: true }]);
  });

  it("envía el avance de este navegador sin el correo", async () => {
    localStorage.setItem(CLAVE_AVANCE, JSON.stringify({ estado: ESTADO_INICIAL, medallas: { cortar: "oro" }, escuchadas: ["x"], correo: "viejo@b.cl" }));
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(respuesta(200));
    render(<Correo origen="pie" />);
    llenar();
    enviar();
    await screen.findByRole("status");
    const cuerpo = JSON.parse((f.mock.calls[0][1] as RequestInit).body as string);
    expect(cuerpo.avance).toEqual({ estado: ESTADO_INICIAL, medallas: { cortar: "oro" }, escuchadas: ["x"] });
  });

  it("el campo trampa está oculto y fuera del orden de foco; si se llena, viaja como `sitio`", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(respuesta(200));
    const { container } = render(<Correo origen="pie" />);
    const trampa = container.querySelector('input[name="sitio"]') as HTMLInputElement;
    expect(trampa.tabIndex).toBe(-1);
    expect(trampa.closest("[aria-hidden=true]")).toBeTruthy();
    fireEvent.change(trampa, { target: { value: "bot" } });
    llenar();
    enviar();
    await screen.findByRole("status");
    expect(JSON.parse((f.mock.calls[0][1] as RequestInit).body as string).sitio).toBe("bot");
  });

  it("429: pide esperar", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(respuesta(429));
    render(<Correo origen="pie" />);
    llenar();
    enviar();
    expect((await screen.findByRole("alert")).textContent).toMatch(/Espera un rato/);
  });

  it("lleva la nota de privacidad con el contacto para borrar el correo", () => {
    render(<Correo origen="pie" />);
    expect(screen.getByText(/Usamos tu correo solo para tu avance y, si lo marcas, para avisarte de novedades/).textContent).toContain(
      "CONFIRMAR@correo",
    );
  });
});
