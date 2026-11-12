import { DibujoObjeto } from "../arte/DibujoObjeto";
import type { ObjetoId } from "../cocina/datos";
import type { P } from "../gestos/tipos";
import styles from "./PrimerPlano.module.css";

export type Linea = { a: P; b: P };

const k = (n: number) => n * 1000;

/** 切: el objeto entero con los cortes marcados; al terminar, el estado `cortado` con sus mitades que se separan. */
export function Cortar({
  id, estado, cortado, cortes, trazo,
}: { id: ObjetoId; estado: string; cortado: boolean; cortes: Linea[]; trazo: Linea | null }) {
  return (
    <div className={styles.pieza}>
      {cortado ? (
        <DibujoObjeto
          id={id}
          estado="cortado"
          claseCapa={(n) => (n === "mitad_izq" ? styles.mitadIzq : n === "mitad_der" ? styles.mitadDer : "")}
        />
      ) : (
        <DibujoObjeto id={id} estado={estado} />
      )}
      {!cortado && (
        <svg viewBox="0 0 1000 1000" className={styles.trazos} aria-hidden="true">
          {cortes.map((l, i) => (
            <line key={i} x1={k(l.a.u)} y1={k(l.a.v)} x2={k(l.b.u)} y2={k(l.b.v)} stroke="#4A2A1C" strokeWidth={10} strokeDasharray="24 20" strokeLinecap="round" />
          ))}
          {trazo && (
            <line x1={k(trazo.a.u)} y1={k(trazo.a.v)} x2={k(trazo.b.u)} y2={k(trazo.b.v)} stroke="#fff" strokeWidth={16} strokeLinecap="round" />
          )}
        </svg>
      )}
    </div>
  );
}
