import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { type Space, type SpaceInput } from './spaces';

const fetchMock = jest.fn<typeof fetch>();
const sessionKey = 'rentsmart.session';
const account = { id: '03fdcce6-6305-42ba-96d3-04d19e5c962c', name: 'Jorge Aceval', email: 'jorge@example.com', is_admin: false };
const spaceId = '76b1a2f4-d706-431a-b887-2d7e8a7f8e58';
const original: SpaceInput = {
  name: 'Estudio del parque', description: 'Un estudio luminoso para fotografías y sesiones de trabajo.',
  category: 'photo_studio', commune: 'Providencia', location_reference: 'Frente al parque de la comuna',
  capacity: 6, price_per_hour: 15_000, conditions: 'Mantener el espacio limpio y respetar el horario.',
  photos: ['https://example.com/estudio.jpg', 'https://example.com/entrada.jpg'], opening_hour: 10, closing_hour: 20,
};
let stored: Space;
let getReply: () => Promise<Response>;
let putReply: (input: SpaceInput) => Promise<Response>;

function response(body: unknown, status = 200): Response {
  return { status, ok: status >= 200 && status < 300, json: async () => body } as Response;
}

function saveSession() {
  sessionStorage.setItem(sessionKey, JSON.stringify({ access_token: 'owner-session-token',
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() }));
}

function navigate(hash: string) {
  act(() => {
    window.history.replaceState(null, '', `/#${hash}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

function deferredResponse() {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>((done) => { resolve = done; });
  return { promise, resolve };
}

function change(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function putCalls() {
  return fetchMock.mock.calls.filter(([path, options]) => path === `/api/spaces/${spaceId}` && options?.method === 'PUT');
}

beforeEach(() => {
  sessionStorage.clear();
  saveSession();
  window.history.replaceState(null, '', `/#editar-espacio/${spaceId}`);
  stored = { ...original, id: spaceId, owner_id: account.id, is_active: true };
  getReply = async () => response(stored);
  putReply = async (input) => {
    stored = { ...stored, ...input };
    return response(stored);
  };
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (path, options) => {
    if (path === '/api/health/ready') return response({ status: 'ok', database: 'connected' });
    if (path === '/api/auth/me') return response(account);
    if (path === `/api/spaces/${spaceId}`) {
      if (options?.method === 'PUT') return putReply(JSON.parse(options.body as string) as SpaceInput);
      return getReply();
    }
    throw new Error(`Unexpected request: ${String(path)}`);
  });
  globalThis.fetch = fetchMock;
});

afterEach(() => cleanup());

it('HU04 CP-01/04: carga los datos actuales, cambia el precio y recupera lo guardado al recargar', async () => {
  window.history.replaceState(null, '', `/#espacio/${spaceId}`);
  const first = render(<App />);
  await screen.findByRole('heading', { name: original.name });
  const loading = deferredResponse();
  getReply = () => loading.promise;
  await userEvent.click(screen.getByRole('link', { name: 'Editar espacio' }));
  expect(await screen.findByText('Cargando los datos de tu espacio…')).toBeInTheDocument();
  expect(screen.queryByRole('form', { name: 'Editar espacio' })).not.toBeInTheDocument();
  await act(async () => loading.resolve(response(stored)));
  await screen.findByRole('form', { name: 'Editar espacio' });
  expect(screen.getByLabelText('Hora de apertura')).toHaveValue('10');
  expect(screen.getByLabelText('Hora de cierre')).toHaveValue('20');
  expect(screen.getByLabelText('Tipo de espacio')).toHaveValue('photo_studio');
  expect(screen.getByLabelText('Foto 2 (URL HTTPS) · opcional')).toHaveValue(original.photos[1]);
  expect(screen.getByLabelText('Foto 3 (URL HTTPS) · opcional')).toHaveValue('');
  change('Nombre del espacio', '  Estudio actualizado  ');
  change('Precio por hora (CLP)', '18000');
  getReply = async () => response(stored);
  await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  expect(await screen.findByText('Los cambios fueron guardados.')).toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: 'Estudio actualizado' })).toBeInTheDocument();
  expect(screen.getByText('$18.000 CLP')).toBeInTheDocument();
  expect(putCalls()).toHaveLength(1);
  expect(JSON.parse(putCalls()[0][1]!.body as string)).toEqual({ ...original, name: 'Estudio actualizado', price_per_hour: 18_000 });
  expect(putCalls()[0][1]?.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer owner-session-token' });
  first.unmount();
  window.history.replaceState(null, '', `/#editar-espacio/${spaceId.toUpperCase()}`);
  render(<App />);
  await screen.findByRole('form', { name: 'Editar espacio' });
  expect(screen.getByLabelText('Nombre del espacio')).toHaveValue('Estudio actualizado');
  expect(screen.getByLabelText('Precio por hora (CLP)')).toHaveValue(18_000);
  expect(screen.getByLabelText('Hora de apertura')).toHaveValue('10');
  expect(putCalls()).toHaveLength(1);
});

