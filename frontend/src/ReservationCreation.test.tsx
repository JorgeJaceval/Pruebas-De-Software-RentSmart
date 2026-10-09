import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { reservationFrom, type Reservation } from './reservations';
import { type SpaceDetail } from './publicSpaces';

const spaceId = '76b1a2f4-d706-431a-b887-2d7e8a7f8e58';
const reservationId = 'c3acb468-5895-4f57-8748-2b058e6deba4';
const user = { id: '03fdcce6-6305-42ba-96d3-04d19e5c962c', name: 'Persona de Prueba', email: 'persona@example.com', is_admin: false };
const space: SpaceDetail = { id: spaceId, name: 'Sala de ideas', description: 'Una sala luminosa para reuniones y talleres.',
  category: 'meeting_room', commune: 'Providencia', location_reference: 'A una cuadra del metro.', capacity: 8,
  price_per_hour: 12_000, conditions: 'Mantener el espacio limpio al terminar.', photos: ['https://example.com/sala.jpg'],
  opening_hour: 9, closing_hour: 18, is_active: true, is_withdrawn: false, is_owner: false, can_reserve: true };
const reservation: Reservation = { id: reservationId, space_id: spaceId, space_name: space.name, date: '2026-10-09',
  start_hour: 10, end_hour: 12, starts_at: '2026-10-09T13:00:00Z', ends_at: '2026-10-09T15:00:00Z',
  duration_hours: 2, unit_price: 12_000, total_price: 24_000, created_at: '2026-10-08T12:00:00Z',
  payment_expires_at: '2026-10-08T12:15:00Z', status: 'pending_payment',
  can_pay: true, can_cancel: true,
  payment: { id: 'd8e8eb85-8046-4235-b2e5-86f4b0c0567d', status: 'pending' } };
const fetchMock = jest.fn<typeof fetch>();
let now: number;
let postReply: () => Promise<Response>;
let getReply: () => Promise<Response>;

function response(body: unknown, status = 200): Response {
  return { status, ok: status >= 200 && status < 300, json: async () => body } as Response;
}
function saveSession(expires = now + 30 * 60_000) {
  sessionStorage.setItem('rentsmart.session', JSON.stringify({ access_token: 'test-session-token', expires_at: new Date(expires).toISOString() }));
}
async function selectInterval(date = reservation.date, start = '10', end = '12') {
  await screen.findByLabelText('Fecha');
  fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: date } });
  fireEvent.change(screen.getByLabelText('Hora de inicio'), { target: { value: start } });
  fireEvent.change(screen.getByLabelText('Hora de término'), { target: { value: end } });
}
function postCalls() { return fetchMock.mock.calls.filter(([path, options]) => path === '/api/reservations' && options?.method === 'POST'); }

beforeEach(() => {
  now = Date.parse('2026-10-08T12:00:00Z');
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  sessionStorage.clear();
  window.history.replaceState(null, '', `/#detalle-espacio/${spaceId}`);
  fetchMock.mockReset();
  postReply = async () => response(reservation, 201);
  getReply = async () => response(reservation);
  fetchMock.mockImplementation(async (path) => {
    if (path === '/api/health/ready') return response({ status: 'ok', database: 'connected' });
    if (path === '/api/auth/me') return response(user);
    if (path === '/api/auth/login') return response({ access_token: 'test-session-token', token_type: 'bearer',
      expires_at: new Date(now + 30 * 60_000).toISOString(), user });
    if (path === `/api/spaces/public/${spaceId}` || path === `/api/spaces/${spaceId}/detail`) return response(space);
    if (path === '/api/reservations') return postReply();
    if (path === `/api/reservations/${reservationId}`) return getReply();
    throw new Error(`Unexpected request: ${String(path)}`);
  });
  globalThis.fetch = fetchMock;
});
afterEach(() => { cleanup(); jest.restoreAllMocks(); jest.useRealTimers(); });

