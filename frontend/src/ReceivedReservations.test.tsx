import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { cancelReservation, getReceivedReservations, type ReceivedReservation } from './reservations';
import { type AuthRequest } from './useSession';

const now = Date.parse('2026-10-08T12:00:00Z');
const account = { id: '03fdcce6-6305-42ba-96d3-04d19e5c962c', name: 'Propietario', email: 'owner@example.com', is_admin: false };
const space = { id: '76b1a2f4-d706-431a-b887-2d7e8a7f8e58', owner_id: account.id, name: 'Sala central',
  description: 'Una sala tranquila para reuniones y trabajo en equipo.', category: 'meeting_room', commune: 'Providencia',
  location_reference: 'Cerca del metro Los Leones', capacity: 8, price_per_hour: 25000,
  conditions: 'Mantener el espacio limpio y respetar el horario.', photos: ['https://example.com/sala.jpg'],
  opening_hour: 9, closing_hour: 18, is_active: false, is_withdrawn: false };
const secondSpace = { ...space, id: '86b1a2f4-d706-431a-b887-2d7e8a7f8e58', name: 'Estudio retirado', is_withdrawn: true };
const reservation: ReceivedReservation = {
  id: 'c3acb468-5895-4f57-8748-2b058e6deba4', space_id: space.id, space_name: space.name, tenant_name: 'Arrendataria de prueba',
  date: '2026-10-09', start_hour: 10, end_hour: 12, starts_at: '2026-10-09T13:00:00Z', ends_at: '2026-10-09T15:00:00Z',
  duration_hours: 2, unit_price: 12000, total_price: 24000, created_at: '2026-10-08T12:00:00Z',
  payment_expires_at: '2026-10-08T12:15:00Z', status: 'pending_payment', can_pay: false, can_cancel: true,
  payment: { id: 'd8e8eb85-8046-4235-b2e5-86f4b0c0567d', status: 'pending' },
};
const fetchMock = jest.fn<typeof fetch>();
let reply: (path: string) => Promise<Response>;
let cancelReply: () => Promise<Response>;
const cancelled = (): ReceivedReservation => ({ ...reservation, status: 'cancelled', can_pay: false, can_cancel: false });
function response(body: unknown, status = 200): Response {
  return { status, ok: status >= 200 && status < 300, json: async () => body } as Response;
}
function envelope(items: ReceivedReservation[] = []) { return { items, as_of: '2026-10-08T12:00:00Z' }; }
function saveSession() {
  sessionStorage.setItem('rentsmart.session', JSON.stringify({ access_token: 'owner-token', expires_at: new Date(now + 1800000).toISOString() }));
}
function navigate(hash: string) {
  act(() => { window.history.replaceState(null, '', `/#${hash}`); window.dispatchEvent(new HashChangeEvent('hashchange')); });
}

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(now);
  sessionStorage.clear(); saveSession();
  window.history.replaceState(null, '', '/#reservas-recibidas');
  reply = async () => response(envelope([reservation]));
  cancelReply = async () => response(cancelled());
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (path) => {
    if (path === '/api/health/ready') return response({ status: 'ok', database: 'connected' });
    if (path === '/api/auth/me') return response(account);
    if (path === '/api/auth/login') return response({ access_token: 'owner-token', token_type: 'bearer', user: account,
      expires_at: new Date(now + 1800000).toISOString() });
    if (path === '/api/spaces/mine') return response([space, secondSpace]);
    if (String(path).endsWith('/cancel')) return cancelReply();
    if (String(path).startsWith('/api/reservations/received')) return reply(String(path));
    throw new Error(`Unexpected request: ${String(path)}`);
  });
  globalThis.fetch = fetchMock;
});
afterEach(() => { cleanup(); jest.restoreAllMocks(); });