it('HU04 CP-02: protege el editor ante visitante, espacio ajeno, inexistente o sesión rechazada', async () => {
  sessionStorage.clear();
  const guest = render(<App />);
  expect(await screen.findByRole('form', { name: 'Iniciar sesión' })).toBeInTheDocument();
  expect(screen.queryByRole('form', { name: 'Editar espacio' })).not.toBeInTheDocument();
  guest.unmount();
  for (const status of [403, 404, 401]) {
    saveSession();
    getReply = async () => response({ detail: 'Access denied' }, status);
    const mounted = render(<App />);
    if (status === 401) {
      expect(await screen.findByRole('form', { name: 'Iniciar sesión' })).toBeInTheDocument();
      expect(sessionStorage.getItem(sessionKey)).toBeNull();
    } else expect(await screen.findByRole('alert')).toHaveTextContent(status === 403 ?
      'Tu cuenta no tiene acceso a este espacio.' : 'No encontramos este espacio.');
    expect(screen.queryByRole('form', { name: 'Editar espacio' })).not.toBeInTheDocument();
    mounted.unmount();
  }
  expect(putCalls()).toHaveLength(0);
  saveSession();
  getReply = async () => response(stored);
  putReply = async () => response({ detail: 'Expired session' }, 401);
  render(<App />);
  await screen.findByRole('form', { name: 'Editar espacio' });
  change('Nombre del espacio', 'Estudio actualizado');
  await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  expect(await screen.findByRole('form', { name: 'Iniciar sesión' })).toBeInTheDocument();
  expect(sessionStorage.getItem(sessionKey)).toBeNull();
  expect(screen.queryByText('Los cambios fueron guardados.')).not.toBeInTheDocument();
});

it('HU04 CP-03: evita enviar datos inválidos y conserva la edición ante errores de campo del servidor', async () => {
  putReply = async () => response({ errors: { price_per_hour: 'El precio no es válido.' } }, 422);
  render(<App />);
  await screen.findByRole('form', { name: 'Editar espacio' });
  change('Nombre del espacio', 'Estudio actualizado');
  change('Capacidad (personas)', '0');
  await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  expect(screen.getByLabelText('Capacidad (personas)')).toHaveAttribute('aria-invalid', 'true');
  expect(putCalls()).toHaveLength(0);
  change('Capacidad (personas)', String(original.capacity));
  await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  expect(await screen.findByText('El precio no es válido.')).toBeInTheDocument();
  expect(screen.getByLabelText('Nombre del espacio')).toHaveValue('Estudio actualizado');
  expect(screen.getByLabelText('Foto 1 (URL HTTPS)')).toHaveValue(original.photos[0]);
  expect(screen.queryByText('Los cambios fueron guardados.')).not.toBeInTheDocument();
  expect(stored).toEqual({ ...original, id: spaceId, owner_id: account.id, is_active: true });
});

it('HU04 CP-05/06: cancelar no envía cambios y guardar un espacio inactivo conserva su estado', async () => {
  stored = { ...stored, is_active: false };
  render(<App />);
  await screen.findByRole('form', { name: 'Editar espacio' });
  expect(screen.getByText('Esta publicación está inactiva. Guardar los cambios conserva su estado.')).toBeInTheDocument();
  change('Nombre del espacio', 'Cambio descartado');
  await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(await screen.findByRole('heading', { name: original.name })).toBeInTheDocument();
  expect(screen.getByText('Publicación inactiva')).toBeInTheDocument();
  expect(putCalls()).toHaveLength(0);
  expect(screen.queryByText('Los cambios fueron guardados.')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('link', { name: 'Editar espacio' }));
  await screen.findByRole('form', { name: 'Editar espacio' });
  change('Nombre del espacio', 'Estudio actualizado');
  await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  expect(await screen.findByRole('heading', { name: 'Estudio actualizado' })).toBeInTheDocument();
  expect(screen.getByText('Publicación inactiva')).toBeInTheDocument();
  expect(JSON.parse(putCalls()[0][1]!.body as string)).not.toHaveProperty('is_active');
  expect(screen.getByText('Los cambios fueron guardados.')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('link', { name: 'Editar espacio' }));
  await screen.findByRole('form', { name: 'Editar espacio' });
  change('Nombre del espacio', 'Cambio posterior descartado');
  await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(await screen.findByRole('heading', { name: 'Estudio actualizado' })).toBeInTheDocument();
  expect(screen.queryByText('Los cambios fueron guardados.')).not.toBeInTheDocument();
  expect(screen.queryByText('Tu espacio fue publicado.')).not.toBeInTheDocument();
  expect(putCalls()).toHaveLength(1);
  expect(stored.name).toBe('Estudio actualizado');
});

