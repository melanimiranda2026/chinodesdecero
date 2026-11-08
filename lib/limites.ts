import { createHash, createHmac } from "node:crypto";

/** Límites de uso por ventana fija (tabla `limites` + función `consumir_limite`, migración 0002). */
export const LIMITES = {
  suscribirIp: { max: 5, segundos: 3600 },
  suscribirCorreo: { max: 3, segundos: 3600 },
  eventosIp: { max: 120, segundos: 60 },
} as const;

/** IP del cliente según el proxy (Vercel pone la real primero en x-forwarded-for). */
export function ipDe(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  const ip = xff?.split(",")[0]?.trim() || req.headers.get("x-real-ip")?.trim();
  return ip || "desconocida";
}

/** Clave sin datos en claro: `ip:<hmac>` (la IP se mezcla con un secreto del servidor) o `email:<sha256>`. */
export function claveIp(ip: string): string {
  const secreto = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return `ip:${createHmac("sha256", secreto).update(ip).digest("hex")}`;
}
export function claveCorreo(email: string): string {
  return `email:${createHash("sha256").update(email.trim().toLowerCase()).digest("hex")}`;
}

interface ConRpc {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
}

/**
 * Suma un uso; true si sigue dentro del límite. Si la base falla (p. ej. falta la migración)
 * deja pasar: el límite protege, pero nunca debe tumbar el sitio.
 */
export async function consumirLimite(
  sb: ConRpc,
  clave: string,
  { max, segundos }: { max: number; segundos: number },
): Promise<boolean> {
  try {
    const { data, error } = await sb.rpc("consumir_limite", { p_clave: clave, p_max: max, p_segundos: segundos });
    if (error) {
      console.error("limite:", (error as { code?: string })?.code ?? "error");
      return true;
    }
    return data !== false;
  } catch {
    return true;
  }
}
