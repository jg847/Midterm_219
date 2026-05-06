"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { ConversationArtifact } from "@/application/ports/ConversationRepository";
import {
  hydrateChatSession,
  resetChatSession,
  sendChatMessage,
  streamChatMessage,
} from "@/interface-adapters/chat/chatApiClient";
import {
  clearBrowserSessionState,
  getOrCreateBrowserSessionId,
  releaseSessionStreamLock,
  readBrowserSessionId,
  replaceBrowserSessionId,
  tryAcquireSessionStreamLock,
} from "@/interface-adapters/chat/sessionBrowser";
import type {
  ChatResponsePayload,
  ChatStreamEvent,
  ChatToolResult,
  ChatTranscriptMessage,
} from "@/interface-adapters/chat/types";
import type { SavedLocationPreference } from "@/interface-adapters/location/types";
import { isStreamingChatEnabled } from "@/shared/config/chatRuntime";
import { isSessionMemoryEnabled } from "@/shared/config/sessionMemory";
import { ToolResultCards } from "./ToolResultCards";

type ChatRow = {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  artifacts?: ConversationArtifact[];
};

const QUICK_START_PROMPTS = [
  "Find entry-level jobs within 15 miles",
  "Show rentals under $1800 and whether they are affordable",
  "Compare job pay vs rent burden in this location",
];

const SAVED_SNIPPETS_KEY = "student-reality-saved-snippets";
const SESSION_MEMORY_ENABLED = isSessionMemoryEnabled();
const STREAMING_CHAT_ENABLED = isStreamingChatEnabled();

function toChatRows(messages: ChatTranscriptMessage[]): ChatRow[] {
  return messages
    .filter((message): message is ChatRow => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
      artifacts: message.artifacts,
    }));
}

function createAssistantArtifacts(payload: ChatResponsePayload): ConversationArtifact[] {
  return [
    ...(payload.citations.length > 0
      ? [{ type: "citation_list" as const, citations: payload.citations }]
      : []),
    ...(payload.toolResults.length > 0
      ? [
          {
            type: "trace_summary" as const,
            summary: payload.toolResults
              .map((result) => `${result.toolName}: ${result.ok ? "ok" : `error(${result.errorCode ?? "unknown"})`}`)
              .join("; "),
          },
          ...payload.toolResults.map((result) => ({
            type: "tool_result" as const,
            toolName: result.toolName,
            payload: result.payload,
            ok: result.ok,
            latencyMs: result.latencyMs,
            errorCode: result.errorCode,
          })),
        ]
      : []),
  ];
}

function createAssistantRowFromPayload(payload: ChatResponsePayload): ChatRow {
  return {
    role: "assistant",
    content: payload.answer,
    createdAt: new Date().toISOString(),
    artifacts: createAssistantArtifacts(payload),
  };
}

function getToolResultsForRow(row: ChatRow): ChatToolResult[] {
  return (row.artifacts ?? [])
    .filter((artifact): artifact is Extract<ConversationArtifact, { type: "tool_result" }> => artifact.type === "tool_result")
    .map((artifact) => ({
      toolName: artifact.toolName,
      ok: artifact.ok,
      latencyMs: artifact.latencyMs,
      payload: artifact.payload,
      errorCode: artifact.errorCode,
    }));
}

function getCitationsForRow(row: ChatRow): string[] {
  return (row.artifacts ?? [])
    .filter((artifact): artifact is Extract<ConversationArtifact, { type: "citation_list" }> => artifact.type === "citation_list")
    .flatMap((artifact) => artifact.citations);
}

function getAllCitations(rows: ChatRow[]): string[] {
  return rows.flatMap((row) => (row.role === "assistant" ? getCitationsForRow(row) : []));
}

