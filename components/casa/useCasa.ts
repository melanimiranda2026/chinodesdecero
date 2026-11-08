"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { S, type Silaba } from "@/lib/silabas";
import { ANCLAS, ESTADO_INICIAL, FREGADERO, OBJETOS, junto, type EstadoCocina, type ObjetoId } from "./cocina/datos";
import { acciones, aplicar, type Accion } from "./cocina/acciones";
import { animar, type ClaseObjeto, type Punto } from "./cocina/animar";
import { BU_DUI, DUI, GEI_WO, NI_HAO, ZHE_SHI } from "./cocina/frases";
import { crearQuiz, responder, type Quiz } from "./quiz";
import { enfocar, limitarVaca, objetoBajo, puntoJunto, type Camara } from "./camara";
import { GESTO_DE, type Medalla } from "./gestos/medalla";
import { decir } from "./audio/voz";
import { sfx } from "./audio/sonido";
import { useTiempos } from "./useTiempos";
import { useParticulas, type Particula } from "./useParticulas";
import type { Hocico, Ojos, Orejas } from "./Vaca";

export type { ClaseObjeto, Punto } from "./cocina/animar";
export type { Particula, TipoParticula } from "./useParticulas";

export type AlEvento = (nombre: string, datos?: Record<string, unknown>) => void;

/** Estado del 玩: "juego" pregunta, "celebra" son los 1,8 s de festejo, "fin" espera la tarjeta del método. */
export interface EstadoQuiz extends Quiz {
  i: number;
  aciertos: number;
  fase: "juego" | "celebra" | "fin";
}

const GLOBO_QUIZ: Silaba[] = [...GEI_WO, ...S("？", "?", "5")];

export interface CasaApi {
  estado: EstadoCocina;
  camara: Camara;
  vaca: Punto;
  cara: { ojos: Ojos; hocico: Hocico; orejas: Orejas; salta: boolean };
  globo: Silaba[] | null;
  opciones: { id: ObjetoId; lista: Accion[] } | null;
  ocupado: boolean;
  primerPlano: { accion: Accion; objeto: ObjetoId } | null;
  /** El 玩 en curso (null si no hay). */
  quiz: EstadoQuiz | null;
  /** Posición fuera de su lugar (llevado por una animación). */
  posiciones: Partial<Record<ObjetoId, Punto>>;
  clases: Partial<Record<ObjetoId, ClaseObjeto[]>>;
  particulas: Particula[];
  tocar(id: ObjetoId): Promise<void>;
  tocarVaca(): void;
  soltarObjetoEnVaca(id: ObjetoId): Promise<void>;
  soltarVaca(x: number, y: number): Promise<void>;
  elegir(id: ObjetoId, accion: Accion): Promise<void>;
  /** Al empezar a arrastrar: se cierran las opciones y el globo. */
  empezarArrastre(): void;
  /** Vista completa. Se ignora mientras la casa está ocupada. */
  verTodo(): void;
  terminarPrimerPlano(m: Medalla): void;
  empezarQuiz(): void;
  /** El botón 🔊: repite 给我 + nombre. */
  repetirQuiz(): void;
  /** Cierra el quiz terminado (después de la tarjeta del método). */
  cerrarQuiz(): void;
  /** La vaca festeja y dice 你好 (al entrar a la casa). */
  saludar(): void;
}

const registrarFallo = (e: unknown) => console.error("[casa]", e);
const VISTA_TODO: Camara = { x: 500, y: 500, s: 1 };
const VACA_INICIAL: Punto = { x: 250, y: 780 };

/** Valor con estado de React y ref sincronizada: las secuencias async leen siempre lo último. */
function useVivo<T>(inicial: T): [T, { readonly current: T }, (v: T) => void] {
  const [valor, setValor] = useState(inicial);
  const ref = useRef(inicial);
  const poner = useCallback((v: T) => {
    ref.current = v;
    setValor(v);
  }, []);
  return [valor, ref, poner];
}

