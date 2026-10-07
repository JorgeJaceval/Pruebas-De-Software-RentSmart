import SpaceForm from './SpaceForm';
import { fieldsFromSpace, updateSpace, type Space } from './spaces';
import useOwnedSpace from './useOwnedSpace';
import { type AuthRequest } from './useSession';

type Props = { id: string; authRequest: AuthRequest; onSuccess: (space: Space) => void };

export default function EditSpace({ id, authRequest, onSuccess }: Props) {
  const state = useOwnedSpace(id, authRequest);
  if (state.space) return <SpaceForm mode="edit" initialFields={fieldsFromSpace(state.space)}
    inactive={!state.space.is_active} withdrawn={state.space.is_withdrawn} submit={(fields) => updateSpace(id, fields, authRequest)}
    onSuccess={onSuccess} onCancel={() => { window.location.hash = `espacio/${id}`; }} />;

  return (
    <section className="account-panel" aria-labelledby="edit-space-loading-title">
      <p className="eyebrow">TU PUBLICACIÓN</p><h1 id="edit-space-loading-title">Editar espacio</h1>
      {state.pending ? <p role="status">Cargando los datos de tu espacio…</p> : <>
        <p role="alert">{state.error}</p>
        {state.retryable && <button onClick={state.retry}>Volver a cargar espacio</button>}
      </>}
      <div className="space-detail-actions"><a className="registration-link" href="#mis-espacios">Volver a mis espacios</a></div>
    </section>
  );
}
