# Spec 07: Hardening And Production Readiness Tracks

## Context & Motivation
Grounded Moves now has the core pivot behavior in place: chat-first routing, browser-scoped session continuity, native tool use, streaming answers, a first-class budget capability, and nationally framed location/resource behavior. The remaining gap from the approved pivot plan is no longer core product behavior. It is the set of structural and operational seams that still behave like a prototype even though the user-facing flows are now credible.

This spec covers the remaining parts of Pivot Problem 9 after Spec 2 handled browser session durability and after Specs 3 through 6 stabilized the main chat/runtime path. The goal is to harden the system without reopening the completed product pivots.

The approved pivot plan explicitly requires that Spec 7 not be treated as one omnibus implementation sprint. This is one specification with independently shippable tracks, each expected to get its own sprint plan, rollout path, and acceptance gate.

The current repo evidence for this spec is concrete:
1. `TelemetryPort` exists, but runtime wiring still terminates at `ConsoleTelemetry` and there is no production fan-out path.
2. `ensureMessageAllowed` is still a narrow regex check rather than a layered moderation pipeline.
3. `SupabaseRetrievalRepository` is still a local substring fallback over seed data rather than a truthful production adapter.
4. `guardedFetch` and `ApiRateLimiter` still depend on in-process `Map` state for cache and rate-window behavior.
5. `ToolResultCards.tsx` still centralizes many tool renderers through `unknown` destructuring and a large stringly registry rather than a typed presenter/view-model pipeline.

## Product Goal
Ship the remaining production-readiness and maintainability work without destabilizing the completed conversational product. The result should preserve current user-facing behavior while making the system more truthful, observable, serverless-safe, and maintainable.

## Tracks
This spec is divided into five independently shippable tracks.

### Track 7A: Telemetry Productionization
Move telemetry from console-only development behavior to a real production-ready adapter strategy with optional fan-out while preserving the current `TelemetryPort` boundary.

### Track 7B: Moderation Redesign
Replace the current regex gate with a layered chain-of-responsibility moderation pipeline that can block, transform, or pass requests and outputs while preserving existing route-level enforcement points.

### Track 7C: Retrieval Truthfulness And Naming Cleanup
Make retrieval behavior honest about what it is doing today, distinguish seed-backed local fallback from real retrieval, and define the contract for a real production retrieval adapter.

### Track 7D: Serverless-Safe Operational State Beyond Sessions
Remove or isolate remaining in-process mutable runtime state for request throttling, fetch caching, and adjacent operational maps that would behave incorrectly under serverless cold starts or horizontal scale.

### Track 7E: Typed Tool-Result Presentation And UI Decomposition
Replace oversized `unknown`-driven renderer logic with typed presenter/view models and per-tool renderer components that preserve current transcript behavior while making future tool additions safer.

## Dependency View
The approved pivot plan does not require one fixed implementation order for every Track 7 slice, but the hardening work still has architectural dependencies that should guide sprint planning.

1. Track 7A can proceed first because it primarily formalizes an existing port boundary and improves observability without changing user-facing product behavior.
2. Track 7B should follow once telemetry can capture moderation-stage outcomes through a stable production-ready path.
3. Track 7C can proceed in parallel with or immediately after Track 7A because its main risk is truthfulness and adapter naming rather than UI behavior.
4. Track 7D should follow after the intended operational backing-store direction is clear so rate limiting and shared caches do not fork across incompatible abstractions.
5. Track 7E should usually follow after Tracks 7A through 7C have stabilized the tool-result and moderation contracts it will need to present cleanly, though a narrow presenter pilot slice can begin earlier if it stays contract-compatible.

The key constraint is that no track should force a second orchestration model or a parallel transcript contract. Each track must harden the current runtime, not replace it.

