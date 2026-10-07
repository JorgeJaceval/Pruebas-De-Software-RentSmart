import { type AuthRequest } from './useSession';

export class SpaceDeletionError extends Error {
  constructor(message: string, public readonly kind: 'history' | 'missing' | 'error' = 'error') {
    super(message);
  }
}

export async function deleteSpace(id: string, authRequest: AuthRequest, signal: AbortSignal): Promise<true | undefined> {
  let result;
  try {
    result = await authRequest(`/api/spaces/${id}`, { method: 'DELETE', signal });
  } catch {
    throw new SpaceDeletionError('No pudimos conectar con el servicio. Vuelve a intentarlo.');
  }
  if (!result) return undefined;
  if (result.status === 204) return true;
  if (result.status === 409) {
    throw new SpaceDeletionError('Este espacio tiene reservas o pagos asociados y debe conservarse.', 'history');
  }
  if (result.status === 403) throw new SpaceDeletionError('Tu cuenta no tiene acceso a este espacio.');
  if (result.status === 404) throw new SpaceDeletionError('Este espacio ya no existe. Vuelve a mis espacios.', 'missing');
  if (result.status === 200) throw new SpaceDeletionError('No pudimos confirmar la eliminación. Vuelve a intentarlo.');
  throw new SpaceDeletionError('No pudimos eliminar el espacio. Vuelve a intentarlo.');
}
