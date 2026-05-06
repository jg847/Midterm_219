# Privacy and Compliance Baseline

## PII Handling Rules
- Collect the minimum data needed for user intent fulfillment.
- Do not store raw GPS history in persistent storage by default.
- Use coarse location context (city/state/radius) for affordability analysis.

## Consent and Transparency
- Geolocation-derived context must be user initiated.
- UI copy must explain why location is used and how to clear it.
- API responses should avoid echoing sensitive user input unless required.

## Data Retention
- Conversation data in memory is ephemeral by default.
- Operational logs should avoid full prompt payload capture.
- Retain incident logs for 30 days, then purge or anonymize.

## Security Controls
- All provider keys are server-only secrets unless intentionally public.
- Enforce API abuse controls with route-level rate limits.
- Rotate secrets on suspected leak or quarterly cadence.

## User Rights Operational Baseline
- Provide a way to reset local context in UI.
- Honor support deletion requests for any persisted profile records.
- Track privacy-related requests in incident/support tracker.
