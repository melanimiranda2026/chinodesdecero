import { METODO } from "./contenido";
import { Adorno } from "./Adorno";
import styles from "./pagina.module.css";

export function Metodo() {
  return (
    <section id="metodo" className={styles.seccion} aria-labelledby="metodo-titulo">
      <div className={styles.tarjeta}>
        <div className={styles.sello} aria-hidden="true">
          <span className={styles.hz}>浸</span>
          <svg width="90" height="26" viewBox="0 0 120 34">
            <path d="M8 6 L112 28" stroke="#3A6FD6" strokeWidth="6" strokeLinecap="round" fill="none" />
          </svg>
        </div>
        <h2 id="metodo-titulo" className={styles.titulo}>
          {METODO.titulo}
        </h2>
        <ol className={styles.ideas}>
          {METODO.ideas.map((i, n) => (
            <li key={i.titulo} className={styles.idea}>
              <Adorno dibujo={i.dibujo} tam={64} className={styles.adornoIdea} />
              <div>
                <h3 className={styles.ideaTitulo}>
                  <span className={styles.numero} aria-hidden="true">
                    {n + 1}
                  </span>{" "}
                  {i.titulo}
                </h3>
                <p className={styles.texto}>{i.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        {METODO.fuente && <small className={styles.fuente}>{METODO.fuente}</small>}
      </div>
    </section>
  );
}
