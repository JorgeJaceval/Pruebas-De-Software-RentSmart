import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { type SpaceDetail } from './publicSpaces';

const id = '76b1a2f4-d706-431a-b887-2d7e8a7f8e58';
const user = { id: '03fdcce6-6305-42ba-96d3-04d19e5c962c', name: 'Persona de Prueba', email: 'persona@example.com', is_admin: false };
const space: SpaceDetail = { id, name: 'Sala de ideas', description: 'Una sala luminosa para reuniones y talleres.',
  category: 'meeting_room', commune: 'Providencia', location_reference: 'A una cuadra del metro.',
  capacity: 8, price_per_hour: 12_000, conditions: 'Mantener el espacio limpio al terminar.',
  photos: ['https://example.com/sala.jpg', 'https://example.com/entrada.jpg', 'https://example.com/mesa.jpg'],
  opening_hour: 9, closing_hour: 18, is_active: true, is_withdrawn: false, is_owner: false, can_reserve: true };
const fetchMock = jest.fn<typeof fetch>();
let publicReply: () => Promise<Response>;
let privateReply: () => Promise<Response>;
let accountReply: () => Promise<Response>;

function response(body: unknown, status = 200): Response {
  return { status, ok: status >= 200 && status < 300, json: async () => body } as Response;
}

function saveSession() {
  const saved = { access_token: 'test-session-token', expires_at: new Date(Date.now() + 30 * 60_000).toISOString() };
  sessionStorage.setItem('rentsmart.session', JSON.stringify(saved));
  return saved;
}

beforeEach(() => {
  sessionStorage.clear();
  window.history.replaceState(null, '', `/#detalle-espacio/${id}`);
  fetchMock.mockReset();
  publicReply = async () => response(space);
  privateReply = async () => response(space);
  accountReply = async () => response(user);
  fetchMock.mockImplementation(async (path) => {
    if (path === '/api/health/ready') return response({ status: 'ok', database: 'connected' });
    if (path === `/api/spaces/public/${id}`) return publicReply();
    if (path === `/api/spaces/${id}/detail`) return privateReply();
    if (path === '/api/auth/me') return accountReply();
    if (path === '/api/auth/login') return response({ access_token: 'test-session-token',
      expires_at: new Date(Date.now() + 30 * 60_000).toISOString(), token_type: 'bearer', user });
    throw new Error(`Unexpected request: ${String(path)}`);
  });
  globalThis.fetch = fetchMock;
});

afterEach(() => cleanup());

it('HU10 CP01/06: muestra datos completos y todas las fotos; una foto fallida conserva el detalle', async () => {
  publicReply = async () => response({ ...space, owner_id: 'identidad-privada', owner_email: 'privado@example.com' });
  render(<App />);
  const detail = await screen.findByRole('article', { name: space.name });
  expect(within(detail).getByText(space.description)).toBeInTheDocument();
  expect(within(detail).getByText(space.location_reference)).toBeInTheDocument();
  expect(within(detail).getByText(space.conditions)).toBeInTheDocument();
  expect(within(detail).getByText('Sala de reuniones · Providencia')).toBeInTheDocument();
  expect(within(detail).getByText('8 personas')).toBeInTheDocument();
  expect(within(detail).getByText('$12.000 CLP/h')).toBeInTheDocument();
  expect(within(detail).getByText('09:00–18:00, todos los días')).toBeInTheDocument();
  expect(screen.getByText('Horario diario · Santiago')).toBeInTheDocument();
  for (const [index, url] of space.photos.entries()) {
    expect(screen.getByRole('img', { name: `Foto ${index + 1} de ${space.name}` })).toHaveAttribute('src', url);
  }
  fireEvent.error(screen.getByRole('img', { name: `Foto 1 de ${space.name}` }));
  expect(screen.getByRole('img', { name: `Foto 1 de ${space.name}: foto no disponible` })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: `Foto 2 de ${space.name}` })).toHaveAttribute('src', space.photos[1]);
  expect(screen.getByText(space.conditions)).toBeInTheDocument();
  expect(screen.queryByText('identidad-privada')).not.toBeInTheDocument();
  expect(screen.queryByText('privado@example.com')).not.toBeInTheDocument();
});

