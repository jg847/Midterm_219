# Smoke Test 05: Budget Planning Capability

## Purpose
Verify Sprint 5 conversational budget planning, persisted budget-state continuity, budget artifact rendering, and comparison-target honesty before promotion.

## Preconditions
1. Install dependencies and ensure `.env.local` is configured.
2. Set `NEXT_PUBLIC_ENABLE_SESSION_MEMORY=true`.
3. Set `NEXT_PUBLIC_ENABLE_NATIVE_TOOL_USE=true`.
4. Set `NEXT_PUBLIC_ENABLE_STREAMING_CHAT=true` if validating the streamed path.
5. For deterministic validation without live providers, set `NEXT_PUBLIC_USE_MOCK_CHAT=true`.
6. Start the app with `npm run dev`.

## Primary Checks
1. Open the homepage and ask the assistant to build a budget for a named location such as Austin, TX.
Expected: the assistant gathers only the next useful missing budget fact instead of demanding a full profile at once.

2. Provide a partial profile such as gross monthly income, target housing cost, and utilities.
Expected: the assistant returns a committed budget card with a verdict, monthly net position, guidance, and any missing-field disclosure.

3. Ask a follow-up question after the first budget turn.
Expected: the assistant reuses already-known budget facts instead of asking for the same fields again.

4. Correct a previously entered value such as rent or income.
Expected: the next budget result reflects the corrected value and does not preserve the stale value as an active fact.

5. Ask whether an observed rent or salary fits the budget.
Expected: the assistant can analyze the comparison target, but it clearly treats that rent or salary as comparison context rather than silently persisting it as a user-owned budget fact.

## Session Continuity Checks
1. Refresh mid-budget conversation.
Expected: the same browser session restores the transcript and the in-progress budget facts so the next question can continue the same budgeting flow.

2. Use the reset control.
Expected: transcript history and persisted budget state are both cleared for that browser session.

## Honesty And Safety Checks
1. Provide only gross income without net income.
Expected: the budget result discloses that it is using gross income for the estimate.

2. Refuse to provide a key field such as income.
Expected: the assistant degrades honestly, explains what it still needs, and does not fabricate a complete verdict.

3. Verify the budget artifact and assistant explanation preserve the named market or location-resolution disclosure used for the analysis.
Expected: the result is honest about the resolved location context.

## Fallback Checks
1. Set the budget capability kill switch off and reload.
Expected: general chat remains available, but the assistant does not enter the structured budget-planning flow.

## Exit Criteria
1. Budget conversations produce committed budget artifacts with verdict, guidance, and missing-field disclosure.
2. Persisted budget facts survive refresh and clear on reset.
3. Corrections overwrite prior values deterministically.
4. Comparison targets remain analysis-only unless the user explicitly confirms them as profile facts.
5. The assistant remains honest about gross-vs-net income basis, missing inputs, and resolved location context.