import { textoHanzi } from "@/lib/silabas";
import { ESTADO_INICIAL, VALORES, type EstadoCocina, type ObjetoId } from "@/components/casa/cocina/datos";
import { acciones, aplicar, estadosAlcanzables } from "@/components/casa/cocina/acciones";

const hacer = (e: EstadoCocina, id: ObjetoId, verbo: string) => {
  const a = acciones(id, e).find((x) => textoHanzi(x.verbo) === verbo);
  if (!a) throw new Error(`${id} no ofrece ${verbo} en ${JSON.stringify(e)}`);
  return aplicar(e, a);
};
const verbos = (e: EstadoCocina, id: ObjetoId) => acciones(id, e).map((a) => textoHanzi(a.verbo));

test("plato: 吃饺子 → sucio → solo 洗 → limpio → 冰箱 abierto ofrece 拿饺子 → lleno", () => {
  let e = hacer(ESTADO_INICIAL, "panzi", "吃饺子");
  expect(e.panzi).toBe("sucio");
  expect(verbos(e, "panzi")).toEqual(["洗"]);
  e = hacer(e, "panzi", "洗");
  expect(e.panzi).toBe("limpio");
  expect(verbos(e, "bingxiang")).toEqual(["打开"]);
  e = hacer(e, "bingxiang", "打开");
  expect(verbos(e, "bingxiang")).toContain("拿饺子");
  e = hacer(e, "bingxiang", "拿饺子");
  expect(e.panzi).toBe("lleno");
});

test("manzana sucia solo ofrece 洗, y se lava en el fregadero", () => {
  expect(acciones("pingguo", ESTADO_INICIAL).map((a) => textoHanzi(a.verbo))).toEqual(["洗"]);
  expect(acciones("pingguo", ESTADO_INICIAL)[0].lugar).toBe("fregadero");
});

test("manzana: 洗 → 切 → 吃 → nada; con 冰箱 abierto aparece 拿苹果 y vuelve sucia", () => {
  let e = hacer(ESTADO_INICIAL, "pingguo", "洗");
  expect(verbos(e, "pingguo")).toEqual(["吃", "切"]);
  e = hacer(e, "pingguo", "切");
  expect(e.pingguo).toBe("cortado");
  expect(verbos(e, "pingguo")).toEqual(["吃"]);
  e = hacer(e, "pingguo", "吃");
  expect(e.pingguo).toBe("nada");
  expect(verbos(e, "pingguo")).toEqual([]);
  expect(verbos(e, "bingxiang")).toEqual(["打开"]);
  e = hacer(e, "bingxiang", "打开");
  e = hacer(e, "bingxiang", "拿苹果");
  expect(e.pingguo).toBe("sucio");
});

test("vaso: 倒水 → 喝 → sucio → 洗 → vacío; 倒茶 desde el vaso o desde el 茶壶 → te", () => {
  let e = hacer(ESTADO_INICIAL, "beizi", "倒水");
  expect(e.beizi).toBe("agua");
  e = hacer(e, "beizi", "喝");
  expect(e.beizi).toBe("sucio");
  expect(verbos(e, "beizi")).toEqual(["洗"]);
  e = hacer(e, "beizi", "洗");
  expect(e.beizi).toBe("vacio");
  expect(hacer(e, "beizi", "倒茶").beizi).toBe("te");
  const t = hacer(e, "chahu", "倒茶");
  expect(t.beizi).toBe("te");
  expect(verbos(t, "beizi")).toEqual(["喝茶"]);
});

test("茶壶 no ofrece nada si el vaso no está vacío", () => {
  for (const b of ["agua", "te", "sucio"]) {
    expect(acciones("chahu", { ...ESTADO_INICIAL, beizi: b })).toEqual([]);
  }
});

test("arroz: 做饭 → 锅 cocido → 盛饭 (desde 碗 o 锅) → 碗 lleno, 锅 sucio → 吃饭 → 碗 sucio", () => {
  const e0 = hacer(ESTADO_INICIAL, "guo", "做饭");
  expect(e0.guo).toBe("cocido");
  for (const id of ["wan", "guo"] as ObjetoId[]) {
    let e = hacer(e0, id, "盛饭");
    expect(e.wan).toBe("lleno");
    expect(e.guo).toBe("sucio");
    e = hacer(e, "wan", "吃饭");
    expect(e.wan).toBe("sucio");
  }
});

