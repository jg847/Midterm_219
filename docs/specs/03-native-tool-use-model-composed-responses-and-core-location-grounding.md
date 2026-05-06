# Spec 03: Native Tool Use, Model-Composed Responses, and Core Location Grounding

## Context & Motivation
Grounded Moves now has a chat-first homepage and browser-scoped session memory, but the core assistant runtime is still built around the wrong decision-maker. `AnswerChatQuestion.ts` classifies user text with regexes, `SelectTools.ts` hardcodes tool choice from that classification, `ExecuteToolPlan.ts` fabricates default tool inputs from the raw message, and `ComposeGroundedResponse.ts` still carries digest-oriented composition behavior. At the same time, the location-aware path is not honest enough: the orchestration layer and multiple tools still contain silent Newark-biased fallback behavior rather than one explicit, typed location abstraction.

This spec replaces that decision path with Anthropic native tool use, requires the final answer to be model-composed from grounded tool output, and establishes the typed `LocationContext` plus explicit location-resolution contract that later national-coverage work will build on. It intentionally merges Pivot Problems 4 and 5 and absorbs the core location-grounding part of Problem 7 because these changes are one orchestration pivot, not three independent runtime rewrites.

This spec does not include token streaming, budget planning, or national resource/content expansion. Its goal is to make the assistant a genuine model-driven conversational agent whose tool calls, final answers, and location grounding are coherent and testable.

## User Stories
1. As a user asking a housing, jobs, or affordability question, I want the assistant to decide which tools to call from the actual conversation so that I am not limited by brittle regex routing.
2. As a user asking a follow-up question, I want the assistant to compose its answer from the conversation plus grounded tool results so that the reply feels like one continuous session rather than a disconnected digest.
3. As a user asking about a city, ZIP code, metro, or state, I want the assistant to ground its tool calls to an explicit resolved location so that I can understand where the results came from.
4. As a user whose location input is ambiguous or incomplete, I want the assistant to disclose what it resolved and when fallback behavior was used so that I am not misled about which market I am seeing.
5. As a user comparing options in a non-Newark market, I want the assistant to avoid hidden Newark defaults so that the product behaves nationally rather than locally biased.
6. As an engineer shipping later streaming and budget features, I want the chat runtime to expose a real tool-use loop and typed location abstraction so that later features do not require another orchestration rewrite.
7. As an operator, I want tool-use steps, final-answer composition, and location-resolution behavior to emit clear telemetry so that rollout regressions are diagnosable.

