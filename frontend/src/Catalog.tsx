import { useEffect, useState } from 'react';
import PublicSpaceCard from './PublicSpaceCard';
import { availabilityNotice, getPublicSpaces, type PublicSpace } from './publicSpaces';

type CatalogState = { status: 'loading' | 'loaded' | 'error'; spaces: PublicSpace[] };

export default function Catalog() {
  const [state, setState] = useState<CatalogState>({ status: 'loading', spaces: [] });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading', spaces: [] });
    getPublicSpaces(controller.signal)
      .then((spaces) => { if (!controller.signal.aborted) setState({ status: 'loaded', spaces }); })
      .catch(() => { if (!controller.signal.aborted) setState({ status: 'error', spaces: [] }); });
    return () => controller.abort();
  }, [attempt]);

  return (
    <section className="catalog" aria-labelledby="catalog-title">
      <div className="catalog-heading"><p className="eyebrow">ENCUENTRA TU PRÓXIMO ESPACIO</p>
        <h1 id="catalog-title">Explorar catálogo</h1>
        <p>Conoce los lugares que otras personas comparten para reunirse, trabajar o crear.</p>
        <p className="catalog-availability-note">{availabilityNotice}</p>
      </div>
      {state.status === 'loading' ? <div className="catalog-state"><p role="status">Cargando publicaciones…</p></div> :
        state.status === 'error' ? <div className="catalog-state"><p className="form-error" role="alert">No pudimos cargar el catálogo. Vuelve a intentarlo.</p>
          <button onClick={() => setAttempt((value) => value + 1)}>Volver a cargar catálogo</button></div> :
          !state.spaces.length ? <div className="catalog-state"><p role="status">Todavía no hay publicaciones para mostrar.</p></div> :
            <div className="catalog-grid">{state.spaces.map((space) => <PublicSpaceCard key={space.id} space={space} />)}</div>}
    </section>
  );
}
