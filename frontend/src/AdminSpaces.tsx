import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  AdminSpaceError, getAdminSpaces, moderationTimestamp, reasonMaxLength, restoreSpace, validateReason,
  withdrawSpace, type AdminSpace,
} from './adminSpacesApi';
import { type AuthRequest } from './useSession';

type State = { status: 'loading' | 'loaded' | 'error'; spaces: AdminSpace[] };
type CardProps = { space: AdminSpace; authRequest: AuthRequest; disabled: boolean;
  onBusyChange: (id: string, busy: boolean) => void; onSaved: (space: AdminSpace, message: string) => void };

function stateLabel(space: AdminSpace) {
  return space.is_withdrawn ? 'Retirada por administración' : space.is_active ? 'Activa' : 'Inactiva';
}

function AdminSpaceCard({ space, authRequest, disabled, onBusyChange, onSaved }: CardProps) {
  const [mode, setMode] = useState<'idle' | 'withdraw' | 'restore'>('idle');
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const mounted = useRef(true);
  const fieldId = `withdrawal-reason-${space.id}`;

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { onBusyChange(space.id, mode !== 'idle'); return () => onBusyChange(space.id, false); },
    [mode, onBusyChange, space.id]);

  function close() {
    if (submitting.current) return;
    setMode('idle'); setReason(''); setReasonError(''); setError('');
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (submitting.current) return;
    if (mode === 'withdraw') {
      const invalid = validateReason(reason);
      if (invalid) { setReasonError(invalid); return; }
    }
    submitting.current = true; setPending(true); setError(''); setReasonError('');
    try {
      const saved = mode === 'withdraw' ? await withdrawSpace(space.id, reason, authRequest) :
        await restoreSpace(space.id, authRequest);
      if (!mounted.current || !saved) return;
      onSaved(saved, mode === 'withdraw' ? `Retiramos «${saved.name}» del catálogo.` :
        `Levantamos el retiro de «${saved.name}». Quedó inactiva hasta que su propietario la active.`);
      setMode('idle'); setReason('');
    } catch (failure) {
      if (!mounted.current) return;
      const message = failure instanceof AdminSpaceError ? failure.message : 'No pudimos confirmar el cambio. Vuelve a intentarlo.';
      if (failure instanceof AdminSpaceError && failure.field === 'reason') setReasonError(message); else setError(message);
    } finally {
      submitting.current = false;
      if (mounted.current) setPending(false);
    }
  }

  return (
    <article className="reservation-card admin-space-card" aria-label={space.name}>
      <div className="reservation-card-heading">
        <h2>{space.name}</h2>
        <span className={`space-status${space.is_active ? ' active' : ''}`}>{stateLabel(space)}</span>
      </div>
      <dl className="catalog-card-details">
        <div><dt>Comuna</dt><dd>{space.commune}</dd></div>
        <div><dt>Propietario</dt><dd>{space.owner_name} · {space.owner_email}</dd></div>
        <div><dt>Estado</dt><dd>{stateLabel(space)}</dd></div>
        {space.is_withdrawn && <>
          <div><dt>Motivo del retiro</dt><dd>{space.withdrawal_reason ?? 'Sin motivo registrado (retiro anterior).'}</dd></div>
          {space.withdrawn_at && <div><dt>Retirada</dt>
            <dd>{moderationTimestamp(space.withdrawn_at)}{space.withdrawn_by_name ? ` · ${space.withdrawn_by_name}` : ''}</dd></div>}
        </>}
      </dl>
      {mode === 'idle' && (space.is_withdrawn ?
        <button className="status-action" disabled={disabled} onClick={() => setMode('restore')}>Levantar retiro</button> :
        <button className="cancel-button" disabled={disabled} onClick={() => setMode('withdraw')}>Retirar publicación</button>)}
      {mode === 'withdraw' && <form className="admin-moderation-form" aria-label={`Retirar «${space.name}»`} noValidate
        onSubmit={(event) => void submit(event)}>
        <label htmlFor={fieldId}>Motivo del retiro</label>
        <textarea id={fieldId} value={reason} maxLength={reasonMaxLength} rows={3} disabled={pending}
          aria-invalid={reasonError ? 'true' : undefined} aria-describedby={`${fieldId}-help`}
          onChange={(event) => { setReason(event.target.value); setReasonError(''); }} />
        <p className="field-help" id={`${fieldId}-help`}>
          {reason.trim().length}/{reasonMaxLength}. El propietario verá este motivo. Las reservas existentes se conservan.
        </p>
        {reasonError && <p className="field-error" role="alert">{reasonError}</p>}
        <div className="dialog-actions">
          <button type="button" className="cancel-button" disabled={pending} onClick={close}>Volver sin retirar</button>
          <button type="submit" disabled={pending}>{pending ? 'Retirando publicación…' : 'Confirmar retiro'}</button>
        </div>
      </form>}
      {mode === 'restore' && <div className="admin-moderation-form" role="group" aria-label={`Levantar retiro de «${space.name}»`}>
        <p>La publicación quedará <strong>inactiva</strong>; su propietario decide si la vuelve a activar.</p>
        <div className="dialog-actions">
          <button type="button" className="cancel-button" disabled={pending} onClick={close}>Volver sin cambios</button>
          <button type="button" disabled={pending} onClick={() => void submit()}>
            {pending ? 'Levantando retiro…' : 'Confirmar levantamiento'}</button>
        </div>
      </div>}
      {pending && <p className="registration-feedback" role="status">Estamos guardando la decisión de administración.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </article>
  );
}

