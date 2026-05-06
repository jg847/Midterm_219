# Spec 05: Budget Planning Capability

## Context & Motivation
Grounded Moves can now hold browser-scoped conversations, run native tool use, and stream responses, but it still cannot do the third core product job from the pivot: help a user build a realistic personal budget and judge whether housing and jobs fit together. The current codebase only has a static `AffordabilityCalculator` on the Story page plus a small `calculateHousingBurden(...)` helper and `getAffordabilityInsights(...)` use case. None of that is callable by the chat runtime, none of it persists partial facts across turns, and none of it returns a structured artifact the assistant can cite and explain.

This spec turns budgeting into a first-class conversational capability. The assistant must be able to gather budget facts over multiple turns, reuse already-known values from the session, call a dedicated `budget_plan_tool`, and return a structured budget result with a verdict, category breakdown, and next-step guidance. This spec depends on Specs 2, 3, and 4 because persistent session state, native tool use, and streamed clarification behavior are already the approved foundation for this interaction.

This spec covers Pivot Problem 3. It does not redesign the broader national resource catalog, moderation hardening, or the remaining production-readiness tracks.

## User Stories
1. As a user considering a move, I want the assistant to help me build a realistic budget over multiple turns so I do not have to know every number up front.
2. As a user comparing a job and a rental, I want the assistant to tell me whether the combination is financially realistic so I can judge the move honestly.
3. As a user missing key numbers, I want the assistant to ask only the next most useful budget question so the process feels conversational rather than like a long form.
4. As a user who cannot or will not provide every budget detail, I want the assistant to degrade gracefully and still explain what it can and cannot conclude.
5. As a user returning after a refresh, I want my in-progress budget facts to survive in the same browser session so I can continue where I left off.
6. As a user who changes rent, income, or debt assumptions mid-conversation, I want the budget profile to update cleanly so the answer reflects my latest numbers.
7. As an operator, I want telemetry for budget-state collection, validation failure, tool execution, and final verdict generation so rollout issues are diagnosable.

