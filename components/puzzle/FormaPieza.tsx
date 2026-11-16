"use client";

import { useEffect, useRef, useState } from "react";
import { caminoPieza } from "./forma";
import styles from "./Puzzle.module.css";

/**
 * Silueta SVG de la pieza (o de su hueco vacío). Mide el elemento padre; solo cuando ya midió
 * le pone `data-forma`, y entonces el CSS le pasa el relleno y el borde. Sin ResizeObserver
 * no pinta nada y la pieza queda rectangular como antes.
 */
export function FormaPieza({ hueco = false }: { hueco?: boolean }) {
  const ref = useRef<SVGSVGElement>(null);
  const [medida, setMedida] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const svg = ref.current;
    const padre = svg?.parentElement;
    if (!svg || !padre || typeof ResizeObserver === "undefined") return;
    const medir = () => {
      const w = svg.clientWidth;
      const h = svg.clientHeight;
      if (w > 0 && h > 0) setMedida((m) => (m && m.w === w && m.h === h ? m : { w, h }));
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(svg);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const padre = ref.current?.parentElement;
    if (!padre) return;
    if (medida) padre.setAttribute("data-forma", "");
    else padre.removeAttribute("data-forma");
    return () => padre.removeAttribute("data-forma");
  }, [medida]);

  if (typeof ResizeObserver === "undefined") return null;
  return (
    <svg ref={ref} className={styles.forma} aria-hidden="true" focusable="false">
      {medida && <path className={hueco ? styles.formaHueco : styles.formaPieza} d={caminoPieza(medida.w, medida.h)} />}
    </svg>
  );
}
