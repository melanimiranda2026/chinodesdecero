/**
 * Revisión de una ficha de escenario antes de dibujarla: así un número mal escrito avisa al generar el arte en
 * vez de dejar un mueble atravesando la pared o encima de otro.
 */
import { ISO } from "../cocina/iso";
import type { Base, DefEscenario, Mueble } from "./tipos";

/** El rectángulo del piso que ocupa un mueble (la planta, un macetero de ~0,6 de lado). */
export function baseDe(m: Mueble): Base {
  if (m.tipo === "planta") return { u0: m.u - 0.3, u1: m.u + 0.3, v0: m.v - 0.3, v1: m.v + 0.3 };
  return m.base;
}

const seCruzan = (a: Base, b: Base) => a.u0 < b.u1 - 1e-6 && b.u0 < a.u1 - 1e-6 && a.v0 < b.v1 - 1e-6 && b.v0 < a.v1 - 1e-6;

/** Devuelve la lista de problemas (vacía si la ficha está bien). */
export function problemasEscenario(def: DefEscenario): string[] {
  const p: string[] = [];
  const L = ISO.lado, H = ISO.altoPared;
  const ids = new Set<string>();
  for (const x of [...def.muebles, ...def.colgados]) {
    if (ids.has(x.id)) p.push(`${def.id}: el id "${x.id}" está repetido`);
    ids.add(x.id);
  }
  for (const m of def.muebles) {
    const b = baseDe(m);
    if (b.u0 < 0 || b.v0 < 0 || b.u1 > L || b.v1 > L) p.push(`${def.id}: "${m.id}" se sale del piso`);
    if (b.u0 >= b.u1 || b.v0 >= b.v1) p.push(`${def.id}: "${m.id}" tiene la base al revés o vacía`);
  }
  // los muebles con volumen no se pisan (la alfombra es plana: va debajo)
  const solidos = def.muebles.filter((m) => m.tipo !== "alfombra");
  for (let i = 0; i < solidos.length; i++)
    for (let j = i + 1; j < solidos.length; j++)
      if (seCruzan(baseDe(solidos[i]), baseDe(solidos[j]))) p.push(`${def.id}: "${solidos[i].id}" y "${solidos[j].id}" se pisan`);
  for (const c of def.colgados) {
    if (c.desde < 0 || c.hasta > L || c.desde >= c.hasta) p.push(`${def.id}: "${c.id}" se sale de la pared`);
    if (c.z0 < 0 || c.z1 > H || c.z0 >= c.z1) p.push(`${def.id}: "${c.id}" está fuera de la altura de la pared`);
  }
  return p;
}

/**
 * Orden de dibujo (de atrás hacia adelante): las alfombras primero; después, un mueble va antes que otro si
 * queda entero detrás de él en u o en v. Entre los que no se tapan, el de menor u + v primero.
 */
export function ordenDeDibujo(muebles: Mueble[]): Mueble[] {
  const planos = muebles.filter((m) => m.tipo === "alfombra");
  const resto = muebles.filter((m) => m.tipo !== "alfombra");
  const detras = (a: Mueble, b: Mueble) => {
    const x = baseDe(a), y = baseDe(b);
    return x.u1 <= y.u0 + 1e-6 || x.v1 <= y.v0 + 1e-6;
  };
  const centro = (m: Mueble) => { const b = baseDe(m); return b.u0 + b.u1 + b.v0 + b.v1; };
  const pendientes = [...resto].sort((a, b) => centro(a) - centro(b));
  const orden: Mueble[] = [];
  while (pendientes.length) {
    // el primero que no tiene a nadie pendiente detrás de él (si hay un ciclo, el de menor u + v)
    const k = pendientes.findIndex((m) => !pendientes.some((o) => o !== m && detras(o, m) && !detras(m, o)));
    orden.push(...pendientes.splice(k < 0 ? 0 : k, 1));
  }
  return [...planos, ...orden];
}
