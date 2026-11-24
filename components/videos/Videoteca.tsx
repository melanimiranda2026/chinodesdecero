import Link from "next/link";
import { fechaCorta, seriesVisibles } from "@/lib/videos/catalogo";
import { Reproductor } from "./Reproductor";
import styles from "./videos.module.css";

export const VIDEOS = {
  titulo: "Los videos, en orden",
  bajada: "En TikTok salen mezclados. Aquí los tienes por tema y en el orden para aprender.",
  volver: "Todas las series",
} as const;

const COLORES = ["var(--t1)", "var(--t4)", "var(--t3)", "var(--t2)"];

function cuantos(listos: number, prontos: number) {
  const a = listos === 1 ? "1 video" : `${listos} videos`;
  if (!prontos) return a;
  return listos ? `${a} · ${prontos} más pronto` : `${prontos} pronto`;
}

/** /videos: una tarjeta por serie. */
export function Videoteca() {
  const series = seriesVisibles();
  return (
    <div className={styles.pagina}>
      <header className={styles.encabezado}>
        <h1 className={styles.titulo}>{VIDEOS.titulo}</h1>
        <p className={styles.bajada}>{VIDEOS.bajada}</p>
      </header>
      <ul className={styles.series}>
        {series.map(({ serie, listos, prontos }, n) => (
          <li key={serie.slug}>
            <Link href={`/videos/${serie.slug}`} className={styles.serie} style={{ "--color": COLORES[n % COLORES.length] } as React.CSSProperties}>
              <span className={styles.sello} aria-hidden="true" style={{ fontSize: [...serie.sello].length > 1 ? 28 : undefined }}>
                {serie.sello}
              </span>
              <span className={styles.serieTexto}>
                <span className={styles.serieTitulo}>{serie.titulo}</span>
                <span className={styles.serieBajada}>{serie.bajada}</span>
                <span className={styles.cuenta}>{cuantos(listos, prontos)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** /videos/[serie]: el reproductor con la lista. */
export function PaginaSerie({ slug }: { slug: string }) {
  const s = seriesVisibles().find((x) => x.serie.slug === slug)!;
  const proximo = s.partes
    .flatMap((p) => p.videos)
    .filter((v) => v.estado === "programado")
    .sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
  return (
    <div className={styles.pagina}>
      <Link href="/videos" className={styles.volver}>
        ← {VIDEOS.volver}
      </Link>
      <header className={styles.encabezado}>
        <h1 className={styles.titulo}>{s.serie.titulo}</h1>
        <p className={styles.bajada}>{s.serie.bajada}</p>
        {proximo?.estado === "programado" && <p className={styles.cuenta}>Próximo video: {fechaCorta(proximo.fecha)}</p>}
      </header>
      <Reproductor partes={s.partes} />
    </div>
  );
}