## Functional Requirements
1. The chat runtime must replace regex-led tool routing with Anthropic native tool use for the main assistant path.
2. The model must receive the available tool catalog as structured tool definitions derived from the registered MCP tools rather than from a hand-maintained switch statement in the use case layer.
3. The runtime must parse model-returned tool-use requests into validated tool commands and execute them through the existing tool execution boundary rather than bypassing the `ToolExecutor` port.
4. The tool-use orchestration loop must continue until the model returns a final assistant message without pending tool calls or until the runtime hits a documented safety stop condition.
5. The runtime must preserve existing browser-session conversation history from Spec 2 and include that history in the tool-use model call sequence.
6. The final user-visible assistant answer for this spec must be composed by the model from grounded tool results and session history rather than by a digest short-circuit that bypasses the model.
7. `ComposeGroundedResponse.ts` or its replacement must no longer return digest summaries directly as the final answer for jobs, housing, affordability, or general intent paths.
8. The current regex-based `ClassifyIntent` and `SelectTools` decision path must no longer control primary tool selection for the production chat route once this spec is enabled.
9. The implementation must preserve the existing non-streaming response transport for this spec while making the internal orchestration loop tool-use aware.
10. Every tool-use request from the model must be validated against the tool's Zod input schema before execution.
11. If the model requests a tool with invalid arguments, the runtime must return a structured error result to the model and allow the model to recover or reformulate rather than crashing the request.
12. If a tool execution fails, the runtime must return the typed tool failure back into the model tool-use loop so the model can compose an honest degraded answer.
13. The system prompt for this spec must explicitly define the assistant's role as a location-aware U.S. housing, jobs, and affordability assistant and must instruct the model not to invent listings, wages, rents, or provider results.
14. The system prompt for this spec must instruct the model to cite grounded tool sources or tool names when claims come from tool output.
15. The system prompt for this spec must instruct the model to ask clarifying questions when the location context is missing, ambiguous, or too coarse for a grounded answer.
16. A typed `LocationContext` value object must become the core orchestration input for location-aware tool calls rather than ad hoc string fallbacks.
17. The tool-use runtime must operate on an explicit resolved `LocationContext` when one is available and must not silently substitute Newark-specific defaults at orchestration time.
18. `ExecuteToolPlan.ts` or its replacement must no longer default location-aware tool inputs to `"Newark, NJ"`, `"Newark"`, or `"NJ"` when location context is absent.
19. Core location-aware tools touched by this spec must return a standardized `locationResolution` field describing the resolved market used for the result and whether fallback behavior was applied.
20. If the user provides only a state-level location, the assistant must ask once for city or ZIP clarification before using a default metro fallback.
21. If the user declines clarification, ignores it, or repeats the same state-level request, the runtime may use the largest metro fallback for that state only if the final answer discloses the chosen metro and the reason for the fallback.
22. The runtime must persist enough per-session clarification state to distinguish between a first ambiguous state-level request and a repeated or declined state-level request on later turns.
23. The clarification-state contract must record, at minimum, the ambiguous location input, whether clarification has already been asked, and whether a disclosed fallback is now permitted for that same unresolved location.
24. The implementation must standardize a `locationResolution` field on outputs from every location-aware tool touched by this spec so presenters and the final assistant answer can disclose the resolved market uniformly.
25. The `locationResolution` contract must include the resolved label shown to the user, the resolution kind, whether fallback was used, and the fallback reason when applicable.
26. The tool-use model configuration for this spec must raise the current low final-answer token ceiling to a chat-appropriate budget and must not retain the legacy 350-token limit on the primary runtime path.
27. The implementation must remove silent `rows[0]`-style fallback behavior from the core location-grounding path touched by this spec and replace it with explicit disclosed fallback semantics.
28. The implementation must remove hardcoded Newark-biased baseline defaults such as the `1720` affordability baseline from core answer-composition paths touched by this spec.
29. The assistant must preserve current MCP tool registration and existing tool names unless a rename is required for clarity and documented in an ADR.
30. Tool descriptions and input schemas exposed to the model must be strong enough for native tool use, including enough detail for the model to choose the right tool and understand provider limitations such as city/state-only filtering.
31. The tool-use loop must include a bounded maximum number of tool rounds per user turn and must surface a graceful failure if the bound is exceeded.
32. The runtime must preserve the current route contract of `POST /api/chat` for this spec, even though the internals change from regex routing to model-driven tool use.
33. Existing session persistence from Spec 2 must continue to store user and assistant messages for this spec, and assistant messages must continue to retain the artifacts required by the current UI contract.
34. This spec must introduce a deterministic Anthropic mock harness for unit, integration, and E2E coverage of plain assistant answers, tool-use blocks, invalid tool arguments, degraded tool results, and final composed answers.
35. This spec must introduce a shared conversation fixture shape for transcript, session metadata, `LocationContext`, clarification-state snapshots, and tool-result sequences so later specs reuse one orchestration fixture model.

## Non-Functional Requirements

### Performance
1. The internal tool-use loop for a single user turn must complete within the current non-streaming request budget for local and CI verification, with explicit safeguards against unbounded tool-call recursion.
2. The non-streaming response path must not introduce a second model-composition pass beyond what the tool-use loop requires for one final answer.
3. Tool catalog construction must be deterministic and must not materially increase first-request overhead beyond normal route initialization.
4. Location-resolution disclosure and fallback handling must not introduce unnecessary extra provider round trips when an explicit `LocationContext` is already available.
5. Local production-build verification for this spec must still pass without requiring streaming transport.
6. The primary tool-use runtime must replace the legacy 350-token final-answer ceiling with a chat-appropriate configured limit large enough to support grounded multi-paragraph answers and citations.

