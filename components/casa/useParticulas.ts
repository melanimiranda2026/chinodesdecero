"use client";
import { useCallback, useRef, useState } from "react";
import { OBJETOS, type ObjetoId } from "./cocina/datos";
import type { Luego } from "./useTiempos";

export type TipoParticula = "brillo" | "burbuja" | "vapor" | "gota" | "miga";

/** Partícula en unidades del cuarto (0-1000). La dibuja <Casa/> y se borra sola. */
export interface Particula {
  clave: number;
  tipo: TipoParticula;
  x: number;
  y: number;
  /** Tamaño en % del cuarto (burbujas). */
  tam?: number;
  color?: string;
  /** Desplazamiento de las migas, en px. */
  dx?: number;
  dy?: number;
  retraso?: number;
}

export interface Particulas {
  particulas: Particula[];
  /** Gota, burbuja o vapor alrededor de `o` (w = ancho de la zona). */
  particula(tipo: TipoParticula, o: { x: number; y: number; w: number }, color?: string): void;
  miga(x: number, y: number): void;
  brillos(id: ObjetoId): void;
  /** Repite `fn` n veces cada `cada` ms (gotas, burbujas, migas…). */
  rafaga(n: number, cada: number, fn: () => void): void;
}

export function useParticulas(luego: Luego): Particulas {
  const [particulas, setParticulas] = useState<Particula[]>([]);
  const claveParticula = useRef(0);

  const agregar = useCallback(
    (p: Omit<Particula, "clave">, vida: number) => {
      const clave = ++claveParticula.current;
      setParticulas((l) => [...l, { ...p, clave }]);
      luego(() => setParticulas((l) => l.filter((q) => q.clave !== clave)), vida);
    },
    [luego],
  );
  const particula = useCallback<Particulas["particula"]>(
    (tipo, o, color) => {
      agregar(
        {
          tipo,
          x: o.x + (Math.random() - 0.5) * o.w * 0.8,
          y: o.y - o.w * 0.2 + (Math.random() - 0.5) * o.w * 0.4,
          tam: tipo === "burbuja" ? 1.5 + Math.random() * 2.5 : undefined,
          color,
        },
        1700,
      );
    },
    [agregar],
  );
  const miga = useCallback<Particulas["miga"]>(
    (x, y) => agregar({ tipo: "miga", x, y, dx: (Math.random() - 0.5) * 60, dy: 10 + Math.random() * 40 }, 900),
    [agregar],
  );
  const brillos = useCallback<Particulas["brillos"]>(
    (id) => {
      const o = OBJETOS[id];
      for (let i = 0; i < 4; i++)
        agregar(
          { tipo: "brillo", x: o.x + (Math.random() - 0.5) * o.w, y: o.y + (Math.random() - 0.5) * o.w, retraso: i * 0.08 },
          1800,
        );
    },
    [agregar],
  );
  const rafaga = useCallback<Particulas["rafaga"]>(
    (n, cada, fn) => {
      for (let i = 0; i < n; i++) luego(fn, i * cada);
    },
    [luego],
  );

  return { particulas, particula, miga, brillos, rafaga };
}
