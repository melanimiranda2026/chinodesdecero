import type { Tono } from "./tonos";

export type Silaba = [hanzi: string, pinyin: string, tono: Tono];

/** Arma sílabas: un hanzi, una sílaba de pinyin y un dígito de tono por posición. */
export function S(hanzi: string, pinyin: string, tonos: string): Silaba[] {
  const caracteres = Array.from(hanzi);
  const partes = pinyin.split(/\s+/).filter(Boolean);
  const digitos = Array.from(tonos);
  if (caracteres.length !== partes.length || caracteres.length !== digitos.length) {
    throw new Error(`S: largo distinto en "${hanzi}" / "${pinyin}" / "${tonos}"`);
  }
  return caracteres.map((c, i) => {
    const t = Number(digitos[i]);
    if (![1, 2, 3, 4, 5].includes(t)) throw new Error(`S: tono inválido "${digitos[i]}"`);
    return [c, partes[i], t as Tono];
  });
}

function sinMarcas(pinyin: string): string {
  return pinyin
    .normalize("NFD")
    .replace(/ü/gi, (m) => (m[0] === "U" ? "V" : "v"))
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Id de archivo de audio: pinyin sin marcas + tono, unido con "_". */
export function idAudio(s: Silaba[]): string {
  return s.map(([, pinyin, tono]) => `${sinMarcas(pinyin)}${tono}`).join("_");
}

export function textoHanzi(s: Silaba[]): string {
  return s.map(([hanzi]) => hanzi).join("");
}