it('HU12: estima duración y total, crea con sesión y muestra únicamente el contrato confirmado por el servidor', async () => {
  saveSession();
  const confirmed = { ...reservation, unit_price: 15_000, total_price: 30_000 };
  postReply = async () => response(confirmed, 201);
  getReply = async () => response(confirmed);
  render(<App />);
  await selectInterval();
  expect(screen.getByLabelText('Resumen estimado')).toHaveTextContent('Duración: 2 horas');
  expect(screen.getByLabelText('Resumen estimado')).toHaveTextContent('$24.000 CLP');
  await userEvent.click(screen.getByRole('button', { name: 'Solicitar reserva' }));
  expect(await screen.findByRole('heading', { name: 'Resumen de reserva' })).toBeInTheDocument();
  await screen.findByText('Reserva creada. Está pendiente de pago.');
  expect(window.location.hash).toBe(`#reserva/${reservationId}`);
  expect(screen.getByText(reservationId)).toBeInTheDocument();
  expect(screen.getByText(reservation.date)).toBeInTheDocument();
  expect(screen.getByText('10:00–12:00')).toBeInTheDocument();
  expect(screen.getByText('$30.000 CLP')).toBeInTheDocument();
  expect(screen.queryByText('$24.000 CLP')).not.toBeInTheDocument();
  expect(screen.getByText('Plazo para pagar · Santiago')).toBeInTheDocument();
  expect(screen.getByText(/08-10-2026.*09:15:00/)).toBeInTheDocument();
  const [, options] = postCalls()[0];
  expect(JSON.parse(String(options?.body))).toEqual({ space_id: spaceId, date: reservation.date, start_hour: 10, end_hour: 12 });
  expect(options?.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer test-session-token' });
  expect(sessionStorage.getItem(`rentsmart.reservation-draft.${spaceId}`)).toBeNull();
  expect(screen.queryByRole('button', { name: /pagar/i })).not.toBeInTheDocument();
});

it('HU12: conserva la selección de un visitante al iniciar sesión, sin enviar solicitudes anónimas', async () => {
  render(<App />);
  await selectInterval();
  expect(screen.queryByRole('button', { name: 'Solicitar reserva' })).not.toBeInTheDocument();
  expect(postCalls()).toHaveLength(0);
  await userEvent.click(screen.getByRole('link', { name: 'Iniciar sesión para reservar' }));
  await screen.findByRole('heading', { name: 'Inicia sesión' });
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: user.email } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Clave de prueba 2026!' } });
  await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
  await screen.findByRole('button', { name: 'Solicitar reserva' });
  expect(screen.getByLabelText('Fecha')).toHaveValue(reservation.date);
  expect(screen.getByLabelText('Hora de inicio')).toHaveValue('10');
  expect(screen.getByLabelText('Hora de término')).toHaveValue('12');
  expect(postCalls()).toHaveLength(0);
});

