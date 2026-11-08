import { defineConfig, devices } from "@playwright/test";

const PUERTO = 3100;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  retries: 0,
  reporter: "list",
  use: { baseURL: `http://localhost:${PUERTO}` },
  projects: [
    { name: "celular", use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 740 }, hasTouch: true } },
    { name: "escritorio", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
  ],
  // Se prueba el build de producción (el mismo que se sube).
  webServer: {
    command: `npx next start -p ${PUERTO}`,
    url: `http://localhost:${PUERTO}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
