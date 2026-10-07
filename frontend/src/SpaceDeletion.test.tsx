import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { type Space, type SpaceInput } from './spaces';

const fetchMock = jest.fn<typeof fetch>();
const sessionKey = 'rentsmart.session';
const account = { id: '03fdcce6-6305-42ba-96d3-04d19e5c962c', name: 'Jorge Aceval', email: 'jorge@example.com', is_admin: false };
const spaceId = '76b1a2f4-d706-431a-b887-2d7e8a7f8e58';
const original: SpaceInput = {
  name: 'Sala de ideas', description: 'Una sala tranquila para reuniones y trabajo en equipo.',
  category: 'meeting_room', commune: 'Providencia', location_reference: 'Cerca del metro Los Leones',
  capacity: 8, price_per_hour: 12_000, conditions: 'Mantener el espacio limpio y respetar el horario.',
  photos: ['https://example.com/sala.jpg'], opening_hour: 9, closing_hour: 18,
};
let stored: Space;
let getReply: () => Promise<Response>;
let deleteReply: () => Promise<Response>;
let patchReply: (active: boolean) => Promise<Response>;

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

function deleteCalls() {
  return fetchMock.mock.calls.filter(([path, options]) => path === `/api/spaces/${spaceId}` && options?.method === 'DELETE');
}

function patchCalls() {
  return fetchMock.mock.calls.filter(([path, options]) => path === `/api/spaces/${spaceId}/status` && options?.method === 'PATCH');
}

async function openConfirmation() {
  await userEvent.click(screen.getByRole('button', { name: 'Eliminar espacio' }));
  return screen.getByRole('alertdialog', { name: `Eliminar «${original.name}»` });
}

beforeEach(() => {
  sessionStorage.clear();
  saveSession();
  window.history.replaceState(null, '', `/#espacio/${spaceId}`);
  stored = { ...original, id: spaceId, owner_id: account.id, is_active: true, is_withdrawn: false };
  getReply = async () => response(stored);
  deleteReply = async () => response(null, 204);
  patchReply = async (active) => {
    stored = { ...stored, is_active: active };
    return response({ id: spaceId, is_active: stored.is_active, is_withdrawn: stored.is_withdrawn });
  };
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (path, options) => {
    if (path === '/api/health/ready') return response({ status: 'ok', database: 'connected' });
    if (path === '/api/auth/me') return response(account);
    if (path === `/api/spaces/${spaceId}/status`) return patchReply((JSON.parse(options!.body as string) as { is_active: boolean }).is_active);
    if (path === `/api/spaces/${spaceId}`) {
      if (options?.method === 'DELETE') return deleteReply();
      return getReply();
    }
    throw new Error(`Unexpected request: ${String(path)}`);
  });
  globalThis.fetch = fetchMock;
});

afterEach(() => cleanup());

it('HU06 CP-01: confirma la eliminación solo con 204 vacío y vuelve a Mis espacios con aviso', async () => {
  const json = jest.fn<() => Promise<unknown>>().mockRejectedValue(new SyntaxError('No body'));
  deleteReply = async () => ({ status: 204, ok: true, json }) as unknown as Response;
  render(<App />);
  await screen.findByRole('heading', { name: original.name });
  const dialog = await openConfirmation();
  expect(dialog).toHaveTextContent(original.name);
  expect(deleteCalls()).toHaveLength(0);
  await userEvent.click(within(dialog).getByRole('button', { name: 'Eliminar definitivamente' }));
  expect(await screen.findByRole('heading', { name: 'Mis espacios' })).toBeInTheDocument();
  expect(screen.getByText('Tu espacio fue eliminado.')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: original.name })).not.toBeInTheDocument();
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  expect(deleteCalls()).toHaveLength(1);
  expect(deleteCalls()[0][1]).toEqual(expect.objectContaining({ method: 'DELETE', headers: { Authorization: 'Bearer owner-session-token' } }));
  expect(deleteCalls()[0][1]?.body).toBeUndefined();
  expect(json).not.toHaveBeenCalled();
});

