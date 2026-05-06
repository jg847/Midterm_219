# Sprint Plan 03: Native Tool Use, Model-Composed Responses, and Core Location Grounding

## Goal
Ship the core Grounded Moves orchestration pivot so the production chat route uses model-driven native tool use, model-composed grounded answers, and explicit location grounding with no silent Newark defaults.

## Tasks
1. Task 1, size S: Add the Spec 3 rollout flag, kill-switch wiring, and baseline telemetry contract first so the native tool-use path can be enabled, disabled, and observed independently from the legacy regex orchestration path during development and rollout. Implements Spec 3 requirements 1, 8, 31, 32 and acceptance criteria 1, 3, 15.
2. Task 2, size S: Write the ADR for the model boundary and orchestration shape, deciding whether to extend `ModelClient` or introduce a dedicated `ToolUseModelClient`, and document the corresponding factory and test-seam implications before the runtime refactor begins. Implements Spec 3 architecture notes, data model expectations, and open question 1.
3. Task 3, size M: Build the deterministic Anthropic mock harness and shared conversation fixture factory up front, including scripted tool-use turns, invalid-tool requests, degraded tool results, clarification-state snapshots, and reusable location-resolution fixtures for unit, integration, and E2E reuse. Implements Spec 3 requirements 34, 35 and acceptance criterion 12.
4. Task 4, size M: Introduce the tool-catalog adapter and tool-use-aware model port or implementation so the application layer can send ordered conversation messages, system prompt, and model-visible tool definitions derived from the registered MCP catalog without importing framework code directly, and audit the full exposed tool catalog so descriptions and input schemas are strong enough for native tool use rather than only the location-aware subset. Implements Spec 3 requirements 2, 13, 14, 15, 29, 30.
5. Task 5, size S: Define the non-streaming event-model support seam that Spec 4 will extend, including the typed internal event sequence for assistant messages, tool requests, tool results, clarification prompts, and final-answer completion, without introducing streamed transport in this sprint. Implements pivot-plan streaming dependency guidance and Spec 3 architecture support seams.
6. Task 6, size L: Replace the regex-led orchestration path in the primary chat flow with a bounded tool-use loop that validates model tool calls, executes them through `ToolExecutor`, returns typed tool results, and persists the final assistant response while preserving the current non-streaming route contract and the assistant-message artifacts required by the current UI contract. Implements Spec 3 requirements 1, 3, 4, 5, 8, 9, 10, 11, 12, 31, 32, 33.
7. Task 7, size M: Remove digest-short-circuit answer composition from the primary runtime path, raise the final-answer token budget above the legacy 350-token ceiling, and install the Spec 3 system prompt so final responses are model-composed, citation-aware, and honest about tool evidence. Implements Spec 3 requirements 6, 7, 13, 14, 26 and acceptance criteria 4, 11.
8. Task 8, size M: Introduce the strengthened location-grounding contract, including explicit `LocationContext` orchestration use, persisted clarification state, standardized `locationResolution` output, and deterministic ask-once-then-disclose fallback behavior across turns. Implements Spec 3 requirements 16, 17, 19, 20, 21, 22, 23, 24, 25 and acceptance criteria 6, 7, 9.
9. Task 9, size M: Refactor the core location-aware tools touched by this spec to remove silent Newark defaults, replace `rows[0]` and `1720` fallback behavior with explicit disclosed fallbacks, and document provider limitations such as city-state-only filtering where radius cannot be honored. Implements Spec 3 requirements 18, 27, 28, 30 and acceptance criteria 7, 8.
10. Task 10, size S: Add native tool-use and location-grounding telemetry for tool requests, validation failures, executed commands, clarification prompts, disclosed fallback use, and safety-bound termination, and verify the signals remain visible through current development and production wiring without logging full transcript contents. Implements Spec 3 observability requirements 1, 2, 3, 4 and acceptance criterion 15.
11. Task 11, size L: Add the full Spec 3 test matrix across unit, integration, and Playwright coverage using the shared harness, including happy-path tool-use turns, invalid tool input recovery, degraded tool failures, clarification-state persistence, disclosed fallback behavior, assistant-message artifact preservation, session continuity, the non-streaming event seam, and same-browser follow-up after clarification prompts. Implements Spec 3 test plan requirements and acceptance criteria 10, 12, 13.
12. Task 12, size S: Add rollout and closeout documentation, including README and env-var updates, smoke-test instructions, and release verification notes for tool-use kill-switch behavior, model-composed responses, honest location-resolution disclosure, and assistant-artifact continuity on the enabled path. Implements Spec 3 acceptance criteria 14, 16.

