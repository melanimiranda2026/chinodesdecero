"use client";
import { useRef, useState, type FormEvent } from "react";
import { guardarCorreo } from "@/components/casa/avance";
import { registrar } from "@/components/casa/eventos";
import styles from "./Correo.module.css";

type Estado = "libre" | "enviando" | "listo";

/** Formulario de correo con consentimiento aparte (la casilla empieza sin marcar). */
export function Correo({ origen }: { origen: string }) {
  const [correo, setCorreo] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [estado, setEstado] = useState<Estado>("libre");
  const [error, setError] = useState("");
  const enVuelo = useRef(false); // el doble clic no alcanza a ver el estado de React

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (enVuelo.current) return;
    enVuelo.current = true;
    setEstado("enviando");
    setError("");
    try {
      const r = await fetch("/api/suscribir", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: correo.trim(), consentimiento: acepta, origen }),
      });
      if (r.ok) {
        guardarCorreo(correo.trim());
        registrar("dejar_correo", { origen, consentimiento: acepta });
        setEstado("listo");
        return;
      }
      setError(
        r.status === 400
          ? "Ese correo no parece correcto. Revísalo e inténtalo otra vez."
          : "No pudimos guardar tu correo ahora. Inténtalo otra vez en un rato.",
      );
    } catch {
      setError("No pudimos conectarnos. Revisa tu internet e inténtalo otra vez.");
    }
    enVuelo.current = false;
    setEstado("libre");
  };

  if (estado === "listo") {
    return (
      <p role="status" className={styles.listo}>
        ¡Listo! Te llegará un enlace para guardar tu avance en cualquier dispositivo.
      </p>
    );
  }

  return (
    <form className={styles.form} onSubmit={enviar} noValidate>
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
    </form>
  );
}
