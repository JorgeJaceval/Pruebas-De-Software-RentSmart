import { useEffect, useRef, useState, type FormEvent } from 'react';
import PaymentReceipt from './PaymentReceipt';
import { formatClp, getReservation, paymentStatuses, reservationInterval, reservationStatuses,
  reservationTimestamp, simulatePayment, type Reservation } from './reservations';
import { type AuthRequest } from './useSession';

export default function SimulatedPayment({ id, authRequest }: { id: string; authRequest: AuthRequest }) {
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<'approved' | 'rejected'>('approved');
  const [busy, setBusy] = useState(false);
  const pending = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const origin = window.location.hash;
    setReservation(null); setError(''); setNotice('');
    getReservation(id, authRequest, controller.signal).then((value) => {
      if (!controller.signal.aborted && window.location.hash === origin && value) setReservation(value);
    }).catch(() => {
      if (!controller.signal.aborted && window.location.hash === origin) setError('No pudimos consultar una reserva accesible para tu cuenta.');
    });
    return () => controller.abort();
  }, [id, authRequest, attempt]);
  useEffect(() => () => { pending.current?.abort(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!reservation || !reservation.can_pay || reservation.status !== 'pending_payment' || pending.current) return;
    const controller = new AbortController();
    const origin = window.location.hash;
    pending.current = controller;
    setBusy(true); setError(''); setNotice('');
    try {
      const saved = await simulatePayment(reservation, result, authRequest, controller.signal);
      if (!controller.signal.aborted && window.location.hash === origin && saved) {
        setReservation(saved);
        setNotice(saved.status === 'paid' ? 'Pago simulado aprobado. Tu reserva está pagada.' :
          'Pago simulado rechazado. Puedes reintentar mientras el plazo siga vigente.');
      }
    } catch (problem) {
      if (!controller.signal.aborted && window.location.hash === origin) setError(problem instanceof Error ? problem.message :
        'No pudimos confirmar el pago simulado. Actualiza la reserva antes de reintentar.');
    } finally {
      if (!controller.signal.aborted) { pending.current = null; setBusy(false); }
    }
  }

  return <section className="account-panel simulated-payment" aria-labelledby="payment-title">
    <p className="eyebrow">TU RESERVA</p>
    <h1 id="payment-title">Pago simulado</h1>
    <p>Esta es una simulación sin movimiento de dinero. No solicitamos datos de tarjeta.</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    {notice && <p className="session-message" role="status">{notice}</p>}
    {!reservation ? !error && <p role="status">Consultando reserva para pagar…</p> : <>
      <dl className="space-details">
        <div><dt>Espacio</dt><dd>{reservation.space_name}</dd></div>
        <div><dt>Fecha · Santiago</dt><dd>{reservation.date}</dd></div>
        <div><dt>Horario · Santiago</dt><dd>{reservationInterval(reservation)}</dd></div>
        <div><dt>Total contratado</dt><dd>{formatClp(reservation.total_price)} CLP</dd></div>
        <div><dt>Estado de reserva</dt><dd>{reservationStatuses[reservation.status]}</dd></div>
        <div><dt>Estado del pago</dt><dd>{reservation.payment ? paymentStatuses[reservation.payment.status] : 'Sin registro de pago'}</dd></div>
        <div><dt>Plazo para pagar · Santiago</dt><dd>{reservationTimestamp(reservation.payment_expires_at)}</dd></div>
        <PaymentReceipt payment={reservation.payment} />
      </dl>
      {reservation.can_pay && reservation.status === 'pending_payment' ? <form aria-label="Simular pago" onSubmit={(event) => void submit(event)}>
        <fieldset disabled={busy}>
          <legend>Resultado de la simulación</legend>
          <label><input type="radio" name="payment-result" value="approved" checked={result === 'approved'}
            onChange={() => setResult('approved')} /> Aprobar pago simulado</label>
          <label><input type="radio" name="payment-result" value="rejected" checked={result === 'rejected'}
            onChange={() => setResult('rejected')} /> Rechazar pago simulado</label>
        </fieldset>
        <button disabled={busy} type="submit">{busy ? 'Procesando pago simulado…' : 'Confirmar pago simulado'}</button>
      </form> : <p>Esta reserva no admite un nuevo pago.</p>}
    </>}
    <p className="reservation-card-actions">
      <button disabled={busy} onClick={() => setAttempt((value) => value + 1)}>Actualizar reserva</button>
      <a className="registration-link" href={`#reserva/${id}`}>Ver reserva</a>
      <a className="registration-link" href="#mis-reservas">Volver a mis reservas</a>
    </p>
  </section>;
}
