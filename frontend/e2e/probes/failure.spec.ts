import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { test, expect } from '../fixtures';

// Infrastructure probe, excluded from the normal twelve product scenarios.
test('CI-PROBE: fallo artificial E2E ejecutado', async ({ page }) => {
  const artifacts = process.env.E2E_ARTIFACTS_DIR;
  if (!artifacts) throw new Error('La sonda requiere el entorno aislado de scripts/run-e2e.sh.');
  await page.goto('/#catalogo');
  const heading = page.getByRole('heading', { name: 'Explorar catálogo', exact: true });
  await expect(heading).toBeVisible();
  const expected = 'REN90_EXPECTED_DIFFERENT_HEADING';
  await writeFile(path.join(artifacts, 'probe-executed.json'), JSON.stringify({
    probe: 'REN-90', expected, actual: await heading.innerText(),
  }));
  // Real locator assertion against the live UI; never change the product to make this pass.
  await expect(heading).toHaveText(expected, { timeout: 1000 });
});
