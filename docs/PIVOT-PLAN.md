# Pivot Plan

## Purpose
This document captures my understanding of the pivot described in `Pivot-Brief.md`, restates the work in implementation terms for this repository, and identifies the decisions that should be reviewed before any feature specification begins.

## Status
Approved with revisions on 2026-05-04. The sequence, scope boundaries, and open decisions below reflect the approved changes and should be treated as the current planning baseline.

## Current Repo Assessment
The repository already has useful clean-architecture scaffolding, a tool registry foundation, provider adapters, and test/build infrastructure. The main issue is not a lack of structure; it is that the shipped behavior still reflects the earlier product framing:

- the home page is not the chatbot;
- the chat flow is stateless in practice;
- tool invocation is regex-led rather than model-led;
- answer composition is partly templated rather than genuinely conversational;
- location handling still carries Newark-specific defaults;
- budget planning is not a first-class capability.

This means the pivot is primarily a behavior and architecture realignment, not a greenfield rebuild.

## Product Restatement
The product is now a location-aware housing and affordability chatbot for any U.S. user. The product name is **Grounded Moves**. Its primary jobs are:

1. help users find housing in a location they specify;
2. help users find jobs in that location;
3. help users build a realistic budget and judge whether the observed jobs and housing are affordable together.

The chatbot is the primary surface of the application. Supporting pages such as Story and Resources remain useful, but they are secondary and should either support the chat directly or move out of the primary above-the-fold interaction.

The assistant must behave like a real conversational agent:

- session-scoped memory across turns;
- per-user session identity, not a shared demo session;
- Anthropic native tool use instead of regex intent routing;
- streamed responses;
- model-composed grounded answers with citations;
- clarifying questions when information is incomplete, especially for budget building.

## Problem Restatement

### 1. Home Page Must Become Chat-First
The current landing page still presents the chatbot as one option among several. The pivot requires `/` to become the primary conversation entry point with visible input above the fold, and the location anchor must sit inside that flow rather than on a disconnected screen.

### 2. Conversation Memory Must Become Real and Durable
The application writes transcript messages but does not feed them back into the model. Session identity is hardcoded and not browser-specific. In-memory storage also breaks under serverless cold starts and horizontal scaling. The system needs durable, per-browser conversation history and session identifiers.

### 3. Budget Planning Must Become a Tool-Callable Capability
Budgeting currently exists as a static UI widget, not as a domain capability the assistant can use during conversation. The pivot requires a budget domain model, a callable tool, structured outputs, and a conversational protocol for collecting budget inputs incrementally.

### 4. Tool Orchestration Must Move From Regex to Native Tool Use
Tool choice and parameter extraction are currently shallow and brittle. The model should receive a structured tool catalog and decide when to call tools, with the application orchestrator executing those commands and returning results until the model is ready to answer.

### 5. Final Answers Must Be Model-Composed, Not Digest-Templated
The current digest shortcut undermines the conversational product. Once native tool use is adopted, the final answer should come from the model using the full tool context and a real system prompt, rather than from templated summaries.

### 6. Streaming Must Be End-to-End
The current request/response loop hides work behind a temporary placeholder and then returns a block of text. The pivot requires true streaming for both tool execution status and final answer tokens.

### 7. Location Handling Must Become Explicit, Honest, and National
The codebase still hides Newark-biased defaults inside fallback paths. Every location-aware tool must accept explicit location context, disclose resolution behavior, use radius where supported, and avoid silent Newark-specific assumptions.

### 8. Copy, Naming, and Resources Must Match the New National Product
The product name, README, app framing, and resource hints still reflect the prior Newark/student-specific framing. The supporting content must become location-aware and nationally framed.

### 9. Operational and Structural Gaps Need a Hardening Pass
Telemetry, retrieval naming/behavior, moderation design, serverless-safe state, and oversized UI rendering logic all need cleanup after the core pivot. These are real issues, but they should follow the core product and orchestration changes rather than interrupt them.

## Proposed Spec Sequence
I recommend seven specs rather than nine. Two adjacent problem groups remain merged, and one later hardening spec is now explicitly treated as a set of independently shippable tracks rather than a single omnibus sprint.

### Spec 1. Home Page as Chat Hero
Covers Problem 1.

### Spec 2. Conversation Memory and Browser Sessions
Covers Problem 2 and the session-related part of Problem 9.

### Spec 3. Native Tool Use, Model-Composed Responses, and Core Location Grounding
Merges Problems 4 and 5 and lifts the core location-grounding work out of Problem 7.

