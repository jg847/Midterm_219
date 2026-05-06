# Smoke Test 06: National Resource Framing And Expanded Location Coverage

## Purpose
Verify Sprint 6 national framing, location-aware support resources, fallback benchmark disclosure, active-market switching, and degraded support behavior before promotion.

## Preconditions
1. Install dependencies and ensure `.env.local` is configured.
2. Set `NEXT_PUBLIC_ENABLE_SESSION_MEMORY=true`.
3. Set `NEXT_PUBLIC_ENABLE_NATIVE_TOOL_USE=true`.
4. Set `NEXT_PUBLIC_ENABLE_STREAMING_CHAT=true` if validating streamed output.
5. For deterministic local validation, set `NEXT_PUBLIC_USE_MOCK_CHAT=true` only if the targeted check does not require live provider output.
6. Start the app with `npm run dev`.

## Primary Checks
1. Open the homepage and confirm the hero, Story card, and Resources card use national framing rather than Newark/student framing.
Expected: the homepage reads as a U.S. market assistant and links to the updated Story and Resources surfaces.

2. Set a supported market such as Austin, TX or Phoenix, AZ in the location anchor.
Expected: the assistant accepts the location, keeps it visible as active context, and future answers stay grounded to that market.

3. Visit the Resources page before setting a location.
Expected: the page shows national starter resources with clear fallback coverage instead of pretending to have exact local matches.

4. Set a market on the Resources page.
Expected: the support links update to the selected market and disclose when the coverage is state-level or national rather than exact local.

5. Visit the Story page with a selected market.
Expected: the page describes the trend as a benchmark/reference shape, not as an exact local time series, and any fallback benchmark note is readable.

## Fallback Coverage Checks
1. Ask about a supported market with seeded benchmark coverage such as Houston, TX.
Expected: the assistant can use an exact or same-state benchmark and disclose the resolved market when relevant.

2. Ask about an unsupported market such as Boise, ID.
Expected: the assistant or surfaced artifacts disclose that a national benchmark was used rather than implying exact local coverage.

3. Ask for rentals where live listings are sparse or unavailable.
Expected: the UI surfaces a benchmark label and fallback note instead of showing an unlabeled `$0` or a generic HUD baseline string.

4. Ask a follow-up question after switching to a different market.
Expected: new support links and benchmark disclosures use the new market while older transcript artifacts remain unchanged.

## Honesty Checks
1. Confirm that benchmark labels name the resolved benchmark geography when fallback is in use.
Expected: exact live listings remain exact, while benchmark-only evidence is labeled as a benchmark.

2. Confirm provider-radius limitations remain honest on touched surfaces.
Expected: tools or UI surfaces do not claim true radius filtering where the provider only supports city/state approximations.

3. Confirm no touched page or assistant-adjacent copy reintroduces Newark as the default market.
Expected: Newark may appear only as seed provenance disclosure or as an explicit user/test input, not as a hidden product default.

## Exit Criteria
1. Touched homepage, Story, and Resources surfaces are nationally framed.
2. Support resources are location-aware and disclose fallback scope honestly.
3. Unsupported markets disclose the selected fallback benchmark geography.
4. Market switching updates future support links and benchmark notes without mutating prior assistant artifacts.
5. No touched UI surface presents benchmark-only evidence as exact local coverage.