## User Stories
1. As an operator, I want telemetry to reach real production sinks so rollout health is diagnosable outside local console logs.
2. As an operator, I want safety policy to be layered and testable so prompt-injection and harmful-input behavior is not governed by one brittle regex list.
3. As a developer, I want retrieval behavior to be honest about seed-backed fallback versus real retrieval so the system does not overclaim production capability.
4. As a developer, I want runtime cache and rate-limit behavior to survive cold starts and horizontal scale so production behavior does not depend on one process.
5. As a developer, I want typed tool-result presenters so adding or changing a tool does not require more `unknown` destructuring in one oversized component.
6. As a user, I want all of that hardening work to preserve the current grounded chat experience rather than reopen completed product pivots.

## Functional Requirements
1. Spec 7 must be executed as independent hardening tracks rather than as one unscoped implementation sprint.
2. Each Track 7 sprint plan must document its own feature-flag or kill-switch decision, degraded behavior, telemetry health signals, and rollback criteria.
3. Hardening work must preserve the current grounded chat, streaming, budget, and national location behavior already shipped through Specs 1 through 6.
4. No Track 7 change may silently degrade completed user-visible product capabilities in the name of cleanup.
5. Each Track 7 sprint plan must state explicitly whether it introduces a dedicated feature flag, rides an existing rollout control, or is always-on by design, and must justify that choice.
6. Each Track 7 sprint plan must define the safe degraded path if the track is disabled, partially configured, or experiencing a backing-service outage.
7. Any Track 7 slice that touches the chat runtime, transcript pipeline, moderation flow, or tool-result presentation must reuse the shared test harness and fixture direction established in earlier specs rather than introducing bespoke stubs per test file.
8. Any Track 7 slice that touches the chat runtime must document whether existing mock harness fixtures are sufficient or which new reusable fixtures need to be added for that track.

### Track 7A: Telemetry Productionization
9. The runtime must support a production telemetry adapter in addition to the current console adapter.
10. Telemetry wiring must remain behind `TelemetryPort` and must not leak vendor-specific APIs into application code.
11. The implementation must support fan-out behavior so one emitted event can reach console logging and one or more production sinks when configured.
12. If production telemetry is not configured, the runtime must degrade safely to console-only behavior without breaking chat flows.
13. Telemetry productionization must preserve the event names and structured attributes already emitted by Specs 2 through 6 unless a rename is explicitly versioned and documented.
14. Production telemetry wiring must avoid logging raw transcript text when structured metadata is already sufficient.
15. The app must document which telemetry sinks are active in local, test, and production-like environments.

### Track 7B: Moderation Redesign
16. The current moderation entry points must remain in place at route boundaries and orchestration seams while the internal policy implementation is redesigned.
17. Moderation must become a layered pipeline rather than a single regex function.
18. The pipeline must support at minimum input validation, prompt-injection or abuse heuristics, model-side refusal or safe-answer guidance, and output-side scrubbing where needed.
19. Each moderation stage must have a typed outcome contract that can pass, transform, or block a request.
20. Moderation outcomes must remain observable through structured telemetry without logging avoidable sensitive content.
21. The redesigned moderation path must preserve the existing user-facing refusal shape unless the track explicitly updates that contract.
22. The track must not weaken current abuse controls while refactoring them.

### Track 7C: Retrieval Truthfulness And Naming Cleanup
23. Retrieval code and documentation must distinguish clearly between seed-backed local fallback behavior and real external retrieval behavior.
24. The current `SupabaseRetrievalRepository` name must become truthful if the implementation is still seed-backed rather than Supabase-backed.
25. The retrieval port contract must remain stable enough that a real production retrieval adapter can replace the fallback implementation later.
26. Any placeholder or fallback retrieval behavior must disclose that it is approximate or local when surfaced to operators or docs.
27. Retrieval changes in this spec must not reopen the Story framing or national resource work already completed in Spec 6.
28. Tests must cover both truthful fallback behavior and the boundary expected of a real production retrieval adapter.

