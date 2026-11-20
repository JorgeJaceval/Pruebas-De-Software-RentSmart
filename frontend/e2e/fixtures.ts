import { randomBytes, randomUUID } from 'node:crypto';
import { test as base, expect } from '@playwright/test';

type Account = { name: string; email: string; password: string };
type Fixtures = { account: Account; registeredAccount: Account; appReady: void };

export const test = base.extend<Fixtures>({
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
  appReady: [async ({ request }, use) => {
    const health = await request.get('/api/health/ready');
    expect(health.ok()).toBeTruthy();
    expect(await health.json()).toEqual({ status: 'ok', database: 'connected' });
    await use();
  }, { auto: true }],
});

export { expect } from '@playwright/test';
