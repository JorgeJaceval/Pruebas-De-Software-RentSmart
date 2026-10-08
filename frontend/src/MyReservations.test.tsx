import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { getReservations, historicalReservationFrom, reservationFrom, type Reservation } from './reservations';
import { type AuthRequest } from './useSession';

const now = Date.parse('2026-10-08T12:00:00Z');
const user = { id: '03fdcce6-6305-42ba-96d3-04d19e5c962c', name: 'Persona de Prueba', email: 'persona@example.com', is_admin: false };
const base: Reservation = {
  id: 'c3acb468-5895-4f57-8748-2b058e6deba4', space_id: '76b1a2f4-d706-431a-b887-2d7e8a7f8e58', space_name: 'Reserva pendiente',
  date: '2026-10-09', start_hour: 10, end_hour: 12, starts_at: '2026-10-09T13:00:00Z', ends_at: '2026-10-09T15:00:00Z',
  duration_hours: 2, unit_price: 12_000, total_price: 24_000, created_at: '2026-10-08T12:00:00Z',
  payment_expires_at: '2026-10-08T12:15:00Z', status: 'pending_payment', can_pay: true, can_cancel: true,
  payment: { id: 'd8e8eb85-8046-4235-b2e5-86f4b0c0567d', status: 'pending' },
};
const legacy: Reservation = {
  ...base, space_name: 'Contrato anterior', date: '2026-10-07', start_hour: 10, end_hour: 18,
  starts_at: '2026-10-07T13:15:30Z', ends_at: '2026-10-07T21:45:30Z', duration_hours: 8.5,
  unit_price: 7_500, total_price: 52_000, created_at: '2026-10-01T08:00:00Z', payment_expires_at: '2026-10-01T08:04:00Z',
  status: 'completed', payment: null, can_pay: false, can_cancel: false,
};
const fetchMock = jest.fn<typeof fetch>();
let listReply: () => Promise<Response>;
let detailReply: () => Promise<Response>;
let currentAccount = user;
let issuedToken = 'test-session-token';

function response(body: unknown, status = 200): Response {
  return { status, ok: status >= 200 && status < 300, json: async () => body } as Response;
}
function envelope(items: Reservation[] = [], asOf = '2026-10-08T12:00:00Z') { return { items, as_of: asOf }; }
function saveSession(expires = now + 30 * 60_000) {
  sessionStorage.setItem('rentsmart.session', JSON.stringify({ access_token: 'test-session-token', expires_at: new Date(expires).toISOString() }));
}
function card(name: string) { return within(screen.getByRole('article', { name })); }
function variant(index: number, name: string, overrides: Partial<Reservation>): Reservation {
  return { ...base, id: `${String(index).padStart(8, '0')}-5895-4f57-8748-2b058e6deba4`, space_name: name, ...overrides };
}
function deferred() {
  let resolve!: (value: Response) => void;
  return { promise: new Promise<Response>((done) => { resolve = done; }), resolve: (value: Response) => resolve(value) };
}

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(now);
  sessionStorage.clear();
  window.history.replaceState(null, '', '/#mis-reservas');
  fetchMock.mockReset();
  currentAccount = user; issuedToken = 'test-session-token';
  listReply = async () => response(envelope());
  detailReply = async () => response(base);
  fetchMock.mockImplementation(async (path) => {
    if (path === '/api/health/ready') return response({ status: 'ok', database: 'connected' });
    if (path === '/api/auth/me') return response(currentAccount);
    if (path === '/api/auth/login') return response({ access_token: issuedToken, token_type: 'bearer',
      expires_at: new Date(now + 30 * 60_000).toISOString(), user: currentAccount });
    if (path === '/api/reservations') return listReply();
    if (path === `/api/reservations/${base.id}`) return detailReply();
    throw new Error(`Unexpected request: ${String(path)}`);
  });
  globalThis.fetch = fetchMock;
});
afterEach(() => { cleanup(); jest.restoreAllMocks(); jest.useRealTimers(); });

