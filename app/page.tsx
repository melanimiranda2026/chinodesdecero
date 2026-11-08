import { Portada } from "@/components/pagina/Portada";
import { Metodo } from "@/components/pagina/Metodo";
import { Material } from "@/components/pagina/Material";
import { Siguenos } from "@/components/pagina/Siguenos";
import { Pie } from "@/components/pagina/Pie";
import styles from "@/components/pagina/pagina.module.css";

export default function Home() {
  return (
    <main className="papel-mural">
      {/* Landing: el hero con la casa jugable dentro de una ventana; abajo, las secciones de siempre. */}
      <Portada />
      <div className={styles.pagina}>
        <Metodo />
        <Material />
        <Siguenos />
        <Pie />
      </div>
    </main>
  );
}
