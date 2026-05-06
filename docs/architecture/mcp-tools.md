# MCP Tool Catalog (Sprint 2)

## Implemented tools
- `location_lookup_tool`: OpenCage geocoding and normalization.
- `job_search_tool`: USAJOBS + Adzuna aggregated listings.
- `housing_search_tool`: RentCast listing search with HUD fallback guidance.
- `housing_market_tool`: HUD FMR affordability baseline.
- `dataset_query_tool`: Legacy processed affordability dataset metrics.
- `story_information_tool`: Story context and citation snippets.
- `rag_retrieval_tool`: Retrieval over seeded story chunks (full-text baseline).

## Contracts
Input schemas and parsing live in `src/shared/schemas/toolContracts.ts`.

## Guardrails
- Provider clients use shared `guardedFetch` for caching and in-memory rate limiting.
- Provider payloads are normalized in adapter clients before returning tool outputs.
- Tools return stable `ToolResult<T>` objects with typed error codes.
