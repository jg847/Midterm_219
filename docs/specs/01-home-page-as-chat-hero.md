# Spec 01: Home Page as Chat Hero

## Context & Motivation
Grounded Moves is now a chat-first product, but the current `/` route still behaves like a brochure page with three cards. The actual conversational surface already lives on `/chat`, where `ChatAssistantPanel` and `LocationContextPanel` are composed into a usable planning layout. That split is now the main product mismatch.

This spec moves the primary interaction to the home page and makes the chat input visible above the fold on first load. It also aligns the product shell and copy with the approved Grounded Moves naming, preserves existing deep links by redirecting `/chat` to `/`, and keeps Story and Resources available as supporting destinations rather than peer entry points.

This spec intentionally does not solve conversation memory, streaming, native tool use, or budget orchestration. Its goal is to make the existing conversational surface the primary entry point without widening scope into later chat-runtime pivots.

## User Stories
1. As a first-time visitor, I want to land directly on a usable chat interface so that I can ask a housing or affordability question immediately.
2. As a user who prefers to set context first, I want a compact location anchor near the chat input so that the assistant can stay grounded to one market.
3. As a returning user following an older `/chat` link, I want to arrive at the same primary experience without confusion so that old bookmarks and references still work.
4. As a user who still wants supporting context, I want Story and Resources to remain easy to find so that I can inspect background material without losing the main conversational path.
5. As a keyboard or screen-reader user, I want the primary chat controls and location controls to be accessible on initial load so that I can use the product without workaround navigation.
6. As a user on a smaller screen, I want the first screen to prioritize the chat composer and context controls without excessive scrolling so that the product still feels chat-first on mobile.
7. As an engineer shipping the pivot incrementally, I want the homepage move to reuse the existing chat shell where possible so that we minimize unnecessary risk before later runtime changes.

## Functional Requirements
1. The `/` route must render a chat-first landing experience whose primary above-the-fold content is the conversational shell, not a three-card marketing grid.
2. The home page must expose a visible chat composer without requiring the user to navigate to another route.
3. The home page must include the location anchor in the same top-level interaction region as the chat surface.
4. The homepage shell must use the approved product name Grounded Moves in its visible copy.
5. The homepage shell must describe the product as a location-aware housing, jobs, and affordability assistant rather than as a Newark-specific student story.
6. Homepage and chat-surface copy touched by this spec must be framed for any U.S. location and must not present Newark as the default or implied primary market.
7. Story and Resources must remain reachable from primary navigation and may appear below the fold or as supporting links, but they must not compete with the chat hero as equal primary cards.
8. Requests sent from the homepage chat surface must continue using the current `ChatAssistantPanel` interaction path unless a localized presenter change is needed for layout or naming alignment.
9. Requests sent from the homepage location anchor must continue using the current `LocationContextPanel` resolution path unless a localized presenter change is needed for layout or naming alignment.
10. The homepage location anchor must preserve manual city and ZIP entry plus the existing user-initiated browser geolocation path.
11. If browser geolocation is unavailable, denied, or fails to resolve, the homepage must preserve a clear fallback path to manual entry without breaking the chat-first flow.
12. The `/chat` route must redirect to `/` with behavior suitable for preserving existing bookmarks and links.
13. The redirect from `/chat` to `/` must not introduce a duplicate homepage implementation that can drift from the real home route.
14. The global navigation, metadata, and page copy touched by this sprint must use Grounded Moves naming consistently enough that the homepage no longer presents Student Reality Platform as the active product identity.
15. The home page must provide at least one concise first-use prompt or cue that helps a user understand what to ask first.
16. Example prompts, empty-state text, and helper copy touched by this spec must avoid Newark-specific defaults and instead use neutral U.S.-wide wording or clearly non-default examples.
17. The home page must preserve access to the current assistant capabilities already surfaced in the existing chat shell, including quick-start prompts and location-aware chat submission.
18. The homepage layout must remain functional when no location is set and must continue showing the current degraded-state guidance that answers will be less specific until a place is chosen.
19. The homepage must remain fully functional when chat API requests fail, including preserving the current retry and visible error behavior in the chat surface.
20. The spec implementation must not require changes to chat orchestration logic, conversation persistence behavior, provider integrations, or tool contracts.
21. The implementation must not introduce a second, separately maintained chat-home shell for desktop and mobile; responsive behavior must come from one route implementation.
22. The implementation must preserve Story and Resources routes as working pages.

