"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { idAudio, type Silaba } from "@/lib/silabas";
import { ANCLAS, ESTADO_INICIAL, FREGADERO, OBJETOS, junto, type ComidaId, type EstadoCocina, type ObjetoId } from "./cocina/datos";
import { acciones, aplicar, type Accion } from "./cocina/acciones";
import { animar, fraseDespues, type ClaseObjeto, type Punto } from "./cocina/animar";
import { HEN_RE, NI_HAO, ZHE_SHI } from "./cocina/frases";
import { lugarGato, siguienteEscondite } from "./cocina/gato";
import { useQuiz, type EstadoQuiz } from "./useQuiz";
import { useVivo } from "./useVivo";
import { apuntar, limitarVaca, objetoBajo, puntoJunto, type Camara } from "./camara";
import { GESTO_DE, esReceta, type Medalla } from "./gestos/medalla";
import { callar, decir } from "./audio/voz";
import { sfx } from "./audio/sonido";
import { efectoYLuegoVoz } from "./audio/turnos";
import { useTiempos } from "./useTiempos";
import { useParticulas, type Particula } from "./useParticulas";
import { useRefri } from "./refri/useRefri";
import type { Hocico, Ojos, Orejas } from "./Vaca";

export type { ClaseObjeto, Punto } from "./cocina/animar";
export type { EstadoQuiz } from "./useQuiz";
export type { Particula, TipoParticula } from "./useParticulas";

export type AlEvento = (nombre: string, datos?: Record<string, unknown>) => void;

export interface CasaApi {
  estado: EstadoCocina;
  camara: Camara;
  vaca: Punto;
  cara: { ojos: Ojos; hocico: Hocico; orejas: Orejas; salta: boolean; sentada: boolean };
  /** El gato está afuera (encontrado): se ve entero unos segundos y luego se va a otro escondite. */
  gatoVisto: boolean;
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
  /** ✕ del primer plano: sale sin aplicar la acción y libera la casa. */
  cancelarPrimerPlano(): void;
  /** El botón 玩: empieza el quiz o, si ya hay uno, lo termina (sin tarjeta). */
  empezarQuiz(): void;
  /** El botón 🔊: repite 给我 + nombre. */
  repetirQuiz(): void;
  /** El refri por dentro, en primer plano (después de 打开). La casa sigue `ocupado` mientras tanto. */
  refri: boolean;
  /** Desde el primer plano del refri: 拿… / 关上 (la acción de siempre) o `null` (✕: cierra la puerta). */
  elegirRefri(a: Accion | null): void;
  /** La pestaña se ocultó: sale del refri sin aplicar nada, callada, y la casa queda libre. */
  cerrarRefri(): void;
  /** Tocar una comida del refri: dice su nombre (y cada tercer toque, 很冷). */
  tocarComida(id: ComidaId | "cajon"): Promise<void>;
  /** Cuenta como escuchada una frase que sonó fuera de `hablar` (la receta). Nunca lanza. */
  escuchar(idAudio: string): void;
  /** Cierra el quiz terminado (después de la tarjeta del método). */
  cerrarQuiz(): void;
  /** La vaca festeja y dice 你好 (al entrar a la casa). */
  saludar(): void;
  /** Pone el estado de la cocina guardado (al cargar el avance). */
  restaurar(estado: EstadoCocina): void;
}

const VISTA_TODO: Camara = { x: 500, y: 500, s: 1 };
const VACA_INICIAL: Punto = { x: 434, y: 613 }; // piso: u 5, v 6.5

function bocaDe(abierta: number): Hocico {
  return abierta > 0.5 ? "abierta" : abierta > 0.15 ? "o" : "sonrisa";
}

export interface OpcionesCasa {
  /** Se llama con el id de audio de cada frase que la vaca dijo de verdad (el audio sonó). */
  alEscuchar?: (idAudio: string) => void;
  /** La hora (0–23) para lo que se come (早饭, 午饭, 晚饭). Por defecto, la del reloj. */
  hora?: () => number;
}

