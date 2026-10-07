import { beforeEach, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegistrationForm from './RegistrationForm';

const fetchMock = jest.fn<typeof fetch>();
const input = {
  name: 'Jorge Aceval',
  email: 'jorge@example.com',
  password: 'Clave de prueba 2026!',
};

const created = () => ({
  status: 201,
  ok: true,
  json: async () => ({
    id: 'a3d95af1-d2f8-4a22-a762-41613e22db42',
    name: input.name,
    email: input.email,
  }),
}) as Response;

function fillForm() {
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: input.name } });
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: input.email } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: input.password } });
}

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
});

it('CP-01: confirma el registro válido en el formulario', async () => {
  fetchMock.mockResolvedValueOnce(created());
  render(<RegistrationForm />);
  fillForm();
  await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
  expect(await screen.findByText('Tu cuenta fue creada.')).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledWith('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  expect(screen.queryByRole('form', { name: 'Crear cuenta' })).not.toBeInTheDocument();
});

it('CP-08: conserva los datos tras el error de red y permite reintentar', async () => {
  fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
  fetchMock.mockResolvedValueOnce(created());
  render(<RegistrationForm />);
  fillForm();
  await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'No pudimos conectar con el servicio. Vuelve a intentarlo.',
  );
  expect(screen.getByLabelText('Nombre')).toHaveValue(input.name);
  expect(screen.getByLabelText('Correo electrónico')).toHaveValue(input.email);
  expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeEnabled();
  expect(screen.queryByText('Tu cuenta fue creada.')).not.toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(1);

  await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
  expect(await screen.findByText('Tu cuenta fue creada.')).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(2);
  for (const [, request] of fetchMock.mock.calls) {
    expect(JSON.parse(request?.body as string)).toEqual(input);
  }
});
