# Spec 06: National Resource Framing and Expanded Location Coverage

## Context & Motivation
Grounded Moves now has a chat-first homepage, browser-scoped conversation memory, native tool use, streaming chat, and a first-class budget capability. The remaining product gap from the approved pivot is that the product is not yet nationally framed enough in its supporting content, fallback data coverage, and user-visible location honesty. The assistant can already resolve and disclose a core location context, but several supporting surfaces still reflect the earlier Newark- and student-oriented framing from the legacy product, and the broader national fallback/data story is not yet defined tightly enough for a user in any U.S. market.

This spec covers the remaining parts of Pivot Problems 7 and 8 after Spec 3 established the typed location abstraction and Spec 5 established budgeting on the real chat runtime. Its job is to make the product read, resolve, and support users as a national planning assistant rather than as a Newark-centered demo with a few generalized chat capabilities layered on top.

This spec focuses on four concrete outcomes:

1. national, location-aware product framing across supporting copy and resource hints;
2. expanded fallback market coverage for HUD/FMR-style baseline data rather than Newark-biased defaults or row-zero behavior;
3. honest disclosure of location resolution, fallback metro choice, and provider radius limitations on user-visible surfaces;
4. a predictable location-to-support-resource strategy that can produce practical housing, workforce, and 211-style links for the user’s market.

This spec does not redesign moderation, telemetry productionization, typed renderer decomposition across every tool, or the remaining serverless-hardening tracks. Those remain in Spec 7.

## User Stories
1. As a user in any U.S. city, state, metro, or ZIP, I want Grounded Moves to behave like a national product so I can trust that the experience is not secretly tuned only for Newark.
2. As a user asking about a market that live providers only partially support, I want the assistant to disclose what fallback market or benchmark it used so I understand the limits of the answer.
3. As a user asking for help beyond listings and salaries, I want the assistant to surface practical, location-aware housing and workforce resources so I can take next steps in my own area.
4. As a user entering only a state or ambiguous place name, I want fallback location handling to be explicit and repeatable so I know which metro or region is being used.
5. As a user in a metro that lacks an exact live-data match, I want the product to use the nearest or mapped fallback metro intentionally rather than silently falling back to Newark or an arbitrary first row.
6. As a user changing locations mid-session, I want the assistant’s resource hints and benchmark disclosures to track the active market so the supporting guidance stays grounded.
7. As an operator, I want telemetry around location fallback, resource-hint generation, and unsupported-market behavior so rollout quality is diagnosable.

