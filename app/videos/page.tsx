import type { Metadata } from "next";
import { Videoteca } from "@/components/videos/Videoteca";

const TITULO = "Los videos · Chino con la vaca";
const DESCRIPCION = "Los videos de TikTok de la vaca, ordenados por tema: radicales, el pasado, el puzzle y más.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRIPCION,
  openGraph: { title: TITULO, description: DESCRIPCION, locale: "es_CL", type: "website", siteName: "Chino con la vaca" },
};

export default function PaginaVideos() {
  return (
    <main className="papel-mural">
      <Videoteca />
    </main>
  );
}
