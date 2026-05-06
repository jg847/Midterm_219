# Spec 04: Streaming Chat Responses and Tool Status

## Context & Motivation
Grounded Moves now has a chat-first homepage, browser-scoped session memory, and a native-tool-use orchestration path. The remaining gap is that the user still experiences the assistant as a blocking request. The server returns one `NextResponse.json(...)` payload only after the whole turn completes, `chatApiClient.ts` only supports `response.json()`, `ChatAssistantPanel.tsx` shows a loading state rather than incremental progress, and `AnthropicModelClient.ts` currently waits for completed responses instead of exposing streamed output.

This spec upgrades the primary chat path to end-to-end streaming so the user sees meaningful progress while the assistant works. Tool execution must surface honest status lines as it happens, and the final model-composed answer must stream into the transcript instead of appearing as a completed wall of text. This spec depends directly on Spec 3 and intentionally uses the tool-use event seam created there rather than introducing a second orchestration model.

This spec covers Pivot Problem 6. It does not redesign budgeting, national resource coverage, or the broader hardening tracks. Its goal is narrower: make the current native-tool-use runtime feel like a real conversational system in flight, while preserving truthful grounding, session continuity, and rollback safety.

## User Stories
1. As a user asking a housing, jobs, or affordability question, I want to see the assistant respond incrementally so that the app feels conversational rather than frozen.
2. As a user waiting on tool-backed results, I want clear status updates such as looking up jobs or rentals in my market so that I understand what the assistant is doing.
3. As a user whose request triggers clarification instead of tool execution, I want that clarification to appear immediately in the transcript so that I can continue without waiting for a full non-streaming response.
4. As a user on a slower connection, I want the first visible response quickly and the final answer to continue streaming so that I am not left guessing whether the request succeeded.
5. As a user who refreshes or reconnects after a streaming interruption, I want session history to remain consistent so that a partial turn does not corrupt the conversation.
6. As an engineer building the later budget capability, I want one reusable streaming event contract for model tokens, tool status, and final artifacts so later conversational features do not require a transport rewrite.
7. As an operator, I want telemetry for stream start, first token, tool-status emission, completion, interruption, and fallback mode so rollout regressions are diagnosable.

