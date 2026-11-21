"use client";
import { useEffect, useState } from "react";
import { alCambiarMudo, estaMudo, mudoGuardado, ponerMudo } from "@/components/casa/audio/motor";
import styles from "./BotonMudo.module.css";

/**
 * 🔊 / 🔇: apaga la voz de la vaca, los efectos y la música (en la casa y en el puzzle) y lo recuerda.
 * Sin sonido el juego sigue igual: los globos muestran lo que la vaca diría.
 */
export function BotonMudo({ className }: { className?: string }) {
  // el servidor no sabe lo guardado: arranca con sonido y se ajusta al montar (sin desajuste de hidratación)
  const [mudo, setMudo] = useState(false);
  useEffect(() => {
    if (mudoGuardado()) ponerMudo(true);
    setMudo(estaMudo());
    return alCambiarMudo(setMudo);
  }, []);
  return (
    <button
      type="button"
      className={className ?? styles.mudo}
      aria-label="静音"
      aria-pressed={mudo}
      title={mudo ? "声音 shēng yīn" : "静音 jìng yīn"}
      data-mudo={mudo || undefined}
      onClick={() => ponerMudo(!mudo)}
    >
      <span aria-hidden="true">{mudo ? "🔇" : "🔊"}</span>
    </button>
  );
}