Rationale:
- adopting native tool use changes how the answer is produced by construction;
- the digest shortcut becomes obsolete in the same change;
- both changes require the same model client and orchestrator redesign;
- the typed `LocationContext` value object and removal of silent Newark fallbacks belong in the same redesign because tool selection, tool arguments, and model grounding should operate on one explicit location abstraction rather than raw strings.

Spec 3 also absorbs these location-grounding responsibilities:
- introduce a typed `LocationContext` value object used by orchestration and location-aware tools;
- remove silent Newark defaults from core orchestration and tool parameter fallback paths;
- make explicit location resolution and disclosure part of the tool-use contract.

### Spec 4. Streaming Chat Responses and Tool Status
Covers Problem 6.

Dependency note:
- this spec depends directly on Spec 3 and shares the same event and orchestration model;
- I do not recommend merging it into Spec 3 because the transport and client rendering work are still large enough to deserve their own review and rollout plan.

### Spec 5. Budget Planning Capability
Covers Problem 3.

Dependency note:
- this spec now lands after Specs 3 and 4 so the budget capability is built on the real model-driven orchestrator and streaming surface rather than the regex-based path.

### Spec 6. National Resource Framing and Expanded Location Coverage
Covers the remaining parts of Problems 7 and 8 after Spec 3 has established the typed location abstraction.

Rationale:
- location-aware resources, copy, HUD seed expansion, and metro-level fallback resolution all depend on the national framing;
- the location value object itself should already exist by this point, so Spec 6 can focus on data coverage, resource quality, and user-visible honesty instead of foundational orchestration changes.

### Spec 7. Hardening and Production Readiness Tracks
Covers the remaining parts of Problem 9, excluding the session storage concerns already handled in Spec 2.

Spec 7 is not one omnibus sprint. It is one specification with independently shippable sections, each expected to produce its own sprint plan and rollout path:
- Track 7A: telemetry productionization (`SentryTelemetry`, fan-out observer adapter, production wiring);
- Track 7B: moderation redesign (chain-of-responsibility guardrail pipeline);
- Track 7C: retrieval and naming cleanup (`SupabaseRetrievalRepository` truthfulness and real adapter plan);
- Track 7D: serverless-safe operational state beyond sessions (`guardedFetch`, `ApiRateLimiter`, remaining in-process maps);
- Track 7E: typed tool-result presentation and UI decomposition.

## Dependency View
The recommended execution order is constrained by architecture, not only by UX priority.

1. Spec 1 can proceed first because it primarily changes product shell and routing.
2. Spec 2 should follow before deeper chat capabilities because later work depends on real session identity and durable history.
3. Spec 3 is the core orchestration pivot and should also establish the typed location abstraction and removal of silent Newark fallbacks from that core loop.
4. Spec 4 depends on Spec 3 because streaming must share the same event model and tool-use loop.
5. Spec 5 should follow Specs 3 and 4 so the budget tool lands on the final conversational runtime.
6. Spec 6 should follow once the model, streaming behavior, and core location grounding are stable enough to support broader national resource and fallback coverage.
7. Spec 7 should be executed as independent hardening tracks, not as one final catch-all sprint.

## Sprint Planning Additions
Every sprint plan under `docs/sprints/` should include two explicit additions beyond the original brief:

### Feature Flags and Rollout Safety
Each sprint plan must include:
- the feature flag or kill-switch strategy, even if the conclusion is that no new flag is required;
- safe fallback behavior if the feature is disabled or partially degraded;
- the telemetry signals that indicate whether rollout is healthy;
- rollback criteria specific to that sprint.

This is especially important for Spec 3, where the tool-use orchestration path will replace the current regex flow.

### Shared Test Harness Expectations
Specs that expand the chat orchestration surface must define shared fixtures rather than letting every test build bespoke stubs. At minimum, Spec 3 should define:
- a shared conversation fixture shape for transcript, location, and partial tool state;
- a deterministic Anthropic mock harness for unit, integration, and E2E coverage;
- reusable tool-result fixtures for common happy, degraded, and provider-failure cases.

## Architecture Direction
The existing clean-architecture layout should remain in place. The pivot should extend it rather than bypass it.

### Ports and Adapters Likely Needed
- `ConversationRepository` remains the primary transcript port, with Redis and in-memory adapters.
- a dedicated model tool-use port is likely warranted if `ModelClient` becomes too broad.
- `TelemetryPort` should gain a production Sentry-backed adapter and likely a fan-out observer adapter.
- `LocationContext` should become a first-class typed value object shared across orchestration, tools, and presenters rather than a loose string helper pattern scattered across tools.
- budget planning needs a proper domain entity and presenter/view-model layer.

### Testing Harness Direction
Spec 3 should establish the shared test harness for all later chat work:

