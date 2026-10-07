import { type AuthRequest } from './useSession';
import { type SpaceStatus } from './spaces';

export class SpaceStatusError extends Error {
  constructor(message: string, public readonly withdrawn = false) {
    super(message);
  }
}

export async function setSpaceStatus(id: string, isActive: boolean, authRequest: AuthRequest,
  signal: AbortSignal): Promise<SpaceStatus | undefined> {
  let result;
  try {
    result = await authRequest(`/api/spaces/${id}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: isActive }), signal,
    });
  } catch {
    throw new SpaceStatusError('No pudimos conectar con el servicio. Vuelve a intentarlo.');
  }
  if (!result) return undefined;
  if (result.status === 200) {
    const body = result.body;
    if (typeof body !== 'object' || body === null || !('id' in body) || typeof body.id !== 'string' ||
      body.id.toLowerCase() !== id.toLowerCase() || !('is_active' in body) || body.is_active !== isActive ||
      !('is_withdrawn' in body) || typeof body.is_withdrawn !== 'boolean') {
      throw new SpaceStatusError('No pudimos confirmar el cambio. Vuelve a comprobar el servicio.');
    }
    return { id: body.id, is_active: body.is_active, is_withdrawn: body.is_withdrawn };
  }
  if (result.status === 409) {
    throw new SpaceStatusError('Esta publicación fue deshabilitada por administración. No puedes activarla.', true);
  }
  if (result.status === 422) {
    throw new SpaceStatusError('No pudimos activar la publicación. Revisa los datos del espacio antes de volver a intentarlo.');
  }
  if (result.status === 403) throw new SpaceStatusError('Tu cuenta no tiene acceso a este espacio.');
  if (result.status === 404) throw new SpaceStatusError('No encontramos este espacio.');
  throw new SpaceStatusError('No pudimos cambiar el estado de la publicación. Vuelve a intentarlo.');
}
