export type RegistrationInput = {
  name: string;
  email: string;
  password: string;
};

export type RegistrationErrors = Partial<Record<keyof RegistrationInput | 'form', string>>;

export class RegistrationError extends Error {
  constructor(public readonly errors: RegistrationErrors) {
    super(errors.form ?? 'Revisa los datos del formulario.');
  }
}

export function validateRegistration(input: RegistrationInput): RegistrationErrors {
  const errors: RegistrationErrors = {};
  const nameLength = Array.from(input.name.trim()).length;
  if (nameLength < 2 || nameLength > 80) {
    errors.name = 'Escribe un nombre de entre 2 y 80 caracteres.';
  }
  const email = input.email.trim();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Escribe un correo electrónico válido.';
  }
  const passwordLength = Array.from(input.password).length;
  if (passwordLength < 8 || passwordLength > 64) {
    errors.password = 'La contraseña debe tener entre 8 y 64 caracteres.';
  }
  return errors;
}

export async function registerAccount(input: RegistrationInput): Promise<void> {
  let response: Response;
  try {
    response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        password: input.password,
      }),
    });
  } catch {
    throw new RegistrationError({
      form: 'No pudimos conectar con el servicio. Vuelve a intentarlo.',
    });
  }

  if (response.status === 201) return;
  if (response.status === 409) {
    throw new RegistrationError({ email: 'Ya existe una cuenta con este correo.' });
  }
  if (response.status === 422) {
    const data: unknown = await response.json().catch(() => null);
    const errors: RegistrationErrors = {};
    if (data && typeof data === 'object' && 'errors' in data
      && data.errors && typeof data.errors === 'object') {
      for (const key of ['name', 'email', 'password', 'form'] as const) {
        if (key in data.errors) {
          const message = (data.errors as Record<string, unknown>)[key];
          if (typeof message === 'string') errors[key] = message;
        }
      }
    }
    if (!Object.keys(errors).length) errors.form = 'Revisa los datos del formulario.';
    throw new RegistrationError(errors);
  }
  throw new RegistrationError({
    form: 'No pudimos crear tu cuenta. Vuelve a intentarlo en unos momentos.',
  });
}