it('HU10 CP02: solicita login y vuelve al mismo espacio incluso al recargar la ruta de acceso', async () => {
  const mounted = render(<App />);
  await screen.findByRole('heading', { name: space.name, level: 1 });
  await userEvent.click(screen.getByRole('link', { name: 'Iniciar sesión para reservar' }));
  await screen.findByRole('heading', { name: 'Inicia sesión' });
  expect(window.location.hash).toBe(`#sesion/espacio/${id}`);
  mounted.unmount();
  render(<App />);
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: user.email } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Clave de prueba 2026!' } });
  await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
  expect(await screen.findByRole('button', { name: 'Solicitar reserva' })).toBeDisabled();
  expect(window.location.hash).toBe(`#detalle-espacio/${id}`);
  expect(screen.getByRole('heading', { name: space.name, level: 1 })).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith(`/api/spaces/${id}/detail`, expect.objectContaining({
    headers: { Authorization: 'Bearer test-session-token' }, signal: expect.any(AbortSignal),
  }));
});

it('HU10 CP03/04: identifica el espacio propio activo o inactivo y no ofrece reservar', async () => {
  for (const active of [true, false]) {
    saveSession();
    publicReply = active ? async () => response(space) : async () => response({}, 404);
    privateReply = async () => response({ ...space, is_active: active, is_owner: true, can_reserve: false });
    const mounted = render(<App />);
    expect(await screen.findByText('Este es tu espacio. No puedes reservarlo.')).toBeInTheDocument();
    expect(screen.getByText(space.conditions)).toBeInTheDocument();
    if (!active) expect(screen.getByText(/Publicación inactiva/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Fecha')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Solicitar reserva' })).not.toBeInTheDocument();
    mounted.unmount();
  }
});

it('HU10 CP03: administrador ve retiro privado y otra cuenta recibe indisponibilidad', async () => {
  saveSession();
  accountReply = async () => response({ ...user, is_admin: true });
  publicReply = async () => response({}, 404);
  privateReply = async () => response({ ...space, is_active: false, is_withdrawn: true, can_reserve: false });
  const admin = render(<App />);
  expect(await screen.findByText(/Publicación retirada por administración/)).toBeInTheDocument();
  expect(screen.getByText(space.description)).toBeInTheDocument();
  expect(screen.queryByLabelText('Fecha')).not.toBeInTheDocument();
  admin.unmount();
  accountReply = async () => response(user);
  privateReply = async () => response({}, 404);
  render(<App />);
  await screen.findByText(`Hola, ${user.name}`);
  expect(await screen.findByRole('alert')).toHaveTextContent('Este espacio no está disponible en el catálogo.');
  expect(screen.queryByText(space.conditions)).not.toBeInTheDocument();
});

it('HU10 CP05: selecciona horas del horario en Santiago sin anunciar una reserva creada', async () => {
  render(<App />);
  await screen.findByRole('article', { name: space.name });
  fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-11-01' } });
  fireEvent.change(screen.getByLabelText('Hora de inicio'), { target: { value: '9' } });
  fireEvent.change(screen.getByLabelText('Hora de término'), { target: { value: '18' } });
  expect(screen.getByRole('alert')).toHaveTextContent('Elige un intervalo de 1 a 8 horas');
  fireEvent.change(screen.getByLabelText('Hora de inicio'), { target: { value: '10' } });
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Hora de término')).toHaveValue('18');
  expect(within(screen.getByLabelText('Hora de inicio')).queryByRole('option', { name: '08:00' })).not.toBeInTheDocument();
  expect(screen.getByText('Arriendo por hora. Todos los horarios corresponden a Santiago.')).toBeInTheDocument();
  expect(fetchMock.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);
});

it('HU10: controla detalle inválido, permite reintentar y descarta datos privados al vencer sesión', async () => {
  publicReply = async () => response({ ...space, closing_hour: 9 });
  const invalid = render(<App />);
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar la publicación.');
  publicReply = async () => response(space);
  await userEvent.click(screen.getByRole('button', { name: 'Volver a cargar publicación' }));
  await screen.findByText(space.conditions);
  invalid.unmount();
  saveSession();
  publicReply = async () => response({}, 404);
  privateReply = async () => response({}, 401);
  render(<App />);
  await screen.findByRole('alert');
  expect(sessionStorage.getItem('rentsmart.session')).toBeNull();
  expect(screen.queryByText(space.conditions)).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Fecha')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toBeInTheDocument();
});
