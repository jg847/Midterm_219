# Smoke Test 07A: Telemetry Productionization

## Purpose
Verify that Track 7A telemetry composition selects the documented sinks by environment, preserves console-visible diagnostics in local development, and degrades safely when Sentry telemetry is unavailable.

## Preconditions
1. The Track 7A slice is deployed or running locally with the updated telemetry factory.
2. `npm run release:quick` has passed for the candidate build.
3. You have access to local logs and, for production-like verification, the relevant Sentry project.

## Local Verification
1. Run the app with default local settings and no explicit telemetry overrides.
2. Trigger one homepage chat request and one location-resolve request.
3. Confirm structured telemetry remains visible in the local console.
4. Set `ENABLE_CONSOLE_TELEMETRY=false` and verify the runtime still starts without chat-route failure.
5. Set `ENABLE_SENTRY_TELEMETRY=true` without valid Sentry configuration and verify chat still degrades safely to the remaining available sink behavior.

## Production-Like Verification
1. Confirm `SENTRY_DSN` is present in the environment.
2. Trigger one successful chat request and one recoverable failure path if available.
3. Confirm the expected telemetry events appear in Sentry without raw transcript content.
4. Confirm console-visible telemetry remains available if the chosen environment policy enables fan-out.

## Regression Checks
1. Chat requests still complete when Sentry telemetry is disabled or unavailable.
2. No user-visible answer path depends on telemetry success.
3. Telemetry payloads use structured attributes and do not include raw transcript bodies.

## Rollback Triggers
1. The chat route fails or slows materially when Sentry telemetry is unavailable.
2. Sentry receives raw transcript content or other avoidable sensitive payloads.
3. Local and test environments lose deterministic telemetry behavior.