"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Adorno } from "./Adorno";
import { MENU, PORTADA } from "./contenido";
import { elegirJuego } from "./juego";
import styles from "./menu.module.css";

/** Menú fijo arriba, en todas las páginas. Sin hamburguesa: cabe en una fila a 360 px. */
export function Menu() {
  const enInicio = usePathname() === "/";
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
              onClick={(ev) => {
                if (!enInicio || (e.clave !== "cocina" && e.clave !== "puzzle")) return;
                if (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey || ev.button !== 0) return;
                ev.preventDefault();
                elegirJuego(e.clave);
              }}
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
