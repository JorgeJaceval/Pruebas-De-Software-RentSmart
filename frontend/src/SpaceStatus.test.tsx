import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { type Space, type SpaceInput } from './spaces';

const fetchMock = jest.fn<typeof fetch>();
const sessionKey = 'rentsmart.session';
const account = { id: '03fdcce6-6305-42ba-96d3-04d19e5c962c', name: 'Jorge Aceval', email: 'jorge@example.com', is_admin: false };
const spaceId = '76b1a2f4-d706-431a-b887-2d7e8a7f8e58';
const original: SpaceInput = {
  name: 'Sala de ideas', description: 'Una sala tranquila para reuniones y trabajo en equipo.',
  category: 'meeting_room', commune: 'Providencia', location_reference: 'Cerca del metro Los Leones',
  capacity: 8, price_per_hour: 12_000, conditions: 'Mantener el espacio limpio y respetar el horario.',
  photos: ['https://example.com/sala.jpg'], opening_hour: 9, closing_hour: 18,
};
let stored: Space;
let getReply: () => Promise<Response>;
let patchReply: (isActive: boolean) => Promise<Response>;

function response(body: unknown, status = 200): Response {
  return { status, ok: status >= 200 && status < 300, json: async () => body } as Response;
}

function statusBody() {
  return { id: stored.id, is_active: stored.is_active, is_withdrawn: stored.is_withdrawn };
}

function saveSession() {
  sessionStorage.setItem(sessionKey, JSON.stringify({ access_token: 'owner-session-token',
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() }));
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

function patchCalls() {
  return fetchMock.mock.calls.filter(([path, options]) => path === `/api/spaces/${spaceId}/status` && options?.method === 'PATCH');
}

beforeEach(() => {
  sessionStorage.clear();
  saveSession();
  window.history.replaceState(null, '', `/#espacio/${spaceId}`);
  stored = { ...original, id: spaceId, owner_id: account.id, is_active: true, is_withdrawn: false };
  getReply = async () => response(stored);
  patchReply = async (isActive) => {
    stored = { ...stored, is_active: isActive };
    return response(statusBody());
  };
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (path, options) => {
    if (path === '/api/health/ready') return response({ status: 'ok', database: 'connected' });
    if (path === '/api/auth/me') return response(account);
    if (path === '/api/reservations') return response({ items: [], as_of: new Date().toISOString() });
    if (path === `/api/spaces/${spaceId}/status`) {
      return patchReply((JSON.parse(options!.body as string) as { is_active: boolean }).is_active);
    }
    if (path === `/api/spaces/${spaceId}`) {
      if (options?.method === 'PUT') {
        stored = { ...stored, ...JSON.parse(options.body as string) as SpaceInput };
        return response(stored);
      }
      return getReply();
    }
    throw new Error(`Unexpected request: ${String(path)}`);
  });
  globalThis.fetch = fetchMock;
});

afterEach(() => cleanup());

