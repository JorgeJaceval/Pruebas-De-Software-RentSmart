import { test, expect, futureDate, headersFor, seedAccount, seedSpace, seedReservation } from './fixtures';
import { detailValue, fillReservation, loginAs } from './ui';

test('E3-09: reservar por UI conserva importe contratado en Mis reservas', async ({ page, request, tenant, space }) => {
  await loginAs(page, tenant);
  await page.goto(`/#detalle-espacio/${space.id}`);
  const form = await fillReservation(page, futureDate());
  await expect(form).toContainText('20.000');
  await form.getByRole('button', { name: 'Solicitar reserva', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Resumen de reserva', exact: true })).toBeVisible();
  await expect(detailValue(page, 'Estado')).toHaveText('Pendiente de pago');
  await expect(detailValue(page, 'Total contratado')).toContainText('20.000');
  const id = await detailValue(page, 'Identificador').innerText();
  const response = await request.get(`/api/reservations/${id}`, { headers: headersFor(tenant) });
  expect(response.status()).toBe(200);
  expect((await response.json()).total_price).toBe(20000);
  await page.getByRole('link', { name: 'Volver a mis reservas', exact: true }).click();
  await page.reload();
  const card = page.getByRole('article', { name: space.name, exact: true });
  await expect(card).toBeVisible();
  await expect(detailValue(card, 'Total contratado')).toContainText('20.000');
  await expect(card.getByRole('link', { name: 'Pagar reserva', exact: true })).toBeVisible();
});

test('E3-10: otra cuenta no puede reservar un intervalo bloqueado', async ({ page, request, tenant, space, reservation }) => {
  const other = await seedAccount(request);
  await loginAs(page, other);
  await page.goto(`/#detalle-espacio/${space.id}`);
  const form = await fillReservation(page, reservation.date);
  await form.getByRole('button', { name: 'Solicitar reserva', exact: true }).click();
  await expect(form.getByRole('alert')).toHaveText('Este horario ya no está disponible. Elige otro intervalo.');
  const rejected = await request.get('/api/reservations', { headers: headersFor(other) });
  expect(rejected.status()).toBe(200);
  expect((await rejected.json()).items).toEqual([]);
  const preserved = await request.get(`/api/reservations/${reservation.id}`, { headers: headersFor(tenant) });
  expect(preserved.status()).toBe(200);
  expect((await preserved.json()).status).toBe('pending_payment');
});

test('E3-11: rechazo y reintento aprobado conservan pago y estado al recargar', async ({ page, tenant, reservation }) => {
  await loginAs(page, tenant);
  await page.goto(`/#pago/${reservation.id}`);
  const form = page.getByRole('form', { name: 'Simular pago' });
  await form.getByLabel('Rechazar pago simulado', { exact: true }).check();
  await form.getByRole('button', { name: 'Confirmar pago simulado', exact: true }).click();
  await expect(detailValue(page, 'Estado del pago')).toHaveText('Rechazado');
  await expect(detailValue(page, 'Estado de reserva')).toHaveText('Pendiente de pago');
  await form.getByLabel('Aprobar pago simulado', { exact: true }).check();
  await form.getByRole('button', { name: 'Confirmar pago simulado', exact: true }).click();
  await expect(detailValue(page, 'Estado de reserva')).toHaveText('Pagada');
  await expect(detailValue(page, 'Estado del pago')).toHaveText('Aprobado');
  await expect(detailValue(page, 'Referencia de pago simulado')).toHaveText(reservation.payment!.id);
  await page.reload();
  await expect(detailValue(page, 'Estado de reserva')).toHaveText('Pagada');
  await expect(detailValue(page, 'Importe del pago simulado')).toContainText('20.000');
  await expect(detailValue(page, 'Referencia de pago simulado')).toHaveText(reservation.payment!.id);
  await expect(page.getByRole('button', { name: 'Confirmar pago simulado', exact: true })).toHaveCount(0);
});

test('E3-12: propietario consulta reservas recibidas y filtra su publicación', async ({ page, request, owner, tenant, space, spaceData, reservation }) => {
  const second = await seedSpace(request, owner, { ...spaceData, name: `${spaceData.name} segunda` });
  await seedReservation(request, tenant, second);
  expect(reservation.space_id).toBe(space.id);
  await loginAs(page, owner);
  await page.getByRole('link', { name: 'Ver todas las reservas recibidas', exact: true }).click();
  await expect(page.getByRole('article', { name: space.name, exact: true })).toBeVisible();
  await expect(page.getByRole('article', { name: second.name, exact: true })).toBeVisible();
  await expect(detailValue(page.getByRole('article', { name: space.name, exact: true }), 'Arrendatario')).toHaveText(tenant.name);
  const filter = page.getByLabel('Filtrar por espacio', { exact: true });
  await filter.selectOption(space.id);
  await expect(page.getByRole('article', { name: space.name, exact: true })).toBeVisible();
  await expect(page.getByRole('article', { name: second.name, exact: true })).toHaveCount(0);
  await filter.selectOption(second.id);
  await expect(page.getByRole('article', { name: second.name, exact: true })).toBeVisible();
  await expect(page.getByRole('article', { name: space.name, exact: true })).toHaveCount(0);
});

test('E3-13: propietario confirma cancelación y persiste reembolso simulado', async ({ page, request, owner, tenant, space, reservation }) => {
  const payment = await request.post(`/api/reservations/${reservation.id}/payment`, {
    headers: headersFor(tenant), data: { result: 'approved' },
  });
  expect(payment.status()).toBe(200);
  expect((await payment.json()).status).toBe('paid');
  await loginAs(page, owner);
  await page.goto(`/#reservas-recibidas/${space.id}`);
  const card = page.getByRole('article', { name: space.name, exact: true });
  await card.getByRole('button', { name: 'Cancelar reserva', exact: true }).click();
  const dialog = page.getByRole('alertdialog', { name: `Cancelar reserva de «${space.name}»`, exact: true });
  await expect(dialog).toContainText('reembolso total simulado');
  await dialog.getByRole('button', { name: 'Volver sin cancelar', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(detailValue(card, 'Pago simulado')).toHaveText('Aprobado');
  await card.getByRole('button', { name: 'Cancelar reserva', exact: true }).click();
  await dialog.getByRole('button', { name: 'Confirmar cancelación', exact: true }).click();
  const history = page.getByRole('region', { name: 'Historial', exact: true });
  await expect(history.getByRole('article', { name: space.name, exact: true })).toBeVisible();
  await expect(detailValue(card, 'Pago simulado')).toHaveText('Reembolsado');
  await expect(card).toContainText('Cancelada');
  await page.reload();
  await expect(history.getByRole('article', { name: space.name, exact: true })).toBeVisible();
  await expect(detailValue(card, 'Referencia de pago simulado')).toHaveText(reservation.payment!.id);
  await expect(card.getByRole('button', { name: 'Cancelar reserva', exact: true })).toHaveCount(0);
  const saved = await request.get(`/api/reservations/${reservation.id}`, { headers: headersFor(tenant) });
  expect(saved.status()).toBe(200);
  const result = await saved.json();
  expect(result.status).toBe('cancelled');
  expect(result.payment).toMatchObject({ id: reservation.payment!.id, status: 'refunded', amount: 20000 });
});
