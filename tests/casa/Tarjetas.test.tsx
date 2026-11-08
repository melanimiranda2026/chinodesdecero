import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Tarjetas } from "@/components/casa/Tarjetas";

const base = { anotado: false, alEntrar: vi.fn(), alSeguir: vi.fn(), alCerrar: vi.fn() };

describe("Tarjetas", () => {
  it("pronto: invita a dejar el correo", () => {
    render(<Tarjetas {...base} capa="pronto" />);
    expect(screen.getByText("Este cuarto abre pronto. Deja tu correo y te avisamos.")).toBeTruthy();
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
