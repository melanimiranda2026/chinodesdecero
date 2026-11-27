"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Silaba } from "@/lib/silabas";
import { callar, decir } from "../audio/voz";
import { sfx } from "../audio/sonido";
import { efectoYLuegoVoz, esperaDe } from "../audio/turnos";
import { limitarVaca } from "../camara";
import { ZHE_SHI } from "../cocina/frases";
import { alPiso, proyectar, type Punto } from "../cocina/iso";
import type { AlEvento } from "../useCasa";
import { useTiempos } from "../useTiempos";
import { useVivo } from "../useVivo";
import type { Hocico } from "../Vaca";
import { completo, fichaId, fichasDe, lograr, tocar } from "./progreso";
import { fueraDePiezas } from "./profundidad";
import type { DefCuarto, Pose, Primerplano, ProgresoCuarto } from "./tipos";

/** La vaca camina hasta el pie del objeto. */
export const PASO_MS = 900;
/** Lo que dura la pose (sentada, mirando) después de la frase. */
export const POSE_MS = 1500;
/** Lo que dura el saltito al asiento y de vuelta al pie (pose sentada). */
export const SALTO_MS = 300;
/** Lo que brilla un objeto al tocarlo. */
const BRILLO_MS = 1000;
/** Lo que tarda la vaca en acomodarse al soltarla (a su lugar en el piso o al pie del objeto). */
export const SOLTAR_MS = 350;

/**
 * El objeto sobre el que se soltó la vaca: su cuerpo (unas 70 unidades sobre las patas) cae dentro de la zona del
 * objeto, con un margen de 30 para que no haya que apuntar fino. Si hay varios, el de centro más cercano.
 */
export function objetoBajoVaca(def: DefCuarto, p: Punto): string | null {
  const c = { x: p.x, y: p.y - 70 };
  let mejor: string | null = null;
  let dist = Infinity;
  for (const o of def.objetos) {
    const z = o.zona, m = 30;
    if (c.x < z.x - m || c.x > z.x + z.w + m || c.y < z.y - m || c.y > z.y + z.h + m) continue;
    const d = Math.hypot(c.x - (z.x + z.w / 2), c.y - (z.y + z.h / 2));
    if (d < dist) { dist = d; mejor = o.id; }
  }
  return mejor;
}

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
  /** Un objeto con `abre`: se llama después de decir su nombre y de que la vaca camine a su pie. */
  alAbrir?: (que: Primerplano) => void;
}

export interface CuartoApi {
  vaca: Punto;
  /** Lo que tarda la vaca en llegar a `vaca`: la caminata o el saltito al asiento. */
  pasoMs: number;
  pose: Pose | null;
  /** El objeto en cuyo asiento está sentada (pose sentada), o null. */
  sentadaEn: string | null;
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
  /**
   * Se soltó a la vaca después de arrastrarla (patas en x, y). Sobre un objeto: va a su pie y es como tocarlo.
   * En otra parte: se queda ahí, dentro del piso libre.
   */
  soltarVaca(x: number, y: number): Promise<void>;
  /** Objetos encendidos (la tele después de 看); duran mientras se está en el cuarto. */
  encendidos: string[];
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
  const [pasoMs, setPasoMs] = useState(PASO_MS);
  /** Sentada en un asiento: el pie al que vuelve al pararse (también si se corta todo). */
  const deVuelta = useRef<Punto | null>(null);
  const [sentadaEn, setSentadaEn] = useState<string | null>(null);
  const [globo, setGlobo] = useState<Silaba[] | null>(null);
  const [hocico, setHocico] = useState<Hocico>("sonrisa");
  const [elegido, setElegido] = useState<string | null>(null);
  const [brillo, setBrillo] = useState<string | null>(null);
  const [cola, setCola] = useState<Silaba[][]>([]);
  const [encendidos, setEncendidos] = useState<string[]>([]);
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
  /** Cada toque de objeto lo sube: el nombre y lo que sigue solo corren si su toque es el último. */
  const toque = useRef(0);
  /** Pops cuyo nombre aún no empieza: un toque nuevo espera en silencio en vez de hablar encima del pop. */
  const popsPendientes = useRef(0);
  /** cuarto_completo se emite una sola vez, al completarse aquí. */
  const avisado = useRef(false);

  /** La vaca habla: globo + boca. Nunca lanza. `true` si su turno sigue vigente al terminar (nadie la cortó con otra frase). */
  const hablar = useCallback(
    async (s: Silaba[]): Promise<boolean> => {
      const turno = ++turnoVoz.current;
      hablando.current++;
      setGlobo(s);
      try {
        await decir(s, { alBoca: (a) => setHocico(bocaDe(a)), juego: "cocina" });
      } catch {
        /* sin voz: el cuarto sigue igual */
      }
      hablando.current--;
      if (turno !== turnoVoz.current) return false;
      setHocico("sonrisa");
      luego(() => {
        if (turno === turnoVoz.current) setGlobo(null);
      }, 1500);
      return true;
    },
    [luego],
  );

  /** Cartas de fichas ganadas por una acción: esperan a que termine la pose para no taparla. */
  const cartasEnEspera = useRef<Silaba[][]>([]);

