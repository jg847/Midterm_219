# Spec 02: Conversation Memory and Browser Sessions

## Context & Motivation
Grounded Moves now presents chat as the primary product surface, but the current assistant still behaves like a stateless request launcher. The server writes transcript messages into `InMemoryConversationRepository` after each answer, yet it never feeds those prior turns back into model composition. At the same time, the client still sends a shared hardcoded session identifier, which means browser sessions are not actually distinct and the current in-process store cannot survive serverless cold starts or horizontal scaling.

This spec fixes that gap by making conversation memory real, durable, and browser-scoped. It introduces per-browser session identity, durable transcript persistence, model input that includes prior conversation turns, and an explicit user reset control. The goal is to make the current chat runtime remember context honestly without widening scope into native tool use, streaming transport, or budget-state orchestration.

This spec also covers the session-storage portion of the hardening work already called out in the pivot plan. The remaining serverless-safe state concerns outside conversation sessions stay deferred to later hardening tracks.

## User Stories
1. As a returning user in the same browser, I want the assistant to remember the recent conversation so that I do not need to restate context every turn.
2. As a user who refreshes the page mid-conversation, I want the transcript and session to survive so that I can continue where I left off.
3. As a user opening the app in another browser or private window, I want a separate session so that my planning context does not leak across browser contexts.
4. As a privacy-conscious user, I want a clear reset control so that I can discard the current conversation and start over immediately.
5. As a user returning after time away, I want session retention to be predictable so that I understand how long my conversation persists.
6. As an engineer shipping later specs, I want session history represented in a structure that can evolve into Anthropic message-based chat and native tool use without another persistence redesign.
7. As an operator, I want durable conversation storage that survives serverless cold starts and horizontal scaling so that production behavior does not depend on in-process memory.

## Functional Requirements
1. Every browser using Grounded Moves must have a generated session identifier that is unique per browser storage context rather than globally shared across all users.
2. The browser session identifier must be generated on first use, persisted locally, and sent with every chat request after creation.
3. Session identity must remain stable across page refreshes, route changes, and browser restarts until the user resets it or the stored identifier is removed.
4. The chat runtime must persist conversation history in durable storage that survives serverless cold starts and horizontal scaling.
5. Redis-backed persistence via the existing Upstash environment must be the production conversation-store implementation for this spec.
6. `InMemoryConversationRepository` must remain available as the dev and test implementation behind the same `ConversationRepository` port.
7. Every model composition call in the current chat runtime must include prior session conversation turns rather than only the current message and current tool payloads.
8. The conversation history passed to the model must preserve message order and role attribution for at least user and assistant turns.
9. Every model composition call in this spec must receive session history as an ordered `messages: [...]` collection in the Anthropic-style message format rather than as a one-off flattened prompt string.
10. The current chat response flow must continue working with the existing regex intent classification, tool selection, and non-streaming response path during this spec.
11. On a user’s first message in a new browser session, the system must create a new durable conversation record before or during normal chat handling without requiring a dedicated setup route.
12. Subsequent turns in the same browser session must append new user and assistant messages to the same durable conversation record.
13. A page refresh during an active session must restore enough transcript state for the user to continue in the same session without creating a second session identifier.
14. The client must display prior conversation turns for the active session on load or hydration rather than always starting from an empty visible transcript.
15. Transcript hydration must restore assistant-message-associated presentation artifacts needed to make prior turns understandable after refresh, including any persisted citations, trace summaries, and tool-result cards that are still part of the current UI contract.
16. The hydrated transcript payload must associate persisted assistant artifacts with the assistant message that produced them rather than returning them only as session-level loose metadata.
17. The reset control for this spec clears only conversation-session state and session-scoped transcript cache; it must not clear separately managed location context or saved snippets.
18. When a session contains more history than can fit safely in the current model input budget, the runtime must apply deterministic truncation that keeps the system prompt, the newest complete user/assistant turn pairs, and the current user turn, while dropping oldest prior turns first.
19. Deterministic truncation in this spec must preserve any persisted assistant artifacts that belong to retained assistant messages and drop artifacts for truncated turns together with their owning messages.
20. The UI must provide an explicit reset control that clears the active browser session identifier, clears the visible transcript for that session in the client, and causes the next sent message to start a new session.
21. The reset flow must also clear any locally persisted session-scoped conversation cache created by this spec.
22. Session retention for durable conversation storage must be 30 days from last activity, after which the session may expire automatically.
23. If a session has expired or is missing from durable storage but the browser still holds a stale session identifier, the next message must recover gracefully by creating a new empty server-side session rather than failing.
24. If locally persisted session data is corrupted or unreadable, the client must recover by discarding the corrupted value and creating a clean session.
25. The session implementation must not require users to authenticate for this spec.
26. The spec implementation must not persist raw GPS histories or expand location retention beyond the existing coarse location context already used by the product.
27. The implementation must not yet add budget-profile persistence, tool-call replay loops, or streamed transcript events.
28. Existing chat telemetry must continue working, and this spec must add enough session lifecycle telemetry to diagnose creation, load, reset, expiration recovery, and persistence failures.
29. The implementation must preserve existing route contracts unless a localized chat/session bootstrap endpoint or transcript-load endpoint is required for session hydration.

