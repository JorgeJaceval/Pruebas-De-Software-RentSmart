import { useEffect, useRef, useState, type FormEvent } from 'react';
import { type PublicSpaceDetail } from './publicSpaces';
import { createReservation, formatClp, hourLabel, reservationDateLimits, ReservationError,
  validateReservation, type ReservationFields, type ReservationErrors } from './reservations';
import { type AuthRequest } from './useSession';

const emptyFields: ReservationFields = { date: '', start_hour: '', end_hour: '' };
function readDraft(id: string): ReservationFields {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(`rentsmart.reservation-draft.${id}`) ?? 'null');
    if (typeof value === 'object' && value !== null && 'date' in value && typeof value.date === 'string' &&
      'start_hour' in value && typeof value.start_hour === 'string' && 'end_hour' in value && typeof value.end_hour === 'string') {
      return { date: value.date, start_hour: value.start_hour, end_hour: value.end_hour };
    }
  } catch { /* Selection remains usable without browser storage. */ }
  return { ...emptyFields };
}

export default function ReservationForm({ space, guest, authRequest }: {
  space: PublicSpaceDetail; guest: boolean; authRequest: AuthRequest;
}) {
  const [fields, setFields] = useState(() => readDraft(space.id));
  const [errors, setErrors] = useState<ReservationErrors>({});
  const [sending, setSending] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const limits = reservationDateLimits();
  const hours = Array.from({ length: space.closing_hour - space.opening_hour + 1 }, (_, index) => space.opening_hour + index);
  const duration = Number(fields.end_hour) - Number(fields.start_hour);
  const completeHours = fields.start_hour !== '' && fields.end_hour !== '';
  const invalidInterval = completeHours && (duration <= 0 || duration > 8);
  const estimated = completeHours && !invalidInterval;

  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => {
    try { sessionStorage.setItem(`rentsmart.reservation-draft.${space.id}`, JSON.stringify(fields)); }
    catch { /* Keep the selection in memory when storage is unavailable. */ }
  }, [space.id, fields]);

  function change(key: keyof ReservationFields, value: string) {
    setFields((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined, form: undefined }));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (guest || pending.current) return;
    const validation = validateReservation(fields, space.opening_hour, space.closing_hour);
    setErrors(validation);
    if (Object.keys(validation).length) return;
    const controller = new AbortController();
    const origin = window.location.hash;
    pending.current = controller;
    setSending(true);
    try {
      const reservation = await createReservation({ space_id: space.id, date: fields.date,
        start_hour: Number(fields.start_hour), end_hour: Number(fields.end_hour) }, authRequest, controller.signal);
      if (controller.signal.aborted || window.location.hash !== origin || !reservation) return;
      try { sessionStorage.removeItem(`rentsmart.reservation-draft.${space.id}`); } catch { /* Optional draft storage. */ }
      window.location.hash = `reserva/${reservation.id}`;
    } catch (error) {
      if (!controller.signal.aborted && window.location.hash === origin) setErrors(error instanceof ReservationError ? error.errors :
        { form: 'No pudimos confirmar la reserva. Tus datos se conservaron; vuelve a intentarlo.' });
    } finally {
      if (!controller.signal.aborted) { pending.current = null; setSending(false); }
    }
  }

  return <section className="detail-reservation" aria-labelledby="detail-reservation-title">
    <h2 id="detail-reservation-title">Elige fecha y horario</h2>
    <p>Arriendo por hora. El horario de apertura y cierre se aplica todos los días, en la zona horaria de Santiago.</p>
    <p className="field-help">El inicio debe ser futuro y como máximo 90 días adelante. Duración de 1 a 8 horas, dentro del mismo día.</p>
    <form onSubmit={(event) => void submit(event)} noValidate aria-label="Solicitar reserva" aria-busy={sending}>
      <fieldset disabled={sending} className="reservation-fields">
        <div className="space-fields-grid">
          <div className="form-field"><label htmlFor="detail-date">Fecha</label>
            <input id="detail-date" type="date" min={limits.minimum} max={limits.maximum} value={fields.date}
              aria-invalid={Boolean(errors.date)} aria-describedby={errors.date ? 'reservation-date-error' : undefined}
              onChange={(event) => change('date', event.target.value)} />
            {errors.date && <p id="reservation-date-error" className="form-error" role="alert">{errors.date}</p>}</div>
          <div className="form-field"><label htmlFor="detail-start">Hora de inicio</label>
            <select id="detail-start" value={fields.start_hour} aria-invalid={Boolean(errors.start_hour)}
              aria-describedby={errors.start_hour ? 'reservation-start-error' : undefined} onChange={(event) => change('start_hour', event.target.value)}>
              <option value="">Seleccionar inicio</option>{hours.slice(0, -1).map((hour) => <option key={hour} value={hour}>{hourLabel(hour)}</option>)}
            </select>{errors.start_hour && <p id="reservation-start-error" className="form-error" role="alert">{errors.start_hour}</p>}</div>
          <div className="form-field"><label htmlFor="detail-end">Hora de término</label>
            <select id="detail-end" value={fields.end_hour} aria-invalid={Boolean(errors.end_hour) || invalidInterval}
              aria-describedby={errors.end_hour || invalidInterval ? 'reservation-end-error' : undefined}
              onChange={(event) => change('end_hour', event.target.value)}>
              <option value="">Seleccionar término</option>{hours.slice(1).map((hour) => <option key={hour} value={hour}>{hourLabel(hour)}</option>)}
            </select>{(errors.end_hour || invalidInterval) && <p id="reservation-end-error" className="form-error" role="alert">
              {errors.end_hour || 'Elige un intervalo de 1 a 8 horas con término posterior al inicio.'}</p>}</div>
        </div>
      </fieldset>
      {estimated && <div className="reservation-estimate" aria-label="Resumen estimado">
        <p>Duración: {duration} {duration === 1 ? 'hora' : 'horas'}</p>
        <p>Total estimado: <strong>{formatClp(duration * space.price_per_hour)} CLP</strong></p>
        <p className="field-help">El servidor confirmará disponibilidad y precio al crear la reserva.</p>
      </div>}
      {errors.form && <p className="form-error" role="alert">{errors.form}</p>}
      {guest ? <a className="registration-link" href={`#sesion/espacio/${space.id}`}>Iniciar sesión para reservar</a> :
        <><p className="field-help">La reserva quedará pendiente de pago por hasta 15 minutos o hasta su inicio, lo que ocurra primero.</p>
          <button type="submit" disabled={sending || !fields.date || !completeHours || invalidInterval}>
            {sending ? 'Solicitando reserva…' : 'Solicitar reserva'}</button></>}
    </form>
  </section>;
}
