# ADR 0004: Native Tool Use Model Boundary

## Status
Accepted

## Context
Sprint 3 replaces regex-led chat orchestration with Anthropic native tool use while preserving the existing clean-architecture boundaries, session-memory contract, and UI-facing assistant artifact shape. The application layer needs a model seam that can represent ordered conversational turns, model-visible tool definitions, structured tool calls, and typed tool results without importing Anthropic transport details into use cases.

## Decision
Extend the existing `ModelClient` port rather than introducing a separate tool-use-specific client. Keep plain text generation support for existing paths, and add a native tool-use method plus shared tool-use message and result types on the same port. Pair that model seam with a separate `ToolCatalog` port so the application layer depends only on model-facing tool definitions, not on the MCP registry implementation.

The primary chat route selects between the legacy regex orchestration path and the new native-tool-use path through an explicit rollout flag. The native path runs a bounded tool loop, emits the internal non-streaming event sequence, persists assistant artifacts, and carries forward typed clarification-state plus `locationResolution` metadata.

## Consequences
- The application layer keeps one substitution point for model behavior in tests while still supporting both plain generation and native tool use.
- Anthropic-specific request and response block mapping stays isolated inside the framework adapter.
- The MCP registry remains a framework concern; model-facing tool definitions are exposed through the dedicated `ToolCatalog` adapter.
- The route can fall back safely to the legacy orchestration path while the rollout flag exists.
- Later streaming work can extend the internal event seam without redesigning the tool-use loop or the public response contract first.