### Track 7D: Serverless-Safe Operational State Beyond Sessions
29. Remaining in-process mutable state used for fetch caching, rate limiting, or other cross-request operational behavior must be identified and either externalized or explicitly scoped to local-only behavior.
30. `guardedFetch` must no longer rely on process-local cache or rate-window state as the production source of truth.
31. `ApiRateLimiter` must no longer rely on process-local windows as the production source of truth.
32. If local-only in-memory fallbacks remain for development or tests, those fallbacks must be explicit and environment-scoped.
33. Production-like environments must use durable backing state for cross-request rate limiting and operational caches where correctness depends on shared state.
34. The track must audit adjacent module-level maps or mutable registries that affect correctness under horizontal scale.
35. This work must not reopen the already-shipped session-memory contract from Spec 2 except where a shared operational abstraction is required.

### Track 7E: Typed Tool-Result Presentation And UI Decomposition
36. Tool-result rendering must move toward typed presenter/view-model contracts rather than repeated `unknown` destructuring in one large component.
37. Each supported tool-result variant must have a typed renderer contract or presenter contract before new rendering logic is added.
38. The transcript artifact pipeline must preserve prior-turn artifacts and ordering while the renderer internals are decomposed.
39. Renderer decomposition must remain additive and registry-driven rather than devolving into one growing switch or conditional blob.
40. The UI decomposition must preserve accessibility, keyboard flow, and screen-reader readability already established in earlier specs.
41. The track must support a clear migration path from the current registry in `ToolResultCards.tsx` to per-tool renderer units without requiring a big-bang rewrite.

## Non-Functional Requirements

### Performance
1. Production telemetry fan-out must not materially regress chat latency under normal event volume.
2. The moderation pipeline must remain lightweight enough that route-level validation and streaming startup stay responsive.
3. Serverless-safe rate limiting and fetch caching must not introduce avoidable serialization or network overhead for local development.
4. Renderer decomposition must not regress transcript rendering performance for normal tool-result volumes.

### Reliability
1. No hardening-track change may introduce a single point of failure that takes down the chat route when a non-critical dependency is unavailable.
2. Degraded paths must be explicit for telemetry sinks, retrieval adapters, and operational backing stores.
3. Production adapters introduced by this spec must fail closed or degrade safely according to the risk of the capability.

### Accessibility
1. Any tool-result renderer decomposition must preserve WCAG 2.1 AA expectations already applied to the chat surface.
2. Moderation or output scrubbing must not produce broken ARIA state or unreadable transcript artifacts.

### Privacy
1. Production telemetry and moderation diagnostics must avoid raw transcript capture unless a track explicitly justifies and documents it.
2. Retrieval and operational-state hardening must not widen storage of user-entered location or budget details beyond current contracts.

### Security
1. Moderation redesign must preserve existing validation before model or provider execution.
2. Operational-state externalization must use existing environment-backed credentials and server-side boundaries only.
3. Renderer decomposition must not introduce unsafe URL or HTML rendering paths.

### Observability
1. Each Track 7 slice must emit enough structured telemetry or operational signals to verify healthy rollout without requiring transcript-level log capture.
2. Production telemetry, moderation outcomes, retrieval-mode selection, and operational-store degradation paths must remain diagnosable in local and production-like environments.
3. Renderer decomposition changes must preserve or improve debuggability of tool-result rendering failures without relying on ad hoc console-only traces.

## Out of Scope
1. New end-user product pivots beyond preserving current Grounded Moves behavior.
2. A larger real HUD/FMR ingestion pipeline beyond what a future data-focused follow-up might define.
3. Budget-domain redesign beyond compatibility updates needed by typed presenters or moderation.
4. A new chat orchestration model separate from the native tool-use path already shipped.
5. Reopening Sprint 6 national framing or location fallback behavior except for compatibility with these hardening tracks.
6. Full content-editorial expansion for Story or Resources beyond what truthful retrieval and renderer cleanup require.

