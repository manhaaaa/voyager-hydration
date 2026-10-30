# Scope: E2E Testing Track

## Test Philosophy
- Opaque-box, requirement-driven testing based on `ORIGINAL_REQUEST.md`.
- No reliance on internal module implementation details.
- 4-Tier methodology:
  * Tier 1: Feature Coverage (>=5 tests per feature)
  * Tier 2: Boundary & Corner Cases (>=5 tests per feature: empty inputs, extreme weight, extreme weather, quiet hours)
  * Tier 3: Cross-Feature Combinations (pairwise interactions: weather + activity, deficit + quick log, quiet hours + notifications)
  * Tier 4: Real-World Application Scenarios (full day simulation, streak increment, offline sync)
- Create test runner and test cases in `tests/e2e/`.
- Publish `TEST_READY.md` at project root (`d:\uống nước\TEST_READY.md`) when complete.

## Feature Inventory Scope
All features in `d:\uống nước\.agents\teamwork\PROJECT.md § Feature Inventory` (Features 1 through 17).

## Required Deliverables
1. `TEST_INFRA.md` at project root.
2. Complete test suite in `tests/e2e/` executable via standard test command.
3. `TEST_READY.md` at project root with full coverage matrix.
