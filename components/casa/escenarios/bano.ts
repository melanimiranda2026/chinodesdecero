/**
 * El baño (浴室): la rutina de la noche (ducharse, secarse, lavarse los dientes, skincare). Por ahora es solo su
 * dibujo: se ve amueblado en la casa entera, pero todavía no se entra (etapa 3 de la hoja de ruta).
 */
import type { DefEscenario } from "./tipos";

export const BANO: DefEscenario = {
  id: "bano",
  nombre: "浴室",
  ambiente: {
    piso: { tipo: "baldosas", color: "#D6E9EE", linea: "#B3D0D8", paso: 1.25 },
    paredes: { izq: "#E0EEF1", der: "#EDF6F8", zocalo: "#8FB8C4" },
    friso: { color: "#F4FAFB", linea: "#BCD6DD", alto: 2.4, azulejo: 0.6 },
  },
  colgados: [
    { tipo: "ventana", id: "chuanghu", pared: "der", desde: 1.3, hasta: 3.1, z0: 4.0, z1: 5.5 },
    { tipo: "repisa", id: "jiazi", pared: "der", desde: 4.9, hasta: 6.6, z0: 2.95, z1: 3.1 },
    { tipo: "toallero", id: "maojin", pared: "der", desde: 7.0, hasta: 8.3, z0: 1.7, z1: 3.3, color: "#E0896A" },
  ],
  muebles: [
    /** yùgāng: tina con ducha */
    { tipo: "tina", id: "yugang", base: { u0: 0, u1: 4.2, v0: 0, v1: 2.1 }, cortina: "#BCD4A8" },
    { tipo: "alfombra", id: "ditan", base: { u0: 1.2, u1: 3.6, v0: 2.5, v1: 3.6 }, color: "#BCD4A8", borde: "#8DAE7B" },
    /** xǐshǒuchí: lavamanos con espejo (jìngzi) y el vaso con los cepillos (yáshuā) */
    { tipo: "lavamanos", id: "xishouchi", base: { u0: 0, u1: 1.5, v0: 4.2, v1: 6.0 } },
    /** mǎtǒng: inodoro */
    { tipo: "inodoro", id: "matong", base: { u0: 0, u1: 1.6, v0: 7.2, v1: 8.3 } },
    { tipo: "planta", id: "zhiwu", u: 9.35, v: 0.55 },
  ],
};
