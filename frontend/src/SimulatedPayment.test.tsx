import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { historicalReservationFrom, simulatePayment, type Reservation } from './reservations';
import { type AuthRequest } from './useSession';

const now = Date.parse('2026-10-08T12:00:00Z');
const account = { id: '03fdcce6-6305-42ba-96d3-04d19e5c962c', name: 'Arrendatario', email: 'tenant@example.com', is_admin: false };
const base: Reservation = {
  id: 'c3acb468-5895-4f57-8748-2b058e6deba4', space_id: '76b1a2f4-d706-431a-b887-2d7e8a7f8e58', space_name: 'Sala de prueba',
  date: '2026-10-09', start_hour: 10, end_hour: 12, starts_at: '2026-10-09T13:00:00Z', ends_at: '2026-10-09T15:00:00Z',
  duration_hours: 2, unit_price: 12000, total_price: 24000, created_at: '2026-10-08T12:00:00Z',
  payment_expires_at: '2026-10-08T12:15:00Z', status: 'pending_payment', can_pay: true, can_cancel: true,
  payment: { id: 'd8e8eb85-8046-4235-b2e5-86f4b0c0567d', status: 'pending', amount: null, processed_at: null },
};
const fetchMock = jest.fn<typeof fetch>();
let current: Reservation;
let payReply: (options?: RequestInit) => Promise<Response>;
let getReply: () => Promise<Response>;
function response(body: unknown, status = 200): Response {
  return { status, ok: status >= 200 && status < 300, json: async () => body } as Response;
}
function processed(result: 'approved' | 'rejected'): Reservation {
  return { ...base, status: result === 'approved' ? 'paid' : 'pending_payment', can_pay: result !== 'approved',
    payment: { ...base.payment!, status: result, amount: base.total_price, processed_at: '2026-10-08T12:01:00Z' } };
}
function saveSession() {
  sessionStorage.setItem('rentsmart.session', JSON.stringify({ access_token: 'tenant-token', expires_at: new Date(now + 1800000).toISOString() }));
}
function navigate(hash: string) {
  act(() => { window.history.replaceState(null, '', `/#${hash}`); window.dispatchEvent(new HashChangeEvent('hashchange')); });
}
function paymentCalls() { return fetchMock.mock.calls.filter(([path]) => String(path).endsWith('/payment')); }

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(now);
  sessionStorage.clear(); saveSession();
  window.history.replaceState(null, '', `/#pago/${base.id}`);
  current = { ...base };
  getReply = async () => response(current);
  payReply = async (options) => {
    current = processed((JSON.parse(options!.body as string) as { result: 'approved' | 'rejected' }).result);
    return response(current);
  };
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (path, options) => {
    if (path === '/api/health/ready') return response({ status: 'ok', database: 'connected' });
    if (path === '/api/auth/me') return response(account);
    if (path === '/api/auth/login') return response({ access_token: 'tenant-token', token_type: 'bearer', user: account,
      expires_at: new Date(now + 1800000).toISOString() });
    if (path === `/api/reservations/${base.id}`) return getReply();
    if (path === '/api/reservations') return response({ items: [current], as_of: '2026-10-08T12:02:00Z' });
    if (path === `/api/reservations/${base.id}/payment`) return payReply(options);
    throw new Error(`Unexpected request: ${String(path)}`);
  });
  globalThis.fetch = fetchMock;
});
afterEach(() => { cleanup(); jest.restoreAllMocks(); });

