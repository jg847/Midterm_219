# Reliability Playbook (Sprint 08)

## Incident classes
- Tool failure spike (`UPSTREAM_ERROR`, `RATE_LIMITED`)
- Chat latency regression
- Location resolve degradation

## Immediate triage
1. Check latest telemetry for `chat.tool.executed` failures grouped by `toolName`.
2. Verify external provider status pages and credential validity.
3. Switch to fallback paths where available (HUD baseline, static resources).

## Tool failure runbook
1. Confirm if failures are isolated to one provider.
2. If provider outage: keep endpoint live, return actionable fallback copy.
3. If rate limit: reduce request fan-out and increase cache TTL for hot queries.
4. Capture sample payload/error into incident notes.

## Latency runbook
1. Check p95 request latency for `/api/chat` and `/api/location/resolve`.
2. Inspect slowest tool invocations from telemetry.
3. Temporarily reduce tool count per intent if latency exceeds budget.

## Alert thresholds
- Tool failure rate > 8% for 5 minutes
- `/api/chat` p95 latency > 2500ms for 10 minutes
- `/api/location/resolve` p95 latency > 1200ms for 10 minutes

## Post-incident actions
- Add/adjust test coverage for reproduced failure mode.
- Update fallback behavior if user impact exceeded SLA.
- Add incident summary to sprint reliability notes.
