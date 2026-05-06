# Letter to the Coding Agent

## Project: Housing & Affordability Chatbot — Multi-Location Pivot

Hello. You are taking over implementation work on an existing Next.js app (the codebase formerly called the "Student Reality Platform" / "Newark housing chatbot"). I have just completed a code review and identified the structural changes needed to ship the product I actually want. Your job is to plan and execute that work carefully, with specs, sprints, and tests, and to keep the code disciplined.

This letter has three parts:

1. **Product direction** — what the product is now, and what it is not.
2. **The problems to solve** — a prioritized list, with the architectural reasoning.
3. **How I want you to work** — the specs-then-sprints workflow, the test taxonomy I expect, and the design discipline (SOLID + Gang of Four) you must apply.

Please read the entire letter before you start producing artifacts.

---

## Part 1 — Product Direction

The product is a conversational chatbot whose **single primary purpose** is to help any user, in any U.S. location, do three things:

1. **Find available housing** in the location they specify.
2. **Find job listings** in the location they specify.
3. **Build a personal budget** that reflects their income, expenses, debts, and goals, and tells them honestly whether the housing and jobs they're seeing are realistic.

**Important pivot from the previous direction:** the chatbot is no longer Newark-specific. It must work with any location the user enters — a city, a state, a metro, or a ZIP code. Newark is one of many possible locations, not the default. Anywhere the codebase still hardcodes "Newark, NJ" — including the `defaultInputForTool` fallback in `src/application/chat/ExecuteToolPlan.ts`, the seed-driven defaults in tools like `housingMarketTool` and `housingDigestTool` (the `1720` baseline), the Newark-only `newark-affordability.seed.json`, and any copy on the home page or chat page — must be replaced with a location-aware abstraction. The HUD FMR seed is acceptable as a fallback for locations the live providers cannot serve, but it should be expanded and treated as a fallback only.

The chatbot is also no longer a secondary feature on a card-grid landing page. It is **the hero of the home page**. The user's first interaction with the site should be a chat input, ready to accept a question, with the location anchor visible but unobtrusive.

The chatbot must be a real conversational agent, not a tool launcher. That means:

