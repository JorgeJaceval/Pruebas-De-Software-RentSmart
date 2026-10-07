import { useEffect, useRef, useState } from 'react';
import { setSpaceStatus, SpaceStatusError } from './spaceStatus';
import { type Space, type SpaceStatus } from './spaces';
import { type AuthRequest } from './useSession';

type Props = { space: Space; authRequest: AuthRequest;
  onStatusChanged: (status: SpaceStatus) => void; onPendingChange: (pending: boolean) => void;
  disabled?: boolean; blockedByAdministration?: boolean; onWithdrawn?: () => void };

export default function SpaceStatusControl({ space, authRequest, onStatusChanged, onPendingChange,
  disabled = false, blockedByAdministration = false, onWithdrawn }: Props) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(false);
  const submitting = useRef(false);
  const mounted = useRef(true);
  const request = useRef<AbortController | null>(null);
  const withdrawn = space.is_withdrawn || blocked || blockedByAdministration;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; request.current?.abort(); };
  }, []);

  async function changeStatus() {
    if (submitting.current || withdrawn || disabled) return;
    submitting.current = true;
    setPending(true);
    onPendingChange(true);
    setMessage('');
    setError('');
    const controller = new AbortController();
    request.current = controller;
    const desired = !space.is_active;
    try {
      const status = await setSpaceStatus(space.id, desired, authRequest, controller.signal);
      if (!mounted.current || controller.signal.aborted || !status) return;
      onStatusChanged(status);
      setMessage(desired ? 'La publicación fue activada.' : 'La publicación fue desactivada.');
    } catch (failure) {
      if (!mounted.current || controller.signal.aborted) return;
      setError(failure instanceof SpaceStatusError ? failure.message : 'No pudimos confirmar el cambio. Vuelve a intentarlo.');
      if (failure instanceof SpaceStatusError && failure.withdrawn) { setBlocked(true); onWithdrawn?.(); }
    } finally {
      submitting.current = false;
      if (mounted.current) { setPending(false); onPendingChange(false); }
    }
  }

  return (
    <div className="space-status-control" aria-busy={pending}>
      <span className={`space-status${space.is_active && !withdrawn ? ' active' : ''}`}>{withdrawn ?
        'Deshabilitada por administración' : space.is_active ? 'Publicación activa' : 'Publicación inactiva'}</span>
      {!withdrawn && <button className="status-action" disabled={pending || disabled} onClick={() => void changeStatus()}>{pending ?
        space.is_active ? 'Desactivando publicación…' : 'Activando publicación…' :
        space.is_active ? 'Desactivar publicación' : 'Activar publicación'}</button>}
      {pending && <p className="registration-feedback" role="status">Estamos actualizando el estado de tu publicación.</p>}
      {message && <p className="session-message" role="status">{message}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}
