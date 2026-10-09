import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { type Space, type SpaceInput } from './spaces';

const fetchMock = jest.fn<typeof fetch>();
const sessionKey = 'rentsmart.session';
const account = { id: '03fdcce6-6305-42ba-96d3-04d19e5c962c', name: 'Jorge Aceval', email: 'jorge@example.com', is_admin: false };
const spaceId = '76b1a2f4-d706-431a-b887-2d7e8a7f8e58';
const input: SpaceInput = {
  name: 'Sala de ideas', description: 'Una sala tranquila para reuniones y trabajo en equipo.',
  category: 'meeting_room', commune: 'Providencia', location_reference: 'Cerca del metro Los Leones',
  capacity: 8, price_per_hour: 12_000, conditions: 'Mantener el espacio limpio y respetar el horario.',
  photos: ['https://example.com/sala.jpg'], opening_hour: 9, closing_hour: 18,
};
const original: Space = { ...input, id: spaceId, owner_id: account.id, is_active: true, is_withdrawn: false };
const inactive: Space = { ...original, id: '86b1a2f4-d706-431a-b887-2d7e8a7f8e58', name: 'Estudio inactivo', is_active: false };
const withdrawn: Space = { ...original, id: '96b1a2f4-d706-431a-b887-2d7e8a7f8e58', name: 'Sala retirada', is_active: false, is_withdrawn: true };
let spaces: Space[];
let listReply: () => Promise<Response>;
let deleteReply: (id: string) => Promise<Response>;
let patchReply: (id: string, active: boolean) => Promise<Response>;

function response(body: unknown, status = 200): Response {
  return { status, ok: status >= 200 && status < 300, json: async () => body } as Response;
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

function delayedResponse() {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>((done) => { resolve = done; });
  return { promise, resolve };
}

function calls(path: string, method?: string) {
  return fetchMock.mock.calls.filter(([request, options]) => request === path && options?.method === method);
}

function card(name = original.name) {
  return within(screen.getByRole('article', { name }));
}

beforeEach(() => {
  sessionStorage.clear();
  saveSession();
  window.history.replaceState(null, '', '/#mis-espacios');
  spaces = [{ ...original }];
  listReply = async () => response(spaces);
  deleteReply = async (id) => {
    spaces = spaces.filter((space) => space.id !== id);
    return response(null, 204);
  };
  patchReply = async (id, active) => {
    spaces = spaces.map((space) => space.id === id ? { ...space, is_active: active } : space);
    const saved = spaces.find((space) => space.id === id)!;
    return response({ id: saved.id, is_active: saved.is_active, is_withdrawn: saved.is_withdrawn });
  };
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (path, options) => {
    if (path === '/api/health/ready') return response({ status: 'ok', database: 'connected' });
    if (path === '/api/auth/me') return response(account);
    if (path === '/api/spaces/mine') return listReply();
    if (path === '/api/reservations') return response({ items: [], as_of: new Date().toISOString() });
    if (path === '/api/spaces' && options?.method === 'POST') {
      const created = { ...original, ...JSON.parse(options.body as string) as SpaceInput };
      spaces = [...spaces, created];
      return response(created, 201);
    }
    const match = /^\/api\/spaces\/([^/]+)(\/status)?$/.exec(String(path));
    if (match) {
      const id = match[1];
      if (match[2]) return patchReply(id, (JSON.parse(options!.body as string) as { is_active: boolean }).is_active);
      if (options?.method === 'DELETE') return deleteReply(id);
      if (options?.method === 'PUT') spaces = spaces.map((space) => space.id === id ? { ...space, ...JSON.parse(options.body as string) as SpaceInput } : space);
      return response(spaces.find((space) => space.id === id));
    }
    throw new Error(`Unexpected request: ${String(path)}`);
  });
  globalThis.fetch = fetchMock;
});

afterEach(() => cleanup());

