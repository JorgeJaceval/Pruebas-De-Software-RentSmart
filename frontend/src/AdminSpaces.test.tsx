import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminSpaces from './AdminSpaces';
import SpaceStatusControl from './SpaceStatusControl';
import { type AdminSpace } from './adminSpacesApi';
import { type Space } from './spaces';
import { type AuthRequest, type AuthResponse } from './useSession';

const active: AdminSpace = {
  id: '76b1a2f4-d706-431a-b887-2d7e8a7f8e58', name: 'Sala central', commune: 'Providencia',
  owner_id: '03fdcce6-6305-42ba-96d3-04d19e5c962c', owner_name: 'Propietaria', owner_email: 'owner@example.com',
  is_active: true, is_withdrawn: false, withdrawal_reason: null, withdrawn_at: null, withdrawn_by_name: null,
};
const inactive: AdminSpace = { ...active, id: '86b1a2f4-d706-431a-b887-2d7e8a7f8e58', name: 'Estudio inactivo', is_active: false };
const legacy: AdminSpace = { ...active, id: '96b1a2f4-d706-431a-b887-2d7e8a7f8e58', name: 'Bodega retirada', is_active: false,
  is_withdrawn: true };
const reason = 'Fotos que no corresponden al espacio.';
const withdrawn = (space: AdminSpace): AdminSpace => ({ ...space, is_active: false, is_withdrawn: true,
  withdrawal_reason: reason, withdrawn_at: '2026-11-20T15:00:00Z', withdrawn_by_name: 'Administración' });

let list: () => Promise<AuthResponse>;
let moderation: (path: string, init?: RequestInit) => Promise<AuthResponse>;
const authRequest = jest.fn<AuthRequest>();
const ok = (body: unknown, status = 200): AuthResponse => ({ status, body });
const card = (name: string) => screen.getByRole('article', { name });

beforeEach(() => {
  list = async () => ok([active, inactive, legacy]);
  moderation = async (_path, init) => ok(init?.method === 'DELETE' ? { ...legacy, withdrawal_reason: null, is_withdrawn: false } :
    withdrawn(active));
  authRequest.mockReset();
  authRequest.mockImplementation(async (path, init) => path === '/api/admin/spaces' ? list() : moderation(path, init as RequestInit));
});
afterEach(() => cleanup());

it('HU18 CA-01: lista activas, inactivas y retiradas con propietario y estado, sin datos económicos', async () => {
  render(<AdminSpaces authRequest={authRequest} />);
  expect(screen.getByRole('status')).toHaveTextContent('Cargando publicaciones…');
  expect(await screen.findByText('1 activas · 1 inactivas · 1 retiradas')).toBeInTheDocument();
  expect(within(card('Sala central')).getByText('Propietaria · owner@example.com')).toBeInTheDocument();
  expect(within(card('Sala central')).getAllByText('Activa')).toHaveLength(2);
  expect(within(card('Estudio inactivo')).getAllByText('Inactiva')).toHaveLength(2);
  expect(within(card('Bodega retirada')).getByText('Sin motivo registrado (retiro anterior).')).toBeInTheDocument();
  expect(within(card('Bodega retirada')).getByRole('button', { name: 'Levantar retiro' })).toBeInTheDocument();
  expect(screen.queryByText(/CLP|\$/)).not.toBeInTheDocument();
});

it('HU18 CA-03: retirar exige motivo, permite volver sin enviar y confirma una sola vez', async () => {
  let resolve!: (value: AuthResponse) => void;
  moderation = () => new Promise((done) => { resolve = done; });
  render(<AdminSpaces authRequest={authRequest} />);
  await userEvent.click(await within(await screen.findByRole('article', { name: 'Sala central' }))
    .findByRole('button', { name: 'Retirar publicación' }));
  const form = screen.getByRole('form', { name: 'Retirar «Sala central»' });
  // Only one card can be moderated at a time.
  expect(within(card('Estudio inactivo')).getByRole('button', { name: 'Retirar publicación' })).toBeDisabled();
  await userEvent.click(within(form).getByRole('button', { name: 'Confirmar retiro' }));
  expect(within(form).getByRole('alert')).toHaveTextContent('Indica el motivo del retiro.');
  await userEvent.type(within(form).getByLabelText('Motivo del retiro'), '   ');
  await userEvent.click(within(form).getByRole('button', { name: 'Confirmar retiro' }));
  expect(authRequest).toHaveBeenCalledTimes(1);
  await userEvent.click(within(form).getByRole('button', { name: 'Volver sin retirar' }));
  expect(screen.queryByRole('form')).not.toBeInTheDocument();
  expect(authRequest).toHaveBeenCalledTimes(1);

  await userEvent.click(within(card('Sala central')).getByRole('button', { name: 'Retirar publicación' }));
  const field = screen.getByLabelText('Motivo del retiro');
  expect(field).toHaveAttribute('maxLength', '200');
  await userEvent.type(field, `  ${reason}  `);
  expect(screen.getByText(/^37\/200\./)).toBeInTheDocument();
  const confirm = screen.getByRole('button', { name: 'Confirmar retiro' });
  await userEvent.click(confirm);
  await userEvent.click(screen.getByRole('button', { name: 'Retirando publicación…' }));
  expect(authRequest).toHaveBeenCalledTimes(2);
  expect(authRequest).toHaveBeenLastCalledWith(`/api/admin/spaces/${active.id}/withdrawal`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }),
  });
  resolve(ok(withdrawn(active)));
  expect(await screen.findByText('Retiramos «Sala central» del catálogo.')).toBeInTheDocument();
  expect(within(card('Sala central')).getByText(reason)).toBeInTheDocument();
  expect(within(card('Sala central')).getByRole('button', { name: 'Levantar retiro' })).toBeEnabled();
  await waitFor(() => expect(within(card('Estudio inactivo')).getByRole('button', { name: 'Retirar publicación' })).toBeEnabled());
});

