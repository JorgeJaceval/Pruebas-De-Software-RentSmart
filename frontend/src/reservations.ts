import { type AuthRequest } from './useSession';

export type ReservationInput = { space_id: string; date: string; start_hour: number; end_hour: number };
export type ReservationFields = { date: string; start_hour: string; end_hour: string };
export type ReservationErrors = Partial<Record<keyof ReservationFields | 'form', string>>;
export type Reservation = {
  id: string; space_id: string; space_name: string; date: string; start_hour: number; end_hour: number;
  starts_at: string; ends_at: string; duration_hours: number; unit_price: number; total_price: number;
  created_at: string; payment_expires_at: string;
  status: 'pending_payment' | 'paid' | 'cancelled' | 'expired' | 'completed';
  payment: { id: string; status: 'pending' | 'rejected' | 'approved' | 'refunded' } | null;
};
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const localDate = /^\d{4}-\d{2}-\d{2}$/;
const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const santiago = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });

function santiagoParts(value: number) {
  const parts = Object.fromEntries(santiago.formatToParts(value).map((part) => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), minute: Number(parts.minute), second: Number(parts.second) };
}

export function reservationDateLimits(now = Date.now()) {
  const today = santiagoParts(now).date;
  const maximum = new Date(`${today}T12:00:00Z`);
  maximum.setUTCDate(maximum.getUTCDate() + 90);
  return { minimum: today, maximum: maximum.toISOString().slice(0, 10) };
}

export function validateReservation(fields: ReservationFields, opening: number, closing: number): ReservationErrors {
  const errors: ReservationErrors = {};
  const limits = reservationDateLimits();
  if (!localDate.test(fields.date) || fields.date < limits.minimum || fields.date > limits.maximum) {
    errors.date = 'Elige una fecha desde hoy y hasta 90 días adelante, en Santiago.';
  }
  const start = Number(fields.start_hour), end = Number(fields.end_hour);
  if (!/^\d{1,2}$/.test(fields.start_hour) || !Number.isInteger(start) || start < opening || start >= closing) {
    errors.start_hour = 'Selecciona una hora de inicio dentro del horario del espacio.';
  }
  if (!/^\d{1,2}$/.test(fields.end_hour) || !Number.isInteger(end) || end <= opening || end > closing ||
    end <= start || end - start > 8) {
    errors.end_hour = 'Elige un intervalo de 1 a 8 horas con término posterior al inicio.';
  }
  const current = santiagoParts(Date.now());
  if (!errors.date && !errors.start_hour && fields.date === current.date && start <= current.hour) {
    errors.start_hour = 'El inicio debe ser posterior a la hora actual en Santiago.';
  }
  return errors;
}

export function reservationFrom(value: unknown): Reservation {
  if (typeof value !== 'object' || value === null) throw new Error('Invalid reservation');
  const data = value as Record<string, unknown>;
  if (typeof data.id !== 'string' || !uuid.test(data.id) || typeof data.space_id !== 'string' || !uuid.test(data.space_id) ||
    typeof data.space_name !== 'string' || !data.space_name.trim() || typeof data.date !== 'string' || !localDate.test(data.date) ||
    typeof data.start_hour !== 'number' || !Number.isInteger(data.start_hour) || data.start_hour < 0 ||
    typeof data.end_hour !== 'number' || !Number.isInteger(data.end_hour) || data.end_hour > 23 || data.end_hour <= data.start_hour ||
    typeof data.duration_hours !== 'number' || !Number.isInteger(data.duration_hours) || data.duration_hours < 1 || data.duration_hours > 8 ||
    data.duration_hours !== data.end_hour - data.start_hour || typeof data.unit_price !== 'number' || !Number.isInteger(data.unit_price) ||
    data.unit_price < 500 || data.unit_price > 500_000 || typeof data.total_price !== 'number' || !Number.isSafeInteger(data.total_price) ||
    data.total_price !== data.duration_hours * data.unit_price || typeof data.status !== 'string' ||
    !['pending_payment', 'paid', 'cancelled', 'expired', 'completed'].includes(data.status) ||
    (data.payment !== null && typeof data.payment !== 'object')) throw new Error('Invalid reservation');
  const payment = data.payment as Record<string, unknown> | null;
  if (payment !== null && (typeof payment.id !== 'string' || !uuid.test(payment.id) || typeof payment.status !== 'string' ||
    !['pending', 'rejected', 'approved', 'refunded'].includes(payment.status))) throw new Error('Invalid payment');
  const allowed: Record<string, string[]> = { pending_payment: ['pending', 'rejected'], paid: ['approved'],
    completed: ['approved'], expired: ['pending', 'rejected'], cancelled: ['pending', 'rejected', 'refunded'] };
  if (payment !== null && !allowed[data.status].includes(payment.status as string)) throw new Error('Inconsistent reservation status');
  const times: Record<string, number> = {};
  for (const key of ['starts_at', 'ends_at', 'created_at', 'payment_expires_at']) {
    if (typeof data[key] !== 'string' || !timestamp.test(data[key]) || !Number.isFinite(Date.parse(data[key]))) throw new Error('Invalid timestamp');
    times[key] = Date.parse(data[key]);
  }
  const start = santiagoParts(times.starts_at), end = santiagoParts(times.ends_at);
  if (start.date !== data.date || end.date !== data.date || start.hour !== data.start_hour || end.hour !== data.end_hour ||
    start.minute !== 0 || end.minute !== 0 || start.second !== 0 || end.second !== 0 ||
    times.starts_at % 1000 !== 0 || times.ends_at % 1000 !== 0 ||
    times.ends_at - times.starts_at !== data.duration_hours * 3_600_000 || times.created_at >= times.starts_at ||
    times.payment_expires_at !== Math.min(times.created_at + 15 * 60_000, times.starts_at)) throw new Error('Inconsistent reservation interval');
  return { id: data.id.toLowerCase(), space_id: data.space_id.toLowerCase(), space_name: data.space_name,
    date: data.date, start_hour: data.start_hour, end_hour: data.end_hour, starts_at: data.starts_at as string,
    ends_at: data.ends_at as string, duration_hours: data.duration_hours, unit_price: data.unit_price,
    total_price: data.total_price, created_at: data.created_at as string, payment_expires_at: data.payment_expires_at as string,
    status: data.status as Reservation['status'], payment: payment === null ? null : { id: (payment.id as string).toLowerCase(), status: payment.status as NonNullable<Reservation['payment']>['status'] } };
}