## Functional Requirements
1. Grounded Moves must present itself as a national housing, jobs, and affordability assistant across user-visible framing touched by this spec.
2. User-visible copy touched by this spec must not describe the product as Newark-specific, student-only, or tied to the retired Student Reality Platform framing.
3. The README, app metadata, and supporting navigation or support-surface copy touched by this spec must use the Grounded Moves product name consistently.
4. Supporting content touched by this spec must describe locations generically as U.S. markets rather than implying Newark-specific defaults.
5. Homepage-adjacent copy, Story-page framing, Resources-page framing, and any retained chat-support copy touched by this spec must remove the retired Newark/student framing explicitly rather than relying only on broad product-name replacement.
6. Resource-hint generation must become location-aware instead of returning the same static federal links regardless of market.
7. The resource-hint layer must support at minimum a state-level housing authority or housing-program lookup path when one is available.
8. The resource-hint layer must support a Public Housing Authority lookup path or equivalent housing-support path keyed by the user’s market or ZIP context.
9. The resource-hint layer must support a workforce or job-support pathway keyed by the user’s state or metro context.
10. The resource-hint layer must support a 211-style community-support lookup path keyed by ZIP, city/state, or state fallback context.
11. Resource hints must remain useful when only state-level context is available.
12. If an exact local resource cannot be produced, the assistant must fall back to a broader state- or national-level resource and disclose that fallback honestly.
13. Resource-hint selection order must be deterministic and preference local specificity when available: ZIP or local lookup first, then city or metro, then state, then national fallback.
14. The implementation must not silently return Newark-specific support links for non-Newark markets.
15. The HUD/FMR fallback dataset used for market baselines must no longer behave as if Newark is the implicit default market.
16. HUD/FMR-style fallback data must remain benchmark or fallback-only evidence and must not replace exact live provider results when those exact results are available for the requested market.
17. Fallback baseline resolution must not use `rows[0]` or equivalent arbitrary first-row selection for unsupported markets.
18. The fallback baseline strategy must resolve to an explicit metro, geography, or benchmark row with a documented selection rule.
19. The fallback baseline strategy must be serializable into user-visible disclosure metadata so the assistant can say what benchmark geography was used.
20. The fallback-data layer for this spec must cover at minimum the top 50 U.S. metros or an equivalent explicitly documented national baseline set.
21. If no exact baseline match exists for the requested location, the system must resolve the request to the nearest or mapped supported metro using an explicit strategy rather than an implicit default.
22. The chosen fallback metro or benchmark must be exposed in tool output through the location-resolution contract already established in Spec 3.
23. User-visible answers that rely on a fallback baseline must disclose that a fallback benchmark was used and name the benchmark geography.
24. Location-aware tools touched by this spec must continue to accept explicit resolved location context and must not reintroduce raw-string Newark defaults.
25. Tool descriptions touched by this spec must document provider location limitations, including when a provider supports city/state but not true radius filtering.
26. If a provider ignores or approximates `radiusMiles`, that limitation must remain visible through tool metadata and, when relevant, through the assistant response.
27. The assistant must preserve the active location anchor and continue re-grounding future resource hints and fallback disclosures to the current market.
28. If the user changes the active market, newly generated resource hints and fallback baseline disclosures must reflect the new market rather than the prior one.
29. Resource hints produced for one assistant turn must remain attached to that assistant turn’s artifacts rather than overwriting prior turns’ support links.
30. The assistant must be able to reference location-aware resources from the homepage chat flow without forcing the user onto the Story page or Resources page first.
31. The implementation must support deterministic generation of location-aware resource hints in local development and automated tests.
32. The implementation must support deterministic fallback-baseline behavior in local development and automated tests.
33. The conversation and tool-result pipeline must preserve enough location-resolution metadata for the UI to present honest support links and benchmark disclosures.
34. Resource-hint output must remain structured and typed rather than freeform prose only.
35. Resource-hint output must include a user-facing label, destination URL, category, and disclosure note when fallback or approximation is involved.
36. The implementation must define a typed resource category set that distinguishes at minimum housing support, workforce support, community support, and general reference links.
37. If a ZIP code, city, or metro cannot be mapped to a local support resource confidently, the output must surface a typed fallback note rather than pretending the match is exact.
38. The assistant must not imply that a support resource is officially endorsed, guaranteed available, or exhaustive unless the source actually supports that claim.
39. The implementation must preserve the current moderation, abuse, and tool-validation controls before any new resource or fallback outputs are committed.
40. This spec must extend the shared mock/test harness so tests can script exact-match markets, metro-fallback markets, unsupported markets, and resource-hint fallback paths deterministically.
41. This spec must extend any location fixture factory or seed fixture helpers so tests can represent exact, metro-fallback, and unsupported-market scenarios without bespoke one-off setup.
42. The implementation must emit telemetry for location fallback selected, resource hint exact match, resource hint fallback used, unsupported market surfaced, and fallback baseline benchmark chosen.
43. Telemetry for this spec must avoid logging full transcript text or raw user-entered freeform location strings when coarse structured metadata is sufficient.
44. The implementation must explicitly document whether this spec ships behind a dedicated feature flag or rides the existing chat/runtime rollout controls without a new flag.
45. If no new feature flag is introduced, the sprint must still define a kill-switch or safe degraded behavior through existing controls for resource-hint or fallback-data failures.
46. The implementation must support a safe degraded path when resource-hint generation fails, preserving core chat functionality and grounded answer composition.
47. When resource generation is degraded, the assistant must fall back to broader national or state guidance rather than returning empty or misleading local hints.
48. The UI touched by this spec must display location support and benchmark disclosures in readable text, not only within hidden payloads or developer-facing traces.
49. The implementation must update any smoke-test and operations notes needed to verify national location coverage and resource fallback behavior before the spec is called MVP-complete.

## Non-Functional Requirements

### Performance
1. Resource-hint generation and fallback-baseline resolution for one assistant turn must remain lightweight relative to the existing non-provider-heavy chat path.
2. Expanding fallback baseline coverage must not materially regress cold-start or local-build performance beyond normal seed-loading overhead.
3. The implementation must avoid per-request brute-force scans over oversized location datasets when a deterministic keyed or indexed lookup strategy is available.
4. Resource-hint and fallback-resolution logic must remain fast enough to avoid noticeable extra delay in streamed and non-streamed answers.

