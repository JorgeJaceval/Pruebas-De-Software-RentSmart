import { randomBytes, randomUUID } from 'node:crypto';
import { test as base, expect, type APIRequestContext } from '@playwright/test';
import type { Space, SpaceInput } from '../src/spaces';
import type { Reservation } from '../src/reservations';

type Account = { name: string; email: string; password: string };
export type SeededAccount = Account & { id: string; token: string };
type Fixtures = {
  account: Account; registeredAccount: Account; appReady: void;
  owner: SeededAccount; tenant: SeededAccount; spaceData: SpaceInput;
  space: Space; reservation: Reservation;
};

export const photoURL = 'https://e2e-images.invalid/space.svg';
export const headersFor = (account: SeededAccount) => ({ Authorization: `Bearer ${account.token}` });

export async function seedAccount(request: APIRequestContext): Promise<SeededAccount> {
  const id = randomUUID();
  const data = { name: `E2E ${id.slice(0, 8)}`, email: `e2e-${id}@example.com`,
    password: `Aa9!${randomBytes(18).toString('hex')}` };
  const registration = await request.post('/api/auth/register', { data });
  expect(registration.status()).toBe(201);
  const registered = await registration.json();
  const login = await request.post('/api/auth/login', { data: { email: data.email, password: data.password } });
  expect(login.status()).toBe(200);
  const session = await login.json();
  return { ...data, id: registered.id, token: session.access_token };
}

export async function seedSpace(request: APIRequestContext, owner: SeededAccount, data: SpaceInput): Promise<Space> {
  const response = await request.post('/api/spaces', { headers: headersFor(owner), data });
  expect(response.status()).toBe(201);
  return response.json();
}

export function futureDate(): string {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(Date.now() + 2 * 86_400_000)).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export async function seedReservation(request: APIRequestContext, tenant: SeededAccount, space: Space): Promise<Reservation> {
  const response = await request.post('/api/reservations', { headers: headersFor(tenant),
    data: { space_id: space.id, date: futureDate(), start_hour: 10, end_hour: 12 } });
  expect(response.status()).toBe(201);
  return response.json();
}

export const test = base.extend<Fixtures>({
  page: async ({ page }, use) => {
    // Isolate only a fictitious external image; application/API traffic stays real.
    await page.route(photoURL, (route) => route.fulfill({ contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="teal"/></svg>' }));
    await use(page);
  },
  // Each test gets a new context and independent fictitious account, including repeated runs.
  account: async ({}, use) => {
    const id = randomUUID();
    await use({ name: `E2E ${id.slice(0, 8)}`, email: `e2e-${id}@example.com`,
      password: `Aa9!${randomBytes(18).toString('hex')}` });
  },
  registeredAccount: async ({ request, account }, use) => {
    // API is only used for setup; the test still performs the evaluated action in the UI.
    const response = await request.post('/api/auth/register', { data: account });
    expect(response.status()).toBe(201);
    await use(account);
    // No account deletion/reset endpoint in the app: the launcher destroys the private DB volume.
  },
  owner: async ({ request }, use) => { await use(await seedAccount(request)); },
  tenant: async ({ request }, use) => { await use(await seedAccount(request)); },
  spaceData: async ({}, use) => {
    const id = randomUUID().slice(0, 8);
    await use({ name: `Sala E2E ${id}`, description: `Espacio ficticio independiente de pruebas ${id}.`,
      category: 'meeting_room', commune: `Comuna E2E ${id}`, location_reference: 'Referencia ficticia de pruebas',
      capacity: 8, price_per_hour: 10000, conditions: 'Respetar el horario y cuidar el espacio.',
      photos: [photoURL], opening_hour: 9, closing_hour: 18 });
  },
  space: async ({ request, owner, spaceData }, use) => { await use(await seedSpace(request, owner, spaceData)); },
  reservation: async ({ request, tenant, space }, use) => { await use(await seedReservation(request, tenant, space)); },
  appReady: [async ({ request }, use) => {
    const health = await request.get('/api/health/ready');
    expect(health.ok()).toBeTruthy();
    expect(await health.json()).toEqual({ status: 'ok', database: 'connected' });
    await use();
  }, { auto: true }],
});

export { expect } from '@playwright/test';
