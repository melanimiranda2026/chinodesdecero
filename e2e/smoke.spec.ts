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
