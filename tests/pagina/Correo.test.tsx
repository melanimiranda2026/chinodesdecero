import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Correo } from "@/components/pagina/Correo";
import { cargarAvance } from "@/components/casa/avance";

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
    await screen.findByText(/¡Listo! Te llegará un enlace/);
    const cuerpo = JSON.parse((f.mock.calls[0][1] as RequestInit).body as string);
    expect(cuerpo).toEqual({ email: "a@b.cl", consentimiento: false, origen: "pronto" });
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
});
