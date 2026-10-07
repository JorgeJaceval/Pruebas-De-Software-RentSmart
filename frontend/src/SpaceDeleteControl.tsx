import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { deleteSpace, SpaceDeletionError } from './spaceDeletion';
import { setSpaceStatus, SpaceStatusError } from './spaceStatus';
import { type Space, type SpaceStatus } from './spaces';
import { type AuthRequest } from './useSession';

type Props = { space: Space; authRequest: AuthRequest; disabled: boolean; blockedByAdministration: boolean;
  onDeleted: () => void; onPreserved: (status: SpaceStatus) => void; onWithdrawn: () => void;
  onPendingChange: (pending: boolean) => void; onOpenChange: (open: boolean) => void };

export default function SpaceDeleteControl({ space, authRequest, disabled, blockedByAdministration,
  onDeleted, onPreserved, onWithdrawn, onPendingChange, onOpenChange }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<'delete' | 'preserve' | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState(false);
  const [missing, setMissing] = useState(false);
  const [preserved, setPreserved] = useState(false);
  const submitting = useRef(false);
  const mounted = useRef(true);
  const request = useRef<AbortController | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const wasOpened = useRef(false);
  const withdrawn = space.is_withdrawn || blockedByAdministration;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; request.current?.abort(); };
  }, []);

  useEffect(() => {
    if (open) { wasOpened.current = true; cancel.current?.focus(); }
    else if (wasOpened.current) trigger.current?.focus();
  }, [open]);

  useEffect(() => {
    if (pending) dialog.current?.focus();
  }, [pending]);

  function close() {
    if (submitting.current) return;
    setOpen(false);
    onOpenChange(false);
  }

  function show() {
    if (disabled || submitting.current) return;
    setError(''); setHistory(false); setMissing(false); setPreserved(false);
    setOpen(true);
    onOpenChange(true);
  }

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
    if (event.key !== 'Tab') return;
    const buttons = dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
    const first = buttons?.[0], last = buttons?.[buttons.length - 1];
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  async function submit(action: 'delete' | 'preserve') {
    if (submitting.current || disabled || (action === 'preserve' && (!history || !space.is_active || withdrawn))) return;
    submitting.current = true;
    setPending(action); onPendingChange(true); setError('');
    const controller = new AbortController();
    request.current = controller;
    try {
      if (action === 'delete') {
        const deleted = await deleteSpace(space.id, authRequest, controller.signal);
        if (mounted.current && !controller.signal.aborted && deleted) onDeleted();
      } else {
        const status = await setSpaceStatus(space.id, false, authRequest, controller.signal);
        if (!mounted.current || controller.signal.aborted || !status) return;
        onPreserved(status);
        setPreserved(true); setOpen(false); onOpenChange(false);
      }
    } catch (failure) {
      if (!mounted.current || controller.signal.aborted) return;
      setError(failure instanceof Error ? failure.message : 'No pudimos confirmar la operación. Vuelve a intentarlo.');
      if (failure instanceof SpaceDeletionError) {
        setHistory(failure.kind === 'history'); setMissing(failure.kind === 'missing');
      }
      if (failure instanceof SpaceStatusError && failure.withdrawn) {
        setError('La publicación ya fue deshabilitada por administración; el espacio y su historial se conservan.');
        onWithdrawn();
      }
    } finally {
      submitting.current = false;
      if (mounted.current) { setPending(null); onPendingChange(false); }
    }
  }

  return (
    <div className="space-delete-control">
      <button ref={trigger} className="danger-button" disabled={disabled || Boolean(pending)} onClick={show}>Eliminar espacio</button>
      {preserved && !space.is_active && <p className="session-message" role="status">La publicación fue desactivada; el espacio y su historial se conservaron.</p>}
      {open && <div className="dialog-backdrop">
        <div ref={dialog} tabIndex={-1} className="confirmation-dialog" role="alertdialog" aria-modal="true"
          aria-labelledby="delete-space-title" aria-describedby="delete-space-description" aria-busy={Boolean(pending)} onKeyDown={handleKey}>
          <h2 id="delete-space-title">Eliminar «{space.name}»</h2>
          <p id="delete-space-description">Esta acción elimina el espacio. Si tiene reservas o pagos asociados, tendrás que conservarlo.</p>
          {error && <p className="form-error" role="alert">{error}</p>}
          {history && (withdrawn ? <p>La publicación fue deshabilitada por administración; el espacio y su historial se conservan.</p> :
            !space.is_active && <p>La publicación ya está inactiva; el espacio y su historial se conservan.</p>)}
          {pending && <p role="status">{pending === 'delete' ? 'Estamos eliminando el espacio…' : 'Estamos desactivando la publicación…'}</p>}
          <div className="dialog-actions">
            <button ref={cancel} className="cancel-button" disabled={Boolean(pending)} onClick={close}>Cancelar</button>
            {history ? space.is_active && !withdrawn && <button disabled={Boolean(pending)} onClick={() => void submit('preserve')}>
              {pending === 'preserve' ? 'Desactivando y conservando…' : 'Desactivar y conservar'}</button> :
              !missing && <button className="danger-button" disabled={Boolean(pending)} onClick={() => void submit('delete')}>
                {pending === 'delete' ? 'Eliminando espacio…' : 'Eliminar definitivamente'}</button>}
          </div>
        </div>
      </div>}
    </div>
  );
}
