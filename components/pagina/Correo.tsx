"use client";
import { useRef, useState, type FormEvent } from "react";
import { cargarAvance, guardarCorreo, MAX_AVANCE_PENDIENTE } from "@/components/casa/avance";
import { registrar } from "@/components/casa/eventos";
import { bytes } from "@/lib/limite";
import styles from "./Correo.module.css";

type Estado = "libre" | "enviando";
/** Lo que quedó tras un envío bueno: con aviso (marcó la casilla) o solo el correo para el avance. */
type Resultado = null | "aviso" | "correo";

/** Contacto para pedir que borremos un correo. CONFIRMAR con la dueña antes de publicar. */
export const CONTACTO_PRIVACIDAD = "CONFIRMAR@correo";

/** El avance de este navegador, sin el correo, para traerlo al abrir el enlace en otro dispositivo. */
function avanceParaEnviar() {
  const { correo: _c, ...datos } = cargarAvance();
  void _c;
  return bytes(datos) <= MAX_AVANCE_PENDIENTE ? datos : undefined;
}

/** Formulario de correo con consentimiento aparte (la casilla empieza sin marcar). */
export function Correo({ origen }: { origen: string }) {
  const [correo, setCorreo] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [sitio, setSitio] = useState(""); // trampa para bots: nadie la ve ni la llena
  const [estado, setEstado] = useState<Estado>("libre");
  const [resultado, setResultado] = useState<Resultado>(null);
  const [error, setError] = useState("");
  const enVuelo = useRef(false); // el doble clic no alcanza a ver el estado de React

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (enVuelo.current) return;
    enVuelo.current = true;
    setEstado("enviando");
    setError("");
    const conAviso = acepta;
    try {
      const r = await fetch("/api/suscribir", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: correo.trim(), consentimiento: conAviso, origen, sitio, avance: avanceParaEnviar() }),
      });
      if (r.ok) {
        guardarCorreo(correo.trim(), conAviso);
        registrar("dejar_correo", { origen, consentimiento: conAviso });
        setResultado(conAviso ? "aviso" : "correo");
      } else {
        setError(
          r.status === 400
            ? "Ese correo no parece correcto. Revísalo e inténtalo otra vez."
            : r.status === 429
              ? "Recibimos muchos intentos seguidos. Espera un rato e inténtalo otra vez."
              : "No pudimos guardar tu correo ahora. Inténtalo otra vez en un rato.",
        );
      }
    } catch {
      setError("No pudimos conectarnos. Revisa tu internet e inténtalo otra vez.");
    }
    enVuelo.current = false;
    setEstado("libre");
  };

  const nota = (
    <p className={styles.nota}>
      Usamos tu correo solo para tu avance y, si lo marcas, para avisarte de novedades. Puedes pedir que lo borremos
      escribiendo a {CONTACTO_PRIVACIDAD}.
    </p>
  );
  const listo = resultado && (
    <div role="status" className={styles.listo}>
      <p>
        {resultado === "aviso"
          ? "¡Listo! Ya estás anotada/o. Te avisamos cuando abra."
          : "¡Listo! Guardamos tu correo para tu avance. Si quieres que te avisemos cuando abra, marca la casilla."}
      </p>
      <p>Te llegará un enlace para guardar tu avance en cualquier dispositivo.</p>
    </div>
  );

  if (resultado === "aviso") {
    return (
      <div className={styles.form}>
        {listo}
        {nota}
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={enviar} noValidate>
      {listo}
      <label className={styles.campo}>
        <span className={styles.etiqueta}>Tu correo</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          required
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          placeholder="tucorreo@ejemplo.com"
        />
      </label>
      <label className={styles.trampa} aria-hidden="true">
        Sitio web
        <input type="text" name="sitio" tabIndex={-1} autoComplete="off" value={sitio} onChange={(e) => setSitio(e.target.value)} />
      </label>
      <label className={styles.casilla}>
        <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} />
        <span>
          Quiero recibir novedades de Chino desde cero (cuartos nuevos, material y ofertas). Puedo darme de baja cuando
          quiera.
        </span>
      </label>
      <button type="submit" className={styles.boton} disabled={estado === "enviando"}>
        Avísame
      </button>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {nota}
    </form>
  );
}