## Architecture Notes
The local hypothesis for Spec 7 is narrow and falsifiable: the remaining pivot risk is no longer missing product behavior, but production correctness and maintainability concentrated in five identifiable seams. A cheap disconfirming check was reading the pivot plan and the current owning code paths. That check confirms that console-only telemetry, regex moderation, a misleading retrieval adapter name, process-local operational maps, and oversized `ToolResultCards` logic are still the dominant remaining hardening surfaces.

### Current Owning Surfaces
1. `src/frameworks/telemetry/ConsoleTelemetry.ts` and `src/app/api/chat/runtime.ts` currently own telemetry runtime wiring.
2. `src/application/chat/moderation.ts` currently owns message gating through a brittle regex list.
3. `src/frameworks/repositories/SupabaseRetrievalRepository.ts` currently owns retrieval behavior, but its implementation is still seed-backed local matching.
4. `src/frameworks/providers/http/guardedFetch.ts` and `src/frameworks/http/ApiRateLimiter.ts` still own cross-request runtime state through in-process maps.
5. `src/components/ToolResultCards.tsx` currently owns a large multi-tool renderer registry with repeated `unknown` destructuring.

### Proposed Implementation Shape
1. Keep each track behind the existing port boundary where one already exists.
2. Introduce new ports only where the repo currently lacks a stable abstraction for the hardening concern.
3. Land each track in small, independently shippable slices rather than one synchronized rewrite.
4. Preserve current user-visible contracts first, then refactor internals under those stable contracts.

### Ports And Adapters Direction
1. `TelemetryPort` remains the boundary for Track 7A; the main work is production adapters and fan-out composition.
2. Moderation likely warrants a small typed policy-stage contract rather than one monolithic function.
3. Retrieval should keep the current repository port while separating truthful local fallback from future production retrieval.
4. Serverless-safe state may require dedicated operational-store abstractions for rate-limit windows and shared caches.
5. Tool-result presentation should move presenter logic toward typed view models without moving provider logic into components.

### SOLID Emphasis
1. Single Responsibility: each hardening track must keep its own seam rather than becoming a cross-cutting omnibus rewrite.
2. Open/Closed: adding a telemetry sink, moderation stage, or tool renderer should extend a registry or stage list rather than rewrite core orchestration.
3. Liskov Substitution: local fallback adapters and production adapters must remain swappable behind stable contracts.
4. Interface Segregation: UI renderers, moderation stages, and operational stores should depend only on the data they actually need.
5. Dependency Inversion: application code should continue depending on ports and typed contracts rather than framework or vendor details.

### Pattern Fit
1. Observer fits telemetry fan-out.
2. Chain of Responsibility fits moderation.
3. Adapter fits production telemetry, retrieval, and operational-store integrations.
4. Strategy fits renderer registry and moderation-stage sequencing.
5. Factory Method fits environment-aware adapter composition in runtime setup.

### ADR Impact
This spec should produce ADRs when a track introduces a durable architectural constraint, especially for production telemetry fan-out, moderation pipeline structure, or durable operational-state backing stores.

## Data Model & API Contract Expectations
This spec spans five tracks, so it should not force one shared omnibus schema. It must, however, preserve typed contracts at each seam it hardens.

1. Track 7A should define typed telemetry-adapter and fan-out composition expectations that preserve the existing event shape while making sink selection explicit.
2. Track 7B should define a typed moderation-stage outcome contract that can represent pass, transform, reject, and scrub decisions without resorting to boolean-only gates.
3. Track 7C should define a truthful retrieval-mode contract or metadata flag that distinguishes local seed fallback from real external retrieval when that distinction matters to operators, docs, or presenters.
4. Track 7D should define explicit operational-store contracts for shared cache or rate-limit state if durable backing services are introduced.
5. Track 7E should define typed presenter or view-model contracts for each migrated tool-result variant before renderer decomposition is considered complete for that slice.
6. No Track 7 slice may replace a typed contract with broader `unknown` or vendor-native payloads at the application boundary in the name of expedience.

