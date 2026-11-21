"use client";

import { useEffect, useRef, useState } from "react";
import { textoHanzi, type Silaba } from "@/lib/silabas";
import { COLOR_TONO } from "@/lib/tonos";
import styles from "./Motor.module.css";

const DURACION_MS = 1600;

function movimientoReducido(): boolean {
  try {
    return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Ficha recién ganada: aparece al centro, gira sobre Y como un objeto valioso y avisa al terminar. */
export function FichaGanada({ silabas, alTerminar }: { silabas: Silaba[]; alTerminar: () => void }) {
  const [reducido] = useState(movimientoReducido);
  const fin = useRef(alTerminar);
  fin.current = alTerminar;

  useEffect(() => {
    const t = setTimeout(() => fin.current(), DURACION_MS);
    return () => clearTimeout(t);
  }, []);

  const hz = textoHanzi(silabas);
  return (
    <div className={styles.ganada} data-ficha-ganada role="img" aria-label={hz}>
      <div className={`${styles.ficha} ${reducido ? "" : styles.gira}`} data-gira={reducido ? undefined : "true"}>
        <span className={styles.cara}>
          <span className={styles.hz} data-largo={[...hz].length}>
            {silabas.map(([h, , tono], i) => (
              <span key={i} style={{ color: COLOR_TONO[tono] }}>{h}</span>
            ))}
          </span>
        </span>
      </div>
    </div>
  );
}
