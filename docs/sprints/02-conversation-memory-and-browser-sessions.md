# Sprint Plan 02: Conversation Memory and Browser Sessions

## Goal
Ship browser-scoped, durable conversation memory for Grounded Moves so the chat restores prior transcript state across refreshes, sends ordered Anthropic-style history into every model call, and lets the user reset only conversation-session state safely.

## Tasks
1. Task 1, size S: Add the session-memory feature flag and kill-switch wiring first so hydration, durable persistence, history-aware composition, and reset UI can be rolled out or disabled safely while the sprint is in progress. Implements Spec 2 requirements 10, 17, 20, 23, 28, 29.
2. Task 2, size S: Add a browser-session storage helper and client transport updates so each browser context generates, validates, persists, reuses, and resets its own UUID-backed session identifier instead of the shared demo session value. Implements Spec 2 requirements 1, 2, 3, 17, 20, 21, 24, 25.
3. Task 3, size M: Add production conversation persistence wiring with a Redis-backed repository adapter, environment-based repository selection, TTL handling, reset invalidation, and dev-test parity through the existing `ConversationRepository` port, plus the ADR for browser session identity and durable storage. Implements Spec 2 requirements 4, 5, 6, 11, 12, 22, 23, 29.
4. Task 4, size M: Refactor the chat application flow so every model composition call loads prior session messages, converts retained history into ordered Anthropic-style `messages: [...]`, applies deterministic truncation, and preserves current regex-driven orchestration behavior. Implements Spec 2 requirements 7, 8, 9, 10, 18, 19.
5. Task 5, size S: Add session lifecycle telemetry emission for created, loaded, reset, expired or recovered, and repository read-write failure paths, and verify the events remain visible through existing development and production telemetry wiring without logging full transcript contents. Implements Spec 2 requirements 22, 23, 28.
6. Task 6, size M: Add transcript hydration and reset behavior in the chat shell, including restored message-level artifacts, non-blocking initial load behavior, stale-session recovery, and accessible reset/loading states that do not clear saved location or snippets. Implements Spec 2 requirements 13, 14, 15, 16, 17, 20, 21, 23, 24, 26.
7. Task 7, size M: Add unit, integration, and Playwright coverage for browser-session lifecycle, repository parity, history-aware composition, truncation, hydration, reset, multi-tab behavior, stale-session recovery, artifact restoration, degraded-mode behavior, and session lifecycle telemetry assertions where practical. Implements Spec 2 requirements 1, 3, 6, 9, 13, 15, 16, 17, 18, 19, 20, 21, 23, 24, 28.
8. Task 8, size S: Add rollout and closeout evidence, including smoke-test documentation, README and env-var updates, and release verification notes for durable sessions, reset behavior, telemetry checks, and degraded-mode recovery. Implements Spec 2 requirements 5, 17, 22, 28, 29.

## Dependencies
1. Approved baseline in [docs/PIVOT-PLAN.md](docs/PIVOT-PLAN.md) and approved Spec 2 in [docs/specs/02-conversation-memory-and-browser-sessions.md](docs/specs/02-conversation-memory-and-browser-sessions.md).
2. Sprint 1 homepage shell and release gates remain the active user-facing surface and validation baseline.
3. Current chat implementation surfaces remain the primary edit path: `src/components/ChatAssistantPanel.tsx`, `src/interface-adapters/chat/chatApiClient.ts`, `src/application/chat/AnswerChatQuestion.ts`, `src/application/chat/ComposeGroundedResponse.ts`, `src/application/ports/ConversationRepository.ts`, and `src/frameworks/repositories/conversation/`.
4. Upstash Redis environment support must already exist or be provisioned before production wiring is called complete.
5. Existing mock-chat and E2E infrastructure from Sprint 1 remains the reuse target for session-memory browser coverage.
6. This sprint depends on resolving the remaining implementation choice from Spec 2 before coding begins: dedicated hydration endpoint versus equivalent server-boundary preload.

## Risks & Mitigations
1. Risk: Browser session IDs, transcript hydration, and reset behavior can become duplicated across component state and adapter state.
Mitigation: Isolate browser-session lifecycle in one helper and keep the component on adapter-facing APIs only; require unit coverage for reuse, reset, corruption recovery, and cross-tab behavior.

2. Risk: Redis integration breaks local development or test determinism.
Mitigation: Keep repository substitution behind `ConversationRepository`, preserve `InMemoryConversationRepository` parity tests, and gate production wiring through environment-based construction.

3. Risk: History-aware composition changes the current chat answer path and quietly regresses regex-driven orchestration.
Mitigation: Limit the application-layer refactor to `load -> compose -> persist`, keep classifier/tool selection unchanged, and add focused integration coverage for multi-turn composition with existing mock responses.

