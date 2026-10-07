import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { type SpaceInput } from './spaces';

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
const created = () => ({ ...input, id: spaceId, owner_id: account.id, is_active: true, is_withdrawn: false });
let createReply: () => Promise<Response>;
let detailReply: () => Promise<Response>;

function response(body: unknown, status = 200): Response {
  return { status, ok: status >= 200 && status < 300, json: async () => body } as Response;
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

function change(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function fillForm() {
  change('Nombre del espacio', `  ${input.name}  `);
  change('Descripción', input.description);
  change('Tipo de espacio', input.category);
  change('Comuna', input.commune);
  change('Ubicación referencial', input.location_reference);
  change('Capacidad (personas)', String(input.capacity));
  change('Precio por hora (CLP)', String(input.price_per_hour));
  change('Condiciones de uso', input.conditions);
  change('Foto 1 (URL HTTPS)', input.photos[0]);
}

function publishCalls() {
  return fetchMock.mock.calls.filter(([path, options]) => path === '/api/spaces' && options?.method === 'POST');
}

beforeEach(() => {
  window.history.replaceState(null, '', '/#publicar-espacio');
  sessionStorage.clear();
  sessionStorage.setItem(sessionKey, JSON.stringify({ access_token: 'owner-session-token',
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() }));
  fetchMock.mockReset();
  createReply = async () => response(created(), 201);
  detailReply = async () => response(created());
  fetchMock.mockImplementation(async (path, options) => {
    if (path === '/api/health/ready') return response({ status: 'ok', database: 'connected' });
    if (path === '/api/auth/me') return response(account);
    if (path === '/api/auth/login') return response({ access_token: 'owner-session-token', token_type: 'bearer',
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), user: account });
    if (path === '/api/spaces' && options?.method === 'POST') return createReply();
    if (path === `/api/spaces/${spaceId}`) return detailReply();
    throw new Error(`Unexpected request: ${String(path)}`);
  });
  globalThis.fetch = fetchMock;
});

afterEach(() => cleanup());

it('HU03 CP-01: publica todos los datos con horario inicial, confirma y recupera la publicación al recargar', async () => {
  window.history.replaceState(null, '', '/#mis-espacios');
  const first = render(<App />);
  await screen.findByRole('heading', { name: 'Mis espacios' });
  await userEvent.click(screen.getAllByRole('link', { name: 'Publicar espacio' })[1]);
  await screen.findByRole('form', { name: 'Publicar espacio' });
  expect(screen.getByLabelText('Hora de apertura')).toHaveValue('9');
  expect(screen.getByLabelText('Hora de cierre')).toHaveValue('18');
  fillForm();
  await userEvent.click(screen.getByRole('button', { name: 'Publicar espacio' }));
  expect(await screen.findByText('Tu espacio fue publicado.')).toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: input.name })).toBeInTheDocument();
  expect(screen.getByText('Publicación activa')).toBeInTheDocument();
  expect(screen.getByText('09:00–18:00')).toBeInTheDocument();
  expect(screen.getByText(input.conditions)).toBeInTheDocument();
  expect(publishCalls()).toHaveLength(1);
  expect(JSON.parse(publishCalls()[0][1]!.body as string)).toEqual(input);
  expect(publishCalls()[0][1]?.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer owner-session-token' });
  expect(window.location.hash).toBe(`#espacio/${spaceId}`);
  first.unmount();
  window.history.replaceState(null, '', `/#espacio/${spaceId.toUpperCase()}`);
  render(<App />);
  expect(await screen.findByRole('heading', { name: input.name })).toBeInTheDocument();
  expect(screen.getByText(input.description)).toBeInTheDocument();
  expect(screen.queryByText('Tu espacio fue publicado.')).not.toBeInTheDocument();
  expect(publishCalls()).toHaveLength(1);
  expect(fetchMock.mock.calls.filter(([path]) => path === `/api/spaces/${spaceId}`)).toHaveLength(2);
  expect(Object.keys(JSON.parse(sessionStorage.getItem(sessionKey)!)).sort()).toEqual(['access_token', 'expires_at']);
});

