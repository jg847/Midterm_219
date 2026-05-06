# Clean Architecture

## Layers
- `src/domain`: entities and business rules.
- `src/application`: use cases and orchestration.
- `src/interface-adapters`: presenters, DTO mappers, route-facing adapters.
- `src/frameworks`: external APIs, persistence clients, MCP tool runtime.
- `src/app`: Next.js route and page entry points.

## Dependency Rule
Dependencies flow inward only.

Allowed:
- `app -> interface-adapters -> application -> domain`
- `frameworks -> interface-adapters|application|domain`

Forbidden:
- `domain` importing `next`, React, DB clients, or provider SDKs.
- `application` importing UI components or framework clients.

## DRY Rules
- Business formulas are defined once in domain/application and reused by adapters/UI.
- Provider response parsing is centralized in adapter mappers.
- Retry/caching client logic is shared and not repeated per provider.

## Runtime Boundary
Chat orchestration lives in application use cases.
Prompts do not encode business rules.
