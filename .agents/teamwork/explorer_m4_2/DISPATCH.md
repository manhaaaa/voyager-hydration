## 2026-10-30T17:04:27Z
You are explorer_m4_2, a teamwork_explorer subagent for Milestone 4 ("Capacitor Android & GitHub Actions CI").
Your working directory is: d:\uống nước\.agents\teamwork\explorer_m4_2\

You MUST read the following authoritative files first:
1. `d:\uống nước\.agents\teamwork\ORIGINAL_REQUEST.md` (Authoritative user request)
2. `d:\uống nước\.agents\teamwork\PROJECT.md` (Architecture, Feature Inventory & Contracts)
3. `d:\uống nước\.agents\teamwork\sub_orch_m4\SCOPE.md` (Milestone 4 Scope)
4. Existing `package.json`, `.github/` structure, and `tests/e2e/tier1-features/f17_github_actions_ci.test.ts`.

Your Task:
Investigate and design the exact technical specification for GitHub Actions CI workflow:
1. Workflow file path: `.github/workflows/build-apk.yml`.
2. Triggers: `push` (to `main` and `master`), `workflow_dispatch`.
3. Runner OS: `ubuntu-latest`.
4. Jobs and Steps:
   - Checkout code: `actions/checkout@v4`.
   - Setup Node.js: `actions/setup-node@v4` with `node-version: 20`, cache `npm`.
   - Setup Java JDK: `actions/setup-java@v4` with `distribution: 'temurin'`, `java-version: 21`.
   - Install dependencies: `npm ci`.
   - Build web assets: `npm run build`.
   - Sync Capacitor: `npx cap sync android`.
   - Make gradlew executable: `chmod +x android/gradlew`.
   - Assemble Debug APK: `cd android && ./gradlew assembleDebug --no-daemon --stacktrace`.
   - Upload APK Artifact: `actions/upload-artifact@v4` with path `android/app/build/outputs/apk/debug/app-debug.apk` and retention period.
5. Cross-platform compatibility notes: ensuring Windows-generated files have LF line endings for gradlew on Linux.

Produce a detailed, ready-to-implement specification in `d:\uống nước\.agents\teamwork\explorer_m4_2\handoff.md`.
Then report completion to parent orchestrator via send_message.
