# Fix Plan: Uncaught TypeError in WorldGenerationPreview

## Problem
When clicking the "Generate" button in the `WorldGenerationPreview` component (`src/components/world-generation-preview/world-generation-preview.tsx`), the application crashes with a white screen due to the following error:
```
Uncaught TypeError: Cannot read properties of undefined (reading 'toFixed')
    at WorldGenerationPreview (world-generation-preview.tsx:222:55)
```
Specifically, line 212 attempts to access `valueRange.min.toFixed(3)` and `valueRange.max.toFixed(3)` when `valueRange` is `undefined`. Although `valueRange` is set after generation completes, during incremental stage reporting (via `handleGenerationEvent` when `stage-completed` events arrive), `stageStatistics` contains the noise stage before `valueRange` has been set or if the stage updates happen out-of-sync with state updates.

## Proposed Solution
1. Add optional chaining (`valueRange?.min?.toFixed(...)`) or a fallback check (e.g. `valueRange ? ... : '—'`) in `src/components/world-generation-preview/world-generation-preview.tsx` around lines 211-214.
2. Ensure `valueRange` is initialized or safely checked to prevent runtime crashes.
