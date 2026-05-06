# Launch Checklist and Rollback Rehearsal

## Pre-Launch Checklist
- `npm run release:check` passes.
- CI is green on `main`.
- `/api/health` returns 200 in staging.
- Required production secrets are configured in Vercel.
- Sentry events visible for server and client.
- Track 7A telemetry sink behavior is verified for the target environment, including the documented degraded path if Sentry is unavailable.
- Runbook links shared with support responders.

## Go-Live Checklist
- Deploy production build.
- Verify chat happy path and tool rendering.
- Verify location resolve happy path.
- Confirm no elevated 429s beyond expected thresholds.
- Publish release note with known limitations.

## Timed Rollback Rehearsal
Target: complete rollback in under 10 minutes.

1. Start timer.
2. Trigger rollback to previous deployment.
3. Run smoke checks (`/api/health`, chat, location resolve).
4. Stop timer and record actual duration.
5. File follow-up issues for any delays.

## Post-Launch Monitoring (First 24h)
- Error rate and latency dashboard checks every 2 hours.
- Tool provider failure alerts triaged within 15 minutes.
- Daily incident summary sent to stakeholders.
