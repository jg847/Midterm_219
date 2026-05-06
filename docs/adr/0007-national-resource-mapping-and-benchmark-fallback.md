# ADR 0007: National Resource Mapping And Benchmark Fallback

## Status
Accepted

## Context
Sprint 6 expands Grounded Moves from a Newark-biased prototype into a nationally framed assistant. The remaining implementation gap was not the core chat runtime, but the way support resources and fallback housing benchmarks were selected and disclosed.

The system needed to satisfy three constraints at the same time:
1. support links must stay deterministic and typed for tests, mock mode, and UI rendering;
2. unsupported housing markets must never fall back to Newark defaults or arbitrary first-row seed selection;
3. fallback benchmark evidence must remain visibly distinct from exact live provider results.

The repo currently ships a small checked-in HUD/FMR seed and does not yet contain a trustworthy ingestion path for a larger national benchmark dataset. That means Sprint 6 needs a durable interim contract that is honest about fallback quality without inventing data.

## Decision
We will use two explicit strategies.

1. Support resources are generated through a typed application-layer mapping function that prefers the most specific grounded scope available and then degrades deterministically through broader scopes.
2. Housing benchmark fallback is resolved through an explicit benchmark-resolution strategy that tries exact market, then state default metro, then same-state seeded metro, then a disclosed national benchmark derived from the checked-in seed.

The support-resource specificity order is:
1. ZIP/local
2. city or metro
3. state
4. national fallback

The benchmark-resolution order is:
1. exact seeded market
2. documented state default metro
3. same-state seeded metro
4. national benchmark

Both strategies must emit typed metadata that the assistant and UI can render directly. This includes `usedFallback`, structured `resolutionKind`, fallback scope, and readable disclosure notes.

## Consequences

### Positive
1. The app no longer silently defaults unsupported markets to Newark or `rows[0]` behavior.
2. The assistant and UI can describe support-resource and benchmark quality honestly without reverse-engineering hidden fallback logic.
3. Tests and mock mode can exercise exact, state-fallback, and national-fallback behavior deterministically from checked-in data.
4. A future real HUD/FMR ingestion path can replace the seed-backed adapter without changing the application-layer fallback contract.

### Negative
1. The current national benchmark remains a temporary seed-derived fallback, not a substitute for broader real metro coverage.
2. Curated resource mappings still require maintenance until a stronger approved source is adopted.

## Alternatives Considered
1. Keep static national links only.
Rejected because it would satisfy neither the typed specificity-order requirement nor the state/local usefulness requirement.

2. Use arbitrary first-row or hardcoded-metro fallback for unsupported markets.
Rejected because it is misleading and directly violates the Sprint 6 spec.

3. Fabricate broader benchmark rows by hand.
Rejected because the repo does not currently contain a trustworthy source pipeline for those values.

## Follow-Up
1. Add a real HUD/FMR ingestion path and replace the tiny checked-in seed with a sourced benchmark set.
2. Expand curated support mappings only when a trustworthy upstream source or approved editorial process is available.