const horaDelReloj = () => new Date().getHours();
/** Lo que dura el gato afuera antes de irse al siguiente escondite. */
const GATO_AFUERA_MS = 3000;

export function useCasa(onEvento?: AlEvento, ganchos: OpcionesCasa = {}): CasaApi {
  const [estado, estadoRef, setEstado] = useVivo<EstadoCocina>(ESTADO_INICIAL);
  const [camara, , setCamara] = useVivo<Camara>(VISTA_TODO);
  const [vaca, vacaRef, setVaca] = useVivo<Punto>(VACA_INICIAL);
  const [ocupado, ocupadoRef, setOcupado] = useVivo(false);
  const [ojos, setOjos] = useState<Ojos>("abiertos");
  const [hocico, setHocico] = useState<Hocico>("sonrisa");
  const [orejas, setOrejas] = useState<Orejas>("normales");
  const [salta, setSalta] = useState(false);
  const [sentada, setSentada] = useState(false);
  const [gatoVisto, gatoVistoRef, setGatoVisto] = useVivo(false);
  const [globo, setGlobo] = useState<Silaba[] | null>(null);
  const [opciones, setOpciones] = useState<CasaApi["opciones"]>(null);
  const [primerPlano, setPrimerPlano] = useState<CasaApi["primerPlano"]>(null);
  const [posiciones, setPosiciones] = useState<CasaApi["posiciones"]>({});
  const [clases, setClases] = useState<CasaApi["clases"]>({});

  const eventoRef = useRef(onEvento);
  useEffect(() => {
    eventoRef.current = onEvento;
  }, [onEvento]);
  const escucharRef = useRef(ganchos.alEscuchar);
  useEffect(() => {
    escucharRef.current = ganchos.alEscuchar;
  }, [ganchos.alEscuchar]);
  const horaRef = useRef(ganchos.hora ?? horaDelReloj);
  useEffect(() => {
    horaRef.current = ganchos.hora ?? horaDelReloj;
  }, [ganchos.hora]);
  /** null = ✕ (salir sin aplicar la acción). */
  const resolverPP = useRef<((m: Medalla | null) => void) | null>(null);
  const turnoVoz = useRef(0);
  // cuenta los toques a objetos: el saludo del primer toque cede ante lo que se tocó
  const toques = useRef(0);
  /** Frases en curso (para no tocar efectos encima del mandarín). */
  const hablando = useRef(0);

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

  /**
   * La vaca habla: globo + boca. Nunca lanza, aunque `decir` rechace. Devuelve si el audio sonó.
   * `siMudo`: globo que se muestra si no sonó (p. ej. en el 玩, la respuesta escrita).
   */
  const hablar = useCallback(
    async (s: Silaba[], opc: { globo?: Silaba[]; fijo?: boolean; siMudo?: Silaba[] } = {}): Promise<boolean> => {
      const turno = ++turnoVoz.current;
      hablando.current++;
      setGlobo(opc.globo ?? s);
      let sono = false;
      try {
        sono = (await decir(s, { alBoca: (a) => setHocico(bocaDe(a)), juego: "cocina" })) === true;
      } catch {
        /* sin voz: la casa sigue igual */
      }
      hablando.current--;
      if (sono) {
        try {
          escucharRef.current?.(idAudio(s));
        } catch {
          /* contar lo escuchado nunca frena a la vaca */
        }
      }
      if (turno === turnoVoz.current) {
        setHocico("sonrisa");
        if (!sono && opc.siMudo) setGlobo(opc.siMudo);
        if (!opc.fijo) {
          luego(() => {
            if (turno === turnoVoz.current) setGlobo(null);
          }, 1500);
        }
      }
      return sono;
    },
    [luego],
  );

  const escuchar = useCallback((id: string) => {
    try {
      escucharRef.current?.(id);
    } catch {
      /* contar lo escuchado nunca frena a la vaca */
    }
  }, []);

  const { refri, esperarRefri, elegirRefri, cerrarRefri, tocarComida } = useRefri({ hablar, hablando });
  /** Para encadenar la acción elegida dentro del refri (elegir se llama a sí misma). */
  const elegirRef = useRef<CasaApi["elegir"]>(async () => {});

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

  const callarVaca = useCallback(() => {
    turnoVoz.current++;
    callar();
    setGlobo(null);
    setHocico("sonrisa");
  }, []);

  /**
   * El refri por dentro (después de 打开 o al llegar a un refri ya abierto): espera lo que se elija ahí.
   * Devuelve la acción de siempre a correr luego, con la casa libre (拿…, 关上), o null (✕ o pestaña oculta).
   */
  const verRefri = useCallback(async (): Promise<Accion | null> => {
    const s = await esperarRefri();
    if (s !== null && s !== "salir") return s;
    callarVaca(); // ✕ o pestaña oculta: el nombre de la comida en curso se corta
    if (s === null) {
      const cerrar = acciones("bingxiang", estadoRef.current).find((x) => x.anim === "cerrar");
      if (cerrar) aplicarAccion(cerrar); // ✕: la puerta se cierra sin fanfarria
    }
    return null;
  }, [esperarRefri, callarVaca, estadoRef, aplicarAccion]);

  // ---- el gato: sale entero con brillos y a los 3 s se va al siguiente escondite ----
  const mostrarGato = useCallback(() => {
    if (gatoVistoRef.current) return;
    setGatoVisto(true);
    brillos("mao", lugarGato(estadoRef.current.mao));
    eventoRef.current?.("encontrar_gato", { donde: estadoRef.current.mao });
    luego(() => {
      const e = estadoRef.current;
      setEstado({ ...e, mao: siguienteEscondite(e.mao, e.chuanghu === "abierta") });
      setGatoVisto(false);
    }, GATO_AFUERA_MS);
  }, [gatoVistoRef, setGatoVisto, brillos, estadoRef, luego, setEstado]);

  const { quiz, quizRef, empezarQuiz, responderQuiz, repetirQuiz, cerrarQuiz } = useQuiz({
    ocupadoRef, estadoRef, setOcupado, cerrarOpciones, setCamara, setVaca, setGlobo,
    vistaTodo: VISTA_TODO, hablar, callarVaca, espera, luego, festejo, mirar, eventoRef,
  });

  const tocar = useCallback(
    async (id: ObjetoId) => {
      if (ocupadoRef.current || quizRef.current || estadoRef.current[id] === "nada") return;
      if (id === "mao" && gatoVistoRef.current) return; // ya está afuera
      toques.current++;
      if (id === "mao") mostrarGato(); // tocar la cola: el gato sale
      else brillos(id);
      clase(id, "tiembla", true);
      luego(() => clase(id, "tiembla", false), 1000);
      mirar("izquierda", 900);
      eventoRef.current?.("tocar_objeto", { id });
      let turno = -1;
      const decirNombre = () => {
        const dicho = hablar(OBJETOS[id].nombre);
        turno = turnoVoz.current;
        return dicho;
      };
      // el pop solo si nada suena ni espera: nunca encima del mandarín
      await (hablando.current === 0 ? efectoYLuegoVoz("pop", decirNombre, { juego: "cocina" }) : decirNombre());
      // la tetera: 茶壶 y luego 很热 (si nada más habló entretanto)
      if (id === "chahu" && turno === turnoVoz.current) await hablar(HEN_RE);
    },
    [ocupadoRef, quizRef, estadoRef, gatoVistoRef, mostrarGato, brillos, clase, luego, mirar, hablar],
  );

  const tocarVaca = useCallback(() => {
    if (ocupadoRef.current) return;
    festejo(700);
    if (hablando.current === 0) sfx("boing", "cocina"); // nunca encima del mandarín
  }, [ocupadoRef, festejo]);

  const abrirAcciones = useCallback(
    async (id: ObjetoId) => {
      if (ocupadoRef.current) return;
      cerrarOpciones();
      setOcupado(true);
      /** El refri ya abierto: se ve por dentro; lo elegido ahí corre después, con la casa libre. */
      let luegoRefri: Accion | null = null;
      try {
        eventoRef.current?.("abrir_acciones", { id });
        const o = OBJETOS[id];
        const dest = puntoJunto(id);
        setVaca(dest);
        setCamara(apuntar((o.x + dest.x) / 2, (o.y + dest.y - 90) / 2, 1.9));
        await espera(400);
        mirar("sorpresa", 700);
        await hablar([...ZHE_SHI, ...o.nombre]);
        if (id === "bingxiang" && estadoRef.current.bingxiang === "abierto") {
          luegoRefri = await verRefri();
          return;
        }
        const lista = acciones(id, estadoRef.current, horaRef.current());
        if (!lista.length) {
          mirar("izquierda", 900);
          return;
        }
        mostrarOpciones(id, lista);
      } finally {
        setOcupado(false);
        if (luegoRefri) await elegirRef.current(id, luegoRefri);
      }
    },
    [ocupadoRef, estadoRef, cerrarOpciones, setOcupado, setVaca, setCamara, espera, mirar, hablar, mostrarOpciones, verRefri],
  );

  const saludar = useCallback(() => {
    const turno = turnoVoz.current;
    const toque = toques.current;
    luego(() => {
      // lo tocado gana: si algo más habló o empezó, el saludo se salta
      if (turno !== turnoVoz.current || toque !== toques.current || ocupadoRef.current || quizRef.current) return;
      festejo();
      void hablar(NI_HAO);
    }, 400);
  }, [luego, festejo, hablar, ocupadoRef, quizRef]);

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
      /** Lo que la vaca tiene en la mano hasta el final (el teléfono, hasta el 喂). */
      let enMano: ObjetoId | null = null;
      /** Lo elegido dentro del refri: corre después, como una acción más. */
      let luegoRefri: Accion | null = null;
      try {
        const objId = a.objeto ?? id; // a veces la acción mueve otro objeto (盛饭 llena el 碗)
        const donde: ObjetoId | "fregadero" =
          a.lugar === "fregadero" ? "fregadero" : a.anim === "servirTe" ? "chahu" : id;
        const p = puntoJunto(donde);
        setVaca(p);
        const foco = donde === "fregadero" ? FREGADERO : OBJETOS[donde];
        setCamara(apuntar((foco.x + p.x) / 2, (foco.y + p.y - 100) / 2, 2.2));
        if (a.lugar === "fregadero") {
          const f = junto(FREGADERO, ANCLAS.enFregadero);
          llevarA(objId, f.x, f.y);
        }
        await espera(750);
        const antes = estadoRef.current;

        if ((GESTO_DE[a.anim] || esReceta(a.anim)) && !a.sinGesto) {
          // primer plano: el verbo se hace con el dedo (做饭: la receta, que Casa dibuja en vez del gesto)
          const m = await new Promise<Medalla | null>((res) => {
            resolverPP.current = res;
            setPrimerPlano({ accion: a, objeto: objId });
          });
          setPrimerPlano(null);
          if (m === null) {
            // ✕: sale sin hacer la acción; todo vuelve a su lugar y la casa queda libre
            volverASuLugar(objId);
            if (a.anim === "servirTe") volverASuLugar("beizi");
            return;
          }
          aplicarAccion(a);
          volverASuLugar(objId);
          if (a.anim === "servirTe") volverASuLugar("beizi");
          festejo(900);
          eventoRef.current?.("gesto_completo", { anim: a.anim, medalla: m });
          const extra = fraseDespues(a, objId, antes); // 很好吃 al terminar de morder, 很热 tras el té
          if (extra) await hablar(extra);
        } else {
          const voz = efectoYLuegoVoz(a.sfx, () => hablar(a.frase), { juego: "cocina" });
          await animar(a, objId, {
            vaca: vacaRef.current, espera, luego, particula, miga, brillos, rafaga,
            aplicar: () => aplicarAccion(a), clase, llevarA, volverASuLugar, ojos: setOjos,
            vacaA: setVaca, sentada: setSentada,
            gatoSale: () => { if (estadoRef.current.mao === "lajitong") mostrarGato(); },
          });
          // el teléfono se queda en la mano hasta el 喂
          if (a.anim === "llamar") enMano = objId;
          else if (a.anim !== "sacar") volverASuLugar(objId);
          await voz;
          const extra = fraseDespues(a, objId, antes); // siempre después de la frase de la acción
          if (extra) await hablar(extra);
          if (enMano) volverASuLugar(enMano);
          enMano = null;
          festejo(900);
        }

        if (id === "bingxiang" && a.anim === "abrir") {
          // el refri por dentro: la casa espera lo que se elija ahí
          luegoRefri = await verRefri();
          return;
        }

        // después de la acción, el objeto ofrece lo que tiene sentido ahora (comer → lavar → …)
        await espera(500);
        const sig: ObjetoId = a.anim === "servirTe" ? "beizi" : a.anim === "servirArroz" ? "wan" : id;
        const siguiente = acciones(sig, estadoRef.current, horaRef.current());
        if (siguiente.length) {
          setVaca(puntoJunto(sig));
          setCamara(apuntar(OBJETOS[sig].x, OBJETOS[sig].y + 60, 1.9));
          await espera(650);
          mostrarOpciones(sig, siguiente);
        }
      } finally {
        resolverPP.current = null;
        setPrimerPlano(null);
        if (enMano) volverASuLugar(enMano); // también si algo lanzó antes del 喂
        setSentada(false);
        setOcupado(false);
        // lo elegido en el refri (拿…, 关上) corre como siempre, ya con la casa libre
        if (luegoRefri) await elegirRef.current(id, luegoRefri);
      }
    },
    [ocupadoRef, estadoRef, vacaRef, cerrarOpciones, setOcupado, setVaca, setCamara, llevarA, espera, luego,
      aplicarAccion, volverASuLugar, festejo, hablar, particula, miga, brillos, rafaga, clase, mostrarOpciones,
      mostrarGato, verRefri],
  );
  useEffect(() => {
    elegirRef.current = elegir;
  }, [elegir]);

  const terminarPrimerPlano = useCallback((m: Medalla) => {
    const r = resolverPP.current;
    resolverPP.current = null;
    r?.(m);
  }, []);
  const cancelarPrimerPlano = useCallback(() => {
    const r = resolverPP.current;
    resolverPP.current = null;
    r?.(null);
  }, []);

  const empezarArrastre = useCallback(() => {
    cerrarOpciones();
    if (quizRef.current) return; // en el 玩 el globo con la pregunta se queda
    turnoVoz.current++;
    setGlobo(null);
  }, [cerrarOpciones, quizRef]);

  const restaurar = useCallback((e: EstadoCocina) => setEstado(e), [setEstado]);

  const verTodo = useCallback(() => {
    if (ocupadoRef.current) return; // sin saltos de cámara a mitad de una secuencia
    cerrarOpciones();
    setCamara(VISTA_TODO);
  }, [ocupadoRef, cerrarOpciones, setCamara]);

  return {
    estado, camara, vaca, cara: { ojos, hocico, orejas, salta, sentada }, gatoVisto, globo, opciones, ocupado, primerPlano,
    quiz, posiciones, clases, particulas,
    empezarQuiz, repetirQuiz, cerrarQuiz, saludar, restaurar,
    tocar, tocarVaca, soltarObjetoEnVaca, soltarVaca, elegir, empezarArrastre, verTodo, terminarPrimerPlano,
    cancelarPrimerPlano, refri, elegirRefri, cerrarRefri, tocarComida, escuchar,
  };
}
