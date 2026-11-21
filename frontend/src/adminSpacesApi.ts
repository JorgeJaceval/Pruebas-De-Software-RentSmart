import { type AuthRequest } from './useSession';

// HU-18: moderation only. The panel never receives prices, payments or credentials.
export type AdminSpace = {
  id: string; name: string; commune: string; owner_id: string; owner_name: string; owner_email: string;
  is_active: boolean; is_withdrawn: boolean; withdrawal_reason: string | null;
  withdrawn_at: string | null; withdrawn_by_name: string | null;
};

export const reasonMaxLength = 200;

export class AdminSpaceError extends Error {
  constructor(message: string, public readonly field: 'reason' | 'form' = 'form') {
    super(message);
  }
}

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export function adminSpaceFrom(value: unknown): AdminSpace {
  if (typeof value !== 'object' || value === null) throw new Error('Invalid admin space');
  const data = value as Record<string, unknown>;
  for (const key of ['id', 'name', 'commune', 'owner_id', 'owner_name', 'owner_email']) {
    if (typeof data[key] !== 'string') throw new Error('Invalid admin space');
  }
  for (const key of ['withdrawal_reason', 'withdrawn_at', 'withdrawn_by_name']) {
    if (data[key] !== null && typeof data[key] !== 'string') throw new Error('Invalid admin space');
  }
  if (!uuid.test(data.id as string) || typeof data.is_active !== 'boolean' || typeof data.is_withdrawn !== 'boolean' ||
    (data.is_active && data.is_withdrawn) || (!data.is_withdrawn && data.withdrawal_reason !== null)) {
    throw new Error('Invalid admin space');
  }
  return {
    id: data.id as string, name: data.name as string, commune: data.commune as string,
    owner_id: data.owner_id as string, owner_name: data.owner_name as string, owner_email: data.owner_email as string,
    is_active: data.is_active, is_withdrawn: data.is_withdrawn,
    withdrawal_reason: data.withdrawal_reason as string | null, withdrawn_at: data.withdrawn_at as string | null,
    withdrawn_by_name: data.withdrawn_by_name as string | null,
  };
}

export function validateReason(reason: string): string {
  const trimmed = reason.trim();
  if (!trimmed) return 'Indica el motivo del retiro.';
  if (trimmed.length > reasonMaxLength) return `El motivo debe tener entre 1 y ${reasonMaxLength} caracteres.`;
  return '';
}

export async function getAdminSpaces(authRequest: AuthRequest, signal: AbortSignal): Promise<AdminSpace[] | undefined> {
  const result = await authRequest('/api/admin/spaces', { signal });
  if (!result) return undefined;
  if (result.status !== 200 || !Array.isArray(result.body)) throw new Error('Admin spaces unavailable');
  return result.body.map(adminSpaceFrom);
}

async function moderate(id: string, authRequest: AuthRequest, reason?: string): Promise<AdminSpace | undefined> {
  let result;
  try {
    result = await authRequest(`/api/admin/spaces/${id}/withdrawal`, reason === undefined ? { method: 'DELETE' } : {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: reason.trim() }),
    });
  } catch {
    throw new AdminSpaceError('No pudimos conectar con el servicio. Vuelve a intentarlo.');
  }
  if (!result) return undefined;
  if (result.status === 200) {
    try {
      const saved = adminSpaceFrom(result.body);
      if (saved.id.toLowerCase() !== id.toLowerCase() || saved.is_withdrawn !== (reason !== undefined)) throw new Error();
      return saved;
    } catch {
      throw new AdminSpaceError('No pudimos confirmar el cambio. Actualiza el listado.');
    }
  }
  const body = result.body as { detail?: unknown; errors?: Record<string, unknown> } | null;
  if (result.status === 422 && typeof body?.errors?.reason === 'string') throw new AdminSpaceError(body.errors.reason, 'reason');
  if (result.status === 409) {
    throw new AdminSpaceError(reason === undefined ? 'La publicación ya no está retirada. Actualiza el listado.' :
      'La publicación ya fue retirada. Actualiza el listado.');
  }
  if (result.status === 403) throw new AdminSpaceError('Tu cuenta no tiene acceso a la administración.');
  if (result.status === 404) throw new AdminSpaceError('No encontramos esta publicación. Actualiza el listado.');
  throw new AdminSpaceError(reason === undefined ? 'No pudimos levantar el retiro. Vuelve a intentarlo.' :
    'No pudimos retirar la publicación. Vuelve a intentarlo.');
}

export const withdrawSpace = (id: string, reason: string, authRequest: AuthRequest) => moderate(id, authRequest, reason);
export const restoreSpace = (id: string, authRequest: AuthRequest) => moderate(id, authRequest);

export function moderationTimestamp(value: string) {
  return new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', dateStyle: 'short', timeStyle: 'short' })
    .format(new Date(value));
}
