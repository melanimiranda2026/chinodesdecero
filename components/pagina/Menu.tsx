import Link from "next/link";
import { Adorno } from "./Adorno";
import { MENU, PORTADA } from "./contenido";
import styles from "./menu.module.css";

/** Menú fijo arriba, en todas las páginas. Sin hamburguesa: cabe en una fila a 360 px. */
export function Menu() {
  return (
    <nav className={styles.menu} aria-label={MENU.etiqueta}>
      <Link href="/" className={styles.marca}>
        <Adorno dibujo="vaca" tam={32} />
        <span className={styles.marcaTexto}>{PORTADA.marca}</span>
      </Link>
      <ul className={styles.enlaces}>
        {MENU.enlaces.map((e) => (
          <li key={e.clave}>
            <Link
              href={e.href}
              className={styles.enlace}
            >
              <span className={styles.icono} aria-hidden="true">{e.icono}</span>
              <span className={styles.largo}>{e.texto}</span>
              <span className={styles.corto}>{e.corto}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