## Functional Requirements
1. The primary chat runtime for Grounded Moves must support streamed responses on the native-tool-use path introduced by Spec 3.
2. Streaming must use the existing `POST /api/chat` entry point or a documented equivalent route contract that preserves the current browser-session request semantics.
3. The streaming route contract must support content negotiation or an explicit request flag so the client can request a streamed response while non-streaming fallback remains available.
4. When streaming is enabled, the server must return an event stream rather than waiting to build one final JSON payload before sending anything to the browser.
5. The streamed event contract must be typed and derived from application-layer events rather than assembled ad hoc from string concatenation inside the route.
6. The streamed event contract must support, at minimum, start, tool-status, clarification-prompt, assistant-text-delta, final-payload, completion, and error events.
7. The route must emit a start event before any model or tool work that could materially delay the first visible update.
8. The route must emit human-readable tool-status events when the model requests a tool and when the tool begins execution.
9. Tool-status events must include enough structured metadata for the client to describe the action honestly, including the tool name and the resolved or disclosed location label when available.
10. Streamed tool-status lines are transient progress UI for the active turn and must not be persisted as standalone durable transcript messages.
11. If the final committed assistant turn needs to preserve the fact that tools ran, that information must remain in assistant artifacts or trace summaries rather than as replayed tool-status transcript rows.
12. The final assistant answer must stream into the client incrementally as text deltas or coalesced text chunks rather than appearing only after full completion.
13. The streaming runtime must preserve the current model-composed final-answer behavior from Spec 3; streaming may change transport, but it must not reintroduce digest-first composition.
14. If the assistant path for a turn is a clarification prompt with no tool execution, that clarification must be emitted through the streaming event contract and shown in the transcript without forcing a full buffered response path.
15. The streaming runtime must preserve current browser-session history from Spec 2 and current clarification-state handling from Spec 3.
16. The streaming runtime must preserve the current assistant artifact contract so citations, tool-result cards, trace summaries, resolved-location disclosure, and clarification state still attach to the assistant turn that produced them.
17. The client must assemble the in-progress streamed assistant text separately from committed transcript rows until the stream completes or fails.
18. The client must append the user turn to the visible transcript immediately on send and show an in-progress assistant row while streaming is active.
19. The client must not replace or discard prior assistant cards when a new streamed turn is in progress.
20. On stream completion, the client must commit one assistant transcript row containing the completed answer text and the final artifacts returned by the stream.
21. The server must persist the completed assistant message and its artifacts to the conversation repository once the final streamed payload for that turn is fully available.
22. The server must not persist partial assistant tokens as a completed assistant message if the stream ends prematurely before the final payload is available.
23. If the stream fails after the user message is accepted but before final completion, the client must show a retryable interruption message that does not falsely imply the turn completed successfully.
24. If the stream fails before the final assistant payload is committed, the session must remain in a consistent state without a duplicated or partial assistant message stored as a finished turn.
25. The server must detect client disconnect or aborted requests and stop further streaming work through `AbortSignal` or an equivalent cancellation path where the underlying adapters support it.
26. Tool execution failures, validation failures, and model-side degraded answers must stream honest status or error information rather than silently collapsing into a generic spinner.
27. The streaming path must support multi-round native tool use, preserving event order across repeated tool request, tool result, and assistant composition phases.
28. The client must disable duplicate send actions for the active composer while a stream is in progress for that session.
29. The implementation must define same-session multi-tab behavior explicitly: concurrent streams for the same browser session must either be prevented client-side across tabs or handled server-side so that only one completed assistant turn is durably committed per submitted user turn.
30. The UI must surface a visible “working” state tied to streamed progress, not only to a generic boolean loading flag.
31. The implementation must provide a feature flag or kill-switch path that restores the current non-streaming response behavior without changing session or tool contracts.
32. When the streaming feature is disabled or degraded, the client must fall back safely to the current non-streaming chat behavior without breaking chat submission.
33. The implementation must extend the shared Anthropic mock harness from Spec 3 so unit, integration, and end-to-end tests can deterministically script token chunks, tool-status phases, clarification events, and interrupted streams.
34. The implementation must extend the shared conversation fixture model from Spec 3 so streaming tests can represent pending assistant text, committed transcript rows, citations, tool results, clarification-state handoff, and transient tool-status expectations consistently.
35. The streaming transport must preserve the current non-streaming JSON payload shape as the completion payload so downstream transcript persistence and artifact rendering do not require a parallel presenter contract.
36. Tool-status text shown to the user must be honest about provider limitations already established in Spec 3, including location-resolution disclosure where relevant.
37. The client must support the current mock-chat mode and a deterministic streaming mock mode for development and test execution.
38. The streaming path must emit a final completion event that clearly distinguishes successful completion from interrupted or failed streams.
39. The streaming path must preserve current route-level moderation and abuse controls before stream creation begins.

## Non-Functional Requirements

### Performance
1. Under normal local and CI conditions, the first visible stream event for a valid request must arrive materially earlier than the final completed answer and must not wait for all tool work to finish.
2. The streaming implementation should target a p95 first visible event within 1500 ms for mocked or local-provider test paths and should not materially worsen total end-to-end turn time versus the current non-streaming path for the same tool work.
3. Client-side streamed transcript updates must avoid pathological re-render frequency; token or chunk coalescing is acceptable if it preserves a visibly incremental experience.
4. Streaming must not introduce unbounded memory growth in the route handler or client transcript state for a single turn.
5. Production build and existing route startup behavior must continue to pass without requiring a second chat service.

### Accessibility
1. Streamed assistant text and streamed tool-status updates must be announced through screen-reader-compatible live regions without causing inaccessible focus jumps.
2. The live region strategy must avoid excessive repeated announcements for every tiny token chunk; coalesced updates are acceptable where needed for assistive technology usability.
3. Tool-status messages and interruption notices must be user-readable text, not visual-only progress indicators.
4. Keyboard users must still be able to navigate the transcript, composer, reset action, and location controls while a stream is active.

### Privacy
1. Streaming must not expand persisted data beyond the session transcript, tool artifacts, traces, and coarse location context already allowed by Specs 2 and 3.
2. Partial streamed tokens that never become a committed assistant message must not be persisted as durable transcript history.
3. Stream telemetry and logs must avoid recording full transcript contents or raw provider payloads.
4. Tool-status updates must not expose secrets, internal request IDs, or provider credentials.

### Security
1. Streaming must preserve the existing server-side-only execution of model calls and tool calls; no secret-bearing provider logic may move into the browser.
2. Streaming route handling must preserve existing moderation, rate limiting, and validation before opening the stream body.
3. Stream events must not allow the client to inject or spoof assistant, tool, or completion events into persisted transcript state.
4. Disconnect and retry handling must not duplicate durable assistant turns for the same request.

