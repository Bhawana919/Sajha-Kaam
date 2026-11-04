// HTTP client with the session token and one automatic refresh on 401.
// EXPO_PUBLIC_API_URL points at the backend (default: http://localhost:8000 for the browser).
import { create } from 'zustand';

import { useSession } from '@/state/session';

import { ApiError } from './errors';

export { ApiError };

// "same-origin": the hosted web app, served by the API itself on the same address.
const configured = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
const sameOrigin = configured === 'same-origin' && typeof window !== 'undefined' && !!window.location;
const API_URL = (sameOrigin ? window.location.origin : configured).replace(/\/$/, '');
export const PUBLIC_BASE = API_URL;

/** A work link to open: links on our own server (like the demo website) are stored as "/path". */
export function workUrl(link: string): string {
  return link.startsWith('/') ? `${PUBLIC_BASE}${link}` : link;
}
const TIMEOUT_MS = 15000;

// ---------- waking a sleeping server ----------
// The free hosting plan puts the server to sleep after 15 minutes without visitors; the first visit
// then takes about a minute. Instead of failing, the app waits (up to 90 s), says so in a banner, and
// retries once the server answers.
const WAKE_MAX_MS = 90000;
const WAKE_POLL_MS = 4000;

/** Whether the app is waiting for the server to wake up (the banner reads it). */
export const useWaking = create<{ waking: boolean }>(() => ({ waking: false }));
let waking: Promise<boolean> | null = null;

async function ping(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    return (await fetch(`${API_URL}/health`, { signal: controller.signal })).ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Ask the server to wake as soon as the app opens, so it is usually up by the first tap. */
export function wakeServer(): void {
  void ping();
}

/** Wait until the server answers again (true), or give up after WAKE_MAX_MS (false). Shared by all calls. */
function waitForServer(): Promise<boolean> {
  waking ??= (async () => {
    useWaking.setState({ waking: true });
    const until = Date.now() + WAKE_MAX_MS;
    try {
      while (Date.now() < until) {
        if (await ping()) return true;
        await new Promise((r) => setTimeout(r, WAKE_POLL_MS));
      }
      return false;
    } finally {
      useWaking.setState({ waking: false });
      waking = null;
    }
  })();
  return waking;
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Read the server's `detail` (string code, message, or object such as Leak Guard findings). */
export function errorDetail(e: unknown): unknown {
  return e instanceof ApiError ? e.detail : null;
}

let refreshing: Promise<boolean> | null = null;

async function refresh(): Promise<boolean> {
  const tokens = useSession.getState().tokens;
  if (!tokens) return false;
  try {
    const res = await fetch(`${API_URL}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: tokens.refresh_token }),
    });
    if (!res.ok) {
      await useSession.getState().clear();
      return false;
    }
    await useSession.getState().save(await res.json());
    return true;
  } catch {
    return false;
  }
}

export async function api<T>(
  path: string,
  init: { method?: Method; body?: unknown; idempotencyKey?: string; auth?: boolean } = {},
): Promise<T> {
  const method = init.method ?? 'GET';

  const send = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const token = useSession.getState().tokens?.access_token;
    try {
      return await fetch(`${API_URL}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token && init.auth !== false ? { Authorization: `Bearer ${token}` } : {}),
          ...(init.idempotencyKey ? { 'Idempotency-Key': init.idempotencyKey } : {}),
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: controller.signal,
      });
    } catch {
      throw new ApiError('network', 0, 'network');
    } finally {
      clearTimeout(timer);
    }
  };

  let res: Response;
  try {
    res = await send();
  } catch (e) {
    // No answer at all: the server may be asleep. Wait for it to wake, then try this call once more.
    if (!(e instanceof ApiError) || e.kind !== 'network' || !(await waitForServer())) throw e;
    res = await send();
  }
  if (res.status === 401 && useSession.getState().tokens && init.auth !== false) {
    refreshing ??= refresh().finally(() => (refreshing = null));
    if (await refreshing) res = await send();
  }
  if (!res.ok) {
    let detail: unknown = res.statusText;
    try {
      detail = ((await res.json()) as { detail?: unknown }).detail ?? detail;
    } catch {
      // keep statusText
    }
    throw new ApiError('http', res.status, detail);
  }
  return (await res.json()) as T;
}

/** A fresh key per user action, so a double tap or a retry never applies twice. */
export function newIdempotencyKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
