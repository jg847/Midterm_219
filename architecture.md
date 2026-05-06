# Grounded Moves

## Sprint Status
Sprint 1 is implemented with:
- Next.js App Router + TypeScript + TailwindCSS scaffold.
- Clean Architecture layer structure and boundary lint rules.
- Tool-first architecture ADRs and documentation.
- Legacy seed data imported to `data/seeds/newark-affordability.seed.json`.
- Sentry baseline instrumentation.
- CI workflow with lint, typecheck, unit test, and build.

Sprint 2 is implemented with:
- MCP server + tool registry foundation.
- Tool contracts using Zod input schemas.
- Tools for location lookup, jobs, housing listings, housing market baseline, dataset query, story information, and retrieval.
- Shared guarded fetch utility for caching and rate-limit guardrails.
- Database migration baseline under `db/migrations/0001_initial_schema.sql`.
- Retrieval seeding script and generated chunk seed data.

Sprint 9 is implemented with:
- API route-level abuse throttling for `/api/chat` and `/api/location/resolve`.
- Health check endpoint at `/api/health` with environment readiness status.
- Release blocker scripts (`release:quick`, `release:check`) and CI reliability gate enforcement.
- Deployment, privacy, launch, rollback, and architecture sign-off runbooks under `docs/operations/`.

Sprint 2 session memory is implemented with:
- Browser-scoped UUID session identity stored locally per browser context.
- Transcript hydration and reset routes under `/api/chat/session/[sessionId]`.
- Anthropic-style ordered history passed into model composition for multi-turn continuity.
- Redis-backed conversation persistence in production-like environments, with in-memory fallback for development and tests.
- Session lifecycle telemetry for create, load, reset, recovery, and persistence failures.

Sprint 4 streaming chat is implemented with:
- SSE delivery on `POST /api/chat` when streaming is explicitly requested and the rollout flag is enabled.
- Typed stream events for start, tool status, clarification prompts, assistant deltas, final payload, completion, and recoverable stream errors.
- Incremental assistant rendering plus transient tool-status UI in the homepage chat panel.
- Deterministic streaming mock mode through the existing mock-chat path for development and automated validation.
- Same-session browser stream locking to prevent duplicate active streams across tabs for one browser session.

Sprint 5 budget planning is implemented with:
- A registered `budget_plan_tool` for structured affordability analysis on the native-tool-use path.
- Persisted browser-session budget state that survives refresh and clears on session reset.
- Support for gross/net income disclosure, explicit housing cost, separate debt buckets, and transient rent/salary comparison targets.
- A dedicated budget artifact renderer in the chat transcript so budget results remain visible alongside other grounded tool results.

Sprint 6 national framing and fallback coverage is implemented with:
- Typed location-aware support-resource generation for housing, workforce, and community support links across homepage chat and the Resources page.
- Explicit benchmark fallback resolution for unsupported markets, including state-default, same-state, and national benchmark disclosure instead of Newark or row-zero defaults.
- Nationally framed Story and Resources surfaces plus benchmark-aware dataset/story disclosures.
- Spec-scoped telemetry for exact resource matches, fallback resource usage, unsupported-market surfacing, and benchmark selection on the native-tool-use path.
- A Sprint 6 smoke-test runbook and ADR for the resource-mapping and benchmark-fallback strategy.

## Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
npm run release:quick
npm run release:check
```

## Environment Setup
Create `.env.local` from `.env.local.example`.

Sprint 2 key activation is required now for live provider calls:
- `OPENCAGE_API_KEY`
- `USAJOBS_API_KEY`
- `ADZUNA_APP_ID`
- `ADZUNA_APP_KEY`
- `RENTCAST_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Conversation memory rollout controls:
- `NEXT_PUBLIC_ENABLE_SESSION_MEMORY=false` disables transcript hydration, durable session continuity, and reset-backed session persistence while keeping the core chat route available.
- `CONVERSATION_STORE_DRIVER=redis` forces the Redis-backed conversation repository outside production-like environments when Redis env vars are present.
- `CONVERSATION_SESSION_TTL_SECONDS` overrides the default 30-day conversation-session TTL.

Sprint 3 native-tool-use rollout controls:
- `NEXT_PUBLIC_ENABLE_NATIVE_TOOL_USE=true` enables the native tool-use orchestration path on the homepage chat route.
- `ANTHROPIC_CHAT_MAX_TOKENS` overrides the default chat-answer token budget. Values at or below the retired `350` cap are ignored and fall back to the higher default.

Sprint 4 streaming rollout controls:
- `NEXT_PUBLIC_ENABLE_STREAMING_CHAT=true` enables SSE chat streaming when the browser requests it with the typed streaming transport.
- `NEXT_PUBLIC_USE_MOCK_CHAT=true` now supports both buffered mock responses and deterministic streaming mock responses through the same route contract.

Sprint 5 budget rollout controls:
- `NEXT_PUBLIC_ENABLE_BUDGET_CAPABILITY=false` disables `budget_plan_tool` registration and forces budget questions to fall back to non-budget grounded guidance while the rest of chat remains available.

Track 7A telemetry composition controls:
- `ENABLE_CONSOLE_TELEMETRY=false` disables console sink emission when you need to isolate non-console telemetry behavior.
- `ENABLE_SENTRY_TELEMETRY=true` explicitly enables the Sentry telemetry sink outside test mode.
- Production environments automatically activate Sentry telemetry when DSN configuration is present.
- Development and test environments keep Sentry telemetry off by default even when DSN values are present, so local debugging and automated tests stay deterministic unless you explicitly opt in.

## Architecture References
- `docs/architecture/clean-architecture.md`
- `docs/architecture/project-structure.md`
- `docs/adr/0001-clean-architecture.md`
- `docs/adr/0002-tool-first-chat.md`
- `docs/adr/0003-browser-session-memory.md`
- `docs/adr/0004-native-tool-use-model-boundary.md`
- `docs/adr/0005-sse-streaming-chat-transport.md`
- `docs/adr/0006-budget-state-and-tool-boundary.md`
- `docs/adr/0007-national-resource-mapping-and-benchmark-fallback.md`
- `docs/adr/0008-telemetry-fan-out-and-sink-selection.md`

## Operations References
- `docs/operations/deployment-readiness.md`
- `docs/operations/release-promotion.md`
- `docs/operations/privacy-compliance-baseline.md`
- `docs/operations/launch-checklist.md`
- `docs/operations/architecture-release-blockers.md`
- `docs/operations/smoke-tests/02-conversation-memory-and-browser-sessions.md`
- `docs/operations/smoke-tests/03-native-tool-use-model-composed-responses-and-core-location-grounding.md`
- `docs/operations/smoke-tests/04-streaming-chat-responses-and-tool-status.md`
- `docs/operations/smoke-tests/05-budget-planning-capability.md`
- `docs/operations/smoke-tests/06-national-resource-framing-and-expanded-location-coverage.md`
- `docs/operations/smoke-tests/07a-telemetry-productionization.md`
