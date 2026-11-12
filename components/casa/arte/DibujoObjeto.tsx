import { ARTE } from "./registro";
import { Capa } from "./Capa";
import type { ObjetoId } from "../cocina/datos";

/** Apila las capas visibles de un objeto según su estado. `claseCapa` deja que una animación apunte a una capa por nombre. */
export function DibujoObjeto({
  id, estado, claseCapa,
}: { id: ObjetoId; estado: string; claseCapa?: (nombre: string) => string }) {
  const arte = ARTE[id];
  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "1" }}>
      {arte.visibles(estado).map((nombre) => (
        <Capa key={nombre} nombre={nombre} capa={arte.capas[nombre]} className={claseCapa?.(nombre)} />
      ))}
    </div>
  );
}