it('HU14: muestra arrendatario, contrato y estados, permite filtrar espacios inactivos y retirados', async () => {
  render(<App />);
  const card = within(await screen.findByRole('article', { name: space.name }));
  expect(card.getByText(reservation.tenant_name)).toBeInTheDocument();
  expect(card.getByText('$24.000 CLP')).toBeInTheDocument();
  expect(card.getByText('$12.000 CLP')).toBeInTheDocument();
  expect(card.getByText('10:00–12:00')).toBeInTheDocument();
  expect(card.getByText('Pendiente de pago')).toBeInTheDocument();
  expect(card.getByRole('button', { name: 'Cancelar reserva' })).toBeEnabled();
  expect(card.queryByRole('button', { name: /Pagar|Aprobar/ })).not.toBeInTheDocument();
  // El enlace al detalle del arrendatario no es un recurso del propietario.
  expect(card.queryByRole('link', { name: 'Ver reserva' })).not.toBeInTheDocument();
  expect(screen.getByRole('option', { name: secondSpace.name })).toBeInTheDocument();
  reply = async () => response(envelope());
  await userEvent.selectOptions(screen.getByLabelText('Filtrar por espacio'), secondSpace.id);
  expect(await screen.findByText('Este espacio aún no tiene reservas.')).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith(`/api/reservations/received?space_id=${secondSpace.id}`, expect.objectContaining({
    headers: { Authorization: 'Bearer owner-token' },
  }));
  await userEvent.selectOptions(screen.getByLabelText('Filtrar por espacio'), '');
  expect(await screen.findByText('Aún no has recibido reservas.')).toBeInTheDocument();
});

it('HU14: un acceso desde Mis espacios conserva el filtro al recargar', async () => {
  navigate('mis-espacios'); render(<App />);
  const owned = within(await screen.findByRole('article', { name: space.name }));
  await userEvent.click(owned.getByRole('link', { name: 'Consultar reservas' }));
  await screen.findByRole('heading', { name: 'Reservas recibidas' });
  expect(await screen.findByLabelText('Filtrar por espacio')).toHaveValue(space.id);
  expect(window.location.hash).toBe(`#reservas-recibidas/${space.id}`);
  cleanup(); render(<App />);
  expect(await screen.findByLabelText('Filtrar por espacio')).toHaveValue(space.id);
});

it('HU14: presenta próximas e historial, contratos antiguos y pago faltante; actualiza estados desde servidor', async () => {
  const old: ReceivedReservation = { ...reservation, id: '00000001-5895-4f57-8748-2b058e6deba4', space_name: 'Contrato antiguo',
    status: 'completed', can_cancel: false, payment: null, duration_hours: 1.5,
    starts_at: '2026-10-09T13:15:30Z', ends_at: '2026-10-09T14:45:30Z', end_hour: 11, total_price: 17000 };
  reply = async () => response(envelope([reservation, old]));
  render(<App />); await screen.findByRole('article', { name: old.space_name });
  expect(within(screen.getByRole('region', { name: 'Próximas y en curso' })).getAllByRole('article')).toHaveLength(1);
  const history = within(screen.getByRole('region', { name: 'Historial' }));
  expect(history.getByText('Sin registro de pago')).toBeInTheDocument();
  expect(history.getByText('1,5 horas')).toBeInTheDocument();
  expect(history.getByText('10:15:30–11:45:30')).toBeInTheDocument();
  expect(history.getByText('$17.000 CLP')).toBeInTheDocument();
  reply = async () => response(envelope([{ ...reservation, status: 'expired', can_cancel: false }]));
  await userEvent.click(screen.getByRole('button', { name: 'Actualizar reservas recibidas' }));
  expect(await screen.findByText('Expirada')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Cancelar reserva' })).not.toBeInTheDocument();
});

it('HU14: distingue error y vacío y permite reintentar sin conservar reservas antiguas', async () => {
  reply = async () => response({}, 503);
  render(<App />);
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos consultar las reservas recibidas');
  expect(screen.queryByText('Aún no has recibido reservas.')).not.toBeInTheDocument();
  reply = async () => response(envelope());
  await userEvent.click(screen.getByRole('button', { name: 'Reintentar reservas recibidas' }));
  expect(await screen.findByText('Aún no has recibido reservas.')).toBeInTheDocument();
});

it('HU14: espacio no autorizado muestra un error recuperable y no una lista vacía', async () => {
  navigate(`reservas-recibidas/${secondSpace.id}`);
  reply = async (path) => path.includes('?') ? response({}, 404) : response(envelope());
  render(<App />);
  expect(await screen.findByRole('alert')).toHaveTextContent('No encontramos ese espacio');
  await userEvent.click(screen.getByRole('button', { name: 'Consultar todos mis espacios' }));
  expect(await screen.findByText('Aún no has recibido reservas.')).toBeInTheDocument();
});

it('HU14: conserva la ruta y el filtro tras login sin consultar datos anónimos', async () => {
  sessionStorage.clear(); navigate(`reservas-recibidas/${space.id}`);
  render(<App />); await screen.findByRole('heading', { name: 'Inicia sesión' });
  expect(fetchMock.mock.calls.some(([path]) => String(path).startsWith('/api/reservations'))).toBe(false);
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: account.email } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Clave de prueba 2026!' } });
  await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
  expect(await screen.findByLabelText('Filtrar por espacio')).toHaveValue(space.id);
  expect(window.location.hash).toBe(`#reservas-recibidas/${space.id}`);
});

