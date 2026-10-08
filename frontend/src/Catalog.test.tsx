import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import PublicSpaceCard from './PublicSpaceCard';
import { type PublicSpace } from './publicSpaces';

const fetchMock = jest.fn<typeof fetch>();
const spaceId = '76b1a2f4-d706-431a-b887-2d7e8a7f8e58';
const record: PublicSpace = { id: spaceId, name: 'Sala de ideas', category: 'meeting_room', commune: 'Providencia',
  capacity: 8, price_per_hour: 12_000, photos: ['https://example.com/sala.jpg', 'https://example.com/entrada.jpg'] };
const account = { id: '03fdcce6-6305-42ba-96d3-04d19e5c962c', name: 'Jorge Aceval', email: 'jorge@example.com', is_admin: false };
let catalogReply: () => Promise<Response>;
let detailReply: () => Promise<Response>;
let meReply: () => Promise<Response>;
let healthReply: () => Promise<Response>;

function response(body: unknown, status = 200): Response {
  return { status, ok: status >= 200 && status < 300, json: async () => body } as Response;
}

function withPrivateExtras(space: PublicSpace) {
  return { ...space, owner_id: 'identidad-privada', owner_email: 'privado@example.com', password_hash: 'hash-privado',
    is_active: true, is_withdrawn: false, description: 'Descripción completa adicional',
    location_reference: 'Referencia adicional', conditions: 'Condiciones adicionales', opening_hour: 9, closing_hour: 18 };
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

beforeEach(() => {
  sessionStorage.clear();
  window.history.replaceState(null, '', '/#catalogo');
  fetchMock.mockReset();
  catalogReply = async () => response([withPrivateExtras(record)]);
  detailReply = async () => response(withPrivateExtras(record));
  meReply = async () => response(account);
  healthReply = async () => response({ status: 'ok', database: 'connected' });
  fetchMock.mockImplementation(async (path) => {
    if (path === '/api/spaces') return catalogReply();
    if (path === `/api/spaces/public/${spaceId}`) return detailReply();
    if (path === '/api/auth/me') return meReply();
    if (path === '/api/health/ready') return healthReply();
    throw new Error(`Unexpected request: ${String(path)}`);
  });
  globalThis.fetch = fetchMock;
});

afterEach(() => cleanup());

it('HU08 CP-01/02/05: abre desde inicio, distingue carga y muestra todas las tarjetas públicas sin datos privados', async () => {
  window.history.replaceState(null, '', '/#inicio');
  const pending = deferredResponse();
  const healthPending = deferredResponse();
  catalogReply = () => pending.promise;
  healthReply = () => healthPending.promise;
  render(<App />);
  const links = screen.getAllByRole('link', { name: 'Explorar catálogo' });
  expect(links).toHaveLength(2);
  await userEvent.click(links[1]);
  expect(await screen.findByText('Cargando publicaciones…')).toBeInTheDocument();
  expect(screen.queryByRole('article')).not.toBeInTheDocument();
  const spaces = Array.from({ length: 7 }, (_, index) => withPrivateExtras({ ...record,
    id: index ? `76b1a2f4-d706-431a-b887-${String(index).padStart(12, '0')}` : spaceId,
    name: index ? `Sala publicada ${index + 1}` : record.name }));
  await act(async () => pending.resolve(response(spaces)));
  expect(await screen.findAllByRole('article')).toHaveLength(7);
  const card = screen.getByRole('article', { name: record.name });
  expect(within(card).getByRole('heading', { name: record.name })).toBeInTheDocument();
  expect(within(card).getByRole('img', { name: `Foto de ${record.name}` })).toHaveAttribute('src', record.photos[0]);
  expect(within(card).getByText('Sala de reuniones · Providencia')).toBeInTheDocument();
  expect(within(card).getByText('8 personas')).toBeInTheDocument();
  expect(within(card).getByText('$12.000 CLP/h')).toBeInTheDocument();
  expect(within(card).getByRole('link', { name: `Ver espacio: ${record.name}` })).toHaveAttribute('href', `#detalle-espacio/${spaceId}`);
  expect(screen.getByText('Una publicación visible no garantiza disponibilidad para una fecha u hora.')).toBeInTheDocument();
  for (const text of ['identidad-privada', 'privado@example.com', 'hash-privado', 'Descripción completa adicional', 'Condiciones adicionales']) {
    expect(screen.queryByText(text)).not.toBeInTheDocument();
  }
  expect(fetchMock).toHaveBeenCalledWith('/api/spaces', { signal: expect.any(AbortSignal) });
  expect(fetchMock.mock.calls.some(([path]) => path === '/api/auth/me')).toBe(false);
});

it('HU08 CP-01: el catálogo sigue siendo público con cuenta autenticada o fallo de sesión y health', async () => {
  for (const offline of [false, true]) {
    sessionStorage.setItem('rentsmart.session', JSON.stringify({ access_token: 'private-session-token',
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() }));
    meReply = offline ? async () => { throw new TypeError('Failed to fetch'); } : async () => response(account);
    healthReply = async () => { throw new TypeError('Failed to fetch'); };
    const mounted = render(<App />);
    expect(await screen.findByRole('article', { name: record.name })).toBeInTheDocument();
    if (!offline) expect(await screen.findByText('Hola, Jorge Aceval')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explorar catálogo' })).toHaveAttribute('href', '#catalogo');
    expect(screen.queryByRole('heading', { name: 'Vuelve a conectar' })).not.toBeInTheDocument();
    for (const [path, options] of fetchMock.mock.calls) {
      if (path === '/api/spaces') expect(options?.headers).toBeUndefined();
    }
    mounted.unmount();
  }
});

it('HU08 CP-03: distingue lista vacía de red, HTTP o JSON inválido y permite reintentar', async () => {
  catalogReply = async () => response([]);
  const empty = render(<App />);
  expect(await screen.findByText('Todavía no hay publicaciones para mostrar.')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  empty.unmount();
  const failures = [
    async () => response({ detail: 'Unavailable' }, 503),
    async () => { throw new TypeError('Failed to fetch'); },
    async () => response({ spaces: [] }),
    async () => response([{ id: spaceId, name: record.name }]),
    async () => ({ status: 200, ok: true, json: async () => { throw new SyntaxError('Invalid JSON'); } }) as unknown as Response,
  ];
  for (const failure of failures) {
    catalogReply = failure;
    const mounted = render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar el catálogo. Vuelve a intentarlo.');
    expect(screen.queryByText('Todavía no hay publicaciones para mostrar.')).not.toBeInTheDocument();
    catalogReply = async () => response([record]);
    await userEvent.click(screen.getByRole('button', { name: 'Volver a cargar catálogo' }));
    expect(await screen.findByRole('article', { name: record.name })).toBeInTheDocument();
    mounted.unmount();
  }
});

it('HU08 CP-04: una foto fallida usa reemplazo y una URL nueva recupera la imagen', () => {
  const card = render(<PublicSpaceCard space={record} />);
  fireEvent.error(screen.getByRole('img', { name: `Foto de ${record.name}` }));
  expect(screen.getByRole('img', { name: `Foto de ${record.name}: foto no disponible` })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: `Ver espacio: ${record.name}` })).toBeInTheDocument();
  const newPhoto = 'https://example.com/nueva-sala.jpg';
  card.rerender(<PublicSpaceCard space={{ ...record, photos: [newPhoto] }} />);
  expect(screen.getByRole('img', { name: `Foto de ${record.name}` })).toHaveAttribute('src', newPhoto);
  expect(screen.queryByText('Foto no disponible')).not.toBeInTheDocument();
});

it('HU08 CP-01/03: volver al catálogo consulta datos nuevos y descarta respuestas de una vista abandonada', async () => {
  const delayed = deferredResponse();
  catalogReply = () => delayed.promise;
  render(<App />);
  await screen.findByText('Cargando publicaciones…');
  const firstSignal = fetchMock.mock.calls.find(([path]) => path === '/api/spaces')![1]!.signal!;
  navigate('inicio');
  expect(firstSignal.aborted).toBe(true);
  const updated = { ...record, name: 'Sala actualizada' };
  catalogReply = async () => response([updated]);
  detailReply = async () => response(updated);
  navigate('catalogo');
  expect(await screen.findByRole('article', { name: updated.name })).toBeInTheDocument();
  await act(async () => delayed.resolve(response([record])));
  expect(screen.queryByRole('article', { name: record.name })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('link', { name: `Ver espacio: ${updated.name}` }));
  await screen.findByRole('heading', { name: updated.name, level: 1 });
  catalogReply = async () => response([{ ...updated, name: 'Publicación recién actualizada' }]);
  await userEvent.click(screen.getByRole('link', { name: 'Volver al catálogo' }));
  expect(await screen.findByRole('article', { name: 'Publicación recién actualizada' })).toBeInTheDocument();
  expect(fetchMock.mock.calls.filter(([path]) => path === '/api/spaces')).toHaveLength(3);
});

it('HU08 CP-06: el enlace abre una publicación pública básica, admite recarga directa y controla el 404', async () => {
  const first = render(<App />);
  await screen.findByRole('article', { name: record.name });
  await userEvent.click(screen.getByRole('link', { name: `Ver espacio: ${record.name}` }));
  expect(await screen.findByRole('heading', { name: record.name, level: 1 })).toBeInTheDocument();
  expect(screen.getByText('Sala de reuniones · Providencia')).toBeInTheDocument();
  expect(screen.getByText('8 personas')).toBeInTheDocument();
  expect(screen.getByText('$12.000 CLP/h')).toBeInTheDocument();
  expect(screen.queryByText('Descripción completa adicional')).not.toBeInTheDocument();
  expect(screen.queryByText('Condiciones adicionales')).not.toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith(`/api/spaces/public/${spaceId}`, { signal: expect.any(AbortSignal) });
  first.unmount();
  window.history.replaceState(null, '', `/#detalle-espacio/${spaceId.toUpperCase()}`);
  const reloaded = render(<App />);
  expect(await screen.findByRole('heading', { name: record.name, level: 1 })).toBeInTheDocument();
  reloaded.unmount();
  detailReply = async () => response({ detail: 'Not found' }, 404);
  catalogReply = async () => response([]);
  render(<App />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Este espacio no está disponible en el catálogo.');
  expect(screen.queryByRole('article', { name: record.name })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('link', { name: 'Volver al catálogo' }));
  expect(await screen.findByText('Todavía no hay publicaciones para mostrar.')).toBeInTheDocument();
  expect(fetchMock.mock.calls.some(([path]) => path === `/api/spaces/${spaceId}` || path === '/api/auth/me')).toBe(false);
  for (const [path, options] of fetchMock.mock.calls) {
    if (path === `/api/spaces/public/${spaceId}`) expect(options?.headers).toBeUndefined();
  }
});