  /**
   * Guarda el progreso nuevo, avisa afuera con las fichas recién ganadas y las pone en la cola.
   * `trasLaPose`: la carta que gira espera a que la vaca se pare (el logro y la ficha cuentan ya).
   */
  const aplicar = useCallback(
    (nuevo: ProgresoCuarto, trasLaPose = false) => {
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
        const cartas = nuevas.map((f) => sil.get(f)!);
        if (trasLaPose) cartasEnEspera.current.push(...cartas);
        else setCola((c) => [...c, ...cartas]);
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
      // un doble toque (o tocar otro objeto) deja viejo a este: su nombre y lo que seguía ya no corren
      const mio = ++toque.current;
      let dicho = false;
      // el pop solo si nada suena: nunca encima del mandarín. Si otro pop aún suena, se espera en silencio.
      const conPop = hablando.current === 0;
      const tras = !conPop && popsPendientes.current > 0;
      // durante la espera del pop el nombre ya cuenta como "por sonar": nada se toca encima
      if (conPop || tras) {
        hablando.current++;
        popsPendientes.current++;
      }
      const decirNombre = async (): Promise<boolean> => {
        if (conPop || tras) {
          hablando.current--;
          popsPendientes.current--;
        }
        // durante el pop se cortó (pestaña oculta), empezó una acción o llegó otro toque: el nombre ya no va
        if (mio !== toque.current || sec !== secuencia.current || ocupadoRef.current) return false;
        dicho = true;
        return hablar([...ZHE_SHI, ...o.nombre]);
      };
      const entero = await (conPop
        ? efectoYLuegoVoz("pop", decirNombre, { juego: "cocina" })
        : tras
          ? espera(esperaDe("pop")).then(decirNombre)
          : decirNombre());
      // solo si el nombre sonó entero y este toque sigue siendo el último
      if (!o.abre || !dicho || !entero || mio !== toque.current) return;
      if (sec !== secuencia.current || !activoRef.current || ocupadoRef.current) return;
      // después del nombre la vaca camina hasta el objeto y recién ahí se abre (movimiento reducido: llega de una vez)
      setOcupado(true);
      const camino = ++secuencia.current;
      try {
        setPasoMs(PASO_MS);
        setVaca(o.pie);
        await espera(reducido ? 0 : PASO_MS);
        if (camino === secuencia.current && activoRef.current) abrirRef.current?.(o.abre);
      } finally {
        if (camino === secuencia.current) setOcupado(false);
      }
    },
    [ocupadoRef, progresoRef, setOcupado, setVaca, espera, reducido, luego, aplicar, hablar],
  );

  /** Sin pose y, si estaba en un asiento, de vuelta en su pie. */
  const pararse = useCallback(() => {
    setPose(null);
    setSentadaEn(null);
    if (deVuelta.current) {
      setPasoMs(SALTO_MS);
      setVaca(deVuelta.current);
      deVuelta.current = null;
    }
    // ya de pie: ahora sí giran las cartas ganadas por la acción (una vez: la espera se vacía)
    const cartas = cartasEnEspera.current;
    cartasEnEspera.current = [];
    if (cartas.length) setCola((c) => [...c, ...cartas]);
  }, [setVaca]);

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
        setPasoMs(PASO_MS);
        setVaca(o.pie);
        await espera(reducido ? 0 : PASO_MS);
        if (sec !== secuencia.current) return;
        await hablar(a.frase);
        // el logro solo cuenta si la frase terminó sin corte
        if (sec !== secuencia.current) return;
        aplicar(lograr(progresoRef.current, a.id, o.id), true);
        eventoRef.current?.("accion_lograda", { cuarto: d.id, accion: a.id, objeto: o.id });
        // primero el audio, después la pose: sentada, se sube al asiento de un saltito (reducido: aparece ahí)
        if (a.pose === "sentada" && o.asiento) {
          deVuelta.current = o.pie;
          setPasoMs(SALTO_MS);
          setVaca(o.asiento);
          setSentadaEn(o.id);
        }
        // la voz ya terminó: el efecto de encender (la tele) no queda encima del mandarín
        if (o.enciende === a.id) {
          setEncendidos((e) => (e.includes(o.id) ? e : [...e, o.id]));
          sfx("tele", "cocina");
        }
        setPose(a.pose);
        await espera(POSE_MS);
      } finally {
        if (sec === secuencia.current) {
          pararse();
          setOcupado(false);
        }
      }
    },
    [ocupadoRef, progresoRef, setOcupado, setVaca, espera, reducido, hablar, aplicar, pararse],
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
    pararse();
    setElegido(null);
    setOcupado(false);
  }, [opc.activo, setOcupado, pararse]);

  // al desmontar (cambio de cuarto): lo que venía (el nombre tras el pop, alAbrir, la frase) ya no corre y se calla
  useEffect(
    () => () => {
      secuencia.current++;
      turnoVoz.current++;
      callar();
    },
    [],
  );

  const soltarVaca = useCallback(
    async (x: number, y: number) => {
      if (ocupadoRef.current || !activoRef.current) return;
      const d = defRef.current;
      const id = objetoBajoVaca(d, { x, y });
      setPasoMs(SOLTAR_MS);
      if (!id) {
        // en el piso libre y nunca dentro de un mueble (la mesa, las sillas)
        const p = limitarVaca(x, y);
        const c = fueraDePiezas(d.piezas ?? [], alPiso(p.x, p.y));
        const q = proyectar(c.u, c.v);
        return setVaca({ x: Math.round(q.x * 10) / 10, y: Math.round(q.y * 10) / 10 });
      }
      setVaca(d.objetos.find((o) => o.id === id)!.pie);
      await tocarObjeto(id);
    },
    [ocupadoRef, setVaca, tocarObjeto],
  );

  const sacarDeCola = useCallback(() => setCola((c) => c.slice(1)), []);
  const puedeSonar = useCallback(() => hablando.current === 0, []);

  return { vaca, pasoMs, pose, sentadaEn, globo, hocico, ocupado, elegido, brillo, progreso, tocarObjeto, soltarVaca, encendidos, hacer, cola, sacarDeCola, puedeSonar };
}
