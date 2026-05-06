# Sprint Plan 07D: Serverless-Safe Operational State Beyond Sessions

## Goal
Move rate-limit and guarded-fetch operational state behind a shared store seam that can use Redis in production-like environments, degrade explicitly to in-memory state elsewhere, and expose the active mode through health checks.

## Tasks
1. Task 1, size S: Introduce a shared operational-state store abstraction for non-session cache and window state so `guardedFetch` and `ApiRateLimiter` stop owning process-local maps directly. Implements Spec 7 requirements 30, 31 and acceptance criteria 6, 8.
2. Task 2, size S: Add an in-memory operational-store implementation that is explicitly local-only and safe for tests and development when Redis is absent or intentionally disabled. Implements Spec 7 requirements 30, 31, degraded-path requirement 2, and acceptance criteria 6, 9.
3. Task 3, size S: Add a Redis-backed operational-store implementation plus environment-driven driver selection using existing Upstash credentials and server-side boundaries only. Implements Spec 7 requirements 30, 31, privacy requirement 2, and acceptance criteria 6, 9.
4. Task 4, size S: Rewire `guardedFetch` caching and `ApiRateLimiter` window state to use the new shared store, preserving current route behavior while making the degraded path explicit. Implements Spec 7 requirements 30, 31 and acceptance criteria 6, 8.
5. Task 5, size S: Expose the operational-store mode and degraded status in the health route so operators can tell whether the app is using shared Redis state or in-memory fallback. Implements Spec 7 observability requirement 2 and acceptance criteria 9, 10.
6. Task 6, size S: Add focused tests covering store selection, guarded-fetch cache/rate-limit behavior, API rate-limiter behavior, and route compatibility after the async store seam change. Implements Spec 7 test-plan requirements for 7D and acceptance criteria 11, 13.

## Dependencies
1. Approved umbrella Sprint Plan 7 at `docs/sprints/07-hardening-and-production-readiness-tracks.md` and approved Spec 7 at `docs/specs/07-hardening-and-production-readiness-tracks.md`.
2. Existing Upstash Redis credentials and server-side boundaries already used by conversation storage remain the production substrate for the first 7D slice.
3. Track 7A telemetry and health-route hardening already established the pattern for degraded-but-diagnosable runtime behavior.

## Risks & Mitigations
1. Risk: Rewriting the rate limiter to use a shared store changes route behavior unexpectedly.
Mitigation: Keep the limiter semantics intact, validate both helper-level tests and route-level tests after the async seam change.

2. Risk: Operational-store fallback becomes invisible, so local or degraded environments look production-safe when they are not.
Mitigation: Report the active operational-state mode and degraded status in the health route.

3. Risk: The first store abstraction is too specific to current helpers and blocks later operational-state work.
Mitigation: Keep the contract generic to get, set, delete, and clear state so both caching and rate windows share the same seam.

## Definition Of Done
1. `guardedFetch` no longer owns process-local cache or rate-window maps directly.
2. `ApiRateLimiter` no longer owns process-local request windows directly.
3. Redis-backed operational state can be selected with existing environment credentials and explicit driver override.
4. In-memory operational state remains available as a truthful degraded path.
5. Health diagnostics expose the active operational-state mode.
6. Focused tests cover helper behavior, store selection, and affected routes.

## Rollout Plan

### Feature Flags And Rollout Safety
1. This Track 7D slice is always-on because it preserves current route semantics while externalizing the operational-state source of truth where credentials are present.
2. The degraded path is explicit in-memory operational state when Redis is absent or `OPERATIONAL_STATE_DRIVER=memory` is set.

### Telemetry To Watch
1. Health-route `operationalState.mode` and `operationalState.degraded` values.
2. Any increase in route-level `429` responses after the shared store seam lands.
3. Any production-like environment still reporting memory operational state when shared Redis should be active.

### Rollback Criteria
1. Async rate-limit checks break route behavior or response status handling.
2. Redis-backed operational state cannot be selected in production-like environments with valid credentials.
3. Health diagnostics stop disclosing the degraded in-memory fallback.

### Release Verification
1. Verify helper-level tests for guarded fetch, rate limiting, and operational-store config all pass.
2. Verify location-resolve and chat routes still behave correctly after the async limiter seam change.
3. Verify the health route reports `redis` mode when forced with valid credentials and `memory` when degraded.