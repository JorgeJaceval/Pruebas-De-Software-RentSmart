import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const baseURL = process.env.BASE_URL;
if (!baseURL) throw new Error('Falta BASE_URL. Usa bash scripts/run-e2e.sh para preparar un entorno aislado.');
const target = new URL(baseURL);
if (target.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(target.hostname) ||
    target.username || target.password || target.pathname !== '/' || target.search || target.hash) {
  throw new Error('Las E2E requieren una URL HTTP local sin credenciales ni rutas; no se ejecutan contra producción.');
}
const artifacts = process.env.E2E_ARTIFACTS_DIR ?? 'test-results/e2e/manual';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  workers: process.env.CI ? 1 : undefined,
  retries: 0,
  timeout: 30_000,
  globalTimeout: 600_000,
  expect: { timeout: 10_000 },
  outputDir: path.join(artifacts, 'results'),
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: path.join(artifacts, 'report') }],
    ['junit', { outputFile: path.join(artifacts, 'junit.xml') }],
  ],
  use: { baseURL, headless: true, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
