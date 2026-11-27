import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render } from "@testing-library/react";
import { existsSync } from "node:fs";
import { join } from "node:path";

vi.mock("@/components/casa/audio/voz", () => ({
  decir: vi.fn(() => Promise.resolve(true)),
  callar: vi.fn(),
  desbloquearAudio: vi.fn(),
}));

import { decir } from "@/components/casa/audio/voz";
import { Foto } from "@/components/casa/living/Foto";
import { FAMILIA, fraseDe } from "@/components/casa/living/familia";
import { idAudio, textoHanzi } from "@/lib/silabas";
import { frasesUsadas } from "@/components/casa/audio/manifiesto";

describe("la foto de la familia", () => {
  it("cinco: papá, el hermano, la vaquita (这是我, sin adorno), la hermana y mamá, cada uno con su frase y su audio", () => {
    expect(FAMILIA.map((p) => textoHanzi(fraseDe(p)))).toEqual(["这是我爸爸", "这是我哥哥", "这是我", "这是我姐姐", "这是我妈妈"]);
    expect(FAMILIA.find((p) => p.id === "wo")!.adorno).toBeUndefined();
    const usadas = frasesUsadas().map(idAudio);
    for (const p of FAMILIA) {
      const id = idAudio(fraseDe(p));
      expect(usadas, id).toContain(id);
      expect(existsSync(join(process.cwd(), "public/audio/cocina", `${id}.mp3`)), id).toBe(true);
    }
  });

  it("tocar a mamá: la vaquita dice 这是我妈妈, sale el globo y queda marcada; ← vuelve", async () => {
    const alCerrar = vi.fn();
    const { container, getByRole } = render(<Foto alCerrar={alCerrar} />);
    const mama = container.querySelector<HTMLElement>('[data-pariente="mama"]')!;
    expect(mama.getAttribute("aria-label")).toBe("妈妈");
    await act(async () => {
      fireEvent.click(mama);
    });
    expect(vi.mocked(decir).mock.calls.at(-1)![0].map(([hz]) => hz).join("")).toBe("这是我妈妈");
    expect(getByRole("status").getAttribute("aria-label")).toBe("这是我妈妈");
    expect(mama.hasAttribute("data-visto")).toBe(true);
    fireEvent.click(getByRole("button", { name: "返回" }));
    expect(alCerrar).toHaveBeenCalled();
  });
});
