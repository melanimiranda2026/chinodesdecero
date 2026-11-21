"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Silaba } from "@/lib/silabas";
import { callar, decir } from "../audio/voz";
import { efectoYLuegoVoz } from "../audio/turnos";
import { ZHE_SHI } from "../cocina/frases";
import { proyectar, type Punto } from "../cocina/iso";
import type { AlEvento } from "../useCasa";
import { useTiempos } from "../useTiempos";
import { useVivo } from "../useVivo";
import type { Hocico } from "../Vaca";
import { completo, fichaId, fichasDe, lograr, tocar } from "./progreso";
import type { DefCuarto, Pose, ProgresoCuarto } from "./tipos";

/** La vaca camina hasta el pie del objeto. */
export const PASO_MS = 900;
/** Lo que dura la pose (sentada, mirando) después de la frase. */
export const POSE_MS = 1500;
/** Lo que brilla un objeto al tocarlo. */
const BRILLO_MS = 1000;

/** Donde la vaca espera al entrar: en el piso, adelante a la derecha (u 8.6, v 8.8; todos los cuartos son la misma caja). */
export const VACA_INICIAL: Punto = (() => {
  const p = proyectar(8.6, 8.8);
  return { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 };
})();

function movimientoReducido(): boolean {
  try {
    return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function bocaDe(abierta: number): Hocico {
  return abierta > 0.5 ? "abierta" : abierta > 0.15 ? "o" : "sonrisa";
}

/** Las sílabas de cada ficha del cuarto (sustantivos y verbos), por id. */
export function silabasDeFichas(def: DefCuarto): Map<string, Silaba[]> {
  const m = new Map<string, Silaba[]>();
  for (const o of def.objetos) m.set(fichaId(o.nombre), o.nombre);
  for (const a of def.acciones) m.set(fichaId(a.verbo), a.verbo);
  return m;
}

export interface OpcionesCuarto {
  progreso: ProgresoCuarto;
  /** `nuevas` = fichas recién ganadas. */
  alCambiar: (p: ProgresoCuarto, nuevas: string[]) => void;
  alEvento?: AlEvento;
  activo: boolean;
  /** Un objeto con `abre`: se llama después de decir su nombre. */
  alAbrir?: (que: "mesa") => void;
}

export interface CuartoApi {
  vaca: Punto;
  pose: Pose | null;
  globo: Silaba[] | null;
  hocico: Hocico;
  ocupado: boolean;
  /** Objeto con su píldora de acción abierta. */
  elegido: string | null;
  /** Objeto que brilla porque se acaba de tocar. */
  brillo: string | null;
  /** El progreso más reciente (el propio, aunque el de afuera aún no vuelva). */
  progreso: ProgresoCuarto;
  tocarObjeto(id: string): Promise<void>;
  hacer(accionId: string, objetoId: string): Promise<void>;
  /** Fichas por mostrar girando, en orden. */
  cola: Silaba[][];
  sacarDeCola(): void;
  /** Nada suena ni está por sonar: un efecto (el boing de la puerta) no queda encima del mandarín. */
  puedeSonar(): boolean;
}

/**
 * Estado y secuencias de un cuarto armado desde su ficha de datos: tocar un objeto (这是 + nombre, ficha del
 * sustantivo) y hacer una acción (caminar, frase, y recién después la pose; el logro cuenta al terminar la frase).
 */
export function useCuarto(def: DefCuarto, opc: OpcionesCuarto): CuartoApi {
  const [vaca, , setVaca] = useVivo<Punto>(VACA_INICIAL);
  const [ocupado, ocupadoRef, setOcupado] = useVivo(false);
  const [progreso, progresoRef, setProgreso] = useVivo<ProgresoCuarto>(opc.progreso);
  const [pose, setPose] = useState<Pose | null>(null);
  const [globo, setGlobo] = useState<Silaba[] | null>(null);
  const [hocico, setHocico] = useState<Hocico>("sonrisa");
  const [elegido, setElegido] = useState<string | null>(null);
  const [brillo, setBrillo] = useState<string | null>(null);
  const [cola, setCola] = useState<Silaba[][]>([]);
  const [reducido] = useState(movimientoReducido);

  const { luego, espera } = useTiempos();

  // lo de afuera siempre fresco para las secuencias async
  const cambiarRef = useRef(opc.alCambiar);
  const eventoRef = useRef(opc.alEvento);
  const abrirRef = useRef(opc.alAbrir);
  const defRef = useRef(def);
  useEffect(() => {
    cambiarRef.current = opc.alCambiar;
    eventoRef.current = opc.alEvento;
    abrirRef.current = opc.alAbrir;
    defRef.current = def;
  });
  // el progreso de afuera manda cuando cambia (al cargar el avance)
  useEffect(() => {
    setProgreso(opc.progreso);
  }, [opc.progreso, setProgreso]);

  const activoRef = useRef(opc.activo);
  /** Cada corte (pestaña oculta, cambio de cuarto) cambia la secuencia: lo que venía después ya no corre. */
  const secuencia = useRef(0);
  const turnoVoz = useRef(0);
  /** Frases en curso (para no tocar el pop encima del mandarín). */
  const hablando = useRef(0);
  /** cuarto_completo se emite una sola vez, al completarse aquí. */
  const avisado = useRef(false);

  /** La vaca habla: globo + boca. Nunca lanza. */
  const hablar = useCallback(
    async (s: Silaba[]): Promise<void> => {
      const turno = ++turnoVoz.current;
      hablando.current++;
      setGlobo(s);
      try {
        await decir(s, { alBoca: (a) => setHocico(bocaDe(a)), juego: "cocina" });
      } catch {
        /* sin voz: el cuarto sigue igual */
      }
      hablando.current--;
      if (turno !== turnoVoz.current) return;
      setHocico("sonrisa");
      luego(() => {
        if (turno === turnoVoz.current) setGlobo(null);
      }, 1500);
    },
    [luego],
  );

  /** Guarda el progreso nuevo, avisa afuera con las fichas recién ganadas y las pone en la cola. */
  const aplicar = useCallback(
    (nuevo: ProgresoCuarto) => {
      const antes = progresoRef.current;
      if (nuevo === antes) return;
      const d = defRef.current;
      const previas = fichasDe(d, antes);
      const nuevas = fichasDe(d, nuevo).filter((f) => !previas.includes(f));
      setProgreso(nuevo);
      try {
        cambiarRef.current(nuevo, nuevas);
      } catch {
        /* guardar nunca frena a la vaca */
      }
      if (nuevas.length) {
        const sil = silabasDeFichas(d);
        setCola((c) => [...c, ...nuevas.map((f) => sil.get(f)!)]);
        for (const f of nuevas) eventoRef.current?.("ficha_ganada", { cuarto: d.id, ficha: f });
      }
      if (!avisado.current && !completo(d, antes) && completo(d, nuevo)) {
        avisado.current = true;
        eventoRef.current?.("cuarto_completo", { cuarto: d.id });
      }
    },
    [progresoRef, setProgreso],
  );

  const tocarObjeto = useCallback(
    async (id: string) => {
      if (ocupadoRef.current || !activoRef.current) return;
      const d = defRef.current;
      const o = d.objetos.find((x) => x.id === id);
      if (!o) return;
      setBrillo(id);
      luego(() => setBrillo((b) => (b === id ? null : b)), BRILLO_MS);
      aplicar(tocar(progresoRef.current, id));
      const pendientes = o.acciones.some((a) => !progresoRef.current.logros.includes(`${a}@${id}`));
      setElegido(pendientes ? id : null);

      const sec = secuencia.current;
      let dicho = false;
      // durante la espera del pop el nombre ya cuenta como "por sonar": nada se toca encima
      const conPop = hablando.current === 0;
      if (conPop) hablando.current++;
      const decirNombre = async () => {
        if (conPop) hablando.current--;
        // durante el pop se cortó (pestaña oculta) o empezó una acción: el nombre ya no va
        if (sec !== secuencia.current || ocupadoRef.current) return;
        dicho = true;
        await hablar([...ZHE_SHI, ...o.nombre]);
      };
      // el pop solo si nada suena: nunca encima del mandarín
      await (conPop ? efectoYLuegoVoz("pop", decirNombre, { juego: "cocina" }) : decirNombre());
      if (o.abre && dicho && sec === secuencia.current && activoRef.current) abrirRef.current?.(o.abre);
    },
    [ocupadoRef, progresoRef, luego, aplicar, hablar],
  );

  const hacer = useCallback(
    async (accionId: string, objetoId: string) => {
      if (ocupadoRef.current || !activoRef.current) return;
      const d = defRef.current;
      const o = d.objetos.find((x) => x.id === objetoId);
      const a = d.acciones.find((x) => x.id === accionId);
      if (!o || !a || !o.acciones.includes(accionId)) return;
      setOcupado(true);
      setElegido(null);
      const sec = ++secuencia.current;
      try {
        setVaca(o.pie);
        await espera(reducido ? 0 : PASO_MS);
        if (sec !== secuencia.current) return;
        await hablar(a.frase);
        // el logro solo cuenta si la frase terminó sin corte
        if (sec !== secuencia.current) return;
        aplicar(lograr(progresoRef.current, a.id, o.id));
        eventoRef.current?.("accion_lograda", { cuarto: d.id, accion: a.id, objeto: o.id });
        // primero el audio, después la pose
        setPose(a.pose);
        await espera(POSE_MS);
      } finally {
        if (sec === secuencia.current) {
          setPose(null);
          setOcupado(false);
        }
      }
    },
    [ocupadoRef, progresoRef, setOcupado, setVaca, espera, reducido, hablar, aplicar],
  );

  // pestaña oculta o cambio de cuarto: se corta todo y la vaca queda libre y de pie
  useEffect(() => {
    const antes = activoRef.current;
    activoRef.current = opc.activo;
    if (opc.activo || !antes) return;
    secuencia.current++;
    turnoVoz.current++;
    callar();
    setGlobo(null);
    setHocico("sonrisa");
    setPose(null);
    setElegido(null);
    setOcupado(false);
  }, [opc.activo, setOcupado]);

  // al desmontar (cambio de cuarto): lo que venía (el nombre tras el pop, alAbrir, la frase) ya no corre y se calla
  useEffect(
    () => () => {
      secuencia.current++;
      turnoVoz.current++;
      callar();
    },
    [],
  );

  const sacarDeCola = useCallback(() => setCola((c) => c.slice(1)), []);
  const puedeSonar = useCallback(() => hablando.current === 0, []);

  return { vaca, pose, globo, hocico, ocupado, elegido, brillo, progreso, tocarObjeto, hacer, cola, sacarDeCola, puedeSonar };
}