### Accessibility
1. Any new clarification or location-disclosure UI surfaced through the existing chat transcript must remain keyboard accessible and screen-reader readable through the current transcript presentation contract.
2. Tool-use failures and location-resolution disclosures rendered in the transcript must have user-readable text rather than only card metadata.
3. This spec must not reduce the accessibility of the existing chat input, retry, reset, or transcript navigation behavior.

### Privacy
1. This spec must not expand persistent user data beyond the session transcript, tool traces, and coarse location context already allowed by Specs 1 and 2.
2. The model prompt must not include raw provider credentials, internal environment values, or unrelated user-local storage state.
3. State-level fallback or metro-resolution disclosures must not imply false precision about the user's physical location.

### Security
1. Tool execution must remain server-side only; no provider-secret-bearing tool calls may move into the browser.
2. Invalid tool-use blocks returned by the model must be validated and rejected safely before execution.
3. The tool-use loop must not allow the model to invoke unregistered tools or bypass the MCP tool registry.
4. The implementation must preserve current route-level abuse controls and moderation entry points while the orchestration internals change.

### Observability
1. The system must emit telemetry for model tool-use requests, tool-use validation failures, executed tool commands, final assistant responses, and tool-loop termination by safety bound.
2. The system must emit telemetry for location clarification asked, disclosed metro fallback used, and silent-default prevention paths.
3. Tool-use and location-resolution telemetry must be visible in local console behavior and production telemetry wiring when configured.
4. Operational logs and telemetry must not require logging full user transcripts or raw provider payloads to diagnose orchestration failures.

## Out of Scope
1. Token streaming and streamed tool-status transport.
2. Budget domain modeling, budget tool design, or budget card rendering.
3. Browser-session redesign or transcript hydration redesign beyond preserving Spec 2 behavior.
4. National resource-hint redesign and expanded state or metro coverage beyond the core location-grounding abstractions needed for this spec.
5. Full telemetry productionization via `SentryTelemetry` fan-out wiring.
6. Retrieval repository truthfulness cleanup or moderation redesign.
7. Typed UI decomposition of every tool-result renderer.
8. Full HUD seed expansion to the top 50 metros.

## Architecture Notes
The local hypothesis for this spec is narrow and falsifiable: the controlling behavior is not in the tool implementations themselves, but in the current orchestration path that decides tools before the model ever sees the conversation. A cheap disconfirming check was reading `src/application/chat/AnswerChatQuestion.ts`, `src/application/chat/ExecuteToolPlan.ts`, `src/application/chat/SelectTools.ts`, `src/frameworks/ai/AnthropicModelClient.ts`, `src/frameworks/mcp-tools/tools/opportunityFeedTool.ts`, and `src/frameworks/mcp-tools/tools/housingDigestTool.ts`; that confirmed all of the following:

- tool selection is still controlled by regex intent mapping and hardcoded tool lists;
- tool inputs are still fabricated by `defaultInputForTool` rather than by validated model-selected arguments;
- the model client only supports plain `messages` generation, not native tool-use blocks;
- core location-aware paths still carry silent Newark-biased fallbacks such as `"Newark, NJ"`, `rows[0]`, and `1720`.

### Current Owning Surfaces
- `src/application/chat/AnswerChatQuestion.ts` currently owns the high-level orchestration sequence.
- `src/application/chat/SelectTools.ts` currently hardcodes tool selection.
- `src/application/chat/ExecuteToolPlan.ts` currently manufactures tool inputs and still contains Newark defaults.
- `src/application/chat/ComposeGroundedResponse.ts` currently owns final answer composition and digest legacy behavior.
- `src/application/ports/ModelClient.ts` and `src/frameworks/ai/AnthropicModelClient.ts` currently expose only plain text-generation semantics.
- `src/frameworks/mcp-tools/index.ts` and tool definitions currently own the catalog the model will need for native tool use.
- `src/domain/models/LocationContext.ts` exists but is not yet the fully enforced orchestration abstraction.

