import type { Metadata } from "next";
import { ZCOOL_KuaiLe, Nunito, Silkscreen } from "next/font/google";
import "./globals.css";
import { Filtros } from "@/components/casa/arte/placeholders/Filtros";
import { Analytics } from "@vercel/analytics/react";

const hanzi = ZCOOL_KuaiLe({ weight: "400", subsets: ["latin"], variable: "--f-hanzi", display: "swap" });
const texto = Nunito({ weight: ["700", "900"], subsets: ["latin"], variable: "--f-texto", display: "swap" });
const pixel = Silkscreen({ weight: ["400", "700"], subsets: ["latin"], variable: "--f-pixel", display: "swap" });

const TITULO = "Chino desde cero";
const DESCRIPCION =
  "Tus primeras palabras en chino, jugando en una cocina: escuchas a la vaca, tocas, arrastras y las reconoces de oído.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRIPCION,
  openGraph: {
    title: TITULO,
    description: DESCRIPCION,
    locale: "es_CL",
    type: "website",
    siteName: TITULO,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${hanzi.variable} ${texto.variable} ${pixel.variable}`}>
      <body>
        <Filtros />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