it('HU07 CP-01: muestra todos los estados propios, precio, foto y acciones; reservas queda pendiente', async () => {
  spaces = [{ ...original }, { ...inactive, photos: ['http://example.com/legacy.jpg'] }, { ...withdrawn, photos: [] }];
  render(<App />);
  await screen.findByRole('heading', { name: original.name });
  expect(screen.getAllByRole('article')).toHaveLength(3);
  expect(card().getByText('Publicación activa')).toBeInTheDocument();
  expect(card(inactive.name).getByText('Publicación inactiva')).toBeInTheDocument();
  expect(card(withdrawn.name).getByText('Deshabilitada por administración')).toBeInTheDocument();
  expect(card(withdrawn.name).queryByRole('button', { name: 'Activar publicación' })).not.toBeInTheDocument();
  await waitFor(() => expect(card(inactive.name).getByRole('button', { name: 'Activar publicación' })).toBeEnabled());
  expect(card().getByText(/12\.000.*CLP/)).toBeInTheDocument();
  expect(card().getByRole('link', { name: 'Ver espacio' })).toHaveAttribute('href', `#espacio/${spaceId}`);
  expect(card().getByRole('link', { name: 'Editar espacio' })).toHaveAttribute('href', `#editar-espacio/${spaceId}`);
  expect(card().getByRole('button', { name: 'Consultar reservas' })).toBeDisabled();
  expect(card().getByText('Consulta de reservas próximamente.')).toBeInTheDocument();
  fireEvent.error(card().getByRole('img', { name: `Foto de ${original.name}` }));
  expect(card().getByRole('img', { name: `Foto de ${original.name}: foto no disponible` })).toBeInTheDocument();
  expect(card(inactive.name).getByRole('img', { name: `Foto de ${inactive.name}: foto no disponible` })).toBeInTheDocument();
  expect(card(withdrawn.name).getByRole('img', { name: `Foto de ${withdrawn.name}: foto no disponible` })).toBeInTheDocument();
  expect(document.querySelector('img[src^="http:"]')).not.toBeInTheDocument();
  expect(calls('/api/spaces/mine')).toHaveLength(1);
  expect(calls('/api/spaces/mine')[0][1]?.headers).toEqual({ Authorization: 'Bearer owner-session-token' });
  expect(calls('/api/spaces/mine')[0][1]?.body).toBeUndefined();
  await userEvent.click(card(inactive.name).getByRole('link', { name: 'Editar espacio' }));
  await screen.findByRole('form', { name: 'Editar espacio' });
  expect(screen.getByLabelText('Foto 1 (URL HTTPS)')).toHaveValue('http://example.com/legacy.jpg');
  fireEvent.change(screen.getByLabelText('Foto 1 (URL HTTPS)'), { target: { value: 'https://example.com/reparada.jpg' } });
  await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await screen.findByText('Los cambios fueron guardados.');
  await userEvent.click(screen.getByRole('link', { name: 'Volver a mis espacios' }));
  await screen.findByRole('heading', { name: inactive.name });
  expect(card(inactive.name).getByRole('img', { name: `Foto de ${inactive.name}` })).toHaveAttribute('src', 'https://example.com/reparada.jpg');
});

it('HU07 CP-03: vacío explica cómo empezar y ofrece publicar', async () => {
  spaces = [];
  render(<App />);
  expect(await screen.findByText('Todavía no tienes espacios publicados.')).toBeInTheDocument();
  expect(screen.getByText('Publica tu primer espacio para compartirlo y administrarlo desde aquí.')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.queryByRole('article')).not.toBeInTheDocument();
  expect(within(screen.getByRole('region', { name: 'Mis espacios' })).getByRole('link', { name: 'Publicar espacio' })).toHaveAttribute('href', '#publicar-espacio');
});

it('HU07 CP-04: exige sesión y limpia datos privados cuando la consulta recibe 401', async () => {
  sessionStorage.clear();
  const guest = render(<App />);
  expect(await screen.findByRole('form', { name: 'Iniciar sesión' })).toBeInTheDocument();
  expect(calls('/api/spaces/mine')).toHaveLength(0);
  guest.unmount();
  saveSession();
  listReply = async () => response({ detail: 'Expired session' }, 401);
  render(<App />);
  expect(await screen.findByText('Tu sesión venció. Inicia sesión nuevamente.')).toBeInTheDocument();
  expect(screen.queryByRole('article')).not.toBeInTheDocument();
  expect(sessionStorage.getItem(sessionKey)).toBeNull();
});

