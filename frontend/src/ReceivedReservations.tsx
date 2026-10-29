import { useEffect, useState } from 'react';
import { getOwnedSpaces } from './ownedSpacesApi';
import { formatClp, getReceivedReservations, paymentStatuses, reservationDuration, reservationInterval,
  reservationStatuses, reservationTimestamp, ReservationUnavailable, type ReceivedReservation,
  type ReceivedReservationList, type Reservation } from './reservations';
import { type Space } from './spaces';
import { type AuthRequest } from './useSession';
import PaymentReceipt from './PaymentReceipt';
import ReservationCancelControl from './ReservationCancelControl';

function ReceivedCard({ reservation, authRequest, onCancelled }: { reservation: ReceivedReservation;
  authRequest: AuthRequest; onCancelled: (value: Reservation) => void }) {
  const cancellable = reservation.can_cancel && ['pending_payment', 'paid'].includes(reservation.status);
  return <article className="reservation-card" aria-labelledby={`received-name-${reservation.id}`}>
    <div className="reservation-card-heading">
      <h3 id={`received-name-${reservation.id}`}>{reservation.space_name}</h3>
      <span className={`space-status reservation-status-${reservation.status}`}>{reservationStatuses[reservation.status]}</span>
    </div>
    <dl className="space-details reservation-card-details">
      <div><dt>Arrendatario</dt><dd>{reservation.tenant_name}</dd></div>
      <div><dt>Fecha · Santiago</dt><dd>{reservation.date}</dd></div>
      <div><dt>Horario · Santiago</dt><dd>{reservationInterval(reservation)}</dd></div>
      <div><dt>Duración</dt><dd>{reservationDuration(reservation.duration_hours)}</dd></div>
      <div><dt>Precio contratado por hora</dt><dd>{formatClp(reservation.unit_price)} CLP</dd></div>
      <div><dt>Total contratado</dt><dd>{formatClp(reservation.total_price)} CLP</dd></div>
      <div><dt>Pago simulado</dt><dd>{reservation.payment ? paymentStatuses[reservation.payment.status] : 'Sin registro de pago'}</dd></div>
      <PaymentReceipt payment={reservation.payment} />
    </dl>
    {cancellable && <div className="reservation-card-actions">
      <ReservationCancelControl reservation={reservation} authRequest={authRequest} onCancelled={onCancelled} />
    </div>}
  </article>;
}

type Props = { ownerId: string; initialSpaceId: string; authRequest: AuthRequest };
type Data = { spaces: Space[]; list: ReceivedReservationList };

export default function ReceivedReservations({ ownerId, initialSpaceId, authRequest }: Props) {
  const [spaceId, setSpaceId] = useState(initialSpaceId);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    const origin = window.location.hash;
    setData(null); setError(''); setNotice('');
    Promise.all([getOwnedSpaces(ownerId, authRequest, controller.signal),
      getReceivedReservations(spaceId, authRequest, controller.signal)])
      .then(([spaces, list]) => {
        if (!controller.signal.aborted && window.location.hash === origin && spaces && list) setData({ spaces, list });
      }).catch((reason: unknown) => {
        if (!controller.signal.aborted && window.location.hash === origin) setError(reason instanceof ReservationUnavailable ?
          'No encontramos ese espacio entre tus publicaciones.' : 'No pudimos consultar las reservas recibidas. Vuelve a intentarlo.');
      });
    return () => controller.abort();
  }, [ownerId, spaceId, authRequest, attempt]);

  const upcoming = data?.list.items.filter((item) => ['pending_payment', 'paid'].includes(item.status)) ?? [];
  const history = data?.list.items.filter((item) => !['pending_payment', 'paid'].includes(item.status))
    .sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at) || a.id.localeCompare(b.id)) ?? [];
  function onCancelled(saved: Reservation) {
    setData((current) => current ? { ...current, list: { ...current.list,
      items: current.list.items.map((item) => item.id === saved.id ? { ...item, ...saved, can_pay: false } : item),
    } } : current);
    setNotice('Reserva cancelada. El horario quedó liberado y conservamos el historial.');
  }
  return <section className="account-panel my-reservations" aria-labelledby="received-reservations-title">
    <p className="eyebrow">TUS PUBLICACIONES</p>
    <h1 id="received-reservations-title">Reservas recibidas</h1>
    <p>Consulta los arriendos de tus espacios, incluidas las publicaciones inactivas o retiradas. Mostramos los importes contratados.</p>
    <a className="registration-link" href="#mis-espacios">Volver a mis espacios</a>
    {notice && <p className="session-message" role="status">{notice}</p>}
    {error ? <div className="catalog-state">
      <p className="form-error" role="alert">{error}</p>
      <button onClick={() => setAttempt((value) => value + 1)}>Reintentar reservas recibidas</button>
      <button onClick={() => setSpaceId('')}>Consultar todos mis espacios</button>
    </div> : !data ? <p role="status">Consultando reservas recibidas…</p> : <>
      <div className="reservation-list-controls received-reservation-controls">
        <div className="form-field">
          <label htmlFor="received-space">Filtrar por espacio</label>
          <select id="received-space" value={spaceId} onChange={(event) => setSpaceId(event.target.value)}>
            <option value="">Todos mis espacios</option>
            {data.spaces.map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}
          </select>
        </div>
        <p>Estados consultados el {reservationTimestamp(data.list.as_of)} · Santiago.</p>
        <button onClick={() => setAttempt((value) => value + 1)}>Actualizar reservas recibidas</button>
      </div>
      {!data.list.items.length ? <p role="status">{spaceId ? 'Este espacio aún no tiene reservas.' : 'Aún no has recibido reservas.'}</p> : <>
        <section aria-labelledby="received-upcoming-title" className="reservation-group">
          <h2 id="received-upcoming-title">Próximas y en curso</h2>
          {upcoming.length ? <div className="reservation-list">{upcoming.map((item) => <ReceivedCard key={item.id} reservation={item} authRequest={authRequest} onCancelled={onCancelled} />)}</div> :
            <p>No hay reservas próximas ni en curso.</p>}
        </section>
        <section aria-labelledby="received-history-title" className="reservation-group">
          <h2 id="received-history-title">Historial</h2>
          {history.length ? <div className="reservation-list">{history.map((item) => <ReceivedCard key={item.id} reservation={item} authRequest={authRequest} onCancelled={onCancelled} />)}</div> :
            <p>Aún no hay reservas en el historial.</p>}
        </section>
      </>}
    </>}
  </section>;
}
