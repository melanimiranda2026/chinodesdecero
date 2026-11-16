import type { Metadata } from "next";
import { Nunito, Silkscreen } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Menu } from "@/components/pagina/Menu";
import { Filtros } from "@/components/casa/arte/placeholders/Filtros";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

// Xiaolai SC (小赖, OFL): solo los hanzi que usa la web. Regenerar con `npm run fuente`.
// Tiene un solo peso; se declara para 400-900 y así el navegador nunca la engorda a la fuerza.
const hanzi = localFont({
  src: "./fuentes/xiaolai-hanzi.woff2",
  weight: "400 900",
  variable: "--f-hanzi",
  display: "swap",
  fallback: ["PingFang SC", "Microsoft YaHei", "Noto Sans SC", "sans-serif"],
});
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
        <Menu />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