## Functional Requirements
1. Grounded Moves must expose budgeting as a dedicated tool-callable capability on the native-tool-use chat path.
2. The budgeting capability must be implemented as a `budget_plan_tool` registered in the existing tool catalog rather than as a presenter-only helper.
3. The assistant must be able to gather budget facts incrementally across multiple turns instead of requiring the full profile in one request.
4. The conversation/session layer must persist in-progress budget facts for the current browser session so a refresh or later turn can resume the same budgeting flow.
5. Budget-state persistence must remain browser-session-scoped and follow the same retention window established in Spec 2 unless a later policy spec changes it.
6. The assistant must ask for the next missing budget fact only when that fact is necessary to advance the analysis.
7. The assistant must not ask the user to re-enter budget facts that are already present in the persisted session state unless the user is correcting them.
8. The implementation must support explicit user corrections such as updated income, rent, debt, or savings goals and must overwrite the superseded budget fact deterministically.
9. The tool contract must support partial budget profiles and complete budget profiles.
10. The tool contract must support analysis against a target rent, a target job salary, or both when those targets are available.
11. The tool contract must support location context as an explicit input so budgeting can reference the currently resolved market honestly.
12. The budget profile contract must support separate gross monthly income and net monthly income rather than collapsing both into one ambiguous income field.
13. The budget profile contract must support an explicit monthly housing cost or rent field distinct from comparison-only targets.
14. The budget profile contract must support separate monthly debt categories for student loans, credit cards, and other debt payments rather than one undifferentiated debt total.
15. Values produced by housing or jobs tools may be used as comparison targets for the current analysis, but they must not overwrite persisted user-owned budget facts unless the user explicitly confirms them.
16. The tool contract must return a structured verdict tier at minimum: `safe`, `warning`, `burdened`, or `severely_burdened`.
17. The tool contract must return a structured per-category breakdown covering housing, utilities, transportation, food, student loans, credit-card debt, other debt, savings, and discretionary spending when those categories are available.
18. The tool contract must return an explanation of which assumptions were user-provided, which were tool-derived comparison targets, which were omitted, and whether any guidance is partial rather than complete.
19. The tool contract must surface validation failures as typed errors rather than silently coercing invalid values.
20. Negative income, non-numeric values, and impossible category totals must not silently pass as valid budget input.
21. The assistant must be able to call the budget tool after gathering only enough information to produce a partial but honest result.
22. When the available information is insufficient for a verdict, the assistant must explain what additional fact is needed next rather than inventing missing numbers.
23. The assistant must be able to use values already produced by housing and jobs tools when those values are relevant inputs to budget evaluation.
24. The budget capability must preserve the current assistant artifact contract so the final assistant turn can attach a budget artifact alongside other tool results.
25. The chat UI must render a dedicated budget result card through the typed tool-result presentation path rather than embedding the entire budget result only in prose.
26. Prior assistant cards must remain visible when a later budget analysis is added to the conversation.
27. The budget tool must disclose whether it used gross income, net income, or both when forming the verdict.
28. If only gross income is provided, the verdict must explicitly say that the result is based on gross income unless the user later provides net income.
29. The budget tool must support optional monthly utilities, transportation, food, student-loan payments, credit-card payments, other debt payments, savings goals, and discretionary spending inputs.
30. Missing optional categories must not be auto-filled with invented values in the durable budget profile.
31. If the assistant applies a rule-of-thumb fallback because the user refuses or cannot provide more detail, that fallback must be disclosed in the final explanation.
32. The assistant must preserve budget-state continuity across streamed turns and clarification turns introduced by Specs 3 and 4.
33. Resetting the chat session must also clear any persisted in-progress budget profile for that browser session.
34. The implementation must provide a feature flag or kill switch that can disable the budget capability without breaking the rest of the chat flow.
35. When the budget capability is disabled or degraded, the assistant must fall back safely to non-budget grounded guidance rather than partially invoking a broken budget flow.
36. The implementation must extend the shared Anthropic/mock harness so tests can script budget-fact collection, mid-flow corrections, partial profiles, tool-derived comparison targets, and degraded budget responses deterministically.
37. The implementation must extend the shared conversation fixture model so tests can represent partial budget state, committed budget cards, and post-refresh continuation consistently.
38. The budget tool output must be serializable into the existing tool-result artifact pipeline without introducing an untyped parallel presentation contract.
39. The assistant’s system prompt and tool descriptions must teach the model to gather budget facts incrementally and to call the budget tool only when it has enough information to make progress.
40. The assistant must not present the budget capability as financial advice, underwriting, or a guaranteed approval prediction.
41. The budget capability must preserve the current moderation and abuse controls before tool execution begins.
42. The budget capability must emit telemetry for budget-state created or started, fact updated, fact corrected, comparison target adopted, validation failed, tool executed, degraded fallback used, and verdict generated.
43. The budget capability must support deterministic development and end-to-end validation through the existing mock-chat mode.

## Non-Functional Requirements

### Performance
1. Under normal local and CI conditions, a budget turn with only local/session-state work must not materially regress the chat latency established in Specs 3 and 4.
2. Budget-state merge and validation must remain lightweight enough to run on every relevant turn without noticeable UI blocking.
3. Budget artifact rendering must not introduce pathological re-renders relative to the current tool-card surface.
4. Persisted budget-state updates must not require a second parallel session store beyond the existing conversation/session contract.

### Accessibility
1. Budget clarification prompts, verdict summaries, and budget result cards must satisfy WCAG 2.1 AA expectations already applied to the primary chat experience.
2. Budget result cards must present category labels, numbers, and status text in readable text rather than color-only cues.
3. Keyboard users must be able to navigate any budget card content and any follow-up prompt controls without losing transcript context.

### Privacy
1. Budget data must be treated as sensitive user-provided financial information within the browser session and durable conversation record.
2. Telemetry and logs must not record raw full budget profiles or full transcript contents.
3. The implementation must not introduce third-party financial-data sharing beyond the existing model and tool infrastructure already approved for the product.
4. Resetting the browser chat session must remove persisted in-progress budget facts from the active session store.
5. Tool-derived comparison targets such as observed rent or salary values must remain analytically useful without being persisted as user-owned financial facts unless the user confirms them.

### Security
1. Budget evaluation must remain server-side; no secret-bearing tool or model logic may move into the browser.
2. Budget input validation must reject malformed or nonsensical numeric inputs before the tool result is committed to session state.
3. The budget capability must not allow client-injected tool payloads to become committed transcript artifacts without server-side validation.

