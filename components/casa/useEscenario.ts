"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Tamaño real del escenario (en celular vertical deja de ser cuadrado y la cámara se encuadra con zoom y paneo).
 * `medido` se enciende un cuadro después de la primera medida: recién ahí conviene animar la cámara,
 * así no se anima el salto al encuadre vertical.
 */
export function useEscenario<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [tam, setTam] = useState({ w: 0, h: 0 });
  // medido antes de pintar (después de hidratar)
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => {
      const r = el.getBoundingClientRect();
      // oculta (pestaña del puzzle: display none) mide 0×0: se ignora, así al volver no se repite el encuadre
      if (!r.width || !r.height) return;
      setTam((t) => (t.w === r.width && t.h === r.height ? t : { w: r.width, h: r.height }));
    };
    medir();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [medido, setMedido] = useState(false);
  useEffect(() => {
    if (medido || tam.w === 0) return;
    const id = requestAnimationFrame(() => setMedido(true));
    return () => cancelAnimationFrame(id);
  }, [medido, tam.w]);
  return { ref, tam, medido };
}
