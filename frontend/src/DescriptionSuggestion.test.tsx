import { afterEach, expect, it, jest } from '@jest/globals';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SpaceForm from './SpaceForm';
import { requestDescriptionSuggestion, SuggestionError, suggestionReady } from './descriptionSuggestion';
import { emptySpaceFields, type SpaceFields } from './spaces';
import { type AuthRequest, type AuthResponse } from './useSession';

const suggestion = 'Sala de reuniones en Providencia para hasta 12 personas. Se pide mantener el espacio limpio.';
const complete: SpaceFields = { ...emptySpaceFields, name: 'Sala de reuniones central', category: 'meeting_room',
  commune: 'Providencia', capacity: '12', conditions: 'Mantener el espacio limpio al finalizar.' };
type Suggest = (fields: SpaceFields, signal: AbortSignal) => Promise<string | undefined>;

function renderForm(suggest: Suggest, initialFields: SpaceFields = complete) {
  const submit = jest.fn(async () => undefined);
  render(<SpaceForm initialFields={initialFields} submit={submit} onSuccess={() => undefined} suggestDescription={suggest} />);
  return submit;
}
const button = () => screen.getByRole('button', { name: /Sugerir descripción con IA|Generando sugerencia…/ });

afterEach(() => { cleanup(); jest.useRealTimers(); });

it('HU17 CA-01: pide nombre, tipo, comuna, capacidad y condiciones antes de sugerir', async () => {
  const suggest = jest.fn<Suggest>(async () => suggestion);
  renderForm(suggest, emptySpaceFields);
  expect(button()).toBeDisabled();
  expect(screen.getByText('Completa nombre, tipo, comuna, capacidad y condiciones para pedir una sugerencia.')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Nombre del espacio'), { target: { value: complete.name } });
  fireEvent.change(screen.getByLabelText('Tipo de espacio'), { target: { value: complete.category } });
  fireEvent.change(screen.getByLabelText('Comuna'), { target: { value: complete.commune } });
  fireEvent.change(screen.getByLabelText('Capacidad (personas)'), { target: { value: '0' } });
  fireEvent.change(screen.getByLabelText('Condiciones de uso'), { target: { value: complete.conditions } });
  expect(button()).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Capacidad (personas)'), { target: { value: '12' } });
  // Not published yet, and no description or price is needed.
  expect(button()).toBeEnabled();
  expect(suggestionReady(complete)).toBe(true);
  expect(suggest).not.toHaveBeenCalled();
});

it('HU17 CA-03/05: informa el proceso, evita doble envío y solo usa la sugerencia al aceptarla', async () => {
  let resolve!: (value: string) => void;
  const suggest = jest.fn<Suggest>(() => new Promise((done) => { resolve = done; }));
  const submit = renderForm(suggest);
  await userEvent.click(button());
  await userEvent.click(button());
  expect(suggest).toHaveBeenCalledTimes(1);
  expect(button()).toBeDisabled();
  expect(screen.getByText('Estamos generando una sugerencia; puede tardar hasta 15 segundos.')).toBeInTheDocument();
  await act(async () => resolve(suggestion));
  const region = screen.getByRole('region', { name: 'Sugerencia generada con IA' });
  expect(region).toHaveTextContent('GENERADA CON IA · REVÍSALA ANTES DE USARLA');
  expect(region).toHaveTextContent(suggestion);
  expect(screen.getByLabelText('Descripción')).toHaveValue('');
  await userEvent.click(within(region).getByRole('button', { name: 'Usar sugerencia' }));
  expect(screen.getByLabelText('Descripción')).toHaveValue(suggestion);
  expect(screen.getByLabelText('Descripción')).toHaveFocus();
  expect(screen.queryByRole('region', { name: 'Sugerencia generada con IA' })).not.toBeInTheDocument();
  // The user can still edit it, and nothing was published automatically.
  await userEvent.type(screen.getByLabelText('Descripción'), ' Editada.');
  expect(screen.getByLabelText('Descripción')).toHaveValue(`${suggestion} Editada.`);
  expect(submit).not.toHaveBeenCalled();
});

it('HU17 CA-03: descartar conserva la descripción manual y se advierte antes de reemplazarla', async () => {
  const manual = 'Descripción escrita a mano por la propietaria del espacio.';
  renderForm(async () => suggestion, { ...complete, description: manual });
  await userEvent.click(button());
  const region = await screen.findByRole('region', { name: 'Sugerencia generada con IA' });
  expect(region).toHaveTextContent('Usarla reemplazará la descripción que escribiste.');
  await userEvent.click(within(region).getByRole('button', { name: 'Descartar sugerencia' }));
  expect(screen.getByLabelText('Descripción')).toHaveValue(manual);
  expect(screen.queryByRole('region', { name: 'Sugerencia generada con IA' })).not.toBeInTheDocument();
});

it('HU17 CA-06: un error explica que no se pudo generar y conserva el formulario', async () => {
  const message = 'Se alcanzó el límite de uso de la IA. Inténtalo más tarde. Puedes escribir la descripción manualmente.';
  renderForm(async () => { throw new SuggestionError(message); }, { ...complete, description: 'Texto propio en curso' });
  await userEvent.click(button());
  expect(await screen.findByRole('alert')).toHaveTextContent(message);
  expect(screen.getByLabelText('Descripción')).toHaveValue('Texto propio en curso');
  expect(screen.getByLabelText('Nombre del espacio')).toHaveValue(complete.name);
  expect(button()).toBeEnabled();
});

it('HU17 CA-05: después de 15 segundos cancela la espera y lo informa', async () => {
  jest.useFakeTimers();
  let signal!: AbortSignal;
  const suggest = jest.fn<Suggest>((_, received) => {
    signal = received;
    return new Promise((_, reject) => received.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))));
  });
  renderForm(suggest);
  fireEvent.click(button());
  await act(async () => { jest.advanceTimersByTime(14_999); });
  expect(signal.aborted).toBe(false);
  await act(async () => { jest.advanceTimersByTime(1); });
  expect(signal.aborted).toBe(true);
  expect(screen.getByRole('alert')).toHaveTextContent('La IA tardó demasiado en responder.');
  expect(button()).toBeEnabled();
});

