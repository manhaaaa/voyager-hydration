# BRIEFING — 2026-10-30T17:10:00Z

## Mission
Investigate and design technical specification for GitHub Actions CI workflow (.github/workflows/build-apk.yml) for Milestone 4.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: d:\uống nước\.agents\teamwork\explorer_m4_2\
- Original parent: 7c380586-cf2a-4df7-b89c-a4b667536d21
- Milestone: Milestone 4 - Capacitor Android & GitHub Actions CI

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Workflow file path: `.github/workflows/build-apk.yml`
- Triggers: push (main, master), workflow_dispatch
- Runner OS: ubuntu-latest
- Step sequence: checkout@v4, setup-node@v4 (node 20, npm cache), setup-java@v4 (temurin 21), npm ci, npm test, npm run build, npx cap sync android, chmod +x gradlew, assembleDebug, upload-artifact@v4

## Current Parent
- Conversation ID: 7c380586-cf2a-4df7-b89c-a4b667536d21
- Updated: 2026-10-30T17:10:00Z

## Investigation State
- **Explored paths**:
  - `d:\uống nước\.agents\teamwork\ORIGINAL_REQUEST.md` (§R5, §Verification)
  - `d:\uống nước\.agents\teamwork\PROJECT.md` (§Feature 17, §Code Layout)
  - `d:\uống nước\.agents\teamwork\sub_orch_m4\SCOPE.md`
  - `d:\uống nước\package.json` (build: `tsc && vite build`, test: `vitest run tests/unit`, test:e2e: `node --experimental-strip-types tests/e2e/runner.ts`)
  - `d:\uống nước\tests\e2e\tier1-features\f17_github_actions_ci.test.ts` (17.1 to 17.5)
  - `d:\uống nước\tests\e2e\tier2-boundaries\f17_ci_boundaries.test.ts` (17.6 to 17.10)
  - `d:\uống nước\tests\e2e\tier3-combinations\cross_feature_combinations.test.ts` (T3.17)
  - `d:\uống nước\tests\e2e\runner.ts` and `harness.ts`
- **Key findings**:
  - Tier 1 test 17.1 checks `fileExists('.github/workflows/build-apk.yml')`.
  - Tier 1 tests 17.2-17.5 check: `ubuntu-latest`, `node-version: 20`, `java-version: 21`, `assembleDebug`.
  - Tier 2 tests 17.6-17.10 check: `upload-artifact` with `app-debug.apk` or `outputs/apk`, `chmod +x` or `gradlew`, triggers on `push` to `main` or `master`, no leading tabs (spaces only), and `npm test` step before build and sync.
  - Windows checkout risk: `android/gradlew` with CRLF line endings will fail on Linux bash; fixed by `sed -i -e 's/\r$//' android/gradlew` and `.gitattributes`.
- **Unexplored areas**: None, workflow specification is complete and verified against all 10 F17 tests.

## Key Decisions Made
- Included `npm test` step in workflow to satisfy test 17.10.
- Included `pull_request` and `push` on both `main` and `master` branches plus `workflow_dispatch` to satisfy dispatch and test 17.8.
- Added both `sed -i` line-ending sanitizer and `chmod +x` to guard against Windows CRLF / permission issues.
- Configured `actions/upload-artifact@v4` with exact path `android/app/build/outputs/apk/debug/app-debug.apk` and `retention-days: 14`.

## Artifact Index
- `DISPATCH.md` — Received dispatch instructions
- `BRIEFING.md` — Persistent context & state tracking
- `progress.md` — Liveness and task progression
- `proposed_build-apk.yml` — Drop-in replacement for `.github/workflows/build-apk.yml`
- `proposed_gitattributes` — Recommended `.gitattributes` for LF line endings
- `handoff.md` — Comprehensive 5-component technical specification report
