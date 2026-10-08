import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import PublicSpaceCard from './PublicSpaceCard';
import { type PublicSpace, type PublicSpaceDetail } from './publicSpaces';

const fetchMock = jest.fn<typeof fetch>();
const spaceId = '76b1a2f4-d706-431a-b887-2d7e8a7f8e58';
const record: PublicSpaceDetail = { id: spaceId, name: 'Sala de ideas', description: 'Una sala tranquila para reuniones y trabajo.',
  category: 'meeting_room', commune: 'Providencia',
  capacity: 8, price_per_hour: 12_000, location_reference: 'Referencia adicional', conditions: 'Condiciones adicionales',
  opening_hour: 9, closing_hour: 18, photos: ['https://example.com/sala.jpg', 'https://example.com/entrada.jpg'] };
const studio: PublicSpace = { ...record, id: '76b1a2f4-d706-431a-b887-000000000001', name: 'Estudio creativo',
  description: 'Un espacio amplio para retratos y fotografía profesional.', category: 'photo_studio',
  commune: 'Santiago', capacity: 4, price_per_hour: 8_000 };
const workshop: PublicSpace = { ...record, id: '76b1a2f4-d706-431a-b887-000000000002', name: 'Sala de talleres',
  description: 'Actividades de equipos y talleres.', category: 'multipurpose_room', capacity: 20, price_per_hour: 25_000 };
const neighborhood: PublicSpace = { ...record, id: '76b1a2f4-d706-431a-b887-000000000003', name: 'Sala de barrio',
  description: 'Reuniones y talleres con luz natural.', commune: 'Providencia Norte' };
const filterSpaces = [studio, workshop, neighborhood, record];
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
    is_active: true, is_withdrawn: false,
    location_reference: 'Referencia adicional', conditions: 'Condiciones adicionales', opening_hour: 9, closing_hour: 18 };
}

function visibleNames() {
  return screen.queryAllByRole('article').map((card) => within(card).getByRole('heading').textContent);
}

