# Sprint 07 Usability Notes

## Observed friction points
- Users were unsure what to ask first in chat.
- Users lacked a quick way to preserve useful assistant answers.
- Story interpretation for relocation decisions was difficult without side-by-side context.

## Implemented improvements
- Added quick-start prompt chips in chat for faster first success.
- Added saved snippets and export summary for practical handoff/share workflows.
- Added comparison mode in story (current vs target location) for moving decisions.
- Added trust/safety microcopy and reduced-motion baseline support.

## Improvement hypothesis
- Users who see prompt chips should reach first useful answer faster than free-form-only onboarding.

## Proposed A/B test
- Variant A: quick-start chips visible by default.
- Variant B: no chips.
- Measure: median time to first assistant response marked useful by user.
