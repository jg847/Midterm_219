# Sprint Plan 07E: Typed Tool-Result Presentation And UI Decomposition

## Goal
Complete the migration away from oversized `unknown`-driven tool-result rendering by moving the remaining transcript-facing tool variants onto typed presenter/view-model contracts while preserving the additive registry-driven architecture.

## Tasks
1. Task 1, size S: Introduce a small typed presenter contract for tool-result rendering so migrated variants stop parsing raw `unknown` payloads directly inside `ToolResultCards.tsx`. Implements Spec 7 requirements 36, 37, 39, 41 and acceptance criteria 7, 8.
2. Task 2, size S: Add a presenter registry that resolves tool renderers additively by tool name and falls back to the legacy renderer registry during migration. Implements Spec 7 requirements 39, 41 and acceptance criteria 7, 8.
3. Task 3, size S: Migrate all current transcript-facing tool variants onto typed presenters: retrieval, budget, opportunity feed, job digest, housing digest, UI digest, job search, housing search, and dataset query. Implements Spec 7 requirements 36, 37 and acceptance criteria 7, 11.
4. Task 4, size S: Keep transcript behavior unchanged by leaving artifact ordering and `ToolResultCards` list rendering intact while swapping only the internal rendering path for migrated variants. Implements Spec 7 requirement 38 and acceptance criteria 8, 13.
5. Task 5, size S: Add focused presenter and renderer tests that validate typed view-model mapping and visible transcript output for the migrated variants, and document why browser-level coverage adds little additional confidence for this internal decomposition slice. Implements Spec 7 test-plan requirements for 7E and acceptance criteria 11, 13.

## Dependencies
1. Approved umbrella Sprint Plan 7 at `docs/sprints/07-hardening-and-production-readiness-tracks.md` and approved Spec 7 at `docs/specs/07-hardening-and-production-readiness-tracks.md`.
2. Track 7C retrieval-mode disclosure is already present, so the retrieval presenter can preserve that contract rather than reinventing it.
3. Track 7D is already stabilizing shared operational seams, so 7E can stay focused on typed presentation rather than backend correctness.

## Risks & Mitigations
1. Risk: Renderer decomposition becomes a big-bang rewrite of `ToolResultCards.tsx`.
Mitigation: Keep a typed presenter registry plus legacy fallback so migration stays additive.

2. Risk: Typed presenters regress visible transcript behavior for migrated tools.
Mitigation: Cover both view-model mapping and static renderer output with focused tests.

3. Risk: Presenter logic starts pulling provider or domain behavior into the UI layer.
Mitigation: Keep presenters limited to payload-to-view-model shaping only.

## Definition Of Done
1. `ToolResultCards.tsx` renders supported tool variants through typed presenters rather than a large unknown-destructuring registry.
2. Each current transcript-facing tool variant has an explicit typed view-model contract.
3. The registry remains additive and can still fall back to a generic default renderer for future unknown tool names.
4. Focused tests cover typed presenters and visible renderer output across the supported tool set.
5. Track 7E planning, ADR, and smoke-test notes are landed with the completed slice.

## Rollout Plan

### Feature Flags And Rollout Safety
1. This first Track 7E slice is always-on because it preserves the existing transcript container and only swaps internal rendering for selected variants.
2. The degraded path is the generic default renderer for an unknown or future tool name whose presenter has not been registered yet.

### Telemetry To Watch
1. Existing UI or route tests that cover transcript behavior for tool results.
2. Any rendering regressions on migrated variants in homepage chat transcripts.
3. Future debug or error telemetry for tool-result rendering failures once a dedicated UI diagnostics seam exists.

### Rollback Criteria
1. Typed presenters regress visible transcript output for any migrated tool-result variant.
2. Migration stops being additive and begins forcing a whole-file rewrite for each new variant.
3. Presenter mapping starts requiring provider-specific logic inside the UI layer.

### Release Verification
1. Verify presenter tests pass for each typed variant.
2. Verify `ToolResultCards` static render tests still show the expected retrieval, digest, search, budget, opportunity, and dataset content.
3. Verify the generic default renderer still handles unknown tool names without breaking transcript layout.

## Browser-Level Coverage Justification
1. This slice changes payload-to-view-model shaping inside the existing transcript container but does not alter route orchestration, DOM ordering, keyboard flow, or interactive controls.
2. Static transcript rendering plus existing chat-surface coverage provides nearly all confidence for this slice because the browser would exercise the same container markup path without additional user interaction logic.
3. A dedicated Playwright lane would be justified only if a later 7E slice changes live transcript interactions, focus behavior, or accessibility semantics beyond the current static card composition.