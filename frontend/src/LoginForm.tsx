import { useEffect, useRef, useState, type FormEvent } from 'react';

type Props = {
  login: (email: string, password: string) => Promise<string | null | undefined>;
  onSuccess: () => void;
  message?: string;
};

export default function LoginForm({ login, onSuccess, message }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const mounted = useRef(true);
  const emailInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Ingresa un correo electrónico válido.');
      emailInput.current?.focus();
      return;
    }
    if (!password) {
      setError('Ingresa tu contraseña.');
      passwordInput.current?.focus();
      return;
    }
    submitting.current = true;
    setPending(true);
    setError('');
    const failure = await login(email, password);
    if (!mounted.current) return;
    submitting.current = false;
    setPending(false);
    setPassword('');
    if (failure === undefined) return;
    if (failure) setError(failure);
    else onSuccess();
  }

  return (
    <section id="sesion" className="registration login-section" aria-labelledby="login-title">
      <div className="registration-copy">
        <p className="eyebrow">VUELVE A TU ESPACIO</p>
        <h1 id="login-title">Inicia sesión</h1>
        <p>Accede a tu cuenta para gestionar tus espacios y reservas.</p>
        <p className="registration-note">¿Aún no tienes cuenta? <a href="#registro">Crear cuenta</a></p>
      </div>
      <div className="registration-card">
        {message && <p className="session-message" role="status">{message}</p>}
        <form onSubmit={submit} noValidate aria-label="Iniciar sesión" aria-busy={pending}>
          <fieldset disabled={pending}>
            <div className="form-field">
              <label htmlFor="login-email">Correo electrónico</label>
              <input ref={emailInput} id="login-email" name="email" type="email" autoComplete="email" required
                value={email} onChange={(event) => { setEmail(event.target.value); setError(''); }} />
            </div>
            <div className="form-field">
              <label htmlFor="login-password">Contraseña</label>
              <input ref={passwordInput} id="login-password" name="password" type="password" autoComplete="current-password" required
                value={password} onChange={(event) => { setPassword(event.target.value); setError(''); }} />
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="registration-submit" type="submit">
              {pending ? 'Iniciando sesión…' : 'Iniciar sesión'}
            </button>
          </fieldset>
          <p className="registration-feedback" role="status" aria-live="polite">
            {pending ? 'Estamos comprobando tus datos.' : ''}
          </p>
        </form>
      </div>
    </section>
  );
}
