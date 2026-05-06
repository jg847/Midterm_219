# ADR 0009: Layered Moderation Pipeline

## Status
Accepted

## Context
Before Track 7B, Grounded Moves used one moderation function that checked message length and then scanned a small regex list. That implementation had three problems:

1. it could only pass or block, so it could not support future transform or scrub behavior without replacing the interface;
2. it mixed distinct concerns such as input validation and abuse heuristics into one opaque loop;
3. it gave later hardening work no stable contract for adding model-side refusal guidance or output-side scrubbing.

Spec 7 requires Track 7B to become a layered moderation pipeline while preserving existing route-level enforcement points and the user-facing refusal contract.

## Decision
We will represent moderation as a small ordered chain of stages, each returning one typed outcome:

1. `pass`
2. `transform`
3. `block`

The first Track 7B slice introduces these stages:
1. `normalize_input`
2. `input_validation`
3. `prompt_injection_heuristics`
4. `safety_terms`

The route adapter remains stable:
- callers can still ask one function whether the message is allowed;
- blocked requests still map to the same refusal copy already used by the route;
- transformed input can now flow forward without changing the route-level refusal contract.

The architecture boundary is:
- application moderation owns stage contracts and ordering;
- route code remains the enforcement point;
- later moderation diagnostics should emit through the existing telemetry seam from Track 7A rather than introducing a second observability path.

## Consequences

### Positive
1. Later moderation stages can extend the pipeline without replacing the route contract.
2. Input normalization, prompt-injection heuristics, and safety-term checks are now explicit and testable.
3. The route keeps its current refusal shape, so user-visible behavior stays stable while the internals harden.

### Negative
1. Stage ordering is now part of the behavior contract and must stay covered by focused tests.
2. Future heuristic expansion can introduce false positives if the stage set grows without narrow tests and rollout discipline.

## Alternatives Considered
1. Keep the regex-only function and just add more patterns.
Rejected because it does not satisfy the typed, layered moderation requirement from Spec 7.

2. Move moderation out of the route boundary and into a deeper orchestration layer.
Rejected because Spec 7 explicitly requires existing route-level enforcement points to remain in place.

3. Introduce a separate moderation service abstraction immediately.
Rejected for this slice because the smallest stable step is a typed stage chain inside the existing application moderation seam.

## Follow-Up
1. Add moderation diagnostics through the Track 7A telemetry seam without logging avoidable sensitive content.
2. Extend the pipeline with model-side refusal guidance and output-side scrubbing in later Track 7B slices.
3. Keep later moderation tests on shared chat/runtime harnesses rather than introducing bespoke route mocks per file.