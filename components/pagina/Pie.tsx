import Link from "next/link";
import { Correo } from "./Correo";
import { Adorno } from "./Adorno";
import { TIKTOK } from "./contenido";
import styles from "./pagina.module.css";

export function Pie() {
  return (
    <footer className={styles.pie} aria-labelledby="pie-titulo">
      <div className={styles.tarjeta}>
        <div className={styles.adornos} aria-hidden="true">
          <Adorno dibujo="chahu" tam={64} />
          <Adorno dibujo="bingxiang" tam={64} />
          <Adorno dibujo="guo" tam={64} />
        </div>
        <h2 id="pie-titulo" className={styles.titulo}>
          Guarda tu avance
        </h2>
        <p className={styles.texto}>
          Deja tu correo y sigue donde quedaste, en cualquier dispositivo. Si marcas la casilla, te avisamos cuando abran el
          dormitorio, el living y el baño.
        </p>
        <Correo origen="pie" />
      </div>
      <p className={styles.firma}>
        chino con la vaca · Método Jìn <span className={styles.hzChico}>浸</span> · <Link href="/sobre">Sobre nosotros</Link> ·{" "}
        <a href={TIKTOK.url} target="_blank" rel="noopener noreferrer">
          TikTok
        </a>
      </p>
    </footer>
  );
}
