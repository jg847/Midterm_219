# Sprint Plan 04: Streaming Chat Responses and Tool Status

## Goal
Ship end-to-end streamed chat delivery for the native-tool-use path so Grounded Moves shows honest tool-status progress and incremental assistant output without breaking session continuity, artifact persistence, or rollback safety.

## Tasks
1. Task 1, size S: Add the Spec 4 rollout flag, request negotiation contract, and kill-switch wiring first so streamed delivery can be enabled, disabled, and observed independently from the current buffered JSON chat path. Implements Spec 4 requirements 2, 3, 31, 32, 39 and acceptance criteria 1, 9.
2. Task 2, size S: Write the ADR for the SSE transport contract and streaming model boundary before the runtime refactor begins, documenting the decision to use Server-Sent Events, the request-negotiation shape on `POST /api/chat`, and whether `ModelClient` grows streaming semantics or splits into a dedicated stream-capable port. Implements Spec 4 architecture notes, route contract expectations, and ADR impact guidance.
3. Task 3, size M: Extend the shared Anthropic mock harness and conversation fixture factory from Spec 3 so tests and development flows can deterministically script assistant text chunks, tool-status phases, clarification-only turns, interruptions, fallback JSON mode, and same-session multi-tab expectations, and wire that harness into the existing mock-chat path so the app supports deterministic streaming mock mode outside unit-only fixtures. Implements Spec 4 requirements 33, 34, 37 and acceptance criterion 8.
4. Task 4, size M: Extend the application-layer chat event seam into a typed streaming event contract that covers stream start, tool-status, clarification prompts, assistant deltas, final payload, completion, and recoverable stream errors without leaking SSE framing into application code. Implements Spec 4 requirements 5, 6, 14, 27, 35, 38.
5. Task 5, size M: Add a stream-capable model adapter path in the Anthropic boundary that uses the Anthropic streaming API, emits assistant deltas in order, respects cancellation, and remains substitutable with the deterministic fake model in tests. Implements Spec 4 requirements 1, 12, 25 and the model-boundary portions of the architecture notes.
6. Task 6, size L: Add the route-level SSE adapter on the chat path using App Router `ReadableStream`, including start-event emission, ordered event framing, moderation and rate-limit enforcement before stream creation, and graceful fallback to buffered JSON when streaming is disabled or not requested. Implements Spec 4 requirements 4, 7, 23, 31, 32, 38, 39 and acceptance criteria 1, 9.
7. Task 7, size L: Refactor the native-tool-use orchestration path so tool requests, tool execution phases, clarification prompts, degraded failures, assistant deltas, and the final payload publish through the shared stream event contract while keeping final answer composition model-driven and preserving the current final payload shape for persistence. Implements Spec 4 requirements 8, 9, 12, 13, 16, 21, 22, 24, 25, 35, 36 and acceptance criteria 2, 3, 4, 5, 6.
8. Task 8, size M: Update the chat transport adapter and `ChatAssistantPanel` state model so the client can consume SSE events, validate and safely parse typed stream events, fail closed on malformed or unknown events, append the user turn immediately, render transient tool-status progress and an in-progress assistant row, commit exactly one completed assistant row on final payload, and avoid replaying transient status lines as durable transcript history or allowing spoofed client-side event injection to affect committed transcript state. Implements Spec 4 requirements 10, 11, 15, 17, 18, 19, 20, 30 and client transport and security requirements for safe parsing and spoof resistance.
9. Task 9, size M: Define and implement same-session multi-tab handling so concurrent streams in one browser session are either prevented across tabs or resolved deterministically server-side without duplicate or out-of-order assistant-turn persistence. Implements Spec 4 requirement 29 and acceptance criteria 6, 7.
10. Task 10, size S: Add streaming telemetry for stream start, first visible event, first assistant delta, tool-status emission, final payload commit, completion, interruption, client disconnect, and fallback mode while preserving the Spec 3 tool-use observability signals. Implements Spec 4 observability requirements 1, 2, 3, 4 and acceptance criterion 7.
11. Task 11, size L: Add the full Spec 4 test matrix across unit, integration, and Playwright coverage using the shared streaming harness, including clarification-only turns, interrupted streams, malformed or unknown stream events, spoof-resistance for committed transcript state, disconnect handling, transient tool-status behavior, same-session multi-tab behavior, fallback JSON mode, session restore after completed streamed turns, live-region behavior, keyboard usability during active streams, and performance checks for first-visible-event timing and bounded chunk-update behavior. Implements Spec 4 test plan requirements, accessibility and performance requirements, and acceptance criteria 8, 10, 11.
12. Task 12, size S: Add rollout and closeout documentation, including README and env-var updates, smoke-test instructions, and release verification notes for SSE negotiation, deterministic streaming mock mode, tool-status honesty, interruption recovery, same-session multi-tab behavior, and fallback to the buffered chat path. Implements Spec 4 acceptance criteria 11, 12.

