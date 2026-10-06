export async function checkAvailability(signal: AbortSignal): Promise<void> {
  const response = await fetch('/api/health/ready', { signal });
  if (!response.ok) throw new Error('El servicio no está disponible.');
  const body: unknown = await response.json();
  if (
    typeof body !== 'object' || body === null ||
    !('status' in body) || body.status !== 'ok' ||
    !('database' in body) || body.database !== 'connected'
  ) {
    throw new Error('No se pudo confirmar la disponibilidad.');
  }
}
