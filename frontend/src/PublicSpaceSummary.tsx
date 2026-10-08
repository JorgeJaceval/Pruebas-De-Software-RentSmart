import { useEffect, useState } from 'react';
import SpacePhoto from './SpacePhoto';
import { spaceCategories } from './spaces';
import { availabilityNotice, getPublicSpace, getSpaceDetail, PublicSpaceUnavailable,
  type PublicSpaceDetail, type SpaceDetail } from './publicSpaces';
import { type Account, type AuthRequest } from './useSession';

type DetailState = { status: 'loading' | 'loaded' | 'error'; space: PublicSpaceDetail | SpaceDetail | null;
  unavailable: boolean; accountId: string | null };
type Props = { id: string; account: Account | null; authRequest: AuthRequest;
  sessionStatus: 'guest' | 'checking' | 'authenticated' | 'offline'; retrySession: () => void };

function hourLabel(hour: number) { return `${String(hour).padStart(2, '0')}:00`; }
function hasAccess(space: PublicSpaceDetail): space is SpaceDetail { return 'is_owner' in space; }

function ScheduleSelection({ space, guest }: { space: PublicSpaceDetail; guest: boolean }) {
  const [date, setDate] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const hours = Array.from({ length: space.closing_hour - space.opening_hour + 1 }, (_, index) => space.opening_hour + index);
  const invalid = start !== '' && end !== '' && (Number(end) <= Number(start) || Number(end) - Number(start) > 8);
  return <section className="detail-reservation" aria-labelledby="detail-reservation-title">
    <h2 id="detail-reservation-title">Elige fecha y horario</h2>
    <p>Arriendo por hora. Todos los horarios corresponden a Santiago.</p>
    <div className="space-fields-grid">
      <div className="form-field"><label htmlFor="detail-date">Fecha</label>
        <input id="detail-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div>
      <div className="form-field"><label htmlFor="detail-start">Hora de inicio</label>
        <select id="detail-start" value={start} onChange={(event) => setStart(event.target.value)}>
          <option value="">Seleccionar inicio</option>{hours.slice(0, -1).map((hour) => <option key={hour} value={hour}>{hourLabel(hour)}</option>)}
        </select></div>
      <div className="form-field"><label htmlFor="detail-end">Hora de término</label>
        <select id="detail-end" value={end} onChange={(event) => setEnd(event.target.value)}>
          <option value="">Seleccionar término</option>{hours.slice(1).map((hour) => <option key={hour} value={hour}>{hourLabel(hour)}</option>)}
        </select></div>
    </div>
    {invalid && <p className="form-error" role="alert">Elige un intervalo de 1 a 8 horas con término posterior al inicio.</p>}
    {guest ? <a className="registration-link" href={`#sesion/espacio/${space.id}`}>Iniciar sesión para reservar</a> :
      <><p className="field-help">La solicitud de reservas estará disponible próximamente.</p>
        <button type="button" disabled>Solicitar reserva</button></>}
  </section>;
}

export default function PublicSpaceSummary({ id, account, authRequest, sessionStatus, retrySession }: Props) {
  const accountId = account?.id ?? null;
  const [state, setState] = useState<DetailState>({ status: 'loading', space: null, unavailable: false, accountId });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading', space: null, unavailable: false, accountId });
    const request = accountId ? getSpaceDetail(id, authRequest, controller.signal) : getPublicSpace(id, controller.signal);
    request.then((space) => {
      if (!controller.signal.aborted && space) setState({ status: 'loaded', space, unavailable: false, accountId });
    }).catch((error) => {
      if (!controller.signal.aborted) setState({ status: 'error', space: null,
        unavailable: error instanceof PublicSpaceUnavailable, accountId });
    });
    return () => controller.abort();
  }, [id, accountId, authRequest, attempt]);

  const loading = state.accountId !== accountId || state.status === 'loading';
  const space = state.accountId === accountId ? state.space : null;
  const access = space && hasAccess(space) ? space : null;
  const price = space && new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(space.price_per_hour);

  return <section className="public-space-summary" aria-label="Detalle del espacio">
    <a className="registration-link" href="#catalogo">Volver al catálogo</a>
    {loading ? <div className="catalog-state"><h1>Espacio</h1><p role="status">Cargando publicación…</p></div> :
      state.status === 'error' ? <div className="catalog-state"><h1>Espacio</h1><p className="form-error" role="alert">{state.unavailable ?
        'Este espacio no está disponible en el catálogo.' : 'No pudimos cargar la publicación. Vuelve a intentarlo.'}</p>
        {!state.unavailable && <button onClick={() => setAttempt((value) => value + 1)}>Volver a cargar publicación</button>}</div> :
        space && <article className="public-space-detail" aria-labelledby="space-detail-title">
          <h1 id="space-detail-title">{space.name}</h1><p className="catalog-card-category">{spaceCategories[space.category]} · {space.commune}</p>
          {access?.is_owner && <p className="session-message">Este es tu espacio. No puedes reservarlo.</p>}
          {access && (!access.is_active || access.is_withdrawn) && <p className="session-message" role="status">
            {access.is_withdrawn ? 'Publicación retirada por administración.' : 'Publicación inactiva.'} Solo visible para su propietario o administración. No admite reservas nuevas.</p>}
          <div className="space-photo-gallery">{space.photos.map((url, index) =>
            <SpacePhoto key={`${index}-${url}`} url={url} label={`Foto ${index + 1} de ${space.name}`} />)}</div>
          <div className="space-description"><h2>Acerca de este espacio</h2><p>{space.description}</p></div>
          <dl className="space-details"><div><dt>Ubicación referencial</dt><dd>{space.location_reference}</dd></div>
            <div><dt>Capacidad</dt><dd>{space.capacity} personas</dd></div>
            <div><dt>Precio por hora</dt><dd>{price} CLP/h</dd></div>
            <div><dt>Horario diario · Santiago</dt><dd>{hourLabel(space.opening_hour)}–{hourLabel(space.closing_hour)}, todos los días</dd></div>
          </dl>
          <div className="space-description"><h2>Condiciones de uso</h2><p>{space.conditions}</p></div>
          {sessionStatus === 'checking' ? <p role="status">Comprobando tu sesión…</p> :
            sessionStatus === 'offline' ? <><p className="session-message">No pudimos comprobar tu sesión.</p>
              <button onClick={retrySession}>Volver a comprobar sesión</button></> :
              (!access || access.can_reserve) && <ScheduleSelection key={space.id} space={space} guest={!accountId} />}
        </article>}
    <p className="catalog-availability-note">{availabilityNotice}</p>
  </section>;
}
