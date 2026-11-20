import { test, expect, type Page } from "@playwright/test";

const sinScrollHorizontal = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

/** Toca el 杯子 dentro de la ventana hasta que la vaca lo diga (primero saluda). */
async function tocarBeizi(page: Page) {
  const ventana = page.locator("[data-ventana]");
  const globo = ventana.getByTestId("globo");
  await expect(async () => {
    await ventana.locator('[data-objeto="beizi"]').click({ timeout: 3000 });
    await expect(globo).toHaveAttribute("aria-label", "杯子", { timeout: 2500 });
  }).toPass({ timeout: 20_000 });
}

test("landing: hero y ventana a la vista, Jugar ahora, tocar el 杯子, sin scroll horizontal y hasta el pie", async ({ page }) => {
  await page.goto("/");
  const h1 = page.getByRole("heading", { level: 1, name: "Tus primeras palabras en chino, jugando" });
  await expect(h1).toBeInViewport();
  const ventana = page.locator("[data-ventana]");
  // la ventana del juego se ve en la primera pantalla (al menos en parte) y está dentro de la página, no encima
  await expect(ventana).toBeInViewport();
  const vp = page.viewportSize()!;
  const caja = (await ventana.boundingBox())!;
  expect(caja.height).toBeLessThan(vp.height);
  expect(caja.x).toBeGreaterThanOrEqual(0);
  expect(caja.x + caja.width).toBeLessThanOrEqual(vp.width);
  expect(await sinScrollHorizontal(page)).toBe(true);

  // la tarjeta de entrada vive dentro del marco
  const tarjeta = ventana.getByRole("dialog");
  await expect(tarjeta).toBeVisible();
  const ct = (await tarjeta.boundingBox())!;
  expect(ct.y).toBeGreaterThanOrEqual(caja.y);
  expect(ct.y + ct.height).toBeLessThanOrEqual(caja.y + caja.height + 1);

  await page.getByRole("button", { name: "Jugar ahora" }).click();
  await expect(ventana.getByRole("dialog")).toHaveCount(0);
  await expect(ventana).toBeInViewport({ ratio: 0.95 });

  await tocarBeizi(page);
  expect(await sinScrollHorizontal(page)).toBe(true);

  await expect(page.getByRole("heading", { name: "Cómo funciona el Método Jìn" })).toBeAttached();
  const pie = page.locator("footer");
  await pie.scrollIntoViewIfNeeded();
  await expect(pie.getByLabel(/tu correo/i)).toBeInViewport();
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  expect(await sinScrollHorizontal(page)).toBe(true);
});

test("el ▶ Jugar de la tarjeta dentro de la ventana también arranca", async ({ page }) => {
  await page.goto("/");
  const ventana = page.locator("[data-ventana]");
  await ventana.getByRole("button", { name: "Jugar", exact: true }).click();
  await expect(ventana.getByRole("dialog")).toHaveCount(0);
  await tocarBeizi(page);
});

test("全屏 llena la pantalla, bloquea el scroll y vuelve", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Jugar ahora" }).click();
  const ventana = page.locator("[data-ventana]");
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
  await tocarBeizi(page);

  await boton.click();
  await expect(ventana).not.toHaveAttribute("data-grande");
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe("hidden");
});

test("metadatos, ícono y sin la flecha para bajar", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "es_CL");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "Chino desde cero");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /reconoces/);
  await expect(page.locator('link[rel="icon"][type="image/png"]')).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Bajar" })).toHaveCount(0);
  // zonas táctiles de la landing ≥ 44 px
  for (const nombre of ["Jugar ahora", "全屏"]) {
    const c = (await page.getByRole("button", { name: nombre }).boundingBox())!;
    expect(c.width).toBeGreaterThanOrEqual(44);
    expect(c.height).toBeGreaterThanOrEqual(44);
  }
  const como = (await page.getByRole("link", { name: "Cómo funciona" }).boundingBox())!;
  expect(como.height).toBeGreaterThanOrEqual(44);
});

test("客厅: la mesa de 50 palabras cabe sin scroll horizontal, fichas ≥ 44 px y la ficha de 咖啡", async ({ page }, info) => {
  await page.goto("/");
  // la casa ya está en la portada: no hay botón de entrada
  const ventana = page.locator("main");
  // entrar al living desde el minimapa (esperar a que el cuarto esté abierto)
  const living = ventana.locator('[data-cuarto="living"]');
  await expect(living).toBeVisible();
  await expect(async () => {
    await living.click({ timeout: 3000 });
    await expect(ventana.locator("[data-mesa]")).toBeVisible({ timeout: 2500 });
  }).toPass({ timeout: 20_000 });

  await ventana.locator("[data-mesa]").click();
  const mesa = page.getByTestId("mesa");
  await expect(mesa).toBeVisible({ timeout: 15_000 });

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

  // legible en el celular: hanzi ≥ 18 px y el pinyin nunca se corta dentro de una sílaba (cada sílaba, una línea)
  const medidas = await fichas.evaluateAll((els) =>
    els.map((el) => {
      const hz = el.querySelector<HTMLElement>("[data-hanzi-teja]")!;
      const sil = [...el.querySelectorAll<HTMLElement>("[data-silaba]")];
      return {
        id: el.getAttribute("data-palabra"),
        hz: parseFloat(getComputedStyle(hz).fontSize),
        silabas: sil.map((s) => ({ py: s.textContent, alto: s.getBoundingClientRect().height, linea: parseFloat(getComputedStyle(s).lineHeight) || parseFloat(getComputedStyle(s).fontSize) * 1.2 })),
      };
    }),
  );
  for (const m of medidas) {
    expect(m.hz, `${m.id}: hanzi ${m.hz}px`).toBeGreaterThanOrEqual(18);
    expect(m.silabas.length, `${m.id}: sílabas`).toBeGreaterThan(0);
    for (const s of m.silabas) expect(s.alto, `${m.id}: «${s.py}» en una línea`).toBeLessThan(s.linea * 1.5);
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
