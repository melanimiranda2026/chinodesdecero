"use client";
import { useCallback, type MutableRefObject } from "react";
import { S, type Silaba } from "@/lib/silabas";
import { OBJETOS, type EstadoCocina, type ObjetoId } from "./cocina/datos";
import { BU_DUI, DUI, GEI_WO } from "./cocina/frases";
import { crearQuiz, responder, type Quiz } from "./quiz";
import { sfx } from "./audio/sonido";
import type { Camara } from "./camara";
import type { Punto } from "./cocina/animar";
import type { Ojos } from "./Vaca";
import { useVivo } from "./useVivo";

/** Estado del 玩: "juego" pregunta, "celebra" son los 1,8 s de festejo, "fin" espera la tarjeta del método. */
export interface EstadoQuiz extends Quiz {
  i: number;
  aciertos: number;
  fase: "juego" | "celebra" | "fin";
}

const GLOBO_QUIZ: Silaba[] = [...GEI_WO, ...S("？", "?", "5")];
const registrarFallo = (e: unknown) => console.error("[casa]", e);

interface Deps {
  ocupadoRef: { readonly current: boolean };
  estadoRef: { readonly current: EstadoCocina };
  setOcupado: (v: boolean) => void;
  cerrarOpciones: () => void;
  setCamara: (c: Camara) => void;
  setVaca: (p: Punto) => void;
  setGlobo: (g: Silaba[] | null) => void;
  vistaTodo: Camara;
  hablar: (s: Silaba[], opc?: { globo?: Silaba[]; fijo?: boolean }) => Promise<void>;
  espera: (ms: number) => Promise<void>;
  luego: (fn: () => void, ms: number) => void;
  festejo: (ms?: number) => void;
  mirar: (o: Ojos, ms: number) => void;
  eventoRef: MutableRefObject<((nombre: string, datos?: Record<string, unknown>) => void) | undefined>;
}

/** Orquestación del 玩: la vaca pide 给我 + objeto de oído; se responde arrastrándolo hasta ella. */
export function useQuiz(d: Deps) {
  const { ocupadoRef, estadoRef, setOcupado, cerrarOpciones, setCamara, setVaca, setGlobo, vistaTodo, hablar, espera, luego, festejo, mirar, eventoRef } = d;
  const [quiz, quizRef, setQuiz] = useVivo<EstadoQuiz | null>(null);

  // ---- 玩: la vaca pide 给我 + objeto de oído; se responde arrastrándolo hasta ella ----
  const pedirQuiz = useCallback(async () => {
    const q = quizRef.current;
    if (!q || q.fase !== "juego") return;
    // el globo muestra solo 给我 ？: la palabra se reconoce de oído
    await hablar([...GEI_WO, ...OBJETOS[q.rondas[q.i]].nombre], { globo: GLOBO_QUIZ, fijo: true });
  }, [quizRef, hablar]);

  const empezarQuiz = useCallback(() => {
    if (ocupadoRef.current || quizRef.current) return;
    cerrarOpciones();
    setCamara(vistaTodo);
    setVaca({ x: 420, y: 600 });
    setQuiz({ ...crearQuiz(estadoRef.current, Math.random), i: 0, aciertos: 0, fase: "juego" });
    eventoRef.current?.("quiz_inicio");
    luego(() => void pedirQuiz().catch(registrarFallo), 700);
  }, [ocupadoRef, quizRef, estadoRef, cerrarOpciones, setCamara, vistaTodo, setVaca, setQuiz, eventoRef, luego, pedirQuiz]);

  const responderQuiz = useCallback(
    async (id: ObjetoId) => {
      const q = quizRef.current;
      if (!q || q.fase !== "juego" || ocupadoRef.current) return;
      setOcupado(true);
      let sigue = true;
      try {
        if (responder(q, q.i, id) === "bien") {
          sfx("ding");
          festejo();
          const i = q.i + 1;
          const fin = i >= q.rondas.length;
          setQuiz({ ...q, i, aciertos: q.aciertos + 1, fase: fin ? "celebra" : "juego" });
          await hablar(DUI);
          if (fin) {
            sigue = false;
            festejo(2000);
            await espera(1800);
            setQuiz({ ...q, i, aciertos: q.aciertos + 1, fase: "fin" });
            eventoRef.current?.("quiz_fin", { aciertos: q.aciertos + 1 });
          } else {
            await espera(300);
          }
        } else {
          sfx("boing");
          mirar("sorpresa", 900);
          await hablar(BU_DUI);
          await espera(200);
        }
      } finally {
        setOcupado(false);
      }
      if (sigue) await pedirQuiz();
    },
    [quizRef, ocupadoRef, setOcupado, setQuiz, eventoRef, festejo, hablar, espera, mirar, pedirQuiz],
  );

  const repetirQuiz = useCallback(() => {
    if (ocupadoRef.current) return;
    pedirQuiz().catch(registrarFallo);
  }, [ocupadoRef, pedirQuiz]);

  const cerrarQuiz = useCallback(() => {
    setQuiz(null);
    setGlobo(null);
  }, [setQuiz, setGlobo]);

  // ---- 玩: la vaca pide 给我 + objeto de oído; se responde arrastrándolo hasta ella ----

  return { quiz, quizRef, empezarQuiz, responderQuiz, repetirQuiz, cerrarQuiz };
}
