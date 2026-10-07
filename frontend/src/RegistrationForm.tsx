import { useRef, useState, type FormEvent } from 'react';
import {
  RegistrationError,
  registerAccount,
  validateRegistration,
  type RegistrationErrors,
  type RegistrationInput,
} from './registration';

const emptyFields: RegistrationInput = { name: '', email: '', password: '' };

export default function RegistrationForm() {
  const [fields, setFields] = useState<RegistrationInput>(emptyFields);
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState(false);
  const submitting = useRef(false);

  function updateField(field: keyof RegistrationInput, value: string) {
    setFields((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined, form: undefined }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const validation = validateRegistration(fields);
    setErrors(validation);
    if (Object.keys(validation).length) {
      const firstField = Object.keys(validation)[0];
      const input = event.currentTarget.elements.namedItem(firstField);
      if (input instanceof HTMLInputElement) input.focus();
      return;
    }

    submitting.current = true;
    setPending(true);
    try {
      await registerAccount(fields);
      setFields(emptyFields);
      setCreated(true);
    } catch (error) {
      setErrors(error instanceof RegistrationError ? error.errors : {
        form: 'No pudimos crear tu cuenta. Vuelve a intentarlo en unos momentos.',
      });
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <section id="registro" className="registration" aria-labelledby="registration-title">
      <div className="registration-copy">
        <p className="eyebrow">TU PRÓXIMO ESPACIO EMPIEZA AQUÍ</p>
        <h2 id="registration-title">Crea tu cuenta</h2>
        <p>Una cuenta para encontrar espacios y compartir los tuyos.</p>
        <p className="registration-note">Solo necesitamos tu nombre, correo y una contraseña.</p>
      </div>
      <div className="registration-card">
        {created ? (
          <div className="registration-success" role="status" aria-live="polite">
            <span className="success-mark" aria-hidden="true">✓</span>
            <h3>Tu cuenta fue creada.</h3>
            <p>Gracias por sumarte a RentSmart.</p>
            <a className="registration-link success-login-link" href="#sesion">Iniciar sesión</a>
          </div>
        ) : (
          <form onSubmit={submit} noValidate aria-label="Crear cuenta" aria-busy={pending}>
            <fieldset disabled={pending}>
              <div className="form-field">
                <label htmlFor="registration-name">Nombre</label>
                <input id="registration-name" name="name" autoComplete="name" required
                  value={fields.name} onChange={(event) => updateField('name', event.target.value)}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'registration-name-error' : undefined} />
                {errors.name && <p id="registration-name-error" className="field-error">{errors.name}</p>}
              </div>
              <div className="form-field">
                <label htmlFor="registration-email">Correo electrónico</label>
                <input id="registration-email" name="email" type="email" autoComplete="email" required
                  value={fields.email} onChange={(event) => updateField('email', event.target.value)}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'registration-email-error' : undefined} />
                {errors.email && <p id="registration-email-error" className="field-error">{errors.email}</p>}
              </div>
              <div className="form-field">
                <label htmlFor="registration-password">Contraseña</label>
                <input id="registration-password" name="password" type="password" autoComplete="new-password" required
                  value={fields.password} onChange={(event) => updateField('password', event.target.value)}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={`registration-password-help${errors.password ? ' registration-password-error' : ''}`} />
                <p id="registration-password-help" className="field-help">Entre 8 y 64 caracteres.</p>
                {errors.password && <p id="registration-password-error" className="field-error">{errors.password}</p>}
              </div>
              {errors.form && <p className="form-error" role="alert">{errors.form}</p>}
              <button className="registration-submit" type="submit">
                {pending ? 'Creando tu cuenta…' : 'Crear cuenta'}
              </button>
            </fieldset>
            <p className="registration-feedback" role="status" aria-live="polite">
              {pending ? 'Estamos creando tu cuenta.' : Object.keys(errors).some((key) => errors[key as keyof RegistrationErrors])
                ? 'No se pudo completar el registro. Revisa los mensajes del formulario.' : ''}
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
