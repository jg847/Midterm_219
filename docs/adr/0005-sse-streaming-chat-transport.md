# ADR 0005: SSE Streaming Chat Transport

## Status
Accepted

## Context
Sprint 4 extends the native-tool-use orchestration path with streamed delivery so the homepage chat no longer waits for one buffered JSON payload before showing progress. The route must preserve browser-session semantics, assistant-artifact persistence, and fallback safety from earlier sprints while adding transient tool-status updates and incremental assistant rendering.

## Decision
Use Server-Sent Events on `POST /api/chat` as the streamed route contract. The browser explicitly opts into streaming by request flag or `Accept: text/event-stream`, and the route falls back to the existing buffered JSON contract when streaming is disabled or not requested.

Keep the application layer transport-agnostic by exposing an async native-tool-use event source from the use case. The route adapts those ordered events into SSE frames, and the browser consumes them through a typed stream parser in the chat interface-adapter layer rather than parsing raw stream frames in React components.

Prevent same-session duplicate streams in the browser with a lightweight shared browser-storage lock so one browser session does not commit overlapping assistant turns from multiple tabs under the same session ID.

## Consequences
- Stream framing remains isolated to the route and browser transport adapter rather than leaking into use cases.
- The buffered JSON path remains available as a kill switch and compatibility fallback.
- Transient tool-status lines stay out of durable transcript persistence because only the final payload commits the assistant turn.
- Deterministic streaming mock mode can reuse the same route contract for local development, tests, and browser automation without live provider calls.
- The current implementation chunks final assistant text from the native-tool-use completion path through the shared event seam; later provider-level token streaming can extend the same transport contract without redesigning the client protocol.