import { useEffect, useState } from 'react';
import SpacePhoto from './SpacePhoto';
import { spaceCategories, spaceFrom, type Space } from './spaces';
import { type AuthRequest } from './useSession';

type Props = { id: string; authRequest: AuthRequest; justPublished: boolean };
type LoadingState = { space: Space | null; pending: boolean; error: string; retryable: boolean };

export default function CreatedSpace({ id, authRequest, justPublished }: Props) {
  const [state, setState] = useState<LoadingState>({ space: null, pending: true, error: '', retryable: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ space: null, pending: true, error: '', retryable: false });
    async function load() {
      try {
        if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) {
          setState({ space: null, pending: false, error: 'No encontramos este espacio.', retryable: false });
          return;
        }
        const result = await authRequest(`/api/spaces/${id}`, { signal: controller.signal });
        if (controller.signal.aborted || !result) return;
        if (result.status === 403 || result.status === 404) {
          setState({ space: null, pending: false, error: result.status === 403 ?
            'Tu cuenta no tiene acceso a este espacio.' : 'No encontramos este espacio.', retryable: false });
          return;
        }
        if (result.status !== 200) throw new Error('Space unavailable');
        const space = spaceFrom(result.body);
        if (space.id !== id) throw new Error('Unexpected space');
        setState({ space, pending: false, error: '', retryable: false });
      } catch {
        if (!controller.signal.aborted) setState({ space: null, pending: false,
          error: 'No pudimos cargar tu espacio. Vuelve a intentarlo.', retryable: true });
      }
    }
    void load();
    return () => controller.abort();
  }, [id, authRequest, attempt]);

  const space = state.space;
  return (
    <section className="created-space account-panel" aria-labelledby="created-space-title">
      {justPublished && <p className="session-message" role="status">Tu espacio fue publicado.</p>}
      {state.pending ? <p role="status">Cargando tu espacio…</p> : state.error ? <>
        <h1 id="created-space-title">Tu espacio</h1><p role="alert">{state.error}</p>
        {state.retryable && <button onClick={() => setAttempt((value) => value + 1)}>Volver a cargar espacio</button>}
      </> : space && <>
        <div className="created-space-heading"><div><p className="eyebrow">TU PUBLICACIÓN</p>
          <h1 id="created-space-title">{space.name}</h1><p>{spaceCategories[space.category]} · {space.commune}</p></div>
          <span className={`space-status${space.is_active ? ' active' : ''}`}>{space.is_active ? 'Publicación activa' : 'Publicación inactiva'}</span>
        </div>
        <div className="space-photo-gallery">{space.photos.map((url, index) =>
          <SpacePhoto key={`${index}-${url}`} url={url} label={`Foto ${index + 1} de ${space.name}`} />)}</div>
        <div className="space-description"><h2>Acerca de este espacio</h2><p>{space.description}</p></div>
        <dl className="space-details">
          <div><dt>Ubicación referencial</dt><dd>{space.location_reference}</dd></div>
          <div><dt>Capacidad</dt><dd>{space.capacity} personas</dd></div>
          <div><dt>Precio por hora</dt><dd>{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(space.price_per_hour)} CLP</dd></div>
          <div><dt>Horario diario · Santiago</dt><dd>{String(space.opening_hour).padStart(2, '0')}:00–{String(space.closing_hour).padStart(2, '0')}:00</dd></div>
        </dl>
        <div className="space-description"><h2>Condiciones de uso</h2><p>{space.conditions}</p></div>
      </>}
      <div className="space-detail-actions"><a className="registration-link" href="#mis-espacios">Volver a mis espacios</a>
        <a href="#publicar-espacio">Publicar otro espacio</a></div>
    </section>
  );
}
