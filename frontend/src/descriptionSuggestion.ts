import { validateSpace, type SpaceFields } from './spaces';
import { type AuthRequest } from './useSession';

// HU-17 CA-05: the browser waits at most 15 seconds; the API gives up a little earlier.
export const suggestionTimeoutMs = 15_000;
const requiredFields = ['name', 'category', 'commune', 'capacity', 'conditions'] as const;
const manual = 'Puedes escribir la descripción manualmente.';
// Counted in code points, like validateSpace and the API, so an emoji counts as one character.
const characters = (value: string) => Array.from(value).length;

export class SuggestionError extends Error {}

// CA-01: name, category, commune, capacity and conditions must be valid before asking the AI.
export function suggestionReady(fields: SpaceFields): boolean {
  const errors = validateSpace(fields);
  return requiredFields.every((key) => !errors[key]);
}

export async function requestDescriptionSuggestion(fields: SpaceFields, authRequest: AuthRequest,
  signal: AbortSignal): Promise<string | undefined> {
  const location = fields.location_reference.trim();
  const locationLength = characters(location);
  let result;
  try {
    result = await authRequest('/api/spaces/description-suggestion', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
      body: JSON.stringify({
        name: fields.name.trim(), category: fields.category, commune: fields.commune.trim(),
        capacity: Number(fields.capacity), conditions: fields.conditions.trim(),
        ...(locationLength >= 5 && locationLength <= 150 ? { location_reference: location } : {}),
      }),
    });
  } catch (failure) {
    if (signal.aborted) throw failure;
    throw new SuggestionError(`No pudimos conectar con el servicio. ${manual}`);
  }
  // authRequest resolves undefined (it does not throw) when the request is aborted, so the
  // timeout is reported here; otherwise it already handled the cause, e.g. an expired session.
  if (!result) {
    if (signal.aborted) throw new DOMException('The suggestion request was aborted.', 'AbortError');
    return undefined;
  }
  const body = result.body as { suggestion?: unknown; detail?: unknown } | null;
  if (result.status === 200) {
    const text = typeof body?.suggestion === 'string' ? body.suggestion.trim() : '';
    const length = characters(text);
    // CA-04: an empty or oversized answer is reported as an error and never fills the form.
    if (length < 20 || length > 1000) throw new SuggestionError(`La IA no devolvió una descripción utilizable. ${manual}`);
    return text;
  }
  if (typeof body?.detail === 'string' && [429, 502, 503, 504].includes(result.status)) throw new SuggestionError(body.detail);
  if (result.status === 422) {
    // The browser trims fewer characters than the API, so a borderline location can still be rejected.
    const errors = (result.body as { errors?: Record<string, unknown> } | null)?.errors;
    if (errors && 'location_reference' in errors) {
      const detail = typeof errors.location_reference === 'string' ? ` ${errors.location_reference}` : '';
      throw new SuggestionError(`Revisa la ubicación referencial o déjala vacía.${detail}`);
    }
    throw new SuggestionError('Revisa nombre, tipo, comuna, capacidad y condiciones antes de pedir una sugerencia.');
  }
  throw new SuggestionError(`No pudimos generar una sugerencia. ${manual}`);
}
