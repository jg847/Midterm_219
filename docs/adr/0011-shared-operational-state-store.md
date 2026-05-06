# ADR 0011: Shared Operational State Store

## Status
Accepted

## Context
Before Track 7D, two production-relevant framework helpers still used process-local maps as their source of truth:

1. `guardedFetch` stored response cache entries and rate-window timestamps in module-local `Map`s;
2. `ApiRateLimiter` stored request windows in another module-local `Map`.

That behavior is acceptable for local development and tests, but it is not truthful or safe as the production source of truth in serverless or multi-instance environments. Spec 7 requires those seams to stop depending on in-process state for production correctness and to expose degraded paths explicitly.

## Decision
We will route non-session operational state through one shared store abstraction with two initial implementations:

1. `InMemoryOperationalStateStore`
2. `RedisOperationalStateStore`

Driver selection rules mirror the existing conversation-store pattern:
1. use Redis when Upstash credentials are present in production;
2. allow `OPERATIONAL_STATE_DRIVER=redis` to force shared state outside production;
3. allow `OPERATIONAL_STATE_DRIVER=memory` to force explicit local-only fallback even in production-like environments;
4. default to in-memory state when Redis credentials are absent.

The first contract remains deliberately small: `get`, `set`, `delete`, and `clear`.

## Consequences

### Positive
1. `guardedFetch` and `ApiRateLimiter` now share one durable backing-store direction instead of forking independent state strategies.
2. Production-like environments can use shared Redis state without changing route-level business behavior.
3. The in-memory fallback remains available and explicitly diagnosable through the health route.

### Negative
1. The rate-limiter seam becomes async because shared state access may require network I/O.
2. The first Redis-backed implementation is a shared backing-store step, not a fully atomic distributed rate-limiter redesign.

## Alternatives Considered
1. Keep each helper on its own in-process map and document the limitation.
Rejected because Spec 7 explicitly calls out these helpers as operational-state hardening targets.

2. Add Redis directly inside each helper with no shared abstraction.
Rejected because it would fork the operational-store direction across incompatible implementations.

3. Replace the rate limiter with a completely new algorithm in the same slice.
Rejected because the first hardening step is to externalize the source of truth while preserving current route semantics.

## Follow-Up
1. Evaluate whether later 7D work should introduce stronger atomic Redis primitives for distributed rate limiting.
2. Reuse the operational-store seam for other shared non-session state only when that state truly belongs in server-side operational storage.
3. Keep health diagnostics aligned with the active operational-store mode so degraded paths stay visible.