# Chat Request Lifecycle (Sprint 3)

1. API route validates input and moderation policy.
2. `ClassifyIntent` determines intent category.
3. `SelectTools` chooses MCP tools.
4. `ExecuteToolPlan` calls MCP server tools and captures trace metadata.
5. `ComposeGroundedResponse` builds model prompt from tool outputs and gets final answer.
6. Conversation repository persists messages and tool traces.
7. Telemetry emits intent and per-tool execution events.

Layer mapping:
- Controller: `src/app/api/chat/route.ts`
- Use cases: `src/application/chat/*`
- Tool runtime: `src/frameworks/mcp-tools/*`
- Provider adapters: `src/frameworks/providers/*`
- AI adapter: `src/frameworks/ai/AnthropicModelClient.ts`
- Persistence adapter: `src/frameworks/repositories/conversation/*`