- It remembers the conversation across turns within a session.
- It uses the Anthropic native tool-use API (the model decides which tools to call with which arguments based on the conversation, rather than a regex picking tools from the user's literal words).
- It streams responses.
- It composes answers grounded in tool output, citing sources, in natural language — not by short-circuiting to a templated digest summary.
- It can ask the user clarifying questions when it needs information (especially during budget building).

Everything else in the product — the Story page, the Resources page, the Affordability Calculator — is supporting material that the chatbot can link to, reference, or pull data from. The chatbot is the product.

---

## Part 2 — The Problems to Solve

I am listing these in execution priority. Do not collapse them into one giant sprint. Each one needs its own spec.

### Problem 1: The home page is not the chatbot

**Current state:** `src/app/page.tsx` is a static three-card landing page (`Story / Assistant / Resources`). The chat lives at `/chat`.

**Target state:** The home page (`/`) is the chatbot. The `ChatAssistantPanel` is the hero, occupying the primary above-the-fold real estate, with the input field visible without scrolling. The location anchor (a compact form for entering a city, ZIP, or "use my current location") sits adjacent to or directly above the chat, not on a separate page. Story, Resources, and any other supporting pages move into the navigation or below the fold. The `/chat` route should either redirect to `/` or be removed.

### Problem 2: The bot has no conversation memory

**Current state:** `AnswerChatQuestion.ts` writes user/assistant messages into `InMemoryConversationRepository` but never reads them back into the model prompt. `ComposeGroundedResponse.ts` only ever sees the current message and the current tool payloads. The client also hardcodes `sessionId: "sprint-4-demo-session"` for every user, so all browsers share one global session in concept (and in serverless deployment, the in-process `Map` resets between cold starts anyway).

**Target state:** Every model call receives the conversation history for that session as `messages: [...]` in the Anthropic API format. Sessions are per-browser (a UUID generated on first visit, persisted in `localStorage`, sent with every request). The conversation store is backed by something that survives serverless cold starts and horizontal scaling — Upstash Redis is already listed in the env, so use it. `InMemoryConversationRepository` stays as the test/dev implementation behind the same `ConversationRepository` port.

### Problem 3: There is no budget tool

**Current state:** A static `AffordabilityCalculator` React component on the Story page. A one-line `calculateHousingBurden` helper. No MCP tool the bot can call. No `BudgetProfile` entity. No card renderer in `ToolResultCards.tsx` for budget output.

**Target state:** A real budget-planning capability the chatbot can invoke. This includes:

- A `BudgetProfile` domain entity with fields for monthly income (gross and net), housing cost, utilities, transportation, food, debt payments (student loans, credit cards, other), savings goals, and discretionary spending.
- A `budget_plan_tool` MCP tool that takes a partial or complete `BudgetProfile`, plus a location context, and returns a structured budget breakdown with a verdict (safe / warning / burdened / severely burdened) and per-category guidance. The tool should also accept a target rent or a target job salary and tell the user whether that target fits.
- A budget card renderer in `ToolResultCards.tsx`.
- The chatbot's system prompt must teach it to gather budget inputs incrementally over multiple turns, asking for the next missing field when it has enough to make progress, rather than demanding the entire profile up front.

### Problem 4: Tool selection and parameter extraction are regex-based

**Current state:** `ClassifyIntent.ts` is a chain of regexes. `ExecuteToolPlan.ts`'s `defaultInputForTool` passes the user's raw message verbatim as the tool's `query` parameter. Only `housingDigestTool.extractBudget` does any structured extraction.

**Target state:** Replace the regex classifier and the `defaultInputForTool` switch with Anthropic's native tool-use API. The model receives the tool catalog as structured JSON Schema definitions and returns `tool_use` content blocks. The orchestrator runs the requested tools, returns results as `tool_result` blocks, and loops until the model produces a final assistant message. The `ModelClient` port grows a `generateWithTools` method (or a new `ToolUseModelClient` port — your call, but document the decision in an ADR). Keep the existing tool catalog, but each tool's `description` and `inputSchema` must be high-quality enough for the model to use without help — review and tighten every description.

### Problem 5: The "answer" is a templated digest, not a model response

**Current state:** `ComposeGroundedResponse.digestFirstAnswer` short-circuits the model whenever a `*_digest_tool` returns a `summary` string. The summaries are template strings ("Found 3 openings. Open any card below..."). The model, when called, gets 350 max_tokens, no streaming, and a `JSON.stringify`-of-payloads prompt with no system context.

**Target state:** Once you adopt tool-use (Problem 4), the model is the composer by definition — there is no digest short-circuit. Increase `max_tokens` to something appropriate (4096 is reasonable for chat), add streaming via Server-Sent Events, and write a real system prompt that explains the bot's role, the location-aware behavior, the tool catalog, the budget-gathering protocol, citation conventions, and the safety/honesty norms (verify before acting, never invent listings or salaries, surface the FMR baseline as a benchmark not a quote, etc.).

### Problem 6: Streaming

**Current state:** Send → "Working on that..." → wall of text.

**Target state:** Token-level streaming from the Anthropic API to the browser. Tool calls render a "Looking up jobs in {location}..." status line as they execute, and the final composed answer streams in. Use Next.js App Router's streaming response support and the Anthropic SDK's stream API.

### Problem 7: Multi-location data plumbing

**Current state:** Even though tools accept a `location` argument, several layers default to or fall back to Newark. `housingDigestTool` defaults its baseline to `1720` (Newark 1BR FMR). `getFallbackBaseline` in `opportunityFeedTool` falls back to `rows[0]` of the HUD seed. The `radiusMiles` parameter is collected but never actually filters Adzuna or RentCast results.

**Target state:** Every tool that touches location must (a) accept the resolved location context as an explicit input, (b) have a deterministic fallback strategy that does not silently default to Newark, (c) return a `locationResolution` field in its output so the UI can display "showing results for {city}, {state}" honestly, and (d) actually use `radiusMiles` where the upstream provider supports radius filtering. Where a provider does not support radius (RentCast accepts city/state only), the tool should document that limitation in its description and the bot should disclose it to the user when relevant.

### Problem 8: Newark vs. national framing in copy and resources

**Current state:** README and layout title say "Student Reality Platform"; seed data and resource links are Newark-flavored or generic federal; `buildResourceHints` returns three boilerplate links regardless of location.

**Target state:** Rename the product (you and I will agree on this in the spec phase — propose 2–3 names in the first spec). Make `buildResourceHints` location-aware: state-level housing authority, local Public Housing Authority lookup link, state workforce development board, 211 search by ZIP. The HUD FMR seed should be expanded to cover at minimum the top 50 U.S. metros, and the loader should resolve the user's location to the nearest metro when there is no exact match — never silently fall back to row zero.

### Problem 9: Smaller but real issues

These belong in their own consolidated "hardening" sprint after the core pivots are in. Spec them as one document with sub-features.

- Telemetry routes to `console.log` via `ConsoleTelemetry` even though Sentry is wired. Add a `SentryTelemetry` adapter and inject it in production, keep `ConsoleTelemetry` for dev/test.
- `SupabaseRetrievalRepository` is misleadingly named — it filters a local JSON seed with `.includes()` substring matching. Either implement real Supabase pgvector or full-text retrieval, or rename to `LocalRetrievalRepository` and create a real `SupabaseRetrievalRepository` behind the same port.
- `moderation.ts` checks for "kill", "bomb", "attack" — replace with a layered approach: input-side prompt-injection defense, model-side refusal behavior driven by the system prompt, and output-side scrubbing only where needed.
- `setToolResults` in `ChatAssistantPanel.tsx` replaces tool results with the latest call's results, so prior turns' cards disappear. Cards should be associated with their assistant message and persist with the transcript.
- `InMemoryConversationRepository`, `guardedFetch` cache, and `ApiRateLimiter` are all in-process `Map`s. Fine for dev, broken in serverless with horizontal scale. Wire them through Upstash Redis (env vars already exist).
- The hardcoded `sessionId: "sprint-4-demo-session"` in `ChatAssistantPanel.tsx` (Problem 2 covers the fix; flagging here for completeness).
- `ToolResultCards.tsx` is ~370 lines of `unknown` destructuring with `tryAsObject` everywhere. Convert to a typed view-model layer in a presenter, with one renderer component per tool result type, registered through a discriminated union — this is also where we'll apply Strategy and Factory cleanly.

---

## Part 3 — How I Want You to Work

### 3.1 — The specs-then-sprints workflow

Do not start coding any of the nine problems until I have approved its spec. The workflow is:

**Step A — Produce one specification document per feature.** Each spec lives at `docs/specs/<NN>-<slug>.md` (e.g. `docs/specs/01-home-page-as-chat-hero.md`). Each spec contains:

- **Context & Motivation** — why this feature exists, in plain language a non-engineer could read.
- **User Stories** — written in the form *"As a {user type}, I want to {action} so that {outcome}."* Cover the primary path, the secondary paths, and the failure paths.
- **Functional Requirements** — numbered, atomic, testable. Each requirement should map cleanly to one or more tests later.
- **Non-Functional Requirements** — performance budgets (e.g. p95 first-token latency), accessibility (WCAG 2.1 AA conformance for any new UI), privacy (what data is collected, where it is stored, who can read it), security, observability.
- **Out of Scope** — explicitly list what this spec does *not* cover, so scope doesn't drift across sprints.
- **Architecture Notes** — name the new ports, adapters, entities, value objects, and use cases. Identify which Gang of Four patterns apply (see Section 3.4) and where SOLID principles apply with extra force.
- **Data Model & API Contracts** — Zod schemas for every new tool input/output, request/response shapes, persistence shape if any.
- **Test Plan** — see Section 3.3 for the full taxonomy.
- **Acceptance Criteria** — a final checklist of *"this feature is MVP-complete when..."* statements.
- **Open Questions** — anything you need me to decide before sprinting.

Number the specs in execution order. Spec 1 is the home-page-as-chat-hero. Spec 2 is conversation memory + per-user sessions. Spec 3 is the budget tool. Spec 4 is tool-use API migration. And so on through Problem 9. You are allowed to merge two adjacent problems into one spec if they're tightly coupled — for example, Problems 4 (tool-use API) and 5 (model-composed answers) probably belong together because adopting tool-use makes the digest short-circuit obsolete by construction. Document the merge in the spec's Context section.

**Step B — Wait for my review of each spec before sprinting on it.** I will read the spec, push back, and approve it. Do not move on without approval. Spec review is fast; please don't try to skip it.

**Step C — For each approved spec, produce a sprint plan.** Sprint plans live at `docs/sprints/<NN>-<slug>.md` and contain:

- **Goal** — one-sentence outcome.
- **Tasks** — ordered, sized, each task a single PR-sized unit of work. Each task references the requirement number(s) from the spec it implements.
- **Dependencies** — what must be merged first (other sprints, infra, env vars).
- **Risks & Mitigations** — what could go wrong, how you'll know early.
- **Definition of Done** — every requirement from the spec has passing tests at every level the test plan calls for; CI is green; lint/typecheck/coverage gates pass; any new env vars are documented in the README and the `.env.local.example`; any new ADR is written.
- **Rollout Plan** — feature flag if needed, kill-switch behavior, telemetry to watch post-deploy.

**Step D — Execute the sprint.** Open a PR per task or per cohesive group of tasks. Reference the spec and sprint in the PR description. Do not batch unrelated changes.

**Step E — Update the docs.** After each sprint merges, update the README, the architecture docs, and any affected ADRs. Add a new ADR (`docs/adr/000N-<slug>.md`) for any architectural decision that constrains future work — adopting tool-use is an ADR, picking Redis over Postgres for sessions is an ADR, the layered moderation approach is an ADR.

### 3.2 — Test discipline

Every feature ships at MVP completion with **all three test levels**, and each level covers **positive, negative, and edge cases**. I am unusually strict about this. The CI must fail if any of the nine cells below is empty for a feature.

|              | Positive                          | Negative                                  | Edge                                                |
| ------------ | --------------------------------- | ----------------------------------------- | --------------------------------------------------- |
| Unit         | Happy path returns expected shape | Bad input is rejected with a clear error  | Boundary values, empty inputs, max sizes, nulls     |
| Integration  | Two adapters compose correctly    | Upstream provider failure is handled      | Partial responses, retries, rate-limit, timeouts    |
| End-to-end   | User completes the journey        | User hits a dead end and recovers         | Slow network, dropped streams, mid-conversation refresh, multi-tab |

**Definitions, so we agree:**

- **Unit tests** test one function or one class in isolation, with all dependencies mocked or stubbed. Live under `src/**/*.test.ts` near the code, run by `vitest`.
- **Integration tests** test a slice of the system — for example, the chat API route plus the orchestrator plus the in-memory tool registry plus a fake model client — without crossing the network to real providers. Live under `src/test/*.integration.test.ts`. Use the `nock` or `msw` library to stub HTTP at the network boundary so the real `fetch` calls in providers are exercised.
- **End-to-end tests** drive a real browser against a real running server. Use Playwright. Live under `e2e/*.spec.ts`. Real model calls are out of scope for E2E — set `NEXT_PUBLIC_USE_MOCK_CHAT=true` or stub the Anthropic endpoint with msw at the server layer, but exercise everything else end-to-end (location resolution, streaming, transcript persistence, card rendering, error recovery).

**Concrete test examples per feature** (this is illustrative, not exhaustive — your spec's Test Plan section must enumerate the full set):

For the **budget tool** (Problem 3):

- *Unit, positive:* `BudgetProfile` with valid inputs returns the correct burden tier.
- *Unit, negative:* negative income or NaN income returns a `VALIDATION_ERROR` from the tool.
- *Unit, edge:* income of $0, income of $1, very high income, missing optional fields, debt > income.
- *Integration, positive:* chat orchestrator gathers inputs across three turns and produces a budget verdict.
- *Integration, negative:* user provides contradictory inputs in different turns; the bot detects and asks to reconcile.
- *Integration, edge:* user pastes a 5000-token wall of text into one turn; tokens stay within model limits.
- *E2E, positive:* user starts on the home page, says "build me a budget for Houston," answers the bot's questions, sees the budget card.
- *E2E, negative:* user refuses to provide income; the bot gracefully degrades to a generic affordability rule of thumb.
- *E2E, edge:* user refreshes mid-conversation; transcript and partial profile survive.

For **multi-location data plumbing** (Problem 7):

- *Unit, positive:* `HousingMarketTool` returns the correct row for an exact location match.
- *Unit, negative:* a malformed location string returns a `VALIDATION_ERROR`, not a silent Newark fallback.
- *Unit, edge:* a location with no exact HUD seed match resolves to the nearest metro and the response includes a `usedFallback: true` flag.
- *Integration, positive:* `/api/chat` for "find rentals in Austin, TX" returns Austin listings.
- *Integration, negative:* RentCast 500s; the response surfaces a useful error and falls back to HUD baseline with disclosure.
- *Integration, edge:* user enters "TX" (state only); the tool asks for a city or picks a default metro and discloses the choice.
- *E2E, positive:* user types "Phoenix, AZ" into the location anchor and asks for jobs; results are Phoenix-flavored.
- *E2E, negative:* user types a nonsense string; the location anchor shows a clear error and the chat does not break.
- *E2E, edge:* user changes location mid-conversation; the bot acknowledges the switch and re-grounds future answers.

I expect every spec to include a table like the one above for that feature.

### 3.3 — SOLID, applied

Every new module must pass a SOLID review. Be concrete in the spec's Architecture Notes about which principle is doing the work where.

- **Single Responsibility.** Each class and each module has one reason to change. The current `ChatAssistantPanel.tsx` is a counterexample — it owns transcript state, tool-result state, snippet persistence, export-to-file, the input field, and the render. Decompose it.
- **Open/Closed.** Adding a new tool, a new location provider, or a new budget category should not require editing existing code paths — it should be additive. The MCP `ToolRegistry` is already shaped this way; preserve that property as you add the budget tool. The `ToolResultCards` rewrite must use a registry of renderers keyed by tool name, not a switch statement that grows with every tool.
- **Liskov Substitution.** Any concrete `ConversationRepository` (Redis-backed, in-memory, Supabase) must be drop-in interchangeable. Tests should run identically against any of them. The new `ToolUseModelClient` must be substitutable with a deterministic fake in tests.
- **Interface Segregation.** Do not let a single fat port grow to serve every consumer. If `ModelClient.generate` and `ModelClient.generateWithTools` start to feel awkward together, split them. If a tool only needs read access to retrieval, do not pass the full repository.
- **Dependency Inversion.** Application-layer code depends on ports (`ConversationRepository`, `ModelClient`, `TelemetryPort`, `ToolExecutor`) and never imports from `frameworks/` directly. The architectureBoundaries test already enforces this — keep it green.

### 3.4 — Gang of Four patterns, applied where they earn their keep

I want patterns used because they pay rent, not for their own sake. Here is where they should appear in this work, with the reasoning. Add them, name them in the code (in comments and class names), and call them out in the spec.

- **Strategy** — the location-resolution pipeline, where strategies include `OpenCageGeocodingStrategy`, `CachedGeocodingStrategy`, `OfflineHudFallbackStrategy`. Composing strategies is cleaner than nested ifs in `locationLookupTool`.
- **Adapter** — every external provider (Adzuna, USAJobs, RentCast, OpenCage, Supabase, Redis, Sentry) is already conceptually an adapter behind a port; make that explicit in naming. Add a Sentry adapter for telemetry.
- **Factory Method** — the MCP `createMcpServer()` is a factory. Extend the pattern: `createConversationRepository(env)` returns Redis in prod and in-memory in dev/test based on a config object. Same for `createTelemetryPort(env)`.
- **Composite** — `ToolResultCards` should render a composite tree of renderer components, with one leaf per tool-result variant. The composite handles ordering, animation, and the "no results yet" empty state uniformly.
- **Observer** — telemetry is naturally observer-shaped. Multiple observers (Sentry, console, future analytics) subscribe to the same event stream from `TelemetryPort`. Implement it as a fan-out telemetry adapter.
- **Chain of Responsibility** — moderation. Each link (length check, prompt-injection sniff, model-side refusal, output scrubber) decides to pass, transform, or reject. The current single-function `ensureMessageAllowed` becomes a configured chain.
- **Command** — tool calls in the new tool-use loop are commands. Each `ToolUseRequest` from the model is parsed into a `ToolCommand` object that carries name, validated input, and an `execute()` method against the `ToolExecutor`. This makes retry, logging, and replay clean.
- **Template Method** — the chat orchestration `AnswerChatQuestion` becomes a template method: `loadHistory → callModelWithTools → executeToolCalls → composeFinalAnswer → persistTranscript`. Subclasses or strategy parameters override individual steps for tests.
- **Decorator** — caching and rate-limiting in `guardedFetch` are decorators around the raw fetch. Make this explicit: `RateLimitedFetch(CachedFetch(BaseFetch))`. The current implementation already conceptually does this but is bundled into one function — separate the responsibilities.
- **Singleton** — be sparing. Module-level singletons are appropriate for the `McpServer` instance and the `ToolRegistry`. They are *not* appropriate for `ConversationRepository` if we're moving to Redis — that should be created via the factory and injected.

Where a pattern is not the right tool, do not force it. Document the choice.

### 3.5 — Definition of "MVP-complete" for each feature

A feature is MVP-complete when **all** of the following hold:

1. Every functional and non-functional requirement in the spec has a passing test at every level the test plan specifies, covering positive, negative, and edge cases.
2. CI is green: lint, typecheck, unit, integration, E2E, coverage threshold (set to 80% lines / 75% branches for new code).
3. The architectureBoundaries test still passes — no application-layer code imports from frameworks.
4. Telemetry events for the new feature are flowing to Sentry in production and visible in the local console in dev.
5. Documentation is updated: README, ADRs, `.env.local.example`, and the spec's "Acceptance Criteria" checklist is fully ticked.
6. A manual smoke test script (in `docs/operations/smoke-tests/<NN>.md`) walks a human through the feature end-to-end with expected outputs.

### 3.6 — What I want first, concretely

Before you write any code:

1. Produce a single document at `docs/PIVOT-PLAN.md` summarizing your understanding of the nine problems above, in your own words, with any disagreements or clarifying questions surfaced explicitly. Do not start specs until I have read this and replied.
2. Once I approve the pivot plan, produce **Spec 1 (home page as chat hero)** in full, following the structure in Section 3.1. Stop and wait for review.
3. After Spec 1 is approved, produce **Sprint Plan 1**. Stop and wait for review.
4. Execute Sprint 1, opening PRs as you go. Do not start Spec 2 until Sprint 1 is merged and the smoke test passes.
5. Repeat for Specs 2 through 9 (or fewer, if you merged some).

### 3.7 — Things I should not have to ask for

- Every PR description references the spec section and requirement numbers it implements.
- No commented-out code in PRs.
- No `any` in TypeScript outside of clearly annotated escape hatches at framework boundaries (and even there, prefer `unknown` plus a type guard).
- No new module-level mutable state that bypasses the ports/adapters discipline.
- No string-typed identifiers where an enum or branded type would do.
- No new env var without a corresponding entry in `.env.local.example` and a note in the README's environment section.
- No new external service without an adapter, a port, a fake for tests, and a feature flag for rollout.
- No new tool without a complete `description`, a strict Zod input schema, an output type, and a card renderer.

### 3.8 — When to push back on me

If, while writing a spec, you discover that something in this letter is wrong, contradictory, or unwise, **say so in the spec's "Open Questions" section.** I would rather adjust the plan than ship the wrong thing. In particular: if the budget tool's incremental-gathering design clashes with the model's tool-use semantics in some way I haven't anticipated, raise it. If Redis isn't the right session store for our scale, propose an alternative. If a Gang of Four pattern I named above is being forced into a place where it doesn't earn its keep, propose a simpler design.

---

## Closing

This is not a small piece of work. I would rather you go slowly, keep the architecture clean, and ship one feature at a time correctly than rush a half-built product. The clean-architecture scaffolding you are inheriting is good — preserve it, extend it, and do not let the new work erode the boundary discipline.

Start with the pivot plan at `docs/PIVOT-PLAN.md`. I'll be reading.

— Jeanpaul