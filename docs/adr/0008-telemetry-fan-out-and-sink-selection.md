# ADR 0008: Telemetry Fan-Out And Sink Selection

## Status
Accepted

## Context
Grounded Moves already emits structured telemetry events through `TelemetryPort`, but until Track 7A the runtime always instantiated `ConsoleTelemetry` directly inside the chat runtime composition path. That left the application with two production-readiness gaps:

1. server-side telemetry could not reach the already-configured Sentry runtime without changing application-layer code;
2. the runtime had no explicit composition rule for development, test, and production-like environments.

The pivot plan and Spec 7 both require telemetry productionization to stay behind `TelemetryPort`, support Sentry-backed production wiring, and degrade safely to console-only behavior when production telemetry is unavailable.

## Decision
We will compose telemetry through a runtime factory instead of constructing one concrete sink directly.

The factory rules are:
1. console telemetry remains enabled by default unless `ENABLE_CONSOLE_TELEMETRY=false`;
2. Sentry telemetry is enabled when explicitly requested with `ENABLE_SENTRY_TELEMETRY=true` or when Sentry DSN configuration is present in production;
3. test environments do not enable Sentry telemetry by default, even when DSN values are present;
4. development environments stay console-only by default even when DSN values are present, unless Sentry is explicitly enabled for a diagnostic session;
5. when both console and Sentry sinks are enabled, telemetry fans out to both through a single `TelemetryPort` implementation;
6. if no production sink is configured or a sink is disabled, the runtime degrades to the most truthful lower-capability path, which is console-only telemetry.

The adapter boundary remains:
- application code depends only on `TelemetryPort`;
- framework code owns `ConsoleTelemetry`, `SentryTelemetry`, and `FanOutTelemetry`;
- runtime composition owns environment-driven sink selection.

## Consequences

### Positive
1. Production-like environments can emit telemetry to Sentry without leaking vendor APIs into application services.
2. Development and local debugging still retain console-visible telemetry by default.
3. The runtime now has an explicit degraded path when Sentry telemetry is unavailable.
4. Later Track 7 slices can rely on a stable telemetry composition seam for moderation, retrieval, and operational-state diagnostics.

### Negative
1. Sink selection is now environment-dependent and must stay documented in README and operations notes.
2. Fan-out introduces a small amount of runtime composition complexity that must stay covered by focused tests.

## Alternatives Considered
1. Keep `ConsoleTelemetry` hardcoded in the runtime.
Rejected because it does not satisfy Spec 7 production telemetry requirements.

2. Replace console telemetry entirely with Sentry in production.
Rejected because local and degraded observability would become worse, and fan-out was explicitly called for in the pivot plan.

3. Let application services import Sentry directly.
Rejected because it violates the existing port boundary and would couple domain/application code to a framework vendor.

## Follow-Up
1. Extend telemetry composition notes in operations docs and smoke tests.
2. Reuse this sink-selection seam in later Track 7 slices that emit moderation or operational-state diagnostics.