### Observability
1. The system must emit telemetry for stream started, first visible event emitted, first assistant delta emitted, tool-status emitted, final payload committed, stream completed, stream interrupted, client disconnected, and non-streaming fallback used.
2. Streaming telemetry must remain visible through local console behavior and production telemetry wiring when configured.
3. Operational diagnostics for streaming failures must be possible without logging complete user prompts or full model output.
4. Telemetry for tool-status streaming must preserve the tool-use visibility added in Spec 3 rather than replacing it.

## Out of Scope
1. Budget domain modeling, budget tool design, or budget card rendering.
2. National resource framing, HUD seed expansion, or broader multi-location coverage beyond preserving Spec 3 disclosures.
3. Full moderation redesign, retrieval hardening, or telemetry productionization tracks from Spec 7.
4. A typed rewrite of all transcript-rendering components beyond the streaming-specific state changes required here.
5. Cross-device account sync, authenticated chat histories, or named user profiles.
6. User-controlled stream cancellation as a first-class product feature unless it is needed only for internal disconnect handling.
7. Replaying partial interrupted streams after browser refresh.

## Architecture Notes
The local hypothesis for this spec is narrow and falsifiable: the missing behavior is controlled by the route and client transport boundary, not by the core tool implementations. A cheap disconfirming check was reading `src/app/api/chat/route.ts`, `src/components/ChatAssistantPanel.tsx`, `src/interface-adapters/chat/chatApiClient.ts`, `src/application/chat/ToolUseChatEvents.ts`, and `src/frameworks/ai/AnthropicModelClient.ts`; that confirmed all of the following:

- the main route still returns one `NextResponse.json(...)` payload after the whole turn finishes;
- the browser adapter only supports buffered `response.json()` semantics;
- the chat panel only models a generic loading state rather than an in-progress assistant stream;
- the internal tool-use event seam exists but is not yet transport-facing;
- the Anthropic adapter still waits for completed responses instead of exposing a streaming boundary.

### Current Owning Surfaces
- `src/app/api/chat/route.ts` currently owns the chat transport and still returns buffered JSON.
- `src/components/ChatAssistantPanel.tsx` currently owns pending-request UI and transcript commit behavior.
- `src/interface-adapters/chat/chatApiClient.ts` currently owns client transport and only supports non-streaming JSON parsing.
- `src/application/chat/AnswerChatQuestionWithNativeToolUse.ts` currently owns the streamed event source in concept, but only as an internal array of events plus final payload persistence.
- `src/application/chat/ToolUseChatEvents.ts` currently defines the existing event seam that this spec should extend rather than replace.
- `src/frameworks/ai/AnthropicModelClient.ts` currently owns the model adapter and has no streaming method.

### Proposed Implementation Shape
1. Extend the chat event seam into a typed streaming contract that can carry status, clarification, assistant deltas, final payload, completion, and error information.
2. Introduce a stream-capable application orchestration path that publishes ordered chat events as they occur while still producing one final payload for persistence and transcript commit.
3. Extend the model boundary with a streaming method or dedicated streaming model port so the Anthropic adapter can forward incremental assistant text without leaking SDK details into application code.
4. Keep tool execution and location-resolution logic in the existing application use case and adapters; the streaming layer must observe and publish events, not reimplement orchestration rules.
5. Add a route-level streaming adapter using App Router `ReadableStream` plus Server-Sent Events.
6. Add a client transport adapter that can consume the stream, parse typed events, and surface them to the UI as an async iterator, callback sink, or equivalent typed interface.
7. Update the chat panel to manage three distinct states for the current turn: user turn committed, assistant turn in progress, and assistant turn committed with final artifacts.
8. Commit durable transcript state only when the final assistant payload is available; interrupted streams remain transient UI state only.
9. Preserve a non-streaming fallback path behind configuration so rollout can revert safely without replacing the native-tool-use runtime.

### Ports and Adapters
- `ModelClient` may either gain streaming methods or split into a smaller stream-capable model port; either is acceptable if the final ADR documents the choice and preserves testability.
- a stream-facing chat transport adapter should live in the interface-adapter layer rather than inside `ChatAssistantPanel.tsx`.
- the route should adapt application chat events into wire events; application code should not know about SSE framing tokens or HTTP flush mechanics.
- the shared Anthropic mock harness from Spec 3 should become the deterministic fake model adapter for streaming tests as well.

