"use client";
import { registrar } from "@/components/casa/eventos";
import { Correo } from "./Correo";
import { MATERIAL } from "./contenido";
import { Adorno } from "./Adorno";
import styles from "./pagina.module.css";

export function Material() {
  return (
    <section id="material" className={styles.seccion} aria-labelledby="material-titulo">
      <div className={styles.encabezado}>
        <Adorno dibujo="wan" tam={72} />
        <h2 id="material-titulo" className={styles.titulo}>
          Material gratis
        </h2>
        <p className={styles.bajada}>Para que sigas practicando fuera de la pantalla, a tu ritmo.</p>
      </div>
      <div className={styles.rejilla}>
        {MATERIAL.map((m, i) => {
          const id = `material-${i}`;
          return (
            <article key={m.titulo} className={styles.tarjeta} aria-labelledby={id}>
              {m.estado === "pronto" && <span className={styles.etiquetaPronto}>Pronto</span>}
              <h3 id={id} className={styles.subtitulo}>
                {m.titulo}
              </h3>
              <p className={styles.texto}>{m.descripcion}</p>
              {m.estado === "pronto" ? (
                <>
                  <p className={styles.texto}>Déjanos tu correo y te avisamos apenas esté listo.</p>
                  <Correo origen="material" />
                </>
              ) : (
                <a
                  className={styles.boton}
                  href={m.estado.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => registrar("descargar_material", { titulo: m.titulo })}
                >
                  Descargar
                </a>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