## Non-Functional Requirements

### Performance
1. Session bootstrap on first load must not block the home page shell from rendering.
2. Transcript hydration for an existing session must complete quickly enough that the user sees either restored messages or a clear loading state without confusing transcript flicker.
3. The additional history sent to the model in this spec must stay within current model token limits for the existing non-tool-use runtime, with explicit truncation rules that drop oldest complete turns first if the session exceeds safe prompt size.
4. The session reset action must complete without requiring a full page reload.
5. Redis-backed conversation persistence must not materially degrade current chat request latency beyond the normal cost of one session read and one session write per turn.

### Accessibility
1. Any new reset or restore controls must meet WCAG 2.1 AA expectations for keyboard access, visible focus, accessible naming, and announcement of state changes.
2. Transcript hydration must not create inaccessible focus jumps or trap keyboard users during page load.
3. If a restoring-session loading state is shown, it must be screen-reader compatible and clearly describe what is happening.

### Privacy
1. Conversation retention for this spec must be limited to 30 days from last activity.
2. The spec must store only the minimum conversation data needed to preserve transcript continuity, traces, and later chat-runtime evolution.
3. This spec must not persist raw geolocation history or exact coordinate history by default.
4. The UI must explain how to reset the active session and what that reset does.

### Security
1. Redis credentials and storage access must remain server-side only.
2. Session identifiers must be treated as opaque identifiers and must not encode user meaning, location meaning, or provider secrets.
3. Session reset and transcript retrieval must not expose another browser’s session history through predictable identifiers or insecure client-side trust.
4. The implementation must preserve current route-level abuse controls and must not weaken chat rate limiting.

### Observability
1. The system must emit telemetry for session created, session loaded, session reset, session expired or recovered, conversation read failure, and conversation write failure.
2. Session lifecycle telemetry must be visible through local console behavior in development and production telemetry wiring when configured.
3. Operational errors in Redis-backed persistence must be diagnosable without logging full conversation contents.

## Out of Scope
1. Native Anthropic tool-use orchestration.
2. Streaming responses or token-level transcript updates.
3. Budget-profile persistence across turns.
4. Tool-result persistence redesign or typed tool-result rendering.
5. Newark fallback removal from tool orchestration.
6. Authentication, named accounts, or cross-device synced user profiles.
7. Deletion workflows beyond user-initiated reset of the active browser session.
8. Migration of `guardedFetch`, `ApiRateLimiter`, or other non-conversation in-process state to Redis.

## Architecture Notes
The local hypothesis for this spec is direct: the controlling bug is not that sessions are never written, but that the runtime never loads prior turns into model composition and the client never uses a browser-specific session identity. A cheap disconfirming check was reading `src/application/chat/AnswerChatQuestion.ts`, `src/application/chat/ComposeGroundedResponse.ts`, `src/components/ChatAssistantPanel.tsx`, and `src/frameworks/repositories/conversation/InMemoryConversationRepository.ts`; that confirmed all of the following at once:

- the server writes transcripts after each answer;
- model composition still only sees the current message and tool results;
- the browser sends a shared hardcoded `sessionId`;
- persistence currently depends on an in-process `Map`.

### Current Owning Surfaces
- `src/components/ChatAssistantPanel.tsx` currently owns the hardcoded session identifier and visible transcript state.
- `src/interface-adapters/chat/chatApiClient.ts` currently transports chat payloads without browser-session bootstrap behavior.
- `src/application/chat/AnswerChatQuestion.ts` currently persists transcript state after answering.
- `src/application/chat/ComposeGroundedResponse.ts` currently ignores prior session history during model composition.
- `src/application/ports/ConversationRepository.ts` currently provides the persistence seam.
- `src/frameworks/repositories/conversation/InMemoryConversationRepository.ts` currently provides the only implementation.

### Proposed Implementation Shape
1. Introduce a browser-session helper in the interface-adapter layer that generates, reads, writes, and resets an opaque session UUID in local storage.
2. Move chat transcript hydration for the active session behind a route-facing adapter or localized transcript endpoint rather than embedding persistence logic directly in the component.
3. Add a Redis-backed `ConversationRepository` adapter and environment-based factory selection so production uses durable storage while tests and local dev can continue using in-memory storage where appropriate.
4. Evolve the model input contract from a single user string to an Anthropic-style `messages: [...]` payload containing system instructions, ordered prior messages, the current user turn, and the current tool summary.
5. Keep the current regex/tool-selection orchestration intact for this spec while changing only how session identity, transcript persistence, and model history input work.
6. Add an explicit UI reset action in the chat shell that clears the active browser session and restarts transcript state.

