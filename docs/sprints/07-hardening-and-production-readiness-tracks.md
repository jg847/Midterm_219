# Sprint Plan 07: Hardening And Production Readiness Tracks

## Goal
Execute Spec 7 as a controlled hardening program that improves observability, moderation, retrieval truthfulness, serverless-safe operational state, and typed tool-result presentation without collapsing those concerns into one risky omnibus implementation sprint.

This sprint plan is intentionally an umbrella plan, not a single implementation slice. Approved execution happens through independently shippable Track 7A through 7E workstreams, each with its own rollout path, degraded behavior, telemetry checks, and closeout gate.

## Execution Strategy
1. Treat Track 7A through 7E as sequential or partially parallel slices under one approved planning umbrella, not as one merge train or one release candidate.
2. Require each track to produce a track-specific sprint-plan supplement or equivalent planning artifact, plus a rollout note, before coding begins, even when the work remains in the same branch or milestone.
3. Preserve the existing chat/runtime contract while hardening internals under stable ports, typed contracts, and documented degraded paths.
4. Use Track 7A to establish the strongest observability baseline first so later hardening slices can be diagnosed with production-like telemetry rather than console-only traces.
5. Treat Track 7E as a later-stage presentation hardening slice by default; only allow an earlier pilot if it stays contract-compatible with the current transcript and tool-result schema and does not block Tracks 7A through 7D.

## Tasks
1. Task 1, size S: Freeze the Spec 7 execution model in writing by documenting that this plan is an umbrella plan and that no Track 7 implementation slice may ship as part of a single omnibus sprint scope. Implements Spec 7 functional requirements 1 through 6, dependency view, and acceptance criteria 1, 2, 8.
2. Task 2, size S: Finalize the Track 7 planning framework once for all tracks, including the required per-track sprint-plan supplement template, feature-flag or kill-switch decision template, degraded-behavior template, telemetry health-signal template, rollback-criteria template, and test-plan section template so later track slices do not improvise planning rules. Implements Spec 7 functional requirements 2, 5, 6, test-plan expectations, and acceptance criteria 9, 10.
3. Task 3, size S: Audit the existing shared chat/runtime harness and fixture inventory, document which fixtures already cover telemetry, moderation, retrieval, operational-state, and tool-result rendering seams, and record the reusable fixture gaps each track must close before its track-specific sprint-plan supplement is approved. Implements Spec 7 functional requirements 7, 8, test-plan minimum coverage requirements 1, 2, 5, 6, and acceptance criterion 11.
4. Task 4, size M: Execute Track 7A first by introducing the production telemetry composition design, including `TelemetryPort`-safe fan-out wiring, sink-selection rules by environment, and explicit console-only degradation when production telemetry is unavailable. Implements Spec 7 requirements 9 through 15, architecture notes, data-contract expectation 1, and acceptance criteria 3, 8.
5. Task 5, size S: Add the ADR and operations notes required by Track 7A if the implementation introduces a durable telemetry fan-out strategy or environment-specific sink-composition contract that later tracks will depend on. Implements Spec 7 ADR impact guidance, operations documentation expectations 1, 2, 3, and acceptance criterion 12.
6. Task 6, size M: Define and then implement Track 7B as a layered moderation pipeline that preserves current route-level enforcement points, introduces typed moderation-stage outcomes, and emits structured moderation diagnostics through the hardened telemetry path without logging avoidable sensitive content. Implements Spec 7 requirements 16 through 22, security requirement 1, data-contract expectation 2, and acceptance criteria 4, 8.
7. Task 7, size M: Define and then implement Track 7C retrieval truthfulness cleanup by separating seed-backed fallback behavior from any real retrieval adapter path, making repository naming honest, preserving the retrieval port boundary, and ensuring docs and operators can tell which mode is active. Implements Spec 7 requirements 23 through 28, privacy requirement 2, data-contract expectation 3, and acceptance criteria 5, 8.
8. Task 8, size M: Define and then implement Track 7D operational-state hardening by externalizing or explicitly local-scoping shared cache and rate-limit state, auditing adjacent in-process maps, and introducing durable operational-store abstractions only where correctness truly depends on cross-request shared state. Implements Spec 7 requirements 29 through 35, reliability requirements 1, 2, 3, security requirement 2, data-contract expectation 4, and acceptance criteria 6, 8.
9. Task 9, size M: Define and then implement Track 7E typed tool-result presentation by extracting typed presenter or view-model contracts, migrating the highest-risk renderer slices out of `ToolResultCards.tsx`, and preserving transcript artifact ordering and accessibility throughout the migration. Implements Spec 7 requirements 36 through 41, accessibility requirements 1, 2, security requirement 3, data-contract expectation 5, 6, and acceptance criteria 7, 8.
10. Task 10, size L: Add the cumulative Spec 7 verification matrix across unit, integration, Playwright, and smoke-test coverage, ensuring each track has deterministic local substitutes, degraded-path coverage, shared-harness reuse, and explicit browser-level justification when Playwright coverage is intentionally omitted for a narrow internal slice. Implements the full Spec 7 test plan, minimum coverage requirements, and acceptance criteria 9, 11, 13.
11. Task 11, size S: Complete sprint closeout documentation after each track lands, including any required ADRs, architecture or operations note updates, smoke-test runbooks, and release-verification notes so the hardening program remains auditable one track at a time. Implements Spec 7 operations documentation expectations 1, 2, 3 and acceptance criterion 12.

