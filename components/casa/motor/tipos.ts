import type { Silaba } from "@/lib/silabas";
import type { Punto } from "../cocina/iso";

export type CuartoId = "living" | "cocina" | "bano" | "dormitorio";
/** Cómo se ve la vaca al hacer una acción. */
export type Pose = "sentada" | "mira";
/** Rectángulo en unidades del cuarto (0-1000): x, y es la esquina de arriba a la izquierda. */
export type Zona = { x: number; y: number; w: number; h: number };

export interface DefObjeto {
  id: string;
  nombre: Silaba[];
  zona: Zona;
  /** Dónde se paran las patas de la vaca para usarlo. */
  pie: Punto;
  /** Ids de `DefCuarto.acciones` que ofrece. */
  acciones: string[];
  /** Un objeto que no se usa: se abre en primer plano. */
  abre?: "mesa";
}

export interface DefAccion {
  id: string;
  verbo: Silaba[];
  frase: Silaba[];
  icono: string;
  pose: Pose;
}

export interface DefCuarto {
  id: CuartoId;
  /** Hora del reloj al entrar y al completar el cuarto. */
  hora: [number, number];
  objetos: DefObjeto[];
  acciones: DefAccion[];
  /** A qué cuarto se pasa al terminar. */
  salida: CuartoId;
}

/** Lo que ya hizo la niña en el cuarto. Un logro es `${accionId}@${objetoId}`. */
export interface ProgresoCuarto {
  tocados: string[];
  logros: string[];
}
