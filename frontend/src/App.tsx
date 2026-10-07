import { useEffect, useState } from 'react';
import { checkAvailability } from './api';
import LoginForm from './LoginForm';
import RegistrationForm from './RegistrationForm';
import useSession, { type PrivateView } from './useSession';

type Availability = 'checking' | 'available' | 'unavailable';
const privateViews: PrivateView[] = ['mis-espacios', 'mis-reservas', 'administracion'];

function currentView() {
  return window.location.hash.slice(1);
}

export default function App() {
  const [availability, setAvailability] = useState<Availability>('checking');
  const [attempt, setAttempt] = useState(0);
  const [route, setRoute] = useState(() => ({ hash: currentView(), revision: 0 }));
  const privateView = privateViews.includes(route.hash as PrivateView) ? route.hash as PrivateView : null;
  const session = useSession({ view: privateView, revision: route.revision });

  useEffect(() => {
    const onHashChange = () => setRoute((previous) => ({ hash: currentView(), revision: previous.revision + 1 }));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    checkAvailability(controller.signal)
      .then(() => { if (!controller.signal.aborted) setAvailability('available'); })
      .catch(() => { if (!controller.signal.aborted) setAvailability('unavailable'); });
    return () => controller.abort();
  }, [attempt]);

  function retryAvailability() {
    setAvailability('checking');
    setAttempt((value) => value + 1);
  }

  function logout() {
    session.logout();
    window.location.hash = 'sesion';
  }

  const sessionScreen = Boolean(privateView) || route.hash === 'sesion';
  const verified = session.status === 'authenticated' && session.approvedRevision === route.revision;

  return (
    <div className="page">
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="RentSmart, inicio">
          <svg className="brand-icon" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M8 22 24 9l16 13M12 20v20h24V20" />
            <path className="brand-door" d="M21 40V28h6v12" />
          </svg>
          RentSmart<span className="brand-dot">.</span>
        </a>
        <nav className="header-actions" aria-label="Navegación principal">
          {session.user ? <span className="account-name">Hola, {session.user.name}</span> :
            <span className="header-note">Espacios entre particulares</span>}
          {session.expiresAt ? <button className="logout-button" onClick={logout}>Cerrar sesión</button> : <>
            <a className="login-link" href="#sesion">Iniciar sesión</a>
            <a className="registration-link" href="#registro">Crear cuenta</a>
          </>}
        </nav>
      </header>
      {session.user && (
        <nav className="account-navigation" aria-label="Mi cuenta">
          <a href="#mis-espacios" aria-current={privateView === 'mis-espacios' ? 'page' : undefined}>Mis espacios</a>
          <a href="#mis-reservas" aria-current={privateView === 'mis-reservas' ? 'page' : undefined}>Mis reservas</a>
          {session.user.is_admin && <a href="#administracion" aria-current={privateView === 'administracion' ? 'page' : undefined}>Administración</a>}
        </nav>
      )}
      <main>
        {sessionScreen ? (
          session.status === 'guest' ? <LoginForm key={route.revision} login={session.login}
            message={session.message || (privateView ? 'Inicia sesión para continuar.' : '')}
            onSuccess={() => {
              if (currentView() === 'mis-espacios') void session.retry();
              else window.location.hash = 'mis-espacios';
            }} /> :
          session.status === 'offline' ? (
            <section className="account-panel" aria-labelledby="session-problem-title">
              <p className="eyebrow">TU CUENTA</p>
              <h1 id="session-problem-title">Vuelve a conectar</h1>
              <p role="alert">{session.message}</p>
              <button onClick={() => void session.retry()}>Volver a comprobar sesión</button>
            </section>
          ) : !verified ? (
            <section className="account-panel"><p role="status">Comprobando tu sesión…</p></section>
          ) : privateView === 'administracion' && session.forbidden ? (
            <section className="account-panel" aria-labelledby="access-denied-title">
              <p className="eyebrow">TU CUENTA</p>
              <h1 id="access-denied-title">Acceso restringido</h1>
              <p role="alert">Tu cuenta no tiene acceso a la administración.</p>
              <a className="registration-link" href="#mis-espacios">Volver a mis espacios</a>
            </section>
          ) : (
            <section className="account-panel" aria-labelledby="account-title">
              <p className="eyebrow">TU CUENTA</p>
              <h1 id="account-title">{privateView === 'mis-espacios' ? 'Mis espacios' :
                privateView === 'mis-reservas' ? 'Mis reservas' :
                privateView === 'administracion' ? 'Administración' : 'Sesión iniciada'}</h1>
              <p>{privateView === 'mis-espacios' ? 'La gestión de espacios estará disponible próximamente.' :
                privateView === 'mis-reservas' ? 'La gestión de reservas estará disponible próximamente.' :
                privateView === 'administracion' ? 'La gestión administrativa estará disponible próximamente.' :
                'Puedes acceder a tus espacios y reservas desde tu cuenta.'}</p>
            </section>
          )
        ) : <>
          <section className="hero" aria-labelledby="welcome-title">
            <div className="hero-copy">
              <p className="eyebrow">DALE ESPACIO A TUS IDEAS</p>
              <h1 id="welcome-title">Un espacio.<br />Muchas posibilidades.</h1>
              <p className="introduction">
                Conectamos personas que tienen un espacio con quienes necesitan
                un lugar para trabajar, reunirse o crear.
              </p>
              <div className="availability-card">
                <p className={`availability ${availability}`} role="status" aria-live="polite">
                  <span className="status-dot" aria-hidden="true" />
                  {availability === 'checking' && 'Comprobando disponibilidad…'}
                  {availability === 'available' && 'Servicio disponible'}
                  {availability === 'unavailable' && 'No pudimos conectar con el servicio'}
                </p>
                {availability === 'unavailable' && <button onClick={retryAvailability}>Volver a comprobar</button>}
              </div>
            </div>
            <div className="space-illustration" aria-hidden="true">
              <div className="sun" />
              <div className="window"><span /><span /><span /><span /></div>
              <div className="plant"><div className="leaf leaf-left" /><div className="leaf leaf-right" /><div className="pot" /></div>
              <div className="desk" /><div className="chair" />
              <div className="space-caption">El lugar para tu próxima idea.</div>
            </div>
          </section>
          <section className="purpose" aria-labelledby="purpose-title">
            <h2 id="purpose-title">Más vida para cada espacio</h2>
            <p>Una nueva forma de aprovechar los lugares que tenemos y encontrar los que necesitamos.</p>
          </section>
          {!session.expiresAt && <RegistrationForm />}
        </>}
      </main>
      <footer>RentSmart · Jorge Aceval y Joaquín Viveros</footer>
    </div>
  );
}
