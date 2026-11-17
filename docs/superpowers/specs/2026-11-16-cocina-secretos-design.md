# Cocina más grande y secretos que conectan la casa con el puzzle

Fecha: 16 nov. 2026 · Estado: borrador para aprobar · Entrega 1 (arreglos rápidos) ya hecha en PR #7.

## Para qué

Que la casa tenga más cosas que descubrir y que lo que encuentras ahí **sirva en el puzzle**: así hay motivos para volver y pasar de un juego al otro.

## Lo que pidió la dueña (decidido)

- En la casa **no se ganan medallas**: se ganan **palabras**, y cada palabra abre los niveles del puzzle que la usan.
- **Papeles escondidos** con hanzi + dibujo: planta → 艹, boca → 口, agua → 氵 (cómo el dibujo se simplifica hasta el radical). Abren niveles especiales de radicales.
- **Refri por dentro** con más detalle: la cámara se acerca en primer plano. Comida que ya salió en los videos.
- **Cocinar con receta**: tarjeta 米 + 水 + 胡萝卜 → echarlos a la olla en cualquier orden → revolver → 我做好饭了.
- **Taza de café** (咖啡杯, 我喝咖啡), conecta con el video de 咖啡.
- Más objetos con los que interactuar.

## Entrega 2: cocina más grande

**Refri en primer plano.** Abrir el refri acerca la cámara (como los gestos de hoy, pantalla completa dentro de la ventana). Adentro, estantes con: 苹果, 香蕉, 西瓜, 草莓, 胡萝卜, 西红柿, 土豆, 西兰花, 蘑菇, 牛奶 (y 米 en una bolsa o en la despensa). Tocar una cosa la nombra; arrastrarla afuera la saca a la cocina. Dibujadas en código a crayón, como las frutas de los videos.

**Receta.** Al tocar la olla vacía aparece la tarjeta de la receta (solo hanzi + dibujo + pinyin, sin español). Cada ingrediente se arrastra (o se toca) a la olla y la vaca lo nombra: 米 mǐ, 水 shuǐ, 胡萝卜 húluóbo. Con los tres, el gesto de revolver en círculos (el que ya existe para 做饭). Al terminar: 我做好饭了 y el arroz con zanahoria queda en la olla para servir en el bol (盛饭 → 吃饭, como hoy). Fácil de acertar: el orden no importa y no hay error.

**Taza de café.** Objeto nuevo 咖啡杯 en el mesón: 倒咖啡 → 喝咖啡 (我喝咖啡) → 洗 (sucia → limpia), igual que el vaso.

**Objetos nuevos (mi propuesta, máx. 3 para no llenar la pantalla a 360 px):** 灯 dēng (lámpara: 开灯/关灯, la cocina se oscurece), 窗户 chuānghu (ventana: 打开, entra un pájaro), 垃圾桶 (basurero, donde van las cáscaras). La dueña elige o cambia.

## Entrega 3: secretos y conexión con el puzzle

**Palabras ganadas.** Cada palabra que la vaca nombra en la casa por primera vez se guarda en el avance (`palabras` reemplaza a `medallas`; se migra sin perder lo escuchado). Aviso breve: la pieza vuela al ícono 🧩 de la pestaña.

**Puzzle según palabras.** Cada frase del puzzle declara qué palabras necesita. Un nivel se abre cuando tienes sus palabras (las de 我/你/是 vienen regaladas para que nadie quede trabado). En el mapa, un nivel cerrado muestra qué palabras faltan y "búscalas en la cocina".

**Papeles escondidos.** Tres al principio, en lugares que se descubren jugando: dentro del refri (detrás de la leche), debajo del plato (al lavarlo), detrás de la tetera. Cada papel abre una nota a pantalla completa: dibujo realista → dibujo simple → radical (planta 🌱 → 艹, boca → 口, agua 💧 → 氵), con la vaca diciendo el carácter, y palabras ya vistas que lo llevan (草莓, 茶; 吃, 喝; 洗, 汤…). Cada papel abre un nivel de radicales en el puzzle.

## Metas, no-metas, anti-metas

- Metas: la casa da cosas que usar en el puzzle; más que descubrir; cocinar se entiende.
- No-metas: dormitorio, living y baño; cambiar los vasos de leche.
- Anti-metas: español dentro de la ventana; que alguien quede trabado en el puzzle sin saber qué buscar; tapar la cocina en celular.

## Audio

Frases nuevas con la voz de la vaca (eleven_v3, Yating), medidas con `medir-tono.mjs` y marcadas **? nativo** en `docs/audios.md` hasta que un nativo las escuche. Primero se busca en el banco del proyecto padre.

## Queda al constructor

Dibujos exactos, dónde va cada objeto nuevo en el cuarto isométrico, cómo se migra el avance guardado.