test("冰箱: 打开 / 关上; cerrado no ofrece 拿", () => {
  expect(verbos(ESTADO_INICIAL, "bingxiang")).toEqual(["打开"]);
  const abierto = hacer(ESTADO_INICIAL, "bingxiang", "打开");
  expect(abierto.bingxiang).toBe("abierto");
  expect(verbos(abierto, "bingxiang")).toEqual(["关上"]);
  expect(hacer(abierto, "bingxiang", "关上").bingxiang).toBe("cerrado");
  const conPlato = { ...ESTADO_INICIAL, panzi: "limpio" };
  expect(verbos(conPlato, "bingxiang").some((v) => v.startsWith("拿"))).toBe(false);
});

test("aplicar no muta el estado", () => {
  const antes = { ...ESTADO_INICIAL };
  hacer(ESTADO_INICIAL, "panzi", "吃饺子");
  expect(ESTADO_INICIAL).toEqual(antes);
});

test("toda acción tiene frase que empieza con 我 y verbo sin español", () => {
  const estados = estadosAlcanzables();
  expect(estados.length).toBeGreaterThan(10);
  const ids = Object.keys(ESTADO_INICIAL) as ObjetoId[];
  const latin = /[a-zA-Z]/;
  let total = 0;
  for (const e of estados) {
    for (const id of ids) {
      for (const a of acciones(id, e)) {
        total++;
        expect(a.frase[0][0]).toBe("我");
        expect(latin.test(textoHanzi(a.verbo))).toBe(false);
        expect(latin.test(textoHanzi(a.frase))).toBe(false);
      }
    }
  }
  expect(total).toBeGreaterThan(0);
});

test("estadosAlcanzables no crece con los objetos nuevos", () => {
  expect(estadosAlcanzables().length).toBe(864);
});

const dice = (id: ObjetoId, v: string, hora?: number) =>
  acciones(id, { ...ESTADO_INICIAL, [id]: v }, hora).map((a) => [textoHanzi(a.verbo), textoHanzi(a.frase), a.anim] as const);

test("acciones de los objetos nuevos, por estado (verbo, frase, anim)", () => {
  expect(dice("kafeibei", "vacio")).toEqual([["倒咖啡", "我倒咖啡", "servirCafe"]]);
  expect(dice("kafeibei", "cafe")).toEqual([["喝咖啡", "我喝咖啡", "beber"]]);
  expect(dice("kafeibei", "sucio")).toEqual([["洗", "我洗咖啡杯", "lavar"]]);
  expect(dice("deng", "encendida")).toEqual([["关灯", "我关灯", "apagar"]]);
  expect(dice("deng", "apagada")).toEqual([["开灯", "我开灯", "encender"]]);
  expect(dice("chuanghu", "cerrada")).toEqual([["打开", "我打开窗户", "abrirVentana"]]);
  expect(dice("chuanghu", "abierta")).toEqual([["关上", "我关上窗户", "cerrarVentana"]]);
  expect(dice("lajitong", "cerrado")).toEqual([["打开", "我打开垃圾桶", "abrirTarro"]]);
  expect(dice("yizi", "libre")).toEqual([["坐", "我坐下", "sentarse"]]);
  expect(dice("shouji", "fijo")).toEqual([["打电话", "我打电话", "llamar"]]);
  expect(dice("zhuozi", "fijo")).toEqual([]);
  for (const m of ["refri", "mesa", "lajitong", "chuanghu"]) expect(dice("mao", m)).toEqual([]);
});

test("beber el café no abre primer plano (sinGesto) y lavar usa el fregadero", () => {
  expect(acciones("kafeibei", { ...ESTADO_INICIAL, kafeibei: "cafe" })[0].sinGesto).toBe(true);
  expect(acciones("kafeibei", { ...ESTADO_INICIAL, kafeibei: "sucio" })[0].lugar).toBe("fregadero");
});

test("ninguna acción de un objeto nuevo cambia otro objeto", () => {
  for (const id of ["kafeibei", "deng", "chuanghu", "lajitong", "yizi", "zhuozi", "shouji", "mao"] as ObjetoId[]) {
    for (const v of VALORES[id]) {
      for (const a of acciones(id, { ...ESTADO_INICIAL, [id]: v })) {
        for (const k of Object.keys(a.cambia ?? {})) expect(k).toBe(id);
      }
    }
  }
});

test("comer arroz dice la comida de la hora", () => {
  const lleno = { ...ESTADO_INICIAL, wan: "lleno" };
  const frase = (h: number) => textoHanzi(acciones("wan", lleno, h)[0].frase);
  expect(frase(8)).toBe("我吃早饭");
  expect(frase(13)).toBe("我吃午饭");
  expect(frase(20)).toBe("我吃晚饭");
  expect(frase(2)).toBe("我吃晚饭");
  expect(textoHanzi(acciones("wan", lleno, 8)[0].verbo)).toBe("吃饭");
  expect(textoHanzi(acciones("panzi", ESTADO_INICIAL, 8)[0].frase)).toBe("我吃饺子");
});
