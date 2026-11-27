/**
 * Ficha de datos del living (客厅) para el motor de cuartos: qué objetos hay, qué se hace con cada uno y
 * en qué orden pasa el reloj. Las zonas y los pies salen de `MUEBLES_LIVING` con `proyectar`, igual que
 * `MESA_LIVING`, así el dibujo y el toque nunca se desalinean.
 */
import { S } from "@/lib/silabas";
import { proyectar, type Punto } from "../cocina/iso";
import type { DefCuarto, Zona } from "../motor/tipos";
import { MESA_LIVING, MUEBLES_LIVING, PARADA_VACA, PIEZAS_LIVING, SILLA, SILLAS_LIVING } from "./lugares";

const r1 = (n: number) => Math.round(n * 10) / 10;
const pie = (u: number, v: number, z = 0): Punto => {
  const p = proyectar(u, v, z);
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

const { sofa, muebleTele: tele, foto } = MUEBLES_LIVING;
/**
 * La silla del 坐: la de la izquierda de la mesa, con el respaldo detrás de la vaca. Sentada ahí queda mirando
 * hacia acá, con la mesa delante (su capa la tapa de la cintura para abajo).
 */
const silla = SILLAS_LIVING.izquierda;
/** Respaldo y asiento de la silla del 坐 (desde donde termina la zona de la tele: el respaldo alto queda delante de ella). */
const zonaSilla = zonaDe(silla.u - SILLA.s, silla.u + SILLA.s, silla.v - SILLA.s, silla.v + SILLA.s, SILLA.zA, SILLA.zR, MESA_LIVING.y);
/** La mesa empieza donde termina la silla: la punta izquierda del tablero, que la silla tapa, es de la silla. */
const xMesa = zonaSilla.x + zonaSilla.w;

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
      // sobre los cojines del asiento (v 0.72 a 1.5, arriba a z 1.08 en `arte-iso.ts`), al centro del sofá
      asiento: pie((sofa.u0 + sofa.u1) / 2, 1.15, 1.08),
      acciones: ["zuo"],
    },
    {
      id: "dianshi",
      nombre: S("电视", "diàn shì", "44"),
      // mueble y pantalla (hasta z 3.2); el pie del mueble se recorta donde empieza la mesa
      zona: zonaDe(tele.u0, tele.u1, tele.v0, tele.v1, 0, 3.2, undefined, MESA_LIVING.y - 1),
      pie: pie(2.4, 3.0),
      acciones: ["kan"],
      enciende: "kan",
    },
    {
      id: "zhaopian",
      nombre: S("照片", "zhào piàn", "44"),
      // en la pared, sobre el respaldo del sofá
      zona: zonaDe(foto.u0, foto.u1, 0, 0.01, foto.z0, foto.z1),
      // bajo la foto, frente al sofá
      pie: pie(3.3, 2.6),
      acciones: [],
      abre: "foto",
    },
    {
      id: "zhuozi",
      nombre: S("桌子", "zhuō zi", "15"),
      zona: { x: xMesa, y: MESA_LIVING.y, w: r1(MESA_LIVING.x + MESA_LIVING.w - xMesa), h: MESA_LIVING.h },
      pie: { x: PARADA_VACA.x, y: PARADA_VACA.y },
      acciones: [],
      abre: "mesa",
    },
    {
      id: "yizi",
      nombre: S("椅子", "yǐ zi", "35"),
      zona: zonaSilla,
      // de pie a la izquierda de la silla, delante de todo
      pie: pie(silla.u - 0.3, silla.v + 1.5),
      // sobre el cojín
      asiento: pie(silla.u, silla.v, SILLA.zB),
      acciones: ["zuo"],
    },
  ],
  piezas: PIEZAS_LIVING,
  acciones: [
    { id: "zuo", verbo: S("坐", "zuò", "4"), frase: S("我坐下", "wǒ zuò xià", "344"), icono: "🪑", pose: "sentada" },
    { id: "kan", verbo: S("看", "kàn", "4"), frase: S("我看电视", "wǒ kàn diàn shì", "3444"), icono: "📺", pose: "mira" },
  ],
};