it('HU05 CP-01: desactiva solo tras confirmación, elimina avisos anteriores y conserva el estado al recargar', async () => {
  window.history.replaceState(null, '', `/#editar-espacio/${spaceId}`);
  const first = render(<App />);
  await screen.findByRole('form', { name: 'Editar espacio' });
  await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await screen.findByRole('heading', { name: original.name });
  expect(screen.getByText('Los cambios fueron guardados.')).toBeInTheDocument();
  const delayed = deferredResponse();
  patchReply = () => delayed.promise;
  const detailReads = fetchMock.mock.calls.filter(([path, options]) => path === `/api/spaces/${spaceId}` && options?.method !== 'PUT').length;
  await userEvent.click(screen.getByRole('button', { name: 'Desactivar publicación' }));
  expect(screen.getByText('Publicación activa')).toBeInTheDocument();
  expect(screen.queryByText('La publicación fue desactivada.')).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Editar espacio' })).not.toBeInTheDocument();
  stored = { ...stored, is_active: false };
  await act(async () => delayed.resolve(response(statusBody())));
  expect(await screen.findByText('La publicación fue desactivada.')).toBeInTheDocument();
  expect(screen.getByText('Publicación inactiva')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Activar publicación' })).toBeEnabled();
  expect(screen.getByRole('link', { name: 'Editar espacio' })).toBeInTheDocument();
  expect(screen.queryByText('Los cambios fueron guardados.')).not.toBeInTheDocument();
  expect(patchCalls()).toHaveLength(1);
  expect(patchCalls()[0][1]).toEqual(expect.objectContaining({
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner-session-token' },
    body: JSON.stringify({ is_active: false }),
  }));
  expect(fetchMock.mock.calls.filter(([path, options]) => path === `/api/spaces/${spaceId}` && options?.method !== 'PUT')).toHaveLength(detailReads);
  first.unmount();
  render(<App />);
  await screen.findByRole('heading', { name: original.name });
  expect(screen.getByText('Publicación inactiva')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Activar publicación' })).toBeInTheDocument();
  expect(screen.queryByText('La publicación fue desactivada.')).not.toBeInTheDocument();
});

it('HU05 CP-02: conserva el estado ante rechazo de validación y activa con respuesta confirmada', async () => {
  stored = { ...stored, is_active: false };
  patchReply = async () => response({ detail: 'Datos incompletos.', errors: { capacity: 'Capacidad inválida.' } }, 422);
  render(<App />);
  await screen.findByRole('heading', { name: original.name });
  await userEvent.click(screen.getByRole('button', { name: 'Activar publicación' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Revisa los datos del espacio antes de volver a intentarlo.');
  expect(screen.getByText('Publicación inactiva')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Editar espacio' })).toBeInTheDocument();
  expect(screen.queryByText('La publicación fue activada.')).not.toBeInTheDocument();
  patchReply = async (isActive) => { stored = { ...stored, is_active: isActive }; return response(statusBody()); };
  await userEvent.click(screen.getByRole('button', { name: 'Activar publicación' }));
  expect(await screen.findByText('La publicación fue activada.')).toBeInTheDocument();
  expect(screen.getByText('Publicación activa')).toBeInTheDocument();
  expect(JSON.parse(patchCalls()[1][1]!.body as string)).toEqual({ is_active: true });
});

it('HU05 CP-03: bloquea la activación de una retirada administrativa, también ante un GET antiguo', async () => {
  stored = { ...stored, is_active: false, is_withdrawn: true };
  const first = render(<App />);
  await screen.findByRole('heading', { name: original.name });
  expect(screen.getByText('Deshabilitada por administración')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Activar publicación' })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('link', { name: 'Editar espacio' }));
  await screen.findByRole('form', { name: 'Editar espacio' });
  expect(screen.getByText('Esta publicación fue deshabilitada por administración. Editarla no permite activarla.')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await screen.findByRole('heading', { name: original.name });
  expect(screen.getByText('Deshabilitada por administración')).toBeInTheDocument();
  expect(stored.is_withdrawn).toBe(true);
  first.unmount();

  stored = { ...stored, is_withdrawn: false };
  patchReply = async () => response({ detail: 'Retirada por administración.' }, 409);
  render(<App />);
  await screen.findByRole('heading', { name: original.name });
  await userEvent.click(screen.getByRole('button', { name: 'Activar publicación' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Esta publicación fue deshabilitada por administración. No puedes activarla.');
  expect(screen.getByText('Deshabilitada por administración')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Activar publicación' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Editar espacio' })).toBeInTheDocument();
  expect(screen.queryByText('La publicación fue activada.')).not.toBeInTheDocument();
  expect(patchCalls()).toHaveLength(1);
});

it('HU05 CP-04: protege las acciones sin sesión, ante GET ajeno o inexistente y ante PATCH 401', async () => {
  sessionStorage.clear();
  const guest = render(<App />);
  expect(await screen.findByRole('form', { name: 'Iniciar sesión' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Desactivar publicación' })).not.toBeInTheDocument();
  guest.unmount();
  for (const status of [403, 404]) {
    saveSession();
    getReply = async () => response({ detail: 'Access denied' }, status);
    const mounted = render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent(status === 403 ?
      'Tu cuenta no tiene acceso a este espacio.' : 'No encontramos este espacio.');
    expect(screen.queryByRole('button', { name: 'Desactivar publicación' })).not.toBeInTheDocument();
    mounted.unmount();
  }
  expect(patchCalls()).toHaveLength(0);
  getReply = async () => response(stored);
  patchReply = async () => response({ detail: 'Expired session' }, 401);
  saveSession();
  render(<App />);
  await screen.findByRole('heading', { name: original.name });
  await userEvent.click(screen.getByRole('button', { name: 'Desactivar publicación' }));
  expect(await screen.findByRole('form', { name: 'Iniciar sesión' })).toBeInTheDocument();
  expect(sessionStorage.getItem(sessionKey)).toBeNull();
  expect(screen.queryByText('La publicación fue desactivada.')).not.toBeInTheDocument();
});

it('HU05 CP-08: evita doble envío, conserva el estado ante 503 o red y permite reintentar', async () => {
  const delayed = deferredResponse();
  patchReply = () => delayed.promise;
  render(<App />);
  await screen.findByRole('heading', { name: original.name });
  const button = screen.getByRole('button', { name: 'Desactivar publicación' });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(patchCalls()).toHaveLength(1);
  expect(screen.getByRole('button', { name: 'Desactivando publicación…' })).toBeDisabled();
  expect(screen.getByText('Publicación activa')).toBeInTheDocument();
  await act(async () => delayed.resolve(response({ detail: 'Unavailable' }, 503)));
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cambiar el estado de la publicación.');
  patchReply = async () => { throw new TypeError('Failed to fetch'); };
  await userEvent.click(screen.getByRole('button', { name: 'Desactivar publicación' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectar con el servicio.');
  expect(screen.getByText('Publicación activa')).toBeInTheDocument();
  expect(screen.queryByText('La publicación fue desactivada.')).not.toBeInTheDocument();
  patchReply = async () => response({ id: 'bb3ee9a5-ed21-4087-a0c2-7764a80e9caf', is_active: false, is_withdrawn: false });
  await userEvent.click(screen.getByRole('button', { name: 'Desactivar publicación' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos confirmar el cambio.');
  expect(screen.getByText('Publicación activa')).toBeInTheDocument();
  expect(screen.queryByText('La publicación fue desactivada.')).not.toBeInTheDocument();
  patchReply = async (isActive) => { stored = { ...stored, is_active: isActive }; return response(statusBody()); };
  await userEvent.click(screen.getByRole('button', { name: 'Desactivar publicación' }));
  expect(await screen.findByText('La publicación fue desactivada.')).toBeInTheDocument();
  expect(screen.getByText('Publicación inactiva')).toBeInTheDocument();
  expect(patchCalls()).toHaveLength(4);
});

it('HU05 CP-08: descarta respuestas tardías después de navegar o cerrar sesión', async () => {
  for (const exit of ['navigate', 'logout']) {
    saveSession();
    window.history.replaceState(null, '', `/#espacio/${spaceId}`);
    const delayed = deferredResponse();
    patchReply = () => delayed.promise;
    const mounted = render(<App />);
    await screen.findByRole('heading', { name: original.name });
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar publicación' }));
    if (exit === 'navigate') {
      navigate('mis-reservas');
      await screen.findByRole('heading', { name: 'Mis reservas' });
    } else {
      await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
      await screen.findByRole('form', { name: 'Iniciar sesión' });
    }
    await act(async () => delayed.resolve(response({ id: spaceId, is_active: false, is_withdrawn: false })));
    expect(window.location.hash).toBe(exit === 'navigate' ? '#mis-reservas' : '#sesion');
    expect(screen.queryByText('La publicación fue desactivada.')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: original.name })).not.toBeInTheDocument();
    if (exit === 'logout') expect(sessionStorage.getItem(sessionKey)).toBeNull();
    mounted.unmount();
  }
  expect(patchCalls()).toHaveLength(2);
});
