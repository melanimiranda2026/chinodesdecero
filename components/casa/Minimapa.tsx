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
 * Cuartos que ya se pueden pisar; los demás están cerrados. El living, siempre (es donde se entra); la cocina,
 * cuando el living está completo y ya dejó su correo (la puerta del living lo pide). Baño y dormitorio, aún no.
 */
export function cuartosAbiertos(livingCompleto: boolean, conCorreo: boolean): Cuarto[] {
  return livingCompleto && conCorreo ? ["cocina", "living"] : ["living"];
}

/**
 * Minimapa 2×2: el cuarto actual brilla, los abiertos se pueden tocar y los demás están cerrados.
 * Con `anotado` (pidió que le avisemos) los cerrados muestran ⏳ ("pronto") en vez de 🔒.
 * Dentro de la casa no hay español: el "pronto" es un ícono.
 */
export function Minimapa({
  cuartoActual,
  abiertos,
  anotado = false,
  alCambiar,
  alTocarBloqueado,
}: {
  cuartoActual: Cuarto;
  abiertos: readonly Cuarto[];
  anotado?: boolean;
  alCambiar: (cuarto: Cuarto) => void;
  /** Un cerrado: devuelve `false` si el que llama ya decide el sonido (la puerta del living); si no, boing. */
  alTocarBloqueado: (cuarto: Cuarto) => void | false;
}) {
  const marca = anotado ? "⏳" : "🔒";
  return (
    <div className={styles.mapa} role="group" aria-label="地图">
      {CUARTOS.map(({ id, icono, nombre }) => {
        const aqui = id === cuartoActual;
        const abierto = abiertos.includes(id);
        const cerrado = !aqui && !abierto;
        return (
          <button
            key={id}
            type="button"
            data-cuarto={id}
            data-bloqueado={cerrado ? "true" : undefined}
            data-pronto={cerrado && anotado ? "true" : undefined}
            aria-label={cerrado ? `${nombre} ${marca}` : nombre}
            aria-current={aqui ? "true" : undefined}
            className={[styles.cuarto, aqui ? styles.aqui : abierto ? styles.abierto : styles.bloq, cerrado && anotado ? styles.pronto : ""].join(" ")}
            onClick={() => {
              if (aqui) return;
              if (abierto) {
                sfx("pop", "cocina");
                alCambiar(id);
                return;
              }
              if (alTocarBloqueado(id) !== false) sfx("boing", "cocina");
            }}
          >
            {icono}
          </button>
        );
      })}
    </div>
  );
}
