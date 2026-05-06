# Smoke Test: Home Page as Chat Hero

## Preconditions
1. Install dependencies in `student-reality-platform/`.
2. Start the app with `NEXT_PUBLIC_USE_MOCK_CHAT=true npm run dev` or run `npm run test:e2e` to exercise the browser flow automatically.
3. Open the app at `/`.

## Manual Checks
1. Confirm the homepage headline presents Grounded Moves as a location-aware housing, jobs, and affordability assistant.
2. Confirm the chat composer, send action, and location anchor are visible on first load without navigating to another route.
3. Confirm Story and Resources are reachable from primary navigation and the supporting cards near the bottom of the homepage shell.
4. Click `Use Current Location (optional)` with location permission denied and confirm the manual-entry fallback message appears.
5. Enter a city or ZIP code manually, apply it, and confirm the active location banner updates.
6. Submit a chat question and confirm the assistant returns a response and keeps retry behavior available if the request fails.
7. Visit `/chat` directly and confirm the route redirects to `/`.
8. Open `/story` and `/resources` and confirm both routes still render.

## Release Checks
1. Run `npm run lint`.
2. Run `npm run typecheck`.
3. Run `npm run test`.
4. Run `npm run test:e2e`.
5. Run `npm run build`.

## Expected Outcome
1. The homepage is the primary chat-first experience.
2. `/chat` behaves only as a redirect.
3. Touched copy uses Grounded Moves and avoids Newark-default wording.
4. Story and Resources continue working after the homepage pivot.