### Accessibility
1. User-visible resource hints and location-disclosure text introduced by this spec must satisfy WCAG 2.1 AA expectations already applied to the primary chat experience.
2. Support links and fallback disclosures must be readable through screen readers with meaningful link labels rather than vague text such as “click here.”
3. Any UI touched by this spec must remain keyboard accessible and preserve transcript context when links or disclosure text are rendered.

### Privacy
1. Resource-hint and location-fallback telemetry must avoid storing raw transcript text when structured location metadata is enough to diagnose behavior.
2. The implementation must not expose precise user geolocation beyond what the user already entered or explicitly allowed through the location anchor flow.
3. Fallback disclosures must not imply false precision about the user’s location or resource eligibility.

### Security
1. Location-aware resource generation and fallback baseline resolution must remain server-side for any provider or secret-bearing logic.
2. Resource URLs emitted to the client must be generated from validated known templates, curated mappings, or trusted provider results rather than arbitrary user-controlled URL strings.
3. Unsupported or malformed locations must fail safely with typed validation or fallback behavior rather than arbitrary link generation.

### Observability
1. The system must emit telemetry for exact location-resource matches, fallback resource matches, unsupported markets, and fallback baseline benchmark selection.
2. Telemetry for this spec must remain visible through local console behavior and the production telemetry path when configured.
3. Operational debugging for location coverage and support-resource failures must be possible without logging full sensitive transcript content.

## Out of Scope
1. Budget-domain redesign, budget tool math changes, or budget card renderer redesign beyond any small compatibility updates required for national framing.
2. Telemetry fan-out productionization, Sentry adapter design, or other Spec 7 observability hardening work.
3. Moderation redesign or chain-of-responsibility guardrail implementation.
4. Typed renderer decomposition for every tool-result variant across the chat transcript.
5. Redis or other serverless-state hardening beyond what earlier specs already established.
6. A full national policy-content editorial program beyond the location-aware support pathways and fallback disclosures required here.
7. Replacing every static support page with chat-native content.

## Architecture Notes
The local hypothesis for this spec is narrow and falsifiable: the remaining national-product gap is not in the core chat runtime, but in the supporting location-to-resource and location-to-benchmark resolution surfaces that still behave too generically or too locally. A cheap disconfirming check was reading the approved pivot brief and pivot plan plus the already-landed Specs 3 and 5; those artifacts confirm that core location grounding, session continuity, streaming, and budget-state behavior are already the intended foundation, while the remaining location-coverage work is explicitly about user-visible national framing, resource quality, and honest fallback behavior.

### Current Owning Surfaces
- `buildResourceHints` or its current replacement owns support-link generation and is the most likely controlling surface for non-location-aware resource hints.
- location-aware tools that currently rely on fallback baselines own benchmark selection and disclosure risk for unsupported markets.
- supporting copy surfaces such as app metadata, README framing, and support-page copy touched by this spec still own part of the retired Newark/student framing.
- any HUD/FMR or fallback baseline seeds currently own the national-coverage gap for unsupported markets.

### Proposed Implementation Shape
1. Introduce a typed resource-hint generation layer that consumes explicit resolved location context and returns structured support links plus fallback disclosures.
2. Introduce or strengthen a typed fallback-market resolver for benchmark baselines so unsupported markets map to a documented metro or benchmark geography rather than an implicit default.
3. Keep exact-match, mapped-metro fallback, and unsupported-market handling separate in the application layer so the assistant and UI can disclose which path was used.
4. Update supporting copy and metadata touched by this spec to consistently frame Grounded Moves as a national product.
5. Preserve the existing clean-architecture boundaries by keeping location/resource resolution in application/domain code behind ports and keeping framework/provider behavior in adapters.

### Ports and Adapters
- a dedicated resource-hint service or use case may be warranted if the current helper surface is too presenter-centric or too stringly typed.
- fallback baseline resolution should remain behind an application-facing interface so a seed-backed adapter can later be swapped for a stronger national data source.
- existing location-aware provider adapters should continue exposing explicit resolution metadata rather than burying fallback behavior.
- telemetry remains behind `TelemetryPort`; this spec only extends the emitted events.

