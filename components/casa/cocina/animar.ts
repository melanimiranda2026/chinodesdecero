import type { Accion } from "./acciones";
import { ANCLAS, FREGADERO, OBJETOS, junto, type ObjetoId } from "./datos";
import type { Particulas } from "../useParticulas";
import type { Espera, Luego } from "../useTiempos";
import type { Ojos } from "../Vaca";

export type Punto = { x: number; y: number };
export type ClaseObjeto = "tiembla" | "inclina" | "encoge" | "directo";

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
}

const AGUA = "#7FC3E8";
const TE = "#C98E3A";

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
      }
      await espera(1300);
      s.aplicar();
      await espera(400);
      s.clase(objId, "inclina", false);
      s.ojos("abiertos");
      break;
    }
    case "comer": {
      const boca = junto(vaca, ANCLAS.bocaVaca);
      const migas = junto(vaca, ANCLAS.migasVaca);
      s.llevarA(objId, boca.x, boca.y);
      await espera(500);
      s.rafaga(8, 90, () => s.miga(migas.x, migas.y));
      s.ojos("felices");
      s.clase(objId, "encoge", true);
      await espera(900);
      s.aplicar();
      s.clase(objId, "encoge", false);
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
    default:
      s.aplicar();
      await espera(800);
  }
}
