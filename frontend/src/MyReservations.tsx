import { useEffect, useState } from 'react';
import { formatClp, getReservations, paymentStatuses, reservationDuration, reservationInterval, reservationStatuses,
  reservationTimestamp, type Reservation, type ReservationList } from './reservations';
import { type AuthRequest } from './useSession';

function ReservationCard({ reservation }: { reservation: Reservation }) {
  const eligibleToPay = reservation.can_pay && reservation.status === 'pending_payment';
  const eligibleToCancel = reservation.can_cancel && ['pending_payment', 'paid'].includes(reservation.status);
  const noteId = `reservation-actions-${reservation.id}`;
  return <article className="reservation-card" aria-labelledby={`reservation-name-${reservation.id}`}>
    <div className="reservation-card-heading">
      <h3 id={`reservation-name-${reservation.id}`}>{reservation.space_name}</h3>
      <span className={`space-status reservation-status-${reservation.status}`}>{reservationStatuses[reservation.status]}</span>
    </div>
    <dl className="space-details reservation-card-details">
      <div><dt>Fecha · Santiago</dt><dd>{reservation.date}</dd></div>
      <div><dt>Horario · Santiago</dt><dd>{reservationInterval(reservation)}</dd></div>
      <div><dt>Duración</dt><dd>{reservationDuration(reservation.duration_hours)}</dd></div>
      <div><dt>Precio contratado por hora</dt><dd>{formatClp(reservation.unit_price)} CLP</dd></div>
      <div><dt>Total contratado</dt><dd>{formatClp(reservation.total_price)} CLP</dd></div>
      <div><dt>Pago simulado</dt><dd>{reservation.payment ? paymentStatuses[reservation.payment.status] : 'Sin registro de pago'}</dd></div>
      <div><dt>Plazo para pagar · Santiago</dt><dd>{reservationTimestamp(reservation.payment_expires_at)}</dd></div>
    </dl>
    <div className="reservation-card-actions">
      <a className="registration-link" href={`#reserva/${reservation.id}`}>Ver reserva</a>
      {eligibleToPay && <button disabled aria-describedby={noteId}>Pagar reserva</button>}
      {eligibleToCancel && <button disabled className="cancel-button" aria-describedby={noteId}>Cancelar reserva</button>}
    </div>
    {(eligibleToPay || eligibleToCancel) && <p className="field-help" id={noteId}>
      {eligibleToPay ? 'El pago simulado y la cancelación estarán disponibles próximamente.' : 'La cancelación estará disponible próximamente.'}
      {' '}Actualiza el estado antes de consultar las opciones de tu reserva.
    </p>}
  </article>;
}

export default function MyReservations({ authRequest }: { authRequest: AuthRequest }) {
  const [list, setList] = useState<ReservationList | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const origin = window.location.hash;
    setList(null); setError(false);
    getReservations(authRequest, controller.signal).then((value) => {
      if (!controller.signal.aborted && window.location.hash === origin && value) setList(value);
    }).catch(() => {
      if (!controller.signal.aborted && window.location.hash === origin) setError(true);
    });
    return () => controller.abort();
  }, [authRequest, attempt]);

  const upcoming = list?.items.filter((reservation) => ['pending_payment', 'paid'].includes(reservation.status)) ?? [];
  const history = list?.items.filter((reservation) => !['pending_payment', 'paid'].includes(reservation.status)) ?? [];
  return <section className="account-panel my-reservations" aria-labelledby="my-reservations-title">
    <p className="eyebrow">TU CUENTA</p>
    <h1 id="my-reservations-title">Mis reservas</h1>
    <p>Consulta tus próximos arriendos, el historial y el estado de tus pagos simulados. Los importes corresponden al precio contratado.</p>
    {error ? <div className="catalog-state">
      <p className="form-error" role="alert">No pudimos consultar tus reservas y pagos. Vuelve a intentarlo.</p>
      <button onClick={() => setAttempt((value) => value + 1)}>Reintentar consulta de reservas</button>
    </div> : !list ? <p role="status">Consultando tus reservas y pagos…</p> : <>
      <div className="reservation-list-controls">
        <p>Estados consultados el {reservationTimestamp(list.as_of)} · Santiago.</p>
        <button onClick={() => setAttempt((value) => value + 1)}>Actualizar reservas y pagos</button>
      </div>
      {!list.items.length ? <div className="catalog-state">
        <p role="status">Aún no tienes reservas.</p>
        <a className="registration-link" href="#catalogo">Explorar espacios</a>
      </div> : <>
        <section aria-labelledby="upcoming-reservations-title" className="reservation-group">
          <h2 id="upcoming-reservations-title">Próximas y en curso</h2>
          {upcoming.length ? <div className="reservation-list">{upcoming.map((reservation) =>
            <ReservationCard key={reservation.id} reservation={reservation} />)}</div> : <p>No tienes reservas próximas ni en curso.</p>}
        </section>
        <section aria-labelledby="reservation-history-title" className="reservation-group">
          <h2 id="reservation-history-title">Historial</h2>
          {history.length ? <div className="reservation-list">{history.map((reservation) =>
            <ReservationCard key={reservation.id} reservation={reservation} />)}</div> : <p>Aún no tienes reservas en el historial.</p>}
        </section>
      </>}
    </>}
  </section>;
}