### SOLID Emphasis
- Single Responsibility: streamed transport parsing, transcript assembly, and orchestration should not collapse into one React component or one route function.
- Open/Closed: adding a new streamed event type should extend the event union and renderer logic without rewriting the entire chat route.
- Liskov Substitution: a deterministic fake streaming model client must be interchangeable with the real Anthropic streaming adapter.
- Interface Segregation: if buffered generation and streaming generation differ materially, the model boundary should split instead of becoming a fat interface.
- Dependency Inversion: application orchestration must continue depending on ports and typed chat events, not on browser `ReadableStream` or Anthropic SDK stream primitives directly.

### Pattern Fit
- Observer: streaming is naturally event-driven; the route, UI, and telemetry can observe the same ordered chat-event stream.
- Adapter: Anthropic streaming transport, SSE framing, and client stream parsing are all adapter concerns behind stable ports.
- Template Method: the native-tool-use orchestration sequence remains `load history -> ask model -> execute tools -> compose final answer -> persist`, with streaming observing each step.
- Command: each tool request still executes as a validated tool command inside the streamed loop rather than becoming route-level string status logic.
- Decorator: optional chunk coalescing or keepalive behavior around the raw stream writer should stay separate from core orchestration if introduced.

### ADR Impact
This spec should produce an ADR covering the SSE transport contract and the model-boundary decision for streamed Anthropic responses. If the implementation chooses content negotiation on `POST /api/chat` versus a dedicated streaming route, record that decision in the ADR as well.

## Data Model & API Contracts
This spec introduces a typed stream event contract while preserving the existing final chat payload shape.

### Proposed Schemas
1. `ChatStreamRequestSchema = ChatRequestSchema.extend({ stream: z.boolean().default(false) })`
2. `ChatStreamStartEventSchema = z.object({ type: z.literal("stream_started"), sessionId: z.string().min(1), mode: z.enum(["native_tool_use", "fallback_json"]) })`
3. `ChatToolStatusEventSchema = z.object({ type: z.literal("tool_status"), phase: z.enum(["requested", "running", "completed", "failed", "composing"]), toolName: z.string().min(1).optional(), toolUseId: z.string().min(1).optional(), message: z.string().min(1), locationLabel: z.string().min(1).optional(), ok: z.boolean().optional(), errorCode: z.string().optional() })`
4. `ChatClarificationEventSchema = z.object({ type: z.literal("clarification_prompt"), question: z.string().min(1), clarificationState: ClarificationStateSchema })`
5. `ChatAssistantDeltaEventSchema = z.object({ type: z.literal("assistant_delta"), delta: z.string().min(1) })`
6. `ChatFinalPayloadEventSchema = z.object({ type: z.literal("final_payload"), payload: ToolUseChatResponseSchema })`
7. `ChatCompletedEventSchema = z.object({ type: z.literal("stream_completed"), persisted: z.boolean() })`
8. `ChatErrorEventSchema = z.object({ type: z.literal("stream_error"), message: z.string().min(1), retryable: z.boolean(), code: z.string().optional() })`
9. `ChatStreamEventSchema = z.discriminatedUnion("type", [ChatStreamStartEventSchema, ChatToolStatusEventSchema, ChatClarificationEventSchema, ChatAssistantDeltaEventSchema, ChatFinalPayloadEventSchema, ChatCompletedEventSchema, ChatErrorEventSchema])`

### Route Contract Expectations
1. The chat route must accept the current session ID, message, and optional location context from Specs 2 and 3.
2. The client must be able to request a streamed response through either a request flag, request header, or both, as long as the contract is explicit and testable.
3. When streaming is requested and available, the route must return a `text/event-stream` response using Server-Sent Events.
4. When streaming is disabled, unavailable, or explicitly not requested, the route may continue returning the current JSON response shape.
5. The final streamed payload must preserve the current `ChatResponsePayload` semantics so transcript persistence and tool-result rendering remain compatible.

### Persistence Contract Expectations
1. The conversation repository must continue storing committed user and assistant messages plus artifacts as durable transcript history.
2. Partial streamed assistant text and streamed tool-status lines must remain transient until the final payload is available.
3. If the stream is interrupted before final completion, the repository must not save a durable assistant turn that falsely appears complete.
4. Final citations, tool results, clarification state, resolved location disclosure, and any trace artifacts must persist with the completed assistant message exactly as in Spec 3.

### Client Transport Contract
1. The interface-adapter layer must expose a typed streaming chat client separate from or alongside the existing buffered `sendChatMessage()` helper.
2. The transport adapter must validate or safely parse incoming stream events into the shared `ChatStreamEvent` contract before passing them to UI code.
3. Malformed or unknown stream events must fail safely and surface a recoverable interruption rather than corrupting transcript state.

