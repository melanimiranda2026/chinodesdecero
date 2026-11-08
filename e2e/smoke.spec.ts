import { test, expect } from "@playwright/test";

test("entrar, tocar el 杯子, sin scroll horizontal y con correo en el pie", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Entrar a la casa" }).click();

  await expect(page.getByRole("heading", { level: 1, name: /Chino desde cero/ })).toBeAttached();

  // la vaca saluda primero; el toque al 杯子 se repite hasta que lo diga (el 杯子 se ve y se toca sin panear)
  const globo = page.getByTestId("globo");
  await expect(async () => {
    await page.locator('[data-objeto="beizi"]').click({ timeout: 3000 });
    await expect(globo).toHaveAttribute("aria-label", "杯子", { timeout: 2500 });
  }).toPass({ timeout: 20_000 });

  const sinScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(sinScroll).toBe(true);

  // la casa ocupa exactamente una pantalla y abajo vienen las secciones
  const alto = await page.locator("[data-casa]").evaluate((el) => el.getBoundingClientRect().height);
  expect(Math.abs(alto - page.viewportSize()!.height)).toBeLessThanOrEqual(1);
  await expect(page.getByRole("heading", { name: "Cómo funciona el Método Jìn" })).toBeAttached();

  const pie = page.locator("footer");
  await pie.scrollIntoViewIfNeeded();
  await expect(pie.getByLabel(/tu correo/i)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
