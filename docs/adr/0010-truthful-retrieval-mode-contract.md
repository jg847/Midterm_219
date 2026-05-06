# ADR 0010: Truthful Retrieval Mode Contract

## Status
Accepted

## Context
Before Track 7C, the retrieval seam had two truthfulness problems:

1. the active adapter was named `SupabaseRetrievalRepository` even though it only filtered a local JSON seed with substring matching;
2. the retrieval contract returned only chunks, so downstream code had no explicit way to disclose whether those chunks came from a local fallback or a real external backend.

Spec 7 requires retrieval behavior and naming to be truthful about seed-backed fallback versus real production retrieval while preserving the current grounded chat experience.

## Decision
We will model retrieval as a repository contract that always returns:

1. `mode`
2. `disclosure`
3. `chunks`

The first Track 7C implementation uses:
1. adapter name: `LocalSeedRetrievalRepository`
2. retrieval mode: `local_seed_fallback`
3. disclosure: `Approximate local seed match, not live external retrieval.`

The contract also reserves a future production mode:
1. `external_production`

The retrieval tool passes that metadata through and emits telemetry containing mode and result count only.

## Consequences

### Positive
1. Retrieval behavior is now honest about what backend is actually serving results.
2. Later presenters or UI work can disclose fallback retrieval without hardcoding class names or implementation details.
3. A real production retrieval adapter can slot into the same port contract without reopening the chat route.

### Negative
1. Retrieval results now carry slightly more metadata that callers must preserve when truthfulness matters.
2. Future adapters must choose and document their retrieval mode explicitly rather than returning bare chunks.

## Alternatives Considered
1. Keep returning only chunk arrays and document the fallback behavior elsewhere.
Rejected because that leaves the runtime contract itself unable to distinguish fallback from production retrieval.

2. Keep the old class name but annotate it as temporary.
Rejected because the active code path would still overclaim a Supabase-backed implementation.

3. Introduce a completely separate presenter-only metadata layer.
Rejected because the truthfulness boundary belongs at the retrieval contract itself, not only at presentation time.

## Follow-Up
1. Add a real production retrieval adapter only when its backend and rollout plan are approved.
2. Reuse the retrieval mode metadata in later presenter or ops views that need to distinguish fallback from production retrieval.
3. Keep telemetry content limited to mode and result count unless a stricter approved ops requirement emerges.