### Ports and Adapters
- `ConversationRepository` remains the core port and gains the semantics needed for durable session load, save, and delete or reset.
- a new browser-session storage adapter is expected in the interface-adapter layer for session UUID lifecycle management.
- a `RedisConversationRepository` or equivalently named production adapter should be added under `src/frameworks/repositories/conversation/`.
- a repository factory or environment-based constructor should choose Redis in production-like environments and in-memory in test or local fallback modes.
- `ModelClient` should accept an ordered message collection for this spec so the same shape can expand into the later tool-use spec without another history-contract rewrite.

### SOLID Emphasis
- Single Responsibility: browser session storage, transcript persistence, transcript hydration, and transcript rendering should not remain fused inside `ChatAssistantPanel`.
- Open/Closed: adding Redis-backed persistence should be additive through the existing repository port rather than rewriting application-layer orchestration around framework code.
- Liskov Substitution: Redis-backed and in-memory conversation repositories must be interchangeable in tests and application wiring.
- Interface Segregation: session-id storage in the browser should not leak into application-layer repository contracts.
- Dependency Inversion: application chat use cases must continue depending on `ConversationRepository` and `ModelClient` ports, not on Redis clients or browser storage directly.

### Pattern Fit
- Adapter: Redis-backed conversation persistence and browser-session local storage handling are explicit adapters.
- Factory Method: environment-based repository construction should choose Redis or in-memory implementations without application-layer branching.
- Observer: session lifecycle telemetry should fan out through the existing telemetry port.
- Template Method: the current answer flow should become history-aware in a way that keeps `load session -> compose -> persist` as an explicit orchestration sequence.

### ADR Impact
This spec should produce an ADR covering durable conversation storage and browser-session identity, including the choice of Upstash Redis for 30-day retention and the Anthropic-style message contract chosen to bridge the current runtime into later native tool use.

## Data Model & API Contracts
This spec introduces session persistence, transcript hydration, and browser-session storage contracts.

### Proposed Schemas
1. `BrowserSessionIdSchema = z.string().uuid()`
2. `ConversationArtifactSchema = z.discriminatedUnion("type", [z.object({ type: z.literal("citation_list"), citations: z.array(z.string()).min(1) }), z.object({ type: z.literal("tool_result"), toolName: z.string().min(1), payload: z.unknown() }), z.object({ type: z.literal("trace_summary"), summary: z.string().min(1) })])`
3. `ConversationMessageSchema = z.object({ role: z.enum(["user", "assistant", "tool"]), content: z.string().min(1), createdAt: z.string().datetime(), artifacts: z.array(ConversationArtifactSchema).default([]) })`
4. `ConversationTraceSchema = z.object({ toolName: z.string(), latencyMs: z.number().int().nonnegative(), ok: z.boolean(), errorCode: z.string().optional() })`
5. `ConversationSessionSchema = z.object({ sessionId: BrowserSessionIdSchema, messages: z.array(ConversationMessageSchema), traces: z.array(ConversationTraceSchema), lastActivityAt: z.string().datetime(), expiresAt: z.string().datetime() })`
6. `HydrateConversationResponseSchema = z.object({ ok: z.boolean(), sessionId: BrowserSessionIdSchema, messages: z.array(ConversationMessageSchema), resetRecommended: z.boolean().optional() })`

### Browser Storage Contract
1. The active browser session ID must be stored under a dedicated Grounded Moves key separate from saved location and saved snippets.
2. Any optional client-side cached transcript added by this spec must be treated as session-scoped cache only and must be safely discardable.
3. Corrupt or non-UUID session values in local storage must be treated as invalid and replaced.

### Chat Request Contract Changes
1. `sendChatMessage()` must send the active browser session ID rather than a hardcoded demo session value.
2. The chat request contract may add a lightweight client session version or reset marker only if needed for stale-session recovery.
3. No authentication token is introduced by this spec.

### Transcript Hydration Contract
1. The application may add a transcript-load endpoint such as `GET /api/chat/session/:sessionId` or an equivalent route contract if needed for browser hydration.
2. If the hydration endpoint receives an unknown or expired session ID, it must return an empty-session success response or an explicit reset recommendation rather than a hard failure loop.
3. Hydration responses must return message-level persisted artifacts together with their owning assistant messages rather than as top-level session metadata.

### Repository Contract Expectations
1. The conversation repository must support loading an existing session by ID.
2. The conversation repository must support saving updated transcript and trace state for that session.
3. The production repository must apply a 30-day TTL from last activity.
4. The repository contract must support deleting or invalidating a session when the user resets it.