export class ReservationError extends Error {
  constructor(public readonly errors: ReservationErrors) { super(errors.form ?? 'Revisa el horario seleccionado.'); }
}
export class ReservationUnavailable extends Error {}

export async function createReservation(input: ReservationInput, authRequest: AuthRequest, signal: AbortSignal): Promise<Reservation | undefined> {
  let result;
  try {
    result = await authRequest('/api/reservations', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input), signal });
  } catch {
    throw new ReservationError({ form: 'No pudimos confirmar la solicitud. Tus datos se conservaron; vuelve a intentarlo.' });
  }
  if (!result) return undefined;
  if (result.status === 201) {
    try {
      const reservation = reservationFrom(result.body);
      if (reservation.space_id !== input.space_id.toLowerCase() || reservation.date !== input.date ||
        reservation.start_hour !== input.start_hour || reservation.end_hour !== input.end_hour ||
        reservation.status !== 'pending_payment' || reservation.payment?.status !== 'pending') throw new Error('Unexpected reservation');
      return reservation;
    } catch { throw new ReservationError({ form: 'El servicio respondió con datos incompletos. No pudimos confirmar la reserva.' }); }
  }
  const errors: ReservationErrors = {};
  if (typeof result.body === 'object' && result.body !== null && 'errors' in result.body &&
    typeof result.body.errors === 'object' && result.body.errors !== null) {
    for (const key of ['date', 'start_hour', 'end_hour', 'form'] as (keyof ReservationErrors)[]) {
      const message = (result.body.errors as Record<string, unknown>)[key];
      if (typeof message === 'string' && message.trim()) errors[key] = message;
    }
  }
  if (!Object.keys(errors).length) errors.form = result.status === 409 ? 'Ese horario ya no está disponible. Elige otro intervalo.' :
    result.status === 404 || result.status === 403 ? 'Este espacio no admite reservas nuevas.' :
    result.status === 422 ? 'Revisa la fecha y las horas seleccionadas.' :
    'No pudimos crear la reserva. Tus datos se conservaron; vuelve a intentarlo.';
  throw new ReservationError(errors);
}

export async function getReservation(id: string, authRequest: AuthRequest, signal: AbortSignal): Promise<Reservation | undefined> {
  if (!uuid.test(id)) throw new ReservationUnavailable();
  const result = await authRequest(`/api/reservations/${id}`, { signal });
  if (!result) return undefined;
  if (result.status === 404 || result.status === 403) throw new ReservationUnavailable();
  if (result.status !== 200) throw new Error('Reservation unavailable');
  const reservation = reservationFrom(result.body);
  if (reservation.id !== id.toLowerCase()) throw new Error('Unexpected reservation');
  return reservation;
}

export function hourLabel(hour: number) { return `${String(hour).padStart(2, '0')}:00`; }
export function formatClp(amount: number) { return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount); }
