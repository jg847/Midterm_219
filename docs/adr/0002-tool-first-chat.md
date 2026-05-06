# ADR 0002: Tool-First Chat Orchestration

## Status
Accepted

## Context
Assistant behavior must be auditable and deterministic while remaining extensible.

## Decision
All external capabilities are implemented as MCP tools. Chat use cases decide tool selection and aggregate grounded responses.

## Consequences
- Better observability and traceability.
- Prompt layer remains thin and free of business rules.