### Proposed Implementation Shape
1. Introduce a tool-use-aware model port that can send system prompt, conversation messages, tool definitions, and tool-result continuation back to Anthropic.
2. Replace the regex-led orchestration with a tool-use loop that performs `load history -> ask model -> validate tool request -> execute tool command -> return tool result -> ask model again -> persist final assistant message`.
3. Keep MCP tools as the executable tool surface, but derive the model-visible catalog from their registered definitions and improved descriptions.
4. Elevate `LocationContext` into the required orchestration abstraction for location-aware requests and tool arguments.
5. Replace silent Newark fallbacks in orchestration and touched core tools with explicit disclosed fallback behavior.
6. Preserve the current route boundary and session repository shape from Spec 2 while swapping the internal decision path.

### Ports and Adapters
- `ConversationRepository` remains the session and transcript port from Spec 2.
- `ToolExecutor` remains the execution boundary for registered tools.
- `ModelClient` may either be extended with native tool-use semantics or replaced by a narrower `ToolUseModelClient` port; either implementation is acceptable if the final ADR explains the choice and preserves testability.
- a tool-catalog adapter should expose model-usable tool definitions from the MCP registry without forcing application-layer imports from framework code.
- `LocationContext` should become a stronger value object or companion schema that includes explicit resolution or fallback metadata for orchestration-facing use.

### SOLID Emphasis
- Single Responsibility: tool selection, tool execution, model prompting, and location fallback policy must not remain fused in one orchestration method.
- Open/Closed: adding a new MCP tool should require registration and schema/description additions, not edits to a central selector switch.
- Liskov Substitution: the Anthropic tool-use client must be replaceable with a deterministic fake that can simulate tool-use turns in tests.
- Interface Segregation: if plain text generation and tool-use generation have different call semantics, the model boundary should split rather than become a fat interface.
- Dependency Inversion: application-layer orchestration must continue to depend on ports and typed value objects, not on the Anthropic SDK or tool framework internals directly.

### Pattern Fit
- Command: each model-requested tool call becomes a validated `ToolCommand` executed through the tool executor.
- Adapter: Anthropic tool-use transport, MCP tool catalog exposure, and provider-backed location-resolution metadata remain adapter concerns.
- Factory Method: environment-based creation of model client and tool-catalog adapter remains appropriate.
- Template Method: the chat orchestration sequence should become an explicit repeatable loop with well-defined steps for history load, model call, tool execution, and final persistence.
- Strategy: location-resolution and fallback policy should be isolated from ad hoc string fallback logic.

### ADR Impact
This spec should produce at least one ADR covering the model boundary for native tool use and the decision to either extend `ModelClient` or add a dedicated tool-use model port. If the final implementation introduces a distinct location-resolution policy object or strategy family, document that in the same ADR or a companion ADR before the sprint closes.

## Data Model & API Contracts
This spec introduces tool-use orchestration contracts and strengthens the location-grounding contract.

### Proposed Schemas
1. `ResolvedLocationContextSchema = z.object({ formatted: z.string().min(2), city: z.string().min(2).optional(), state: z.string().min(2), country: z.string().min(2).default("US"), lat: z.number().optional(), lng: z.number().optional(), radiusMiles: z.number().int().min(1).max(100), resolutionKind: z.enum(["exact", "geocoded", "state_default_metro", "fallback_metro"]), resolutionLabel: z.string().min(2), usedFallback: z.boolean(), fallbackReason: z.string().optional(), clarificationAsked: z.boolean().default(false) })`
2. `ModelToolDefinitionSchema = z.object({ name: z.string().min(1), description: z.string().min(20), inputSchemaJson: z.record(z.string(), z.unknown()) })`
3. `ModelToolUseRequestSchema = z.object({ id: z.string().min(1), toolName: z.string().min(1), input: z.record(z.string(), z.unknown()) })`
4. `LocationResolutionSchema = z.object({ resolvedLabel: z.string().min(2), resolutionKind: z.enum(["exact", "geocoded", "state_default_metro", "fallback_metro"]), usedFallback: z.boolean(), fallbackReason: z.string().optional() })`
5. `ClarificationStateSchema = z.object({ ambiguousInput: z.string().min(2), clarificationAsked: z.boolean(), disclosedFallbackPermitted: z.boolean() })`
6. `ModelToolUseResultSchema = z.object({ toolUseId: z.string().min(1), toolName: z.string().min(1), ok: z.boolean(), payload: z.unknown(), errorCode: z.string().optional(), locationResolution: LocationResolutionSchema.optional(), locationContext: ResolvedLocationContextSchema.optional() })`
7. `ToolLoopStepSchema = z.discriminatedUnion("type", [z.object({ type: z.literal("assistant_message"), text: z.string().min(1) }), z.object({ type: z.literal("tool_use"), request: ModelToolUseRequestSchema }), z.object({ type: z.literal("tool_result"), result: ModelToolUseResultSchema })])`
8. `ToolUseChatResponseSchema = z.object({ sessionId: z.string().min(1), answer: z.string().min(1), citations: z.array(z.string()), toolResults: z.array(ModelToolUseResultSchema), resolvedLocation: ResolvedLocationContextSchema.optional(), clarificationState: ClarificationStateSchema.optional(), clarificationQuestion: z.string().optional() })`

