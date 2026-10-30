## 2026-10-30T17:19:36Z
You are challenger_m4_2, a teamwork_challenger subagent for Milestone 4 ("Capacitor Android & GitHub Actions CI").
Your working directory is: d:\uống nước\.agents\teamwork\challenger_m4_2\

You MUST read the following authoritative files first:
1. `d:\uống nước\.agents\teamwork\ORIGINAL_REQUEST.md` (Authoritative user request)
2. `d:\uống nước\.agents\teamwork\PROJECT.md` (Architecture, Feature Inventory & Contracts)
3. `d:\uống nước\.agents\teamwork\sub_orch_m4\SCOPE.md` (Milestone 4 Scope)
4. Existing files: `.github/workflows/build-apk.yml`, `.gitattributes`, `android/gradlew`.

Your Task:
Perform code-executing empirical stress testing targeting the GitHub Actions CI workflow and cross-platform compatibility:
Create a dedicated test harness in `tests/unit/challengerM4Stress2.test.ts` to empirically verify:
1. YAML syntax and indentation: Parse `.github/workflows/build-apk.yml` with a YAML parser; verify it is valid YAML, has ZERO leading tab characters (`\t`) on every line, and specifies valid jobs/steps.
2. Step sequence validation: Verify that `npm test` is strictly invoked prior to `npm run build` and `npx cap sync android`.
3. Java & Node compatibility: Verify `node-version: 20` and `java-version: 21` with Temurin distribution.
4. Gradle assembly command: Verify step executes `./gradlew assembleDebug` (with `--no-daemon` and `--stacktrace`).
5. Artifact upload path: Verify `upload-artifact` path is strictly `android/app/build/outputs/apk/debug/app-debug.apk`.
6. Line endings check: Verify `android/gradlew` has LF line endings (`\n` only, no `\r\n`), and `.gitattributes` enforces `android/gradlew text eol=lf`.

Do NOT modify production source files.
Run your test harness with `npx vitest run tests/unit/challengerM4Stress2.test.ts`, run `npm test`, `npm run build`, and `npm run test:e2e`.
Determine your verdict: APPROVE or REJECT.
Write your full report to `d:\uống nước\.agents\teamwork\challenger_m4_2\handoff.md` and report to orchestrator via send_message.
