# Monitoring Dashboard Spec (Sprint 08)

## Core panels
- Chat request volume (`/api/chat` requests per minute)
- Chat latency (`p50`, `p95`, `p99`)
- Tool execution status by tool name (`ok` vs failure code)
- Location resolve latency and failure rate
- Top upstream failure messages (sampled)

## Derived SLO views
- Useful-answer availability proxy: successful tool plan + non-empty response
- Tool reliability SLO: >= 92% successful tool calls per rolling hour

## Alert channels
- Pager: sustained p95 latency breach
- Slack/email: failure-rate warning
- Daily digest: top failing tools and recovery time

## Data source
- Telemetry events from the Track 7A telemetry composition path (`ConsoleTelemetry`, `SentryTelemetry`, or `FanOutTelemetry` depending on environment):
  - `chat.request.received`
  - `chat.intent.classified`
  - `chat.tool.executed`

## Track 7A Notes
- Local development should continue surfacing telemetry in the console unless `ENABLE_CONSOLE_TELEMETRY=false`.
- Production-like environments may emit to Sentry only or fan out to Sentry plus console depending on the configured sink policy.
- Development stays console-only by default unless Sentry telemetry is explicitly enabled for diagnostics.
- Dashboard and alert assumptions should rely on the structured event contract, not on one concrete sink implementation name.