## Test Plan
The feature must ship with unit, integration, and end-to-end coverage across positive, negative, and edge paths.

| Level | Positive | Negative | Edge |
|---|---|---|---|
| Unit | Browser-session helper creates and persists one UUID per browser context and conversation history is mapped into the model prompt in correct order | Invalid local storage session values and malformed repository payloads are rejected or replaced safely | Long transcripts are truncated deterministically, expired sessions produce clean replacement IDs, and reset clears session-scoped client state |
| Integration | Chat API route plus history-aware orchestration plus repository adapter persist and reload the same conversation across multiple turns | Redis unavailable or repository failure returns a degraded but clear error path without corrupting local session state | Expired-session recovery, concurrent tab reuse of the same session ID, and partial transcript reads still preserve consistent next-turn behavior |
| End-to-end | User starts a chat, refreshes, and sees the transcript restored in the same browser session | User hits reset and the prior transcript disappears while the next message starts a new session cleanly | Multi-tab continuation, stale local session after server expiry, and reload during an active conversation recover without leaking another session’s data |

### Deterministic Truncation Policy
1. The runtime must always retain the system prompt and the current user turn.
2. Prior history must be truncated only at complete turn boundaries, dropping the oldest retained user or assistant turns first.
3. The runtime must prefer retaining the newest complete user and assistant turn pairs over older turns.
4. Assistant artifacts remain only when their owning assistant message remains in the retained history window.
5. Trace records that are not needed by the current model call may be omitted from prompt construction even if they remain stored for observability.

### Minimum Unit Coverage
1. Browser-session helper creates a UUID when no session exists.
2. Existing valid UUID session values are reused rather than regenerated.
3. Corrupted or non-UUID session values are discarded and replaced.
4. Reset clears the stored session ID and any session-scoped cached transcript.
5. Conversation history is converted into the model prompt in correct chronological order.
6. Conversation history is converted into an ordered Anthropic-style `messages: [...]` payload rather than a flattened history string.
7. History truncation rules preserve the newest relevant complete turns deterministically when prompt size limits are reached.
8. Redis and in-memory repository implementations satisfy the same `ConversationRepository` semantics.

### Minimum Integration Coverage
1. First-turn chat request creates and persists a new session record.
2. Second-turn chat request for the same session loads prior messages and includes them in composition.
3. Transcript hydration endpoint or equivalent route returns the persisted transcript for the active session, including assistant-message-associated artifacts needed by the current UI.
4. Session reset invalidates or deletes the prior durable session without clearing separately managed location context or saved snippets.
5. Repository write failures surface a retryable error without crashing the app shell.
6. Expired or missing durable sessions recover by creating a new empty session path rather than failing indefinitely.

### Minimum End-to-End Coverage
1. First visit creates a browser-scoped session and shows a working transcript.
2. Page refresh restores transcript for the same browser session, including any persisted cards or citations tied to retained assistant messages.
3. Explicit reset creates a new session and clears visible conversation history.
4. Separate browser context or private window produces a different session.
5. Multi-tab use in the same browser continues the same session without duplicate session creation.
6. Corrupted local storage or stale expired session recovers without breaking chat use.

## Acceptance Criteria
1. Grounded Moves no longer uses a shared hardcoded session identifier for all browsers.
2. Each browser storage context gets a stable session UUID that persists across refreshes until reset or removal.
3. Conversation history for the active session is durably stored in Redis-backed persistence in production wiring.
4. `InMemoryConversationRepository` remains available and interchangeable for tests and local development.
5. The visible transcript restores on page load for an existing active session, including any assistant-message-associated artifacts still required by the current UI contract.
6. Every model composition call in the current runtime includes prior session turns as ordered Anthropic-style `messages: [...]` input rather than only the latest user message or a flattened prompt string.
7. Session retention is 30 days from last activity.
8. The UI provides an explicit reset control that clears only active conversation-session state and restarts the transcript cleanly.
9. Expired, missing, or corrupted session state recovers gracefully without trapping the user in a broken conversation flow.
10. Existing regex-based tool selection and non-streaming runtime behavior continue functioning after the session-memory upgrade.
11. Deterministic truncation rules for oversized histories are implemented and covered by tests.
12. Required unit, integration, and E2E coverage for this feature are present and passing.
13. CI is green for the Spec 2 change set, including lint, typecheck, unit, integration, E2E, and production build.
14. Session lifecycle telemetry is visible in development and production wiring without logging full conversation contents.
15. A smoke-test runbook for conversation memory and session reset exists before the feature is called MVP-complete.

## Open Questions
1. Should transcript hydration happen through a dedicated read endpoint, or should the initial page shell receive the last session transcript through a server component boundary?