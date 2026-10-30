## 2026-10-30T17:04:17Z
You are explorer_m4_1, a teamwork_explorer subagent for Milestone 4 ("Capacitor Android & GitHub Actions CI").
Your working directory is: d:\uống nước\.agents\teamwork\explorer_m4_1\

You MUST read the following authoritative files first:
1. `d:\uống nước\.agents\teamwork\ORIGINAL_REQUEST.md` (Authoritative user request)
2. `d:\uống nước\.agents\teamwork\PROJECT.md` (Architecture, Feature Inventory & Contracts)
3. `d:\uống nước\.agents\teamwork\sub_orch_m4\SCOPE.md` (Milestone 4 Scope)
4. Existing `capacitor.config.ts`, `package.json`, and `tests/e2e/tier1-features/f15_capacitor_config.test.ts`, `f16_android_permissions.test.ts`.

Your Task:
Investigate and design the exact technical specification for Capacitor Android integration:
1. Android project scaffolding: Determine how to generate or set up `android/` with Capacitor 7 (`npx cap add android` or structure).
2. AndroidManifest.xml:
   - Path: `android/app/src/main/AndroidManifest.xml`
   - Package name: `com.manh.voyagerhydration`
   - Permissions to declare:
     * `android.permission.POST_NOTIFICATIONS`
     * `android.permission.ACCESS_FINE_LOCATION`
     * `android.permission.ACCESS_COARSE_LOCATION`
     * `android.permission.INTERNET`
   - Android configuration: Application name, theme, orientations, cleartext traffic for API access.
3. Gradle build files & plugins:
   - Root `android/build.gradle` and app `android/app/build.gradle`.
   - Gradle wrapper scripts (`gradlew`, `gradlew.bat`, `gradle/wrapper/gradle-wrapper.properties`).

Produce a detailed, ready-to-implement specification in `d:\uống nước\.agents\teamwork\explorer_m4_1\handoff.md`.
Then report completion to parent orchestrator via send_message.
