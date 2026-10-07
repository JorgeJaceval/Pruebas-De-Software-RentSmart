import { type AuthRequest } from './useSession';

export const spaceCategories = {
  meeting_room: 'Sala de reuniones',
  photo_studio: 'Estudio fotográfico',
  multipurpose_room: 'Sala multiuso',
} as const;
export type SpaceCategory = keyof typeof spaceCategories;
export type SpaceInput = {
  name: string; description: string; category: SpaceCategory; commune: string;
  location_reference: string; capacity: number; price_per_hour: number;
  conditions: string; photos: string[]; opening_hour: number; closing_hour: number;
};
export type SpaceFields = Record<Exclude<keyof SpaceInput, 'photos'>, string> & { photos: string[] };
export type SpaceErrors = Partial<Record<keyof SpaceInput | 'form', string>>;
export type Space = SpaceInput & { id: string; owner_id: string; is_active: boolean };

export const emptySpaceFields: SpaceFields = {
  name: '', description: '', category: '', commune: '', location_reference: '', capacity: '',
  price_per_hour: '', conditions: '', photos: ['', '', ''], opening_hour: '9', closing_hour: '18',
};

export function validPhotoUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export function validateSpace(fields: SpaceFields): SpaceErrors {
  const errors: SpaceErrors = {};
  const lengths = {
    name: [5, 80, 'El nombre'], description: [20, 1000, 'La descripción'],
    commune: [2, 80, 'La comuna'], location_reference: [5, 150, 'La ubicación referencial'],
    conditions: [10, 500, 'Las condiciones de uso'],
  } as const;
  for (const key of Object.keys(lengths) as (keyof typeof lengths)[]) {
    const [minimum, maximum, label] = lengths[key];
    const length = Array.from(fields[key].trim()).length;
    if (length < minimum || length > maximum) errors[key] = `${label} debe tener entre ${minimum} y ${maximum} caracteres.`;
  }
  if (!Object.hasOwn(spaceCategories, fields.category)) errors.category = 'Selecciona un tipo de espacio.';
  if (!fields.capacity.trim() || !Number.isInteger(Number(fields.capacity)) ||
    Number(fields.capacity) < 1 || Number(fields.capacity) > 100) {
    errors.capacity = 'La capacidad debe ser un número entero entre 1 y 100 personas.';
  }
  if (!fields.price_per_hour.trim() || !Number.isInteger(Number(fields.price_per_hour)) ||
    Number(fields.price_per_hour) < 500 || Number(fields.price_per_hour) > 500_000) {
    errors.price_per_hour = 'El precio debe ser un número entero entre 500 y 500.000 CLP.';
  }
  const opening = Number(fields.opening_hour), closing = Number(fields.closing_hour);
  if (!fields.opening_hour.trim() || !Number.isInteger(opening) || opening < 0 || opening > 22) {
    errors.opening_hour = 'Selecciona una hora de apertura entre 00:00 y 22:00.';
  }
  if (!fields.closing_hour.trim() || !Number.isInteger(closing) || closing < 1 || closing > 23 || opening >= closing) {
    errors.closing_hour = 'El cierre debe ser posterior a la apertura y como máximo a las 23:00.';
  }
  const photos = fields.photos.map((value) => value.trim()).filter(Boolean);
  if (photos.length < 1 || photos.length > 3 || photos.some((url) => !validPhotoUrl(url))) {
    errors.photos = 'Agrega entre 1 y 3 enlaces HTTPS válidos.';
  }
  return errors;
}

function inputFrom(fields: SpaceFields): SpaceInput {
  return {
    name: fields.name.trim(), description: fields.description.trim(), category: fields.category as SpaceCategory,
    commune: fields.commune.trim(), location_reference: fields.location_reference.trim(),
    capacity: Number(fields.capacity), price_per_hour: Number(fields.price_per_hour),
    conditions: fields.conditions.trim(), photos: fields.photos.map((url) => url.trim()).filter(Boolean),
    opening_hour: Number(fields.opening_hour), closing_hour: Number(fields.closing_hour),
  };
}