## Dependencies
1. Approved baseline in `docs/PIVOT-PLAN.md` and approved Spec 3 in `docs/specs/03-native-tool-use-model-composed-responses-and-core-location-grounding.md`.
2. Sprint 2 durable session memory remains the prerequisite foundation because Spec 3 depends on persisted ordered conversation history and browser-session continuity.
3. Current primary implementation surfaces remain the main edit path: `src/application/chat/AnswerChatQuestion.ts`, `src/application/chat/ComposeGroundedResponse.ts`, `src/application/chat/ExecuteToolPlan.ts`, `src/application/chat/SelectTools.ts`, `src/application/ports/ModelClient.ts`, `src/frameworks/ai/AnthropicModelClient.ts`, `src/frameworks/mcp-tools/index.ts`, and the core location-aware MCP tools.
4. Existing `ConversationRepository`, `ToolExecutor`, and chat route wiring from Sprint 2 must remain stable enough to support a one-path-at-a-time orchestrator replacement rather than a broader chat rewrite.
5. Existing E2E mock-chat infrastructure from Sprints 1 and 2 remains the reuse target, but it must be extended with the new deterministic Anthropic tool-use harness before feature-complete validation is possible.
6. This sprint depends on resolving the implementation choice captured in the ADR before the orchestrator refactor lands: extend `ModelClient` or introduce a dedicated tool-use model port.
7. This sprint depends on preserving the current assistant-message artifact contract from Sprint 2 while the orchestration internals change, so transcript rendering behavior remains stable on the home-page chat surface.

## Risks & Mitigations
1. Risk: The new tool-use loop can regress the working chat route by replacing regex routing before the model boundary, tool catalog, and failure-handling seams are stable.
Mitigation: Land the rollout flag and kill switch first, keep the legacy regex path available behind the fallback, and require focused regression coverage before switching the primary route.

2. Risk: The model boundary grows into an awkward multi-purpose port that weakens testability and blurs application-versus-framework responsibilities.
Mitigation: Decide the port shape in the ADR before coding the runtime refactor and enforce substitution through the deterministic fake model client in unit and integration coverage.

3. Risk: Native tool use succeeds on happy paths but fails unclearly on invalid tool arguments, unregistered tool names, or repeated tool loops.
Mitigation: Treat invalid-tool recovery and safety-bound termination as first-class tasks, not cleanup, and cover them in the shared harness before main-route cutover.

4. Risk: Clarification-state behavior becomes inconsistent across turns, refreshes, and repeated state-level requests.
Mitigation: Define one typed clarification-state contract, persist it through the session layer, and require unit, integration, and E2E checks for ask-once, repeat-request fallback, and explicit-city reset behavior.

5. Risk: Tool outputs remain inconsistent about resolved market disclosure, leaving the UI and final assistant answer unable to explain which location was actually used.
Mitigation: Standardize `locationResolution` in the schema and enforce adapter-level fixture coverage across all touched location-aware tools before merging the presenter-facing changes.

6. Risk: The orchestration rewrite preserves answer text but silently drops the assistant-message artifacts and cards the current UI contract depends on.
Mitigation: Give assistant-artifact preservation its own explicit implementation and test scope, and require persisted artifact continuity checks in integration and Playwright coverage before switching the primary path.

7. Risk: Silent Newark-biased defaults survive in edge paths even after the orchestration rewrite.
Mitigation: Give removal of `"Newark, NJ"`, `rows[0]`, and `1720` explicit implementation scope and require negative-path integration tests that fail if silent fallback behavior remains.

8. Risk: Telemetry and rollout safety arrive too late, making partial rollout failures hard to diagnose once the main path changes.
Mitigation: Land telemetry contract and kill-switch wiring in the first slice and verify tool-use fallback-to-legacy behavior during smoke testing before MVP completion.

9. Risk: The shared Anthropic test harness or event seam is underbuilt, forcing bespoke mocks and expensive rework in later streaming and budget specs.
Mitigation: Front-load the harness, fixture factory, and typed non-streaming event seam as explicit tasks, and treat streamed-token scripting readiness as a design constraint even though streaming itself stays out of scope for this sprint.

