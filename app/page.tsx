import { Casa } from "@/components/casa/Casa";
import { Metodo } from "@/components/pagina/Metodo";
import { Material } from "@/components/pagina/Material";
import { Siguenos } from "@/components/pagina/Siguenos";
import { Pie } from "@/components/pagina/Pie";
import styles from "@/components/pagina/pagina.module.css";

export default function Home() {
  return (
    <main>
      <h1 className={styles.oculto}>Chino desde cero — Método Jìn</h1>
      {/* La casa ocupa exactamente una pantalla (100svh); abajo, una página normal que se recorre. */}
      <div className={styles.casaSeccion}>
        <Casa />
        <a href="#metodo" className={styles.baja}>
          baja <span aria-hidden="true">↓</span>
        </a>
      </div>
      <div className={`papel-mural ${styles.pagina}`}>
        <Metodo />
        <Material />
        <Siguenos />
        <Pie />
      </div>
    </main>
  );
}
