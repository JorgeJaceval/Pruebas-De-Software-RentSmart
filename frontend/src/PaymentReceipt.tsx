import { formatClp, reservationTimestamp, type Reservation } from './reservations';

// Historical payments may not have an actual processing date or amount.
export default function PaymentReceipt({ payment }: { payment: Reservation['payment'] }) {
  if (!payment || payment.amount == null || !payment.processed_at) return null;
  return <>
    <div><dt>Referencia de pago simulado</dt><dd>{payment.id}</dd></div>
    <div><dt>Importe del pago simulado</dt><dd>{formatClp(payment.amount)} CLP</dd></div>
    <div><dt>Resultado registrado · Santiago</dt><dd>{reservationTimestamp(payment.processed_at)}</dd></div>
  </>;
}
