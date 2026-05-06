# ADR 0006: Budget State And Tool Boundary

## Status
Accepted

## Context
Sprint 5 adds the first structured multi-turn workflow that must survive across chat turns without becoming a hidden side effect of the tool itself. Grounded Moves needs to gather budget facts incrementally, reuse them across streamed and refreshed sessions, compare them against observed rents or salaries, and render a structured budget artifact. The key design question is where partial budget state lives and how it relates to the `budget_plan_tool`.

## Decision
Persist partial budget facts on the conversation record as a typed `budgetState` object owned by the conversation/session layer.

Keep `budget_plan_tool` as a pure evaluator. It accepts the currently known budget profile plus optional transient comparison targets and returns structured affordability guidance, but it does not persist, mutate, or own conversation state.

Treat observed rent or salary values from housing and jobs tools as transient comparison targets by default. They can inform a current budget analysis, but they do not become user-owned persisted budget facts unless the user explicitly confirms them.

Inject persisted budget state back into the native-tool-use prompt as structured context so the model can ask only the next useful question and avoid requesting facts the session already holds.

## Consequences
- Budget persistence stays aligned with the same browser-scoped session lifecycle as transcript history and clarification state.
- The budget tool remains testable as a pure domain evaluator rather than a hidden persistence boundary.
- Explicit user corrections overwrite prior persisted budget facts deterministically because the merge logic lives in the application layer.
- Comparison-target analysis remains honest because provider-derived rents or salaries are kept separate from persisted user-owned financial facts.
- Later structured workflows can follow the same pattern by adding typed state to the conversation record instead of embedding persistence inside tool execution.