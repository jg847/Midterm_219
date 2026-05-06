import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getOrCreateBrowserSessionId,
  clearBrowserSessionState,
  releaseSessionStreamLock,
  readBrowserSessionId,
  replaceBrowserSessionId,
  tryAcquireSessionStreamLock,
} from "@/interface-adapters/chat/sessionBrowser";
import {
  BROWSER_SESSION_STORAGE_KEY,
  BROWSER_TRANSCRIPT_CACHE_KEY,
} from "@/shared/config/sessionMemory";

function createStorage() {
  const store = new Map<string, string>();

  return {
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

describe("sessionBrowser", () => {
  const storage = createStorage();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("window", { localStorage: storage });
    vi.stubGlobal("crypto", { randomUUID: () => "11111111-1111-4111-8111-111111111111" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates and reuses one UUID-backed browser session", () => {
    const created = getOrCreateBrowserSessionId();
    const reused = getOrCreateBrowserSessionId();

    expect(created).toBe("11111111-1111-4111-8111-111111111111");
    expect(reused).toBe(created);
    expect(readBrowserSessionId()).toBe(created);
  });

  it("replaces corrupted session values with a new UUID", () => {
    storage.setItem(BROWSER_SESSION_STORAGE_KEY, "not-a-uuid");

    const created = getOrCreateBrowserSessionId();

    expect(created).toBe("11111111-1111-4111-8111-111111111111");
    expect(readBrowserSessionId()).toBe(created);
  });

  it("clears the session id and session-scoped cache on reset", () => {
    storage.setItem(BROWSER_SESSION_STORAGE_KEY, "11111111-1111-4111-8111-111111111111");
    storage.setItem(BROWSER_TRANSCRIPT_CACHE_KEY, "cached-transcript");

    clearBrowserSessionState();
    const replaced = replaceBrowserSessionId();

    expect(storage.getItem(BROWSER_TRANSCRIPT_CACHE_KEY)).toBeNull();
    expect(replaced).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("prevents a second tab from acquiring the same active stream lock", () => {
    expect(tryAcquireSessionStreamLock("session-1", "tab-1")).toBe(true);
    expect(tryAcquireSessionStreamLock("session-1", "tab-2")).toBe(false);

    releaseSessionStreamLock("session-1", "tab-1");

    expect(tryAcquireSessionStreamLock("session-1", "tab-2")).toBe(true);
  });
});