## Dependencies
1. Approved Spec 7 at `docs/specs/07-hardening-and-production-readiness-tracks.md` and the approved planning baseline in `docs/PIVOT-PLAN.md`.
2. Specs 1 through 6 remain prerequisites because Sprint 7 hardens the already-shipped chat-first, session-aware, native-tool-use, streaming, budget, and national-location behavior rather than replacing it.
3. The existing `TelemetryPort`, retrieval repository port, moderation entry points, rate-limit and guarded-fetch seams, transcript artifact pipeline, and shared mock harness must remain available because Track 7 work hardens those seams rather than bypassing them.
4. Any production telemetry sink, durable operational backing store, or truthful retrieval adapter introduced by this program must support a deterministic local or test substitute before the corresponding track can be called complete.
5. No Track 7 slice may depend on reopening the completed Sprint 6 national resource or benchmark work except for compatibility adjustments explicitly justified in the track plan.
6. Track 7A should land before or alongside Track 7B if moderation-stage telemetry is expected to be part of the redesigned policy pipeline.
7. Track 7D should not lock in a durable operational-store abstraction that conflicts with the direction chosen for Track 7A or the already-shipped session-storage strategy from Spec 2.
8. Track 7E must preserve compatibility with the current tool-result artifact schema unless a typed presenter contract change is approved and documented first.
9. Track 7E should normally begin only after Tracks 7A through 7C have stabilized the telemetry, moderation, and contract seams it depends on, unless an earlier pilot is explicitly scoped to remain schema-compatible.

## Risks & Mitigations
1. Risk: The team treats this umbrella plan like a single implementation sprint and starts parallel code changes across all five tracks, creating broad regressions and impossible rollback scope.
Mitigation: Freeze the one-track-at-a-time execution rule in planning, require per-track sprint-plan supplements and rollout notes before coding, and fail scope review if one PR mixes multiple Track 7 concerns without explicit approval.

2. Risk: Telemetry hardening lands too late, leaving moderation, retrieval, or operational-state regressions hard to diagnose.
Mitigation: Prioritize Track 7A first and make its production-like diagnostics a prerequisite for higher-risk tracks when practical.

3. Risk: Moderation redesign weakens route-level protections or changes refusal behavior in subtle ways.
Mitigation: Preserve current entry points, require typed stage outcomes, compare old and new refusal behavior in integration coverage, and keep rollback criteria specific to moderation regressions.

4. Risk: Retrieval truthfulness cleanup drifts into a full retrieval-platform rewrite.
Mitigation: Keep Track 7C scoped to truthful naming, adapter boundaries, and explicit mode disclosure unless a real backend has already been approved separately.

5. Risk: Serverless-state hardening introduces complex shared-state abstractions that regress local development or duplicate the session-storage solution already shipped in Spec 2.
Mitigation: Externalize only the operational seams whose correctness truly depends on shared state, keep local fallbacks explicit, and document the boundary between session storage and operational state clearly.

6. Risk: Tool-result renderer cleanup becomes a big-bang UI rewrite that destabilizes the homepage transcript.
Mitigation: Migrate one renderer family at a time behind typed presenter contracts, preserve artifact ordering tests, and keep Playwright coverage on the homepage transcript path as a release gate.