function renderAssistantMarkdown(content: string) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ className, ...props }) => (
          <a
            {...props}
            className={[
              "underline decoration-[#17464d]/40 underline-offset-2 hover:decoration-[#17464d] break-all",
              className,
            ]
              .filter(Boolean)
              .join(" ")}
            target="_blank"
            rel="noreferrer"
          />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export function ChatAssistantPanel({ location, compact = false }: { location?: SavedLocationPreference | null; compact?: boolean }) {
  const [message, setMessage] = useState("");
  const [rows, setRows] = useState<ChatRow[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [hydrating, setHydrating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string>("");
  const [utilityMenuOpen, setUtilityMenuOpen] = useState(false);
  const [pendingAssistantText, setPendingAssistantText] = useState("");
  const [pendingToolStatuses, setPendingToolStatuses] = useState<string[]>([]);
  const [liveRegionMessage, setLiveRegionMessage] = useState("");
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const tabOwnerIdRef = useRef<string>(typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `tab-${Date.now()}`);
  const activeStreamSessionIdRef = useRef<string | null>(null);
  const [savedSnippets, setSavedSnippets] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];

    const raw = window.localStorage.getItem(SAVED_SNIPPETS_KEY);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw) as string[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const container = transcriptRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [rows, hydrating, loading, pendingAssistantText, pendingToolStatuses]);

  useEffect(() => {
    const ownerId = tabOwnerIdRef.current;

    return () => {
      const activeSessionId = activeStreamSessionIdRef.current;
      if (activeSessionId) {
        releaseSessionStreamLock(activeSessionId, ownerId);
      }
    };
  }, []);

  useEffect(() => {
    if (!SESSION_MEMORY_ENABLED) {
      return;
    }

    let cancelled = false;

    async function restoreSession() {
      const existingSessionId = getOrCreateBrowserSessionId();
      setSessionId(existingSessionId);
      setHydrating(true);

      const response = await hydrateChatSession(existingSessionId);
      if (cancelled) {
        return;
      }

      if (!response.ok) {
        setSessionNotice("Recent conversation could not be restored.");
        setHydrating(false);
        return;
      }

      if (response.payload.resetRecommended) {
        const nextSessionId = replaceBrowserSessionId();
        setSessionId(nextSessionId);
        setRows([]);
        setSessionNotice("Previous session expired. Started a new conversation.");
        setHydrating(false);
        return;
      }

      const restoredRows = toChatRows(response.payload.messages);
      setRows(restoredRows);
      if (restoredRows.length > 0) {
        setSessionNotice("Recent conversation restored.");
      }
      setHydrating(false);
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const latestAssistantRow = [...rows].reverse().find((row) => row.role === "assistant") ?? null;
  const latestAssistantToolResults = latestAssistantRow ? getToolResultsForRow(latestAssistantRow) : [];
  const allCitations = getAllCitations(rows);

  async function onSend(raw?: string) {
    const trimmed = (raw ?? message).trim();
    if (!trimmed) return;

    const activeSessionId = SESSION_MEMORY_ENABLED
      ? sessionId ?? getOrCreateBrowserSessionId()
      : "session-memory-disabled";
    const now = new Date().toISOString();
    if (STREAMING_CHAT_ENABLED && !tryAcquireSessionStreamLock(activeSessionId, tabOwnerIdRef.current)) {
      setError("Another tab is already streaming this conversation. Wait for it to finish or reset the chat.");
      setLoading(false);
      return;
    }

    setError(null);
    setLoading(true);
    setLastPrompt(trimmed);
    setSessionNotice(null);
    setPendingAssistantText("");
    setPendingToolStatuses([]);
    setLiveRegionMessage("Working on your request.");
    setSessionId(activeSessionId);
    setRows((prev) => [...prev, { role: "user", content: trimmed, createdAt: now }]);
    setMessage("");

    if (STREAMING_CHAT_ENABLED) {
      activeStreamSessionIdRef.current = activeSessionId;

      let finalPayload: ChatResponsePayload | null = null;
      let streamFailed = false;

      try {
        for await (const event of streamChatMessage({
          sessionId: activeSessionId,
          message: trimmed,
          location: location
            ? {
                formatted: location.formatted,
                city: location.city,
                state: location.state,
                country: location.country,
                postalCode: location.postalCode,
                radiusMiles: location.radiusMiles,
              }
            : undefined,
        })) {
          handleStreamEvent(event, {
            onToolStatus(messageText) {
              setPendingToolStatuses((prev) => {
                const next = [...prev, messageText];
                return next.slice(-4);
              });
              setLiveRegionMessage(messageText);
            },
            onAssistantDelta(delta) {
              setPendingAssistantText((prev) => `${prev}${delta}`);
              setLiveRegionMessage(delta.trim() ? `Assistant update: ${delta.trim()}` : "Assistant update received.");
            },
            onClarification(question) {
              setPendingAssistantText(question);
              setLiveRegionMessage(question);
            },
            onFinalPayload(payload) {
              finalPayload = payload;
              setRows((prev) => [...prev, createAssistantRowFromPayload(payload)]);
              setPendingAssistantText("");
              setPendingToolStatuses([]);
              setLiveRegionMessage("Assistant response completed.");
            },
            onError(messageText) {
              streamFailed = true;
              setError(messageText);
              setPendingAssistantText("");
              setPendingToolStatuses([]);
              setLiveRegionMessage(messageText);
            },
          });
        }

        if (!streamFailed && !finalPayload) {
          setError("The response stream ended before a final answer was committed.");
        }
      } finally {
        releaseSessionStreamLock(activeSessionId, tabOwnerIdRef.current);
        activeStreamSessionIdRef.current = null;
        setLoading(false);
      }

      return;
    }

    const response = await sendChatMessage({
      sessionId: activeSessionId,
      message: trimmed,
      location: location
        ? {
            formatted: location.formatted,
            city: location.city,
            state: location.state,
            country: location.country,
            postalCode: location.postalCode,
            radiusMiles: location.radiusMiles,
          }
        : undefined,
    });

    if (!response.ok) {
      setError(response.error);
      setLoading(false);
      return;
    }

    setRows((prev) => [
      ...prev,
      createAssistantRowFromPayload(response.payload),
    ]);
    setLoading(false);
  }

  function handleStreamEvent(
    event: ChatStreamEvent,
    handlers: {
      onToolStatus: (messageText: string) => void;
      onAssistantDelta: (delta: string) => void;
      onClarification: (question: string) => void;
      onFinalPayload: (payload: ChatResponsePayload) => void;
      onError: (messageText: string) => void;
    },
  ) {
    switch (event.type) {
      case "stream_started":
        return;
      case "tool_status":
        handlers.onToolStatus(event.message);
        return;
      case "assistant_delta":
        handlers.onAssistantDelta(event.delta);
        return;
      case "clarification_prompt":
        handlers.onClarification(event.question);
        return;
      case "final_payload":
        handlers.onFinalPayload(event.payload);
        return;
      case "stream_error":
        handlers.onError(event.message);
        return;
      case "stream_completed":
        return;
    }
  }

  async function onResetConversation() {
    setError(null);

    if (!SESSION_MEMORY_ENABLED) {
      setRows([]);
      setMessage("");
      setLastPrompt("");
      setSessionNotice("Conversation reset.");
      return;
    }

    setResetting(true);
    const currentSessionId = sessionId ?? readBrowserSessionId();
    if (currentSessionId) {
      const response = await resetChatSession(currentSessionId);
      if (!response.ok) {
        setError(response.error);
        setResetting(false);
        return;
      }
    }

    clearBrowserSessionState();
    const nextSessionId = replaceBrowserSessionId();
    setRows([]);
    setMessage("");
    setLastPrompt("");
    setSessionId(nextSessionId);
    setSessionNotice("Conversation reset.");
    setResetting(false);
  }

  function formatTime(iso: string): string {
    const value = new Date(iso);
    return value.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function saveLatestAssistantSnippet() {
    const latest = [...rows].reverse().find((row) => row.role === "assistant")?.content;
    if (!latest) return;

    const next = [latest, ...savedSnippets].slice(0, 8);
    setSavedSnippets(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SAVED_SNIPPETS_KEY, JSON.stringify(next));
    }
  }

  function exportConversationSummary() {
    const transcript = rows.map((row) => `${row.role.toUpperCase()}: ${row.content}`).join("\n\n");
    const sources = allCitations.length ? allCitations.join("\n") : "No citations";
    const content = [`Conversation Summary`, "", transcript, "", "Sources", sources].join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "grounded-moves-summary.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section
      className="flex flex-col rounded-[2rem] border border-[#d9d2c3] bg-[linear-gradient(180deg,#fffdf8_0%,#f7f3ea_100%)] p-3 shadow-sm sm:p-4"
      aria-label="Chat assistant panel"
    >
      {!compact ? (
      <div className="order-2 mt-5 hidden rounded-[1.75rem] border border-[#ded7c9] bg-[linear-gradient(135deg,#fffef9_0%,#f1ecdf_100%)] p-4 md:block lg:order-1 lg:mt-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white shadow-sm">
                GM
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Grounded Moves Assistant
                </p>
                <h2 className="text-2xl font-semibold text-slate-900">Plan around reality</h2>
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Use the assistant like a grounded planning desk. Ask about jobs, rent, or whether a move is financially realistic in your selected U.S. market, and it will turn the answer into structured cards.
            </p>
          </div>
          <details
            className="relative"
            open={utilityMenuOpen}
            onToggle={(event) => setUtilityMenuOpen(event.currentTarget.open)}
          >
            <summary className="list-none cursor-pointer rounded-full border border-[#d5cfbf] bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm marker:content-none">
              More
            </summary>
            <div className="absolute right-0 top-11 z-10 w-52 rounded-2xl border border-[#d5cfbf] bg-white p-2 shadow-lg">
              <button
                onClick={() => {
                  saveLatestAssistantSnippet();
                  setUtilityMenuOpen(false);
                }}
                className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                Save latest snippet
              </button>
              <button
                onClick={() => {
                  exportConversationSummary();
                  setUtilityMenuOpen(false);
                }}
                className="mt-1 flex w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                Export summary
              </button>
            </div>
          </details>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Assistant capabilities">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-emerald-700">
            Jobs
          </span>
          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-sky-700">
            Housing
          </span>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-amber-700">
            Budget fit
          </span>
        </div>
        {location ? (
          <p className="mt-3 text-xs text-slate-500">
            Active context: {location.formatted} ({location.radiusMiles} mi radius)
          </p>
        ) : null}
        <p className="mt-1 text-xs text-slate-500">
          Safety note: verify listings and pay details before making financial commitments.
        </p>
      </div>
      ) : null}

      <div className="order-1 rounded-[1.75rem] border border-[#d5cfbf] bg-white shadow-sm lg:order-2 lg:mt-5">
        <div className="border-b border-[#ddd5c7] bg-[#fffdf8]/95 p-3 sm:p-4">
          {!location ? (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              No location anchor yet. You can still ask questions, but answers will be less specific until you set a city or ZIP code.
            </div>
          ) : null}
          {sessionNotice ? (
            <div className="mb-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
              {sessionNotice}
            </div>
          ) : null}
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="min-w-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {SESSION_MEMORY_ENABLED ? "Browser session memory enabled" : "Session memory disabled"}
            </p>
            <button
              onClick={() => void onResetConversation()}
              disabled={loading || hydrating || resetting}
              className="shrink-0 rounded-full border border-[#d5cfbf] bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm disabled:opacity-60"
            >
              Reset chat
            </button>
          </div>
          <div className="flex gap-2">
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void onSend();
              }}
              disabled={hydrating || resetting}
              className="min-w-0 flex-1 rounded-2xl border border-[#d5cfbf] bg-white px-4 py-3 text-sm outline-none ring-[#d5cfbf] focus:ring-2 disabled:opacity-60"
              placeholder="Ask about salaries, rent, or whether a plan is realistic"
              aria-label="Chat message"
            />
            <button
              onClick={() => void onSend()}
              disabled={loading || hydrating || resetting}
              className="rounded-2xl bg-[#17464d] px-5 py-3 text-sm font-medium text-white shadow-sm disabled:opacity-60"
            >
              {loading ? "Sending..." : hydrating ? "Restoring..." : resetting ? "Resetting..." : "Send"}
            </button>
          </div>
          <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
            Press Enter to send a focused question.
          </p>
          {error ? (
            <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <p>{error}</p>
              {lastPrompt ? (
                <button
                  onClick={() => void onSend(lastPrompt)}
                  className="mt-2 rounded bg-rose-700 px-2 py-1 text-xs font-medium text-white"
                >
                  Retry last request
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="border-b border-[#ddd5c7] px-3 py-2 sm:px-4 sm:py-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Quick starts
          </p>
          <div className="grid gap-2 md:grid-cols-3" aria-label="Quick start prompts">
            {QUICK_START_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => void onSend(prompt)}
                disabled={loading}
                className="rounded-2xl border border-[#d5cfbf] bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-[#f7f1e5] disabled:opacity-60"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div ref={transcriptRef} className="min-h-[28rem] max-h-[60vh] overflow-y-auto p-3 sm:max-h-[65vh] sm:p-4">
        <div className="sr-only" aria-live="polite" aria-atomic="false">
          {liveRegionMessage}
        </div>
        {hydrating ? (
          <div className="space-y-4 chat-surface-enter">
            <div className="mr-auto max-w-[82%]">
              <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">Assistant · restoring</p>
              <div className="chat-prose prose prose-sm max-w-none break-words [overflow-wrap:anywhere] rounded-2xl rounded-tl-md border border-[#ddd5c7] bg-[#fffdf7] px-4 py-3 text-sm leading-6 text-slate-800 shadow-sm">
                Restoring your recent conversation...
              </div>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="space-y-4 chat-surface-enter">
            <div className="mr-auto max-w-[82%]">
              <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">Assistant · ready</p>
              <div className="chat-prose prose prose-sm max-w-none break-words [overflow-wrap:anywhere] rounded-2xl rounded-tl-md border border-[#ddd5c7] bg-[#fffdf7] px-4 py-3 text-sm leading-6 text-slate-800 shadow-sm">
                I can turn location-aware job, rental, and affordability data into cleaner decisions. Ask for rentals, salaries, or a direct comparison and I will organize the results into cards.
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-[#d6cebd] bg-[#fffef9] p-4 text-sm text-slate-500">
              Start with a prompt like &quot;Find entry-level jobs near Phoenix&quot; or use one of the suggestions above.
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((row, index) => (
              <li
                key={`${row.role}-${index}`}
                className={
                  row.role === "user"
                    ? "ml-auto max-w-[78%]"
                    : "mr-auto w-full chat-surface-enter"
                }
              >
                <div className={row.role === "assistant" ? "max-w-[78%]" : undefined}>
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">
                    {row.role === "user" ? "You" : "Assistant"} · {formatTime(row.createdAt)}
                  </p>
                  <div
                    className={
                      row.role === "user"
                        ? "break-words [overflow-wrap:anywhere] rounded-2xl rounded-tr-md bg-[#17464d] px-4 py-3 text-sm leading-6 text-white shadow-sm"
                        : "chat-prose prose prose-sm max-w-none break-words [overflow-wrap:anywhere] rounded-2xl rounded-tl-md border border-[#ddd5c7] bg-[#fffdf8] px-4 py-3 text-sm leading-6 text-slate-800 shadow-sm"
                    }
                  >
                      {row.role === "assistant" ? renderAssistantMarkdown(row.content) : row.content}
                  </div>
                </div>
                  {row.role === "assistant" && getToolResultsForRow(row).length > 0 ? (
                  <div className="chat-surface-enter mt-3 rounded-[1.5rem] border border-[#ddd5c7] bg-[linear-gradient(180deg,#fffdf8_0%,#f5efe2_100%)] p-4">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Recommended Results
                    </p>
                      <ToolResultCards toolResults={getToolResultsForRow(row)} mode="digest" />
                  </div>
                ) : null}
              </li>
            ))}
            {loading ? (
              <li className="chat-surface-enter mr-auto max-w-[78%]">
                <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">Assistant · typing</p>
                <div className="chat-prose prose prose-sm max-w-none break-words [overflow-wrap:anywhere] rounded-2xl rounded-tl-md border border-[#ddd5c7] bg-[#fffdf8] px-4 py-3 text-sm text-slate-500 shadow-sm">
                  {renderAssistantMarkdown(pendingAssistantText || "Working on that...")}
                  {pendingToolStatuses.length > 0 ? (
                    <ul className="mt-3 space-y-2 border-t border-[#e6dece] pt-3 text-xs text-slate-500">
                      {pendingToolStatuses.map((status, index) => (
                        <li key={`${status}-${index}`}>{status}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </li>
            ) : null}
          </ul>
        )}
        </div>
      </div>

      {!compact ? (
        <>
          <details className="mt-4 rounded-2xl border border-[#ddd5c7] bg-[#faf7ef] p-3">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-600">
              Technical Details
            </summary>
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Structured Tool Results</p>
              {latestAssistantToolResults.length === 0 ? (
                <p className="mt-1 text-xs text-slate-500">No structured tool results returned yet.</p>
              ) : (
                <ToolResultCards toolResults={latestAssistantToolResults} mode="all" />
              )}
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sources</p>
              {allCitations.length === 0 ? (
                <p className="mt-1 text-xs text-slate-500">No citations returned yet.</p>
              ) : (
                <ul className="mt-2 grid gap-1">
                  {allCitations.map((citation, index) => (
                    <li key={`${citation}-${index}`} className="text-xs text-slate-700">
                      {citation}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </details>

          <details className="mt-3 rounded-2xl border border-[#ddd5c7] bg-[#faf7ef] p-3">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-600">
              Saved Snippets {savedSnippets.length > 0 ? `(${savedSnippets.length})` : ""}
            </summary>
            {savedSnippets.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500">No saved snippets yet.</p>
            ) : (
              <ul className="mt-3 grid gap-1">
                {savedSnippets.map((snippet, index) => (
                  <li key={`${snippet.slice(0, 16)}-${index}`} className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">
                    {snippet}
                  </li>
                ))}
              </ul>
            )}
          </details>
        </>
      ) : null}
    </section>
  );
}