### SOLID Emphasis
- Single Responsibility: resource generation, benchmark fallback resolution, and transcript presentation should remain separate concerns.
- Open/Closed: adding another support-resource category or another metro mapping should extend typed registries or strategies rather than rewrite one central conditional block.
- Liskov Substitution: future fallback data adapters must remain interchangeable behind the same location-benchmark port.
- Interface Segregation: resource-hint generation should depend on a small location and support-data interface rather than on a full chat runtime object.
- Dependency Inversion: application-layer national-coverage logic must depend on ports and typed location objects, not on framework components or raw seed-file reads scattered across the UI.

### Pattern Fit
- Strategy: exact-match, metro-fallback, and unsupported-market resolution should be explicit strategies rather than nested ad hoc fallback conditionals.
- Adapter: resource providers, curated mappings, fallback seed access, and telemetry implementations remain adapters behind stable ports.
- Factory Method: runtime composition should select the appropriate resource-hint and fallback-resolution adapters based on environment and available data.
- Composite: structured support links can continue rendering through the existing artifact/card surface as one composite of typed link groups.
- Observer: telemetry for resource and fallback decisions should flow through the existing telemetry observer direction rather than bespoke logging.

### ADR Impact
This spec should produce an ADR if it introduces a durable location-to-resource mapping strategy or a benchmark fallback-resolution strategy that materially constrains later national expansion or provider replacement.

## Data Model & API Contracts
This spec introduces or strengthens typed contracts for support-resource generation and national fallback resolution.

### Proposed Schemas
1. `SupportResourceCategorySchema = z.enum(["housing_support", "workforce_support", "community_support", "general_reference"])`
2. `SupportResourceLinkSchema = z.object({ label: z.string().min(2), url: z.string().url(), category: SupportResourceCategorySchema, locationLabel: z.string().min(2).optional(), isFallback: z.boolean().default(false), fallbackScope: z.enum(["zip", "city", "metro", "state", "national"]).optional(), note: z.string().min(2).optional(), resolutionSource: z.enum(["zip_exact", "city_exact", "metro_match", "state_fallback", "national_fallback"]).optional() })`
3. `SupportResourceBundleSchema = z.object({ locationResolution: LocationResolutionSchema.optional(), links: z.array(SupportResourceLinkSchema), unsupportedMarket: z.boolean().default(false), disclosure: z.string().optional() })`
4. `FallbackBenchmarkResolutionSchema = z.object({ requestedLabel: z.string().min(2), benchmarkLabel: z.string().min(2), resolutionKind: z.enum(["exact", "metro_match", "state_default_metro", "nearest_supported_metro", "national_fallback"]), usedFallback: z.boolean(), fallbackReason: z.string().optional() })`
5. `LocationResourceInputSchema = z.object({ location: ResolvedLocationContextSchema, zipCode: z.string().regex(/^\d{5}$/).optional(), stateCode: z.string().min(2).max(2).optional() })`
6. `LocationResourceOutputSchema = z.object({ bundle: SupportResourceBundleSchema, benchmark: FallbackBenchmarkResolutionSchema.optional() })`
7. `NationalSupportMappingSchema = z.object({ stateCode: z.string().min(2).max(2), workforceUrl: z.string().url().optional(), housingUrl: z.string().url().optional(), phaLookupUrl: z.string().url().optional(), communityUrl: z.string().url().optional() })`

### Persistence Contract Expectations
1. This spec must not introduce a new durable session store beyond the existing conversation/session contract.
2. Assistant turns that surface support resources or fallback benchmark disclosures must preserve those artifacts on the assistant message that generated them.
3. Location-resolution and fallback metadata needed for honest resource disclosure must remain serializable through the existing tool-result and transcript artifact pipeline.

### Tool and Presenter Contract Expectations
1. Location-aware tools touched by this spec must expose enough standardized location-resolution metadata for support-resource and benchmark disclosures to be rendered honestly.
2. Support-resource output must be typed enough that the UI can render categories, fallback notes, and target URLs without `unknown` destructuring.
3. If support-resource generation fails or falls back to broader coverage, the presenter contract must preserve a typed disclosure note.

## Test Plan
The feature must ship with unit, integration, and end-to-end coverage across positive, negative, and edge paths.

