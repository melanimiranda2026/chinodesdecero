"use client";
import { registrar } from "@/components/casa/eventos";
import { TIKTOK } from "./contenido";
import { Adorno } from "./Adorno";
import styles from "./pagina.module.css";

/** Miniaturas que abren TikTok (no videos incrustados: pesan en el celular). Sin videos, solo el botón al perfil. */
export function Siguenos() {
  const abrir = (donde: string) => registrar("clic_tiktok", { donde });
  return (
    <section id="tiktok" className={styles.seccion} aria-labelledby="tiktok-titulo">
      <div className={styles.tarjeta}>
        <Adorno dibujo="vaca" tam={120} className={styles.centrado} />
        <h2 id="tiktok-titulo" className={styles.titulo}>
          Las mismas palabras, en video
        </h2>
        <p className={styles.texto}>
          En TikTok la vaca te muestra estas palabras en otras escenas y otros juegos. Cada video es un repaso más, sin que
          tengas que organizar nada.
        </p>
        {TIKTOK.videos.length > 0 && (
          <ul className={styles.videos}>
            {TIKTOK.videos.map((v) => (
              <li key={v.url}>
                <a href={v.url} target="_blank" rel="noopener noreferrer" onClick={() => abrir("video")} className={styles.video}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={v.miniatura} alt="" loading="lazy" />
                  <span>{v.titulo}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
        <p className={styles.texto}>
          Búscala como <b>{TIKTOK.nombre}</b>.
        </p>
        <a
          className={styles.boton}
          href={TIKTOK.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Ver ${TIKTOK.nombre} en TikTok`}
          onClick={() => abrir("perfil")}
        >
          Ver en TikTok
        </a>
      </div>
    </section>
  );
}
