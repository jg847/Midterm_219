# Smoke Test 04: Streaming Chat Responses and Tool Status

## Purpose
Verify Sprint 4 streamed chat delivery, transient tool-status rendering, fallback safety, and same-session browser behavior before promotion.

## Preconditions
1. Install dependencies and ensure `.env.local` is configured.
2. Set `NEXT_PUBLIC_ENABLE_SESSION_MEMORY=true`.
3. Set `NEXT_PUBLIC_ENABLE_NATIVE_TOOL_USE=true`.
4. Set `NEXT_PUBLIC_ENABLE_STREAMING_CHAT=true`.
5. For deterministic validation without live providers, set `NEXT_PUBLIC_USE_MOCK_CHAT=true`.
6. Start the app with `npm run dev`.

## Primary Checks
1. Open the homepage and submit a question.
Expected: the user turn appears immediately, the assistant shows an in-progress row, and the answer renders incrementally instead of appearing only at completion.

2. Ask a tool-backed question such as a jobs or housing lookup.
Expected: transient tool-status lines appear during the active turn, then disappear from the committed transcript once the final assistant row is saved.

3. Ask an ambiguous state-only question that should trigger clarification.
Expected: the clarification prompt appears promptly through the streamed path and commits as the assistant turn without falling back to a buffered-only experience.

4. Refresh after a completed streamed turn.
Expected: the committed transcript restores normally and does not replay transient tool-status lines as durable history.

5. Trigger a mocked interruption or parser failure path.
Expected: the UI shows a retryable interruption message, keeps prior transcript rows intact, and does not commit a partial assistant turn.

## Fallback Checks
1. Set `NEXT_PUBLIC_ENABLE_STREAMING_CHAT=false` and reload.
Expected: chat still works through the buffered JSON path with no SSE-specific UI breakage.

2. Keep `NEXT_PUBLIC_ENABLE_STREAMING_CHAT=true` but set `NEXT_PUBLIC_USE_MOCK_CHAT=true`.
Expected: deterministic streaming mock mode still drives the homepage chat flow with streamed deltas and final payload commit.

## Multi-Tab Check
1. Open the same browser session in two tabs.
2. Start a streamed request in the first tab.
3. Attempt to start a second streamed request in the other tab before the first completes.
Expected: the second tab is blocked from starting a same-session concurrent stream and the transcript remains ordered after the first stream completes.

## Exit Criteria
1. Streamed turns complete with one committed assistant row plus artifacts.
2. Transient tool-status lines never persist as standalone transcript messages.
3. Clarification-only streamed turns behave correctly.
4. Buffered fallback remains functional when streaming is disabled.
5. Same-session multi-tab behavior prevents duplicate active streams.