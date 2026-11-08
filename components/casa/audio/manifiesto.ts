import { idAudio, type Silaba } from "@/lib/silabas";
import { OBJETOS } from "../cocina/datos";
import { acciones, estadosAlcanzables } from "../cocina/acciones";
import { BU_DUI, DUI, GEI_WO, HAO, HEN_HAO, NI_HAO, TAI_BANG_LE, ZHE_SHI } from "../cocina/frases";
import type { ObjetoId } from "../cocina/datos";

/** Todas las frases que la casa puede decir, sin repetidas por idAudio. */
export function frasesUsadas(): Silaba[][] {
  const todas: Silaba[][] = [];
  for (const o of Object.values(OBJETOS)) {
    todas.push(o.nombre, [...ZHE_SHI, ...o.nombre], [...GEI_WO, ...o.nombre]);
  }
  const ids = Object.keys(OBJETOS) as ObjetoId[];
  for (const e of estadosAlcanzables()) {
    for (const id of ids) {
      for (const a of acciones(id, e)) todas.push(a.verbo, a.frase);
    }
  }
  todas.push(DUI, BU_DUI, TAI_BANG_LE, HEN_HAO, HAO, NI_HAO);

  const vistos = new Set<string>();
  return todas.filter((f) => {
    const id = idAudio(f);
    if (vistos.has(id)) return false;
    vistos.add(id);
    return true;
  });
}