function changeFilter(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
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
  for (const text of ['identidad-privada', 'privado@example.com', 'hash-privado', record.description, 'Condiciones adicionales']) {
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
  detailReply = async () => response(withPrivateExtras(updated));
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

it('HU08 CP-06 / HU10 CA01: el enlace abre el detalle completo, admite recarga directa y controla el 404', async () => {
  const first = render(<App />);
  await screen.findByRole('article', { name: record.name });
  await userEvent.click(screen.getByRole('link', { name: `Ver espacio: ${record.name}` }));
  expect(await screen.findByRole('heading', { name: record.name, level: 1 })).toBeInTheDocument();
  expect(screen.getByText('Sala de reuniones · Providencia')).toBeInTheDocument();
  expect(screen.getByText('8 personas')).toBeInTheDocument();
  expect(screen.getByText('$12.000 CLP/h')).toBeInTheDocument();
  expect(screen.getByText(record.description)).toBeInTheDocument();
  expect(screen.getByText('Condiciones adicionales')).toBeInTheDocument();
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

it('HU09 CP-01: busca coincidencias parciales de nombre o descripción sin mayúsculas y permite texto vacío', async () => {
  catalogReply = async () => response(filterSpaces);
  render(<App />);
  await screen.findAllByRole('article');

  changeFilter('Buscar por nombre o descripción', '  IDEAS  ');
  expect(visibleNames()).toEqual([record.name]);
  changeFilter('Buscar por nombre o descripción', 'RETRAT');
  expect(visibleNames()).toEqual([studio.name]);
  changeFilter('Buscar por nombre o descripción', '');
  expect(visibleNames()).toEqual(filterSpaces.map((space) => space.name));
  changeFilter('Buscar por nombre o descripción', '   ');
  expect(visibleNames()).toEqual(filterSpaces.map((space) => space.name));
});

it('HU09 CP-02: combina tipo, comuna exacta normalizada y búsqueda mediante AND', async () => {
  catalogReply = async () => response(filterSpaces);
  render(<App />);
  await screen.findAllByRole('article');

  changeFilter('Buscar por nombre o descripción', 'reuniones');
  expect(visibleNames()).toEqual([neighborhood.name, record.name]);
  changeFilter('Comuna', '  PROVIDENCIA  ');
  expect(visibleNames()).toEqual([record.name]);
  changeFilter('Tipo de espacio', 'meeting_room');
  changeFilter('Capacidad mínima', '8');
  expect(visibleNames()).toEqual([record.name]);
  changeFilter('Tipo de espacio', 'photo_studio');
  expect(screen.getByText('No hay publicaciones que coincidan con los filtros.')).toBeInTheDocument();
  expect(screen.getByLabelText('Comuna')).toHaveValue('  PROVIDENCIA  ');
  changeFilter('Buscar por nombre o descripción', '');
  changeFilter('Comuna', '');
  changeFilter('Capacidad mínima', '');
  expect(visibleNames()).toEqual([studio.name]);
  changeFilter('Tipo de espacio', '');
  changeFilter('Comuna', 'provid');
  expect(visibleNames()).toEqual([]);
});

it('HU09 CP-03: aplica límites inclusivos de precio y capacidad y permite filtros de un solo extremo', async () => {
  catalogReply = async () => response(filterSpaces);
  render(<App />);
  await screen.findAllByRole('article');

  changeFilter('Precio mínimo por hora', '12000');
  expect(visibleNames()).toEqual([workshop.name, neighborhood.name, record.name]);
  changeFilter('Precio máximo por hora', '12000');
  expect(visibleNames()).toEqual([neighborhood.name, record.name]);
  changeFilter('Capacidad mínima', '8');
  expect(visibleNames()).toEqual([neighborhood.name, record.name]);
  changeFilter('Precio mínimo por hora', '');
  changeFilter('Capacidad mínima', '');
  expect(visibleNames()).toEqual([studio.name, neighborhood.name, record.name]);
  changeFilter('Precio máximo por hora', '');
  changeFilter('Capacidad mínima', '8');
  expect(visibleNames()).toEqual([workshop.name, neighborhood.name, record.name]);
  changeFilter('Capacidad mínima', '20');
  expect(visibleNames()).toEqual([workshop.name]);
  changeFilter('Capacidad mínima', '1');
  changeFilter('Precio mínimo por hora', '0');
  expect(visibleNames()).toEqual(filterSpaces.map((space) => space.name));
  changeFilter('Precio máximo por hora', '0');
  expect(visibleNames()).toEqual([]);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('HU09 CP-04: informa precios o capacidades inválidos sin borrar su texto y rechaza rangos invertidos', async () => {
  render(<App />);
  await screen.findByRole('article');

  for (const label of ['Precio mínimo por hora', 'Precio máximo por hora']) {
    for (const invalid of ['-1', '1.5', '1e', 'abc', ' ']) {
      changeFilter(label, invalid);
      expect(screen.getByRole('alert')).toHaveTextContent('Los precios deben ser enteros no negativos.');
      expect(screen.getByLabelText(label)).toHaveValue(invalid);
    }
    changeFilter(label, '');
  }
  changeFilter('Precio mínimo por hora', '12000');
  changeFilter('Precio máximo por hora', '11999');
  expect(screen.getByRole('alert')).toHaveTextContent('El precio mínimo no puede superar al máximo.');
  changeFilter('Precio máximo por hora', '12000');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  for (const invalid of ['0', '101', '1.5', '1e', 'abc', ' ']) {
    changeFilter('Capacidad mínima', invalid);
    expect(screen.getByRole('alert')).toHaveTextContent('La capacidad mínima debe ser un entero entre 1 y 100.');
    expect(screen.getByLabelText('Capacidad mínima')).toHaveValue(invalid);
  }
  changeFilter('Capacidad mínima', '100');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByText('No hay publicaciones que coincidan con los filtros.')).toBeInTheDocument();
});

it('HU09 CP-05: ordena por precio en ambos sentidos, desempata por identificador y restaura el orden recibido', async () => {
  catalogReply = async () => response(filterSpaces);
  render(<App />);
  await screen.findAllByRole('article');

  expect(visibleNames()).toEqual(filterSpaces.map((space) => space.name));
  changeFilter('Ordenar por', 'price-asc');
  expect(visibleNames()).toEqual([studio.name, neighborhood.name, record.name, workshop.name]);
  changeFilter('Ordenar por', 'price-desc');
  expect(visibleNames()).toEqual([workshop.name, neighborhood.name, record.name, studio.name]);
  changeFilter('Ordenar por', 'default');
  expect(visibleNames()).toEqual(filterSpaces.map((space) => space.name));
});

it('HU09 CP-06: conserva filtros sin coincidencias y limpiar restaura todos los controles y publicaciones', async () => {
  catalogReply = async () => response(filterSpaces);
  render(<App />);
  await screen.findAllByRole('article');

  changeFilter('Buscar por nombre o descripción', 'sin coincidencias');
  changeFilter('Tipo de espacio', 'meeting_room');
  changeFilter('Comuna', 'Providencia');
  changeFilter('Precio mínimo por hora', '1000');
  changeFilter('Precio máximo por hora', '20000');
  changeFilter('Capacidad mínima', '8');
  changeFilter('Ordenar por', 'price-desc');
  expect(screen.getByText('No hay publicaciones que coincidan con los filtros.')).toBeInTheDocument();
  expect(screen.getByLabelText('Buscar por nombre o descripción')).toHaveValue('sin coincidencias');
  expect(screen.getByLabelText('Tipo de espacio')).toHaveValue('meeting_room');
  expect(screen.getByLabelText('Comuna')).toHaveValue('Providencia');
  expect(screen.getByLabelText('Precio mínimo por hora')).toHaveValue('1000');
  expect(screen.getByLabelText('Precio máximo por hora')).toHaveValue('20000');
  expect(screen.getByLabelText('Capacidad mínima')).toHaveValue('8');
  expect(screen.getByLabelText('Ordenar por')).toHaveValue('price-desc');

  await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
  expect(visibleNames()).toEqual(filterSpaces.map((space) => space.name));
  for (const label of ['Buscar por nombre o descripción', 'Tipo de espacio', 'Comuna']) {
    expect(screen.getByLabelText(label)).toHaveValue('');
  }
  for (const label of ['Precio mínimo por hora', 'Precio máximo por hora', 'Capacidad mínima']) {
    expect(screen.getByLabelText(label)).toHaveValue('');
  }
  expect(screen.getByLabelText('Ordenar por')).toHaveValue('default');
  expect(screen.queryByText('No hay publicaciones que coincidan con los filtros.')).not.toBeInTheDocument();
  expect(fetchMock.mock.calls.filter(([path]) => path === '/api/spaces')).toHaveLength(1);
});
