import type { Metadata } from "next";
import { Puzzle } from "@/components/puzzle/Puzzle";

const TITULO = "El puzzle · Chino con la vaca";
const DESCRIPCION =
  "El chino es como un puzzle: cada pieza tiene su lugar. Ordena frases, preguntas, pasado y futuro, y escucha a la vaca decirlas.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRIPCION,
  openGraph: { title: TITULO, description: DESCRIPCION, locale: "es_CL", type: "website", siteName: "Chino con la vaca" },
};

export default function PaginaPuzzle() {
  return (
    <main className="papel-mural">
      <Puzzle />
    </main>
  );
}