export default function AdminSpaces({ authRequest }: { authRequest: AuthRequest }) {
  const [state, setState] = useState<State>({ status: 'loading', spaces: [] });
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading', spaces: [] });
    getAdminSpaces(authRequest, controller.signal)
      .then((spaces) => { if (!controller.signal.aborted && spaces) setState({ status: 'loaded', spaces }); })
      .catch(() => { if (!controller.signal.aborted) setState({ status: 'error', spaces: [] }); });
    return () => controller.abort();
  }, [authRequest, attempt]);

  const onBusyChange = useCallback((id: string, busy: boolean) => {
    setBusyId((current) => busy ? id : current === id ? null : current);
  }, []);

  function onSaved(saved: AdminSpace, message: string) {
    setState((previous) => ({ ...previous, spaces: previous.spaces.map((space) => space.id === saved.id ? saved : space) }));
    setNotice(message);
  }

  const counts = {
    active: state.spaces.filter((space) => space.is_active).length,
    inactive: state.spaces.filter((space) => !space.is_active && !space.is_withdrawn).length,
    withdrawn: state.spaces.filter((space) => space.is_withdrawn).length,
  };

  return (
    <section className="account-panel admin-spaces" aria-labelledby="admin-title">
      <p className="eyebrow">ADMINISTRACIÓN</p>
      <h1 id="admin-title">Administración</h1>
      <p>Revisa las publicaciones y retira las inadecuadas con un motivo. Retirar no borra ni cancela reservas, y no permite
        cambiar importes, propietarios ni pagos.</p>
      {notice && <p className="session-message" role="status">{notice}</p>}
      {state.status === 'loading' ? <div className="catalog-state"><p role="status">Cargando publicaciones…</p></div> :
        state.status === 'error' ? <div className="catalog-state">
          <p className="form-error" role="alert">No pudimos cargar las publicaciones. Vuelve a intentarlo.</p>
          <button onClick={() => { setNotice(''); setAttempt((value) => value + 1); }}>Volver a cargar publicaciones</button></div> :
          !state.spaces.length ? <div className="catalog-state"><p role="status">Todavía no hay publicaciones registradas.</p></div> : <>
            <p className="field-help">{counts.active} activas · {counts.inactive} inactivas · {counts.withdrawn} retiradas</p>
            <div className="reservation-list">{state.spaces.map((space) => <AdminSpaceCard key={space.id} space={space}
              authRequest={authRequest} disabled={busyId !== null && busyId !== space.id}
              onBusyChange={onBusyChange} onSaved={onSaved} />)}</div>
          </>}
    </section>
  );
}
