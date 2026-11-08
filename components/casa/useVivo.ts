"use client";
import { useCallback, useRef, useState } from "react";

/** Valor con estado de React y ref sincronizada: las secuencias async leen siempre lo último. */
export function useVivo<T>(inicial: T): [T, { readonly current: T }, (v: T) => void] {
  const [valor, setValor] = useState(inicial);
  const ref = useRef(inicial);
  const poner = useCallback((v: T) => {
    ref.current = v;
    setValor(v);
  }, []);
  return [valor, ref, poner];
}