it('HU06 CP-02: cancelar o Escape no eliminan y la confirmación mantiene el foco de teclado', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: original.name });
  const dialog = await openConfirmation();
  const cancel = within(dialog).getByRole('button', { name: 'Cancelar' });
  expect(cancel).toHaveFocus();
  await userEvent.tab({ shift: true });
  expect(within(dialog).getByRole('button', { name: 'Eliminar definitivamente' })).toHaveFocus();
  await userEvent.tab();
  expect(cancel).toHaveFocus();
  await userEvent.keyboard('{Escape}');
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Eliminar espacio' })).toHaveFocus();
  const reopened = await openConfirmation();
  await userEvent.click(within(reopened).getByRole('button', { name: 'Cancelar' }));
  expect(screen.getByRole('heading', { name: original.name })).toBeInTheDocument();
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  expect(deleteCalls()).toHaveLength(0);
  expect(patchCalls()).toHaveLength(0);
});

it('HU06 CP-03/04: mantiene el espacio ante historial y desactiva únicamente con acción explícita', async () => {
  deleteReply = async () => response({ detail: 'Historial asociado.', errors: { form: 'Debe conservarse.' } }, 409);
  render(<App />);
  await screen.findByRole('heading', { name: original.name });
  const dialog = await openConfirmation();
  await userEvent.click(within(dialog).getByRole('button', { name: 'Eliminar definitivamente' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Este espacio tiene reservas o pagos asociados y debe conservarse.');
  expect(patchCalls()).toHaveLength(0);
  expect(screen.getByRole('heading', { name: original.name })).toBeInTheDocument();
  expect(screen.getByText('Publicación activa')).toBeInTheDocument();
  expect(screen.queryByText('Tu espacio fue eliminado.')).not.toBeInTheDocument();
  await userEvent.click(within(dialog).getByRole('button', { name: 'Desactivar y conservar' }));
  expect(await screen.findByText('La publicación fue desactivada; el espacio y su historial se conservaron.')).toBeInTheDocument();
  expect(screen.getByText('Publicación inactiva')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: original.name })).toBeInTheDocument();
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  expect(patchCalls()).toHaveLength(1);
  expect(JSON.parse(patchCalls()[0][1]!.body as string)).toEqual({ is_active: false });
  expect(window.location.hash).toBe(`#espacio/${spaceId}`);
  expect(deleteCalls()).toHaveLength(1);
});

it('HU06 CP-03/04: un espacio inactivo o retirado ya se conserva y no ofrece cambio de estado', async () => {
  deleteReply = async () => response({ errors: { form: 'Historial asociado.' } }, 409);
  for (const withdrawn of [false, true]) {
    stored = { ...stored, is_active: false, is_withdrawn: withdrawn };
    const mounted = render(<App />);
    await screen.findByRole('heading', { name: original.name });
    const dialog = await openConfirmation();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Eliminar definitivamente' }));
    await screen.findByRole('alert');
    expect(dialog).toHaveTextContent(withdrawn ?
      'La publicación fue deshabilitada por administración; el espacio y su historial se conservan.' :
      'La publicación ya está inactiva; el espacio y su historial se conservan.');
    expect(within(dialog).queryByRole('button', { name: 'Desactivar y conservar' })).not.toBeInTheDocument();
    expect(patchCalls()).toHaveLength(0);
    mounted.unmount();
  }
});

it('HU06 CP-05: protege eliminación sin sesión, ante GET ajeno o inexistente y denegaciones DELETE', async () => {
  sessionStorage.clear();
  const guest = render(<App />);
  expect(await screen.findByRole('form', { name: 'Iniciar sesión' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Eliminar espacio' })).not.toBeInTheDocument();
  guest.unmount();
  for (const status of [403, 404]) {
    saveSession();
    getReply = async () => response({ detail: 'Access denied' }, status);
    const mounted = render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent(status === 403 ?
      'Tu cuenta no tiene acceso a este espacio.' : 'No encontramos este espacio.');
    expect(screen.queryByRole('button', { name: 'Eliminar espacio' })).not.toBeInTheDocument();
    mounted.unmount();
  }
  expect(deleteCalls()).toHaveLength(0);
  for (const status of [403, 404, 401]) {
    saveSession();
    getReply = async () => response(stored);
    deleteReply = async () => response({ detail: 'Access denied' }, status);
    const mounted = render(<App />);
    await screen.findByRole('heading', { name: original.name });
    const dialog = await openConfirmation();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Eliminar definitivamente' }));
    if (status === 401) {
      expect(await screen.findByRole('form', { name: 'Iniciar sesión' })).toBeInTheDocument();
      expect(sessionStorage.getItem(sessionKey)).toBeNull();
    } else expect(await screen.findByRole('alert')).toHaveTextContent(status === 403 ?
      'Tu cuenta no tiene acceso a este espacio.' : 'Este espacio ya no existe. Vuelve a mis espacios.');
    expect(screen.queryByText('Tu espacio fue eliminado.')).not.toBeInTheDocument();
    mounted.unmount();
  }
});

it('HU06 CP-08: evita doble envío y conserva el detalle ante 503, red o 200 inesperado hasta reintentar', async () => {
  const delayed = deferredResponse();
  deleteReply = () => delayed.promise;
  render(<App />);
  await screen.findByRole('heading', { name: original.name });
  const dialog = await openConfirmation();
  const confirm = within(dialog).getByRole('button', { name: 'Eliminar definitivamente' });
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  expect(deleteCalls()).toHaveLength(1);
  expect(within(dialog).getByRole('button', { name: 'Eliminando espacio…' })).toBeDisabled();
  expect(dialog).toHaveFocus();
  expect(screen.getByRole('button', { name: 'Desactivar publicación' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Eliminar espacio' })).toBeDisabled();
  expect(screen.queryByRole('link', { name: 'Editar espacio' })).not.toBeInTheDocument();
  await act(async () => delayed.resolve(response({ detail: 'Unavailable' }, 503)));
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos eliminar el espacio.');
  deleteReply = async () => { throw new TypeError('Failed to fetch'); };
  await userEvent.click(within(dialog).getByRole('button', { name: 'Eliminar definitivamente' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectar con el servicio.');
  deleteReply = async () => response(stored, 200);
  await userEvent.click(within(dialog).getByRole('button', { name: 'Eliminar definitivamente' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos confirmar la eliminación.');
  expect(screen.getByRole('heading', { name: original.name })).toBeInTheDocument();
  expect(screen.queryByText('Tu espacio fue eliminado.')).not.toBeInTheDocument();
  deleteReply = async () => response(null, 204);
  await userEvent.click(within(dialog).getByRole('button', { name: 'Eliminar definitivamente' }));
  expect(await screen.findByRole('heading', { name: 'Mis espacios' })).toBeInTheDocument();
  expect(screen.getByText('Tu espacio fue eliminado.')).toBeInTheDocument();
  expect(deleteCalls()).toHaveLength(4);
});

it('HU06 CP-08: descarta DELETE o PATCH tardíos después de navegar o cerrar sesión', async () => {
  for (const action of ['delete', 'preserve']) {
    for (const exit of ['navigate', 'logout']) {
      saveSession();
      window.history.replaceState(null, '', `/#espacio/${spaceId}`);
      const delayed = deferredResponse();
      deleteReply = action === 'delete' ? () => delayed.promise : async () => response({ detail: 'Historial asociado.' }, 409);
      patchReply = () => delayed.promise;
      const mounted = render(<App />);
      await screen.findByRole('heading', { name: original.name });
      const dialog = await openConfirmation();
      fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar definitivamente' }));
      if (action === 'preserve') {
        await screen.findByRole('alert');
        fireEvent.click(within(dialog).getByRole('button', { name: 'Desactivar y conservar' }));
      }
      if (exit === 'navigate') {
        navigate('mis-reservas');
        await screen.findByRole('heading', { name: 'Mis reservas' });
      } else {
        await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
        await screen.findByRole('form', { name: 'Iniciar sesión' });
      }
      await act(async () => delayed.resolve(action === 'delete' ? response(null, 204) :
        response({ id: spaceId, is_active: false, is_withdrawn: false })));
      expect(window.location.hash).toBe(exit === 'navigate' ? '#mis-reservas' : '#sesion');
      expect(screen.queryByText('Tu espacio fue eliminado.')).not.toBeInTheDocument();
      expect(screen.queryByText('La publicación fue desactivada; el espacio y su historial se conservaron.')).not.toBeInTheDocument();
      if (exit === 'logout') expect(sessionStorage.getItem(sessionKey)).toBeNull();
      mounted.unmount();
    }
  }
  expect(deleteCalls()).toHaveLength(4);
  expect(patchCalls()).toHaveLength(2);
});
