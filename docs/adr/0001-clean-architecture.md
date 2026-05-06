# ADR 0001: Adopt Clean Architecture

## Status
Accepted

## Context
The system needs scalable integrations across jobs, housing, location, and AI orchestration without coupling business rules to framework code.

## Decision
Adopt Clean Architecture with strict layer boundaries and inward dependency flow.

## Consequences
- Higher initial structure cost.
- Better long-term modularity, testability, and DRY business logic.
