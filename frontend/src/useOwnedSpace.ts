import { useEffect, useState } from 'react';
import { spaceFrom, type Space, type SpaceStatus } from './spaces';
import { type AuthRequest } from './useSession';

type LoadingState = { space: Space | null; pending: boolean; error: string; retryable: boolean };

export default function useOwnedSpace(id: string, authRequest: AuthRequest) {
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
        if (space.id.toLowerCase() !== id.toLowerCase()) throw new Error('Unexpected space');
        setState({ space, pending: false, error: '', retryable: false });
      } catch {
        if (!controller.signal.aborted) setState({ space: null, pending: false,
          error: 'No pudimos cargar tu espacio. Vuelve a intentarlo.', retryable: true });
      }
    }
    void load();
    return () => controller.abort();
  }, [id, authRequest, attempt]);

  function updateStatus(status: SpaceStatus) {
    setState((previous) => previous.space && previous.space.id.toLowerCase() === status.id.toLowerCase() ?
      { ...previous, space: { ...previous.space, is_active: status.is_active, is_withdrawn: status.is_withdrawn } } : previous);
  }

  return { ...state, updateStatus, retry: () => setAttempt((value) => value + 1) };
}
