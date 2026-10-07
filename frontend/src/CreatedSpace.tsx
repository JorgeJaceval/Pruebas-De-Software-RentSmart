import SpacePhoto from './SpacePhoto';
import { spaceCategories } from './spaces';
import { type AuthRequest } from './useSession';
import useOwnedSpace from './useOwnedSpace';

type Props = { id: string; authRequest: AuthRequest; justPublished: boolean; justSaved?: boolean };

export default function CreatedSpace({ id, authRequest, justPublished, justSaved = false }: Props) {
  const state = useOwnedSpace(id, authRequest);
  const space = state.space;
  return (
    <section className="created-space account-panel" aria-labelledby="created-space-title">
      {justPublished && <p className="session-message" role="status">Tu espacio fue publicado.</p>}
      {justSaved && <p className="session-message" role="status">Los cambios fueron guardados.</p>}
      {state.pending ? <p role="status">Cargando tu espacio…</p> : state.error ? <>
        <h1 id="created-space-title">Tu espacio</h1><p role="alert">{state.error}</p>
        {state.retryable && <button onClick={state.retry}>Volver a cargar espacio</button>}
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
        {space && <a className="registration-link" href={`#editar-espacio/${space.id}`}>Editar espacio</a>}
        <a href="#publicar-espacio">Publicar otro espacio</a></div>
    </section>
  );
}