## Definition of Done
1. Every Sprint 3 task maps back to approved Spec 3 requirements and those requirement references appear in implementation PR descriptions.
2. Grounded Moves uses model-driven native tool use as the primary production chat orchestration path, with the legacy regex path available only as an explicit rollout fallback while the flag exists.
3. The chat runtime executes validated model-requested tool calls through `ToolExecutor`, returns typed tool results into the loop, and terminates with either a final model-composed answer or a documented graceful failure.
4. Final assistant answers on the primary runtime path are model-composed from grounded tool context and no longer rely on digest-summary short-circuit behavior.
5. The primary runtime path no longer uses the legacy 350-token final-answer ceiling and instead uses a configured chat-appropriate budget that supports grounded multi-paragraph answers with citations.
6. The primary runtime path preserves the assistant-message artifacts required by the current UI contract while the orchestration internals switch to native tool use.
7. The orchestration layer and all location-aware tools touched by this sprint use explicit location grounding, expose standardized `locationResolution` output, and no longer silently fall back to Newark-specific defaults such as `"Newark, NJ"`, `rows[0]`, or `1720`.
8. Ambiguous state-level requests follow the approved rule across turns: ask once, then default with disclosure, with clarification state persisted until resolved or superseded.
9. Sprint 3 produces the typed non-streaming event-model support seam that Spec 4 will extend for streaming transport, without introducing streamed delivery in this sprint.
10. Required tests for this sprint pass at every level the spec calls for: unit, integration, and E2E, including invalid-tool recovery, degraded tool failures, clarification-state persistence, disclosed fallback behavior, assistant-artifact continuity, safety-bound termination, and session continuity.
11. CI is green for the Sprint 3 change set, including `npm run lint`, `npm run typecheck`, unit tests, integration tests, E2E tests, and a successful production build.
12. Tool-use and location-grounding telemetry is emitted for the required success and failure paths and remains visible through existing development and production wiring without logging full conversation contents.
13. Documentation is updated where touched by the sprint, including README env-var notes, the required ADR for the model boundary, and a smoke-test runbook at `docs/operations/smoke-tests/03-native-tool-use-model-composed-responses-and-core-location-grounding.md`.
14. No streaming transport, budget domain capability, national resource expansion, or broader telemetry productionization work is introduced in Sprint 3 beyond the explicit support seams called for in Spec 3.

## Rollout Plan

### Feature Flags and Rollout Safety
1. Add a native-tool-use rollout flag in the first implementation slice so the new orchestration path can be enabled progressively without removing the legacy regex flow during validation.
2. The recommended kill switch behavior is to disable the native-tool-use path and fall back to the current regex-led orchestration path while preserving session history, chat availability, and the existing non-streaming route behavior.
3. Safe fallback behavior when the flag is off or the tool-use path is degraded is: chat still renders and answers requests through the legacy path, while native tool-use loops, clarification-state persistence specific to Spec 3, standardized location-resolution disclosures, and any new assistant-artifact shapes are withheld or degraded safely rather than failing partially.

### Telemetry to Watch
1. Native tool-use request counts, tool-use validation failures, and safety-bound terminations.
2. Tool execution failure rates and final-answer composition failure rates after the new path is enabled.
3. Clarification prompt frequency, disclosed metro fallback frequency, and silent-default-prevention path counts.
4. Assistant-artifact persistence or rendering regressions after the primary orchestration path switches from regex selection to tool use.
5. Chat-route error rates or latency regressions after the primary orchestration path switches from regex selection to tool use.

### Rollback Criteria
1. The primary chat route stops producing final answers reliably or enters repeated tool-loop failure states.
2. Invalid model-requested tool inputs or unregistered tool names surface as route failures instead of typed degraded responses.
3. Clarification prompts repeat incorrectly across turns or refreshes, or disclosed fallback behavior uses the wrong market.
4. Assistant-message artifacts or cards required by the current UI contract disappear, stop persisting, or render inconsistently on the native-tool-use path.
5. Any touched location-aware path silently falls back to Newark-specific defaults or hides the resolved market from the user.
6. The native-tool-use path materially degrades chat latency, stability, or session continuity relative to the legacy flow.

### Release Verification
1. Run the Sprint 3 smoke-test script before calling the feature MVP-complete.
2. Run a successful production build and the full release gate before calling the feature MVP-complete.
3. Verify the rollout flag can switch between native tool use and the legacy regex path without breaking the home-page chat surface.
4. Verify explicit-city, ambiguous-state, repeated-state, invalid-tool, degraded-tool, assistant-artifact continuity, and session-continuity journeys against Spec 3 acceptance criteria.
5. Verify the primary runtime path produces model-composed grounded answers with citations and no digest-summary short-circuit on the enabled path.
6. Verify the typed non-streaming event seam is present and sufficient for the next streaming sprint without changing the delivered response transport in Sprint 3.