"use client";
import { sfx } from "./audio/sonido";
import styles from "./Casa.module.css";

export type Cuarto = "cocina" | "dormitorio" | "living" | "bano";

const CUARTOS: { id: Cuarto; icono: string; nombre: string }[] = [
  { id: "cocina", icono: "🍳", nombre: "厨房" },
  { id: "dormitorio", icono: "🛏️", nombre: "卧室" },
  { id: "living", icono: "🛋️", nombre: "客厅" },
  { id: "bano", icono: "🛁", nombre: "浴室" },
];

/** Minimapa 2×2: la cocina es donde estás; los otros tres cuartos están cerrados. */
export function Minimapa({
  cuartoActual,
  alTocarBloqueado,
}: {
  cuartoActual: Cuarto;
  alTocarBloqueado: (cuarto: Cuarto) => void;
}) {
  return (
    <div className={styles.mapa} role="group" aria-label="地图">
      {CUARTOS.map(({ id, icono, nombre }) => {
        const aqui = id === cuartoActual;
        return (
          <button
            key={id}
            type="button"
            data-cuarto={id}
            data-bloqueado={aqui ? undefined : "true"}
            aria-label={aqui ? nombre : `${nombre} 🔒`}
            aria-current={aqui ? "true" : undefined}
            className={[styles.cuarto, aqui ? styles.aqui : styles.bloq].join(" ")}
            onClick={() => {
              if (aqui) return;
              sfx("boing");
              alTocarBloqueado(id);
            }}
          >
            {icono}
          </button>
        );
      })}
    </div>
  );
}
