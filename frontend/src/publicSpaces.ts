import { spaceCategories, validPhotoUrl, type SpaceCategory } from './spaces';

export type PublicSpace = {
  id: string; name: string; description: string; photos: string[]; category: SpaceCategory;
  commune: string; capacity: number; price_per_hour: number;
};

export const availabilityNotice = 'Una publicación visible no garantiza disponibilidad para una fecha u hora.';

export function publicSpaceFrom(value: unknown): PublicSpace {
  if (typeof value !== 'object' || value === null) throw new Error('Invalid public space');
  const data = value as Record<string, unknown>;
  if (typeof data.id !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(data.id) ||
    typeof data.name !== 'string' || !data.name.trim() || typeof data.description !== 'string' || !data.description.trim() ||
    typeof data.commune !== 'string' || !data.commune.trim() ||
    typeof data.category !== 'string' || !Object.hasOwn(spaceCategories, data.category) ||
    !Array.isArray(data.photos) || data.photos.length < 1 || data.photos.length > 3 ||
    data.photos.some((url) => typeof url !== 'string' || !validPhotoUrl(url)) ||
    typeof data.capacity !== 'number' || !Number.isInteger(data.capacity) || data.capacity < 1 || data.capacity > 100 ||
    typeof data.price_per_hour !== 'number' || !Number.isInteger(data.price_per_hour) || data.price_per_hour < 500 || data.price_per_hour > 500_000) {
    throw new Error('Invalid public space');
  }
  return { id: data.id.toLowerCase(), name: data.name, description: data.description, photos: [...data.photos] as string[],
    category: data.category as SpaceCategory, commune: data.commune,
    capacity: data.capacity, price_per_hour: data.price_per_hour };
}

export async function getPublicSpaces(signal: AbortSignal): Promise<PublicSpace[]> {
  const response = await fetch('/api/spaces', { signal });
  if (!response.ok) throw new Error('Catalog unavailable');
  const body: unknown = await response.json();
  if (!Array.isArray(body)) throw new Error('Invalid catalog response');
  return body.map(publicSpaceFrom);
}

export class PublicSpaceUnavailable extends Error {}

export async function getPublicSpace(id: string, signal: AbortSignal): Promise<PublicSpace> {
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) throw new PublicSpaceUnavailable();
  const response = await fetch(`/api/spaces/public/${id}`, { signal });
  if (response.status === 404) throw new PublicSpaceUnavailable();
  if (!response.ok) throw new Error('Public space unavailable');
  const space = publicSpaceFrom(await response.json());
  if (space.id !== id.toLowerCase()) throw new Error('Unexpected public space');
  return space;
}
