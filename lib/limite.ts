export const MAX_CUERPO = 64 * 1024;

const codificador = new TextEncoder();

export function bytes(valor: unknown): number {
  return codificador.encode(JSON.stringify(valor) ?? "").length;
}

/** true si el Content-Length declarado supera el tope (se revisa antes de leer el cuerpo). */
export function cuerpoGrande(req: Request): boolean {
  const n = Number(req.headers.get("content-length"));
  return Number.isFinite(n) && n > MAX_CUERPO;
}