## Non-Functional Requirements

### Performance
1. The above-the-fold homepage must render without waiting on a chat API call.
2. On local production build verification, the chat hero, composer, and location anchor must be visible in the initial viewport on representative desktop and mobile breakpoints without requiring vertical scroll.
3. The server-side redirect from `/chat` to `/` must complete without client-side delay logic and must not add an extra render pass beyond standard Next.js redirect handling.
4. This spec must not materially increase the number of initial network calls required to view the homepage compared with the current `/chat` page.
5. The homepage pivot must not increase JavaScript required for first render by introducing a second chat-shell implementation.

### Accessibility
1. New or modified homepage UI must meet WCAG 2.1 AA expectations for keyboard access, focus visibility, semantic headings, labels, and color contrast.
2. The first interactive controls on the homepage must be reachable in a sensible tab order: navigation, location anchor, chat composer, send action.
3. Any new links or buttons added to support Story and Resources must have clear accessible names.
4. The `/chat` redirect must not create an inaccessible dead-end or confusing route loop for assistive technology users.

### Privacy
1. This spec must not expand the set of user data collected beyond the existing location preference and chat request payloads.
2. If location context is reused on the homepage, it must continue honoring the current user-initiated location resolution flow.

### Security
1. This spec must not move provider credentials, API calls, or tool execution into the browser.
2. The redirect and route changes must not expose internal-only routes or debugging surfaces.

### Observability
1. Existing chat request telemetry must continue to fire after the homepage pivot.
2. Any homepage-specific rollout or routing problem must be diagnosable through standard route behavior, browser checks, and existing error reporting.
3. MVP completion for this spec still requires telemetry visibility in both Sentry production wiring and local console behavior, even if no new telemetry event names are introduced.

## Out of Scope
1. Conversation memory and per-browser session persistence.
2. Native Anthropic tool-use orchestration.
3. Streaming responses and tool status events.
4. Budget tool design or budget card rendering.
5. Newark fallback removal from orchestration or tools.
6. National resource hint redesign.
7. Typed tool-result renderer decomposition.
8. Full metadata and copy cleanup across every remaining route.

## Architecture Notes
The local hypothesis behind this spec is straightforward: the most direct and lowest-risk path is to make `/` reuse the current `/chat` page shell rather than inventing a new homepage-specific chat implementation. A cheap disconfirming check was reading the current `src/app/page.tsx` and `src/app/chat/page.tsx`; that confirmed the home route is still a static card grid while the actual conversational shell already exists on `/chat`.

### Current Owning Surfaces
- `src/app/page.tsx` currently controls the incorrect homepage behavior.
- `src/app/chat/page.tsx` already owns the chat-first route composition.
- `src/components/ChatAssistantPanel.tsx` owns the interactive assistant surface.
- `src/components/LocationContextPanel.tsx` owns the location anchor.
- `src/app/layout.tsx` and shared navigation/metadata surfaces own global naming drift.

### Proposed Implementation Shape
1. Promote the existing chat-first page composition to the `/` route.
2. Replace the standalone `/chat` page implementation with a redirect to `/`.
3. Keep `ChatAssistantPanel` and `LocationContextPanel` as the primary reusable components for this spec.
4. Limit component edits to naming, copy, layout, and small presentational adjustments needed to satisfy the new hero requirements.
5. Preserve clean-architecture boundaries by keeping this spec in `src/app`, `src/components`, and interface-adapter presentation seams only.

### SOLID Emphasis
- Single Responsibility: the homepage route should compose the chat-first shell, not absorb new chat orchestration logic.
- Open/Closed: Story and Resources remain additive supporting destinations, not special-cased branches in the homepage runtime.
- Dependency Inversion: no application-layer or framework-layer chat logic should be pulled upward into the page component to satisfy the homepage pivot.

### Pattern Fit
- Adapter: existing interface-adapter hooks and API clients remain the presentation boundary for location and chat requests.
- Factory Method: no new factory is required in this spec.
- Composite: the homepage should compose existing leaf components rather than duplicating their internals.

### ADR Impact
No new ADR is required if the implementation simply promotes the existing chat shell to `/` and redirects `/chat`. If route behavior or shell composition introduces a longer-lived architectural constraint beyond this spec, document that in a follow-up ADR during sprint execution.