### Observability
1. The system must emit telemetry for budget-state created or started, budget fact updated, budget fact corrected, comparison target adopted, budget validation failed, budget tool executed, budget fallback/degraded path used, and budget verdict completed.
2. Budget telemetry must remain visible in local console behavior and through the existing production telemetry wiring when configured.
3. Operational debugging for budget failures must be possible without logging raw sensitive budget values.

## Out of Scope
1. Bank account linking, payroll integrations, or importing user financial accounts.
2. Credit scoring, loan qualification, lease approval prediction, or other regulated decisioning behavior.
3. National resource-link expansion, broader HUD seed expansion, or location-coverage work beyond reusing the location context already established by earlier specs.
4. A redesign of the Story page calculator beyond any small compatibility updates needed while the chat-first budget capability becomes primary.
5. Cross-device account sync or authenticated long-term personal finance profiles.
6. Tax filing, annual tax estimation, or household filing-status modeling.

## Architecture Notes
The local hypothesis for this spec is narrow and falsifiable: the missing behavior is not in complex affordability math, but in the fact that budgeting still lives in a static Story-page calculator and a tiny burden helper rather than in the chat orchestration, tool catalog, and session model. A cheap disconfirming check was reading `src/app/story/page.tsx`, `src/components/AffordabilityCalculator.tsx`, `src/domain/entities/AffordabilityProfile.ts`, and `src/application/use-cases/GetAffordabilityInsights.ts`; that confirmed all of the following:

- the current budgeting surface is a client-only calculator on the Story page;
- the only domain model is a two-field `AffordabilityProfile`;
- the current use case only maps burden percentage to a simple tier;
- no budget capability is currently registered as a chat-callable tool or persisted as session state.

### Current Owning Surfaces
- `src/components/AffordabilityCalculator.tsx` currently owns the only interactive budget input flow and is disconnected from chat.
- `src/domain/entities/AffordabilityProfile.ts` currently defines only `monthlyIncome` and `monthlyHousingCost`.
- `src/application/use-cases/GetAffordabilityInsights.ts` currently owns a simple tiering helper, not a full budget-planning capability.
- `src/components/ToolResultCards.tsx` currently has no dedicated budget card renderer.
- `ConversationRepository` currently stores transcript and clarification state but no explicit budget planning state.

### Proposed Implementation Shape
1. Introduce a first-class `BudgetProfile` domain entity plus supporting value objects for category totals, verdict basis, assumption provenance, and missing-data disclosure.
2. Extend the conversation/session contract with persisted partial budget state owned by the conversation layer rather than by the budget tool itself.
3. Add a dedicated `budget_plan_tool` whose input supports partial facts, target rent/salary analysis, and explicit location context.
4. Keep budget-state merge and validation in the application layer; the tool should evaluate a supplied profile and explicit comparison targets, not become a hidden persistence mechanism.
5. Extend the system prompt and tool descriptions so the model can gather budget facts incrementally and decide when enough information exists to call the tool.
6. Add a presenter/view-model for budget tool results and render them through a typed budget card in the existing tool-result surface.

### Ports and Adapters
- `ConversationRepository` should be extended to store persisted budget-state alongside transcript history and clarification state.
- `ToolCatalog` should expose the budget tool with a strict schema and model-usable description.
- `ToolExecutor` remains the execution seam for the new budget tool.
- the existing mock model harness should become the deterministic budget-conversation driver in tests.

### SOLID Emphasis
- Single Responsibility: budget-state merge, budget evaluation, and budget-card presentation should remain separate concerns.
- Open/Closed: adding a new budget category or verdict detail should extend typed structures and renderers rather than rewrite the chat flow.
- Liskov Substitution: any future budget-state repository implementation must remain interchangeable through `ConversationRepository`.
- Interface Segregation: if budget evaluation needs its own smaller port later, do not force unrelated consumers through a large financial interface.
- Dependency Inversion: application-layer budget orchestration must depend on ports and typed values, not on React components or framework adapters directly.

### Pattern Fit
- Strategy: budget verdict computation can use explicit strategies for gross-income vs net-income evaluation and degraded fallback guidance.
- Adapter: the budget tool, telemetry implementation, and session persistence remain adapters behind stable ports.
- Command: the budget tool remains a model-requested tool command executed through `ToolExecutor`.
- Observer: budget telemetry flows through the existing telemetry observer/fan-out direction rather than bespoke logging.
- Factory Method: test and runtime composition should create the budget-capable tool and any stateful collaborators through existing factories.

