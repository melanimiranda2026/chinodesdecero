import { DibujoObjeto } from "@/components/casa/arte/DibujoObjeto";
import { ESTADO_INICIAL, type ObjetoId } from "@/components/casa/cocina/datos";
import { Vaca } from "@/components/casa/Vaca";
import styles from "./pagina.module.css";

/** Detalle a crayón de cada sección: un objeto de la cocina o la vaca (el mismo arte que la casa). */
export function Adorno({ dibujo, tam = 96, className }: { dibujo: ObjetoId | "vaca"; tam?: number; className?: string }) {
  return (
    <div className={className ? `${styles.adorno} ${className}` : styles.adorno} style={{ width: tam, height: tam }} aria-hidden="true">
      {dibujo === "vaca" ? (
        <Vaca ojos="felices" hocico="sonrisa" orejas="normales" />
      ) : (
        <DibujoObjeto id={dibujo} estado={ESTADO_INICIAL[dibujo]} />
      )}
    </div>
  );
}