it('HU17 CA-04/07: la API recibe solo datos textuales y valida la respuesta', async () => {
  let reply: AuthResponse | Error = { status: 200, body: { suggestion: `  ${suggestion}  ` } };
  const authRequest = jest.fn<AuthRequest>(async () => { if (reply instanceof Error) throw reply; return reply; });
  const signal = new AbortController().signal;
  const fields = { ...complete, description: 'No se envía', price_per_hour: '9000', location_reference: 'Cerca del metro' };
  await expect(requestDescriptionSuggestion(fields, authRequest, signal)).resolves.toBe(suggestion);
  expect(authRequest).toHaveBeenCalledWith('/api/spaces/description-suggestion', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
    body: JSON.stringify({ name: complete.name, category: 'meeting_room', commune: 'Providencia', capacity: 12,
      conditions: complete.conditions, location_reference: 'Cerca del metro' }),
  });
  for (const [value, message] of [
    [{ status: 200, body: { suggestion: '   ' } }, 'La IA no devolvió una descripción utilizable.'],
    [{ status: 200, body: { suggestion: 'x'.repeat(1001) } }, 'La IA no devolvió una descripción utilizable.'],
    [{ status: 503, body: { detail: 'La sugerencia con IA no está disponible en este momento.' } }, 'no está disponible'],
    [{ status: 422, body: { detail: 'x', errors: {} } }, 'Revisa nombre, tipo, comuna, capacidad y condiciones'],
    [{ status: 500, body: null }, 'No pudimos generar una sugerencia.'],
    [new Error('offline'), 'No pudimos conectar con el servicio.'],
  ] as const) {
    reply = value as AuthResponse | Error;
    await expect(requestDescriptionSuggestion(fields, authRequest, signal)).rejects.toThrow(message);
  }
});
