# Sprint Plan 06: National Resource Framing and Expanded Location Coverage

## Goal
Ship nationally framed copy, location-aware support resources, and honest expanded fallback market coverage so Grounded Moves can support users in any U.S. market without silent Newark bias or misleading benchmark behavior.

## Tasks
1. Task 1, size S: Write the ADR for national support-resource mapping and fallback benchmark resolution if implementation introduces a durable mapping strategy or benchmark-resolution contract that later specs will depend on, documenting why curated mappings plus deterministic fallback were chosen and how benchmark-only fallback data stays distinct from exact live provider results. Implements Spec 6 architecture notes, ADR impact guidance, requirements 16, 18, 19, 44, 45 and acceptance criteria 4, 6, 10.
2. Task 2, size S: Finalize the rollout strategy for Spec 6 first, explicitly documenting that this sprint rides existing chat/runtime rollout controls unless implementation reveals a need for a dedicated feature flag, and define the safe degraded behavior for resource-hint or fallback-data failures before touching runtime code. Implements Spec 6 requirements 44, 45, 46, 47 and acceptance criteria 7, 10.
3. Task 3, size M: Extend the shared location fixture and deterministic mock harness so tests and local development can script exact-match markets, metro-fallback markets, unsupported markets, ZIP-specific resource matches, state-only fallback resources, and benchmark-only fallback cases without bespoke setup. Implements Spec 6 requirements 31, 32, 40, 41, 42, 43 and acceptance criterion 11.
4. Task 4, size M: Introduce the typed resource-hint contracts and application-layer resource generation use case, including typed categories, deterministic specificity ordering, fallback scope metadata, disclosure notes, and typed output that can render housing, workforce, community, and general reference links without `unknown` destructuring. Implements Spec 6 requirements 6, 7, 8, 9, 10, 11, 12, 13, 31, 32, 33, 34, 35 and data-contract expectations 1, 2, 3.
5. Task 5, size M: Implement the national support-resource mapping layer, starting with curated state- and metro-aware pathways for housing authority, Public Housing Authority lookup, workforce support, and 211/community support, plus explicit fallback to broader state or national links when exact local coverage is unavailable. Implements Spec 6 requirements 6 through 14, 27, 30, 37 and acceptance criteria 2, 7.
6. Task 6, size M: Expand and normalize the fallback benchmark dataset or seed layer to cover at minimum the approved national benchmark set for this spec, keep the data checked into the repo for tests and mock mode, and prepare indexed or keyed lookup structures so unsupported-market resolution does not rely on ad hoc scans or implicit defaults. Implements Spec 6 requirements 15, 17, 18, 19, 20, 21, 31, 32 and acceptance criteria 3, 4, 5.
7. Task 7, size M: Replace implicit benchmark fallback behavior with an explicit fallback-market resolver that maps unsupported markets to documented metros or benchmark geographies, prevents `rows[0]` or Newark-style defaults, preserves benchmark-only fallback semantics, and surfaces location-resolution metadata for user-visible disclosure. Implements Spec 6 requirements 16, 17, 18, 19, 21, 22, 23 and acceptance criteria 3, 4, 5, 6.
8. Task 8, size M: Update location-aware tools and supporting benchmark/resource seams touched by this sprint so explicit resolved location context remains the only orchestration input, provider radius limitations stay documented, exact live provider results remain preferred when available, and fallback benchmark data is only exposed as disclosed supporting context when needed. Implements Spec 6 requirements 16, 22, 23, 24, 25, 26, 33 and acceptance criteria 6, 8.
9. Task 9, size M: Patch nationally framed copy and metadata across the surfaces scoped by the spec, including homepage-adjacent assistant framing, README, app metadata, Story-page framing, Resources-page framing, and any retained chat-support copy, so the retired Newark/student framing is fully removed from touched areas. Implements Spec 6 requirements 1, 2, 3, 4, 5 and acceptance criteria 1.
10. Task 10, size M: Integrate typed support-resource and benchmark disclosure artifacts into the assistant/result presentation path so the homepage chat can surface location-aware support links, benchmark disclosures, fallback notes, and prior-turn persistence without overwriting earlier assistant artifacts. Implements Spec 6 requirements 27, 28, 29, 30, 33, 34, 35, 37, 48 and presenter expectations plus acceptance criteria 2, 8.
11. Task 11, size S: Add telemetry for exact resource matches, fallback resource matches, unsupported markets, fallback benchmark selection, and degraded resource-generation paths while preserving the no-raw-transcript and no-raw-freeform-location privacy boundaries. Implements Spec 6 requirements 42, 43, 46, 47, observability requirements 1, 2, 3 and acceptance criteria 7, 10.
12. Task 12, size L: Add the full Spec 6 test matrix across unit, integration, and Playwright coverage using the shared location/resource harness, including exact-match markets, unsupported markets, benchmark-only fallback behavior, state-only resource fallback, copy-framing validation on touched homepage/Story/Resources surfaces, active-market switching, and degraded-resource recovery. Implements the full Spec 6 test plan and acceptance criteria 1 through 12.
13. Task 13, size S: Add sprint closeout documentation, including README/env updates if needed, the ADR reference when required, and a smoke-test runbook for non-Newark markets, unsupported-market fallback disclosure, state-level support-resource fallback, active-market switching, and degraded-resource recovery. Implements Spec 6 requirement 49 and acceptance criteria 12, 13.

