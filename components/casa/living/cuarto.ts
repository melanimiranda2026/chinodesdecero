/**
 * Ficha de datos del living (客厅) para el motor de cuartos: qué objetos hay, qué se hace con cada uno y
 * en qué orden pasa el reloj. Las zonas y los pies salen de `MUEBLES_LIVING` con `proyectar`, igual que
 * `MESA_LIVING`, así el dibujo y el toque nunca se desalinean.
 */
import { S } from "@/lib/silabas";
import { proyectar, type Punto } from "../cocina/iso";
import type { DefCuarto, Zona } from "../motor/tipos";
import { MESA_LIVING, MUEBLES_LIVING, PARADA_VACA } from "./lugares";

const r1 = (n: number) => Math.round(n * 10) / 10;
const pie = (u: number, v: number): Punto => {
  const p = proyectar(u, v);
  return { x: r1(p.x), y: r1(p.y) };
};

/** Rectángulo en pantalla que encierra las 8 esquinas de una caja (u, v, z). `yMin`/`yMax` recortan para no pisar otra zona. */
function zonaDe(u0: number, u1: number, v0: number, v1: number, z0: number, z1: number, yMin?: number, yMax?: number): Zona {
  const ps = [u0, u1].flatMap((u) => [v0, v1].flatMap((v) => [z0, z1].map((z) => proyectar(u, v, z))));
  const xs = ps.map((p) => p.x);
  const ys = ps.map((p) => p.y);
  const y0 = Math.max(Math.min(...ys), yMin ?? -Infinity);
  const y1 = Math.min(Math.max(...ys), yMax ?? Infinity);
  return { x: r1(Math.min(...xs)), y: r1(y0), w: r1(Math.max(...xs) - Math.min(...xs)), h: r1(y1 - y0) };
}

const { sofa, muebleTele: tele, mesa } = MUEBLES_LIVING;
const mesaAbajo = MESA_LIVING.y + MESA_LIVING.h;
/** La silla de adelante de la mesa (lado v+), la misma que dibuja `arte-iso.ts` (medio lado 0.36, respaldo a 2.35). */
const silla = { u: (mesa.u0 + mesa.u1) / 2, v: mesa.v1 + 0.55, s: 0.36, alto: 2.35 };

export const LIVING: DefCuarto = {
  id: "living",
  hora: [7, 11],
  salida: "cocina",
  objetos: [
    {
      id: "shafa",
      nombre: S("沙发", "shā fā", "11"),
      // el frente del sofá se recorta donde empieza la mesa
      zona: zonaDe(sofa.u0, sofa.u1, sofa.v0, sofa.v1, 0, 2.05, undefined, MESA_LIVING.y - 1),
      pie: pie(3.5, 2.8),
      acciones: ["zuo"],
    },
    {
      id: "yizi",
      nombre: S("椅子", "yǐ zi", "35"),
      // el respaldo queda detrás de la mesa: la zona empieza donde la mesa termina
      zona: zonaDe(silla.u - silla.s, silla.u + silla.s, silla.v - silla.s, silla.v + silla.s, 0, silla.alto, mesaAbajo + 1),
      pie: pie(silla.u, silla.v + 1.3),
      acciones: ["zuo"],
    },
    {
      id: "dianshi",
      nombre: S("电视", "diàn shì", "44"),
      // mueble y pantalla (hasta z 3.2); el pie del mueble se recorta donde empieza la mesa
      zona: zonaDe(tele.u0, tele.u1, tele.v0, tele.v1, 0, 3.2, undefined, MESA_LIVING.y - 1),
      pie: pie(2.4, 3.0),
      acciones: ["kan"],
    },
    {
      id: "zhuozi",
      nombre: S("桌子", "zhuō zi", "15"),
      zona: { x: MESA_LIVING.x, y: MESA_LIVING.y, w: MESA_LIVING.w, h: MESA_LIVING.h },
      pie: { x: PARADA_VACA.x, y: PARADA_VACA.y },
      acciones: [],
      abre: "mesa",
    },
  ],
  acciones: [
    { id: "zuo", verbo: S("坐", "zuò", "4"), frase: S("我坐下", "wǒ zuò xià", "344"), icono: "🪑", pose: "sentada" },
    { id: "kan", verbo: S("看", "kàn", "4"), frase: S("我看电视", "wǒ kàn diàn shì", "3444"), icono: "📺", pose: "mira" },
  ],
};