### Model Port Expectations
1. The tool-use-aware model boundary must accept ordered conversation messages, the system prompt, and a model-visible tool catalog.
2. The model boundary must return either a final assistant message or one or more tool-use requests in a typed form the application layer can validate.
3. The fake model used in tests must support deterministic scripts for assistant-only, tool-use, invalid-tool, degraded-tool, and final-answer paths.

### Tool Catalog Contract
1. The model-visible tool catalog must be derived from registered tools and must expose tool name, tool description, and a JSON-schema-compatible input definition.
2. Tool descriptions for native tool use must disclose limitations such as city/state-only provider filtering or fallback baseline behavior where relevant.
3. Unregistered tools must never appear in the model-visible catalog.

### Location Contract Changes
1. Location-aware tool inputs must accept a typed resolved `LocationContext` or equivalent decomposed fields generated from it rather than orchestration defaults that silently inject Newark.
2. Tool outputs touched by this spec must expose a standardized `locationResolution` field so the assistant and presenters can disclose what market was used uniformly.
3. The standardized `locationResolution` field must include the resolved label shown to the user, the resolution kind, whether fallback was used, and the fallback reason when applicable.
4. If a metro fallback is applied, the output must include `usedFallback: true` and a human-readable fallback reason.

### Clarification State Contract
1. The session layer must preserve a typed clarification-state record for unresolved ambiguous location requests when the assistant has already asked a clarifying question.
2. Clarification state must be keyed tightly enough to distinguish repeated requests for the same ambiguous location from unrelated future turns.
3. When the user clarifies the market explicitly, the stored clarification state for the prior ambiguous location must be cleared or superseded deterministically.

### Route Contract Expectations
1. `POST /api/chat` must remain the route contract for this spec.
2. The request may continue receiving the browser session ID and optional location from Spec 2, but the runtime must be free to ask a clarifying question rather than forcing immediate tool execution.
3. The response may continue using the current non-streaming payload contract for this spec as long as it can represent final answer text, citations, tool results, resolved location disclosure, and any persisted clarification-state handoff required for the next turn.

## Test Plan
The feature must ship with unit, integration, and end-to-end coverage across positive, negative, and edge paths.

| Level | Positive | Negative | Edge |
|---|---|---|---|
| Unit | Tool-use orchestrator converts a model tool request into a validated tool command and returns a final assistant answer with ordered history preserved | Invalid model tool arguments and unregistered tool names are rejected safely and surfaced back into the loop as typed failures | Max tool-round bound, empty tool catalog, ambiguous state-only location input, and non-exact location fallback all behave deterministically |
| Integration | Chat route plus tool-use model fake plus real tool registry execute multi-step tool-use turns and persist a final grounded assistant response | Provider or tool failure produces an honest degraded answer without crashing the route or falling back to regex selection | State-only clarification, disclosed metro fallback, preserved session history, and model recovery after one invalid tool request all behave consistently |
| End-to-end | User asks for jobs or housing in a chosen market and receives a model-composed grounded answer plus cards from the real app path | User enters an ambiguous or invalid location and the assistant asks for clarification or shows an honest degraded response without breaking chat | Mid-conversation market change, safe maximum tool-round termination, and session continuity with the new tool-use loop behave correctly under mock Anthropic control |

