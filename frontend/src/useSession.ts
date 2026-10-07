import { useCallback, useEffect, useRef, useState } from 'react';

export type PrivateView = 'mis-espacios' | 'mis-reservas' | 'administracion';
export type SessionRoute = { view: PrivateView | null; revision: number };
export type Account = { id: string; name: string; email: string; is_admin: boolean };
type StoredSession = { access_token: string; expires_at: string };
type SessionState = {
  status: 'guest' | 'checking' | 'authenticated' | 'offline';
  user: Account | null;
  expiresAt: string | null;
  message: string;
  approvedRevision: number | null;
  forbidden: boolean;
};

const storageKey = 'rentsmart.session';
const expiredMessage = 'Tu sesión venció. Inicia sesión nuevamente.';
const networkMessage = 'No pudimos comprobar tu sesión. Vuelve a intentarlo.';

function readSession(): StoredSession | null {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null');
    if (typeof value !== 'object' || value === null ||
      !('access_token' in value) || typeof value.access_token !== 'string' || !value.access_token ||
      !('expires_at' in value) || typeof value.expires_at !== 'string' ||
      !Number.isFinite(Date.parse(value.expires_at))) return null;
    return { access_token: value.access_token, expires_at: value.expires_at };
  } catch {
    return null;
  }
}

function storeSession(value: StoredSession | null) {
  try {
    if (value) sessionStorage.setItem(storageKey, JSON.stringify(value));
    else sessionStorage.removeItem(storageKey);
  } catch {
    // The active session can still be used when browser storage is unavailable.
  }
}

function accountFrom(value: unknown): Account {
  if (typeof value !== 'object' || value === null ||
    !('id' in value) || typeof value.id !== 'string' ||
    !('name' in value) || typeof value.name !== 'string' ||
    !('email' in value) || typeof value.email !== 'string' ||
    !('is_admin' in value) || typeof value.is_admin !== 'boolean') {
    throw new Error('Invalid account response');
  }
  return { id: value.id, name: value.name, email: value.email, is_admin: value.is_admin };
}

export default function useSession(route: SessionRoute) {
  const session = useRef<StoredSession | null>(readSession());
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const initialized = useRef(false);
  const [state, setState] = useState<SessionState>(() => ({
    status: session.current ? 'checking' : 'guest', user: null,
    expiresAt: session.current?.expires_at ?? null, message: '',
    approvedRevision: null, forbidden: false,
  }));

  const cancelRequest = useCallback(() => {
    generation.current += 1;
    request.current?.abort();
    request.current = null;
  }, []);

  const endSession = useCallback((message: string) => {
    cancelRequest();
    session.current = null;
    storeSession(null);
    setState({ status: 'guest', user: null, expiresAt: null, message,
      approvedRevision: null, forbidden: false });
  }, [cancelRequest]);

  const startRequest = useCallback(() => {
    cancelRequest();
    const controller = new AbortController();
    request.current = controller;
    const currentGeneration = generation.current;
    return { controller, isCurrent: () => !controller.signal.aborted &&
      generation.current === currentGeneration };
  }, [cancelRequest]);

  const verify = useCallback(async (view: PrivateView | null, revision: number) => {
    const saved = session.current;
    if (!saved) {
      endSession('Inicia sesión para continuar.');
      return;
    }
    if (Date.parse(saved.expires_at) <= Date.now()) {
      endSession(expiredMessage);
      return;
    }
    const active = startRequest();
    setState({ status: 'checking', user: null, expiresAt: saved.expires_at,
      message: '', approvedRevision: null, forbidden: false });
    const options = { headers: { Authorization: `Bearer ${saved.access_token}` },
      signal: active.controller.signal };
    try {
      const response = await fetch('/api/auth/me', options);
      if (!active.isCurrent()) return;
      if (response.status === 401) {
        endSession(expiredMessage);
        return;
      }
      if (!response.ok) throw new Error('Session unavailable');
      let user = accountFrom(await response.json());
      let forbidden = false;
      if (view === 'administracion') {
        const access = await fetch('/api/auth/admin-access', options);
        if (!active.isCurrent()) return;
        if (access.status === 401) {
          endSession(expiredMessage);
          return;
        }
        if (access.status === 403) {
          forbidden = true;
          user = { ...user, is_admin: false };
        } else {
          if (!access.ok) throw new Error('Access unavailable');
          user = accountFrom(await access.json());
        }
      }
      if (!active.isCurrent()) return;
      if (Date.parse(saved.expires_at) <= Date.now()) {
        endSession(expiredMessage);
        return;
      }
      setState({ status: 'authenticated', user, expiresAt: saved.expires_at,
        message: '', approvedRevision: revision, forbidden });
    } catch {
      if (!active.isCurrent()) return;
      setState({ status: 'offline', user: null, expiresAt: saved.expires_at,
        message: networkMessage, approvedRevision: null, forbidden: false });
    }
  }, [endSession, startRequest]);

  useEffect(() => {
    const firstVisit = !initialized.current;
    initialized.current = true;
    if (session.current) {
      storeSession(session.current);
      void verify(route.view, route.revision);
    } else if (firstVisit) {
      storeSession(null);
    } else if (!firstVisit) {
      cancelRequest();
    }
  }, [route.view, route.revision, verify, cancelRequest]);

  useEffect(() => {
    if (!state.expiresAt) return;
    let timer: ReturnType<typeof setTimeout>;
    const expires = Date.parse(state.expiresAt);
    function schedule() {
      const remaining = expires - Date.now();
      if (remaining <= 0) endSession(expiredMessage);
      else timer = setTimeout(schedule, Math.min(remaining, 2_147_483_647));
    }
    schedule();
    return () => clearTimeout(timer);
  }, [state.expiresAt, endSession]);

  useEffect(() => () => cancelRequest(), [cancelRequest]);

  async function login(email: string, password: string): Promise<string | null | undefined> {
    const active = startRequest();
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
        signal: active.controller.signal,
      });
      if (!active.isCurrent()) return undefined;
      if (response.status === 401) return 'Correo o contraseña incorrectos.';
      if (!response.ok) return 'No pudimos iniciar sesión. Vuelve a intentarlo.';
      const result: unknown = await response.json();
      if (typeof result !== 'object' || result === null ||
        !('access_token' in result) || typeof result.access_token !== 'string' || !result.access_token ||
        !('token_type' in result) || result.token_type !== 'bearer' ||
        !('expires_at' in result) || typeof result.expires_at !== 'string' ||
        !Number.isFinite(Date.parse(result.expires_at)) || !('user' in result)) {
        throw new Error('Invalid login response');
      }
      const user = accountFrom(result.user);
      if (!active.isCurrent()) return undefined;
      if (Date.parse(result.expires_at) <= Date.now()) return expiredMessage;
      const saved = { access_token: result.access_token, expires_at: result.expires_at };
      session.current = saved;
      storeSession(saved);
      setState({ status: 'authenticated', user, expiresAt: saved.expires_at,
        message: '', approvedRevision: null, forbidden: false });
      return null;
    } catch {
      return active.isCurrent() ? 'No pudimos conectar con el servicio. Vuelve a intentarlo.' : undefined;
    }
  }

  return { ...state, login, logout: () => endSession('Cerraste tu sesión.'),
    retry: () => verify(route.view, route.revision) };
}
