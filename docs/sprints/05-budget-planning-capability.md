# Sprint Plan 05: Budget Planning Capability

## Goal
Ship a first-class conversational budget-planning capability on the native-tool-use chat path so Grounded Moves can gather budget facts across turns, evaluate affordability honestly, and render a dedicated budget artifact without breaking session continuity, streaming behavior, or rollout safety.

## Tasks
1. Task 1, size S: Write the ADR for persisted budget-state boundaries before implementation begins, documenting where partial budget state lives inside the conversation record, how corrections overwrite prior facts, and how tool-derived comparison targets remain distinct from user-owned budget facts. Implements Spec 5 architecture notes, persistence contract expectations, ADR impact guidance, and acceptance criteria 2, 7, 8.
2. Task 2, size S: Add the Spec 5 feature flag, configuration wiring, and kill-switch behavior first so the budget capability can be enabled, disabled, and observed independently from the rest of the chat runtime, with a safe grounded fallback when budgeting is off or degraded. Implements Spec 5 requirements 34, 35, 42, 43 and acceptance criteria 1, 8.
3. Task 3, size M: Extend the shared Anthropic/mock harness and conversation fixture model so tests and development flows can deterministically script multi-turn budget fact gathering, partial profiles, explicit corrections, tool-derived comparison targets, degraded fallback answers, refresh continuation, and reset behavior, and add reusable budget tool-result fixtures for happy, degraded, and comparison-target cases so later specs do not rebuild bespoke artifacts. Implements Spec 5 requirements 36, 37, 43 and acceptance criterion 9 plus the pivot-plan shared test-harness expectations.
4. Task 4, size M: Introduce the `BudgetProfile` domain model and supporting value objects for gross/net income basis, category breakdown, assumption provenance, partial-state disclosure, and verdict tiers, replacing the current two-field affordability helper as the canonical budget-analysis contract. Implements Spec 5 requirements 12, 13, 14, 16, 17, 18, 27, 28, 29, 30 and acceptance criteria 3, 4, 7.
5. Task 5, size M: Add the budget application-layer merge and validation logic that updates persisted partial budget state deterministically, handles user corrections, tracks missing facts, preserves session retention behavior, and keeps tool-derived comparison targets transient unless the user confirms them. Implements Spec 5 requirements 3, 4, 5, 6, 7, 8, 15, 20, 22, 23, 33 and persistence contract expectations 1, 2, 3, 4.
6. Task 6, size M: Implement the `budget_plan_tool` with strict Zod input and output contracts, including partial-profile evaluation, explicit comparison-target support, explicit location-context input and location-resolution disclosure, gross/net income disclosure, structured verdict and category breakdown output, typed validation failures, and honest degraded fallback messaging. Implements Spec 5 requirements 1, 2, 9, 10, 11, 16, 17, 18, 19, 21, 27, 28, 29, 31, 38 and acceptance criteria 1, 4, 6, 7, 8.
7. Task 7, size M: Integrate the budget tool into the native-tool-use orchestration and system prompt so the model can gather only the next useful budget fact, reuse already-known session facts, adopt housing and jobs outputs as transient comparison targets when relevant, call the budget tool when it has enough information to make progress, and avoid presenting budgeting as financial advice or guaranteed approval logic. Implements Spec 5 requirements 6, 7, 15, 21, 22, 23, 24, 31, 32, 39, 40, 41 and acceptance criteria 1, 3, 6, 8.
8. Task 8, size M: Extend the conversation repository contract and session persistence adapters so budget state survives refresh and follow-up turns, clears on session reset, and remains compatible with streamed clarification and final-artifact persistence from Specs 2 through 4. Implements Spec 5 requirements 4, 5, 32, 33 and acceptance criteria 2, 9.
9. Task 9, size M: Add the typed budget presenter/view-model and dedicated budget card renderer through the existing tool-result artifact pipeline so budget outputs render as committed assistant artifacts without replacing prior tool cards or falling back to ad hoc `unknown` destructuring. Implements Spec 5 requirements 24, 25, 26, 38 and presenter contract expectations 1, 2 plus acceptance criteria 4, 5.
10. Task 10, size S: Add budget telemetry for budget-state lifecycle, fact updates, corrections, comparison-target adoption, validation failures, tool execution, degraded fallback use, and verdict completion while preserving current privacy constraints around sensitive financial inputs. Implements Spec 5 requirements 42, privacy requirements 1, 2, 4, 5, observability requirements 1, 2, 3, and acceptance criteria 6, 8.
11. Task 11, size L: Add the full Spec 5 test matrix across unit, integration, and Playwright coverage using the shared budget harness, including partial-profile evaluation, separate gross/net handling, separate debt buckets, reset clearing budget state, streamed continuation, tool-derived comparison targets, degraded fallback behavior, correction flows, and refresh persistence. Implements the full Spec 5 test plan and acceptance criteria 2, 3, 6, 7, 8, 9.
12. Task 12, size S: Add rollout and closeout documentation, including README and env updates if needed, the required ADR reference, and a smoke-test runbook for homepage budget conversations, degraded-input behavior, comparison-target analysis, refresh continuation, and session reset. Implements Spec 5 acceptance criteria 9, 10, 11.