it('HU04 CP-07: mantiene toda la edición ante conflicto de horario y permite corregirlo', async () => {
  putReply = async () => response({ errors: { closing_hour: 'El horario deja una reserva vigente fuera de disponibilidad.' } }, 409);
  render(<App />);
  await screen.findByRole('form', { name: 'Editar espacio' });
  change('Nombre del espacio', 'Estudio actualizado');
  change('Precio por hora (CLP)', '18000');
  change('Hora de cierre', '15');
  await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  expect(await screen.findByText('El horario deja una reserva vigente fuera de disponibilidad.')).toBeInTheDocument();
  expect(screen.getByLabelText('Hora de cierre')).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByLabelText('Nombre del espacio')).toHaveValue('Estudio actualizado');
  expect(screen.getByLabelText('Precio por hora (CLP)')).toHaveValue(18_000);
  expect(stored.name).toBe(original.name);
  expect(screen.queryByText('Los cambios fueron guardados.')).not.toBeInTheDocument();
  change('Hora de cierre', '20');
  putReply = async (input) => { stored = { ...stored, ...input }; return response(stored); };
  await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  expect(await screen.findByRole('heading', { name: 'Estudio actualizado' })).toBeInTheDocument();
  expect(screen.getByText('10:00–20:00')).toBeInTheDocument();
  expect(screen.getByText('Los cambios fueron guardados.')).toBeInTheDocument();
  expect(putCalls()).toHaveLength(2);
});

it('HU04 CP-08: reintenta carga y guardado, evita doble envío y conserva datos ante red o 503', async () => {
  getReply = async () => { throw new TypeError('Failed to fetch'); };
  render(<App />);
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar tu espacio.');
  expect(screen.queryByRole('form', { name: 'Editar espacio' })).not.toBeInTheDocument();
  getReply = async () => response(stored);
  await userEvent.click(screen.getByRole('button', { name: 'Volver a cargar espacio' }));
  await screen.findByRole('form', { name: 'Editar espacio' });
  change('Nombre del espacio', 'Estudio actualizado');
  const delayed = deferredResponse();
  putReply = () => delayed.promise;
  const form = screen.getByRole('form', { name: 'Editar espacio' });
  fireEvent.submit(form);
  fireEvent.submit(form);
  expect(putCalls()).toHaveLength(1);
  expect(screen.getByRole('button', { name: 'Guardando cambios…' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  await act(async () => delayed.resolve(response({ detail: 'Unavailable' }, 503)));
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos guardar los cambios.');
  putReply = async () => { throw new TypeError('Failed to fetch'); };
  await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectar con el servicio.');
  expect(screen.getByLabelText('Nombre del espacio')).toHaveValue('Estudio actualizado');
  putReply = async (input) => { stored = { ...stored, ...input }; return response(stored); };
  await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  expect(await screen.findByRole('heading', { name: 'Estudio actualizado' })).toBeInTheDocument();
  expect(screen.getByText('Los cambios fueron guardados.')).toBeInTheDocument();
  expect(putCalls()).toHaveLength(3);
});

it('HU04 CP-08: descarta un PUT tardío después de navegar o cerrar sesión', async () => {
  for (const exit of ['navigate', 'logout']) {
    saveSession();
    window.history.replaceState(null, '', `/#editar-espacio/${spaceId}`);
    const delayed = deferredResponse();
    putReply = () => delayed.promise;
    const mounted = render(<App />);
    await screen.findByRole('form', { name: 'Editar espacio' });
    change('Nombre del espacio', 'Estudio actualizado');
    fireEvent.submit(screen.getByRole('form', { name: 'Editar espacio' }));
    if (exit === 'navigate') {
      navigate('mis-reservas');
      await screen.findByRole('heading', { name: 'Mis reservas' });
    } else {
      await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
      await screen.findByRole('form', { name: 'Iniciar sesión' });
    }
    await act(async () => delayed.resolve(response({ ...stored, name: 'Estudio actualizado' })));
    expect(window.location.hash).toBe(exit === 'navigate' ? '#mis-reservas' : '#sesion');
    expect(screen.queryByText('Los cambios fueron guardados.')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Estudio actualizado' })).not.toBeInTheDocument();
    if (exit === 'logout') expect(sessionStorage.getItem(sessionKey)).toBeNull();
    mounted.unmount();
  }
  expect(putCalls()).toHaveLength(2);
});
