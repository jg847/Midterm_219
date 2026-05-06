# ADR 0012: Typed Tool-Result Presenter Registry

## Status
Accepted

## Context
Before Track 7E, `ToolResultCards.tsx` owned a large registry of per-tool render functions that repeatedly destructured `unknown` payloads inline. That approach made the UI hardening risk explicit in Spec 7:

1. adding a tool or changing a payload shape pushed more parsing into one oversized component;
2. there was no typed contract per migrated renderer variant;
3. the migration path to per-tool units was unclear without a disruptive rewrite.

Spec 7 requires tool-result rendering to move toward typed presenter or view-model contracts while preserving transcript artifacts and staying registry-driven.

## Decision
We will introduce a typed presenter registry that sits in front of the existing legacy renderer registry.

The rules are:
1. each migrated variant declares a typed view-model contract;
2. each migrated variant exposes a `present` function plus a renderer component;
3. `ToolResultCards` asks the typed presenter registry first and falls back to the legacy renderer registry if no typed presenter exists;
4. transcript list rendering, ordering, and artifact flow remain unchanged during migration.

The current migrated variants are:
1. `rag_retrieval_tool`
2. `budget_plan_tool`
3. `opportunity_feed_tool`
4. `job_digest_tool`
5. `housing_digest_tool`
6. `ui_digest_tool`
7. `job_search_tool`
8. `housing_search_tool`
9. `dataset_query_tool`

## Consequences

### Positive
1. All current transcript-facing tool-result variants now have explicit view-model contracts.
2. Migration completed incrementally without freezing the existing transcript UI.
3. Future renderer slices can extend the registry instead of deepening one large component.

### Negative
1. The codebase still retains a generic default renderer for unknown future tool names.
2. Future tools must register presenters to keep the typed contract boundary complete.

## Alternatives Considered
1. Rewrite all tool renderers in one pass.
Rejected because Spec 7 explicitly calls for a migration path without a big-bang rewrite.

2. Keep one legacy renderer registry and only add more inline type guards.
Rejected because that preserves the oversized component risk rather than reducing it.

3. Move all payload parsing into provider code.
Rejected because presenter shaping belongs at the UI-facing boundary, not in the provider layer.

## Follow-Up
1. Add dedicated UI diagnostics if renderer failures need stronger observability than tests alone.
2. Keep future tool additions behind the presenter registry instead of reviving inline payload parsing in `ToolResultCards.tsx`.