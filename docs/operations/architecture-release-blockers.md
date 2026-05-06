# Architecture and DRY Release Blockers

Release must stop if any blocker below fails.

## Automated Blockers
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:reliability`
- `npm run build`

`npm run release:check` executes all blockers above.

## Manual Blockers
- No unapproved layer-boundary exceptions.
- No duplicated core affordability formula logic outside approved shared domain utility.
- New adapter code does not bypass application use cases.
- Any architecture exception is documented in ADR before release.

## Evidence to Attach to Release
- CI run URL with all gates green.
- Summary of reliability tests and any flaky-test mitigation.
- List of approved ADR exceptions (if any).
- Confirmation that production sign-off reviewers completed boundary review.
