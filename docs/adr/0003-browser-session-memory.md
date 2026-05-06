# ADR 0003: Browser Session Identity and Durable Conversation Storage

## Status
Accepted

## Context
Grounded Moves needs conversation memory that survives refreshes, serverless cold starts, and horizontal scaling. The previous runtime wrote transcript data into an in-process repository after each answer, but it never loaded that history back into model composition and every browser reused the same hardcoded session identifier.

## Decision
Use a browser-scoped UUID stored in local storage as the session identifier for anonymous chat continuity. Persist conversation sessions through the existing `ConversationRepository` port, backed by Upstash Redis in production-like environments and `InMemoryConversationRepository` in development and test. Hydrate transcript state through a dedicated `/api/chat/session/[sessionId]` route and keep the feature behind a session-memory rollout flag with a stateless fallback path.

## Consequences
- Refreshes and repeated visits in the same browser can restore transcript history and assistant artifacts.
- Production behavior no longer depends on module-local `Map` state for conversation continuity.
- Development and tests retain deterministic in-memory behavior without requiring Redis.
- Session reset can invalidate server-side conversation state without clearing unrelated local state like saved location or snippets.
- The model prompt contract now accepts ordered Anthropic-style `messages: [...]`, reducing future migration cost for later chat-runtime specs.