it('HU13: consulta con sesión, muestra estados de reservas y pagos y conserva el orden del servidor', async () => {
  saveSession();
  const paid = variant(2, 'Reserva pagada', { status: 'paid', payment: { ...base.payment!, status: 'approved' }, can_pay: false });
  const cancelled = variant(3, 'Reserva cancelada', { status: 'cancelled', payment: { ...base.payment!, status: 'refunded' }, can_pay: false, can_cancel: false });
  const expired = variant(4, 'Reserva expirada', { status: 'expired', payment: { ...base.payment!, status: 'rejected' }, can_pay: false, can_cancel: false });
  listReply = async () => response(envelope([base, paid, cancelled, expired, { ...legacy, id: '00000005-5895-4f57-8748-2b058e6deba4' }]));
  render(<App />);
  await screen.findByRole('article', { name: base.space_name });
  expect(screen.getAllByRole('article').map((article) => within(article).getByRole('heading').textContent))
    .toEqual(['Reserva pendiente', 'Reserva pagada', 'Reserva cancelada', 'Reserva expirada', 'Contrato anterior']);
  const upcoming = within(screen.getByRole('region', { name: 'Próximas y en curso' }));
  expect(upcoming.getAllByRole('article')).toHaveLength(2);
  expect(within(screen.getByRole('region', { name: 'Historial' })).getAllByRole('article')).toHaveLength(3);
  expect(card('Reserva pendiente').getByText('Pendiente de pago')).toBeInTheDocument();
  expect(card('Reserva pendiente').getByText('Pendiente')).toBeInTheDocument();
  expect(card('Reserva pagada').getByText('Pagada')).toBeInTheDocument();
  expect(card('Reserva pagada').getByText('Aprobado')).toBeInTheDocument();
  expect(card('Reserva cancelada').getByText('Cancelada')).toBeInTheDocument();
  expect(card('Reserva cancelada').getByText('Reembolsado')).toBeInTheDocument();
  expect(card('Reserva expirada').getByText('Expirada')).toBeInTheDocument();
  expect(card('Reserva expirada').getByText('Rechazado')).toBeInTheDocument();
  expect(card('Contrato anterior').getByText('Finalizada')).toBeInTheDocument();
  expect(card('Contrato anterior').getByText('Sin registro de pago')).toBeInTheDocument();
  expect(card('Reserva pendiente').getByText('10:00–12:00')).toBeInTheDocument();
  expect(card('Reserva pendiente').getByText('$24.000 CLP')).toBeInTheDocument();
  expect(card('Reserva pendiente').getByText(/08-10-2026.*09:15:00/)).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith('/api/reservations', expect.objectContaining({
    headers: { Authorization: 'Bearer test-session-token' },
  }));
  expect(fetchMock.mock.calls.filter(([path]) => path === '/api/reservations')).toHaveLength(1);
});

it('HU13: presenta acciones futuras deshabilitadas sólo si el servidor confirma elegibilidad', async () => {
  saveSession();
  const paid = variant(2, 'Pagada futura', { status: 'paid', payment: { ...base.payment!, status: 'approved' }, can_pay: false });
  const started = variant(3, 'Arriendo iniciado', { status: 'paid', payment: { ...base.payment!, status: 'approved' }, can_pay: false, can_cancel: false });
  const expired = variant(4, 'Plazo vencido', { status: 'expired', can_pay: false, can_cancel: false });
  listReply = async () => response(envelope([base, paid, started, expired]));
  render(<App />); await screen.findByRole('article', { name: base.space_name });
  expect(card(base.space_name).getByRole('button', { name: 'Pagar reserva' })).toBeDisabled();
  expect(card(base.space_name).getByRole('button', { name: 'Cancelar reserva' })).toBeDisabled();
  expect(card(base.space_name).getByText(/El pago simulado y la cancelación estarán disponibles próximamente/)).toBeInTheDocument();
  expect(card('Pagada futura').queryByRole('button', { name: 'Pagar reserva' })).not.toBeInTheDocument();
  expect(card('Pagada futura').getByRole('button', { name: 'Cancelar reserva' })).toBeDisabled();
  for (const name of ['Arriendo iniciado', 'Plazo vencido']) expect(card(name).queryByRole('button')).not.toBeInTheDocument();
  expect(fetchMock.mock.calls.every(([, options]) => !options?.method || options.method === 'GET')).toBe(true);
});