## Dependencies
1. Approved Spec 5 at `docs/specs/05-budget-planning-capability.md` and the approved baseline in `docs/PIVOT-PLAN.md`.
2. Specs 2, 3, and 4 remain hard prerequisites because budget planning must reuse persistent browser sessions, native tool use, streamed clarification behavior, and the shared chat event/runtime seams already established there.
3. Current main implementation surfaces are expected to include the conversation/session model, native-tool-use orchestration path, tool catalog and executor seams, the tool-result presentation pipeline, and the shared mock harness introduced in earlier sprints.
4. Session retention and reset behavior from Spec 2 must remain stable because in-progress budget state is explicitly tied to the same browser-scoped conversation lifecycle.
5. The typed streaming and final-artifact path from Spec 4 must remain stable because budget clarification and budget artifacts are required to flow through the same runtime rather than a parallel UI path.

## Risks & Mitigations
1. Risk: The budget tool becomes a hidden state container instead of a pure evaluator, coupling persistence and recommendation logic in one place.
Mitigation: Land the ADR and application-layer budget-state merge contract first, then require the tool to evaluate supplied profile data and explicit comparison targets only.

2. Risk: Tool-derived rents or salaries from housing and jobs results silently overwrite user-owned financial facts and create misleading budget profiles.
Mitigation: Treat comparison targets as a separate typed contract, keep them transient by default, and require unit, integration, and E2E coverage that fails if implicit persistence occurs.

3. Risk: Incremental fact gathering becomes a chatty interrogation that repeatedly asks for already-known facts or blocks progress until the whole profile is complete.
Mitigation: Put “next useful fact only” behavior in both the prompt contract and the orchestration tests, and require partial-profile analysis as a first-class happy path.

4. Risk: Sensitive financial inputs leak into telemetry or logs while rollout diagnostics are added.
Mitigation: Restrict telemetry to lifecycle and verdict events, prohibit raw profile logging in the spec-aligned implementation, and cover privacy constraints in the integration test slice.

5. Risk: Budget artifacts are added through ad hoc UI branching and regress the existing tool-card surface.
Mitigation: Route the budget result through the typed presenter/view-model path, keep prior cards persistent, and make renderer coverage part of the Definition of Done.

6. Risk: Refresh, reset, or streamed clarification paths leave budget state stale, duplicated, or detached from the transcript.
Mitigation: Extend the conversation repository contract explicitly, test refresh and reset behavior at integration and E2E levels, and do not persist transient streamed status as durable budget state.

7. Risk: The sprint overreaches into general financial-planning or regulated-advice behavior.
Mitigation: Keep the tool scoped to structured affordability guidance, preserve the non-advice framing in prompt and UI copy, and treat credit decisioning or account linking as strictly out of scope.

