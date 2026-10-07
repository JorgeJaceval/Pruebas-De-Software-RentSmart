import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegistrationForm from './RegistrationForm';

const fetchMock = jest.fn<typeof fetch>();
const response = (status: number, body: unknown = {}) => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => body,
}) as Response;

function fillForm(values = {
  name: 'Jorge Aceval',
  email: 'jorge@example.com',
  password: 'Mi clave segura',
}) {
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: values.name } });
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: values.email } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: values.password } });
}

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
});

describe('HU-01 · CA-01: crear una cuenta', () => {
  it('envía nombre, correo y contraseña; anuncia el éxito sin iniciar sesión', async () => {
    fetchMock.mockResolvedValue(response(201, {
      id: 'a3d95af1-d2f8-4a22-a762-41613e22db42',
      name: 'Jorge Aceval',
      email: 'jorge@example.com',
    }));
    const localStorageSpy = jest.spyOn(Storage.prototype, 'setItem');
    try {
      render(<RegistrationForm />);
      fillForm();
      await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

      expect(await screen.findByText('Tu cuenta fue creada.')).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Jorge Aceval', email: 'jorge@example.com', password: 'Mi clave segura',
        }),
      });
      expect(screen.getByText('Gracias por sumarte a RentSmart.')).toBeInTheDocument();
      expect(localStorageSpy).not.toHaveBeenCalled();
      expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument();
      expect(screen.queryByText('Mi clave segura')).not.toBeInTheDocument();
    } finally {
      localStorageSpy.mockRestore();
    }
  });

  it('normaliza nombre y correo sin recortar ni alterar la contraseña', async () => {
    fetchMock.mockResolvedValue(response(201));
    render(<RegistrationForm />);
    fillForm({ name: '  Jorge Aceval  ', email: '  JORGE@EXAMPLE.COM  ', password: '  Clave segura  ' });
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('Tu cuenta fue creada.')).toBeInTheDocument();
    const request = fetchMock.mock.calls[0][1];
    expect(JSON.parse(request?.body as string)).toEqual({
      name: 'Jorge Aceval', email: 'jorge@example.com', password: '  Clave segura  ',
    });
  });

  it('bloquea solicitudes duplicadas mientras espera la respuesta', async () => {
    let complete!: (value: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => { complete = resolve; }));
    render(<RegistrationForm />);
    fillForm();
    const form = screen.getByRole('form', { name: 'Crear cuenta' });
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Creando tu cuenta…' })).toBeDisabled();
    expect(screen.getByLabelText('Correo electrónico')).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Estamos creando tu cuenta.');

    await act(async () => { complete(response(201)); });
    expect(await screen.findByText('Tu cuenta fue creada.')).toBeInTheDocument();
  });
});