it.each(['logout', 'navigate', 'expire'] as const)('HU14: descarta una respuesta tardía por %s', async (action) => {
  let resolve!: (value: Response) => void;
  reply = () => new Promise<Response>((done) => { resolve = done; });
  render(<App />); await screen.findByText('Consultando reservas recibidas…');
  const signal = fetchMock.mock.calls.find(([path]) => path === '/api/reservations/received')?.[1]?.signal;
  if (action === 'logout') await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
  if (action === 'navigate') navigate('inicio');
  if (action === 'expire') jest.mocked(Date.now).mockReturnValue(now + 1800001);
  await act(async () => resolve(response(envelope([reservation]))));
  expect(screen.queryByText(reservation.tenant_name)).not.toBeInTheDocument();
  if (action !== 'expire') expect(signal?.aborted).toBe(true);
  if (action !== 'navigate') await screen.findByRole('heading', { name: 'Inicia sesión' });
});

it.each([
  { items: {}, as_of: '2026-10-08T12:00:00Z' },
  { ...envelope(), as_of: 'invalid' },
  envelope([{ ...reservation, tenant_name: '' }]),
  envelope([{ ...reservation, can_pay: true }]),
  envelope([reservation, reservation]),
  envelope([{ ...reservation, space_id: secondSpace.id }]),
])('HU14: rechaza respuestas corruptas o de otro filtro %#', async (body) => {
  const authRequest: AuthRequest = async () => ({ status: 200, body });
  await expect(getReceivedReservations(space.id, authRequest, new AbortController().signal)).rejects.toThrow();
});


it('HU14 CA05: confirmar es explícito, volver/Escape no envían solicitudes y restauran el foco', async () => {
  render(<App />);
  const trigger = await screen.findByRole('button', { name: 'Cancelar reserva' });
  await userEvent.click(trigger);
  const dialog = screen.getByRole('alertdialog');
  expect(dialog).toHaveTextContent(reservation.date);
  expect(dialog).toHaveTextContent('10:00–12:00');
  expect(dialog).toHaveTextContent('No hay un pago aprobado');
  expect(screen.getByRole('button', { name: 'Volver sin cancelar' })).toHaveFocus();
  await userEvent.tab({ shift: true });
  expect(screen.getByRole('button', { name: 'Confirmar cancelación' })).toHaveFocus();
  await userEvent.tab();
  expect(screen.getByRole('button', { name: 'Volver sin cancelar' })).toHaveFocus();
  await userEvent.click(screen.getByRole('button', { name: 'Volver sin cancelar' }));
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  await userEvent.click(trigger);
  await userEvent.keyboard('{Escape}');
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  expect(fetchMock.mock.calls.some(([path]) => String(path).endsWith('/cancel'))).toBe(false);
});

it('HU14 CA05: cancela, conserva el filtro y mueve la reserva a historial sin conceder pagos', async () => {
  navigate(`reservas-recibidas/${space.id}`);
  render(<App />);
  await userEvent.click(await screen.findByRole('button', { name: 'Cancelar reserva' }));
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));
  expect(await screen.findByText('Reserva cancelada. El horario quedó liberado y conservamos el historial.')).toBeInTheDocument();
  const history = screen.getByRole('region', { name: 'Historial' });
  expect(within(history).getByText('Cancelada')).toBeInTheDocument();
  expect(within(history).getByText(reservation.tenant_name)).toBeInTheDocument();
  expect(screen.getByLabelText('Filtrar por espacio')).toHaveValue(space.id);
  expect(screen.queryByRole('button', { name: 'Cancelar reserva' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Pagar|Aprobar/ })).not.toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith(`/api/reservations/${reservation.id}/cancel`, expect.objectContaining({
    method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner-token' },
  }));
});