### ADR Impact
This spec should produce an ADR if the conversation/session contract is extended in a way that materially constrains future stateful chat capabilities, especially if budget-state persistence needs a distinct typed sub-structure inside the conversation record.

## Data Model & API Contracts
This spec introduces a persistent budget-profile state contract plus a tool contract for structured budget analysis.

### Proposed Schemas
1. `BudgetIncomeBasisSchema = z.enum(["gross", "net", "mixed"])`
2. `BudgetVerdictTierSchema = z.enum(["safe", "warning", "burdened", "severely_burdened"])`
3. `BudgetCategoryBreakdownSchema = z.object({ housing: z.number().nonnegative().optional(), utilities: z.number().nonnegative().optional(), transportation: z.number().nonnegative().optional(), food: z.number().nonnegative().optional(), studentLoans: z.number().nonnegative().optional(), creditCardDebt: z.number().nonnegative().optional(), otherDebtPayments: z.number().nonnegative().optional(), savingsGoal: z.number().nonnegative().optional(), discretionary: z.number().nonnegative().optional() })`
4. `BudgetProfileSchema = z.object({ grossMonthlyIncome: z.number().nonnegative().optional(), netMonthlyIncome: z.number().nonnegative().optional(), monthlyHousingCost: z.number().nonnegative().optional(), utilities: z.number().nonnegative().optional(), transportation: z.number().nonnegative().optional(), food: z.number().nonnegative().optional(), studentLoans: z.number().nonnegative().optional(), creditCardDebt: z.number().nonnegative().optional(), otherDebtPayments: z.number().nonnegative().optional(), savingsGoal: z.number().nonnegative().optional(), discretionary: z.number().nonnegative().optional(), notes: z.string().max(1000).optional() })`
5. `BudgetComparisonTargetsSchema = z.object({ rentMonthly: z.number().nonnegative().optional(), salaryAnnual: z.number().nonnegative().optional(), source: z.enum(["user", "tool_observed", "tool_estimated"]).optional() })`
6. `BudgetAssumptionSchema = z.object({ field: z.string().min(1), source: z.enum(["user", "comparison_target", "omitted", "fallback_rule"]), note: z.string().min(1).optional() })`
7. `PersistedBudgetStateSchema = z.object({ profile: BudgetProfileSchema, missingFields: z.array(z.string()).default([]), lastUpdatedAt: z.string().datetime(), analysisReady: z.boolean().default(false) })`
8. `BudgetPlanToolInputSchema = z.object({ profile: BudgetProfileSchema, location: LocationContextSchema.optional(), compareAgainst: BudgetComparisonTargetsSchema.optional() })`
9. `BudgetPlanToolOutputSchema = z.object({ verdict: BudgetVerdictTierSchema, burdenPct: z.number().nonnegative().optional(), monthlyNetPosition: z.number(), incomeBasisUsed: BudgetIncomeBasisSchema.optional(), categoryBreakdown: BudgetCategoryBreakdownSchema, missingFields: z.array(z.string()), assumptions: z.array(BudgetAssumptionSchema).default([]), isPartial: z.boolean().default(false), usedFallbackRule: z.boolean().default(false), fallbackExplanation: z.string().optional(), guidance: z.array(z.string()).min(1), locationResolution: LocationResolutionSchema.optional() })`

### Persistence Contract Expectations
1. The conversation/session layer must persist a typed budget-state object alongside transcript and clarification-state data for the active browser session.
2. Resetting the session must remove persisted budget-state as well as transcript history.
3. Budget-state persistence must support deterministic overwrite of corrected facts rather than appending conflicting duplicate values.
4. Tool-derived comparison targets must remain transient analysis inputs unless the user explicitly confirms they should become persisted budget facts.

### Tool Contract Expectations
1. The `budget_plan_tool` input must accept a partial or complete `BudgetProfile` plus optional location context.
2. The tool output must be structured enough to render a dedicated budget card without parsing prose.
3. Validation failures must return typed error codes rather than freeform strings only.
4. The tool contract must distinguish persisted user profile facts from analysis-only comparison targets.

