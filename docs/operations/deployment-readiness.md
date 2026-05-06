# Deployment Readiness and Secrets

## Environment Matrix
| Variable | Scope | Required | Notes |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Server | Yes | Model provider key. |
| `ANTHROPIC_MODEL` | Server | Optional | Defaults in local setup if omitted. |
| `OPENCAGE_API_KEY` | Server | Yes | Geocoding provider key. |
| `USAJOBS_API_KEY` | Server | Yes | Jobs provider key. |
| `ADZUNA_APP_ID` | Server | Yes | Jobs provider key pair. |
| `ADZUNA_APP_KEY` | Server | Yes | Jobs provider key pair. |
| `RENTCAST_API_KEY` | Server | Yes | Housing provider key. |
| `SUPABASE_URL` | Server | Yes | Supabase endpoint. |
| `SUPABASE_ANON_KEY` | Browser + Server | Yes | Public anon key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Yes | Never expose to browser. |
| `UPSTASH_REDIS_REST_URL` | Server | Yes | Cache and rate limit backing store. |
| `UPSTASH_REDIS_REST_TOKEN` | Server | Yes | Never expose to browser. |
| `API_RATE_LIMIT_CHAT_PER_MINUTE` | Server | Recommended | Default `20`. |
| `API_RATE_LIMIT_LOCATION_PER_MINUTE` | Server | Recommended | Default `40`. |
| `ENABLE_CONSOLE_TELEMETRY` | Server | Optional | Defaults to enabled unless explicitly set to `false`. |
| `ENABLE_SENTRY_TELEMETRY` | Server | Optional | Explicitly enables server-side Sentry telemetry outside test mode. |
| `NEXT_PUBLIC_SENTRY_DSN` | Browser | Recommended | Client telemetry. |
| `SENTRY_DSN` | Server | Recommended | Server telemetry. |

## Telemetry Sink Selection
- Local and development-like environments default to console-visible telemetry.
- Server-side Sentry telemetry activates when `ENABLE_SENTRY_TELEMETRY=true` or when Sentry DSN configuration is present in production.
- If no production telemetry sink is available, the runtime must degrade safely to console-only telemetry rather than breaking the chat route.

## Vercel Scope Placement
- Preview: Safe test keys and staging data sources.
- Production: Production keys only.
- Development: Local or shared non-production keys.

Use Vercel dashboard or CLI to bind keys without committing secrets:
```bash
vercel env add ANTHROPIC_API_KEY production
vercel env add ANTHROPIC_API_KEY preview
vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

## Key Rotation Process
1. Create new key in provider console.
2. Add new key to `preview` scope and validate in staging.
3. Promote same key to `production` scope.
4. Redeploy and verify `/api/health` returns `ok: true`.
5. Revoke old key after 24 hours of healthy traffic.

## Security Rules
- Never prefix server secrets with `NEXT_PUBLIC_`.
- Treat `.env.local` as local-only and keep it gitignored.
- If a secret is leaked, rotate immediately and document incident in runbook.
