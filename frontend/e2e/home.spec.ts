import { expect, test } from '@playwright/test';

test('conecta el inicio con la API y PostgreSQL', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('RentSmart | Espacios entre particulares');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Un espacio.Muchas posibilidades.');
  await expect(page.getByRole('status')).toHaveText('Servicio disponible');
});

test('puede recuperarse cuando el servicio vuelve a estar disponible', async ({ page }) => {
  await page.route('**/api/health/ready', (route) => route.fulfill({ status: 503, body: '{}' }));
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('No pudimos conectar con el servicio');
  await page.unroute('**/api/health/ready');
  await page.getByRole('button', { name: 'Volver a comprobar' }).click();
  await expect(page.getByRole('status')).toHaveText('Servicio disponible');
});
