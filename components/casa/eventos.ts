import { NOMBRES_EVENTO, type NombreEvento } from "@/lib/eventos-nombres";

interface Evento {
  nombre: NombreEvento;
  datos?: Record<string, unknown>;
}

const MAX_LOTE = 50;
const CADA_MS = 5000;
const validos = new Set<string>(NOMBRES_EVENTO);

let cola: Evento[] = [];
let temporizador: ReturnType<typeof setInterval> | null = null;
let escuchando = false;

function sesion(): string {
  try {
    let s = sessionStorage.getItem("cdc.sesion");
    if (!s) {
      s = globalThis.crypto?.randomUUID?.() ?? `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem("cdc.sesion", s);
    }
    return s;
  } catch {
    return "sin-sesion";
  }
}

/** Envía lo que haya en la cola. Con `salida` (pagehide) usa sendBeacon. Nunca lanza. */
export function enviarEventos(salida = false): void {
  while (cola.length) {
    const lote = cola.splice(0, MAX_LOTE);
    const cuerpo = JSON.stringify({ sesion: sesion(), eventos: lote });
    try {
      if (salida && typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        navigator.sendBeacon("/api/eventos", new Blob([cuerpo], { type: "application/json" }));
      } else {
        void fetch("/api/eventos", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: cuerpo,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      /* los eventos son accesorios: se pierden sin ruido */
    }
  }
}

/** Junta el evento en la cola; sale cada 5 s o al cerrar la página. Nunca incluir el correo en `datos`. */
export function registrar(nombre: NombreEvento, datos?: object): void {
  try {
    if (!validos.has(nombre)) return;
    cola.push(datos ? { nombre, datos: datos as Record<string, unknown> } : { nombre });
    if (typeof window === "undefined") return;
    if (!escuchando) {
      escuchando = true;
      window.addEventListener("pagehide", () => enviarEventos(true));
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") enviarEventos(true);
      });
    }
    temporizador ??= setInterval(() => enviarEventos(), CADA_MS);
    if (cola.length >= MAX_LOTE) enviarEventos();
  } catch {
    /* nada */
  }
}

/** Solo para pruebas. */
export function reiniciarEventos(): void {
  cola = [];
  if (temporizador) clearInterval(temporizador);
  temporizador = null;
}
