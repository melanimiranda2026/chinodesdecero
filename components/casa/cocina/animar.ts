import type { Silaba } from "@/lib/silabas";
import type { Accion } from "./acciones";
import { ANCLAS, FREGADERO, OBJETOS, junto, type EstadoCocina, type ObjetoId } from "./datos";
import { HEN_HAO_CHI, HEN_RE, MAO, WEI } from "./frases";
import type { Particulas } from "../useParticulas";
import type { Espera, Luego } from "../useTiempos";
import type { Ojos } from "../Vaca";

export type Punto = { x: number; y: number };
export type ClaseObjeto = "tiembla" | "inclina" | "encoge" | "directo" | "alza" | "tapa" | "pajaro";

/** Lo que una animación puede mover en la casa. Solo envoltorios de objeto, partículas y la cara de la vaca. */
export interface Escena extends Omit<Particulas, "particulas"> {
  /** Patas de la vaca, al empezar la animación. */
  vaca: Punto;
  espera: Espera;
  luego: Luego;
  /** Aplica el cambio de estado de la acción. */
  aplicar(): void;
  clase(id: ObjetoId, c: ClaseObjeto, on: boolean): void;
  llevarA(id: ObjetoId, x: number, y: number): void;
  volverASuLugar(id: ObjetoId): void;
  ojos(o: Ojos): void;
  /** Lleva a la vaca (sus patas) a un punto. */
  vacaA(p: Punto): void;
  /** La vaca sentada (achatada) o de pie. */
  sentada(on: boolean): void;
  /** Al abrir el basurero: si el gato estaba adentro, salta afuera. */
  gatoSale(): void;
}

/**
 * Lo que la vaca dice después de la frase de la acción (o del primer plano): 很好吃 al comer, 很热 al beber té
 * o café, 喂 al llamar y 猫 si el gato salió del basurero. `antes` es el estado de la cocina antes de la acción.
 */
export function fraseDespues(a: Accion, objId: ObjetoId, antes: EstadoCocina): Silaba[] | null {
  if (a.anim === "comer") return HEN_HAO_CHI;
  if (a.anim === "beber" && (objId === "kafeibei" || (objId === "beizi" && antes.beizi === "te"))) return HEN_RE;
  if (a.anim === "llamar") return WEI;
  if (a.anim === "abrirTarro" && antes.mao === "lajitong") return MAO;
  return null;
}

const AGUA = "#7FC3E8";
const TE = "#C98E3A";
const CAFE = "#6F4526";

