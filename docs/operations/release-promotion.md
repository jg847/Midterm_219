# Staging to Production Promotion

## Promotion Workflow
1. Open release PR and ensure CI is green.
2. Merge to `main` and deploy to preview/staging.
3. Run smoke checks on staging:
- `GET /api/health` should return HTTP 200.
- Chat request should return `ok: true`.
- Location resolution request should return `ok: true`.
4. Execute release blocker command locally:
```bash
npm run release:check
```
5. Promote staging build to production in Vercel.
6. Run post-deploy smoke checks on production.
7. Announce release with notes and known issues.

## Required Sign-Offs
- Engineering owner: release gate and architecture status.
- Data/tools owner: provider status and key validity.
- Product owner: user-impact and copy validation.

## Rollback Trigger Conditions
- `GET /api/health` becomes non-200 for more than 5 minutes.
- Tool error rate > 10% over 15 minutes.
- Major regression in chat or location onboarding path.

## Rollback Procedure
1. Promote previous stable deployment.
2. Confirm health endpoint and smoke tests recover.
3. Post incident summary and mitigation tasks.