## Test Plan
Each Track 7 sprint plan must define its own full matrix, but the spec requires at minimum:

| Track | Unit | Integration | End-to-end |
|---|---|---|---|
| 7A Telemetry | adapter behavior, fan-out ordering, safe degradation | runtime wiring and event forwarding | smoke verification in production-like config |
| 7B Moderation | stage outcomes, chain ordering, transform/block semantics | route + orchestration enforcement | harmful or injection-like prompts through real browser flow |
| 7C Retrieval | truthful fallback behavior and adapter contract tests | retrieval pipeline with seed fallback and future adapter seams | user-visible retrieval-backed answers stay honest |
| 7D Operational State | cache/window store correctness and environment fallbacks | route behavior under shared backing stores | production-like throttling or degraded-cache verification |
| 7E Renderer Decomposition | typed presenter/view-model mapping per tool | transcript artifact rendering across multiple tool types | homepage chat transcript preserves behavior and accessibility |

### Minimum Coverage Requirements
1. Every track must preserve current user-visible chat behavior unless the track explicitly updates that contract.
2. Every production adapter introduced by Spec 7 must have a deterministic local or test substitute.
3. Every degraded path must have at least one integration test.
4. No track may be considered complete without either Playwright coverage or an explicit justification that browser-level coverage adds no additional confidence for that slice.
5. Tracks that touch the chat runtime, moderation path, or tool-result rendering must extend shared fixtures and harness helpers rather than embedding bespoke mocks in one-off tests.
6. Any new mock or fake introduced for a Track 7 slice must be reusable across later hardening tracks when it models a shared runtime seam.

### Operations Documentation Expectations
1. Each Track 7 sprint must update the relevant operations or architecture notes for its hardened seam before the slice is called MVP-complete.
2. Tracks that alter rollout behavior, degradation behavior, or operational dependencies must add or update a smoke-test runbook that verifies the new behavior in a production-like environment.
3. Tracks that introduce a durable architectural constraint should land the required ADR before or with the implementation slice that depends on it.

## Acceptance Criteria
1. Spec 7 is written and executed as independently shippable hardening tracks rather than one omnibus sprint.
2. The remaining prototype seams identified in the pivot plan are represented explicitly in track scope and requirements.
3. Telemetry productionization remains behind `TelemetryPort` and supports safe degradation.
4. Moderation redesign becomes layered and typed without weakening current guardrails.
5. Retrieval behavior and naming become truthful about seed-backed fallback versus real production retrieval.
6. Remaining production-relevant in-process operational state is either externalized or made explicitly local-only.
7. Tool-result presentation has a typed migration path away from oversized `unknown` destructuring.
8. Current grounded chat, budget, streaming, and national-location behavior remain intact throughout the hardening work.
9. Each Track 7 sprint plan includes rollout, degraded behavior, telemetry health signals, rollback criteria, and its own full test plan.
10. Each Track 7 sprint plan explicitly records the feature-flag or kill-switch decision for that slice and the safe degraded path when the slice is unavailable.
11. Shared harness and fixture expectations are preserved for any Track 7 slice that touches the chat runtime or transcript rendering path.
12. Operations notes, smoke-test guidance, and ADRs are updated where the track introduces a durable operational or architectural constraint.
13. CI remains green for each Track 7 implementation slice.

## Open Questions
1. Which production telemetry sink should be treated as the first-class target in Track 7A: direct Sentry integration only, or a fan-out baseline that includes Sentry plus console in production-like environments?
2. Should Track 7C stop at truthful local-fallback naming plus adapter contracts, or should it also include the first real retrieval backend if one is already approved?
3. For Track 7D, should shared operational state use Redis directly in each adapter or a small dedicated operational-store abstraction first?
4. For Track 7E, should the migration start with the highest-risk renderer slices such as housing, opportunity, and budget, or with a common presenter base contract first?
