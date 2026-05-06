# Smoke Test 07D: Serverless-Safe Operational State Beyond Sessions

## Goal
Verify that non-session operational state now uses a shared store contract, degrades explicitly to in-memory state, and preserves route behavior after the async limiter change.

## Preconditions
1. The app or focused test environment can run with and without Upstash credentials.
2. Health route access is available.

## Steps
1. Run the operational-store config tests without Redis credentials.
Expected result: the mode resolves to `memory`.

2. Run the operational-store config tests with valid Upstash credentials and `OPERATIONAL_STATE_DRIVER=redis`.
Expected result: the mode resolves to `redis`.

3. Run the guarded-fetch and API-rate-limiter focused tests.
Expected result: cache reuse and rate-limit enforcement still work through the shared store seam.

4. Call the health route in a degraded local configuration.
Expected result: `checks.operationalState.mode` is `memory`, `shared` is `false`, and `degraded` is `true`.

5. Call the health route in a production-like configuration with Redis forced on.
Expected result: `checks.operationalState.mode` is `redis`, `shared` is `true`, and `degraded` is `false`.

6. Run the focused chat and location route tests.
Expected result: route behavior remains intact after the rate limiter becomes async.

## Failure Signals
1. `guardedFetch` or `ApiRateLimiter` still depend on process-local maps for active state.
2. Redis-backed operational state cannot be selected even when credentials and driver override are present.
3. Health diagnostics do not disclose the degraded in-memory fallback.
4. Chat or location routes regress after the async rate-limit seam change.