## Data Model & API Contracts
This spec does not introduce new persistence shapes or provider contracts.

### Existing Contracts Reused
1. `sendChatMessage()` request and response shapes remain unchanged.
2. `resolveLocationContext()` request and response shapes remain unchanged.
3. Existing `SavedLocationPreference` behavior remains unchanged.

### Route Contract Change
1. `GET /chat` becomes a redirect contract to `/`.
2. No query-parameter translation is required in this spec unless needed to preserve current behavior during implementation review.

### UI Contract Expectations
1. The homepage route must accept no required initial props.
2. The homepage must preserve the current ability to render chat with or without a resolved location.

## Test Plan
The feature must ship with unit, integration, and end-to-end coverage across positive, negative, and edge paths.

| Level | Positive | Negative | Edge |
|---|---|---|---|
| Unit | Homepage route composes the chat-first shell and supporting navigation links correctly | Redirect helper for `/chat` rejects accidental non-home destinations or duplicate shell logic | Homepage renders correctly when no saved location is available and when supporting sections are condensed below the fold |
| Integration | `/` returns the chat-first experience and `/chat` redirects to `/` while Story and Resources routes still resolve | Chat API failure still surfaces the existing in-panel error state when invoked from the homepage | Saved location state hydrates correctly on the homepage and does not break the first render when storage is empty or unavailable |
| End-to-end | User lands on `/`, sees the chat composer above the fold, sets location, asks a question, and receives the current mocked or live result path | User follows an older `/chat` link, is redirected to `/`, and can still use the assistant without confusion | Mobile viewport and reduced-motion settings still expose the composer and location anchor without unusable overflow or hidden primary controls |

### Minimum Unit Coverage
1. The homepage route renders the chat-first shell instead of the old three-card layout.
2. The `/chat` route resolves as a redirect to `/`.
3. Navigation still includes working links to Story and Resources.
4. Grounded Moves naming appears in the updated route and shared shell touched by this spec.
5. Homepage copy and prompt text touched by this spec do not hardcode Newark as the default market.
6. The homepage location anchor still exposes manual entry and current-location controls.

### Minimum Integration Coverage
1. Rendering `/` exposes the chat composer and location anchor in the returned app tree.
2. The existing chat submission path still works from the homepage using the current mock/live client behavior.
3. Chat request failure still produces the retry-capable error UI from the homepage shell.
4. `/story` and `/resources` continue rendering after the homepage pivot.
5. Geolocation denial or unavailable-browser behavior preserves manual location entry and does not block chat usage.

### Minimum End-to-End Coverage
1. Desktop first-visit path on `/`.
2. Legacy link path via `/chat`.
3. Mobile first-visit path on `/`.
4. Keyboard-only path reaching location input, chat input, and send control.
5. Browser current-location success path on `/`.
6. Browser current-location denial path on `/` with manual-entry fallback.

## Acceptance Criteria
1. Visiting `/` opens a chat-first Grounded Moves homepage rather than the current three-card landing page.
2. The chat composer is visible above the fold on representative desktop and mobile breakpoints.
3. The location anchor is present in the same primary interaction region as the chat surface.
4. `/chat` redirects to `/`.
5. Story and Resources remain available as supporting destinations.
6. The touched product shell no longer presents Student Reality Platform as the active homepage identity.
7. Touched homepage and chat-surface copy no longer present Newark as the default or implied product market and instead frame the assistant as U.S.-wide.
8. Existing chat submission, empty-state guidance, error state, quick-start behavior, and current-location/manual-location behavior still work from the homepage.
9. No application-layer chat logic, tool contracts, or provider integrations were changed to complete this feature.
10. Required unit, integration, and E2E coverage for this spec are present and passing.
11. CI is green for the Sprint 1 change set, including lint, typecheck, unit, integration, E2E, and the project coverage threshold required for new code.
12. The architecture boundaries test remains passing after the homepage pivot.
13. Telemetry for the affected feature path is visible through the existing console behavior in development and the configured Sentry path in production wiring.
14. A manual smoke-test document for this feature exists under `docs/operations/smoke-tests/01-home-page-as-chat-hero.md` before the feature is called MVP-complete.

## Open Questions
1. None at spec time. The approved pivot baseline already resolved product naming, `/chat` behavior, and homepage direction.