import { S, idAudio, textoHanzi } from "@/lib/silabas";
test("S arma una sílaba por hanzi", () => {
  expect(S("杯子", "bēi zi", "15")).toEqual([["杯", "bēi", 1], ["子", "zi", 5]]);
});
test("idAudio: pinyin sin marcas + número de tono, unido con _", () => {
  expect(idAudio(S("我喝水", "wǒ hē shuǐ", "313"))).toBe("wo3_he1_shui3");
  expect(idAudio(S("绿", "lǜ", "4"))).toBe("lv4");
});
test("textoHanzi junta los caracteres", () => {
  expect(textoHanzi(S("这是碗", "zhè shì wǎn", "443"))).toBe("这是碗");
});
test("S rechaza largo distinto", () => {
  expect(() => S("杯子", "bēi", "1")).toThrow();
});