it('HU03 CP-02: rechaza datos obligatorios ausentes y conserva los campos útiles', async () => {
  render(<App />);
  await screen.findByRole('form', { name: 'Publicar espacio' });
  fillForm();
  change('Precio por hora (CLP)', '');
  change('Foto 1 (URL HTTPS)', '');
  await userEvent.click(screen.getByRole('button', { name: 'Publicar espacio' }));
  expect(screen.getByLabelText('Precio por hora (CLP)')).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByText('Agrega entre 1 y 3 enlaces HTTPS válidos.')).toBeInTheDocument();
  expect(screen.getByLabelText('Nombre del espacio')).toHaveValue(`  ${input.name}  `);
  expect(screen.getByLabelText('Condiciones de uso')).toHaveValue(input.conditions);
  expect(publishCalls()).toHaveLength(0);
  expect(screen.queryByText('Tu espacio fue publicado.')).not.toBeInTheDocument();
});

it('HU03 CP-03/04/05: muestra errores de capacidad, precio, categoría y horario enviados por el backend', async () => {
  createReply = async () => response({ errors: {
    capacity: 'Capacidad fuera del rango permitido.', price_per_hour: 'Precio fuera del rango permitido.',
    category: 'Categoría desconocida.', closing_hour: 'El cierre debe ser posterior a la apertura.',
  } }, 422);
  render(<App />);
  await screen.findByRole('form', { name: 'Publicar espacio' });
  fillForm();
  change('Hora de apertura', '10');
  change('Hora de cierre', '20');
  await userEvent.click(screen.getByRole('button', { name: 'Publicar espacio' }));
  expect(await screen.findByText('Capacidad fuera del rango permitido.')).toBeInTheDocument();
  expect(screen.getByText('Precio fuera del rango permitido.')).toBeInTheDocument();
  expect(screen.getByText('Categoría desconocida.')).toBeInTheDocument();
  expect(screen.getByText('El cierre debe ser posterior a la apertura.')).toBeInTheDocument();
  expect(screen.getByLabelText('Nombre del espacio')).toHaveValue(`  ${input.name}  `);
  expect(screen.getByLabelText('Hora de cierre')).toHaveValue('20');
  expect(JSON.parse(publishCalls()[0][1]!.body as string)).toEqual({ ...input, opening_hour: 10, closing_hour: 20 });
  expect(screen.queryByText('Tu espacio fue publicado.')).not.toBeInTheDocument();
});

it('HU03 CP-06: exige sesión y controla detalle ajeno, inexistente y sesión rechazada', async () => {
  sessionStorage.clear();
  const guest = render(<App />);
  expect(await screen.findByRole('form', { name: 'Iniciar sesión' })).toBeInTheDocument();
  expect(screen.queryByRole('form', { name: 'Publicar espacio' })).not.toBeInTheDocument();
  navigate(`espacio/${spaceId}`);
  expect(screen.getByRole('form', { name: 'Iniciar sesión' })).toBeInTheDocument();
  expect(publishCalls()).toHaveLength(0);
  guest.unmount();
  for (const status of [403, 404, 401]) {
    sessionStorage.setItem(sessionKey, JSON.stringify({ access_token: 'owner-session-token',
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() }));
    detailReply = async () => response({ detail: 'Access denied' }, status);
    const mounted = render(<App />);
    if (status === 401) {
      expect(await screen.findByRole('form', { name: 'Iniciar sesión' })).toBeInTheDocument();
      expect(sessionStorage.getItem(sessionKey)).toBeNull();
    } else {
      expect(await screen.findByRole('alert')).toHaveTextContent(status === 403 ?
        'Tu cuenta no tiene acceso a este espacio.' : 'No encontramos este espacio.');
    }
    expect(screen.queryByRole('heading', { name: input.name })).not.toBeInTheDocument();
    mounted.unmount();
  }
});

