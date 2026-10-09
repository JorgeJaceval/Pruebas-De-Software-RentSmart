import { useCallback, useEffect, useState } from 'react';
import { getOwnedSpaces } from './ownedSpacesApi';
import SpacePhoto from './SpacePhoto';
import SpaceStatusControl from './SpaceStatusControl';
import SpaceDeleteControl from './SpaceDeleteControl';
import { spaceCategories, validPhotoUrl, type Space, type SpaceStatus } from './spaces';
import { type AuthRequest } from './useSession';

type Props = { ownerId: string; authRequest: AuthRequest; deletedNotice?: boolean };
type State = { status: 'loading' | 'loaded' | 'error'; spaces: Space[] };
type CardProps = { space: Space; authRequest: AuthRequest; disabled: boolean;
  onStatusChanged: (status: SpaceStatus) => void; onDeleted: (id: string) => void;
  onBusyChange: (id: string, busy: boolean) => void };

function OwnedSpaceCard({ space, authRequest, disabled, onStatusChanged, onDeleted, onBusyChange }: CardProps) {
  const [statusPending, setStatusPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [withdrawalBlocked, setWithdrawalBlocked] = useState(false);
  const [statusRevision, setStatusRevision] = useState(0);
  const busy = statusPending || deletePending || deleteOpen;
  const photo = space.photos[0];

  useEffect(() => {
    onBusyChange(space.id, busy);
    return () => onBusyChange(space.id, false);
  }, [busy, onBusyChange, space.id]);

  return (
    <article className="catalog-card owned-space-card" aria-label={space.name}>
      <SpacePhoto key={photo} url={photo && validPhotoUrl(photo) ? photo : null} label={`Foto de ${space.name}`} />
      <div className="catalog-card-copy">
        <p className="catalog-card-category">{spaceCategories[space.category]} · {space.commune}</p>
        <h2>{space.name}</h2>
        <dl className="catalog-card-details"><div><dt>Precio por hora</dt>
          <dd>{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(space.price_per_hour)} CLP</dd>
        </div></dl>
        <SpaceStatusControl key={statusRevision} space={space} authRequest={authRequest} onPendingChange={setStatusPending}
          disabled={disabled || deletePending || deleteOpen} blockedByAdministration={withdrawalBlocked}
          onWithdrawn={() => setWithdrawalBlocked(true)} onStatusChanged={onStatusChanged} />
        <div className="owned-space-actions">
          {busy || disabled ? <><span className="registration-link disabled-link" aria-disabled="true">Ver espacio</span>
            <span className="registration-link disabled-link" aria-disabled="true">Editar espacio</span></> : <>
            <a className="registration-link" href={`#espacio/${space.id}`}>Ver espacio</a>
            <a className="registration-link" href={`#editar-espacio/${space.id}`}>Editar espacio</a></>}
        </div>
        <SpaceDeleteControl space={space} authRequest={authRequest} disabled={disabled || statusPending}
          blockedByAdministration={withdrawalBlocked} onWithdrawn={() => setWithdrawalBlocked(true)}
          onPendingChange={setDeletePending} onOpenChange={setDeleteOpen} onDeleted={() => onDeleted(space.id)}
          onPreserved={(status) => { onStatusChanged(status); setStatusRevision((value) => value + 1); }} />
        <div className="owned-reservations"><button disabled aria-describedby={`owned-reservation-note-${space.id}`}>Consultar reservas</button>
          <p id={`owned-reservation-note-${space.id}`} className="field-help">Consulta de reservas próximamente.</p></div>
      </div>
    </article>
  );
}

export default function OwnedSpaces({ ownerId, authRequest, deletedNotice = false }: Props) {
  const [state, setState] = useState<State>({ status: 'loading', spaces: [] });
  const [attempt, setAttempt] = useState(0);
  const [removed, setRemoved] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const onBusyChange = useCallback((id: string, busy: boolean) => {
    setBusyId((current) => busy ? id : current === id ? null : current);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading', spaces: [] });
    getOwnedSpaces(ownerId, authRequest, controller.signal)
      .then((spaces) => { if (!controller.signal.aborted && spaces) setState({ status: 'loaded', spaces }); })
      .catch(() => { if (!controller.signal.aborted) setState({ status: 'error', spaces: [] }); });
    return () => controller.abort();
  }, [ownerId, authRequest, attempt]);

  function updateStatus(status: SpaceStatus) {
    setState((previous) => ({ ...previous, spaces: previous.spaces.map((space) => space.id.toLowerCase() === status.id.toLowerCase() ?
      { ...space, is_active: status.is_active, is_withdrawn: status.is_withdrawn } : space) }));
  }

  function remove(id: string) {
    setState((previous) => ({ ...previous, spaces: previous.spaces.filter((space) => space.id !== id) }));
    setRemoved(true);
  }

  return (
    <section className="account-panel owned-spaces" aria-labelledby="owned-spaces-title">
      <div className="space-editor-heading"><div><p className="eyebrow">TUS PUBLICACIONES</p>
        <h1 id="owned-spaces-title">Mis espacios</h1><p>Administra tus espacios, incluyendo publicaciones inactivas o deshabilitadas.</p></div>
        <a className="registration-link" href="#publicar-espacio">Publicar espacio</a>
      </div>
      {(deletedNotice || removed) && <p className="session-message" role="status">Tu espacio fue eliminado.</p>}
      {state.status === 'loading' ? <div className="catalog-state"><p role="status">Cargando tus espacios…</p></div> :
        state.status === 'error' ? <div className="catalog-state"><p className="form-error" role="alert">No pudimos cargar tus espacios. Vuelve a intentarlo.</p>
          <button onClick={() => setAttempt((value) => value + 1)}>Volver a cargar mis espacios</button></div> :
          !state.spaces.length ? <div className="catalog-state"><p role="status">Todavía no tienes espacios publicados.</p>
            <p>Publica tu primer espacio para compartirlo y administrarlo desde aquí.</p></div> :
            <div className="catalog-grid">{state.spaces.map((space) => <OwnedSpaceCard key={space.id} space={space} authRequest={authRequest}
              disabled={busyId !== null && busyId !== space.id} onBusyChange={onBusyChange} onStatusChanged={updateStatus} onDeleted={remove} />)}</div>}
    </section>
  );
}
