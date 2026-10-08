import { StrictMode } from 'react';
import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { type Account } from './useSession';

const fetchMock = jest.fn<typeof fetch>();
const user: Account = { id: 'account-1', name: 'Jorge Aceval', email: 'jorge@example.com', is_admin: false };
const password = '  Clave exacta 2026!  ';
const sessionKey = 'rentsmart.session';
let meReply: () => Promise<Response>;
let adminReply: () => Promise<Response>;
let loginReply: () => Promise<Response>;

function response(body: unknown, status = 200): Response {
  return { status, ok: status >= 200 && status < 300, json: async () => body } as Response;
}

function savedSession(remainingMs = 30 * 60 * 1000) {
  return { access_token: 'signed-session-token', expires_at: new Date(Date.now() + remainingMs).toISOString() };
}

function saveSession(extra: Record<string, unknown> = {}, remainingMs?: number) {
  sessionStorage.setItem(sessionKey, JSON.stringify({ ...savedSession(remainingMs), ...extra }));
}

function navigate(hash: string) {
  act(() => {
    window.history.replaceState(null, '', `/#${hash}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

function deferredResponse() {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>((done) => { resolve = done; });
  return { promise, resolve };
}

function fillLogin(email = 'JORGE@example.com  ') {
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: password } });
}

beforeEach(() => {
  sessionStorage.clear();
  window.history.replaceState(null, '', '/#sesion');
  fetchMock.mockReset();
  meReply = async () => response(user);
  adminReply = async () => response({ detail: 'Forbidden' }, 403);
  loginReply = async () => response({ ...savedSession(), token_type: 'bearer', user });
  fetchMock.mockImplementation(async (url) => {
    if (url === '/api/health/ready') return response({ status: 'ok', database: 'connected' });
    if (url === '/api/auth/login') return loginReply();
    if (url === '/api/auth/me') return meReply();
    if (url === '/api/auth/admin-access') return adminReply();
    if (url === '/api/reservations') return response({ items: [], as_of: new Date().toISOString() });
    throw new Error(`Unexpected request: ${String(url)}`);
  });
  globalThis.fetch = fetchMock;
});

afterEach(() => {
  cleanup();
  jest.useRealTimers();
});

it('HU02 CP-01: inicia sesión, conserva solo la sesión y permite navegar a reservas', async () => {
  const issuedSession = savedSession();
  loginReply = async () => response({ ...issuedSession, token_type: 'bearer', user });
  render(<App />);
  fillLogin();
  await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
  expect(await screen.findByRole('heading', { name: 'Mis espacios' })).toBeInTheDocument();
  expect(screen.getByText('Hola, Jorge Aceval')).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
    method: 'POST', body: JSON.stringify({ email: user.email, password }),
  }));
  expect(JSON.parse(sessionStorage.getItem(sessionKey)!)).toEqual(issuedSession);
  expect(screen.queryByRole('link', { name: 'Administración' })).not.toBeInTheDocument();
  const checksBefore = fetchMock.mock.calls.filter(([url]) => url === '/api/auth/me').length;
  await userEvent.click(screen.getByRole('link', { name: 'Mis reservas' }));
  expect(await screen.findByRole('heading', { name: 'Mis reservas' })).toBeInTheDocument();
  expect(await screen.findByText('Aún no tienes reservas.')).toBeInTheDocument();
  expect(fetchMock.mock.calls.filter(([url]) => url === '/api/auth/me').length).toBeGreaterThan(checksBefore);
  expect(fetchMock).toHaveBeenCalledWith('/api/auth/me', expect.objectContaining({
    headers: { Authorization: 'Bearer signed-session-token' },
  }));
});

it('HU02 CP-02: valida campos vacíos y responde igual ante correo o contraseña incorrectos', async () => {
  loginReply = async () => response({ detail: 'Correo o contraseña incorrectos.' }, 401);
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Ingresa un correo electrónico válido.');
  expect(fetchMock.mock.calls.some(([url]) => url === '/api/auth/login')).toBe(false);
  for (const email of ['no-existe@example.com', user.email]) {
    fillLogin(email);
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.');
    expect(sessionStorage.getItem(sessionKey)).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Mis espacios' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toHaveValue('');
  }
});

it('HU02 CP-03: restaura y vuelve a verificar la cuenta al recargar, también en StrictMode', async () => {
  saveSession();
  window.history.replaceState(null, '', '/#inicio');
  const firstCheck = deferredResponse();
  meReply = () => firstCheck.promise;
  const firstMount = render(<StrictMode><App /></StrictMode>);
  expect(screen.queryByText('Hola, Jorge Aceval')).not.toBeInTheDocument();
  await act(async () => firstCheck.resolve(response(user)));
  expect(await screen.findByText('Hola, Jorge Aceval')).toBeInTheDocument();
  navigate('sesion');
  expect(await screen.findByRole('heading', { name: 'Sesión iniciada' })).toBeInTheDocument();
  firstMount.unmount();

  window.history.replaceState(null, '', '/#mis-reservas');
  const reloadedCheck = deferredResponse();
  meReply = () => reloadedCheck.promise;
  render(<StrictMode><App /></StrictMode>);
  expect(screen.getByText('Comprobando tu sesión…')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Mis reservas' })).not.toBeInTheDocument();
  await act(async () => reloadedCheck.resolve(response({ ...user, name: 'Jorge actualizado' })));
  expect(await screen.findByRole('heading', { name: 'Mis reservas' })).toBeInTheDocument();
  expect(screen.getByText('Hola, Jorge actualizado')).toBeInTheDocument();
});

it('HU02 CP-04: cerrar sesión bloquea volver a una vista privada y descarta respuestas tardías', async () => {
  saveSession();
  window.history.replaceState(null, '', '/#mis-espacios');
  render(<App />);
  await screen.findByRole('heading', { name: 'Mis espacios' });
  const delayed = deferredResponse();
  meReply = () => delayed.promise;
  navigate('mis-reservas');
  expect(screen.queryByRole('heading', { name: 'Mis espacios' })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
  expect(await screen.findByRole('form', { name: 'Iniciar sesión' })).toBeInTheDocument();
  expect(screen.getByText('Cerraste tu sesión.')).toBeInTheDocument();
  await act(async () => delayed.resolve(response(user)));
  navigate('mis-espacios');
  expect(screen.getByRole('form', { name: 'Iniciar sesión' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Mis espacios' })).not.toBeInTheDocument();
  expect(screen.queryByText('Hola, Jorge Aceval')).not.toBeInTheDocument();
  expect(sessionStorage.getItem(sessionKey)).toBeNull();
});

it('HU02 CP-05: solicita login ante sesión ausente, ilegible o token alterado rechazado por el servidor', async () => {
  for (const stored of [null, '{invalid-json', JSON.stringify({ ...savedSession(), access_token: 'tampered' })]) {
    sessionStorage.clear();
    if (stored) sessionStorage.setItem(sessionKey, stored);
    window.history.replaceState(null, '', '/#mis-espacios');
    meReply = async () => response({ detail: 'Unauthenticated' }, 401);
    const mounted = render(<App />);
    expect(await screen.findByRole('form', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Mis espacios' })).not.toBeInTheDocument();
    expect(sessionStorage.getItem(sessionKey)).toBeNull();
    mounted.unmount();
  }
});

it('HU02 CP-06: vence la sesión activa y limpia una sesión rechazada con 401', async () => {
  jest.useFakeTimers();
  saveSession({}, 1_000);
  window.history.replaceState(null, '', '/#mis-espacios');
  const first = render(<App />);
  await act(async () => { await Promise.resolve(); });
  expect(screen.getByRole('heading', { name: 'Mis espacios' })).toBeInTheDocument();
  await act(async () => { jest.advanceTimersByTime(1_001); });
  expect(screen.getByText('Tu sesión venció. Inicia sesión nuevamente.')).toBeInTheDocument();
  expect(screen.getByRole('form', { name: 'Iniciar sesión' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Mis espacios' })).not.toBeInTheDocument();
  expect(sessionStorage.getItem(sessionKey)).toBeNull();
  first.unmount();
  jest.useRealTimers();

  saveSession();
  meReply = async () => response({ detail: 'Session expired' }, 401);
  render(<App />);
  expect(await screen.findByRole('form', { name: 'Iniciar sesión' })).toBeInTheDocument();
  expect(sessionStorage.getItem(sessionKey)).toBeNull();
});

it('HU02 CP-07: un rol de administrador guardado en el navegador no permite acceder a administración', async () => {
  saveSession({ user: { ...user, is_admin: true }, is_admin: true, role: 'admin' });
  window.history.replaceState(null, '', '/#administracion');
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Acceso restringido' })).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Tu cuenta no tiene acceso a la administración.');
  expect(screen.queryByRole('link', { name: 'Administración' })).not.toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith('/api/auth/admin-access', expect.objectContaining({
    headers: { Authorization: 'Bearer signed-session-token' },
  }));
  expect(Object.keys(JSON.parse(sessionStorage.getItem(sessionKey)!)).sort()).toEqual(['access_token', 'expires_at']);
});

it('HU02 CP-08: habilita administración únicamente con autorización del servidor', async () => {
  const administrator = { ...user, is_admin: true };
  saveSession({ is_admin: false });
  window.history.replaceState(null, '', '/#mis-espacios');
  meReply = async () => response(administrator);
  adminReply = async () => response(administrator);
  render(<App />);
  await screen.findByRole('heading', { name: 'Mis espacios' });
  await userEvent.click(screen.getByRole('link', { name: 'Administración' }));
  expect(await screen.findByRole('heading', { name: 'Administración' })).toBeInTheDocument();
  expect(screen.getByText('La gestión administrativa estará disponible próximamente.')).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith('/api/auth/admin-access', expect.anything());
});

it('HU02 CP-03: conserva el token ante un error de red y muestra la vista privada solo tras revalidar', async () => {
  saveSession();
  const stored = sessionStorage.getItem(sessionKey);
  window.history.replaceState(null, '', '/#mis-espacios');
  meReply = async () => { throw new TypeError('Failed to fetch'); };
  render(<App />);
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos comprobar tu sesión. Vuelve a intentarlo.');
  expect(screen.queryByRole('heading', { name: 'Mis espacios' })).not.toBeInTheDocument();
  expect(sessionStorage.getItem(sessionKey)).toBe(stored);
  meReply = async () => response(user);
  await userEvent.click(screen.getByRole('button', { name: 'Volver a comprobar sesión' }));
  expect(await screen.findByRole('heading', { name: 'Mis espacios' })).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText('Hola, Jorge Aceval')).toBeInTheDocument());
});
