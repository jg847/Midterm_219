# Smoke Test 07C: Retrieval Truthfulness And Naming Cleanup

## Goal
Verify that the active retrieval path truthfully discloses local seed fallback behavior, preserves a stable future-adapter contract, and emits non-sensitive retrieval diagnostics.

## Preconditions
1. Run the app or focused tests with the normal retrieval tool enabled.
2. No production retrieval backend is required for this smoke test.

## Steps
1. Execute the retrieval tool with a query that does not match any seeded chunk.
Expected result: the tool succeeds, returns `retrievalMode: local_seed_fallback`, the documented disclosure text, and an empty `chunks` array.

2. Execute the retrieval repository contract against the local implementation with a matching query.
Expected result: the repository returns `mode: local_seed_fallback` and the same fallback disclosure.

3. Execute the retrieval repository contract against a production-adapter stub in tests.
Expected result: the contract accepts `mode: external_production` without additional interface changes.

4. Inspect retrieval telemetry from the focused test or runtime log sink.
Expected result: `chat.retrieval.executed` records `retrievalMode` and `resultCount`, but does not include the query text or chunk content.

## Failure Signals
1. The retrieval adapter name or disclosure still implies live Supabase or external retrieval when none exists.
2. The retrieval tool returns chunks without truthful mode metadata.
3. The repository contract cannot represent a future production adapter.
4. Retrieval telemetry includes sensitive query or content payloads.