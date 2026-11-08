import { Correo } from "./Correo";
import { Adorno } from "./Adorno";
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
        chino desde cero · Método Jìn <span className={styles.hzChico}>浸</span>
      </p>
    </footer>
  );
}
