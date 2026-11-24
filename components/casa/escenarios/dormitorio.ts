/**
 * El dormitorio (卧室): la vaca se acuesta, despierta y abre el closet para elegir la ropa (que abre un mundo).
 * Por ahora es solo su dibujo: se ve amueblado en la casa entera, pero todavía no se entra (etapa 4).
 */
import type { DefEscenario } from "./tipos";

export const DORMITORIO: DefEscenario = {
  id: "dormitorio",
  nombre: "卧室",
  ambiente: {
    piso: { tipo: "tablas" },
    paredes: { izq: "#F1DDE5", der: "#F7E9EE", zocalo: "#C89AAE" },
  },
  colgados: [
    { tipo: "ventana", id: "chuanghu", pared: "izq", desde: 1.3, hasta: 3.3, z0: 2.7, z1: 4.7, cortina: "#E3A9B6" },
    { tipo: "cuadro", id: "hua", pared: "der", desde: 4.4, hasta: 5.6, z0: 3.5, z1: 4.7, motivo: "luna" },
  ],
  muebles: [
    { tipo: "alfombra", id: "ditan", base: { u0: 2.8, u1: 7.4, v0: 5.5, v1: 7.9 }, color: "#FBF3E4", borde: "#C89AAE" },
    /** chuáng: cama doble, la cabecera contra la pared derecha */
    { tipo: "cama", id: "chuang", base: { u0: 3.4, u1: 6.6, v0: 0, v1: 4.8 }, colcha: { a: "#F2C6CF", i: "#E3A9B6", d: "#CC8D9B" }, almohada: "#FFF8EC" },
    /** táidēng (lámpara) y nàozhōng (despertador), uno en cada velador */
    { tipo: "velador", id: "taideng", base: { u0: 2.2, u1: 3.2, v0: 0, v1: 1.0 }, encima: "lampara" },
    { tipo: "velador", id: "naozhong", base: { u0: 6.8, u1: 7.8, v0: 0, v1: 1.0 }, encima: "despertador" },
    /** yīguì: closet: de aquí sale la ropa que abre los mundos */
    { tipo: "closet", id: "yigui", base: { u0: 0, u1: 1.5, v0: 4.4, v1: 8.2 }, alto: 5.0 },
    { tipo: "planta", id: "zhiwu", u: 9.35, v: 0.55 },
  ],
};
