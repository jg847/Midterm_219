# Sprint Plan 07B: Moderation Redesign

## Goal
Replace the regex-only chat gate with a layered moderation pipeline that preserves existing route-level enforcement points, keeps the user-facing refusal contract stable, and establishes typed stage outcomes that later moderation slices can extend.

## Tasks
1. Task 1, size S: Finalize the Track 7B rollout note, explicitly documenting that the first moderation redesign slice is always-on by design, preserves the current refusal copy, and degrades to the most truthful lower-capability path if a future moderation stage is disabled or unavailable. Implements Spec 7 requirements 16 through 22 and acceptance criteria 4, 9, 10.
2. Task 2, size S: Replace the single-function moderation gate with a typed chain that can pass, transform, or block a request while keeping the route adapter contract stable for current callers. Implements Spec 7 requirements 17, 18, 19, data-contract expectation 2, and acceptance criteria 4.
3. Task 3, size S: Preserve current route-level enforcement by keeping moderation at the chat route boundary and proving blocked requests still return the same refusal shape and status code. Implements Spec 7 requirements 16, 21, 22 and acceptance criteria 4, 8.
4. Task 4, size S: Add focused unit and route tests that cover stage ordering, prompt-injection blocking, safety-term blocking, and transformed-input forwarding so later moderation slices extend shared harnesses rather than bespoke mocks. Implements Spec 7 test-plan requirements 1, 3, 5, 6 and acceptance criteria 11, 13.
5. Task 5, size M: Add later Track 7B follow-up stages for model-side refusal guidance and output-side scrubbing, reusing the typed outcome contract introduced in this slice instead of reopening the route contract. Implements Spec 7 requirements 18, 19, 20 and acceptance criterion 4.

## Dependencies
1. Approved umbrella Sprint Plan 7 at `docs/sprints/07-hardening-and-production-readiness-tracks.md` and approved Spec 7 at `docs/specs/07-hardening-and-production-readiness-tracks.md`.
2. Track 7A telemetry composition is already in place, so later Track 7B slices can emit moderation diagnostics through the hardened telemetry seam without leaking vendor details into application code.
3. The current chat route boundary in `src/app/api/chat/route.ts` must remain the enforcement entry point because this slice hardens the moderation internals rather than relocating the guardrail.

## Risks & Mitigations
1. Risk: The redesign changes refusal wording or status codes in subtle ways.
Mitigation: Keep the route adapter contract unchanged for blocked requests and cover it in route-level tests.

2. Risk: A typed moderation chain becomes an untested abstraction that later slices bypass.
Mitigation: Introduce a small stage contract now and require later stages to compose through it rather than adding parallel moderation paths.

3. Risk: Prompt-injection heuristics introduce false positives for normal housing or job questions.
Mitigation: Keep the first heuristic set narrow, focused on obvious instruction-overrides and prompt-reveal attempts, and expand only with explicit tests.

## Definition Of Done
1. The moderation module is a typed stage pipeline rather than one regex loop.
2. The chat route still blocks unsafe requests at the boundary with the same user-facing refusal contract.
3. Transformed moderation input can be forwarded without reopening the caller contract.
4. Focused moderation and route tests cover the first stage chain.
5. Track 7B planning, smoke-test, and ADR notes are landed with the slice.

## Rollout Plan

### Feature Flags And Rollout Safety
1. This first Track 7B slice is always-on by design because it preserves the existing route boundary and refusal contract rather than introducing a second moderation mode.
2. The safe degraded path for this slice is the existing route-level block behavior with the narrow stage set that ships here; later optional stages must degrade to pass-through rather than taking the chat route down.

### Telemetry To Watch
1. Moderation-stage block rates by stage name once moderation diagnostics are emitted in a later Track 7B follow-up.
2. Any spike in blocked requests for benign location, budget, or job prompts.
3. Any route-level increase in `400` chat responses after moderation changes land.

### Rollback Criteria
1. The redesigned moderation path weakens route-level blocking for clearly unsafe prompts.
2. The redesign changes the chat refusal shape or status code without an approved contract update.
3. Prompt-injection heuristics begin blocking normal grounded-planning prompts at a noticeable rate.

### Release Verification
1. Verify short messages still return `400` with `Message is too short.`.
2. Verify a clearly unsafe or prompt-injection-like message still returns `400` with `Message violates safety policy.`.
3. Verify benign grounded prompts continue through the existing chat orchestration seams unchanged.