## Dependencies
1. Approved Spec 4 at `docs/specs/04-streaming-chat-responses-and-tool-status.md` and the approved baseline in `docs/PIVOT-PLAN.md`.
2. Sprint 3 native-tool-use orchestration, typed clarification state, assistant-artifact persistence, and the shared native test harness remain the prerequisite foundation because streamed delivery must extend that event and persistence model rather than replace it.
3. Current primary implementation surfaces remain the main edit path: `src/app/api/chat/route.ts`, `src/application/chat/AnswerChatQuestionWithNativeToolUse.ts`, `src/application/chat/ToolUseChatEvents.ts`, `src/frameworks/ai/AnthropicModelClient.ts`, `src/interface-adapters/chat/chatApiClient.ts`, and `src/components/ChatAssistantPanel.tsx`.
4. Existing session persistence from Sprint 2 must remain stable because completed streamed turns still hydrate through the same transcript contract and interrupted turns must not corrupt durable history.
5. Existing mock-chat and native-tool-use E2E infrastructure must be extended rather than replaced so buffered mode and streamed mode can be validated side by side during rollout.
6. The ADR decision for SSE framing and the streaming model boundary must land before the route and adapter refactor begins, otherwise the transport contract and test seams will drift.

## Risks & Mitigations
1. Risk: Streaming is added as a route-level transport patch and diverges from the native-tool-use orchestration model, creating a second incompatible control flow.
Mitigation: Extend the existing chat event seam first and require the route to adapt ordered application events rather than synthesizing streaming behavior independently.

2. Risk: Partial assistant output or tool-status progress is persisted as if it were completed transcript history, causing corrupt restores after interruption or refresh.
Mitigation: Keep transient streamed state explicit in the spec and implementation, persist only on final payload commit, and require unit and integration coverage that fails if standalone tool-status rows or partial assistant turns become durable.

3. Risk: SSE delivery works in the happy path but disconnect, interruption, or browser refresh leaves the session in an ambiguous or duplicate state.
Mitigation: Treat disconnect detection, interruption handling, and completed-turn-only persistence as first-class implementation slices and cover them in both integration and Playwright tests.

4. Risk: Multi-tab streaming within one browser session creates duplicate completed assistant turns or out-of-order transcript commits.
Mitigation: Give same-session multi-tab behavior a dedicated task and test scope, and do not call the sprint complete until the chosen prevention or arbitration strategy is proven in integration and E2E coverage.

5. Risk: Streaming updates create excessive client re-renders, inaccessible live-region spam, or keyboard-regression behavior while a stream is active.
Mitigation: Give accessibility and performance explicit implementation and test scope, allow chunk coalescing where needed, and require release verification for live regions, keyboard continuity, first-visible-event timing, and bounded update behavior.

6. Risk: The client transport accepts malformed, unknown, or spoofed stream events and allows them to corrupt committed transcript state.
Mitigation: Validate the typed event contract at the transport boundary, fail closed on malformed or unknown events, keep committed transcript writes gated on trusted final payload handling, and require explicit negative-path test coverage for spoof resistance.

7. Risk: The route opens a stream before moderation, validation, or rate limiting, weakening existing abuse controls.
Mitigation: Preserve the current guard sequence before stream creation and add targeted route tests that fail if the stream opens for invalid or rate-limited requests.

8. Risk: Rollout safety is underbuilt and the streamed path cannot be disabled cleanly if latency or stability regresses.
Mitigation: Land the negotiation flag and buffered fallback path first, emit fallback telemetry, and verify the kill switch during smoke testing before MVP completion.

9. Risk: The mock harness under-specifies streamed phases, leading to brittle bespoke tests and expensive rewrites in the later budget sprint.
Mitigation: Front-load the harness extension with explicit scripted chunk, interruption, and clarification support before route and UI changes land.

