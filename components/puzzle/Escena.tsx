import type { ReactNode } from "react";
import { Vaca, type Hocico, type Ojos, type Orejas } from "@/components/casa/Vaca";
import type { Cosa, Escena as DatosEscena } from "./datos";
import {
  AlgunaVez, Apunta, Calendario, Casa, Hamburguesa, Hecho, Incognita, Leche, Manzana, NoPaso, Pizza, Plato, SiNo, Taza,
} from "./Dibujos";
import styles from "./Puzzle.module.css";

const COSAS: Record<Cosa, (p: { className?: string }) => ReactNode> = {
  pingguo: Manzana,
  kafei: Taza,
  niunai: Leche,
  hanbao: Hamburguesa,
  pisa: Pizza,
};

export interface CaraVaca {
  ojos: Ojos;
  hocico: Hocico;
  orejas: Orejas;
  salta?: boolean;
}

/**
 * El dibujo de la frase (etapas 2 y 3): no es una tira en el orden de la frase (eso regalaría la
 * respuesta), es una escena: la vaca al medio, el cuándo arriba, el dónde atrás, la cosa adelante.
 */
export function Escena({ escena, cara }: { escena: DatosEscena; cara: CaraVaca }) {
  const { quien, cuando, donde, cosa, marca } = escena;
  const CosaDibujo = cosa && cosa !== "?" ? COSAS[cosa] : null;
  return (
    <div className={styles.escena} data-testid="escena" aria-hidden="true">
      {donde && (
        <div className={styles.esDonde}>{donde === "casa" ? <Casa className={styles.dibujo} /> : <Incognita className={styles.dibujo} />}</div>
      )}
      {cuando && (
        <div className={styles.esCuando}>
          {cuando === "?" ? <Incognita className={styles.dibujo} /> : <Calendario cual={cuando} className={styles.dibujo} />}
        </div>
      )}
      <div className={styles.esQuien}>
        {quien === "?" ? (
          <Incognita className={styles.dibujo} />
        ) : (
          <Vaca ojos={cara.ojos} hocico={cara.hocico} orejas={cara.orejas} salta={cara.salta} />
        )}
      </div>
      {quien === "tu" && (
        <div className={styles.esApunta}>
          <Apunta className={styles.dibujo} />
        </div>
      )}
      {cosa && (
        <div className={styles.esCosa}>
          {CosaDibujo ? <CosaDibujo className={styles.dibujo} /> : <Incognita className={styles.dibujo} />}
          {marca === "no" && <NoPaso className={styles.tachado} />}
        </div>
      )}
      {marca && marca !== "no" && (
        <div className={styles.esMarca}>
          {marca === "hecho" ? <Hecho className={styles.dibujo} /> : marca === "alguna" ? <AlgunaVez className={styles.dibujo} /> : <SiNo className={styles.dibujo} />}
        </div>
      )}
      {!cosa && (marca === "hecho" || marca === "no") && (
        <div className={styles.esCosa} data-plato={marca}>
          <Plato lleno={marca === "no"} className={styles.dibujo} />
        </div>
      )}
      {marca === "no" && !cosa && (
        <div className={styles.esMarca}>
          <NoPaso className={styles.dibujo} />
        </div>
      )}
    </div>
  );
}
