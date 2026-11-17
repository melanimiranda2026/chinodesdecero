import type { Metadata } from "next";
import { Sobre } from "@/components/pagina/Sobre";

const TITULO = "Sobre nosotros · Chino con la vaca";
const DESCRIPCION = "Un canal de TikTok que enseña chino mandarín a hispanohablantes, con una vaca dibujada a crayón como profe.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRIPCION,
  openGraph: { title: TITULO, description: DESCRIPCION, locale: "es_CL", type: "website", siteName: "Chino con la vaca" },
};

export default function PaginaSobre() {
  return (
    <main className="papel-mural">
      <Sobre />
    </main>
  );
}