export function fieldsFromSpace(space: Space): SpaceFields {
  return {
    name: space.name, description: space.description, category: space.category,
    commune: space.commune, location_reference: space.location_reference,
    capacity: String(space.capacity), price_per_hour: String(space.price_per_hour),
    conditions: space.conditions, photos: Array.from({ length: 3 }, (_, index) => space.photos[index] ?? ''),
    opening_hour: String(space.opening_hour), closing_hour: String(space.closing_hour),
  };
}

export function spaceFrom(value: unknown): Space {
  if (typeof value !== 'object' || value === null) throw new Error('Invalid space response');
  const data = value as Record<string, unknown>;
  for (const key of ['id', 'owner_id', 'name', 'description', 'category', 'commune', 'location_reference', 'conditions']) {
    if (typeof data[key] !== 'string') throw new Error('Invalid space response');
  }
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(data.id as string) ||
    !Object.hasOwn(spaceCategories, data.category as string) || typeof data.is_active !== 'boolean' ||
    !Array.isArray(data.photos) || data.photos.some((photo) => typeof photo !== 'string') ||
    ['capacity', 'price_per_hour', 'opening_hour', 'closing_hour'].some((key) => typeof data[key] !== 'number')) {
    throw new Error('Invalid space response');
  }
  return data as Space;
}

export class SpaceError extends Error {
  constructor(public readonly errors: SpaceErrors) {
    super(errors.form ?? 'Revisa los datos del formulario.');
  }
}

async function sendSpace(fields: SpaceFields, authRequest: AuthRequest, id?: string): Promise<Space | undefined> {
  let result;
  try {
    result = await authRequest(id ? `/api/spaces/${id}` : '/api/spaces', {
      method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(inputFrom(fields)),
    });
  } catch {
    throw new SpaceError({ form: 'No pudimos conectar con el servicio. Tus datos se conservaron; vuelve a intentarlo.' });
  }
  if (!result) return undefined;
  if (result.status === (id ? 200 : 201)) {
    try {
      const created = spaceFrom(result.body);
      if (id ? created.id.toLowerCase() !== id.toLowerCase() : !created.is_active) throw new Error('Invalid space response');
      return created;
    } catch {
      throw new SpaceError({ form: id ? 'No pudimos confirmar los cambios. Vuelve a comprobar el servicio.' :
        'No pudimos confirmar la publicación. Vuelve a comprobar el servicio.' });
    }
  }
  if (result.status === 422 || (id && result.status === 409)) {
    const errors: SpaceErrors = {};
    const data = result.body;
    if (typeof data === 'object' && data !== null && 'errors' in data && typeof data.errors === 'object' && data.errors !== null) {
      for (const key of [...Object.keys(emptySpaceFields), 'form'] as (keyof SpaceErrors)[]) {
        const message = (data.errors as Record<string, unknown>)[key];
        if (typeof message === 'string') errors[key] = message;
      }
    }
    if (!Object.keys(errors).length) errors.form = 'Revisa los datos del formulario.';
    throw new SpaceError(errors);
  }
  if (id && (result.status === 403 || result.status === 404)) {
    throw new SpaceError({ form: result.status === 403 ? 'Tu cuenta no tiene acceso a este espacio.' : 'No encontramos este espacio.' });
  }
  throw new SpaceError({ form: id ? 'No pudimos guardar los cambios. Tus datos se conservaron; vuelve a intentarlo.' :
    'No pudimos publicar tu espacio. Tus datos se conservaron; vuelve a intentarlo.' });
}

export function publishSpace(fields: SpaceFields, authRequest: AuthRequest) {
  return sendSpace(fields, authRequest);
}

export function updateSpace(id: string, fields: SpaceFields, authRequest: AuthRequest) {
  return sendSpace(fields, authRequest, id);
}
