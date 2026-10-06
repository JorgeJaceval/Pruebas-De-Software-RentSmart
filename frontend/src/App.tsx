import { useEffect, useState } from 'react';
import { checkAvailability } from './api';

type Availability = 'checking' | 'available' | 'unavailable';

export default function App() {
  const [availability, setAvailability] = useState<Availability>('checking');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    checkAvailability(controller.signal)
      .then(() => {
        if (!controller.signal.aborted) setAvailability('available');
      })
      .catch(() => {
        if (!controller.signal.aborted) setAvailability('unavailable');
      });
    return () => controller.abort();
  }, [attempt]);

  function retry() {
    setAvailability('checking');
    setAttempt((value) => value + 1);
  }

  return (
    <div className="page">
      <header className="site-header">
        <a className="brand" href="/" aria-label="RentSmart, inicio">
          <svg className="brand-icon" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M8 22 24 9l16 13M12 20v20h24V20" />
            <path className="brand-door" d="M21 40V28h6v12" />
          </svg>
          RentSmart<span className="brand-dot">.</span>
        </a>
        <span className="header-note">Espacios entre particulares</span>
      </header>
      <main>
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
              {availability === 'unavailable' && (
                <button onClick={retry}>Volver a comprobar</button>
              )}
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
      </main>
      <footer>RentSmart · Jorge Aceval y Joaquín Viveros</footer>
    </div>
  );
}
