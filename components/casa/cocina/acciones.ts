import { S, type Silaba } from "@/lib/silabas";
import { ESTADO_INICIAL, type EstadoCocina, type ObjetoId } from "./datos";

export type Anim =
  | "llenar" | "servirTe" | "beber" | "tomar" | "comer" | "lavar"
  | "abrir" | "cerrar" | "cortar" | "cocinar" | "servirArroz" | "sacar";

export interface Accion {
  verbo: Silaba[];
  icono: string;
  frase: Silaba[];
  anim: Anim;
  lugar?: "fregadero";
  objeto?: ObjetoId;
  sfx: string;
  cambia?: Partial<EstadoCocina>;
}

type Extra = Partial<Pick<Accion, "lugar" | "objeto" | "cambia">> & { sfx: string };
const A = (verbo: Silaba[], icono: string, frase: Silaba[], anim: Anim, extra: Extra): Accion => ({
  verbo, icono, frase, anim, ...extra,
});

const XI = S("洗", "xǐ", "3");
const NA = S("拿", "ná", "2");
const CHI = S("吃", "chī", "1");
const HE = S("喝", "hē", "1");

export function acciones(id: ObjetoId, E: EstadoCocina): Accion[] {
  const e = E[id];
  switch (id) {
    case "beizi":
      if (e === "vacio")
        return [
          A(S("倒水", "dào shuǐ", "43"), "🚰", S("我倒水", "wǒ dào shuǐ", "343"), "llenar", { lugar: "fregadero", sfx: "tragos", cambia: { beizi: "agua" } }),
          A(S("倒茶", "dào chá", "42"), "🫖", S("我倒茶", "wǒ dào chá", "342"), "servirTe", { sfx: "tragos", cambia: { beizi: "te" } }),
        ];
      if (e === "agua")
        return [A(HE, "🥤", S("我喝水", "wǒ hē shuǐ", "313"), "beber", { sfx: "tragos", cambia: { beizi: "sucio" } })];
      if (e === "te")
        return [A(S("喝茶", "hē chá", "12"), "🍵", S("我喝茶", "wǒ hē chá", "312"), "beber", { sfx: "tragos", cambia: { beizi: "sucio" } })];
      return [A(XI, "🫧", S("我洗杯子", "wǒ xǐ bēi zi", "3315"), "lavar", { lugar: "fregadero", sfx: "pop-burbuja", cambia: { beizi: "vacio" } })];
    case "chahu":
      return E.beizi === "vacio"
        ? [A(S("倒茶", "dào chá", "42"), "🫖", S("我倒茶", "wǒ dào chá", "342"), "servirTe", { sfx: "tragos", cambia: { beizi: "te" } })]
        : [];
    case "wan":
      if (e === "vacio")
        return E.guo === "cocido"
          ? [A(S("盛饭", "shèng fàn", "44"), "🍚", S("我盛饭", "wǒ shèng fàn", "344"), "servirArroz", { sfx: "whoosh", cambia: { wan: "lleno", guo: "sucio" } })]
          : [A(NA, "✋", S("我拿碗", "wǒ ná wǎn", "323"), "tomar", { sfx: "whoosh" })];
      if (e === "lleno")
        return [A(S("吃饭", "chī fàn", "14"), "😋", S("我吃饭", "wǒ chī fàn", "314"), "comer", { sfx: "nam", cambia: { wan: "sucio" } })];
      return [A(XI, "🫧", S("我洗碗", "wǒ xǐ wǎn", "333"), "lavar", { lugar: "fregadero", sfx: "pop-burbuja", cambia: { wan: "vacio" } })];
    case "guo":
      if (e === "vacio")
        return [A(S("做饭", "zuò fàn", "44"), "🔥", S("我做饭", "wǒ zuò fàn", "344"), "cocinar", { sfx: "brillo", cambia: { guo: "cocido" } })];
      if (e === "cocido")
        return E.wan === "vacio"
          ? [A(S("盛饭", "shèng fàn", "44"), "🍚", S("我盛饭", "wǒ shèng fàn", "344"), "servirArroz", { objeto: "wan", sfx: "whoosh", cambia: { wan: "lleno", guo: "sucio" } })]
          : [];
      return [A(XI, "🫧", S("我洗锅", "wǒ xǐ guō", "331"), "lavar", { lugar: "fregadero", sfx: "pop-burbuja", cambia: { guo: "vacio" } })];
    case "panzi":
      if (e === "lleno")
        return [A(S("吃饺子", "chī jiǎo zi", "135"), "🥟", S("我吃饺子", "wǒ chī jiǎo zi", "3135"), "comer", { sfx: "nam", cambia: { panzi: "sucio" } })];
      if (e === "sucio")
        return [A(XI, "🫧", S("我洗盘子", "wǒ xǐ pán zi", "3325"), "lavar", { lugar: "fregadero", sfx: "pop-burbuja", cambia: { panzi: "limpio" } })];
      return [A(NA, "✋", S("我拿盘子", "wǒ ná pán zi", "3225"), "tomar", { sfx: "whoosh" })];
    case "kuaizi":
      return [A(NA, "✋", S("我拿筷子", "wǒ ná kuài zi", "3245"), "tomar", { sfx: "whoosh" })];
    case "pingguo":
      if (e === "sucio")
        return [A(XI, "🫧", S("我洗苹果", "wǒ xǐ píng guǒ", "3323"), "lavar", { lugar: "fregadero", sfx: "pop-burbuja", cambia: { pingguo: "limpio" } })];
      if (e === "limpio")
        return [
          A(CHI, "😋", S("我吃苹果", "wǒ chī píng guǒ", "3123"), "comer", { sfx: "nam", cambia: { pingguo: "nada" } }),
          A(S("切", "qiē", "1"), "🔪", S("我切苹果", "wǒ qiē píng guǒ", "3123"), "cortar", { sfx: "golpe", cambia: { pingguo: "cortado" } }),
        ];
      if (e === "cortado")
        return [A(CHI, "😋", S("我吃苹果", "wǒ chī píng guǒ", "3123"), "comer", { sfx: "nam", cambia: { pingguo: "nada" } })];
      return [];
    case "bingxiang": {
      if (e === "cerrado")
        return [A(S("打开", "dǎ kāi", "31"), "🚪", S("我打开冰箱", "wǒ dǎ kāi bīng xiāng", "33111"), "abrir", { sfx: "whoosh", cambia: { bingxiang: "abierto" } })];
      const l: Accion[] = [];
      if (E.pingguo === "nada")
        l.push(A(S("拿苹果", "ná píng guǒ", "223"), "🍎", S("我拿苹果", "wǒ ná píng guǒ", "3223"), "sacar", { objeto: "pingguo", sfx: "whoosh", cambia: { pingguo: "sucio" } }));
      if (E.panzi === "limpio")
        l.push(A(S("拿饺子", "ná jiǎo zi", "235"), "🥟", S("我拿饺子", "wǒ ná jiǎo zi", "3235"), "sacar", { objeto: "panzi", sfx: "whoosh", cambia: { panzi: "lleno" } }));
      l.push(A(S("关上", "guān shang", "15"), "👋", S("我关上冰箱", "wǒ guān shang bīng xiāng", "31511"), "cerrar", { sfx: "golpe", cambia: { bingxiang: "cerrado" } }));
      return l;
    }
  }
  return [];
}

export function aplicar(e: EstadoCocina, a: Accion): EstadoCocina {
  return { ...e, ...a.cambia };
}

const OBJETO_IDS = Object.keys(ESTADO_INICIAL) as ObjetoId[];
const clave = (e: EstadoCocina) => OBJETO_IDS.map((k) => e[k]).join("|");

/** BFS desde ESTADO_INICIAL aplicando toda acción de todo objeto; sin repetidos. */
export function estadosAlcanzables(): EstadoCocina[] {
  const vistos = new Map<string, EstadoCocina>([[clave(ESTADO_INICIAL), ESTADO_INICIAL]]);
  const cola: EstadoCocina[] = [ESTADO_INICIAL];
  while (cola.length) {
    const e = cola.shift()!;
    for (const id of OBJETO_IDS) {
      for (const a of acciones(id, e)) {
        const n = aplicar(e, a);
        const k = clave(n);
        if (!vistos.has(k)) {
          vistos.set(k, n);
          cola.push(n);
        }
      }
    }
  }
  return [...vistos.values()];
}