it('HU03 CP-07: permite vistas previas HTTPS y usa reemplazo si una foto falla', async () => {
  render(<App />);
  await screen.findByRole('form', { name: 'Publicar espacio' });
  fillForm();
  const preview = screen.getByRole('img', { name: 'Vista previa de foto 1' });
  fireEvent.error(preview);
  expect(screen.getByRole('img', { name: 'Vista previa de foto 1: foto no disponible' })).toBeInTheDocument();
  expect(screen.queryByRole('img', { name: 'Vista previa de foto 1' })).not.toBeInTheDocument();
  change('Foto 1 (URL HTTPS)', 'http://example.com/sala.jpg');
  await userEvent.click(screen.getByRole('button', { name: 'Publicar espacio' }));
  expect(screen.getByText('Agrega entre 1 y 3 enlaces HTTPS válidos.')).toBeInTheDocument();
  expect(publishCalls()).toHaveLength(0);
  change('Foto 1 (URL HTTPS)', input.photos[0]);
  expect(screen.getByRole('img', { name: 'Vista previa de foto 1' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Publicar espacio' }));
  expect(await screen.findByRole('heading', { name: input.name })).toBeInTheDocument();
  fireEvent.error(screen.getByRole('img', { name: `Foto 1 de ${input.name}` }));
  expect(screen.getByRole('img', { name: `Foto 1 de ${input.name}: foto no disponible` })).toBeInTheDocument();
});

it('HU03 CP-08: evita doble envío, conserva datos tras fallos y permite reintentar', async () => {
  const pending = deferredResponse();
  createReply = () => pending.promise;
  render(<App />);
  await screen.findByRole('form', { name: 'Publicar espacio' });
  fillForm();
  const form = screen.getByRole('form', { name: 'Publicar espacio' });
  fireEvent.submit(form);
  fireEvent.submit(form);
  expect(publishCalls()).toHaveLength(1);
  expect(screen.getByRole('button', { name: 'Publicando tu espacio…' })).toBeDisabled();
  expect(screen.queryByText('Tu espacio fue publicado.')).not.toBeInTheDocument();
  await act(async () => pending.resolve(response({ errors: { form: 'Unavailable' } }, 503)));
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos publicar tu espacio.');
  createReply = async () => { throw new TypeError('Failed to fetch'); };
  await userEvent.click(screen.getByRole('button', { name: 'Publicar espacio' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectar con el servicio.');
  expect(screen.getByLabelText('Nombre del espacio')).toHaveValue(`  ${input.name}  `);
  expect(screen.getByLabelText('Precio por hora (CLP)')).toHaveValue(input.price_per_hour);
  createReply = async () => response(created(), 201);
  await userEvent.click(screen.getByRole('button', { name: 'Publicar espacio' }));
  expect(await screen.findByRole('heading', { name: input.name })).toBeInTheDocument();
  expect(screen.getByText('Tu espacio fue publicado.')).toBeInTheDocument();
  expect(publishCalls()).toHaveLength(3);
});

it('HU03 CP-08: usa la sesión en memoria y descarta una publicación tardía tras cerrar sesión', async () => {
  const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage blocked'); });
  const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage blocked'); });
  const pending = deferredResponse();
  createReply = () => pending.promise;
  window.history.replaceState(null, '', '/#sesion');
  render(<App />);
  change('Correo electrónico', account.email);
  change('Contraseña', 'Clave de prueba 2026!');
  await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
  await screen.findByRole('heading', { name: 'Mis espacios' });
  navigate('publicar-espacio');
  await screen.findByRole('form', { name: 'Publicar espacio' });
  fillForm();
  fireEvent.submit(screen.getByRole('form', { name: 'Publicar espacio' }));
  expect(publishCalls()).toHaveLength(1);
  expect(publishCalls()[0][1]?.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer owner-session-token' });
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
  expect(await screen.findByRole('form', { name: 'Iniciar sesión' })).toBeInTheDocument();
  await act(async () => pending.resolve(response(created(), 201)));
  await waitFor(() => expect(window.location.hash).toBe('#sesion'));
  expect(screen.queryByText('Tu espacio fue publicado.')).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: input.name })).not.toBeInTheDocument();
  getItem.mockRestore();
  setItem.mockRestore();
});