## Dependencies
1. Approved Spec 6 at `docs/specs/06-national-resource-framing-and-expanded-location-coverage.md` and the approved planning baseline in `docs/PIVOT-PLAN.md`.
2. Specs 3, 4, and 5 remain prerequisites because Spec 6 assumes typed location grounding, streaming/result-presentation behavior, and the final native-tool-use runtime are already stable.
3. Existing location-resolution contracts and shared chat harnesses from earlier specs must remain available because this sprint builds on them rather than introducing a second location model.
4. Any fallback benchmark data source or curated support-resource mapping file introduced by this sprint must be checked into the repo and available to tests, builds, and mock mode without new external-service dependencies.
5. The current fallback benchmark seeds and supporting lookup seams must be modifiable without reopening Spec 7 retrieval-renaming or broader data-platform work.
6. Supporting UI surfaces such as homepage chat artifacts, homepage-adjacent assistant framing, Story framing, and Resources framing must remain stable enough to accept copy and typed-support updates without reopening broader UI decomposition work reserved for Spec 7.

## Risks & Mitigations
1. Risk: The sprint reintroduces silent location drift by mixing exact live results, benchmark fallback data, and support-resource links without a single explicit precedence rule.
Mitigation: Land the typed resource-hint and fallback-benchmark contracts first, require deterministic specificity ordering in unit tests, and fail tests if exact live provider results are replaced by benchmark fallback data.

2. Risk: Curated location-to-resource mappings become opaque, stale, or impossible to audit later.
Mitigation: Capture the mapping strategy in an ADR if the implementation introduces a durable contract, keep mappings typed and checked into the repo, and require disclosure notes for fallback scopes.

3. Risk: Copy cleanup partially renames the product but leaves user-visible Newark/student framing on Story, Resources, or assistant-adjacent surfaces.
Mitigation: Treat touched copy surfaces as a first-class task with explicit E2E coverage rather than incidental cleanup.

4. Risk: Resource-hint generation failure or unsupported markets produce empty UI states or misleading “local” links.
Mitigation: Define degraded behavior before implementation, require broader state or national fallback guidance, and cover unsupported-market paths in integration and Playwright tests.

5. Risk: Expanded fallback benchmark coverage adds slow or overly broad seed scans that regress chat latency.
Mitigation: Favor indexed or keyed lookup structures over ad hoc full scans and make performance expectations part of the Definition of Done.

6. Risk: This sprint drifts into broader hardening work such as telemetry productionization, renderer decomposition, or moderation redesign.
Mitigation: Keep rollout, telemetry, and UI work tightly scoped to the seams required for Spec 6 and explicitly exclude Spec 7 tracks in PR scope checks.