it('HU07 CP-04/05: carga, error y vacío son distintos; rechaza respuestas ajenas, duplicadas o inválidas y permite reintentar', async () => {
  const pending = delayedResponse();
  listReply = () => pending.promise;
  const first = render(<App />);
  expect(await screen.findByText('Cargando tus espacios…')).toBeInTheDocument();
  expect(screen.queryByText('Todavía no tienes espacios publicados.')).not.toBeInTheDocument();
  await act(async () => pending.resolve(response({ errors: { form: 'Unavailable' } }, 503)));
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar tus espacios.');
  listReply = async () => { throw new TypeError('Failed to fetch'); };
  await userEvent.click(screen.getByRole('button', { name: 'Volver a cargar mis espacios' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar tus espacios.');
  expect(screen.queryByText('Todavía no tienes espacios publicados.')).not.toBeInTheDocument();
  first.unmount();
  for (const body of [
    [original, { ...inactive, owner_id: 'another-account' }],
    [original, { ...original, id: spaceId.toUpperCase() }],
    [original, { ...inactive, price_per_hour: 'invalid' }],
    [original, { ...inactive, photos: [42] }],
    { spaces: [original] },
  ]) {
    listReply = async () => response(body);
    const mounted = render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar tus espacios.');
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    listReply = async () => response([original]);
    await userEvent.click(screen.getByRole('button', { name: 'Volver a cargar mis espacios' }));
    expect(await screen.findByRole('heading', { name: original.name })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    mounted.unmount();
  }
});

it('HU07 CP-06: cambia estado sólo tras confirmación, bloquea envíos y otras tarjetas, y conserva el estado ante fallo', async () => {
  spaces = [{ ...original }, { ...inactive }];
  const pending = delayedResponse();
  patchReply = () => pending.promise;
  render(<App />);
  await screen.findByRole('heading', { name: original.name });
  const button = card().getByRole('button', { name: 'Desactivar publicación' });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(calls(`/api/spaces/${spaceId}/status`, 'PATCH')).toHaveLength(1);
  expect(card().getByText('Publicación activa')).toBeInTheDocument();
  expect(card().getByRole('button', { name: 'Eliminar espacio' })).toBeDisabled();
  expect(card(inactive.name).getByRole('button', { name: 'Activar publicación' })).toBeDisabled();
  expect(card().queryByRole('link', { name: 'Editar espacio' })).not.toBeInTheDocument();
  await act(async () => pending.resolve(response({ detail: 'Unavailable' }, 503)));
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cambiar el estado');
  expect(card().getByText('Publicación activa')).toBeInTheDocument();
  patchReply = async (id, active) => response({ id, is_active: active, is_withdrawn: false });
  await userEvent.click(card().getByRole('button', { name: 'Desactivar publicación' }));
  expect(await card().findByText('Publicación inactiva')).toBeInTheDocument();
  expect(card().getByText('La publicación fue desactivada.')).toBeInTheDocument();
  await waitFor(() => expect(card(inactive.name).getByRole('button', { name: 'Activar publicación' })).toBeEnabled());
});

it('HU07 CP-06: cancelar conserva, el historial rechaza borrado y desactivar requiere acción explícita', async () => {
  spaces = [{ ...original }, { ...inactive }];
  deleteReply = async () => response({ errors: { form: 'History' } }, 409);
  render(<App />);
  await screen.findByRole('heading', { name: original.name });
  await userEvent.click(card().getByRole('button', { name: 'Eliminar espacio' }));
  expect(card().getByRole('button', { name: 'Desactivar publicación' })).toBeDisabled();
  expect(card(inactive.name).getByRole('button', { name: 'Eliminar espacio' })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(calls(`/api/spaces/${spaceId}`, 'DELETE')).toHaveLength(0);
  await userEvent.click(card().getByRole('button', { name: 'Eliminar espacio' }));
  await userEvent.click(screen.getByRole('button', { name: 'Eliminar definitivamente' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Este espacio tiene reservas o pagos asociados y debe conservarse.');
  expect(calls(`/api/spaces/${spaceId}/status`, 'PATCH')).toHaveLength(0);
  await userEvent.click(screen.getByRole('button', { name: 'Desactivar y conservar' }));
  expect(await screen.findByText('La publicación fue desactivada; el espacio y su historial se conservaron.')).toBeInTheDocument();
  expect(card().getByText('Publicación inactiva')).toBeInTheDocument();
  expect(screen.getAllByRole('article')).toHaveLength(2);
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  await waitFor(() => expect(card(inactive.name).getByRole('button', { name: 'Eliminar espacio' })).toBeEnabled());
});

it('HU07 CP-06: elimina sólo tras 204 y actualiza lista y vacío, conservando el aviso', async () => {
  const pending = delayedResponse();
  deleteReply = () => pending.promise;
  render(<App />);
  await screen.findByRole('heading', { name: original.name });
  await userEvent.click(card().getByRole('button', { name: 'Eliminar espacio' }));
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar definitivamente' }));
  expect(screen.getByRole('article', { name: original.name })).toBeInTheDocument();
  await act(async () => pending.resolve(response(null, 204)));
  expect(await screen.findByText('Tu espacio fue eliminado.')).toBeInTheDocument();
  expect(screen.getByText('Todavía no tienes espacios publicados.')).toBeInTheDocument();
  expect(screen.queryByRole('article')).not.toBeInTheDocument();
  expect(window.location.hash).toBe('#mis-espacios');
  expect(calls(`/api/spaces/${spaceId}`, 'DELETE')).toHaveLength(1);
});

it('HU07 CP-06: vuelve a consultar tras publicación y edición y al recargar la página', async () => {
  spaces = [];
  const first = render(<App />);
  await screen.findByText('Todavía no tienes espacios publicados.');
  await userEvent.click(within(screen.getByRole('region', { name: 'Mis espacios' })).getByRole('link', { name: 'Publicar espacio' }));
  await screen.findByRole('form', { name: 'Publicar espacio' });
  for (const [label, value] of [
    ['Nombre del espacio', input.name], ['Descripción', input.description], ['Tipo de espacio', input.category],
    ['Comuna', input.commune], ['Ubicación referencial', input.location_reference], ['Capacidad (personas)', String(input.capacity)],
    ['Precio por hora (CLP)', String(input.price_per_hour)], ['Condiciones de uso', input.conditions], ['Foto 1 (URL HTTPS)', input.photos[0]],
  ]) fireEvent.change(screen.getByLabelText(label), { target: { value } });
  await userEvent.click(screen.getByRole('button', { name: 'Publicar espacio' }));
  await screen.findByText('Tu espacio fue publicado.');
  await userEvent.click(screen.getByRole('link', { name: 'Volver a mis espacios' }));
  await screen.findByRole('heading', { name: original.name });
  expect(calls('/api/spaces/mine')).toHaveLength(2);
  await userEvent.click(card().getByRole('link', { name: 'Editar espacio' }));
  await screen.findByRole('form', { name: 'Editar espacio' });
  fireEvent.change(screen.getByLabelText('Nombre del espacio'), { target: { value: 'Sala actualizada' } });
  await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await screen.findByText('Los cambios fueron guardados.');
  await userEvent.click(screen.getByRole('link', { name: 'Volver a mis espacios' }));
  await screen.findByRole('heading', { name: 'Sala actualizada' });
  expect(screen.queryByRole('heading', { name: original.name })).not.toBeInTheDocument();
  expect(calls('/api/spaces/mine')).toHaveLength(3);
  first.unmount();
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Sala actualizada' })).toBeInTheDocument();
  expect(calls('/api/spaces/mine')).toHaveLength(4);
});

it('HU07 CP-04/05: aborta la consulta y descarta datos tardíos tras navegar o cerrar sesión', async () => {
  for (const exit of ['navigate', 'logout']) {
    saveSession();
    window.history.replaceState(null, '', '/#mis-espacios');
    const pending = delayedResponse();
    listReply = () => pending.promise;
    const mounted = render(<App />);
    await screen.findByText('Cargando tus espacios…');
    const signal = calls('/api/spaces/mine').at(-1)![1]!.signal!;
    if (exit === 'navigate') {
      navigate('mis-reservas');
      await screen.findByRole('heading', { name: 'Mis reservas' });
      await screen.findByText('Aún no tienes reservas.');
    } else {
      await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
      await screen.findByRole('form', { name: 'Iniciar sesión' });
    }
    expect(signal.aborted).toBe(true);
    await act(async () => pending.resolve(response([original])));
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: original.name })).not.toBeInTheDocument();
    if (exit === 'logout') expect(sessionStorage.getItem(sessionKey)).toBeNull();
    mounted.unmount();
  }
});
