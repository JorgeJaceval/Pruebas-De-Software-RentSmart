import { expect, type Locator, type Page } from '@playwright/test';
import type { SpaceInput } from '../src/spaces';

export async function loginAs(page: Page, account: { email: string; password: string }) {
  await page.goto('/#sesion');
  const form = page.getByRole('form', { name: 'Iniciar sesión' });
  await form.getByLabel('Correo electrónico', { exact: true }).fill(account.email);
  await form.getByLabel('Contraseña', { exact: true }).fill(account.password);
  await form.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Mis espacios', exact: true })).toBeVisible();
}

export function detailValue(scope: Page | Locator, label: string) {
  return scope.getByText(label, { exact: true }).locator('xpath=following-sibling::dd');
}

export async function fillSpace(form: Locator, data: SpaceInput) {
  await form.getByLabel('Nombre del espacio', { exact: true }).fill(data.name);
  await form.getByLabel('Descripción', { exact: true }).fill(data.description);
  await form.getByLabel('Tipo de espacio', { exact: true }).selectOption(data.category);
  await form.getByLabel('Comuna', { exact: true }).fill(data.commune);
  await form.getByLabel('Ubicación referencial', { exact: true }).fill(data.location_reference);
  await form.getByLabel('Capacidad (personas)', { exact: true }).fill(String(data.capacity));
  await form.getByLabel('Precio por hora (CLP)', { exact: true }).fill(String(data.price_per_hour));
  await form.getByLabel('Condiciones de uso', { exact: true }).fill(data.conditions);
  await form.getByLabel('Hora de apertura', { exact: true }).selectOption(String(data.opening_hour));
  await form.getByLabel('Hora de cierre', { exact: true }).selectOption(String(data.closing_hour));
  await form.getByLabel('Foto 1 (URL HTTPS)', { exact: true }).fill(data.photos[0]);
}

export async function fillReservation(page: Page, date: string) {
  const form = page.getByRole('form', { name: 'Solicitar reserva' });
  await form.getByLabel('Fecha', { exact: true }).fill(date);
  await form.getByLabel('Hora de inicio', { exact: true }).selectOption('10');
  await form.getByLabel('Hora de término', { exact: true }).selectOption('12');
  return form;
}