function bocaDe(abierta: number): Hocico {
  return abierta > 0.5 ? "abierta" : abierta > 0.15 ? "o" : "sonrisa";
}

export function useCasa(onEvento?: AlEvento): CasaApi {
  const [estado, estadoRef, setEstado] = useVivo<EstadoCocina>(ESTADO_INICIAL);
  const [camara, , setCamara] = useVivo<Camara>(VISTA_TODO);
  const [vaca, vacaRef, setVaca] = useVivo<Punto>(VACA_INICIAL);
  const [ocupado, ocupadoRef, setOcupado] = useVivo(false);
  const [ojos, setOjos] = useState<Ojos>("abiertos");
  const [hocico, setHocico] = useState<Hocico>("sonrisa");
  const [orejas, setOrejas] = useState<Orejas>("normales");
  const [salta, setSalta] = useState(false);
  const [globo, setGlobo] = useState<Silaba[] | null>(null);
  const [opciones, setOpciones] = useState<CasaApi["opciones"]>(null);
  const [primerPlano, setPrimerPlano] = useState<CasaApi["primerPlano"]>(null);
  const [posiciones, setPosiciones] = useState<CasaApi["posiciones"]>({});
  const [clases, setClases] = useState<CasaApi["clases"]>({});
  const [quiz, quizRef, setQuiz] = useVivo<EstadoQuiz | null>(null);

  const eventoRef = useRef(onEvento);
  useEffect(() => {
    eventoRef.current = onEvento;
  }, [onEvento]);
  const resolverPP = useRef<((m: Medalla) => void) | null>(null);
  const turnoVoz = useRef(0);

  const { luego, espera } = useTiempos();
  const { particulas, particula, miga, brillos, rafaga } = useParticulas(luego);

  // ---- piezas chicas ----
  const clase = useCallback((id: ObjetoId, c: ClaseObjeto, on: boolean) => {
    setClases((prev) => {
      const actuales = prev[id] ?? [];
      const nuevas = on ? (actuales.includes(c) ? actuales : [...actuales, c]) : actuales.filter((x) => x !== c);
      return { ...prev, [id]: nuevas };
    });
  }, []);
  const llevarA = useCallback((id: ObjetoId, x: number, y: number) => {
    setPosiciones((p) => ({ ...p, [id]: { x, y } }));
  }, []);
  const volverASuLugar = useCallback((id: ObjetoId) => {
    setPosiciones((p) => {
      if (!(id in p)) return p;
      const n = { ...p };
      delete n[id];
      return n;
    });
  }, []);

  const mirar = useCallback(
    (o: Ojos, ms: number) => {
      setOjos(o);
      luego(() => setOjos("abiertos"), ms);
    },
    [luego],
  );
  const festejo = useCallback(
    (ms = 1400) => {
      setOjos("felices");
      setOrejas("arriba");
      setSalta(true);
      luego(() => {
        setOjos("abiertos");
        setOrejas("normales");
        setSalta(false);
      }, ms);
    },
    [luego],
  );

  /** La vaca habla: globo + boca. Nunca lanza, aunque `decir` rechace. */
  const hablar = useCallback(
    async (s: Silaba[], opc: { globo?: Silaba[]; fijo?: boolean } = {}) => {
      const turno = ++turnoVoz.current;
      setGlobo(opc.globo ?? s);
      try {
        await decir(s, { alBoca: (a) => setHocico(bocaDe(a)) });
      } catch {
        /* sin voz: la casa sigue igual */
      } finally {
        if (turno === turnoVoz.current) {
          setHocico("sonrisa");
          if (!opc.fijo) {
            luego(() => {
              if (turno === turnoVoz.current) setGlobo(null);
            }, 1500);
          }
        }
      }
    },
    [luego],
  );

  const aplicarAccion = useCallback(
    (a: Accion) => setEstado(aplicar(estadoRef.current, a)),
    [estadoRef, setEstado],
  );

  // ---- vapor mientras el arroz está cocido ----
  useEffect(() => {
    if (estado.guo !== "cocido") return;
    const id = setInterval(() => particula("vapor", OBJETOS.guo), 450);
    return () => clearInterval(id);
  }, [estado.guo, particula]);

  // ---- interacciones ----
  const cerrarOpciones = useCallback(() => setOpciones(null), []);
  const mostrarOpciones = useCallback((id: ObjetoId, lista: Accion[]) => setOpciones({ id, lista }), []);

  const tocar = useCallback(
    async (id: ObjetoId) => {
      if (ocupadoRef.current || quizRef.current || estadoRef.current[id] === "nada") return;
      sfx("pop");
      brillos(id);
      clase(id, "tiembla", true);
      luego(() => clase(id, "tiembla", false), 1000);
      mirar("izquierda", 900);
      eventoRef.current?.("tocar_objeto", { id });
      await hablar(OBJETOS[id].nombre);
    },
    [ocupadoRef, quizRef, estadoRef, brillos, clase, luego, mirar, hablar],
  );

  const tocarVaca = useCallback(() => {
    if (ocupadoRef.current) return;
    festejo(700);
    sfx("boing");
  }, [ocupadoRef, festejo]);

  const abrirAcciones = useCallback(
    async (id: ObjetoId) => {
      if (ocupadoRef.current) return;
      cerrarOpciones();
      setOcupado(true);
      try {
        eventoRef.current?.("abrir_acciones", { id });
        const o = OBJETOS[id];
        const dest = puntoJunto(id);
        setVaca(dest);
        setCamara(enfocar((o.x + dest.x) / 2, (o.y + dest.y - 90) / 2, 1.9));
        await espera(400);
        mirar("sorpresa", 700);
        await hablar([...ZHE_SHI, ...o.nombre]);
        const lista = acciones(id, estadoRef.current);
        if (!lista.length) {
          mirar("izquierda", 900);
          return;
        }
        mostrarOpciones(id, lista);
      } finally {
        setOcupado(false);
      }
    },
    [ocupadoRef, estadoRef, cerrarOpciones, setOcupado, setVaca, setCamara, espera, mirar, hablar, mostrarOpciones],
  );

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
    setCamara(VISTA_TODO);
    setVaca({ x: 420, y: 600 });
    setQuiz({ ...crearQuiz(estadoRef.current, Math.random), i: 0, aciertos: 0, fase: "juego" });
    eventoRef.current?.("quiz_inicio");
    luego(() => void pedirQuiz().catch(registrarFallo), 700);
  }, [ocupadoRef, quizRef, estadoRef, cerrarOpciones, setCamara, setVaca, setQuiz, luego, pedirQuiz]);

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
    [quizRef, ocupadoRef, setOcupado, setQuiz, festejo, hablar, espera, mirar, pedirQuiz],
  );

  const repetirQuiz = useCallback(() => {
    if (ocupadoRef.current) return;
    pedirQuiz().catch(registrarFallo);
  }, [ocupadoRef, pedirQuiz]);

  const cerrarQuiz = useCallback(() => {
    setQuiz(null);
    setGlobo(null);
  }, [setQuiz]);

  const saludar = useCallback(() => {
    luego(() => {
      festejo();
      void hablar(NI_HAO);
    }, 400);
  }, [luego, festejo, hablar]);

  const soltarObjetoEnVaca = useCallback(
    (id: ObjetoId) => (quizRef.current ? responderQuiz(id) : abrirAcciones(id)),
    [quizRef, responderQuiz, abrirAcciones],
  );

  const soltarVaca = useCallback(
    async (x: number, y: number) => {
      if (ocupadoRef.current) return;
      if (quizRef.current) return setVaca(limitarVaca(x, y)); // en el 玩 la vaca no abre acciones
      // objetoBajo usa la posición sin limitar: así la vaca alcanza el mesón.
      const o = objetoBajo({ x, y }, estadoRef.current);
      if (o) return abrirAcciones(o);
      setVaca(limitarVaca(x, y));
    },
    [ocupadoRef, quizRef, estadoRef, abrirAcciones, setVaca],
  );

  const elegir = useCallback(
    async (id: ObjetoId, a: Accion) => {
      if (ocupadoRef.current) return;
      cerrarOpciones();
      setOcupado(true);
      try {
        const objId = a.objeto ?? id; // a veces la acción mueve otro objeto (盛饭 llena el 碗)
        const donde: ObjetoId | "fregadero" =
          a.lugar === "fregadero" ? "fregadero" : a.anim === "servirTe" ? "chahu" : id;
        const p = puntoJunto(donde);
        setVaca(p);
        const foco = donde === "fregadero" ? FREGADERO : OBJETOS[donde];
        setCamara(enfocar((foco.x + p.x) / 2, (foco.y + p.y - 100) / 2, 2.2));
        if (a.lugar === "fregadero") {
          const f = junto(FREGADERO, ANCLAS.enFregadero);
          llevarA(objId, f.x, f.y);
        }
        await espera(750);

        if (GESTO_DE[a.anim]) {
          // primer plano: el verbo se hace con el dedo (lo dibuja la Task 9)
          const m = await new Promise<Medalla>((res) => {
            resolverPP.current = res;
            setPrimerPlano({ accion: a, objeto: objId });
          });
          setPrimerPlano(null);
          aplicarAccion(a);
          volverASuLugar(objId);
          if (a.anim === "servirTe") volverASuLugar("beizi");
          festejo(900);
          eventoRef.current?.("gesto_completo", { anim: a.anim, medalla: m });
        } else {
          sfx(a.sfx);
          const voz = hablar(a.frase);
          await animar(a, objId, {
            vaca: vacaRef.current, espera, luego, particula, miga, brillos, rafaga,
            aplicar: () => aplicarAccion(a), clase, llevarA, volverASuLugar, ojos: setOjos,
          });
          if (a.anim !== "sacar") volverASuLugar(objId);
          await voz;
          festejo(900);
        }

        // después de la acción, el objeto ofrece lo que tiene sentido ahora (comer → lavar → …)
        await espera(500);
        const sig: ObjetoId = a.anim === "servirTe" ? "beizi" : a.anim === "servirArroz" ? "wan" : id;
        const siguiente = acciones(sig, estadoRef.current);
        if (siguiente.length) {
          setVaca(puntoJunto(sig));
          setCamara(enfocar(OBJETOS[sig].x, OBJETOS[sig].y + 60, 1.9));
          await espera(650);
          mostrarOpciones(sig, siguiente);
        }
      } finally {
        resolverPP.current = null;
        setPrimerPlano(null);
        setOcupado(false);
      }
    },
    [ocupadoRef, estadoRef, vacaRef, cerrarOpciones, setOcupado, setVaca, setCamara, llevarA, espera, luego,
      aplicarAccion, volverASuLugar, festejo, hablar, particula, miga, brillos, rafaga, clase, mostrarOpciones],
  );

  const terminarPrimerPlano = useCallback((m: Medalla) => {
    const r = resolverPP.current;
    resolverPP.current = null;
    r?.(m);
  }, []);

  const empezarArrastre = useCallback(() => {
    cerrarOpciones();
    if (quizRef.current) return; // en el 玩 el globo con la pregunta se queda
    turnoVoz.current++;
    setGlobo(null);
  }, [cerrarOpciones, quizRef]);

  const verTodo = useCallback(() => {
    if (ocupadoRef.current) return; // sin saltos de cámara a mitad de una secuencia
    cerrarOpciones();
    setCamara(VISTA_TODO);
  }, [ocupadoRef, cerrarOpciones, setCamara]);

  return {
    estado, camara, vaca, cara: { ojos, hocico, orejas, salta }, globo, opciones, ocupado, primerPlano,
    quiz, posiciones, clases, particulas,
    empezarQuiz, repetirQuiz, cerrarQuiz, saludar,
    tocar, tocarVaca, soltarObjetoEnVaca, soltarVaca, elegir, empezarArrastre, verTodo, terminarPrimerPlano,
  };
}