### Minimum Unit Coverage
1. Tool catalog adapter exposes registered tool definitions in a model-usable shape.
2. Tool-use orchestration accepts a valid model tool request and executes the corresponding tool command.
3. Invalid tool input returned by the model is converted into a typed validation failure result rather than crashing the loop.
4. Unregistered tool names are rejected safely.
5. Final assistant composition no longer bypasses the model through digest short-circuit logic on the primary runtime path.
6. `LocationContext` resolution metadata is preserved through tool call and final answer composition.
7. Clarification state persists across turns so state-level fallback asks once, then defaults with disclosure on repetition or decline.
8. Standardized `locationResolution` output is attached consistently to every location-aware tool result touched by this spec.
9. The configured final-answer token budget on the primary runtime path is greater than the legacy 350-token ceiling.
10. Safety bound on tool rounds terminates deterministically with a graceful error path.

### Minimum Integration Coverage
1. First-turn chat request executes a model-driven tool-use path rather than the regex tool-selector path.
2. Multi-turn chat request for the same session reuses prior history inside the tool-use loop.
3. Final assistant response contains model-composed prose plus grounded citations after one or more tool calls.
4. Invalid model-requested tool arguments are surfaced back into the loop and recover to a final assistant answer or honest failure.
5. Location-aware tool results include standardized `locationResolution` metadata and do not silently default to Newark.
6. State-only location requests ask for clarification once and then use disclosed metro fallback behavior if the user does not narrow the request.
7. The persisted clarification-state contract is cleared or superseded correctly when the user later provides an explicit city or ZIP.

### Minimum End-to-End Coverage
1. Jobs search path with explicit city or ZIP context.
2. Housing or affordability path with explicit city context and model-composed answer.
3. Ambiguous state-only path that asks for clarification.
4. Repeated state-only request path that discloses the chosen metro fallback.
5. Invalid-location recovery path.
6. Session-continuity path showing that the new tool-use loop still respects Spec 2 conversation memory.
7. Same-browser refresh or follow-up after a clarification prompt preserves the one-time clarification behavior rather than asking the same state-level question again.

## Acceptance Criteria
1. Grounded Moves no longer uses regex intent classification or hardcoded tool-selection lists as the primary production decision path for chat orchestration.
2. The model receives a structured tool catalog and can request registered tools with validated inputs.
3. The chat runtime executes model-requested tools through the existing tool execution boundary and loops until a final assistant answer is produced or a safety bound is reached.
4. Final assistant answers on the primary runtime path are model-composed from grounded tool output rather than returned directly from digest summaries.
5. Session history from Spec 2 remains part of the model call sequence under the new tool-use runtime.
6. `LocationContext` becomes the explicit orchestration abstraction for location-aware tool calls.
7. Location-aware tool outputs touched by this spec expose a standardized `locationResolution` field that presenters and the final assistant answer both use for honest disclosure.
8. Core orchestration and touched tool paths no longer silently default to Newark-specific values such as `"Newark, NJ"`, `rows[0]`, or `1720`.
9. Ambiguous state-level requests follow the approved product rule: ask once, then default with disclosure, with clarification state persisted across turns until resolved or superseded.
10. Tool and location failures produce honest degraded responses rather than hidden fallbacks or route crashes.
11. The primary runtime path no longer uses the legacy 350-token final-answer ceiling.
12. A deterministic Anthropic mock harness and shared conversation fixtures, including clarification-state fixtures, exist for unit, integration, and E2E coverage of the new orchestration path.
13. Required unit, integration, and E2E coverage for this feature are present and passing.
14. CI is green for the Spec 3 change set, including lint, typecheck, unit, integration, E2E, and production build.
15. Tool-use and location-grounding telemetry is visible in development and production wiring without logging full conversation contents.
16. A smoke-test runbook for native tool use, model-composed answers, and location-grounding disclosure exists before the feature is called MVP-complete.

## Open Questions
1. No product-level open question blocks this spec. The implementation may either extend `ModelClient` or introduce a dedicated tool-use model port, but that choice must be captured in an ADR before sprint execution closes.