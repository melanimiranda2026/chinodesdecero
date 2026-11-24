import { idAudio, type Silaba } from "@/lib/silabas";
import type { DefCuarto, ProgresoCuarto } from "./tipos";

export const progresoVacio = (): ProgresoCuarto => ({ tocados: [], logros: [] });

export function tocar(p: ProgresoCuarto, objetoId: string): ProgresoCuarto {
  return p.tocados.includes(objetoId) ? p : { ...p, tocados: [...p.tocados, objetoId] };
}

export function lograr(p: ProgresoCuarto, accionId: string, objetoId: string): ProgresoCuarto {
  const logro = `${accionId}@${objetoId}`;
  return p.logros.includes(logro) ? p : { ...p, logros: [...p.logros, logro] };
}

export const fichaId = (s: Silaba[]): string => idAudio(s);

/** Todos los logros posibles del cuarto, en orden de `def`. */
function logrosDe(def: DefCuarto): string[] {
  return def.objetos.flatMap((o) => o.acciones.map((a) => `${a}@${o.id}`));
}

/** Fichas ganadas: el sustantivo de cada objeto tocado y el verbo de cada acción lograda en todos los objetos que la ofrecen. */
export function fichasDe(def: DefCuarto, p: ProgresoCuarto): string[] {
  const fichas: string[] = [];
  for (const o of def.objetos) if (p.tocados.includes(o.id)) fichas.push(fichaId(o.nombre));
  for (const a of def.acciones) {
    const ofrecen = def.objetos.filter((o) => o.acciones.includes(a.id));
    if (ofrecen.length > 0 && ofrecen.every((o) => p.logros.includes(`${a.id}@${o.id}`))) fichas.push(fichaId(a.verbo));
  }
  return fichas;
}

export function todasLasFichas(def: DefCuarto): string[] {
  return [...def.objetos.map((o) => fichaId(o.nombre)), ...def.acciones.map((a) => fichaId(a.verbo))];
}

export function falta(def: DefCuarto, p: ProgresoCuarto): { objetos: string[]; logros: string[] } {
  return {
    objetos: def.objetos.map((o) => o.id).filter((id) => !p.tocados.includes(id)),
    logros: logrosDe(def).filter((l) => !p.logros.includes(l)),
  };
}

export function completo(def: DefCuarto, p: ProgresoCuarto): boolean {
  const f = falta(def, p);
  return f.objetos.length === 0 && f.logros.length === 0;
}

/** Pasos del cuarto: cada objeto por tocar y cada acción por lograr en cada objeto. */
export function pasosDe(def: DefCuarto, p: ProgresoCuarto): { hechos: number; total: number } {
  const total = def.objetos.length + logrosDe(def).length;
  const f = falta(def, p);
  return { hechos: total - f.objetos.length - f.logros.length, total };
}

export function horaDe(def: DefCuarto, p: ProgresoCuarto): number {
  const [ini, fin] = def.hora;
  const { hechos, total } = pasosDe(def, p);
  return total === 0 ? ini : ini + ((fin - ini) * hechos) / total;
}
