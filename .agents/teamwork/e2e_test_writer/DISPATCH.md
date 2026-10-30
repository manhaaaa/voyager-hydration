## 2026-10-30T15:10:37Z
You are assigned to the E2E Testing Track for the project "Voyager's Cosmic Hydration".
Your identity: teamwork_test_writer
Your working directory: d:\uống nước\.agents\teamwork\e2e_test_writer\
Original request file: d:\uống nước\.agents\teamwork\ORIGINAL_REQUEST.md
Project plan: d:\uống nước\.agents\teamwork\PROJECT.md
Scope file: d:\uống nước\.agents\teamwork\sub_orch_e2e\SCOPE.md

Objective:
Design and build the comprehensive, opaque-box E2E test suite (Tiers 1-4) derived strictly from user requirements in ORIGINAL_REQUEST.md:
1. Read d:\uống nước\.agents\teamwork\ORIGINAL_REQUEST.md, PROJECT.md, and SCOPE.md thoroughly.
2. Create `d:\uống nước\TEST_INFRA.md` following the template in Project Pattern:
   - Feature inventory mapping
   - Test architecture and runner invocation
   - 4-Tier test methodology:
     * Tier 1: Feature Coverage (>=5 test cases per feature across all 17 features = >=85 tests)
     * Tier 2: Boundary & Corner Cases (>=5 per feature where boundaries exist = >=85 tests)
     * Tier 3: Cross-Feature Combinations (pairwise interactions = >=17 tests)
     * Tier 4: Real-World Application Scenarios (>=9 application-level end-to-end scenarios)
3. Implement the test suite in `d:\uống nước\tests\e2e\` (using TypeScript and Vitest/Node test runner so it can run via `npm test` or a dedicated test script `npm run test:e2e`).
4. Publish `d:\uống nước\TEST_READY.md` at the project root summarizing the test suite, test runner command, and coverage checklist.
5. Write a self-contained `handoff.md` in your working directory and notify the orchestrator with send_message.

Boundaries:
- You own `TEST_INFRA.md`, `TEST_READY.md`, and all files in `tests/e2e/`.
- Do NOT modify production implementation files in `src/`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