describe('HU-01 · CA-02: evitar correos duplicados', () => {
  it('muestra el error 409 junto al correo y conserva los datos para corregirlos', async () => {
    fetchMock.mockResolvedValueOnce(response(409, {
      detail: 'Ya existe una cuenta con este correo.',
      errors: { email: 'Ya existe una cuenta con este correo.' },
    }));
    render(<RegistrationForm />);
    fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('Ya existe una cuenta con este correo.')).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Correo electrónico')).toHaveAccessibleDescription('Ya existe una cuenta con este correo.');
    expect(screen.getByLabelText('Nombre')).toHaveValue('Jorge Aceval');
    expect(screen.getByLabelText('Correo electrónico')).toHaveValue('jorge@example.com');
    expect(screen.queryByText('Tu cuenta fue creada.')).not.toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Correo electrónico'));
    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'otro@example.com');
    fetchMock.mockResolvedValueOnce(response(201));
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(await screen.findByText('Tu cuenta fue creada.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('HU-01 · CA-03: validar los datos del registro', () => {
  it('identifica los campos vacíos y enfoca el primero sin llamar a la API', async () => {
    render(<RegistrationForm />);
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(screen.getByText('Escribe un nombre de entre 2 y 80 caracteres.')).toBeInTheDocument();
    expect(screen.getByText('Escribe un correo electrónico válido.')).toBeInTheDocument();
    expect(screen.getByText('La contraseña debe tener entre 8 y 64 caracteres.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['nombre demasiado corto', { name: 'J', email: 'jorge@example.com', password: 'Mi clave segura' }, 'Nombre'],
    ['nombre demasiado largo', { name: 'J'.repeat(81), email: 'jorge@example.com', password: 'Mi clave segura' }, 'Nombre'],
    ['nombre compuesto solo por espacios', { name: '   ', email: 'jorge@example.com', password: 'Mi clave segura' }, 'Nombre'],
    ['correo sin dominio', { name: 'Jorge', email: 'jorge@', password: 'Mi clave segura' }, 'Correo electrónico'],
    ['correo demasiado largo', { name: 'Jorge', email: `${'a'.repeat(243)}@example.com`, password: 'Mi clave segura' }, 'Correo electrónico'],
    ['contraseña demasiado corta', { name: 'Jorge', email: 'jorge@example.com', password: '1234567' }, 'Contraseña'],
    ['contraseña demasiado larga', { name: 'Jorge', email: 'jorge@example.com', password: 'a'.repeat(65) }, 'Contraseña'],
    ['nombre con carácter nulo', { name: 'A\u0000B', email: 'jorge@example.com', password: 'Mi clave segura' }, 'Nombre'],
    ['nombre con Unicode inválido', { name: 'A\uD800B', email: 'jorge@example.com', password: 'Mi clave segura' }, 'Nombre'],
    ['correo con nombre visible', { name: 'Jorge', email: 'Probe<probe@example.com>', password: 'Mi clave segura' }, 'Correo electrónico'],
    ['correo con Unicode inválido', { name: 'Jorge', email: 'probe\uDFFF@example.com', password: 'Mi clave segura' }, 'Correo electrónico'],
    ['contraseña con Unicode inválido', { name: 'Jorge', email: 'jorge@example.com', password: '\uD800abcdefg' }, 'Contraseña'],
  ])('rechaza %s antes de enviar el formulario', async (_description, values, field) => {
    render(<RegistrationForm />);
    fillForm(values);
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(screen.getByLabelText(field)).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['nombre mínimo', 'J'.repeat(2), 'Mi clave segura'],
    ['nombre sobre el mínimo', 'J'.repeat(3), 'Mi clave segura'],
    ['nombre bajo el máximo', 'J'.repeat(79), 'Mi clave segura'],
    ['nombre máximo', 'J'.repeat(80), 'Mi clave segura'],
    ['contraseña mínima', 'Jorge', 'a'.repeat(8)],
    ['contraseña sobre el mínimo', 'Jorge', 'a'.repeat(9)],
    ['contraseña bajo el máximo', 'Jorge', 'a'.repeat(63)],
    ['contraseña máxima', 'Jorge', 'a'.repeat(64)],
    ['caracteres Unicode', 'Jorge', '🔑'.repeat(64)],
  ])('acepta el límite %s de los campos', async (_description, name, password) => {
    fetchMock.mockResolvedValue(response(201));
    render(<RegistrationForm />);
    fillForm({ name, email: 'jorge@example.com', password });
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('Tu cuenta fue creada.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('muestra errores 422 del servidor junto a los campos correspondientes', async () => {
    fetchMock.mockResolvedValue(response(422, {
      detail: 'Revisa los datos del formulario.',
      errors: { email: 'El dominio del correo no es válido.', password: 'La contraseña debe tener entre 8 y 64 caracteres.' },
    }));
    render(<RegistrationForm />);
    fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('El dominio del correo no es válido.')).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toHaveAccessibleDescription('El dominio del correo no es válido.');
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Nombre')).toHaveValue('Jorge Aceval');
    expect(screen.getByLabelText('Correo electrónico')).toHaveValue('jorge@example.com');
  });

  it('ofrece un error general si el servidor no devuelve errores de validación reconocibles', async () => {
    fetchMock.mockResolvedValue(response(422, { detail: 'invalid', errors: { other: 'internal detail' } }));
    render(<RegistrationForm />);
    fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Revisa los datos del formulario.');
    expect(screen.queryByText('internal detail')).not.toBeInTheDocument();
  });
});

describe('HU-01 · CA-04 y CA-05: proteger contraseña y privilegios', () => {
  it('oculta la contraseña y envía únicamente los campos permitidos', async () => {
    fetchMock.mockResolvedValue(response(201));
    render(<RegistrationForm />);
    fillForm();
    const password = screen.getByLabelText('Contraseña');
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveAttribute('autocomplete', 'new-password');
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('Tu cuenta fue creada.')).toBeInTheDocument();
    expect(Object.keys(JSON.parse(fetchMock.mock.calls[0][1]?.body as string))).toEqual(['name', 'email', 'password']);
    expect(screen.queryByLabelText(/administrador|rol|privilegios/i)).not.toBeInTheDocument();
  });
});

describe('HU-01: recuperación ante fallas del servicio', () => {
  it('informa un error de red, conserva nombre y correo y permite reintentar', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    render(<RegistrationForm />);
    fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectar con el servicio. Vuelve a intentarlo.');
    expect(screen.getByLabelText('Nombre')).toHaveValue('Jorge Aceval');
    expect(screen.getByLabelText('Correo electrónico')).toHaveValue('jorge@example.com');
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeEnabled();
    fetchMock.mockResolvedValueOnce(response(201));
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(await screen.findByText('Tu cuenta fue creada.')).toBeInTheDocument();
  });

  it('presenta un error genérico ante un 503 sin revelar detalles internos', async () => {
    fetchMock.mockResolvedValue(response(503, { detail: 'password=private-database-secret' }));
    render(<RegistrationForm />);
    fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos crear tu cuenta. Vuelve a intentarlo en unos momentos.');
    expect(screen.queryByText(/private-database-secret/)).not.toBeInTheDocument();
  });
});
