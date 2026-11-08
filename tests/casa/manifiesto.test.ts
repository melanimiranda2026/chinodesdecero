import { describe, expect, it } from "vitest";
import { idAudio } from "@/lib/silabas";
import { frasesUsadas } from "@/components/casa/audio/manifiesto";

describe("frasesUsadas", () => {
  const ids = frasesUsadas().map(idAudio);
  it("incluye las frases clave", () => {
    for (const id of ["wo3_he1_shui3", "zhe4_shi4_bei1_zi5", "gei3_wo3_wan3", "tai4_bang4_le5", "ni2_hao3"]) {
      expect(ids).toContain(id);
    }
  });
  it("no repite ids", () => {
    expect(new Set(ids).size).toBe(ids.length);
  });
});