- one Anthropic mock harness that can simulate plain assistant messages, `tool_use` blocks, tool-result continuation, and streamed token output;
- one shared fixture factory for transcript state, session metadata, and resolved `LocationContext` instances;
- one E2E-safe mock mode that exercises the real browser, real route handlers, and real presenter flow while stubbing Anthropic deterministically.

Without this harness, the E2E surface for Specs 3 through 6 will become too expensive to maintain.

### Pattern Fit
The patterns named in the brief mostly fit the repo well when applied narrowly:

- Strategy: location resolution pipeline.
- Adapter: external providers and telemetry implementations.
- Factory Method: environment-dependent repository and telemetry construction.
- Observer: fan-out telemetry.
- Command: model-requested tool execution.
- Decorator: cache and rate-limit fetch wrappers.

Patterns I would apply carefully rather than force:

- Template Method: may be useful for orchestration, but composition may be simpler than inheritance if test seams remain explicit.
- Composite: appropriate for typed tool-result rendering if the UI decomposition stays small and concrete.
- Singleton: should stay limited to genuinely shared stateless registries.

## Main Technical Risks

### Streaming and Tool Use Are Tightly Coupled
The application should avoid implementing a second orchestration model just to add streaming later. The tool-use loop and the streaming transport need to agree on event shape early.

### Budget Collection Needs Persistent Partial State
Incremental budget gathering implies that a partial budget profile must survive across turns. That state can likely live inside the conversation/session layer, but the spec must make the storage and merge rules explicit.

### “Any U.S. Location” Needs a Real Location Model
City, ZIP, state, metro, ambiguous place names, radius behavior, and fallback metro mapping are not just string parsing problems. The project likely needs a typed `LocationContext` or equivalent value object to prevent silent behavior drift.

### Serverless Safety Affects More Than Conversation History
The brief correctly calls out `InMemoryConversationRepository`, `guardedFetch`, and `ApiRateLimiter`, but there may be adjacent module-level caches or mutable state worth auditing during the hardening phase.

### Test Scope Will Grow Quickly
The required unit/integration/E2E matrix is correct, but it will add noticeable maintenance cost. Specs should keep requirements atomic so the test matrix stays tractable.

## Clarifications and Pushback

### 1. Streaming Could Be Specified Separately, but It Should Not Be Designed Separately
I agree with keeping streaming as its own reviewed unit if desired. I do not agree with treating it as a transport-only afterthought. The event model should be designed while specifying native tool use.

### 2. Redis Is Pragmatic, but Retention Rules Need to Be Explicit
Upstash Redis is a sensible session and operational-state store for this architecture. The missing part is policy: transcript retention period, partial budget retention, and deletion behavior should be called out in the relevant specs.

### 3. The Budget Tool Needs a Boundary Between “Profile State” and “Recommendation Logic”
The tool should not become a hidden conversation-state store. My current view is:

- the conversation/session layer stores partial budget facts gathered over time;
- the budget tool evaluates a validated partial or complete profile and returns structured guidance;
- the model decides whether it has enough information to call the tool or whether it should ask another question.

If you want a different split, that should be decided in the budget spec.

## Decisions Needed Before Spec 1

### Product Naming
Resolved: the product name is **Grounded Moves**.

Reasoning:
- it is national rather than Newark-specific;
- it fits housing, job search, and budgeting without sounding like a single-purpose rent calculator;
- it communicates the product goal of making realistic, evidence-grounded moves.

### `/chat` Handling
Resolved: redirect `/chat` to `/` to preserve existing links. Removal can be considered later only if routing simplification is meaningful.

### Session Retention Expectations
Resolved: retain browser sessions for 30 days in Redis and provide an explicit reset control in the UI.

### Location Anchor Behavior for Ambiguous Inputs
Resolved principle: ask once, then default with disclosure.

Operational rule:
- if the user provides only a state, ask for a city or ZIP once;
- if they decline, ignore the clarification, or repeat the state-level request, default to the largest metro in that state;
- always disclose which metro was chosen, why it was chosen, and how the user can change it.

## Recommended Next Step
If this plan matches your intent, the next artifact should be `docs/specs/01-home-page-as-chat-hero.md` and it should include:

- the selected `Grounded Moves` product naming and homepage copy direction;
- the new homepage/chat layout requirements;
- routing behavior for `/chat`;
- accessibility and performance expectations for the chat-first landing experience;
- the required unit, integration, and E2E test matrix for the homepage pivot.

## Current Baseline
This plan is now the approved baseline for the next artifact. Spec 1 should follow this version of the sequence, the resolved decisions above, and the added sprint-plan and test-harness expectations.