## Definition of Done
1. Every Sprint 6 task maps back to approved Spec 6 requirements and those requirement references appear in implementation PR descriptions.
2. Grounded Moves surfaces national framing consistently across the copy and metadata touched by this sprint.
3. Support-resource generation is location-aware, typed, and no longer a static boilerplate set regardless of market.
4. Unsupported markets no longer fall back through Newark-specific assumptions, arbitrary `rows[0]` selection, or silent benchmark substitution.
5. The fallback benchmark dataset or seed layer covers at minimum the approved national benchmark set for this sprint and remains available to tests, builds, and mock mode.
6. Fallback benchmark resolution maps to an explicit metro or benchmark geography with readable disclosure and preserves benchmark-only semantics when exact live provider results exist.
7. Resource-hint selection uses the documented specificity order of ZIP/local, then city or metro, then state, then national fallback.
8. Provider location and radius limitations touched by this sprint remain documented and honestly disclosed when relevant.
9. Assistant artifacts preserve prior-turn support links and benchmark disclosures instead of overwriting earlier results.
10. Required tests for this sprint pass at every level the spec calls for: unit, integration, and E2E, including exact-match markets, unsupported markets, benchmark-only fallback behavior, active-market switching, degraded-resource recovery, and national copy framing on touched surfaces.
11. CI is green for the Sprint 6 change set, including `npm run lint`, `npm run typecheck`, all required tests, a successful production build, and the full release gate.
12. Rollout behavior is explicit: either a dedicated feature flag exists for this sprint or the sprint documents why existing controls are sufficient and what the safe degraded path is.
13. Telemetry is emitted for the required resource and fallback events without logging raw transcript content or raw freeform location strings when structured metadata is sufficient.
14. Documentation is updated where touched by the sprint, including README notes, any required ADR, and a smoke-test runbook for national location coverage and resource fallback behavior.
15. No moderation redesign, telemetry fan-out productionization, renderer decomposition, retrieval renaming, or broader serverless-hardening work is introduced beyond the seams explicitly required by Spec 6.

## Rollout Plan

### Feature Flags and Rollout Safety
1. The default Sprint 6 plan is to ride the existing chat/runtime rollout controls rather than add a new end-user-facing feature flag, because this work mainly strengthens copy, support-resource generation, and fallback honesty within already-enabled location-aware flows.
2. If implementation reveals a high-risk coupling between new support-resource generation and existing chat output, introduce a narrow internal flag for resource-hint generation only; otherwise, keep the rollout surface small and rely on the safe degraded path.
3. The recommended kill-switch or degraded behavior is: preserve chat availability and core grounded answer composition, suppress local resource-hint enrichment when it fails, and fall back to broader state or national support guidance with explicit disclosure.

### Telemetry to Watch
1. Exact resource-match rate, fallback resource-match rate, and unsupported-market surfaced rate.
2. Fallback benchmark selection rate, benchmark resolution kinds, and any spike in degraded resource-generation usage.
3. Evidence that exact live provider results are being displaced by fallback benchmarks when they should not be.
4. Copy- or support-surface regressions reported through smoke testing or E2E failures on touched national-framing surfaces.

### Rollback Criteria
1. Non-Newark markets still receive Newark-specific support links, benchmark defaults, or arbitrary first-row fallback behavior.
2. Exact live provider results are silently replaced by benchmark fallback data.
3. Unsupported-market or degraded-resource paths produce empty, misleading, or broken chat/UI states.
4. New support-resource artifacts overwrite prior assistant artifacts or detach from the assistant turn that produced them.
5. Telemetry or logs begin recording raw transcript content or raw freeform location strings beyond the approved structured metadata boundary.

### Release Verification
1. Run the Sprint 6 smoke-test script before calling the feature MVP-complete.
2. Run a successful production build and the full release gate before calling the feature MVP-complete.
3. Verify a non-Newark market such as Phoenix, AZ or Austin, TX receives market-aware support resources and benchmark disclosures.
4. Verify an unsupported market path discloses the selected fallback metro or benchmark geography explicitly.
5. Verify a market with exact live provider coverage still prefers exact live results while using fallback benchmark data only as disclosed supporting context when needed.
6. Verify a state-only market path still produces useful state-level support-resource fallback without pretending to have exact local matches.
7. Verify switching the active market updates future support links and benchmark disclosures without mutating prior assistant artifacts.
8. Verify degraded resource-generation paths fall back to broader state or national guidance without breaking the homepage chat flow.
9. Verify touched homepage-adjacent assistant framing, Story, Resources, and support-adjacent surfaces no longer show retired Newark/student framing.