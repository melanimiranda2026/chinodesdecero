"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Silaba } from "@/lib/silabas";
import { ESTADO_INICIAL, FREGADERO, OBJETOS, type EstadoCocina, type ObjetoId } from "./cocina/datos";
import { acciones, aplicar, type Accion } from "./cocina/acciones";
import { ZHE_SHI } from "./cocina/frases";
import { enfocar, limitarVaca, objetoBajo, puntoJunto, type Camara } from "./camara";
import { GESTO_DE, type Medalla } from "./gestos/medalla";
import { decir } from "./audio/voz";
import { sfx } from "./audio/sonido";
import type { Hocico, Ojos, Orejas } from "./Vaca";

export type Punto = { x: number; y: number };
export type ClaseObjeto = "tiembla" | "inclina" | "encoge" | "directo";
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

export type AlEvento = (nombre: string, datos?: Record<string, unknown>) => void;

export interface CasaApi {
  estado: EstadoCocina;
  camara: Camara;
  vaca: Punto;
  cara: { ojos: Ojos; hocico: Hocico; orejas: Orejas; salta: boolean };
  globo: Silaba[] | null;
  opciones: { id: ObjetoId; lista: Accion[] } | null;
  ocupado: boolean;
  primerPlano: { accion: Accion; objeto: ObjetoId } | null;
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
  verTodo(): void;
  terminarPrimerPlano(m: Medalla): void;
}

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
  const [particulas, setParticulas] = useState<Particula[]>([]);

  const eventoRef = useRef(onEvento);
  useEffect(() => {
    eventoRef.current = onEvento;
  }, [onEvento]);
  const resolverPP = useRef<((m: Medalla) => void) | null>(null);
  const turnoVoz = useRef(0);
  const claveParticula = useRef(0);

  // ---- tiempos: todos se limpian al desmontar ----
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const luego = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  }, []);
  const espera = useCallback((ms: number) => new Promise<void>((r) => luego(r, ms)), [luego]);
  useEffect(() => {
    const set = timers.current;
    return () => {
      set.forEach(clearTimeout);
      set.clear();
    };
  }, []);

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

  const agregarParticula = useCallback(
    (p: Omit<Particula, "clave">, vida: number) => {
      const clave = ++claveParticula.current;
      setParticulas((l) => [...l, { ...p, clave }]);
      luego(() => setParticulas((l) => l.filter((q) => q.clave !== clave)), vida);
    },
    [luego],
  );
  const particula = useCallback(
    (tipo: TipoParticula, o: { x: number; y: number; w: number }, color?: string) => {
      agregarParticula(
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
    [agregarParticula],
  );
  const miga = useCallback(
    (x: number, y: number) => {
      agregarParticula({ tipo: "miga", x, y, dx: (Math.random() - 0.5) * 60, dy: 10 + Math.random() * 40 }, 900);
    },
    [agregarParticula],
  );
  const brillos = useCallback(
    (id: ObjetoId) => {
      const o = OBJETOS[id];
      for (let i = 0; i < 4; i++)
        agregarParticula(
          { tipo: "brillo", x: o.x + (Math.random() - 0.5) * o.w, y: o.y + (Math.random() - 0.5) * o.w, retraso: i * 0.08 },
          1800,
        );
    },
    [agregarParticula],
  );
  /** Repite `fn` n veces cada `cada` ms (gotas, burbujas, migas…). */
  const rafaga = useCallback(
    (n: number, cada: number, fn: () => void) => {
      for (let i = 0; i < n; i++) luego(fn, i * cada);
    },
    [luego],
  );

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
    async (s: Silaba[]) => {
      const turno = ++turnoVoz.current;
      setGlobo(s);
      try {
        await decir(s, { alBoca: (a) => setHocico(bocaDe(a)) });
      } catch {
        /* sin voz: la casa sigue igual */
      } finally {
        if (turno === turnoVoz.current) {
          setHocico("sonrisa");
          luego(() => {
            if (turno === turnoVoz.current) setGlobo(null);
          }, 1500);
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
      if (ocupadoRef.current || estadoRef.current[id] === "nada") return;
      sfx("pop");
      brillos(id);
      clase(id, "tiembla", true);
      luego(() => clase(id, "tiembla", false), 1000);
      mirar("izquierda", 900);
      eventoRef.current?.("tocar_objeto", { id });
      await hablar(OBJETOS[id].nombre);
    },
    [ocupadoRef, estadoRef, brillos, clase, luego, mirar, hablar],
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

  const soltarObjetoEnVaca = useCallback((id: ObjetoId) => abrirAcciones(id), [abrirAcciones]);

  const soltarVaca = useCallback(
    async (x: number, y: number) => {
      if (ocupadoRef.current) return;
      // objetoBajo usa la posición sin limitar: así la vaca alcanza el mesón.
      const o = objetoBajo({ x, y }, estadoRef.current);
      if (o) return abrirAcciones(o);
      setVaca(limitarVaca(x, y));
    },
    [ocupadoRef, estadoRef, abrirAcciones, setVaca],
  );

  /** La animación de la acción dentro de la casa (portada del `switch` de hacer() del prototipo). */
  const animar = useCallback(
    async (a: Accion, objId: ObjetoId) => {
      const v = vacaRef.current;
      switch (a.anim) {
        case "llenar":
          rafaga(10, 110, () => particula("gota", { x: 490, y: 278, w: 0 }, "#7FC3E8"));
          await espera(700);
          aplicarAccion(a);
          await espera(700);
          break;
        case "lavar":
          clase(objId, "tiembla", true);
          rafaga(12, 120, () => particula("burbuja", { x: FREGADERO.x, y: FREGADERO.y, w: 90 }));
          await espera(1000);
          aplicarAccion(a);
          await espera(600);
          clase(objId, "tiembla", false);
          break;
        case "beber":
        case "tomar":
          llevarA(objId, v.x + 40, v.y - 120);
          if (a.anim === "beber") {
            luego(() => clase(objId, "inclina", true), 500);
            setOjos("cerrados");
          }
          await espera(1300);
          aplicarAccion(a);
          await espera(400);
          clase(objId, "inclina", false);
          setOjos("abiertos");
          break;
        case "comer":
          llevarA(objId, v.x + 30, v.y - 110);
          await espera(500);
          rafaga(8, 90, () => miga(v.x + 20, v.y - 110));
          setOjos("felices");
          clase(objId, "encoge", true);
          await espera(900);
          aplicarAccion(a);
          clase(objId, "encoge", false);
          await espera(300);
          setOjos("abiertos");
          break;
        case "abrir":
        case "cerrar":
          aplicarAccion(a);
          if (a.anim === "abrir") setOjos("sorpresa");
          await espera(1000);
          setOjos("abiertos");
          break;
        case "cortar":
          clase(objId, "tiembla", true);
          await espera(700);
          aplicarAccion(a);
          clase(objId, "tiembla", false);
          await espera(600);
          break;
        case "cocinar":
          clase("guo", "tiembla", true);
          rafaga(8, 150, () => particula("vapor", OBJETOS.guo));
          await espera(1200);
          aplicarAccion(a);
          clase("guo", "tiembla", false);
          break;
        case "servirTe": {
          const t = OBJETOS.chahu;
          llevarA("beizi", t.x + 80, t.y + 30);
          await espera(550);
          clase("chahu", "inclina", true);
          rafaga(8, 110, () => particula("gota", { x: t.x + 52, y: t.y - 6, w: 0 }, "#C98E3A"));
          await espera(900);
          aplicarAccion(a);
          clase("chahu", "inclina", false);
          await espera(400);
          volverASuLugar("beizi");
          break;
        }
        case "servirArroz": {
          const g = OBJETOS.guo;
          llevarA("wan", g.x, g.y + 80);
          await espera(600);
          rafaga(6, 100, () => miga(g.x, g.y + 40));
          await espera(600);
          aplicarAccion(a);
          await espera(400);
          break;
        }
        case "sacar":
          if (objId === "pingguo") {
            // la manzana aparece en el refri y vuela a su lugar
            clase("pingguo", "directo", true);
            llevarA("pingguo", 100, 300);
            await espera(60);
            aplicarAccion(a);
            clase("pingguo", "directo", false);
            volverASuLugar("pingguo");
            await espera(800);
          } else {
            aplicarAccion(a);
            brillos(objId);
            await espera(800);
          }
          break;
        default:
          aplicarAccion(a);
          await espera(800);
      }
    },
    [vacaRef, rafaga, particula, espera, aplicarAccion, clase, llevarA, luego, miga, volverASuLugar, brillos],
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
        if (a.lugar === "fregadero") llevarA(objId, FREGADERO.x, FREGADERO.y - 6);
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
          await animar(a, objId);
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
    [ocupadoRef, estadoRef, cerrarOpciones, setOcupado, setVaca, setCamara, llevarA, espera, aplicarAccion,
      volverASuLugar, festejo, hablar, animar, mostrarOpciones],
  );

  const terminarPrimerPlano = useCallback((m: Medalla) => {
    const r = resolverPP.current;
    resolverPP.current = null;
    r?.(m);
  }, []);

  const empezarArrastre = useCallback(() => {
    cerrarOpciones();
    turnoVoz.current++;
    setGlobo(null);
  }, [cerrarOpciones]);

  const verTodo = useCallback(() => {
    cerrarOpciones();
    setCamara(VISTA_TODO);
  }, [cerrarOpciones, setCamara]);

  return {
    estado, camara, vaca, cara: { ojos, hocico, orejas, salta }, globo, opciones, ocupado, primerPlano,
    posiciones, clases, particulas,
    tocar, tocarVaca, soltarObjetoEnVaca, soltarVaca, elegir, empezarArrastre, verTodo, terminarPrimerPlano,
  };
}
