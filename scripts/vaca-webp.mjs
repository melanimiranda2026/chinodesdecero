// Convierte las capas PNG de la vaca (public/vaca/*.png) a WebP de ~800 px de ancho, con transparencia.
// Uso: node scripts/vaca-webp.mjs  (borra los PNG solo con --borrar)
import { readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const dir = join(process.cwd(), "public/vaca");
const borrar = process.argv.includes("--borrar");
for (const f of readdirSync(dir).filter((n) => n.endsWith(".png"))) {
  const origen = join(dir, f);
  const destino = origen.replace(/\.png$/, ".webp");
  const info = await sharp(origen).resize({ width: 800, withoutEnlargement: true }).webp({ quality: 85, alphaQuality: 90 }).toFile(destino);
  console.log(`${f} → ${info.width}x${info.height}, ${Math.round(info.size / 1024)} KB`);
  if (borrar) unlinkSync(origen);
}