## Definition of Done
1. Every Sprint 4 task maps back to approved Spec 4 requirements and those requirement references appear in implementation PR descriptions.
2. Grounded Moves streams the native-tool-use chat path over SSE on the enabled route while preserving a working buffered fallback path when streaming is disabled or not requested.
3. Users see honest streamed tool-status progress and incremental assistant output rather than a single blocking wall of text.
4. Clarification-only turns are delivered through the streamed event path without forcing a buffered fallback.
5. Completed assistant turns persist durably with the same artifact contract from Specs 2 and 3, while partial assistant text and transient tool-status lines never persist as standalone durable transcript rows.
6. Stream interruption, client disconnect, refresh, and same-session multi-tab behavior do not corrupt session history or create duplicate completed assistant turns.
7. The typed streaming event contract is shared across the route, client transport, orchestration, tests, and mock harness.
8. Required tests for this sprint pass at every level the spec calls for: unit, integration, and E2E, including clarification-only turns, interrupted streams, disconnect handling, fallback JSON mode, transient tool-status behavior, and same-session multi-tab behavior.
9. CI is green for the Sprint 4 change set, including `npm run lint`, `npm run typecheck`, all required tests, and a successful production build.
10. Streaming telemetry is emitted for the required success and failure paths and remains visible through existing development and production wiring without logging full conversation contents.
11. The client transport validates typed stream events, fails safely on malformed or unknown events, and does not allow spoofed or replayed stream events to create committed transcript state outside the trusted final-payload path.
12. Accessibility and performance requirements from Spec 4 are demonstrably met for the streamed path, including live-region behavior, keyboard continuity during active streams, acceptable first-visible-event timing, and bounded client update behavior.
13. The app supports the existing mock-chat mode and a deterministic streaming mock mode for development and test execution without requiring live provider calls.
14. Documentation is updated where touched by the sprint, including README env-var notes, the required ADR for SSE transport and the streaming model boundary, and a smoke-test runbook at `docs/operations/smoke-tests/04-streaming-chat-responses-and-tool-status.md`.
15. No budget capability, national resource expansion, or broader hardening-track work is introduced beyond the explicit support seams called for in Spec 4.

## Rollout Plan

### Feature Flags and Rollout Safety
1. Add a streaming rollout flag and request-negotiation contract in the first slice so SSE delivery can be enabled progressively without removing the existing buffered JSON response path.
2. The recommended kill switch behavior is to disable streamed delivery and fall back to the current buffered native-tool-use response path while preserving session history, assistant artifacts, and chat availability.
3. Safe fallback behavior when streaming is off or degraded is: user turns still submit normally, the server returns the current buffered JSON payload, and the client renders the completed assistant turn without any streamed progress UI.

### Telemetry to Watch
1. Stream start count, first visible event latency, first assistant delta latency, and stream completion rate.
2. Stream interruption rate, client disconnect count, and buffered fallback count after the streamed path is enabled.
3. Tool-status emission count and any divergence from the underlying Spec 3 tool-request and tool-result telemetry.
4. Duplicate or out-of-order completed assistant turn persistence, especially for same-session multi-tab traffic.
5. Chat-route error rate or total-turn latency regressions relative to the buffered native-tool-use path.

### Rollback Criteria
1. The streamed route fails to produce completed assistant turns reliably or leaves sessions in partial or duplicate states.
2. Tool-status progress becomes misleading, disappears, or replays as durable transcript history after refresh or restore.
3. Clarification-only turns fail to stream correctly or regress to blocking behavior on the enabled path.
4. Same-session multi-tab activity duplicates assistant turns or corrupts transcript ordering.
5. Stream interruption, disconnect, or fallback handling materially degrades chat stability relative to the buffered path.

### Release Verification
1. Run the Sprint 4 smoke-test script before calling the feature MVP-complete.
2. Run a successful production build and the full release gate before calling the feature MVP-complete.
3. Verify the rollout flag can switch between streamed SSE delivery and the buffered fallback path without breaking the home-page chat surface.
4. Verify explicit-location, clarification-only, interrupted-stream, disconnect, refresh-after-complete, same-session multi-tab, and buffered-fallback journeys against Spec 4 acceptance criteria.
5. Verify completed streamed turns retain citations, tool cards, clarification state, and resolved-location disclosure exactly as buffered native-tool-use turns do.
6. Verify malformed or unknown stream events fail safely, do not corrupt transcript state, and do not create committed assistant turns outside the trusted final-payload path.
7. Verify streamed live-region announcements, keyboard navigation during active streaming, first-visible-event timing, and chunk-update behavior satisfy the Spec 4 accessibility and performance expectations.
8. Verify deterministic streaming mock mode can drive the home-page chat flow for development and automated validation without live provider calls.