/** La animación de la acción dentro de la casa (portada del `switch` de hacer() del prototipo). */
export async function animar(a: Accion, objId: ObjetoId, s: Escena): Promise<void> {
  const { vaca, espera } = s;
  switch (a.anim) {
    case "llenar":
      s.rafaga(10, 110, () => s.particula("gota", { ...ANCLAS.llave, w: 0 }, AGUA));
      await espera(700);
      s.aplicar();
      await espera(700);
      break;
    case "lavar":
      s.clase(objId, "tiembla", true);
      s.rafaga(12, 120, () => s.particula("burbuja", { ...FREGADERO, w: 90 }));
      await espera(1000);
      s.aplicar();
      await espera(600);
      s.clase(objId, "tiembla", false);
      break;
    case "beber":
    case "tomar": {
      const mano = junto(vaca, ANCLAS.manoVaca);
      s.llevarA(objId, mano.x, mano.y);
      if (a.anim === "beber") {
        s.luego(() => s.clase(objId, "inclina", true), 500);
        s.ojos("cerrados");
        await espera(1300);
        s.aplicar();
        await espera(400);
        s.clase(objId, "inclina", false);
        s.ojos("abiertos");
        break;
      }
      // 我拿着…: llega a la mano, la vaca lo muestra en alto (sube y baja, brilla) y lo sostiene un rato
      await espera(550);
      s.ojos("felices");
      s.clase(objId, "alza", true);
      s.brillos(objId);
      await espera(1900);
      s.aplicar();
      s.clase(objId, "alza", false);
      s.ojos("abiertos");
      await espera(300);
      break;
    }
    case "comer": {
      const boca = junto(vaca, ANCLAS.bocaVaca);
      const migas = junto(vaca, ANCLAS.migasVaca);
      s.llevarA(objId, boca.x, boca.y);
      await espera(500);
      s.rafaga(8, 90, () => s.miga(migas.x, migas.y));
      s.ojos("felices");
      // la manzana se come entera; del plato y del bol solo la comida (el recipiente queda, sucio)
      const recipiente = objId === "panzi" || objId === "wan";
      if (!recipiente) s.clase(objId, "encoge", true);
      await espera(900);
      s.aplicar();
      if (!recipiente) s.clase(objId, "encoge", false);
      await espera(300);
      s.ojos("abiertos");
      break;
    }
    case "abrir":
    case "cerrar":
      s.aplicar();
      if (a.anim === "abrir") s.ojos("sorpresa");
      await espera(1000);
      s.ojos("abiertos");
      break;
    case "cortar":
      s.clase(objId, "tiembla", true);
      await espera(700);
      s.aplicar();
      s.clase(objId, "tiembla", false);
      await espera(600);
      break;
    case "cocinar":
      s.clase("guo", "tiembla", true);
      s.rafaga(8, 150, () => s.particula("vapor", OBJETOS.guo));
      await espera(1200);
      s.aplicar();
      s.clase("guo", "tiembla", false);
      break;
    case "servirTe": {
      const vaso = junto(OBJETOS.chahu, ANCLAS.bajoPicoTetera);
      const pico = junto(OBJETOS.chahu, ANCLAS.picoTetera);
      s.llevarA("beizi", vaso.x, vaso.y);
      await espera(550);
      s.clase("chahu", "inclina", true);
      s.rafaga(8, 110, () => s.particula("gota", { ...pico, w: 0 }, TE));
      await espera(900);
      s.aplicar();
      s.clase("chahu", "inclina", false);
      await espera(400);
      s.volverASuLugar("beizi");
      break;
    }
    case "servirArroz": {
      const bol = junto(OBJETOS.guo, ANCLAS.bajoOlla);
      const arroz = junto(OBJETOS.guo, ANCLAS.bocaOlla);
      s.llevarA("wan", bol.x, bol.y);
      await espera(600);
      s.rafaga(6, 100, () => s.miga(arroz.x, arroz.y));
      await espera(600);
      s.aplicar();
      await espera(400);
      break;
    }
    case "sacar":
      if (objId === "pingguo") {
        // la manzana aparece en el refri y vuela a su lugar
        const salida = junto(OBJETOS.bingxiang, ANCLAS.salidaRefri);
        s.clase("pingguo", "directo", true);
        s.llevarA("pingguo", salida.x, salida.y);
        await espera(60);
        s.aplicar();
        s.clase("pingguo", "directo", false);
        s.volverASuLugar("pingguo");
        await espera(800);
      } else {
        s.aplicar();
        s.brillos(objId);
        await espera(800);
      }
      break;
    case "servirCafe": {
      const taza = junto(OBJETOS.kafeibei, ANCLAS.sobreTaza);
      s.rafaga(8, 110, () => s.particula("gota", { ...taza, w: 0 }, CAFE));
      await espera(700);
      s.aplicar();
      await espera(600);
      break;
    }
    case "encender":
    case "apagar":
      s.aplicar();
      if (a.anim === "encender") s.brillos("deng");
      s.ojos(a.anim === "encender" ? "felices" : "sorpresa");
      await espera(900);
      s.ojos("abiertos");
      break;
    case "abrirVentana":
      // entra un pájaro volando, da una vuelta y se queda posado en el marco hasta que se cierre la ventana
      s.aplicar();
      s.clase("chuanghu", "pajaro", true);
      s.ojos("sorpresa");
      await espera(1200);
      s.ojos("felices");
      await espera(600);
      s.ojos("abiertos");
      break;
    case "cerrarVentana":
      s.clase("chuanghu", "pajaro", false);
      s.aplicar();
      await espera(800);
      break;
    case "abrirTarro":
      s.clase("lajitong", "tapa", true);
      await espera(450);
      s.gatoSale();
      await espera(700);
      s.clase("lajitong", "tapa", false);
      await espera(400);
      break;
    case "sentarse": {
      const asiento = junto(OBJETOS.yizi, ANCLAS.asientoSilla);
      s.vacaA(asiento);
      await espera(650);
      s.sentada(true);
      s.ojos("felices");
      await espera(2000);
      s.sentada(false);
      s.ojos("abiertos");
      s.vacaA(vaca);
      await espera(600);
      break;
    }
    case "llamar": {
      // el teléfono va a la mano; vuelve después del 喂 (lo devuelve la casa)
      const mano = junto(vaca, ANCLAS.manoVaca);
      s.llevarA(objId, mano.x, mano.y);
      await espera(550);
      s.ojos("felices");
      await espera(900);
      s.ojos("abiertos");
      break;
    }
    default:
      s.aplicar();
      await espera(800);
  }
}
