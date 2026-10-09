import { useEffect, useRef, useState } from 'react';
import { formatClp, getReservation, paymentStatuses, reservationDuration, reservationInterval, reservationStatuses,
  reservationTimestamp, ReservationUnavailable, type Reservation } from './reservations';
import { type AuthRequest } from './useSession';

export default function ReservationConfirmation({ id, authRequest }: { id: string; authRequest: AuthRequest }) {
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const checkedDeadline = useRef<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const origin = window.location.hash;
    setReservation(null); setError(''); setUnavailable(false);
    getReservation(id, authRequest, controller.signal).then((value) => {
      if (!controller.signal.aborted && window.location.hash === origin && value) setReservation(value);
    }).catch((problem) => {
      if (!controller.signal.aborted && window.location.hash === origin) {
        const missing = problem instanceof ReservationUnavailable;
        setUnavailable(missing); setError(missing ? 'No encontramos una reserva accesible para tu cuenta.' :
          'No pudimos comprobar la reserva. Vuelve a intentarlo.');
      }
    });
    return () => controller.abort();
  }, [id, authRequest, attempt]);
  useEffect(() => {
    if (!reservation || reservation.status !== 'pending_payment') return;
    const deadline = `${reservation.id}:${reservation.payment_expires_at}`;
    if (checkedDeadline.current === deadline) return;
    const remaining = Date.parse(reservation.payment_expires_at) - Date.now();
    const timer = setTimeout(() => {
      checkedDeadline.current = deadline;
      setAttempt((value) => value + 1);
    }, Math.max(0, Math.min(remaining, 2_147_483_647)));
    return () => clearTimeout(timer);
  }, [reservation]);
  return <section className="account-panel" aria-labelledby="reservation-title">
    <p className="eyebrow">TU RESERVA</p>
    <h1 id="reservation-title">Resumen de reserva</h1>
    {error ? <><p className="form-error" role="alert">{error}</p>{!unavailable &&
      <button onClick={() => setAttempt((value) => value + 1)}>Volver a comprobar reserva</button>}</> :
      !reservation ? <p role="status">Comprobando reserva…</p> : <>
        <p className="session-message" role="status">{reservation.payment && reservation.status === 'pending_payment' ?
          'Reserva creada. Está pendiente de pago.' : `Estado de la reserva: ${reservationStatuses[reservation.status]}.`}</p>
        <dl className="space-details">
          <div><dt>Identificador</dt><dd>{reservation.id}</dd></div>
          <div><dt>Espacio</dt><dd>{reservation.space_name}</dd></div>
          <div><dt>Fecha · Santiago</dt><dd>{reservation.date}</dd></div>
          <div><dt>Horario · Santiago</dt><dd>{reservationInterval(reservation)}</dd></div>
          <div><dt>Duración</dt><dd>{reservationDuration(reservation.duration_hours)}</dd></div>
          <div><dt>Precio contratado por hora</dt><dd>{formatClp(reservation.unit_price)} CLP</dd></div>
          <div><dt>Total contratado</dt><dd>{formatClp(reservation.total_price)} CLP</dd></div>
          <div><dt>Estado</dt><dd>{reservationStatuses[reservation.status]}</dd></div>
          <div><dt>Pago simulado</dt><dd>{reservation.payment ? paymentStatuses[reservation.payment.status] : 'Sin registro de pago'}</dd></div>
          <div><dt>Plazo para pagar · Santiago</dt><dd>{reservationTimestamp(reservation.payment_expires_at)}</dd></div>
        </dl>
        {!reservation.payment && <p>Esta reserva anterior no tiene un registro de pago asociado.</p>}
        {reservation.payment && reservation.status === 'pending_payment' && <p>El intervalo queda bloqueado hasta el plazo indicado. El pago simulado estará disponible próximamente.</p>}
        {reservation.status === 'expired' && <p>El plazo venció y el intervalo dejó de estar bloqueado por esta reserva. Puedes solicitar otra reserva disponible.</p>}
        <button onClick={() => setAttempt((value) => value + 1)}>Actualizar estado de reserva</button>
      </>}
    <p className="reservation-card-actions"><a className="registration-link" href="#mis-reservas">Volver a mis reservas</a>
      <a className="registration-link" href="#catalogo">Volver al catálogo</a></p>
  </section>;
}
