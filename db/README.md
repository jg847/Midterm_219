# Database Migrations

Apply migrations in order:
1. `0001_initial_schema.sql`

Sprint 2 uses SQL migrations as source of truth for:
- locations
- chat sessions/messages
- tool invocations
- listings cache
- story documents/chunks

The retrieval baseline uses PostgreSQL full-text indexing on `document_chunks.content`.
