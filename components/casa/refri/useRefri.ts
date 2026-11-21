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

/** Al abrir, si nadie toca nada en este tiempo, la vaca dice 很冷 una sola vez (nunca entre los nombres). */
export const ESPERA_HEN_LENG = 900;

/** El estado del primer plano del refri: la casa lo espera (`esperar`) mientras sigue `ocupado`. */
export function useRefri({ hablar, hablando }: {
  hablar: (s: Silaba[]) => Promise<boolean>;
  /** Frases en curso: el pop nunca suena encima del mandarín. */
  hablando: { readonly current: number };
}) {
  const [refri, refriRef, setRefri] = useVivo(false);
  const resolver = useRef<((s: SalidaRefri) => void) | null>(null);
  const toques = useRef(0);
  const henLeng = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soltarHenLeng = () => {
    if (henLeng.current !== null) clearTimeout(henLeng.current);
    henLeng.current = null;
  };

  const esperar = useCallback(
    () => new Promise<SalidaRefri>((res) => {
      resolver.current = res;
      setRefri(true);
      // 很冷 una vez al abrir, solo si la persona todavía no tocó nada y la vaca está callada
      const antes = toques.current;
      soltarHenLeng();
      henLeng.current = setTimeout(() => {
        henLeng.current = null;
        if (refriRef.current && toques.current === antes && hablando.current === 0) void hablar(HEN_LENG);
      }, ESPERA_HEN_LENG);
    }),
    [setRefri, refriRef, hablando, hablar],
  );
  const salir = useCallback((s: SalidaRefri) => {
    const r = resolver.current;
    resolver.current = null;
    soltarHenLeng();
    setRefri(false);
    r?.(s);
  }, [setRefri]);

  /** Desde el primer plano: una acción de siempre o `null` (✕). */
  const elegirRefri = useCallback((a: Accion | null) => salir(a), [salir]);
  /** La pestaña se ocultó: sale sin aplicar nada. */
  const cerrarRefri = useCallback(() => salir("salir"), [salir]);

  /** Tocar una comida (o el rótulo 水果 del cajón): la vaca dice solo su nombre (cada toque corta el anterior). */
  const tocarComida = useCallback(
    async (id: ComidaId | "cajon") => {
      if (!refriRef.current) return;
      toques.current++;
      soltarHenLeng();
      const nombre = () => hablar(id === "cajon" ? SHUI_GUO : NOMBRES_COMIDA[id]);
      if (hablando.current === 0) await efectoYLuegoVoz("pop", nombre, { juego: "cocina" });
      else await nombre();
    },
    [hablar, hablando, refriRef],
  );

  return { refri, esperarRefri: esperar, elegirRefri, cerrarRefri, tocarComida };
}
