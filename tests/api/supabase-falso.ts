import { vi } from "vitest";

type Fila = Record<string, unknown>;
const LLAVE: Record<string, string> = { suscriptores: "email", avance: "user_id" };

/**
 * Supabase en memoria (solo lo que usan las rutas): select/update/delete con .eq, maybeSingle,
 * upsert (con ignoreDuplicates mezcla o no las columnas enviadas, como Postgres), insert y rpc.
 * `fallar` hace que la próxima operación sobre esa tabla devuelva error.
 */
export function supabaseFalso() {
  const tablas = new Map<string, Fila[]>();
  const fallar = new Set<string>();
  const operaciones: { tabla: string; op: string; valor?: unknown; opciones?: unknown }[] = [];
  const filas = (t: string) => {
    if (!tablas.has(t)) tablas.set(t, []);
    return tablas.get(t)!;
  };
  const rpc = vi.fn<(fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>>(
    async () => ({ data: true, error: null }),
  );

  function desde(tabla: string) {
    const filtros: [string, unknown][] = [];
    let op: "select" | "update" | "delete" = "select";
    let valor: Fila = {};
    const coincide = (f: Fila) => filtros.every(([c, v]) => f[c] === v);
    const error = () => (fallar.delete(tabla) ? { code: "falla" } : null);
    const correr = () => {
      const e = error();
      if (e) return { data: null, error: e };
      const lista = filas(tabla);
      if (op === "update") {
        for (const f of lista) if (coincide(f)) Object.assign(f, valor);
        return { data: null, error: null };
      }
      if (op === "delete") {
        tablas.set(tabla, lista.filter((f) => !coincide(f)));
        return { data: null, error: null };
      }
      return { data: lista.filter(coincide).map((f) => ({ ...f })), error: null };
    };
    const q = {
      select: () => q,
      update: (v: Fila) => {
        op = "update";
        valor = v;
        operaciones.push({ tabla, op, valor: v });
        return q;
      },
      delete: () => {
        op = "delete";
        return q;
      },
      eq: (c: string, v: unknown) => {
        filtros.push([c, v]);
        return q;
      },
      maybeSingle: async () => {
        const r = correr();
        return { data: Array.isArray(r.data) ? (r.data[0] ?? null) : null, error: r.error };
      },
      then: (res: (r: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(correr()).then(res, rej),
      upsert: async (fila: Fila, opciones: { onConflict?: string; ignoreDuplicates?: boolean } = {}) => {
        operaciones.push({ tabla, op: "upsert", valor: fila, opciones });
        const e = error();
        if (e) return { error: e };
        const llave = LLAVE[tabla];
        const lista = filas(tabla);
        const previa = lista.find((f) => f[llave] === fila[llave]);
        if (!previa) lista.push({ ...fila });
        else if (!opciones.ignoreDuplicates) Object.assign(previa, fila);
        return { error: null };
      },
      insert: async (f: Fila | Fila[]) => {
        operaciones.push({ tabla, op: "insert", valor: f });
        const e = error();
        if (e) return { error: e };
        filas(tabla).push(...(Array.isArray(f) ? f : [f]));
        return { error: null };
      },
    };
    return q;
  }

  return {
    cliente: { from: (t: string) => desde(t), rpc },
    rpc,
    tablas,
    fallar,
    operaciones,
    fila: (tabla: string, llave: unknown) => filas(tabla).find((f) => f[LLAVE[tabla]] === llave),
    poner: (tabla: string, f: Fila) => filas(tabla).push({ ...f }),
    limpiar: () => {
      tablas.clear();
      fallar.clear();
      operaciones.length = 0;
      rpc.mockReset().mockResolvedValue({ data: true, error: null });
    },
  };
}
