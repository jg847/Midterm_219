# Smoke Test 07E: Typed Tool-Result Presentation And UI Decomposition

## Goal
Verify that the completed typed presenter registry slice preserves transcript behavior while all current transcript-facing tool-result variants render through explicit view-model contracts.

## Preconditions
1. Focused renderer and presenter tests can run in the workspace.
2. The homepage chat transcript still uses `ToolResultCards` for tool-result rendering.

## Steps
1. Run the typed presenter tests.
Expected result: retrieval, budget, opportunity, digest, search, and dataset tool results all map to explicit typed view models.

2. Run the `ToolResultCards` static render tests.
Expected result: retrieval disclosure plus budget, opportunity, digest, search, and dataset content still appear in transcript markup.

3. Exercise an unknown tool-result variant through the chat surface or a focused test.
Expected result: the generic default renderer still handles an unregistered tool name without breaking transcript layout.

4. Inspect the `ToolResultCards` migration path in code.
Expected result: the component consults the typed presenter registry first and then falls back only to the generic default renderer when no presenter is registered.

## Failure Signals
1. A supported tool-result variant still requires ad hoc `unknown` destructuring inside `ToolResultCards.tsx`.
2. Typed presenters break visible transcript output for supported variants.
3. The migration path stops being registry-driven and turns into a growing switch or conditional blob.
4. Unknown tool names break transcript rendering instead of degrading to the generic default card.