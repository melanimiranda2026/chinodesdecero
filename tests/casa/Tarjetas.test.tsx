import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Tarjetas } from "@/components/casa/Tarjetas";

const base = { anotado: false, alEntrar: vi.fn(), alSeguir: vi.fn(), alCerrar: vi.fn() };

describe("Tarjetas", () => {
  it("pronto: invita a dejar el correo", () => {
    render(<Tarjetas {...base} capa="pronto" />);
    expect(screen.getByText("Este cuarto abre pronto. Deja tu correo y marca la casilla: te avisamos.")).toBeTruthy();
  });
  it("pronto con anotado=true muestra el texto de ya anotada/o", () => {
    render(<Tarjetas {...base} capa="pronto" anotado />);
    expect(screen.getByText("Ya estás anotada/o. Te avisamos cuando abra.")).toBeTruthy();
    expect(screen.queryByText(/Deja tu correo/)).toBeNull();
  });
  it("pronto: pone el formulario en su hueco", () => {
    render(<Tarjetas {...base} capa="pronto" formulario={<div>FORM</div>} />);
    expect(screen.getByText("FORM")).toBeTruthy();
  });
  it("entrada: botón entrar, sin cerrar con Escape", () => {
    const alEntrar = vi.fn();
    const alCerrar = vi.fn();
    render(<Tarjetas {...base} alEntrar={alEntrar} alCerrar={alCerrar} capa="entrada" />);
    const d = screen.getByRole("dialog");
    expect(d.getAttribute("aria-modal")).toBe("true");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(alCerrar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Entrar a la casa" }));
    expect(alEntrar).toHaveBeenCalled();
  });
  it("pronto: Escape cierra y el botón principal recibe el foco", () => {
    const alCerrar = vi.fn();
    render(<Tarjetas {...base} alCerrar={alCerrar} capa="pronto" />);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cerrar" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(alCerrar).toHaveBeenCalled();
  });
  it("metodo: texto y botón seguir", () => {
    const alSeguir = vi.fn();
    render(<Tarjetas {...base} alSeguir={alSeguir} capa="metodo" />);
    expect(screen.getByText(/Eso es el Método Jìn/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Seguir explorando" }));
    expect(alSeguir).toHaveBeenCalled();
  });
  it("sin capa no pinta nada", () => {
    render(<Tarjetas {...base} capa={null} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("Tarjetas: foco", () => {
  it("un re-render del padre no le quita el foco a un input del formulario", () => {
    const formulario = <input aria-label="correo" />;
    const { rerender } = render(<Tarjetas {...base} capa="pronto" formulario={formulario} />);
    const input = screen.getByLabelText("correo");
    input.focus();
    expect(document.activeElement).toBe(input);
    // callbacks nuevos en cada render, como hace Casa
    rerender(<Tarjetas {...base} alEntrar={() => {}} alSeguir={() => {}} alCerrar={() => {}} capa="pronto" formulario={formulario} />);
    rerender(<Tarjetas {...base} alEntrar={() => {}} alSeguir={() => {}} alCerrar={() => {}} capa="pronto" formulario={formulario} />);
    expect(document.activeElement).toBe(input);
  });
  it("Escape usa el último callback", () => {
    const viejo = vi.fn();
    const nuevo = vi.fn();
    const { rerender } = render(<Tarjetas {...base} alCerrar={viejo} capa="pronto" />);
    rerender(<Tarjetas {...base} alCerrar={nuevo} capa="pronto" />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(nuevo).toHaveBeenCalled();
    expect(viejo).not.toHaveBeenCalled();
  });
  it("al cerrar la tarjeta el foco vuelve al elemento previo", () => {
    const b = document.createElement("button");
    document.body.appendChild(b);
    b.focus();
    const { rerender } = render(<Tarjetas {...base} capa="pronto" />);
    expect(document.activeElement).not.toBe(b);
    rerender(<Tarjetas {...base} capa={null} />);
    expect(document.activeElement).toBe(b);
    b.remove();
  });
});
