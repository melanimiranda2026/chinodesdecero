"use client";

import { useState } from "react";
import { fechaCorta, urlReproductor, urlTikTok, type ParteLista, type VideoListo } from "@/lib/videos/catalogo";
import styles from "./videos.module.css";

/**
 * Un video a la vez con el reproductor oficial de TikTok (la vista cuenta en TikTok)
 * y la lista de la serie al lado. Los programados se ven, pero todavía no se pueden tocar.
 */
export function Reproductor({ partes }: { partes: ParteLista[] }) {
  const listos = partes.flatMap((p) => p.videos).filter((v): v is VideoListo => v.estado === "publicado");
  const [actual, setActual] = useState<VideoListo | null>(listos[0] ?? null);
  const [tocado, setTocado] = useState(false);
  const i = actual ? listos.findIndex((v) => v.pieza === actual.pieza) : -1;
  const siguiente = i >= 0 ? listos[i + 1] : undefined;

  const elegir = (v: VideoListo) => {
    setActual(v);
    setTocado(true);
  };

  return (
    <div className={styles.reproductor}>
      <div className={styles.pantalla}>
        {actual ? (
          <>
            <iframe
              key={actual.tiktok}
              className={styles.marco}
              src={urlReproductor(actual.tiktok) + (tocado ? "&autoplay=1" : "")}
              title={`${actual.hanzi} · ${actual.titulo}`}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
            />
            <div className={styles.acciones}>
              {siguiente && (
                <button type="button" className={styles.botonChico} onClick={() => elegir(siguiente)}>
                  Siguiente: {siguiente.hanzi}
                </button>
              )}
              <a className={styles.enlaceTikTok} href={urlTikTok(actual.tiktok)} target="_blank" rel="noopener noreferrer">
                Ver en TikTok
              </a>
            </div>
          </>
        ) : (
          <div className={styles.esperando}>
            <span className={styles.hzGrande} aria-hidden="true">
              {partes[0]?.videos[0]?.hanzi}
            </span>
            <p>El primer video de esta serie sale muy pronto.</p>
          </div>
        )}
      </div>

      <div className={styles.lista}>
        {partes.map((p, n) => (
          <section key={p.titulo ?? n} aria-label={p.titulo ?? "Videos"}>
            {p.titulo && <h2 className={styles.parteTitulo}>{p.titulo}</h2>}
            <ol className={styles.videos}>
              {p.videos.map((v) => {
                const esActual = actual?.pieza === v.pieza;
                return (
                  <li key={v.pieza}>
                    {v.estado === "publicado" ? (
                      <button
                        type="button"
                        className={styles.video}
                        aria-current={esActual ? "true" : undefined}
                        onClick={() => elegir(v)}
                      >
                        <span className={styles.hz}>{v.hanzi}</span>
                        <span className={styles.videoTitulo}>{v.titulo}</span>
                      </button>
                    ) : (
                      <div className={`${styles.video} ${styles.pronto}`}>
                        <span className={styles.hz}>{v.hanzi}</span>
                        <span className={styles.videoTitulo}>{v.titulo}</span>
                        <span className={styles.fecha} aria-label={`Sale el ${fechaCorta(v.fecha)}`}>
                          {fechaCorta(v.fecha)}
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