it('HU18 CA-03: errores del servidor se muestran sin perder el motivo escrito', async () => {
  moderation = async () => ok({ detail: 'x', errors: { reason: 'El motivo debe tener entre 1 y 200 caracteres.' } }, 422);
  render(<AdminSpaces authRequest={authRequest} />);
  await userEvent.click(await within(await screen.findByRole('article', { name: 'Sala central' }))
    .findByRole('button', { name: 'Retirar publicación' }));
  await userEvent.type(screen.getByLabelText('Motivo del retiro'), reason);
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar retiro' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('El motivo debe tener entre 1 y 200 caracteres.');
  expect(screen.getByLabelText('Motivo del retiro')).toHaveValue(reason);
  moderation = async () => ok({ detail: 'x', errors: { form: 'x' } }, 409);
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar retiro' }));
  expect(await screen.findByText('La publicación ya fue retirada. Actualiza el listado.')).toBeInTheDocument();
  moderation = async () => { throw new Error('offline'); };
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar retiro' }));
  expect(await screen.findByText('No pudimos conectar con el servicio. Vuelve a intentarlo.')).toBeInTheDocument();
  expect(screen.getByLabelText('Motivo del retiro')).toHaveValue(reason);
});

it('HU18 CA-06: levantar el retiro pide confirmación y deja la publicación inactiva', async () => {
  render(<AdminSpaces authRequest={authRequest} />);
  await userEvent.click(await within(await screen.findByRole('article', { name: 'Bodega retirada' }))
    .findByRole('button', { name: 'Levantar retiro' }));
  const group = screen.getByRole('group', { name: 'Levantar retiro de «Bodega retirada»' });
  expect(group).toHaveTextContent('La publicación quedará inactiva; su propietario decide si la vuelve a activar.');
  await userEvent.click(within(group).getByRole('button', { name: 'Volver sin cambios' }));
  expect(authRequest).toHaveBeenCalledTimes(1);
  await userEvent.click(within(card('Bodega retirada')).getByRole('button', { name: 'Levantar retiro' }));
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar levantamiento' }));
  expect(authRequest).toHaveBeenLastCalledWith(`/api/admin/spaces/${legacy.id}/withdrawal`, { method: 'DELETE' });
  expect(await screen.findByText('Levantamos el retiro de «Bodega retirada». Quedó inactiva hasta que su propietario la active.'))
    .toBeInTheDocument();
  expect(within(card('Bodega retirada')).getAllByText('Inactiva')).toHaveLength(2);
  expect(within(card('Bodega retirada')).getByRole('button', { name: 'Retirar publicación' })).toBeInTheDocument();
});

it('HU18: distingue error de carga, vacío y reintento', async () => {
  list = async () => ok({ detail: 'x' }, 503);
  render(<AdminSpaces authRequest={authRequest} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar las publicaciones. Vuelve a intentarlo.');
  list = async () => ok([]);
  await userEvent.click(screen.getByRole('button', { name: 'Volver a cargar publicaciones' }));
  expect(await screen.findByText('Todavía no hay publicaciones registradas.')).toBeInTheDocument();
  // An inconsistent response (active and withdrawn at once) is rejected instead of displayed.
  cleanup();
  list = async () => ok([{ ...active, is_withdrawn: true }]);
  render(<AdminSpaces authRequest={authRequest} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar las publicaciones.');
});

it('HU18 CA-04: el propietario ve el motivo y no puede reactivar', () => {
  const space = {
    id: active.id, owner_id: active.owner_id, name: 'Sala central', description: 'Una sala tranquila para reuniones.',
    category: 'meeting_room', commune: 'Providencia', location_reference: 'Cerca del metro', capacity: 8,
    price_per_hour: 25000, conditions: 'Mantener el espacio limpio.', photos: ['https://example.com/sala.jpg'],
    opening_hour: 9, closing_hour: 18, is_active: false, is_withdrawn: true, withdrawal_reason: reason,
    withdrawn_at: '2026-11-20T15:00:00Z',
  } satisfies Space;
  const props = { authRequest, onStatusChanged: () => undefined, onPendingChange: () => undefined };
  const { rerender } = render(<SpaceStatusControl space={space} {...props} />);
  expect(screen.getByText('Deshabilitada por administración')).toBeInTheDocument();
  expect(screen.getByText(`Motivo de administración: ${reason}`, { exact: false })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Activar publicación' })).not.toBeInTheDocument();
  rerender(<SpaceStatusControl space={{ ...space, withdrawal_reason: null }} {...props} />);
  expect(screen.getByText(/La administración no registró un motivo para este retiro./)).toBeInTheDocument();
});
