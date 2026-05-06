# Sprint Plan 01: Home Page as Chat Hero

## Goal
Ship a U.S.-wide Grounded Moves homepage where the chat experience is the primary above-the-fold interaction on `/`, while `/chat` cleanly redirects to `/` and supporting routes remain intact.

## Tasks
1. Task 1, size S: Promote the existing chat-first shell to the home route and remove the three-card landing behavior from `src/app/page.tsx`. Implements Spec 1 requirements 1, 2, 3, 17, 20, 21.
2. Task 2, size S: Replace the standalone `/chat` page implementation with a redirect to `/` and verify route behavior does not create duplicate homepage shells. Implements Spec 1 requirements 12, 13.
3. Task 3, size M: Update touched homepage, chat-shell, navigation, and metadata copy to Grounded Moves with U.S.-wide framing and no Newark-default wording in prompts, empty states, or helper text changed by this sprint. Implements Spec 1 requirements 4, 5, 6, 14, 15, 16.
4. Task 4, size S: Preserve and verify location-anchor behavior on the homepage, including manual city/ZIP entry, browser current-location usage, and denial/unavailable fallback messaging. Implements Spec 1 requirements 9, 10, 11, 18.
5. Task 5, size S: Preserve existing homepage chat behavior for success, no-location, and API-failure states without modifying orchestration or provider contracts. Implements Spec 1 requirements 8, 17, 18, 19, 20.
6. Task 6, size M: Add route, component, and browser-path tests covering homepage composition, `/chat` redirect, U.S.-wide copy constraints, geolocation fallback, keyboard/mobile entry paths, and the supporting E2E execution surface required to run those checks in CI. Implements Spec 1 requirements 1, 2, 3, 5, 6, 8, 9, 10, 11, 12, 13, 17, 18, 19, 21, 22.
7. Task 7, size S: Add operations evidence and closeout artifacts, including the smoke-test runbook and any README or metadata notes needed for the renamed homepage shell, redirect contract, and release verification flow. Implements Spec 1 requirements 4, 5, 6, 7, 12, 14, 16, 22.

## Dependencies
1. Approved baseline in [docs/PIVOT-PLAN.md](docs/PIVOT-PLAN.md) and approved Spec 1 in [docs/specs/01-home-page-as-chat-hero.md](docs/specs/01-home-page-as-chat-hero.md).
2. Existing chat-first composition in `src/app/chat/page.tsx`, `src/components/ChatAssistantPanel.tsx`, and `src/components/LocationContextPanel.tsx` remains the reuse target.
3. Existing route and shell files remain the primary edit surface: `src/app/page.tsx`, `src/app/chat/page.tsx`, `src/app/layout.tsx`, and touched shared navigation metadata components.
4. Existing mock/live chat client behavior and location resolution behavior remain stable enough to reuse for Sprint 1 without waiting on later runtime specs.
5. Sprint 1 must add or confirm the executable E2E surface needed by the spec-level test matrix, including repository scripts/config needed to run browser-path coverage in CI and locally.

## Risks & Mitigations
1. Risk: Homepage and `/chat` can drift into two separate implementations during refactor.
Mitigation: Reuse one page composition and make `/chat` a redirect only; add route-level coverage for redirect and homepage rendering.

2. Risk: Renaming and copy cleanup leaves Newark-flavored prompts or helper text in the touched home/chat shell.
Mitigation: Treat U.S.-wide copy as an explicit acceptance gate; add unit or integration checks for touched prompts and helper text.

3. Risk: Geolocation support regresses when the location anchor moves onto the homepage.
Mitigation: Add focused browser-path coverage for current-location success, denial, and manual-entry fallback.

4. Risk: The homepage becomes visually chat-first on desktop but not on mobile.
Mitigation: Validate representative mobile breakpoints in implementation review and cover mobile first-visit behavior in E2E.

5. Risk: Shared shell copy or metadata changes accidentally broaden scope into full-site renaming.
Mitigation: Limit this sprint to touched homepage shell, navigation, and metadata surfaces needed for Spec 1, and defer broader copy cleanup to later specs.

6. Risk: Feature work passes locally but misses MVP-complete release gates from the brief.
Mitigation: Keep smoke-test doc, CI gates, architecture-boundaries, telemetry verification, and coverage thresholds in the definition of done and acceptance closeout.

## Definition of Done
1. Every Sprint 1 task maps back to approved Spec 1 requirements and all requirement references are reflected in the implementation PR descriptions.
2. `/` renders the chat-first Grounded Moves experience and `/chat` redirects to `/` without duplicate homepage logic.
3. Touched homepage and chat-shell copy is U.S.-wide and does not present Newark as the default or implied market.
4. Manual location entry, current-location behavior, geolocation denial fallback, empty-state guidance, quick-start prompts, and chat failure handling all still work from the homepage.
5. Required tests for this sprint pass at every level the spec calls for: unit, integration, and E2E.
6. CI is green for the Sprint 1 change set, including `npm run lint`, `npm run typecheck`, unit tests, integration tests, E2E tests, the project coverage threshold required for new code, and a successful production build.
7. The architecture boundaries test remains passing.
8. Existing affected feature-path telemetry remains visible in local console behavior and production Sentry wiring.
9. Documentation is updated where touched by the sprint, including any necessary README or metadata references, release verification notes, and a smoke-test runbook at `docs/operations/smoke-tests/01-home-page-as-chat-hero.md`.
10. No new env vars, providers, orchestration paths, or tool contracts are introduced in Sprint 1.

## Rollout Plan

### Feature Flags and Rollout Safety
1. No dedicated feature flag is recommended for Sprint 1 because the change is a route-shell replacement rather than a new backend capability.
2. The kill-switch behavior is route-level rollback: revert homepage composition to the prior implementation and remove the `/chat` redirect if critical issues are discovered after merge.
3. Safe fallback behavior is the existing `/chat` page composition reused at `/`; if a regression is detected before release, the shell can be restored to the previous route split without touching chat runtime logic.

### Telemetry to Watch
1. Existing `/api/chat` request telemetry volume and error behavior after the homepage pivot.
2. Route-level Sentry errors affecting homepage render, redirect behavior, or client-side hydration.
3. Browser-reported issues tied to geolocation denial, unsupported geolocation, or homepage interaction regressions.

### Rollback Criteria
1. Homepage no longer exposes the chat composer above the fold on representative desktop or mobile breakpoints.
2. `/chat` redirect loops, fails, or breaks existing navigation expectations.
3. Touched copy reintroduces Newark-default framing or leaves the old Student Reality Platform identity active on the homepage shell.
4. Geolocation or manual location entry becomes unusable from the homepage.
5. Chat success or retry-on-error behavior regresses on the homepage path.

### Release Verification
1. Run the Sprint 1 smoke-test script before calling the feature MVP-complete.
2. Run a successful production build as part of release verification before calling the feature MVP-complete.
3. Verify desktop, mobile, current-location success, and current-location denial flows against Spec 1 acceptance criteria.
4. Confirm Story and Resources remain reachable and functional after the homepage pivot.