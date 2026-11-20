import { test, expect } from './fixtures';

test('E3-01: registro e inicio de sesión persisten al recargar', async ({ page, account }) => {
  await page.goto('/#registro');
  const registration = page.getByRole('form', { name: 'Crear cuenta' });
  await registration.getByLabel('Nombre', { exact: true }).fill(account.name);
  await registration.getByLabel('Correo electrónico', { exact: true }).fill(account.email);
  await registration.getByLabel('Contraseña', { exact: true }).fill(account.password);
  await registration.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tu cuenta fue creada.' })).toBeVisible();
  await page.locator('#registro').getByRole('link', { name: 'Iniciar sesión', exact: true }).click();
  const login = page.getByRole('form', { name: 'Iniciar sesión' });
  await login.getByLabel('Correo electrónico', { exact: true }).fill(account.email);
  await login.getByLabel('Contraseña', { exact: true }).fill(account.password);
  await login.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toContainText(`Hola, ${account.name}`);
  await expect(page.getByRole('heading', { name: 'Mis espacios', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Mis espacios', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toContainText(`Hola, ${account.name}`);
});

test('E3-02: acceso privado y credenciales incorrectas no conceden sesión', async ({ page, registeredAccount }) => {
  await page.goto('/#mis-espacios');
  await expect(page.getByRole('heading', { name: 'Inicia sesión', exact: true })).toBeVisible();
  const login = page.getByRole('form', { name: 'Iniciar sesión' });
  await login.getByLabel('Correo electrónico', { exact: true }).fill(registeredAccount.email);
  await login.getByLabel('Contraseña', { exact: true }).fill('UnaClaveIncorrecta!123');
  await login.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(login.getByRole('alert')).toHaveText('Correo o contraseña incorrectos.');
  await expect(page.getByRole('navigation', { name: 'Mi cuenta', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Inicia sesión', exact: true })).toBeVisible();
});
