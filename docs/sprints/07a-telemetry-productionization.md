# Sprint Plan 07A: Telemetry Productionization

## Goal
Ship a production-ready telemetry composition path for Grounded Moves that preserves the existing `TelemetryPort` boundary, supports optional fan-out to Sentry plus console logging, and degrades safely to console-only behavior when production telemetry is unavailable.

## Tasks
1. Task 1, size S: Finalize the Track 7A rollout note first, explicitly documenting sink selection by environment, the absence or presence of any dedicated telemetry feature flag, console-only degraded behavior, and the telemetry health signals that indicate whether production wiring is healthy. Implements Spec 7 requirements 9 through 15 and acceptance criteria 3, 9, 10.
2. Task 2, size S: Add the Track 7A typed composition seam by introducing a telemetry factory and fan-out adapter behind `TelemetryPort`, so application code continues to depend only on the port while runtime sink selection becomes explicit and testable. Implements Spec 7 requirements 9, 10, 11, data-contract expectation 1, and acceptance criteria 3.
3. Task 3, size M: Add a `SentryTelemetry` adapter that records structured telemetry events through the existing Sentry runtime without leaking vendor APIs into application code and without emitting raw transcript content when structured metadata is sufficient. Implements Spec 7 requirements 10, 11, 12, 13, 14 and observability requirements 1, 2.
4. Task 4, size S: Update the chat runtime composition path so telemetry is created through the new factory rather than hardcoding `ConsoleTelemetry`, while preserving safe console-only fallback when Sentry configuration is absent or disabled. Implements Spec 7 requirements 9 through 15 and acceptance criteria 3, 8.
5. Task 5, size S: Extend runtime configuration helpers and tests to cover telemetry sink selection, environment defaults, and safe degradation so local and test environments remain deterministic. Implements Spec 7 requirements 12, 15, test-plan requirements 1, 2, 3 and acceptance criteria 9, 13.
6. Task 6, size S: Add the ADR or operations-note updates required if Track 7A lands a durable telemetry fan-out or sink-composition contract that later Track 7 slices depend on. Implements Spec 7 ADR impact guidance, operations documentation expectations 1, 2, 3, and acceptance criterion 12.

## Dependencies
1. Approved umbrella Sprint Plan 7 at `docs/sprints/07-hardening-and-production-readiness-tracks.md` and approved Spec 7 at `docs/specs/07-hardening-and-production-readiness-tracks.md`.
2. The existing `TelemetryPort` boundary and chat runtime composition seam in `src/app/api/chat/runtime.ts` must remain available because Track 7A hardens that seam rather than replacing it.
3. Existing Sentry initialization files remain the production telemetry substrate for this slice; Track 7A composes against that substrate rather than introducing a second telemetry SDK.
4. Any telemetry sink added by this slice must support a deterministic local or test substitute before the slice is called complete.

## Risks & Mitigations
1. Risk: Telemetry productionization leaks Sentry-specific code into application services.
Mitigation: Keep vendor calls inside framework adapters and compose sinks only behind `TelemetryPort`.

2. Risk: Missing or partial Sentry configuration breaks the chat runtime.
Mitigation: Default to console-only telemetry when production telemetry is unavailable or disabled, and cover that path in runtime-config tests.

3. Risk: Telemetry events begin to capture raw transcript content or other avoidable sensitive payloads.
Mitigation: Preserve the existing structured event shape and keep payload selection at the adapter boundary narrowly typed.

## Definition Of Done
1. The chat runtime no longer hardcodes `ConsoleTelemetry` directly.
2. A typed telemetry factory can compose console and Sentry sinks behind `TelemetryPort`.
3. Sentry-backed telemetry is optional and degrades safely to console-only behavior.
4. Runtime-config and integration-adjacent tests cover sink selection and degraded behavior deterministically.
5. Any required ADR or operations-note updates for telemetry composition are landed with the slice.

## Rollout Plan

### Feature Flags And Rollout Safety
1. Track 7A does not require a dedicated end-user feature flag by default; sink selection is controlled by server environment and explicit telemetry config.
2. The safe degraded path is console-only telemetry when Sentry configuration is absent, disabled, or partially unavailable.

### Telemetry To Watch
1. Whether the runtime activates console-only, Sentry-only, or fan-out telemetry for the current environment.
2. Any increase in chat latency attributable to telemetry fan-out.
3. Any runtime errors caused by telemetry adapter composition or sink failure.

### Rollback Criteria
1. Telemetry composition can break or delay the chat runtime instead of degrading safely.
2. Sentry-backed telemetry records raw transcript content or other avoidable sensitive payloads.
3. Runtime configuration becomes non-deterministic in test or local environments.

### Release Verification
1. Verify local and test environments remain deterministic and default to the documented sink behavior.
2. Verify the chat runtime still works when Sentry configuration is missing.
3. Verify production-like environments can activate the documented telemetry sinks without changing application-layer code.