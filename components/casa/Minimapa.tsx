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

/**
 * Minimapa 2×2: la cocina es donde estás; los otros tres cuartos están cerrados.
 * Con `anotado` (pidió que le avisemos) los cerrados muestran ⏳ ("pronto") en vez de 🔒.
 * Dentro de la casa no hay español: el "pronto" es un ícono.
 */
export function Minimapa({
  cuartoActual,
  anotado = false,
  alTocarBloqueado,
}: {
  cuartoActual: Cuarto;
  anotado?: boolean;
  alTocarBloqueado: (cuarto: Cuarto) => void;
}) {
  const marca = anotado ? "⏳" : "🔒";
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
            data-pronto={!aqui && anotado ? "true" : undefined}
            aria-label={aqui ? nombre : `${nombre} ${marca}`}
            aria-current={aqui ? "true" : undefined}
            className={[styles.cuarto, aqui ? styles.aqui : styles.bloq, !aqui && anotado ? styles.pronto : ""].join(" ")}
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
