import { idAudio, type Silaba } from "@/lib/silabas";
import { NOMBRES_COMIDA, COMIDAS, OBJETOS, VALORES, ESTADO_INICIAL, ACOPLADOS } from "../cocina/datos";
import { acciones, estadosAlcanzables } from "../cocina/acciones";
import { BU_DUI, DUI, GEI_WO, HAO, HEN_HAO, HEN_HAO_CHI, HEN_LENG, HEN_RE, HU_LUO_BO, MAO, MI, NI_HAO, SHUI, SHUI_GUO, TAI_BANG_LE, WEI, WO_ZUO_HAO_FAN_LE, ZHE_SHI } from "../cocina/frases";
import type { ObjetoId } from "../cocina/datos";
import { OBJETOS_QUIZ } from "../quiz";

/** Todas las frases que la casa puede decir, sin repetidas por idAudio. */
export function frasesUsadas(): Silaba[][] {
  const todas: Silaba[][] = [];
  for (const o of Object.values(OBJETOS)) todas.push(o.nombre, [...ZHE_SHI, ...o.nombre]);
  // 给我 + objeto solo para lo que el 玩 puede pedir (el refri no se pide)
  for (const id of OBJETOS_QUIZ) todas.push([...GEI_WO, ...OBJETOS[id].nombre]);
  const ids = Object.keys(OBJETOS) as ObjetoId[];
  for (const e of estadosAlcanzables()) {
    for (const id of ids) {
      for (const a of acciones(id, e)) todas.push(a.verbo, a.frase);
    }
  }
  // los objetos nuevos no entran al BFS: se recorren sus propios estados
  for (const id of ids.filter((k) => !ACOPLADOS.includes(k))) {
    for (const v of VALORES[id]) {
      for (const a of acciones(id, { ...ESTADO_INICIAL, [id]: v })) todas.push(a.verbo, a.frase);
    }
  }
  // las tres comidas, una por franja de hora
  for (const h of [8, 13, 20]) {
    for (const a of acciones("wan", { ...ESTADO_INICIAL, wan: "lleno" }, h)) todas.push(a.verbo, a.frase);
  }
  for (const c of COMIDAS) todas.push(NOMBRES_COMIDA[c]);
  todas.push(HEN_HAO_CHI, HEN_RE, HEN_LENG, WEI, MAO, WO_ZUO_HAO_FAN_LE, MI, SHUI, SHUI_GUO, HU_LUO_BO);
  todas.push(DUI, BU_DUI, TAI_BANG_LE, HEN_HAO, HAO, NI_HAO);

  const vistos = new Set<string>();
  return todas.filter((f) => {
    const id = idAudio(f);
    if (vistos.has(id)) return false;
    vistos.add(id);
    return true;
  });
}
