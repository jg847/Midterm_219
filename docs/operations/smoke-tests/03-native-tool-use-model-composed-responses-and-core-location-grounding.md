# Smoke Test: Native Tool Use, Model-Composed Responses, and Core Location Grounding

## Preconditions
1. Install dependencies in `student-reality-platform/`.
2. Start the app with `NEXT_PUBLIC_USE_MOCK_CHAT=true`, `NEXT_PUBLIC_ENABLE_SESSION_MEMORY=true`, and `NEXT_PUBLIC_ENABLE_NATIVE_TOOL_USE=true`.
3. Leave the legacy path available by toggling `NEXT_PUBLIC_ENABLE_NATIVE_TOOL_USE=false` when rollback behavior needs verification.
4. Open the app at `/` in a fresh browser context.

## Manual Checks
1. Ask for housing help in an exact market such as `Find rentals in Newark, NJ` and confirm the assistant answer is multi-sentence, grounded, and paired with cards or tool-result artifacts.
2. Refresh the page and confirm the latest assistant answer, cards, and session continuity still hydrate correctly on the native-tool-use path.
3. Ask an ambiguous state-only question such as `What jobs can I get in Texas?` and confirm the assistant asks once for city or ZIP clarification instead of silently choosing a metro.
4. Repeat the same state-only request without clarifying and confirm the assistant now answers using a disclosed fallback metro in that state, with the chosen market explained honestly in the answer.
5. Ask a follow-up with an explicit city such as `Use Austin instead` and confirm the answer switches to the explicit market and the prior clarification state no longer controls the turn.
6. Ask a housing question in a market without an exact seeded baseline and confirm the answer or cards disclose the resolved market through `locationResolution` rather than silently defaulting to Newark or an unexplained baseline.
7. Disable `NEXT_PUBLIC_ENABLE_NATIVE_TOOL_USE`, restart the app, and confirm the homepage chat still answers through the legacy path without route failures.

## Release Checks
1. Run `npm run lint`.
2. Run `npm run typecheck`.
3. Run `npm run test`.
4. Run `npm run test:e2e`.
5. Run `npm run build`.
6. Run `npm run release:check`.

## Expected Outcome
1. The enabled path uses native tool orchestration while preserving the current transcript and assistant-artifact UI behavior.
2. Final answers are model-composed from tool evidence rather than digest-short-circuit text.
3. Ambiguous state-only requests follow the approved rule: ask once, then default with disclosure on repetition or decline.
4. Touched location-aware tool results disclose the resolved market honestly and do not silently default to Newark, `rows[0]`, or `1720`.
5. Disabling the rollout flag returns the chat surface to the legacy orchestration path without breaking the homepage experience.