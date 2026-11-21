import { test, expect } from './fixtures';
import { fillSpace, loginAs } from './ui';

// HU-17 in the E2E environment: scripts/run-e2e.sh never configures a provider key, so the real
// backend answers that AI is unavailable. Successful suggestions are covered with a simulated
// provider in Pytest/Jest (CA-08); the real call is recorded separately as evidence.
test('E3-16: sin proveedor configurado, la sugerencia lo explica y se publica escribiendo a mano', async ({ page, owner, spaceData }) => {
  await loginAs(page, owner);
  await page.getByRole('navigation', { name: 'Mi cuenta', exact: true })
    .getByRole('link', { name: 'Publicar espacio', exact: true }).click();
  const form = page.getByRole('form', { name: 'Publicar espacio' });
  const suggest = form.getByRole('button', { name: 'Sugerir descripción con IA', exact: true });
  await expect(suggest).toBeDisabled();
  await fillSpace(form, { ...spaceData, description: '' });
  await expect(suggest).toBeEnabled();
  await suggest.click();
  await expect(form.getByRole('alert')).toContainText('La sugerencia con IA no está disponible en este momento.');
  await expect(form.getByRole('alert')).toContainText('Puedes escribir la descripción manualmente.');
  // No static template is presented as AI and the form keeps every value.
  await expect(form.getByRole('region', { name: 'Sugerencia generada con IA' })).toHaveCount(0);
  await expect(form.getByLabel('Descripción', { exact: true })).toHaveValue('');
  await expect(form.getByLabel('Nombre del espacio', { exact: true })).toHaveValue(spaceData.name);
  await form.getByLabel('Descripción', { exact: true }).fill(spaceData.description);
  await form.getByRole('button', { name: 'Publicar espacio', exact: true }).click();
  await expect(page.getByText('Tu espacio fue publicado.', { exact: true })).toBeVisible();
  await expect(page.getByText(spaceData.description, { exact: true })).toBeVisible();
});