### Mock Harness Contract
1. The deterministic Anthropic mock harness must support scripted assistant text chunks, tool-status phases, clarification-only turns, degraded tool turns, and mid-stream interruption.
2. The shared conversation fixture factory must support expected streamed final payloads, committed transcript rows, and interrupted-turn expectations.

## Test Plan
The feature must ship with unit, integration, and end-to-end coverage across positive, negative, and edge paths.

| Level | Positive | Negative | Edge |
|---|---|---|---|
| Unit | Stream formatter or parser emits typed ordered events and the client assembles one final assistant turn from deltas plus final payload | Malformed events, interrupted streams, and model or tool failures surface retryable interruption state without corrupting the transcript | Clarification-only turns, empty delta chunks, repeated tool rounds, and completion without tool cards behave deterministically |
| Integration | Chat route plus native-tool-use orchestrator plus fake streaming model emits tool status first, assistant deltas next, and persists one final assistant turn on completion | Provider or model interruption yields honest stream-error handling and no false completed assistant persistence | Client disconnect, clarification persistence across streamed turns, same-session multi-tab concurrency, and fallback to buffered JSON all preserve session consistency |
| End-to-end | User sends a question, sees status text while tools run, then sees the final answer stream into the transcript in the real app shell | Stream interruption or mocked provider failure produces a visible recovery message without breaking the session or deleting prior turns | Mid-stream refresh, same-browser continuation after a streamed clarification, same-session multi-tab behavior, and slow chunk delivery remain usable and truthful |

### Minimum Unit Coverage
1. Stream event encoder or parser produces valid typed events in the expected order.
2. Client transcript assembly converts assistant deltas plus final payload into one committed assistant row.
3. Interruption before final payload leaves no committed assistant turn for that request and no durable standalone tool-status transcript rows.
4. Clarification-only streams commit the clarification text and clarification state correctly.
5. Tool-status events render honest user-visible text with location disclosure when provided.
6. Buffered fallback mode still returns the current JSON payload shape when streaming is disabled.
7. The streaming model fake can script assistant chunks, tool-status phases, and interruptions deterministically.

### Minimum Integration Coverage
1. `POST /api/chat` streamed mode emits a start event before final completion.
2. A native-tool-use streamed turn emits ordered tool-status events and then a final payload with citations and tool results.
3. Session history and clarification state from prior turns still influence the next streamed turn.
4. Interrupted streams do not persist a false completed assistant message.
5. Client disconnect triggers cancellation or graceful stop behavior without route crashes.
6. Same-session multi-tab submissions do not create duplicate or out-of-order completed assistant turns.
7. Streaming-disabled mode safely falls back to the buffered JSON response path.

### Minimum End-to-End Coverage
1. A jobs or housing question with explicit location shows streamed status then streamed final answer.
2. A clarification-only turn shows the clarification promptly without waiting for a buffered response.
3. A repeated ambiguous state-only request after prior clarification still discloses the fallback metro under streaming mode.
4. A mocked interrupted stream shows a visible retryable message and preserves prior transcript rows without replaying transient tool-status lines as committed history.
5. Refresh after a completed streamed turn restores the committed transcript normally.
6. Same-browser continuation after a streamed clarification prompt preserves the one-time clarification behavior from Spec 3.
7. Same-session multi-tab use does not duplicate completed assistant turns or corrupt transcript order.

## Acceptance Criteria
1. Grounded Moves streams the primary native-tool-use chat path instead of waiting for one buffered final response.
2. Users see honest tool-status updates while the assistant is working.
3. Final assistant prose streams incrementally into the transcript.
4. Clarification-only turns are delivered through the streaming path without falling back to a blocking response.
5. Session history, clarification state, citations, tool results, and resolved-location disclosure remain compatible with Specs 2 and 3.
6. Completed assistant turns persist durably with artifacts, while interrupted partial streams do not persist as finished turns.
7. Client disconnects and stream failures recover without corrupting session history or duplicating assistant turns.
8. A typed shared streaming event contract exists and is used by the route, client transport, tests, and mock harness.
9. Streaming can be disabled safely, with the client falling back to the current buffered chat path.
10. Required unit, integration, and end-to-end coverage for positive, negative, and edge cases is present and passing.
11. CI is green for the Spec 4 change set, including lint, typecheck, all required tests, and production build verification.
12. A smoke-test runbook for streamed chat responses and tool-status behavior exists before the feature is called MVP-complete.

## Open Questions
1. No product-level open question blocks this spec. The implementation may either negotiate streaming on `POST /api/chat` or introduce a dedicated streaming route if the ADR justifies the tradeoff and preserves the current fallback contract cleanly.