it('HU16: muestra contrato y aviso, envía solo el resultado y recupera el pago desde Mis reservas y detalle', async () => {
  render(<App />);
  await screen.findByRole('form', { name: 'Simular pago' });
  expect(screen.getByText(/sin movimiento de dinero/)).toBeInTheDocument();
  expect(screen.getByText('$24.000 CLP')).toBeInTheDocument();
  expect(screen.queryByLabelText(/Número de tarjeta|CVV/)).not.toBeInTheDocument();
  expect(paymentCalls()).toHaveLength(0);
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar pago simulado' }));
  expect(await screen.findByText('Pago simulado aprobado. Tu reserva está pagada.')).toBeInTheDocument();
  expect(screen.getByText(base.payment!.id)).toBeInTheDocument();
  expect(screen.queryByRole('form', { name: 'Simular pago' })).not.toBeInTheDocument();
  const request = paymentCalls()[0][1]!;
  expect(JSON.parse(request.body as string)).toEqual({ result: 'approved' });
  expect(request.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer tenant-token' });
  await userEvent.click(screen.getByRole('link', { name: 'Volver a mis reservas' }));
  const card = within(await screen.findByRole('article', { name: base.space_name }));
  expect(card.getByText('Pagada')).toBeInTheDocument();
  expect(card.getByText(base.payment!.id)).toBeInTheDocument();
  await userEvent.click(card.getByRole('link', { name: 'Ver reserva' }));
  expect(await screen.findByText('Estado de la reserva: Pagada.')).toBeInTheDocument();
  expect(screen.getByText(base.payment!.id)).toBeInTheDocument();
});

it('HU16: rechazo permite cambiar el resultado y reintentar con la misma referencia', async () => {
  render(<App />); await screen.findByRole('form', { name: 'Simular pago' });
  await userEvent.click(screen.getByLabelText('Rechazar pago simulado'));
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar pago simulado' }));
  expect(await screen.findByText(/Pago simulado rechazado/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Confirmar pago simulado' })).toBeEnabled();
  await userEvent.click(screen.getByLabelText('Aprobar pago simulado'));
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar pago simulado' }));
  expect(await screen.findByText('Pago simulado aprobado. Tu reserva está pagada.')).toBeInTheDocument();
  expect(paymentCalls()).toHaveLength(2);
  expect(screen.getByText(base.payment!.id)).toBeInTheDocument();
});

it('HU16: evita doble envío y no anuncia aprobación antes de recibir confirmación', async () => {
  let resolve!: (value: Response) => void;
  payReply = () => new Promise<Response>((done) => { resolve = done; });
  render(<App />); await screen.findByRole('form', { name: 'Simular pago' });
  const submit = screen.getByRole('button', { name: 'Confirmar pago simulado' });
  await userEvent.dblClick(submit);
  expect(paymentCalls()).toHaveLength(1);
  expect(screen.getByRole('button', { name: 'Procesando pago simulado…' })).toBeDisabled();
  expect(screen.getByLabelText('Rechazar pago simulado')).toBeDisabled();
  expect(screen.queryByText('Pago simulado aprobado. Tu reserva está pagada.')).not.toBeInTheDocument();
  await act(async () => resolve(response(processed('approved'))));
  expect(await screen.findByText('Pago simulado aprobado. Tu reserva está pagada.')).toBeInTheDocument();
});

it('HU16: fallo de red conserva selección y consulta estado antes de reintentar un resultado incierto', async () => {
  payReply = async () => { current = processed('approved'); throw new Error('detalle de red'); };
  render(<App />); await screen.findByRole('form', { name: 'Simular pago' });
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar pago simulado' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos confirmar el pago simulado');
  expect(screen.getByLabelText('Aprobar pago simulado')).toBeChecked();
  await userEvent.click(screen.getByRole('button', { name: 'Actualizar reserva' }));
  expect(await screen.findByText('Pagada')).toBeInTheDocument();
  expect(screen.getByText(base.payment!.id)).toBeInTheDocument();
  expect(paymentCalls()).toHaveLength(1);
});

it('HU16: un conflicto por vencimiento actualiza la reserva y retira el formulario', async () => {
  payReply = async () => { current = { ...base, status: 'expired', can_pay: false, can_cancel: false }; return response({}, 409); };
  render(<App />); await screen.findByRole('form', { name: 'Simular pago' });
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar pago simulado' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('ya no admite un nuevo pago');
  await userEvent.click(screen.getByRole('button', { name: 'Actualizar reserva' }));
  expect(await screen.findByText('Expirada')).toBeInTheDocument();
  expect(screen.queryByRole('form')).not.toBeInTheDocument();
});

it.each(['cancelled', 'expired', 'completed', 'paid'] as const)('HU16: una lectura %s no ofrece procesar pago', async (status) => {
  current = { ...base, status, can_pay: false, can_cancel: false };
  render(<App />);
  expect(await screen.findByText('Esta reserva no admite un nuevo pago.')).toBeInTheDocument();
  expect(screen.queryByRole('form')).not.toBeInTheDocument();
  expect(paymentCalls()).toHaveLength(0);
});

it('HU16: el acceso privado vuelve al mismo pago después del login', async () => {
  sessionStorage.clear(); render(<App />);
  await screen.findByRole('heading', { name: 'Inicia sesión' });
  expect(fetchMock.mock.calls.some(([path]) => String(path).includes('/api/reservations'))).toBe(false);
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: account.email } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Clave de prueba 2026!' } });
  await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
  await screen.findByRole('form', { name: 'Simular pago' });
  expect(window.location.hash).toBe(`#pago/${base.id}`);
});

it.each(['logout', 'navigate', 'expire'] as const)('HU16: descarta resultado tardío por %s', async (action) => {
  let resolve!: (value: Response) => void;
  payReply = () => new Promise<Response>((done) => { resolve = done; });
  render(<App />); await screen.findByRole('form', { name: 'Simular pago' });
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar pago simulado' }));
  const signal = paymentCalls()[0][1]?.signal;
  if (action === 'logout') await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
  if (action === 'navigate') navigate('inicio');
  if (action === 'expire') jest.mocked(Date.now).mockReturnValue(now + 1800001);
  await act(async () => resolve(response(processed('approved'))));
  expect(screen.queryByText('Pago simulado aprobado. Tu reserva está pagada.')).not.toBeInTheDocument();
  if (action !== 'expire') expect(signal?.aborted).toBe(true);
  if (action !== 'navigate') await screen.findByRole('heading', { name: 'Inicia sesión' });
});

it.each([
  { ...processed('approved'), id: '00000001-5895-4f57-8748-2b058e6deba4' },
  { ...processed('approved'), total_price: 1 },
  { ...processed('approved'), payment: { ...processed('approved').payment!, amount: 1 } },
  { ...processed('approved'), payment: { ...processed('approved').payment!, id: '00000001-5895-4f57-8748-2b058e6deba4' } },
  { ...processed('approved'), payment: { ...processed('approved').payment!, processed_at: 'invalid' } },
  { ...processed('approved'), payment: { ...base.payment!, status: 'approved' } },
  { ...processed('approved'), status: 'pending_payment' },
])('HU16: una respuesta de pago corrupta no confirma éxito %#', async (body) => {
  const authRequest: AuthRequest = async () => ({ status: 200, body });
  await expect(simulatePayment(base, 'approved', authRequest, new AbortController().signal)).rejects.toThrow();
});

it('HU16: mantiene la lectura de pagos legados sin inventar fecha ni importe', () => {
  const legacy = { ...base, payment: { id: base.payment!.id, status: 'approved' } };
  expect(historicalReservationFrom(legacy).payment).toEqual(legacy.payment);
});
