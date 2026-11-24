import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaginaSerie } from "@/components/videos/Videoteca";
import { serieDe, seriesVisibles } from "@/lib/videos/catalogo";

type Props = { params: Promise<{ serie: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return seriesVisibles().map((s) => ({ serie: s.serie.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = serieDe((await params).serie);
  if (!s) return {};
  const titulo = `${s.serie.titulo} · Chino con la vaca`;
  return {
    title: titulo,
    description: s.serie.bajada,
    openGraph: { title: titulo, description: s.serie.bajada, locale: "es_CL", type: "website", siteName: "Chino con la vaca" },
  };
}

export default async function PaginaDeSerie({ params }: Props) {
  const { serie } = await params;
  if (!serieDe(serie)) notFound();
  return (
    <main className="papel-mural">
      <PaginaSerie slug={serie} />
    </main>
  );
}
