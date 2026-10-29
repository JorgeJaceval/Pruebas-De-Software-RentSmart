import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { cancelReservation, formatClp, reservationInterval, type Reservation } from './reservations';
import { type AuthRequest } from './useSession';

type Props = { reservation: Reservation; authRequest: AuthRequest; onCancelled: (value: Reservation) => void };

export default function ReservationCancelControl({ reservation, authRequest, onCancelled }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const wasOpened = useRef(false);
  const title = `cancel-reservation-${reservation.id}`;

  useEffect(() => () => { pending.current?.abort(); }, []);
  useEffect(() => {
    if (open) { wasOpened.current = true; back.current?.focus(); }
    else if (wasOpened.current) trigger.current?.focus();
  }, [open]);
  useEffect(() => { if (busy) dialog.current?.focus(); }, [busy]);

  function close() { if (!pending.current) setOpen(false); }
  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
    if (event.key !== 'Tab') return;
    const buttons = dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
    const first = buttons?.[0], last = buttons?.[buttons.length - 1];
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  async function confirm() {
    if (pending.current || !reservation.can_cancel) return;
    const controller = new AbortController();
    const origin = window.location.hash;
    pending.current = controller; setBusy(true); setError('');
    try {
      const saved = await cancelReservation(reservation, authRequest, controller.signal);
      if (!controller.signal.aborted && window.location.hash === origin && saved) onCancelled(saved);
    } catch (failure) {
      if (!controller.signal.aborted && window.location.hash === origin) setError(failure instanceof Error ? failure.message :
        'No pudimos confirmar la cancelación. Actualiza las reservas antes de reintentar.');
    } finally {
      if (!controller.signal.aborted) { pending.current = null; setBusy(false); }
    }
  }

  return <>
    <button ref={trigger} className="cancel-button" disabled={busy} onClick={() => { setError(''); setOpen(true); }}>Cancelar reserva</button>
    {open && <div className="dialog-backdrop">
      <div ref={dialog} tabIndex={-1} className="confirmation-dialog" role="alertdialog" aria-modal="true"
        aria-labelledby={title} aria-describedby={`${title}-description`} aria-busy={busy} onKeyDown={handleKey}>
        <h2 id={title}>Cancelar reserva de «{reservation.space_name}»</h2>
        <p id={`${title}-description`}>Fecha {reservation.date}, {reservationInterval(reservation)} · Santiago.
          La reserva se conservará en el historial y el horario quedará disponible.</p>
        <p>{reservation.payment?.status === 'approved' ?
          `Se registrará un reembolso total simulado de ${formatClp(reservation.total_price)} CLP, sin movimiento de dinero real.` :
          'No hay un pago aprobado registrado; no se generará un reembolso.'}</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        {busy && <p role="status">Confirmando cancelación…</p>}
        <div className="dialog-actions">
          <button ref={back} className="cancel-button" disabled={busy} onClick={close}>Volver sin cancelar</button>
          <button className="danger-button" disabled={busy} onClick={() => void confirm()}>Confirmar cancelación</button>
        </div>
      </div>
    </div>}
  </>;
}
