# Sprint Plan 07C: Retrieval Truthfulness And Naming Cleanup

## Goal
Make retrieval behavior honest about the fact that the current implementation is a local seed-backed fallback, expose a stable retrieval-mode contract that a real production adapter can satisfy later, and keep operators able to diagnose which retrieval path ran.

## Tasks
1. Task 1, size S: Replace the misleading seed-backed retrieval adapter name with one that describes what the implementation actually does today, without changing the surrounding tool name or widening the chat surface. Implements Spec 7 requirements 23, 24, 27 and acceptance criteria 5, 8.
2. Task 2, size S: Extend the retrieval port contract so each retrieval execution returns both chunks and a truthful mode or disclosure describing whether the results came from local seed fallback or a real external backend. Implements Spec 7 requirements 23, 25, 26 and acceptance criterion 5.
3. Task 3, size S: Surface retrieval-mode metadata through the retrieval tool result so presenters, operators, and later UI work can distinguish fallback behavior without inspecting implementation details. Implements Spec 7 requirement 26 and acceptance criteria 5, 9.
4. Task 4, size S: Emit structured retrieval telemetry containing mode selection and result count, but not chunk content or user-entered query text, so the fallback path remains diagnosable in local and production-like environments. Implements Spec 7 observability requirement 2 and acceptance criteria 9, 10.
5. Task 5, size S: Add focused tests that cover truthful fallback behavior and the port boundary expected of a future production retrieval adapter. Implements Spec 7 requirement 28 and acceptance criteria 11, 13.

## Dependencies
1. Approved umbrella Sprint Plan 7 at `docs/sprints/07-hardening-and-production-readiness-tracks.md` and approved Spec 7 at `docs/specs/07-hardening-and-production-readiness-tracks.md`.
2. Track 7A telemetry composition is already available, so 7C retrieval-mode diagnostics can reuse the existing telemetry seam rather than adding a second logging mechanism.
3. The existing retrieval tool contract remains the owning runtime seam for this slice; Track 7C hardens that seam rather than introducing a new retrieval workflow.

## Risks & Mitigations
1. Risk: Renaming the adapter causes broader chat regressions despite the implementation staying local.
Mitigation: Keep the rename local to the retrieval port and tool seam, then validate with focused repository and tool tests.

2. Risk: Retrieval diagnostics expose chunk content or user-entered retrieval queries.
Mitigation: Emit only retrieval mode and result count in telemetry, never the query text or chunk payload.

3. Risk: The retrieval contract becomes overfit to local seed behavior and blocks a real production backend later.
Mitigation: Keep the port centered on generic mode, disclosure, and chunk payloads that either local or external adapters can satisfy.

## Definition Of Done
1. The local retrieval implementation is no longer named as though it were Supabase-backed.
2. Retrieval results disclose whether they came from local seed fallback or a real external backend.
3. Retrieval-mode selection is observable through structured telemetry without logging sensitive content.
4. Focused tests cover both the truthful local fallback and a future production-adapter boundary.
5. Track 7C planning, ADR, and smoke-test notes are landed with the slice.

## Rollout Plan

### Feature Flags And Rollout Safety
1. This Track 7C slice is always-on because it makes current retrieval behavior more truthful rather than introducing a new retrieval backend.
2. The degraded path remains the existing local seed-backed retrieval implementation, now explicitly disclosed as approximate fallback behavior.

### Telemetry To Watch
1. Count of `chat.retrieval.executed` events by `retrievalMode`.
2. Result counts that suggest the fallback path is too sparse for common prompts.
3. Any future appearance of a production retrieval mode without the expected accompanying docs or rollout approval.

### Rollback Criteria
1. Retrieval-mode metadata breaks tool execution or chat flow.
2. Operators can no longer distinguish fallback retrieval from a production backend.
3. Retrieval diagnostics begin capturing user query text or chunk content.

### Release Verification
1. Verify the retrieval tool returns `local_seed_fallback` and the documented disclosure for no-match or local-match queries.
2. Verify the repository port still supports a future production adapter returning `external_production` mode.
3. Verify telemetry records retrieval mode and result count without logging chunk content.