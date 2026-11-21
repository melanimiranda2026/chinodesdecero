import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CLAVE_MUDO, estaMudo, ponerMudo, puedeSonar, reiniciarMotor } from "@/components/casa/audio/motor";
import { decir } from "@/components/casa/audio/voz";
import { BotonMudo } from "@/components/pagina/BotonMudo";
import { S } from "@/lib/silabas";

beforeEach(() => {
  reiniciarMotor();
  localStorage.removeItem(CLAVE_MUDO);
});
afterEach(() => {
  reiniciarMotor();
  localStorage.removeItem(CLAVE_MUDO);
});

describe("silencio (🔇)", () => {
  it("con el silencio puesto nada puede sonar, en ningún juego, y se recuerda", () => {
    expect(puedeSonar("cocina")).toBe(true);
    ponerMudo(true);
    expect(puedeSonar()).toBe(false);
    expect(puedeSonar("cocina")).toBe(false);
    expect(puedeSonar("puzzle")).toBe(false);
    expect(localStorage.getItem(CLAVE_MUDO)).toBe("1");
    ponerMudo(false);
    expect(puedeSonar("cocina")).toBe(true);
    expect(localStorage.getItem(CLAVE_MUDO)).toBe("0");
  });

  it("decir resuelve false sin intentar sonar cuando está en silencio", async () => {
    ponerMudo(true);
    await expect(decir(S("猫", "māo", "1"), { juego: "cocina" })).resolves.toBe(false);
  });

  it("el botón alterna 🔊 / 🔇 con aria-pressed y sin español visible", () => {
    render(<BotonMudo />);
    const b = screen.getByRole("button", { name: "静音" });
    expect(b.getAttribute("aria-pressed")).toBe("false");
    expect(b.textContent).toBe("🔊");
    fireEvent.click(b);
    expect(estaMudo()).toBe(true);
    expect(b.getAttribute("aria-pressed")).toBe("true");
    expect(b.textContent).toBe("🔇");
    fireEvent.click(b);
    expect(estaMudo()).toBe(false);
    expect(b.textContent).toBe("🔊");
  });

  it("al montar, el botón toma lo que eligió la persona la vez anterior", () => {
    localStorage.setItem(CLAVE_MUDO, "1");
    render(<BotonMudo />);
    expect(estaMudo()).toBe(true);
    expect(screen.getByRole("button", { name: "静音" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("dos botones (portada y otro) quedan sincronizados", () => {
    render(<><BotonMudo /><BotonMudo /></>);
    const [a, b] = screen.getAllByRole("button", { name: "静音" });
    fireEvent.click(a);
    expect(b.getAttribute("aria-pressed")).toBe("true");
    act(() => ponerMudo(false));
    expect(a.getAttribute("aria-pressed")).toBe("false");
  });
});
