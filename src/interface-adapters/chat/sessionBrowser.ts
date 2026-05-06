import {
  BROWSER_SESSION_STORAGE_KEY,
  BROWSER_TRANSCRIPT_CACHE_KEY,
} from "@/shared/config/sessionMemory";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIVE_STREAM_LOCK_KEY = "grounded-moves-active-stream-lock";
const ACTIVE_STREAM_LOCK_TTL_MS = 2 * 60 * 1000;

type StreamLockRecord = {
  sessionId: string;
  ownerId: string;
  acquiredAt: number;
};

function canUseBrowserStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function createSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function readBrowserSessionId(): string | null {
  if (!canUseBrowserStorage()) {
    return null;
  }

  const value = window.localStorage.getItem(BROWSER_SESSION_STORAGE_KEY);
  if (!value || !UUID_PATTERN.test(value)) {
    return null;
  }

  return value;
}

export function getOrCreateBrowserSessionId(): string {
  const existing = readBrowserSessionId();
  if (existing) {
    return existing;
  }

  const nextSessionId = createSessionId();
  if (canUseBrowserStorage()) {
    window.localStorage.setItem(BROWSER_SESSION_STORAGE_KEY, nextSessionId);
  }

  return nextSessionId;
}

export function clearBrowserSessionState(): void {
  if (!canUseBrowserStorage()) {
    return;
  }

  window.localStorage.removeItem(BROWSER_SESSION_STORAGE_KEY);
  window.localStorage.removeItem(BROWSER_TRANSCRIPT_CACHE_KEY);
}

export function replaceBrowserSessionId(): string {
  clearBrowserSessionState();
  return getOrCreateBrowserSessionId();
}

function readActiveStreamLock(): StreamLockRecord | null {
  if (!canUseBrowserStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(ACTIVE_STREAM_LOCK_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StreamLockRecord;
    if (
      typeof parsed.sessionId !== "string" ||
      typeof parsed.ownerId !== "string" ||
      typeof parsed.acquiredAt !== "number"
    ) {
      return null;
    }

    if (Date.now() - parsed.acquiredAt > ACTIVE_STREAM_LOCK_TTL_MS) {
      window.localStorage.removeItem(ACTIVE_STREAM_LOCK_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function tryAcquireSessionStreamLock(sessionId: string, ownerId: string): boolean {
  if (!canUseBrowserStorage()) {
    return true;
  }

  const current = readActiveStreamLock();
  if (current && current.sessionId === sessionId && current.ownerId !== ownerId) {
    return false;
  }

  const nextLock: StreamLockRecord = {
    sessionId,
    ownerId,
    acquiredAt: Date.now(),
  };
  window.localStorage.setItem(ACTIVE_STREAM_LOCK_KEY, JSON.stringify(nextLock));
  return true;
}

export function releaseSessionStreamLock(sessionId: string, ownerId: string): void {
  if (!canUseBrowserStorage()) {
    return;
  }

  const current = readActiveStreamLock();
  if (!current) {
    return;
  }

  if (current.sessionId === sessionId && current.ownerId === ownerId) {
    window.localStorage.removeItem(ACTIVE_STREAM_LOCK_KEY);
  }
}