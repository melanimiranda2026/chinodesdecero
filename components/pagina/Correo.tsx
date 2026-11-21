"use client";
import { useRef, useState, type FormEvent } from "react";
import { cargarAvance, guardarCorreo, MAX_AVANCE_PENDIENTE } from "@/components/casa/avance";
import { registrar } from "@/components/casa/eventos";
import { correoValido } from "@/lib/correo";
import { bytes } from "@/lib/limite";
import styles from "./Correo.module.css";

type Estado = "libre" | "enviando";
/** Lo que quedó tras un envío bueno: con aviso (marcó la casilla) o solo el correo para el avance. */
type Resultado = null | "aviso" | "correo";

/** Contacto para pedir que borremos un correo. */
export const CONTACTO_PRIVACIDAD = "niu@chinoconlavaca.com";

/** El avance de este navegador, sin el correo, para traerlo al abrir el enlace en otro dispositivo. */
function avanceParaEnviar() {
  const { correo: _c, ...datos } = cargarAvance();
  void _c;
  return bytes(datos) <= MAX_AVANCE_PENDIENTE ? datos : undefined;
}

/** Formulario de correo con consentimiento aparte (la casilla empieza sin marcar). */
export function Correo({ origen, boton = "Avísame", listo: textoListo }: { origen: string; boton?: string; listo?: string }) {
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
    const email = correo.trim();
    /**
     * El servidor no respondió bien (503, 429, 500, sin red) pero el correo tiene buena forma: queda guardado en este
     * navegador y la casa se entera, así la puerta del living se abre igual (se gana siempre). El aviso dice la verdad:
     * no se mandó ningún enlace. El correo queda en el avance; el próximo envío desde el pie lo vuelve a intentar.
     */
    const guardarAqui = () => {
      if (!correoValido(email)) return false;
      guardarCorreo(email, conAviso);
      return true;
    };
    const QUEDO = " Tu correo quedó guardado en este navegador, así que puedes seguir jugando.";
    try {
      const r = await fetch("/api/suscribir", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, consentimiento: conAviso, origen, sitio, avance: avanceParaEnviar() }),
      });
      // 502: el servidor guardó el correo (y el consentimiento) pero el enlace no salió: aquí también queda guardado,
      // así la puerta del living se abre igual; el aviso pide reintentar solo por el enlace.
      if (r.ok || r.status === 502) {
        guardarCorreo(email, conAviso);
        registrar("dejar_correo", { origen, consentimiento: conAviso });
      }
      if (r.ok) {
        setResultado(conAviso ? "aviso" : "correo");
      } else if (r.status === 400) {
        // correo inválido: aquí sí hay que corregirlo, no pasa
        setError("Ese correo no parece correcto. Revísalo e inténtalo otra vez.");
      } else if (r.status === 502) {
        setError("Guardamos tu correo, pero no pudimos enviarte el enlace. Inténtalo otra vez en un rato.");
      } else {
        const aqui = guardarAqui() ? QUEDO : "";
        setError(
          r.status === 429
            ? `Recibimos muchos intentos seguidos.${aqui} Espera un rato e inténtalo otra vez para recibir el enlace.`
            : `No pudimos guardar tu correo en el servidor ahora.${aqui} Inténtalo otra vez en un rato para recibir el enlace.`,
        );
      }
    } catch {
      const aqui = guardarAqui() ? QUEDO : "";
      setError(`No pudimos conectarnos.${aqui} Revisa tu internet e inténtalo otra vez para recibir el enlace.`);
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
        {textoListo
          ? textoListo
          : resultado === "aviso"
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
          Quiero recibir novedades de Chino con la vaca (cuartos nuevos, material y ofertas). Puedo darme de baja cuando
          quiera.
        </span>
      </label>
      <button type="submit" className={styles.boton} disabled={estado === "enviando"}>
        {boton}
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