7. Risk: Documentation and smoke-test updates slip until the end, leaving later tracks hard to audit.
Mitigation: Treat ADR, operations-note, and smoke-test updates as part of each track’s done state rather than one final cleanup step.

## Definition Of Done
1. Sprint 7 is executed as independent Track 7A through 7E slices rather than one omnibus implementation sprint.
2. Each track has an approved sprint-plan supplement plus an explicit rollout note covering feature flags or kill-switches, degraded behavior, telemetry to watch, rollback criteria, and release verification.
3. Shared harness and reusable fixtures are extended where needed instead of proliferating bespoke mocks for each hardening slice.
4. Track 7A leaves the runtime with a production-ready telemetry composition path and safe console-only degradation.
5. Track 7B leaves moderation layered, typed, and no weaker than the current route-level controls.
6. Track 7C leaves retrieval naming and behavior truthful about seed-backed fallback versus real external retrieval.
7. Track 7D removes or explicitly local-scopes production-relevant in-process operational state that would otherwise misbehave under horizontal scale.
8. Track 7E leaves tool-result rendering on a documented typed migration path away from oversized `unknown` destructuring.
9. Grounded chat behavior, streaming behavior, budget behavior, and national-location behavior remain intact throughout the hardening program.
10. Required tests pass for each track at the levels the spec calls for, including degraded-path coverage and browser-level verification where applicable.
11. CI is green for each Track 7 slice, including lint, typecheck, required unit and integration coverage, production build verification, and any required Playwright or smoke-test gates for that slice.
12. ADRs, architecture notes, operations notes, and smoke-test runbooks are updated whenever a track introduces a durable architectural or operational constraint.
13. No track silently introduces a second orchestration model, a parallel transcript contract, or a regression in existing user-visible product behavior.

## Rollout Plan

### Feature Flags And Rollout Safety
1. This umbrella plan does not introduce one shared Sprint 7 feature flag because the approved spec requires track-specific rollout decisions rather than one coarse switch for unrelated hardening concerns.
2. Every Track 7 implementation slice must record whether it uses a dedicated flag, rides an existing control, or is always-on by design, and must justify that decision before code review.
3. The default safe behavior across all tracks is: preserve core chat availability and current grounded answers, degrade to the most truthful lower-capability path available, and avoid taking the chat route down for a non-critical hardening dependency failure.
4. No track may assume another track’s kill-switch behavior; degradation and rollback must be documented per track.

### Telemetry To Watch
1. Track 7A: sink activation by environment, fan-out success and failure rates, and any increase in telemetry-related chat latency.
2. Track 7B: moderation-stage outcomes, reject or transform rates, and any spike in unexpected refusal or false-positive blocking behavior.
3. Track 7C: retrieval-mode selection, fallback-mode usage, and any mismatch between configured retrieval mode and surfaced operator or doc disclosures.
4. Track 7D: cache-store degradation, shared-state fallback usage, rate-limit decision consistency, and any increase in operational backing-store failures.
5. Track 7E: renderer mapping failures, presenter-contract mismatches, transcript artifact rendering regressions, and homepage transcript Playwright failures.

### Rollback Criteria
1. A Track 7 slice weakens current user-visible chat behavior or makes the route less reliable than the pre-track baseline.
2. A non-critical telemetry, moderation, retrieval, cache, rate-limit, or renderer dependency can take down the chat route instead of degrading safely.
3. Shared harness reuse is bypassed and the track becomes dependent on bespoke mocks that later slices cannot trust.
4. Docs or telemetry overclaim production capability that the current implementation does not actually provide.
5. A track introduces a contract-breaking change to transcript artifacts, moderation outcomes, or operational-state behavior without an approved migration note.

### Release Verification
1. Validate each Track 7 slice independently before starting the next high-risk track when practical.
2. Run the required smoke tests and CI gates for the specific track being shipped rather than waiting for the end of the whole program.
3. Verify the chat route still degrades safely when the new hardening dependency for that track is disabled or unavailable.
4. Verify local and test environments still have deterministic substitutes for any new production adapter or backing store introduced by the track.
5. Verify homepage chat, transcript continuity, and existing tool-result rendering remain stable while Track 7 work is in flight.
6. Do not begin implementation for a Track 7 slice until its sprint-plan supplement, test scope, and rollout note have all been reviewed against Spec 7.
