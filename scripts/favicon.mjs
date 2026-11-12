// Genera app/icon.png (512) y app/favicon.ico (16/32/48) desde la cabeza de la vaca del proyecto de video.
// Uso: node scripts/favicon.mjs [ruta-a-vaca_cabeza.png]
import { writeFileSync } from "node:fs";
import sharp from "sharp";

const origen = process.argv[2] ?? "../video/public/img/vaca_cabeza.png";
const transparente = { r: 0, g: 0, b: 0, alpha: 0 };

// recorta el borde transparente y la centra en un cuadrado con un poco de aire
const recortada = await sharp(origen).trim().png().toBuffer();
const cuadrado = (lado, aire) =>
  sharp(recortada)
    .resize(lado - 2 * aire, lado - 2 * aire, { fit: "contain", background: transparente })
    .extend({ top: aire, bottom: aire, left: aire, right: aire, background: transparente })
    .png()
    .toBuffer();

writeFileSync("app/icon.png", await sharp(await cuadrado(512, 16)).png({ palette: true, compressionLevel: 9 }).toBuffer());

// ICO con PNG adentro (válido desde Windows Vista y en todos los navegadores)
const tamanos = [16, 32, 48];
const imagenes = await Promise.all(tamanos.map((t) => cuadrado(t, t >= 32 ? 1 : 0)));
const cabecera = Buffer.alloc(6 + 16 * tamanos.length);
cabecera.writeUInt16LE(0, 0);
cabecera.writeUInt16LE(1, 2);
cabecera.writeUInt16LE(tamanos.length, 4);
let offset = cabecera.length;
tamanos.forEach((t, i) => {
  const e = 6 + 16 * i;
  cabecera.writeUInt8(t, e);
  cabecera.writeUInt8(t, e + 1);
  cabecera.writeUInt8(0, e + 2);
  cabecera.writeUInt8(0, e + 3);
  cabecera.writeUInt16LE(1, e + 4);
  cabecera.writeUInt16LE(32, e + 6);
  cabecera.writeUInt32LE(imagenes[i].length, e + 8);
  cabecera.writeUInt32LE(offset, e + 12);
  offset += imagenes[i].length;
});
writeFileSync("app/favicon.ico", Buffer.concat([cabecera, ...imagenes]));
console.log("app/icon.png (512) y app/favicon.ico (16/32/48) listos");
