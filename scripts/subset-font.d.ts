declare module "subset-font" {
  export default function subsetFont(
    fuente: Buffer,
    texto: string,
    opciones?: { targetFormat?: "sfnt" | "woff" | "woff2" | "truetype" },
  ): Promise<Buffer>;
}