| Level | Positive | Negative | Edge |
|---|---|---|---|
| Unit | Exact-match location-resource and fallback-benchmark resolution return the expected structured outputs for supported markets | Malformed or unsupported location inputs return typed validation or unsupported-market outputs rather than silent Newark defaults | State-only markets, metro fallback mappings, ZIP-only input, and no-exact-match baseline lookups behave deterministically |
| Integration | Chat/runtime slices generate location-aware support resources and honest benchmark disclosures for a resolved market | Provider/resource mapping failure degrades to broader state or national guidance without breaking the chat flow | User changes market mid-session, provider lacks radius support, and fallback benchmark selection remains truthful and stable |
| End-to-end | User selects a non-Newark market, asks for help, and receives market-aware support links and disclosures in the transcript or support surface | User enters an unsupported or ambiguous market and sees an honest fallback or broader support guidance rather than misleading local links | User moves between markets, refreshes, and continues to see the current market reflected in support hints and fallback disclosures |

### Minimum Unit Coverage
1. Exact-match support-resource generation for a supported market returns typed housing, workforce, and community links.
2. Fallback benchmark resolution for an unsupported market returns a named benchmark geography with `usedFallback: true`.
3. The fallback resolver never uses row-zero or Newark-specific defaults for a non-Newark market.
4. Resource-hint generation returns state- or national-level fallback links when exact local mappings are unavailable.
5. Typed disclosure notes are added when provider or resource coverage is approximate.
6. Provider capability metadata preserves whether `radiusMiles` is exact, approximate, or unsupported.
7. The support-resource resolver applies the documented specificity order of ZIP/local, then city or metro, then state, then national fallback.
8. HUD/FMR-style benchmark fallback remains benchmark-only when an exact live provider result exists.

### Minimum Integration Coverage
1. A resolved non-Newark location produces location-aware support resources through the real application slice.
2. A metro-fallback market produces a disclosed fallback benchmark and usable support links without route failure.
3. Changing the active location mid-session updates future resource hints and fallback disclosures.
4. Unsupported-market behavior degrades to broader state or national support guidance while preserving grounded chat operation.
5. Resource and fallback telemetry events are emitted without logging raw transcript content.
6. Mock mode can deterministically exercise exact-match, metro-fallback, and unsupported-market scenarios.
7. A market with both exact live provider coverage and fallback benchmark coverage prefers the exact live provider result while still exposing benchmark data only as disclosed supporting context when needed.

### Minimum End-to-End Coverage
1. User applies a non-Newark location anchor, asks a grounded question, and sees support or benchmark disclosures for that market.
2. User asks about a market that lacks exact coverage and sees the chosen fallback metro or benchmark disclosed explicitly.
3. User changes to a different market and receives newly grounded support pathways rather than stale prior-market links.
4. User refreshes or continues within the same browser session and the active market continues to drive support/resource behavior honestly.
5. User encounters a degraded support-resource path and still receives usable broader guidance rather than a broken or empty UI.
6. User visits Story or Resources surfaces touched by this spec and no longer sees retired Newark/student framing in the updated national product copy.

## Acceptance Criteria
1. Grounded Moves surfaces national framing consistently on the copy and metadata touched by this spec.
2. Supporting resource hints are location-aware and no longer static boilerplate regardless of market.
3. The system no longer silently defaults to Newark or arbitrary first-row fallback behavior for unsupported markets.
4. Fallback baseline selection resolves to an explicit benchmark geography with user-visible disclosure.
5. The fallback baseline data strategy covers at minimum the approved national benchmark set for this spec.
6. HUD/FMR-style fallback baselines remain disclosed benchmarks or fallback-only evidence rather than silently replacing exact live provider results.
7. Resource hints can fall back safely to state or national guidance when exact local mappings are unavailable.
8. Provider and radius limitations touched by this spec remain documented and honestly disclosed when relevant.
9. Resource and benchmark disclosures remain attached to the assistant turn that produced them and do not overwrite prior turns.
10. Rollout behavior is explicit: either a dedicated feature flag is present for this spec or the sprint documents why existing controls are sufficient and what the safe degraded path is.
11. Required unit, integration, and end-to-end coverage for positive, negative, and edge cases is present and passing.
12. CI is green for the Spec 6 change set, including lint, typecheck, all required tests, and production build verification.
13. A smoke-test runbook for national location coverage and support-resource fallback behavior exists before the feature is called MVP-complete.

## Open Questions
1. The main non-blocking implementation choice is whether local support-resource generation should start with a curated state-and-metro mapping file plus deterministic national fallbacks, or whether there is an approved external source for those mappings that should be adopted immediately. If no external source is approved during sprint planning, the curated-mapping-plus-fallback path should be the default MVP direction.