it('HU14 CA05: anticipa reembolso total simulado y muestra el resultado persistido', async () => {
  const payment = { ...reservation.payment!, status: 'approved' as const, amount: 24000, processed_at: '2026-10-08T12:01:00Z' };
  reply = async () => response(envelope([{ ...reservation, status: 'paid', payment }]));
  cancelReply = async () => response({ ...cancelled(), payment: { ...payment, status: 'refunded' } });
  render(<App />);
  await userEvent.click(await screen.findByRole('button', { name: 'Cancelar reserva' }));
  expect(screen.getByRole('alertdialog')).toHaveTextContent('reembolso total simulado de $24.000 CLP');
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));
  expect(await screen.findByText('Reembolsado')).toBeInTheDocument();
  expect(screen.getByText(payment.id)).toBeInTheDocument();
});

it.each([409, 404, 503, 'network'] as const)('HU14 CA05: el fallo %s no anuncia éxito ni modifica el contrato', async (failure) => {
  cancelReply = async () => { if (failure === 'network') throw new Error('offline'); return response({}, failure); };
  render(<App />);
  await userEvent.click(await screen.findByRole('button', { name: 'Cancelar reserva' }));
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));
  await screen.findByRole('alert');
  expect(screen.queryByText('Reserva cancelada. El horario quedó liberado y conservamos el historial.')).not.toBeInTheDocument();
  expect(screen.getByText('Pendiente de pago')).toBeInTheDocument();
  expect(screen.getByText('$24.000 CLP')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Volver sin cancelar' }));
  reply = async () => response(envelope([{ ...reservation, ...cancelled() }]));
  await userEvent.click(screen.getByRole('button', { name: 'Actualizar reservas recibidas' }));
  expect(await screen.findByText('Cancelada')).toBeInTheDocument();
});

it('HU14 CA05: impide confirmaciones duplicadas mientras espera al servidor', async () => {
  let resolve!: (value: Response) => void;
  cancelReply = () => new Promise<Response>((done) => { resolve = done; });
  render(<App />);
  await userEvent.click(await screen.findByRole('button', { name: 'Cancelar reserva' }));
  const confirm = screen.getByRole('button', { name: 'Confirmar cancelación' });
  await userEvent.dblClick(confirm);
  expect(confirm).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Volver sin cancelar' })).toBeDisabled();
  expect(fetchMock.mock.calls.filter(([path]) => String(path).endsWith('/cancel'))).toHaveLength(1);
  await act(async () => resolve(response(cancelled())));
  expect(await screen.findByText('Cancelada')).toBeInTheDocument();
});

it.each(['logout', 'navigate', 'expire'] as const)('HU14 CA05: descarta cancelación tardía por %s', async (action) => {
  let resolve!: (value: Response) => void;
  cancelReply = () => new Promise<Response>((done) => { resolve = done; });
  render(<App />);
  await userEvent.click(await screen.findByRole('button', { name: 'Cancelar reserva' }));
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));
  const signal = fetchMock.mock.calls.find(([path]) => String(path).endsWith('/cancel'))?.[1]?.signal;
  if (action === 'logout') await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
  if (action === 'navigate') navigate('inicio');
  if (action === 'expire') jest.mocked(Date.now).mockReturnValue(now + 1800001);
  await act(async () => resolve(response(cancelled())));
  expect(screen.queryByText('Reserva cancelada. El horario quedó liberado y conservamos el historial.')).not.toBeInTheDocument();
  if (action !== 'expire') expect(signal?.aborted).toBe(true);
  if (action !== 'navigate') await screen.findByRole('heading', { name: 'Inicia sesión' });
});

it.each([
  { ...cancelled(), id: secondSpace.id },
  { ...cancelled(), total_price: 1 },
  { ...cancelled(), status: 'paid' },
  { ...cancelled(), can_cancel: true },
  { ...cancelled(), payment: { ...reservation.payment!, status: 'approved' } },
])('HU14 CA05: una respuesta corrupta no confirma cancelación %#', async (body) => {
  const authRequest: AuthRequest = async () => ({ status: 200, body });
  await expect(cancelReservation(reservation, authRequest, new AbortController().signal)).rejects.toThrow('datos incompletos');
});