it('HU12: mantiene fecha y horas ante conflictos, errores de campo y problemas de red; permite reintentar', async () => {
  saveSession(); render(<App />); await selectInterval();
  postReply = async () => response({ errors: { form: 'Otro usuario reservó ese intervalo.' } }, 409);
  await userEvent.click(screen.getByRole('button', { name: 'Solicitar reserva' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Otro usuario reservó ese intervalo.');
  expect(screen.getByLabelText('Fecha')).toHaveValue(reservation.date);
  postReply = async () => response({ errors: { start_hour: 'El inicio debe ser futuro.' } }, 422);
  await userEvent.click(screen.getByRole('button', { name: 'Solicitar reserva' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('El inicio debe ser futuro.');
  expect(screen.getByLabelText('Hora de inicio')).toHaveValue('10');
  postReply = async () => { throw new Error('Network disconnected'); };
  await userEvent.click(screen.getByRole('button', { name: 'Solicitar reserva' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Tus datos se conservaron');
  expect(screen.getByLabelText('Hora de término')).toHaveValue('12');
  expect(screen.queryByText('Reserva creada. Está pendiente de pago.')).not.toBeInTheDocument();
  postReply = async () => response(reservation, 201);
  await userEvent.click(screen.getByRole('button', { name: 'Solicitar reserva' }));
  await screen.findByText('Reserva creada. Está pendiente de pago.');
});

it('HU12: limita fechas, futuro y duración en cliente y deja la última validación al servidor', async () => {
  saveSession(); render(<App />); await selectInterval('2026-10-07');
  expect(screen.getByLabelText('Fecha')).toHaveAttribute('min', '2026-10-08');
  expect(screen.getByLabelText('Fecha')).toHaveAttribute('max', '2027-01-06');
  await userEvent.click(screen.getByRole('button', { name: 'Solicitar reserva' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('hasta 90 días');
  await selectInterval('2027-01-07');
  await userEvent.click(screen.getByRole('button', { name: 'Solicitar reserva' }));
  expect(screen.getByRole('alert')).toHaveTextContent('hasta 90 días');
  await selectInterval('2026-10-08', '9', '10');
  await userEvent.click(screen.getByRole('button', { name: 'Solicitar reserva' }));
  expect(screen.getByRole('alert')).toHaveTextContent('hora actual en Santiago');
  await selectInterval(reservation.date, '9', '18');
  expect(screen.getByRole('alert')).toHaveTextContent('1 a 8 horas');
  expect(screen.getByRole('button', { name: 'Solicitar reserva' })).toBeDisabled();
  expect(postCalls()).toHaveLength(0);
});

it('HU12: impide dos envíos simultáneos y bloquea cambios mientras espera respuesta', async () => {
  saveSession();
  let resolvePost!: (value: Response) => void;
  postReply = () => new Promise((resolve) => { resolvePost = resolve; });
  render(<App />); await selectInterval();
  fireEvent.submit(screen.getByRole('form', { name: 'Solicitar reserva' }));
  fireEvent.submit(screen.getByRole('form', { name: 'Solicitar reserva' }));
  expect(postCalls()).toHaveLength(1);
  expect(screen.getByRole('button', { name: 'Solicitando reserva…' })).toBeDisabled();
  expect(screen.getByLabelText('Fecha')).toBeDisabled();
  await act(async () => resolvePost(response(reservation, 201)));
  await screen.findByText('Reserva creada. Está pendiente de pago.');
});

it('HU12: recupera confirmación al recargar y exige sesión conservando la ruta de reserva', async () => {
  window.history.replaceState(null, '', `/#reserva/${reservationId}`);
  const guest = render(<App />);
  await screen.findByRole('heading', { name: 'Inicia sesión' });
  expect(fetchMock.mock.calls.some(([path]) => path === `/api/reservations/${reservationId}`)).toBe(false);
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: user.email } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Clave de prueba 2026!' } });
  await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
  await screen.findByText(reservationId);
  expect(window.location.hash).toBe(`#reserva/${reservationId}`);
  guest.unmount(); render(<App />);
  await screen.findByText(reservationId);
  expect(postCalls()).toHaveLength(0);
  expect(fetchMock.mock.calls.filter(([path]) => path === `/api/reservations/${reservationId}`)).toHaveLength(2);
});

it('HU12: muestra vencimiento efectivo y una reserva legada sin pago sin inventar una transacción', async () => {
  saveSession(); window.history.replaceState(null, '', `/#reserva/${reservationId}`);
  getReply = async () => response({ ...reservation, status: 'expired' });
  const expired = render(<App />);
  await screen.findByText('Estado de la reserva: Expirada.');
  expect(screen.getByText(/El plazo venció y el intervalo dejó/)).toBeInTheDocument();
  expect(screen.queryByText('Reserva creada. Está pendiente de pago.')).not.toBeInTheDocument();
  expired.unmount(); getReply = async () => response({ ...reservation, payment: null });
  render(<App />);
  await screen.findByText('Sin registro de pago');
  expect(screen.queryByText('Reserva creada. Está pendiente de pago.')).not.toBeInTheDocument();
});

it('HU12: reconsulta el estado al alcanzar el plazo y usa la expiración confirmada por el servidor', async () => {
  saveSession(); window.history.replaceState(null, '', `/#reserva/${reservationId}`);
  render(<App />); await screen.findByText('Reserva creada. Está pendiente de pago.');
  getReply = async () => response({ ...reservation, created_at: '2026-10-08T11:45:01Z', payment_expires_at: '2026-10-08T12:00:01Z' });
  jest.useFakeTimers({ now });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Actualizar estado de reserva' })); });
  expect(screen.getByText('Reserva creada. Está pendiente de pago.')).toBeInTheDocument();
  getReply = async () => response({ ...reservation, created_at: '2026-10-08T11:45:01Z', payment_expires_at: '2026-10-08T12:00:01Z', status: 'expired' });
  now += 1001;
  await act(async () => jest.advanceTimersByTime(1001));
  expect(screen.getByText('Estado de la reserva: Expirada.')).toBeInTheDocument();
  expect(screen.queryByText('Reserva creada. Está pendiente de pago.')).not.toBeInTheDocument();
});

it('HU12: un reloj del cliente adelantado no declara vencimiento ni reconsulta continuamente', async () => {
  now += 16 * 60_000;
  saveSession(); window.history.replaceState(null, '', `/#reserva/${reservationId}`);
  render(<App />);
  await screen.findByText('Reserva creada. Está pendiente de pago.');
  await waitFor(() => expect(fetchMock.mock.calls.filter(([path]) => path === `/api/reservations/${reservationId}`)).toHaveLength(2));
  await screen.findByText('Reserva creada. Está pendiente de pago.');
  expect(screen.queryByText('Estado de la reserva: Expirada.')).not.toBeInTheDocument();
  expect(screen.queryByText(/El plazo venció y el intervalo dejó/)).not.toBeInTheDocument();
});

it('HU12: rechaza respuestas exitosas inconsistentes sin mostrar una reserva creada', async () => {
  saveSession(); render(<App />); await selectInterval();
  postReply = async () => response({ ...reservation, total_price: 1 }, 201);
  await userEvent.click(screen.getByRole('button', { name: 'Solicitar reserva' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos confirmar la reserva');
  expect(window.location.hash).toBe(`#detalle-espacio/${spaceId}`);
  expect(screen.queryByText('Reserva creada. Está pendiente de pago.')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Hora de inicio')).toHaveValue('10');
});

it('HU12: no muestra confirmación ajena o inaccesible y permite reintentar una lectura fallida', async () => {
  saveSession(); window.history.replaceState(null, '', `/#reserva/${reservationId}`);
  getReply = async () => response({ ...reservation, id: spaceId });
  render(<App />);
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos comprobar la reserva');
  expect(screen.queryByText(reservation.date)).not.toBeInTheDocument();
  getReply = async () => response({}, 404);
  await userEvent.click(screen.getByRole('button', { name: 'Volver a comprobar reserva' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No encontramos una reserva accesible para tu cuenta');
  expect(screen.queryByRole('button', { name: 'Volver a comprobar reserva' })).not.toBeInTheDocument();
});

it('HU12: descarta una respuesta de creación al navegar, sin cambiar la nueva pantalla', async () => {
  saveSession(); let resolvePost!: (value: Response) => void;
  postReply = () => new Promise((resolve) => { resolvePost = resolve; });
  render(<App />); await selectInterval();
  await userEvent.click(screen.getByRole('button', { name: 'Solicitar reserva' }));
  const requestSignal = postCalls()[0][1]?.signal;
  await act(async () => { window.location.hash = 'inicio'; window.dispatchEvent(new HashChangeEvent('hashchange')); });
  expect(requestSignal?.aborted).toBe(true);
  await act(async () => resolvePost(response(reservation, 201)));
  expect(window.location.hash).toBe('#inicio');
  expect(screen.queryByText(reservationId)).not.toBeInTheDocument();
});

it('HU12: descarta una respuesta de creación al cerrar sesión y maneja 401 sin revelar reserva', async () => {
  saveSession(); let resolvePost!: (value: Response) => void;
  postReply = () => new Promise((resolve) => { resolvePost = resolve; });
  const mounted = render(<App />); await selectInterval();
  await userEvent.click(screen.getByRole('button', { name: 'Solicitar reserva' }));
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
  await screen.findByRole('heading', { name: 'Inicia sesión' });
  await act(async () => resolvePost(response(reservation, 201)));
  expect(screen.queryByText(reservationId)).not.toBeInTheDocument();
  expect(sessionStorage.getItem('rentsmart.session')).toBeNull();
  mounted.unmount(); saveSession(); window.history.replaceState(null, '', `/#detalle-espacio/${spaceId}`);
  postReply = async () => response({}, 401);
  render(<App />); await selectInterval();
  await userEvent.click(screen.getByRole('button', { name: 'Solicitar reserva' }));
  await waitFor(() => expect(sessionStorage.getItem('rentsmart.session')).toBeNull());
  expect(screen.queryByText('Reserva creada. Está pendiente de pago.')).not.toBeInTheDocument();
  expect(screen.queryByText(reservationId)).not.toBeInTheDocument();
});

it('HU12: respeta una navegación que cambió la URL antes de procesar hashchange', async () => {
  saveSession(); let resolvePost!: (value: Response) => void;
  postReply = () => new Promise((resolve) => { resolvePost = resolve; });
  render(<App />); await selectInterval();
  await userEvent.click(screen.getByRole('button', { name: 'Solicitar reserva' }));
  window.history.replaceState(null, '', '/#inicio');
  await act(async () => resolvePost(response(reservation, 201)));
  expect(window.location.hash).toBe('#inicio');
  expect(screen.queryByText('Reserva creada. Está pendiente de pago.')).not.toBeInTheDocument();
  expect(fetchMock.mock.calls.some(([path]) => path === `/api/reservations/${reservationId}`)).toBe(false);
});

it('HU12: descarta una respuesta privada tardía al expirar la sesión', async () => {
  saveSession(now + 5000); window.history.replaceState(null, '', `/#reserva/${reservationId}`);
  let resolveGet!: (value: Response) => void;
  getReply = () => new Promise((resolve) => { resolveGet = resolve; });
  render(<App />); await screen.findByText('Comprobando reserva…');
  now += 5001;
  await act(async () => resolveGet(response(reservation)));
  await screen.findByRole('heading', { name: 'Inicia sesión' });
  expect(screen.queryByText(reservationId)).not.toBeInTheDocument();
  expect(screen.getByText('Tu sesión venció. Inicia sesión nuevamente.')).toBeInTheDocument();
});

it('HU12: el parser verifica zona Santiago, importes, plazo, identificadores y estados coherentes', () => {
  expect(reservationFrom(reservation)).toEqual(reservation);
  for (const invalid of [
    { ...reservation, id: 'not-a-uuid' }, { ...reservation, total_price: 23_999 },
    { ...reservation, duration_hours: 9 }, { ...reservation, starts_at: '2026-10-09T10:00:00Z' },
    { ...reservation, payment_expires_at: '2026-10-08T12:16:00Z' },
    { ...reservation, payment: { ...reservation.payment, status: 'approved' } },
    { ...reservation, ends_at: '2026-10-09T15:00:00.001Z' },
  ]) expect(() => reservationFrom(invalid)).toThrow();
  expect(reservationFrom({ ...reservation, status: 'paid', payment: { ...reservation.payment, status: 'approved' } }).status).toBe('paid');
  expect(reservationFrom({ ...reservation, payment: null }).payment).toBeNull();
});
