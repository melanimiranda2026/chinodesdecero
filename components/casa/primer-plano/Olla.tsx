import { ARTE_PRIMER_PLANO } from "../arte/registro";
import { Capa } from "../arte/Capa";
import type { P } from "../gestos/tipos";
import styles from "./PrimerPlano.module.css";

/** La olla vista desde arriba: la capa `trozos` gira entera con lo que se ha revuelto. */
export function Olla({ giro, cuchara, humea }: { giro: number; cuchara: P | null; humea: boolean }) {
  return (
    <div className={styles.pieza}>
      <Capa capa={ARTE_PRIMER_PLANO.olla_grande} nombre="olla_grande" />
      <Capa capa={ARTE_PRIMER_PLANO.trozos} nombre="trozos" style={{ transform: `rotate(${giro}deg)`, transformOrigin: "50% 50%" }} />
      {humea && [32, 50, 68].map((x, i) => (
        <div key={x} className={styles.vapor} style={{ left: `${x}%`, animationDelay: `${i * 0.45}s` }} aria-hidden="true" />
      ))}
      {cuchara && (
        <div className={styles.cuchara} style={{ left: `${cuchara.u * 100}%`, top: `${cuchara.v * 100}%` }} aria-hidden="true">
          🥄
        </div>
      )}
    </div>
  );
}
