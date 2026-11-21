import { S, idAudio, type Silaba } from "@/lib/silabas";

export type Tecnica = "dibujo" | "radical" | "suma" | "literal" | "gratis" | "haoMas" | "partes" | "igual";

export const SELLO: Record<Tecnica, string> = {
  dibujo: "Es un dibujo",
  radical: "El radical da la pista",
  suma: "Chino es fácil",
  literal: "Literalmente",
  gratis: "Palabra gratis",
  haoMas: "好 + algo",
  partes: "Por partes",
  igual: "Suenan igual",
};

/** En "dibujo", hz puede ser un emoji (💧 → 水). */
export type Pieza = { hz: string; es: string };

export interface Palabra {
  /** = idAudio(s), p. ej. "xi1_hong2_shi4". */
  id: string;
  s: Silaba[];
  /** Significado. */
  es: string;
  tecnica: Tecnica;
  /** Lo que se arma en la ficha. */
  piezas: Pieza[];
  /** El truco en una línea. */
  frase: string;
  /** Hay public/audio/palabras/<id>_lento.mp3. */
  lento: boolean;
  /** Micro-nota de sonido (una sola). */
  nota?: string;
  /** Archivo a usar si no es <id> (solo 她: misma toma que 他). */
  audio?: string;
}

const p = (hz: string, es: string): Pieza => ({ hz, es });

function w(
  s: Silaba[],
  es: string,
  tecnica: Tecnica,
  piezas: Pieza[],
  frase: string,
  lento: boolean,
  extra: { nota?: string; id?: string; audio?: string } = {},
): Palabra {
  const { id, ...resto } = extra;
  return { id: id ?? idAudio(s), s, es, tecnica, piezas, frase, lento, ...resto };
}

const NEUTRO = (hz: string) => `${hz} va en tono neutro: suave y cortito.`;

