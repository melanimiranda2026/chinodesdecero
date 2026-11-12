"use client";
import { useCallback, useEffect, useRef } from "react";

export type Luego = (fn: () => void, ms: number) => void;
export type Espera = (ms: number) => Promise<void>;

/** setTimeout que se limpia solo al desmontar, y su versión con promesa. */
export function useTiempos(): { luego: Luego; espera: Espera } {
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const luego = useCallback<Luego>((fn, ms) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  }, []);
  const espera = useCallback<Espera>((ms) => new Promise<void>((r) => luego(r, ms)), [luego]);
  useEffect(() => {
    const set = timers.current;
    return () => {
      set.forEach(clearTimeout);
      set.clear();
    };
  }, []);
  return { luego, espera };
}
