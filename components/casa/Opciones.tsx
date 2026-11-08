import { textoHanzi } from "@/lib/silabas";
import { COLOR_TONO } from "@/lib/tonos";
import type { Accion } from "./cocina/acciones";
import type { ObjetoId } from "./cocina/datos";
import { ubicarOpciones, type Camara } from "./camara";
import styles from "./Casa.module.css";

/** Opciones flotantes (estilo Life is Strange): ícono + hanzi + pinyin, en coordenadas de pantalla. */
export function Opciones({
  id, lista, camara, alElegir,
}: { id: ObjetoId; lista: Accion[]; camara: Camara; alElegir: (a: Accion) => void }) {
  const lugares = ubicarOpciones(camara, id, lista.length, false);
  return (
    <div data-testid="opciones">
      {lista.map((a, i) => {
        const hz = textoHanzi(a.verbo);
        return (
          <button
            key={`${id}-${hz}-${i}`}
            type="button"
            className={styles.opcion}
            style={{ left: `${lugares[i].x}%`, top: `${lugares[i].y}%`, animationDelay: `${i * 0.1}s, ${i * 0.4}s` }}
            aria-label={hz}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              alElegir(a);
            }}
          >
            <span className={styles.ico} aria-hidden="true">{a.icono}</span>
            <span>
              <span className={styles.opcionHz} data-texto>{hz}</span>
              <span className={styles.opcionPy} data-pinyin>
                {a.verbo.map(([, py, t], j) => (
                  <span key={j} style={{ color: COLOR_TONO[t] }}>
                    {j > 0 ? " " : ""}
                    {py}
                  </span>
                ))}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
