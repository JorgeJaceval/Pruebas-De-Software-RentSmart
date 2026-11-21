import { test, expect, headersFor } from './fixtures';
import { detailValue, loginAs } from './ui';
import type { Page } from '@playwright/test';

const reason = 'Las fotos no corresponden al espacio publicado.';

async function logout(page: Page) {
  await page.getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await expect(page.getByRole('form', { name: 'Iniciar sesión' })).toBeVisible();
}

async function openAdministration(page: Page) {
  await page.getByRole('navigation', { name: 'Mi cuenta', exact: true })
    .getByRole('link', { name: 'Administración', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Administración', exact: true })).toBeVisible();
}

test('E3-15: administración retira con motivo, conserva reservas y restituye como inactiva', async ({
  page, request, admin, owner, tenant, space, reservation,
}) => {
  await loginAs(page, admin);
  await openAdministration(page);
  const card = page.getByRole('article', { name: space.name, exact: true });
  await expect(detailValue(card, 'Propietario')).toContainText(owner.email);
  await expect(detailValue(card, 'Estado')).toHaveText('Activa');
  await card.getByRole('button', { name: 'Retirar publicación', exact: true }).click();
  const form = page.getByRole('form', { name: `Retirar «${space.name}»`, exact: true });
  await form.getByRole('button', { name: 'Confirmar retiro', exact: true }).click();
  await expect(form.getByRole('alert')).toHaveText('Indica el motivo del retiro.');
  await form.getByLabel('Motivo del retiro', { exact: true }).fill(reason);
  await form.getByRole('button', { name: 'Confirmar retiro', exact: true }).click();
  await expect(page.getByText(`Retiramos «${space.name}» del catálogo.`, { exact: true })).toBeVisible();
  await expect(detailValue(card, 'Motivo del retiro')).toHaveText(reason);
  await expect(detailValue(card, 'Retirada')).toContainText(admin.name);

  // Sale del catálogo y no admite reservas nuevas.
  expect((await request.get(`/api/spaces/public/${space.id}`)).status()).toBe(404);
  // La reserva existente se conserva intacta.
  const kept = await request.get(`/api/reservations/${reservation.id}`, { headers: headersFor(tenant) });
  expect(kept.status()).toBe(200);
  expect(await kept.json()).toMatchObject({ id: reservation.id, status: 'pending_payment', total_price: reservation.total_price });

  await logout(page);
  await loginAs(page, owner);
  const ownCard = page.getByRole('article', { name: space.name, exact: true });
  await expect(ownCard).toContainText('Deshabilitada por administración');
  await expect(ownCard).toContainText(`Motivo de administración: ${reason}`);
  await expect(ownCard.getByRole('button', { name: 'Activar publicación', exact: true })).toHaveCount(0);

  await logout(page);
  await loginAs(page, admin);
  await openAdministration(page);
  await card.getByRole('button', { name: 'Levantar retiro', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar levantamiento', exact: true }).click();
  await expect(detailValue(card, 'Estado')).toHaveText('Inactiva');
  // Restoring never republishes against the owner's will.
  expect((await request.get(`/api/spaces/public/${space.id}`)).status()).toBe(404);

  await logout(page);
  await loginAs(page, owner);
  await ownCard.getByRole('button', { name: 'Activar publicación', exact: true }).click();
  await expect(ownCard.getByText('La publicación fue activada.', { exact: true })).toBeVisible();
  expect((await request.get(`/api/spaces/public/${space.id}`)).status()).toBe(200);
});

test('E3-15: una cuenta común no accede a la administración ni a sus endpoints', async ({ page, request, owner, space }) => {
  await loginAs(page, owner);
  await expect(page.getByRole('navigation', { name: 'Mi cuenta', exact: true })
    .getByRole('link', { name: 'Administración', exact: true })).toHaveCount(0);
  await page.goto('/#administracion');
  await expect(page.getByRole('heading', { name: 'Acceso restringido', exact: true })).toBeVisible();
  for (const response of [
    await request.get('/api/admin/spaces', { headers: headersFor(owner) }),
    await request.post(`/api/admin/spaces/${space.id}/withdrawal`, { headers: headersFor(owner), data: { reason } }),
  ]) expect(response.status()).toBe(403);
  expect((await request.get(`/api/spaces/public/${space.id}`)).status()).toBe(200);
});