it('HU13: diferencia una lista vacía de errores de servicio y permite reintentar sin mostrar datos antiguos', async () => {
  saveSession(); listReply = async () => response({ detail: 'Unavailable' }, 503);
  render(<App />);
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos consultar tus reservas y pagos');
  expect(screen.queryByText('Aún no tienes reservas.')).not.toBeInTheDocument();
  listReply = async () => response(envelope());
  await userEvent.click(screen.getByRole('button', { name: 'Reintentar consulta de reservas' }));
  expect(await screen.findByText('Aún no tienes reservas.')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Explorar espacios' })).toHaveAttribute('href', '#catalogo');
  listReply = async () => { throw new Error('Network disconnected'); };
  await userEvent.click(screen.getByRole('button', { name: 'Actualizar reservas y pagos' }));
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(screen.queryByText('Aún no tienes reservas.')).not.toBeInTheDocument();
});

it.each([
  { items: [], as_of: 'not-a-date' },
  { items: {}, as_of: '2026-10-08T12:00:00Z' },
  envelope([{ ...base, duration_hours: -1 }]),
  envelope([{ ...base, can_pay: 'true' } as unknown as Reservation]),
  envelope([base, base]),
])('HU13: rechaza una respuesta incompleta o corrupta sin convertirla en lista vacía %#', async (body) => {
  const authRequest: AuthRequest = async () => ({ status: 200, body });
  await expect(getReservations(authRequest, new AbortController().signal)).rejects.toThrow();
});

it('HU13: refresca estados efectivos y plazos con la respuesta del backend sin deducirlos del reloj local', async () => {
  saveSession(); listReply = async () => response(envelope([base]));
  render(<App />); await screen.findByRole('article', { name: base.space_name });
  expect(card(base.space_name).getByRole('button', { name: 'Pagar reserva' })).toBeDisabled();
  // El servidor declara la expiración aunque Date.now() del navegador siga antes del plazo mostrado.
  listReply = async () => response(envelope([{ ...base, status: 'expired', can_pay: false, can_cancel: false }], '2026-10-08T12:16:00Z'));
  await userEvent.click(screen.getByRole('button', { name: 'Actualizar reservas y pagos' }));
  await screen.findByText('Expirada');
  expect(card(base.space_name).queryByRole('button')).not.toBeInTheDocument();
  expect(screen.getByText(/Estados consultados el.*09:16:00/)).toBeInTheDocument();
  expect(within(screen.getByRole('region', { name: 'Historial' })).getByRole('article')).toBeInTheDocument();
});

it('HU13: conserva contratos legados fraccionarios y minutos/segundos sin recalcular el precio ni inventar un pago', async () => {
  saveSession(); listReply = async () => response(envelope([legacy])); detailReply = async () => response(legacy);
  render(<App />); await screen.findByRole('article', { name: legacy.space_name });
  expect(card(legacy.space_name).getByText('8,5 horas')).toBeInTheDocument();
  expect(card(legacy.space_name).getByText('10:15:30–18:45:30')).toBeInTheDocument();
  expect(card(legacy.space_name).getByText('$7.500 CLP')).toBeInTheDocument();
  expect(card(legacy.space_name).getByText('$52.000 CLP')).toBeInTheDocument();
  expect(card(legacy.space_name).getByText('Sin registro de pago')).toBeInTheDocument();
  expect(card(legacy.space_name).queryByRole('button')).not.toBeInTheDocument();
  await userEvent.click(card(legacy.space_name).getByRole('link', { name: 'Ver reserva' }));
  await screen.findByText('Estado de la reserva: Finalizada.');
  expect(screen.getByText('10:15:30–18:45:30')).toBeInTheDocument();
  expect(screen.getByText('$52.000 CLP')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Volver a mis reservas' })).toHaveAttribute('href', '#mis-reservas');
  expect(historicalReservationFrom(legacy)).toEqual(legacy);
  expect(() => reservationFrom(legacy)).toThrow();
});

it('HU13: muestra ambos días de un intervalo legado que cruza medianoche en Santiago', async () => {
  saveSession();
  const overnight = { ...legacy, date: '2026-10-08', start_hour: 23, end_hour: 1,
    starts_at: '2026-10-09T02:30:00Z', ends_at: '2026-10-09T04:30:00Z', duration_hours: 2 };
  listReply = async () => response(envelope([overnight]));
  render(<App />); await screen.findByRole('article', { name: legacy.space_name });
  expect(card(legacy.space_name).getByText(/08-10-2026.*23:30:00.*09-10-2026.*01:30:00/)).toBeInTheDocument();
  expect(historicalReservationFrom(overnight).duration_hours).toBe(2);
});

it('HU13: conserva la ruta privada tras iniciar sesión y no consulta reservas anónimas', async () => {
  listReply = async () => response(envelope([base]));
  render(<App />); await screen.findByRole('heading', { name: 'Inicia sesión' });
  expect(fetchMock.mock.calls.some(([path]) => path === '/api/reservations')).toBe(false);
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: user.email } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Clave de prueba 2026!' } });
  await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
  await screen.findByRole('article', { name: base.space_name });
  expect(window.location.hash).toBe('#mis-reservas');
  expect(screen.queryByRole('heading', { name: 'Mis espacios' })).not.toBeInTheDocument();
});

it('HU13: descarta respuestas tardías al cerrar sesión y trata un 401 como sesión vencida', async () => {
  saveSession(); const delayed = deferred(); listReply = () => delayed.promise;
  const mounted = render(<App />); await screen.findByText('Consultando tus reservas y pagos…');
  const signal = fetchMock.mock.calls.find(([path]) => path === '/api/reservations')?.[1]?.signal;
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
  await screen.findByRole('heading', { name: 'Inicia sesión' });
  expect(signal?.aborted).toBe(true);
  await act(async () => delayed.resolve(response(envelope([base]))));
  expect(screen.queryByText(base.space_name)).not.toBeInTheDocument();
  expect(sessionStorage.getItem('rentsmart.session')).toBeNull();
  mounted.unmount(); saveSession(); window.history.replaceState(null, '', '/#mis-reservas');
  listReply = async () => response({}, 401);
  render(<App />); await screen.findByRole('heading', { name: 'Inicia sesión' });
  expect(screen.queryByRole('article')).not.toBeInTheDocument();
  expect(sessionStorage.getItem('rentsmart.session')).toBeNull();
});

it('HU13: descarta una lectura privada al navegar y también antes de recibir hashchange', async () => {
  saveSession(); const delayed = deferred(); listReply = () => delayed.promise;
  const mounted = render(<App />); await screen.findByText('Consultando tus reservas y pagos…');
  window.history.replaceState(null, '', '/#inicio');
  await act(async () => delayed.resolve(response(envelope([base]))));
  expect(screen.queryByText(base.space_name)).not.toBeInTheDocument();
  mounted.unmount(); window.history.replaceState(null, '', '/#mis-reservas');
  const next = deferred(); listReply = () => next.promise;
  render(<App />); await screen.findByText('Consultando tus reservas y pagos…');
  const signal = fetchMock.mock.calls.filter(([path]) => path === '/api/reservations').at(-1)?.[1]?.signal;
  await act(async () => { window.location.hash = 'inicio'; window.dispatchEvent(new HashChangeEvent('hashchange')); });
  expect(signal?.aborted).toBe(true);
  await act(async () => next.resolve(response(envelope([base]))));
  expect(screen.queryByRole('article')).not.toBeInTheDocument();
});

it('HU13: descarta una lectura si la sesión venció mientras esperaba respuesta', async () => {
  saveSession(now + 5000); const delayed = deferred(); listReply = () => delayed.promise;
  render(<App />); await screen.findByText('Consultando tus reservas y pagos…');
  jest.mocked(Date.now).mockReturnValue(now + 5001);
  await act(async () => delayed.resolve(response(envelope([base]))));
  await screen.findByRole('heading', { name: 'Inicia sesión' });
  expect(screen.queryByText(base.space_name)).not.toBeInTheDocument();
  expect(screen.getByText('Tu sesión venció. Inicia sesión nuevamente.')).toBeInTheDocument();
});

it('HU13: no conserva reservas de una cuenta al ingresar posteriormente con otra sesión', async () => {
  saveSession(); listReply = async () => response(envelope([base]));
  render(<App />); await screen.findByRole('article', { name: base.space_name });
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
  await screen.findByRole('heading', { name: 'Inicia sesión' });
  currentAccount = { ...user, id: '002286dc-37c2-4e4b-9c1c-878cdebb33df', name: 'Otra Persona', email: 'otra-cuenta@example.com' };
  issuedToken = 'other-account-session-token';
  listReply = async () => response(envelope());
  await act(async () => { window.history.replaceState(null, '', '/#mis-reservas'); window.dispatchEvent(new HashChangeEvent('hashchange')); });
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'otra-cuenta@example.com' } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Otra clave de prueba 2026!' } });
  await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
  await waitFor(() => expect(screen.getByText('Aún no tienes reservas.')).toBeInTheDocument());
  expect(screen.getByText('Hola, Otra Persona')).toBeInTheDocument();
  expect(fetchMock.mock.calls.filter(([path]) => path === '/api/reservations').at(-1)?.[1]?.headers)
    .toEqual({ Authorization: 'Bearer other-account-session-token' });
  expect(screen.queryByText(base.space_name)).not.toBeInTheDocument();
});
