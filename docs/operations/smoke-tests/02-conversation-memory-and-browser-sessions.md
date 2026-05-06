# Smoke Test: Conversation Memory and Browser Sessions

## Preconditions
1. Install dependencies in `student-reality-platform/`.
2. Start the app with `NEXT_PUBLIC_USE_MOCK_CHAT=true npm run dev`.
3. Leave `NEXT_PUBLIC_ENABLE_SESSION_MEMORY` unset or set it to `true` so the feature is enabled.
4. Open the app at `/`.

## Manual Checks
1. Confirm the homepage loads with the chat composer enabled after the initial restore state completes.
2. Submit a chat question and confirm the assistant returns a response plus structured tool-result cards.
3. Refresh the page and confirm the recent transcript, assistant answer, and any cards or citations tied to the last assistant message are restored.
4. Confirm the session notice indicates when a recent conversation has been restored.
5. Click `Reset chat` and confirm the transcript clears, the session notice updates, and location context plus saved snippets remain untouched.
6. Open the app in a separate browser context or private window and confirm a different browser session is created.
7. With `NEXT_PUBLIC_ENABLE_SESSION_MEMORY=false`, restart the app and confirm chat still works while transcript restore and reset-backed continuity are disabled.

## Release Checks
1. Run `npm run lint`.
2. Run `npm run typecheck`.
3. Run `npm run test`.
4. Run `npm run test:e2e`.
5. Run `npm run build`.

## Expected Outcome
1. Each browser context gets its own stable session identifier.
2. Transcript history restores after refresh in the same browser context.
3. Reset clears only conversation-session state.
4. Disabling the feature flag falls back to a safe stateless chat path.