## Definition of Done
1. Every Sprint 5 task maps back to approved Spec 5 requirements and those requirement references appear in implementation PR descriptions.
2. Grounded Moves can gather budget facts conversationally on the native-tool-use chat path and invoke a dedicated `budget_plan_tool` without requiring a parallel Story-page-only flow.
3. Partial budget state persists across turns in the same browser session, survives refresh, and clears on session reset.
4. The budget contract supports separate gross/net income, explicit housing cost, separate debt buckets, partial-profile analysis, explicit location context, and explicit comparison targets without silently persisting tool-derived values as user-owned facts.
5. The assistant asks only the next useful budget question, reuses already-known facts, and degrades honestly when the user refuses or cannot provide more detail.
6. Budget results render as typed committed assistant artifacts through a dedicated budget card without replacing prior tool cards.
7. Validation failures and contradictory inputs are handled honestly with typed validation or clarification behavior rather than silent coercion.
8. Required tests for this sprint pass at every level the spec calls for: unit, integration, and E2E, including refresh continuation, reset clearing budget state, gross/net disclosure, comparison-target analysis, correction flows, and degraded fallback behavior.
9. CI is green for the Sprint 5 change set, including `npm run lint`, `npm run typecheck`, all required tests, a successful production build, and the full release gate.
10. Budget telemetry is emitted for the required lifecycle and verdict paths without logging raw sensitive financial inputs.
11. The feature flag can disable the budget capability cleanly while chat remains available and grounded non-budget guidance still works.
12. Documentation is updated where touched by the sprint, including any env-var notes, the required ADR, and a smoke-test runbook for the budget capability.
13. No national resource-framing, retrieval cleanup, moderation redesign, or broader hardening-track work is introduced beyond the explicit seams required by Spec 5.

## Rollout Plan

### Feature Flags and Rollout Safety
1. Add a budget-capability rollout flag first so the tool, prompt behavior, and UI artifact can be enabled progressively without destabilizing the rest of the chat runtime.
2. The recommended kill switch behavior is to disable the budget capability and fall back to non-budget grounded guidance while preserving chat availability, session continuity, and the rest of the tool-use surface.
3. Safe fallback behavior when the feature is off or degraded is: the user can still ask broader affordability questions, but the assistant does not enter the structured budget-gathering flow or render budget artifacts from incomplete or broken tool output.

### Telemetry to Watch
1. Budget-state creation/start rate, budget fact update rate, correction rate, and comparison-target adoption rate.
2. Budget tool execution rate, validation-failure rate, degraded fallback usage, and verdict completion rate.
3. Refresh continuation success, reset clearing behavior, and any increase in chat-route error rates on turns that invoke budget behavior.
4. Any evidence that raw sensitive budget values are reaching logs or telemetry, which should be treated as a release blocker.

### Rollback Criteria
1. Budget turns corrupt session state, persist stale or conflicting facts, or fail to clear on reset.
2. Tool-derived rents or salaries are silently persisted as user-owned budget facts without explicit user confirmation.
3. The assistant repeatedly asks for already-known facts or blocks useful analysis until the full profile is complete.
4. Budget artifacts fail to render reliably or replace prior tool cards in the transcript.
5. Budget telemetry or diagnostics expose raw sensitive budget values or materially increase chat instability.

### Release Verification
1. Run the Sprint 5 smoke-test script before calling the feature MVP-complete.
2. Run a successful production build and the full release gate before calling the feature MVP-complete.
3. Verify a homepage chat user can build a budget across multiple turns and receive a committed budget card.
4. Verify refresh mid-conversation restores in-progress budget facts and reset clears them.
5. Verify corrected income, rent, or debt values replace prior facts deterministically in the next analysis.
6. Verify observed rent or salary comparisons remain analysis-only unless the user explicitly confirms them as profile facts.
7. Verify degraded-input and refusal paths produce honest non-advice messaging rather than fabricated verdicts.
8. Verify the feature flag can disable the budget capability cleanly while preserving general chat behavior.
9. Verify a named-location budget conversation preserves honest location context or location-resolution disclosure in the final budget artifact and assistant explanation.