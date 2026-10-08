import { useEffect, useState } from 'react';
import PublicSpaceCard from './PublicSpaceCard';
import { availabilityNotice, getPublicSpace, PublicSpaceUnavailable, type PublicSpace } from './publicSpaces';

type SummaryState = { status: 'loading' | 'loaded' | 'error'; space: PublicSpace | null; unavailable: boolean };

export default function PublicSpaceSummary({ id }: { id: string }) {
  const [state, setState] = useState<SummaryState>({ status: 'loading', space: null, unavailable: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading', space: null, unavailable: false });
    getPublicSpace(id, controller.signal)
      .then((space) => { if (!controller.signal.aborted) setState({ status: 'loaded', space, unavailable: false }); })
      .catch((error) => { if (!controller.signal.aborted) setState({ status: 'error', space: null, unavailable: error instanceof PublicSpaceUnavailable }); });
    return () => controller.abort();
  }, [id, attempt]);

  return (
    <section className="public-space-summary" aria-label="Publicación del catálogo">
      <a className="registration-link" href="#catalogo">Volver al catálogo</a>
      {state.status === 'loading' ? <div className="catalog-state"><h1>Espacio</h1><p role="status">Cargando publicación…</p></div> :
        state.status === 'error' ? <div className="catalog-state"><h1>Espacio</h1><p className="form-error" role="alert">{state.unavailable ?
          'Este espacio no está disponible en el catálogo.' : 'No pudimos cargar la publicación. Vuelve a intentarlo.'}</p>
          {!state.unavailable && <button onClick={() => setAttempt((value) => value + 1)}>Volver a cargar publicación</button>}</div> :
          state.space && <PublicSpaceCard space={state.space} linked={false} />}
      <p className="catalog-availability-note">{availabilityNotice}</p>
    </section>
  );
}
