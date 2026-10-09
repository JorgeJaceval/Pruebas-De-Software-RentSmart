import { spaceFrom, type Space } from './spaces';
import { type AuthRequest } from './useSession';

export async function getOwnedSpaces(ownerId: string, authRequest: AuthRequest, signal: AbortSignal): Promise<Space[] | undefined> {
  const result = await authRequest('/api/spaces/mine', { signal });
  if (signal.aborted || !result) return undefined;
  if (result.status !== 200 || !Array.isArray(result.body)) throw new Error('Owned spaces unavailable');
  const spaces = result.body.map(spaceFrom);
  const ids = new Set<string>();
  for (const space of spaces) {
    const id = space.id.toLowerCase();
    if (space.owner_id.toLowerCase() !== ownerId.toLowerCase() || ids.has(id)) {
      throw new Error('Unexpected owned spaces');
    }
    ids.add(id);
  }
  return spaces;
}