4. Risk: Transcript hydration restores text but loses assistant-associated cards, citations, or trace summaries needed to make prior turns understandable.
Mitigation: Treat message-level artifact restoration as an explicit contract and cover refresh restoration at both integration and E2E levels.

5. Risk: Long-session truncation becomes nondeterministic or strips the wrong turn boundaries.
Mitigation: Encode truncation policy explicitly in unit tests and verify newest complete turn retention before merging.

6. Risk: Reset behavior accidentally clears location context or saved snippets and broadens scope beyond conversation memory.
Mitigation: Treat conversation-only reset scope as a hard acceptance gate and add browser coverage that preserves other local state surfaces.

7. Risk: Production rollout fails open if Redis is degraded, creating broken transcript loads or chat failures.
Mitigation: Add a feature flag or kill switch for session memory, surface degraded but recoverable UX, and watch session read-write failure telemetry during rollout.

8. Risk: The sprint passes behavior checks but misses required session lifecycle observability, making failures hard to diagnose after deploy.
Mitigation: Give telemetry its own implementation task, require visible dev and production wiring as part of DoD, and verify failure-path emission during integration testing and smoke-test review.

## Definition of Done
1. Every Sprint 2 task maps back to approved Spec 2 requirements and all requirement references are reflected in implementation PR descriptions.
2. Grounded Moves no longer uses the shared hardcoded session identifier and every browser context gets a stable UUID-backed conversation session until reset or removal.
3. Production wiring uses Redis-backed conversation persistence with 30-day TTL semantics, while dev and test continue to support interchangeable in-memory repository behavior.
4. The chat runtime loads prior session history into every model call as ordered Anthropic-style `messages: [...]` input while preserving the current regex-based tool-selection and non-streaming response flow.
5. Page refresh restores the visible transcript and message-level assistant artifacts for the active session without blocking the home shell from rendering.
6. Reset creates a clean next-session path without clearing separately managed location context or saved snippets.
7. Expired, missing, stale, or corrupted session state recovers gracefully without trapping the user in a broken conversation loop.
8. Required tests for this sprint pass at every level the spec calls for: unit, integration, and E2E, including deterministic truncation, artifact restoration, multi-tab continuation, and stale-session recovery.
9. CI is green for the Sprint 2 change set, including `npm run lint`, `npm run typecheck`, unit tests, integration tests, E2E tests, and a successful production build.
10. Session lifecycle telemetry is emitted for creation, load, reset, expiration recovery, and repository read-write failures, and remains visible through existing development and production telemetry wiring.
11. Documentation is updated where touched by the sprint, including README env-var notes, the required ADR for browser session identity plus durable storage, and a smoke-test runbook at `docs/operations/smoke-tests/02-conversation-memory-and-browser-sessions.md`.
12. No authentication, streamed transcript events, budget-profile persistence, or tool-use orchestration redesign is introduced in Sprint 2.

## Rollout Plan

### Feature Flags and Rollout Safety
1. Add a session-memory rollout flag in the first implementation slice so transcript hydration, history-aware composition, durable persistence, and explicit reset UI can be enabled progressively without removing the underlying chat surface.
2. The recommended kill switch behavior is to disable durable session-memory features and fall back to the current stateless-per-turn chat path while leaving homepage chat availability intact.
3. Safe fallback behavior when the flag is off or Redis is degraded is: chat still renders and sends messages, but transcript restoration, durable history, and reset-backed session continuity are disabled or hidden rather than failing partially.

### Telemetry to Watch
1. Session lifecycle events: created, loaded, reset, expired or recovered.
2. Redis-backed conversation read and write failures, including degraded-mode entry frequency.
3. Chat-route errors or latency regressions after history-aware composition is enabled.
4. Client-side hydration/reset failures, including stale or corrupt local session recovery.

### Rollback Criteria
1. A refresh loses active-session transcript state or restores the wrong session.
2. Reset clears unrelated local state such as location context or saved snippets.
3. Redis-backed persistence materially degrades chat availability or causes unrecoverable read-write failures.
4. Multi-turn model composition stops using prior session context or breaks current regex-driven orchestration behavior.
5. Multi-tab or stale-session recovery leaks another session’s data or traps the user in a broken state.

### Release Verification
1. Run the Sprint 2 smoke-test script before calling the feature MVP-complete.
2. Run a successful production build and the full release gate before calling the feature MVP-complete.
3. Verify first visit, refresh restore, explicit reset, stale-session recovery, corrupt-local-storage recovery, and multi-tab continuation against Spec 2 acceptance criteria.
4. Verify the session-memory kill switch returns the app to a safe degraded mode without breaking the core chat route.