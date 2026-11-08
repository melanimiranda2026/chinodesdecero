import type { Metadata } from "next";
import { ZCOOL_KuaiLe, Nunito, Silkscreen } from "next/font/google";
import "./globals.css";
import { Filtros } from "@/components/casa/arte/placeholders/Filtros";
import { Analytics } from "@vercel/analytics/react";

const hanzi = ZCOOL_KuaiLe({ weight: "400", subsets: ["latin"], variable: "--f-hanzi", display: "swap" });
const texto = Nunito({ weight: ["700", "900"], subsets: ["latin"], variable: "--f-texto", display: "swap" });
const pixel = Silkscreen({ weight: ["400", "700"], subsets: ["latin"], variable: "--f-pixel", display: "swap" });

export const metadata: Metadata = {
  title: "Chino desde cero",
  description: "Aprende tus primeras palabras en chino jugando en una cocina.",
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
