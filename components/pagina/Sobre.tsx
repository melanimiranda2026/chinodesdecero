import Link from "next/link";
import { Adorno } from "./Adorno";
import { CONTACTO_PRIVACIDAD } from "./Correo";
import { SOBRE, TIKTOK } from "./contenido";
import styles from "./pagina.module.css";

/** Página /sobre: quiénes somos, el método y la promesa. */
export function Sobre() {
  return (
    <div className={styles.pagina}>
      <section className={styles.seccion} aria-labelledby="sobre-titulo">
        <div className={styles.tarjeta}>
          <Adorno dibujo="vaca" tam={120} className={styles.centrado} />
          <h1 id="sobre-titulo" className={styles.titulo}>
            {SOBRE.titulo}
          </h1>
          <p className={styles.texto}>{SOBRE.p1}</p>
          <p className={styles.texto}>
            {SOBRE.p2antes}
            <b>{SOBRE.p2metodo}</b>
            {SOBRE.p2despues}
          </p>
          <p className={styles.texto}>{SOBRE.p3}</p>
          <p className={styles.texto}>
            {SOBRE.contactoAntes}
            <a href={`mailto:${CONTACTO_PRIVACIDAD}`}>{CONTACTO_PRIVACIDAD}</a>.
          </p>
          <Link href="/#juegos" className={styles.boton}>
            {SOBRE.jugar}
          </Link>
          <a className={styles.boton} href={TIKTOK.url} target="_blank" rel="noopener noreferrer">
            {SOBRE.tiktok}
          </a>
        </div>
      </section>
    </div>
  );
}
