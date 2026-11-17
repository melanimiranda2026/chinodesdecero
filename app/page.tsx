import { Portada } from "@/components/pagina/Portada";
import { Pie } from "@/components/pagina/Pie";
import styles from "@/components/pagina/pagina.module.css";

export default function Home() {
  return (
    <main className="papel-mural">
      {/* Landing corta: el juego y el pie (guardar avance). El método vive en /sobre. */}
      <Portada />
      <div className={styles.pagina}>
        <Pie />
      </div>
    </main>
  );
}
