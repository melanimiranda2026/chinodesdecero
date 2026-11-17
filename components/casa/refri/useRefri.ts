"use client";
import { useCallback, useRef } from "react";
import type { Silaba } from "@/lib/silabas";
import type { Accion } from "../cocina/acciones";
import { NOMBRES_COMIDA, type ComidaId } from "../cocina/datos";
import { HEN_LENG, SHUI_GUO } from "../cocina/frases";
import { efectoYLuegoVoz } from "../audio/turnos";
import { useVivo } from "../useVivo";

/**
 * Cómo se sale del primer plano del refri: una acción de siempre (拿…, 关上), `null` = ✕ (cierra la puerta
 * sin fanfarria) o "salir" = la pestaña se ocultó (no se aplica nada).
 */
export type SalidaRefri = Accion | null | "salir";

/** Cada cuántos toques a la comida la vaca agrega 很冷. */
export const CADA_HEN_LENG = 3;

/** El estado del primer plano del refri: la casa lo espera (`esperar`) mientras sigue `ocupado`. */
export function useRefri({ hablar, hablando }: {
  hablar: (s: Silaba[]) => Promise<boolean>;
  /** Frases en curso: el pop nunca suena encima del mandarín. */
  hablando: { readonly current: number };
}) {
  const [refri, refriRef, setRefri] = useVivo(false);
  const resolver = useRef<((s: SalidaRefri) => void) | null>(null);
  const toques = useRef(0);

  const esperar = useCallback(
    () => new Promise<SalidaRefri>((res) => {
      resolver.current = res;
      setRefri(true);
    }),
    [setRefri],
  );
  const salir = useCallback((s: SalidaRefri) => {
    const r = resolver.current;
    resolver.current = null;
    setRefri(false);
    r?.(s);
  }, [setRefri]);

  /** Desde el primer plano: una acción de siempre o `null` (✕). */
  const elegirRefri = useCallback((a: Accion | null) => salir(a), [salir]);
  /** La pestaña se ocultó: sale sin aplicar nada. */
  const cerrarRefri = useCallback(() => salir("salir"), [salir]);

  /** Tocar una comida (o el rótulo 水果 del cajón): la vaca dice su nombre y, cada tercer toque, 很冷. */
  const tocarComida = useCallback(
    async (id: ComidaId | "cajon") => {
      if (!refriRef.current) return;
      const n = ++toques.current;
      const nombre = () => hablar(id === "cajon" ? SHUI_GUO : NOMBRES_COMIDA[id]);
      if (hablando.current === 0) await efectoYLuegoVoz("pop", nombre, { juego: "cocina" });
      else await nombre();
      // solo si nada más se tocó entretanto y el refri sigue abierto
      if (id !== "cajon" && n % CADA_HEN_LENG === 0 && n === toques.current && refriRef.current) await hablar(HEN_LENG);
    },
    [hablar, hablando, refriRef],
  );

  return { refri, esperarRefri: esperar, elegirRefri, cerrarRefri, tocarComida };
}
