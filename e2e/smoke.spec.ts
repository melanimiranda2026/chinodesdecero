import { test, expect, type Locator, type Page } from "@playwright/test";

const sinScrollHorizontal = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

type Caja = { x: number; y: number; width: number; height: number };
const seCruzan = (a: Caja, b: Caja) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
/** La zona que de verdad recibe el toque: la caja del botón, o 44 × 44 centrados si es más chica (el ::before). */
const tocable = (c: Caja): Caja => {
  const w = Math.max(c.width, 44);
  const h = Math.max(c.height, 44);
  return { x: c.x + c.width / 2 - w / 2, y: c.y + c.height / 2 - h / 2, width: w, height: h };
};

/** Sin red de verdad: el correo responde 200 y los eventos no hacen ruido. Devuelve los cuerpos enviados al correo. */
async function prepararRed(page: Page) {
  const correos: unknown[] = [];
  await page.route("**/api/suscribir", async (route) => {
    correos.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await page.route("**/api/eventos", (route) => route.fulfill({ status: 204, body: "" }));
  return correos;
}

/**
 * Abre `/` y espera la casa entera y luego el cuarto. La entrada se mira con movimiento (dura ~2 s y se alcanza
 * a ver); apenas se vio, vuelve el movimiento reducido para el cuarto (los objetos no "respiran" y el toque no
 * necesita force).
 */
async function abrirCasa(page: Page, cuarto: "living" | "cocina", ir: () => Promise<unknown> = () => page.goto("/")) {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await ir();
  const entrada = page.locator("[data-entrada]");
  await expect(entrada).toBeVisible();
  await expect(entrada).toHaveAttribute("data-fase", /camina|zoom/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  // la entrada termina sola (sin tocarla): después, el cuarto
  await expect(entrada).toHaveCount(0, { timeout: 10_000 });
  await expect(page.locator('[aria-label="地图"] [aria-current="true"]')).toHaveAttribute("data-cuarto", cuarto);
  if (cuarto === "living") await expect(page.locator('[data-cuarto-motor="living"]')).toBeVisible();
  else await expect(page.locator('[data-casa] [data-objeto="beizi"]')).toBeVisible();
}

const living = (page: Page) => page.locator('[data-cuarto-motor="living"]');
const bandeja = (page: Page) => living(page).locator("[data-bandeja]");
/** El reloj solar del motor: la imagen hija directa del cuarto (la ficha que gira también es img, se excluye). */
const reloj = (page: Page) => living(page).locator(':scope > [role="img"]:not([data-ficha-ganada])');

/** Espera a que la vaca termine lo que está haciendo. */
const libre = (page: Page) => expect(living(page)).not.toHaveAttribute("data-ocupado", { timeout: 15_000 });

/** Toca un objeto del living hasta que su ficha (el sustantivo) quede en la bandeja. */
async function tocarObjeto(page: Page, id: string, hz: string) {
  const ficha = bandeja(page).getByRole("img", { name: hz, exact: true });
  await expect(async () => {
    await libre(page);
    await living(page).locator(`[data-objeto="${id}"]`).click({ timeout: 3000 });
    await expect(ficha).toBeVisible({ timeout: 2500 });
  }).toPass({ timeout: 20_000 });
}

/** Hace una acción sobre un objeto: toca el objeto, luego su píldora, y espera a que la vaca termine la frase y la pose. */
async function hacer(page: Page, objeto: string, accion: string) {
  const pildora = living(page).locator(`[data-pildora="${accion}"]`);
  await expect(async () => {
    await libre(page);
    if (!(await pildora.isVisible())) await living(page).locator(`[data-objeto="${objeto}"]`).click({ timeout: 3000 });
    await pildora.click({ timeout: 3000 });
    // empezó: la vaca está ocupada caminando, diciendo la frase o en la pose
    await expect(living(page)).toHaveAttribute("data-ocupado", "true", { timeout: 2000 });
  }).toPass({ timeout: 20_000 });
  await libre(page);
  await expect(pildora).toHaveCount(0);
}

test("de la casa entera a la cocina pasando por el living, y al recargar vuelve a la cocina", async ({ page }) => {
  const correos = await prepararRed(page);

  // 1. la casa entera y, tras la entrada, el living
  await abrirCasa(page, "living");
  const puerta = living(page).locator("[data-puerta]");
  await expect(puerta).not.toHaveAttribute("data-lista");
  await expect(bandeja(page).locator("[data-silueta]")).toHaveCount(6);

  // 2. los cuatro objetos (la mesa se abre y se cierra) y las tres acciones
  await tocarObjeto(page, "shafa", "沙发");
  await tocarObjeto(page, "yizi", "椅子");
  await tocarObjeto(page, "dianshi", "电视");
  await tocarObjeto(page, "zhuozi", "桌子");
  const mesa = page.getByTestId("mesa");
  await expect(mesa).toBeVisible({ timeout: 15_000 });
  await mesa.getByRole("button", { name: "返回" }).click();
  await expect(mesa).toHaveCount(0);

  await hacer(page, "shafa", "zuo");
  await hacer(page, "yizi", "zuo");
  await expect(bandeja(page).getByRole("img", { name: "坐", exact: true })).toBeVisible();
  await hacer(page, "dianshi", "kan");
  await expect(bandeja(page).getByRole("img", { name: "看", exact: true })).toBeVisible();
  await expect(bandeja(page).locator("[data-silueta]")).toHaveCount(0);
  await expect(puerta).toHaveAttribute("data-lista", "true");

  // 3. la puerta 厨房 pide el correo; al dejarlo, la cocina
  await libre(page);
  await puerta.click();
  const tarjeta = page.locator('[data-capa="salida"]').getByRole("dialog");
  await expect(tarjeta).toBeVisible();
  const campo = tarjeta.getByLabel("Tu correo");
  await expect(campo).toBeFocused();
  await campo.fill("vaca@ejemplo.com");
  await expect(tarjeta.getByRole("checkbox")).not.toBeChecked();
  await tarjeta.getByRole("button", { name: "Guardar y seguir" }).click();
  await expect(page.locator('[data-capa="salida"]')).toHaveCount(0);
  await expect(page.locator('[aria-label="地图"] [aria-current="true"]')).toHaveAttribute("data-cuarto", "cocina");
  await expect(page.locator('[data-casa] [data-objeto="beizi"]')).toBeVisible();
  await expect(living(page)).toHaveCount(0);
  expect(correos).toHaveLength(1);
  expect(correos[0]).toMatchObject({ email: "vaca@ejemplo.com", consentimiento: false, origen: "salida_living" });

  // 4. al recargar: la casa entera y después la cocina, donde quedó
  await abrirCasa(page, "cocina", () => page.reload());
  await expect(page.locator('[aria-label="地图"] [data-cuarto="living"]')).not.toHaveAttribute("data-bloqueado");
});

test("en el living, el reloj solar, la bandeja y el minimapa no tapan objetos, la puerta ni entre ellos", async ({ page }, info) => {
  await prepararRed(page);
  await abrirCasa(page, "living");

  const caja = async (l: Locator, nombre: string): Promise<Caja> => {
    await expect(l, nombre).toBeVisible();
    return (await l.boundingBox())!;
  };
  const encima = {
    reloj: await caja(reloj(page), "reloj"),
    bandeja: await caja(bandeja(page), "bandeja"),
    minimapa: await caja(page.locator('[aria-label="地图"]'), "minimapa"),
  };
  const zonas: Record<string, Caja> = {};
  const objetos = living(page).locator("[data-objeto]");
  await expect(objetos).toHaveCount(4);
  for (const o of await objetos.all()) zonas[(await o.getAttribute("data-objeto"))!] = tocable(await caja(o, "objeto"));
  zonas.puerta = tocable(await caja(living(page).locator("[data-puerta]"), "puerta"));

  for (const [n, c] of Object.entries(encima)) {
    for (const [z, cz] of Object.entries(zonas)) {
      expect(seCruzan(c, cz), `${info.project.name}: ${n} ${JSON.stringify(c)} pisa ${z} ${JSON.stringify(cz)}`).toBe(false);
    }
  }
  expect(seCruzan(encima.reloj, encima.minimapa), `el reloj ${JSON.stringify(encima.reloj)} pisa el minimapa ${JSON.stringify(encima.minimapa)}`).toBe(false);
  expect(seCruzan(encima.bandeja, encima.minimapa), "la bandeja pisa el minimapa").toBe(false);
  expect(seCruzan(encima.reloj, encima.bandeja), "el reloj pisa la bandeja").toBe(false);
  await page.screenshot({ path: `${process.env.SMOKE_SHOTS ?? "test-results"}/living-${info.project.name}.png` });
});

test("landing: la ventana del juego a la vista, tocar el 沙发, sin scroll horizontal y hasta el pie", async ({ page }) => {
  await prepararRed(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Tus primeras palabras en chino, jugando" })).toBeAttached();
  const ventana = page.locator("[data-ventana]");
  // la ventana del juego se ve en la primera pantalla y está dentro de la página, no encima
  await expect(ventana).toBeInViewport();
  const vp = page.viewportSize()!;
  const caja = (await ventana.boundingBox())!;
  expect(caja.height).toBeLessThan(vp.height);
  expect(caja.x).toBeGreaterThanOrEqual(0);
  expect(caja.x + caja.width).toBeLessThanOrEqual(vp.width);
  expect(await sinScrollHorizontal(page)).toBe(true);

  // sin tarjeta de entrada: la casa entera y luego el living, dentro de la ventana
  await expect(ventana.getByRole("dialog")).toHaveCount(0);
  await expect(ventana.locator('[data-cuarto-motor="living"]')).toBeVisible({ timeout: 10_000 });
  await tocarObjeto(page, "shafa", "沙发");
  expect(await sinScrollHorizontal(page)).toBe(true);

  const pie = page.locator("footer");
  await pie.scrollIntoViewIfNeeded();
  await expect(pie.getByLabel(/tu correo/i)).toBeInViewport();
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  expect(await sinScrollHorizontal(page)).toBe(true);
});

test("全屏 llena la pantalla, bloquea el scroll y vuelve", async ({ page }) => {
  await prepararRed(page);
  await page.goto("/");
  const ventana = page.locator("[data-ventana]");
  await expect(ventana.locator('[data-cuarto-motor="living"]')).toBeVisible({ timeout: 10_000 });
  const boton = ventana.getByRole("button", { name: "全屏" });
  await boton.click();
  await expect(ventana).toHaveAttribute("data-grande", "true");
  const vp = page.viewportSize()!;
  const caja = (await ventana.boundingBox())!;
  expect(Math.abs(caja.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(caja.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(caja.width - vp.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(caja.height - vp.height)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe("hidden");
  await tocarObjeto(page, "shafa", "沙发");

  await boton.click();
  await expect(ventana).not.toHaveAttribute("data-grande");
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe("hidden");
});

test("metadatos, ícono y zonas táctiles de la landing", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "es_CL");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "Chino con la vaca");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /reconoces/);
  await expect(page.locator('link[rel="icon"][type="image/png"]')).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Bajar" })).toHaveCount(0);
  // zonas táctiles de la landing ≥ 44 px
  const ventana = page.locator("[data-ventana]");
  for (const nombre of ["静音", "全屏"]) {
    const c = (await ventana.getByRole("button", { name: nombre }).boundingBox())!;
    expect(c.width, nombre).toBeGreaterThanOrEqual(44);
    expect(c.height, nombre).toBeGreaterThanOrEqual(44);
  }
  await expect(ventana.locator('[data-cuarto-motor="living"]')).toBeVisible({ timeout: 10_000 });
  for (const b of await ventana.locator('[aria-label="地图"] button').all()) {
    const c = (await b.boundingBox())!;
    expect(c.width).toBeGreaterThanOrEqual(44);
    expect(c.height).toBeGreaterThanOrEqual(44);
  }
});

test("客厅: la mesa de 50 palabras cabe sin scroll horizontal, fichas ≥ 44 px y la ficha de 咖啡", async ({ page }, info) => {
  await prepararRed(page);
  await page.goto("/");
  // la casa entera y luego el living: la mesa se abre tocando el 桌子
  await expect(living(page)).toBeVisible({ timeout: 10_000 });
  const mesa = page.getByTestId("mesa");
  await expect(async () => {
    await libre(page);
    await living(page).locator('[data-objeto="zhuozi"]').click({ timeout: 3000 });
    await expect(mesa).toBeVisible({ timeout: 8000 });
  }).toPass({ timeout: 30_000 });

  const fichas = mesa.locator("[data-palabra]");
  await expect(fichas).toHaveCount(50);
  for (let i = 0; i < 50; i++) {
    const f = fichas.nth(i);
    await f.scrollIntoViewIfNeeded();
    await expect(f).toBeVisible();
    const c = (await f.boundingBox())!;
    expect(c.width, `ficha ${i} ancho`).toBeGreaterThanOrEqual(44);
    expect(c.height, `ficha ${i} alto`).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);

  // fichas de mahjong legibles en el celular: hanzi ≥ 18 px, sin pinyin, y el hanzi cabe entero en su ficha
  const medidas = await fichas.evaluateAll((els) =>
    els.map((el) => {
      const hz = el.querySelector<HTMLElement>("[data-hanzi-teja]")!;
      const r = hz.getBoundingClientRect();
      const c = el.getBoundingClientRect();
      return {
        id: el.getAttribute("data-palabra"),
        hz: parseFloat(getComputedStyle(hz).fontSize),
        cabe: r.left >= c.left - 1 && r.right <= c.right + 1 && r.top >= c.top - 1 && r.bottom <= c.bottom + 1,
        silabas: el.querySelectorAll("[data-silaba]").length,
      };
    }),
  );
  for (const m of medidas) {
    expect(m.hz, `${m.id}: hanzi ${m.hz}px`).toBeGreaterThanOrEqual(18);
    expect(m.cabe, `${m.id}: el hanzi cabe en la ficha`).toBe(true);
    expect(m.silabas, `${m.id}: sin pinyin`).toBe(0);
  }
  await mesa.evaluate((el) => el.scrollTo?.(0, 0));
  await page.screenshot({ path: `${process.env.SMOKE_SHOTS ?? "test-results"}/mesa-${info.project.name}.png` });

  await mesa.locator("[data-palabra]", { hasText: "咖啡" }).click();
  const ficha = page.getByRole("dialog");
  await expect(ficha).toBeVisible();
  await expect(ficha).toContainText("Palabra gratis");
  await expect(ficha).toContainText("café");
  expect(await sinScrollHorizontal(page)).toBe(true);
  await page.screenshot({ path: `${process.env.SMOKE_SHOTS ?? "test-results"}/ficha-${info.project.name}.png` });
});

test("en el living se toma a la vaca y se lleva a la tele; con 看 la tele se enciende", async ({ page }) => {
  await prepararRed(page);
  await abrirCasa(page, "living");
  const agarre = living(page).locator("[data-agarre]");
  const a = (await agarre.boundingBox())!;
  const t = (await living(page).locator('[data-objeto="dianshi"]').boundingBox())!;
  const desde = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
  // el agarre va en el cuerpo: se apunta con el cuerpo a la parte de abajo de la tele
  const hasta = { x: t.x + t.width * 0.6, y: t.y + t.height * 0.85 };
  await page.mouse.move(desde.x, desde.y);
  await page.mouse.down();
  for (let k = 1; k <= 10; k++) await page.mouse.move(desde.x + ((hasta.x - desde.x) * k) / 10, desde.y + ((hasta.y - desde.y) * k) / 10);
  await expect(living(page).locator("[data-vaca]")).toHaveAttribute("data-arrastrando", "true");
  await page.mouse.up();
  // soltarla en la tele es como tocarla: gana 电视 y aparece 看
  await expect(bandeja(page).getByRole("img", { name: "电视", exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(living(page).locator("[data-tele]")).toHaveCount(0);
  await hacer(page, "dianshi", "kan");
  await expect(living(page).locator('[data-tele="encendida"]')).toBeVisible();
});