export const PALABRAS: readonly Palabra[] = [
  // Es un dibujo
  w(S("水", "shuǐ", "3"), "agua", "dibujo", [p("💧", "agua")], "Una corriente con gotas a los lados.", false),
  w(S("米", "mǐ", "3"), "arroz (grano)", "dibujo", [p("🌾", "granos")], "Granos que saltan para todos lados.", false),
  w(S("大", "dà", "4"), "grande", "dibujo", [p("🙆", "persona con los brazos abiertos")], "Una persona con los brazos bien abiertos.", false),
  w(S("苹果", "píng guǒ", "23"), "manzana", "dibujo", [p("🌳", "árbol 木 con fruta arriba")], "果: un árbol 木 con la fruta arriba.", true),
  // El radical da la pista
  w(S("茶", "chá", "2"), "té", "radical", [p("艹", "planta")], "艹 arriba: hojas.", false),
  w(S("花", "huā", "1"), "flor", "radical", [p("艹", "planta")], "艹 arriba: planta.", false),
  w(S("草莓", "cǎo méi", "32"), "frutilla", "radical", [p("艹", "planta")], "艹 en las dos: es una planta.", false),
  w(S("蘑菇", "mó gu", "25"), "champiñón", "radical", [p("艹", "planta")], "艹 en las dos: sale de la tierra.", false, { nota: NEUTRO("菇") }),
  w(S("吃", "chī", "1"), "comer", "radical", [p("口", "boca")], "口 boca.", false),
  w(S("喝", "hē", "1"), "tomar, beber", "radical", [p("口", "boca")], "口 boca.", false),
  w(S("洗", "xǐ", "3"), "lavar", "radical", [p("氵", "agua")], "氵 agua.", false),
  w(S("杯子", "bēi zi", "15"), "vaso", "radical", [p("木", "madera")], "木 madera: los vasos eran de madera.", false, { nota: NEUTRO("子") }),
  w(S("筷子", "kuài zi", "45"), "palillos", "radical", [p("⺮", "bambú")], "⺮ bambú arriba.", false, { nota: NEUTRO("子") }),
  // Chino es fácil
  w(S("电脑", "diàn nǎo", "43"), "computador", "suma", [p("电", "electricidad"), p("脑", "cerebro")], "电 electricidad + 脑 cerebro.", true),
  w(S("电视", "diàn shì", "44"), "televisión", "suma", [p("电", "electricidad"), p("视", "ver")], "电 electricidad + 视 ver.", true),
  w(S("电话", "diàn huà", "44"), "teléfono", "suma", [p("电", "electricidad"), p("话", "palabras")], "电 electricidad + 话 palabras.", true),
  w(S("笑话", "xiào hua", "45"), "chiste", "suma", [p("笑", "reír"), p("话", "palabras")], "笑 reír + 话 palabras.", true, { nota: NEUTRO("话") }),
  w(S("牛奶", "niú nǎi", "23"), "leche", "suma", [p("牛", "vaca"), p("奶", "leche")], "牛 vaca + 奶 leche.", false),
  w(S("冰箱", "bīng xiāng", "11"), "refrigerador", "suma", [p("冰", "hielo"), p("箱", "caja")], "冰 hielo + 箱 caja.", false),
  w(S("手机", "shǒu jī", "31"), "celular", "suma", [p("手", "mano"), p("机", "máquina")], "手 mano + 机 máquina.", false),
  w(S("水果", "shuí guǒ", "23"), "fruta", "suma", [p("水", "agua"), p("果", "fruto")], "水 agua + 果 fruto.", false, { nota: "Dos 3.º tonos seguidos: se escribe shuǐguǒ pero se dice shuíguǒ.", audio: "shui3_guo3" }),
  w(S("你好", "ní hǎo", "23"), "hola", "suma", [p("你", "tú"), p("好", "bien")], "你 tú + 好 bien.", false, { nota: "Dos 3.º tonos seguidos: el primero suena como 2.º, ní hǎo." }),
  // Literalmente
  w(S("西红柿", "xī hóng shì", "124"), "tomate", "literal", [p("西", "oeste"), p("红", "rojo"), p("柿", "kaki")], "Literalmente: kaki rojo del oeste.", true),
  w(S("西瓜", "xī guā", "11"), "sandía", "literal", [p("西", "oeste"), p("瓜", "melón")], "Literalmente: melón del oeste.", true),
  w(S("胡萝卜", "hú luó bo", "225"), "zanahoria", "literal", [p("胡", "extranjero"), p("萝卜", "rábano")], "Literalmente: rábano extranjero.", true, { nota: NEUTRO("卜") }),
  w(S("土豆", "tǔ dòu", "34"), "papa", "literal", [p("土", "tierra"), p("豆", "frijol")], "Literalmente: frijol de tierra.", true),
  w(S("西兰花", "xī lán huā", "121"), "brócoli", "literal", [p("西", "oeste"), p("花", "flor")], "Literalmente: flor del oeste.", true),
  w(S("面包", "miàn bāo", "41"), "pan", "literal", [p("面", "harina"), p("包", "bollo")], "Literalmente: bollo de harina.", false),
  w(S("长颈鹿", "cháng jǐng lù", "234"), "jirafa", "literal", [p("长", "largo"), p("颈", "cuello"), p("鹿", "ciervo")], "Literalmente: ciervo de cuello largo.", true),
  w(S("猫头鹰", "māo tóu yīng", "121"), "búho", "literal", [p("猫", "gato"), p("头", "cabeza"), p("鹰", "águila")], "Literalmente: águila con cabeza de gato.", true),
  w(S("鸭嘴兽", "yā zuǐ shòu", "134"), "ornitorrinco", "literal", [p("鸭", "pato"), p("嘴", "boca"), p("兽", "bestia")], "Literalmente: bestia con boca de pato.", true),
  // Palabra gratis
  w(S("咖啡", "kā fēi", "11"), "café", "gratis", [], "Suena a café: ya la sabes.", true),
  w(S("沙发", "shā fā", "11"), "sofá", "gratis", [], "Suena a sofá: ya la sabes.", true),
  w(S("布丁", "bù dīng", "41"), "budín", "gratis", [], "Suena a budín: ya la sabes.", true),
  w(S("沙拉", "shā lā", "11"), "ensalada", "gratis", [], "Suena a salad: ya la sabes.", true),
  w(S("汉堡", "hàn bǎo", "43"), "hamburguesa", "gratis", [], "Suena a hamburguesa: ya la sabes.", true),
  w(S("披萨", "pī sà", "14"), "pizza", "gratis", [], "Suena a pizza: ya la sabes.", true),
  w(S("可乐", "kě lè", "34"), "bebida cola", "gratis", [], "Suena a cola: ya la sabes.", true),
  w(S("巧克力", "qiǎo kè lì", "344"), "chocolate", "gratis", [], "Suena a chocolate: ya la sabes.", true),
  // 好 + algo
  w(S("好吃", "hǎo chī", "31"), "rico (comida)", "haoMas", [p("好", "bueno"), p("吃", "comer")], "Bueno de comer.", true),
  w(S("好喝", "hǎo hē", "31"), "rico (bebida)", "haoMas", [p("好", "bueno"), p("喝", "tomar")], "Bueno de tomar.", true),
  w(S("好看", "hǎo kàn", "34"), "bonito", "haoMas", [p("好", "bueno"), p("看", "mirar")], "Bueno de mirar.", true),
  w(S("好听", "hǎo tīng", "31"), "suena bonito", "haoMas", [p("好", "bueno"), p("听", "escuchar")], "Bueno de escuchar.", true),
  w(S("好玩", "hǎo wán", "32"), "entretenido", "haoMas", [p("好", "bueno"), p("玩", "jugar")], "Bueno de jugar.", true),
  // Por partes
  w(S("好", "hǎo", "3"), "bueno, bien", "partes", [p("女", "mujer"), p("子", "niño")], "女 mujer + 子 niño: mamá con su hijo.", false),
  w(S("你", "nǐ", "3"), "tú", "partes", [p("亻", "persona"), p("尔", "tú (antiguo)")], "亻 persona: la otra persona.", true),
  w(S("我们", "wǒ men", "35"), "nosotros", "partes", [p("亻", "persona"), p("门", "puerta")], "们 = 亻 persona + 门 puerta: mucha gente en la puerta = plural.", true, { nota: NEUTRO("们") }),
  w(S("猫", "māo", "1"), "gato", "partes", [p("犭", "animal"), p("苗", "miáo")], "犭 animal + 苗 miáo: suena como un maullido.", false),
  // Suenan igual
  w(S("他", "tā", "1"), "él", "igual", [p("亻", "persona")], "亻 persona; suena igual que 她.", true),
  w(S("她", "tā", "1"), "ella", "igual", [p("女", "mujer")], "女 mujer; suena igual que 他.", true, { id: "ta1_ella", audio: "ta1" }),
];

export const srcPalabra = (pal: Palabra, lento = false): string =>
  `/audio/palabras/${pal.audio ?? pal.id}${lento ? "_lento" : ""}.mp3`;