### Presenter Contract Expectations
1. The budget result must be renderable through the existing tool-result artifact pipeline.
2. The budget card presenter must receive a typed budget output shape, not `unknown` plus ad hoc destructuring.

## Test Plan
The feature must ship with unit, integration, and end-to-end coverage across positive, negative, and edge paths.

| Level | Positive | Negative | Edge |
|---|---|---|---|
| Unit | Budget profile validation and verdict calculation return the expected structured output for valid inputs | Invalid values such as negative income or malformed category totals return typed validation failures | Zero income, very high income, missing optional categories, separate debt buckets, and corrected values behave deterministically |
| Integration | Chat orchestration gathers budget facts across turns, persists budget state, and produces a committed budget card | Contradictory or invalid budget inputs trigger clarification or typed failure without corrupting session state | Refresh continuation, partial-profile analysis, mid-conversation corrections, and tool-derived comparison targets preserve the latest budget state consistently |
| End-to-end | User starts on the homepage, builds a budget through chat, and receives a budget card plus grounded explanation | User refuses key inputs and the assistant degrades honestly without breaking the chat | Mid-conversation refresh, streamed clarification, same-session continuation, and comparison against an observed listing or salary remain truthful |

### Minimum Unit Coverage
1. `BudgetProfile` validation accepts valid inputs and rejects negative or malformed numeric inputs.
2. Budget verdict calculation maps representative profiles to `safe`, `warning`, `burdened`, and `severely_burdened` correctly.
3. Missing optional categories remain missing rather than silently filled with invented values.
4. Correcting an existing budget fact overwrites the prior fact deterministically.
5. The budget presenter/view-model converts structured budget output into a typed card model.
6. Separate gross and net income handling produces the expected verdict basis disclosure.
7. Tool-derived comparison targets do not become persisted user-owned budget facts without explicit confirmation.

### Minimum Integration Coverage
1. A multi-turn budget conversation persists partial budget facts in session state and resumes after a follow-up turn.
2. The native-tool-use orchestrator can gather budget facts, call `budget_plan_tool`, and commit one assistant turn with a budget artifact.
3. Invalid or contradictory inputs do not corrupt persisted budget state and surface an honest follow-up or validation failure.
4. Resetting the chat clears persisted budget-state as well as transcript history.
5. Streaming mode preserves in-progress budget clarification and final budget artifact behavior without replaying transient status as durable transcript rows.
6. Observed rent or salary values from housing and jobs tools can be used as comparison targets for the current analysis without mutating persisted user-owned budget facts unless the user confirms them.

### Minimum End-to-End Coverage
1. A user asks the homepage chat to build a budget for a named location, answers follow-up questions, and receives a budget card.
2. A user refuses to provide a key field such as income and receives an honest degraded explanation instead of a fabricated verdict.
3. A user refreshes mid-budget conversation and the same browser session restores the in-progress budget facts.
4. A user corrects a previously entered rent or income value and receives an updated budget result rather than a duplicate stale result.
5. A user asks whether a specific observed rent or salary fits their budget and receives an honest comparison without the app silently rewriting their persisted budget profile.

## Acceptance Criteria
1. Grounded Moves can gather budget facts conversationally and invoke a dedicated budget tool on the native-tool-use chat path.
2. Partial budget state persists across turns in the same browser session and clears on session reset.
3. The assistant asks only the next useful budget question instead of requiring a full profile up front.
4. The `budget_plan_tool` returns a structured verdict, breakdown, and guidance suitable for a dedicated budget card.
5. Budget results render as committed assistant artifacts without replacing prior tool cards.
6. Invalid or contradictory budget input is handled honestly with typed validation or clarification behavior.
7. Separate gross/net income, explicit housing cost, and separate debt-category handling are represented in the persisted budget contract and final tool output.
8. Tool-derived comparison targets can be analyzed without silently becoming persisted user-owned budget facts.
9. Required unit, integration, and end-to-end coverage for positive, negative, and edge cases is present and passing.
10. CI is green for the Spec 5 change set, including lint, typecheck, all required tests, and production build verification.
11. A smoke-test runbook for the budget-planning capability exists before the feature is called MVP-complete.

## Open Questions
1. No product-level open question blocks the spec, but the implementation ADR should explicitly record whether persisted budget state lives directly on the conversation record or in a typed nested state object that can later support additional multi-turn structured workflows.