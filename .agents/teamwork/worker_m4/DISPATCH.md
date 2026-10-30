## 2026-10-30T17:12:13Z

[Message] timestamp=2026-10-30T17:12:13Z sender=7c380586-cf2a-4df7-b89c-a4b667536d21 priority=MESSAGE_PRIORITY_HIGH content=You are worker_m4, a teamwork_worker subagent assigned to implement Milestone 4 ("Capacitor Android & GitHub Actions CI") for "Voyager's Cosmic Hydration".
Your working directory is: d:\uống nước\.agents\teamwork\worker_m4\

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You MUST read the following authoritative files first before writing any code:
1. `d:\uống nước\.agents\teamwork\ORIGINAL_REQUEST.md` (Authoritative user request)
2. `d:\uống nước\.agents\teamwork\PROJECT.md` (Architecture, Feature Inventory & Contracts)
3. `d:\uống nước\.agents\teamwork\sub_orch_m4\SCOPE.md` (Milestone 4 Scope)
4. `d:\uống nước\.agents\teamwork\explorer_m4_1\handoff.md` (Android Platform & Manifest Spec)
5. `d:\uống nước\.agents\teamwork\explorer_m4_2\handoff.md` (GitHub Actions CI Spec)
6. `d:\uống nước\.agents\teamwork\explorer_m4_3\handoff.md` (E2E Verification & Asset Spec)

Your Tasks & Exclusive File Ownership:
Implement and verify genuine, production-ready code for:
1. Capacitor Android Scaffolding:
   - Run `npx cap add android` (or create the standard Capacitor 7 Android structure as detailed in `explorer_m4_1/handoff.md`).
2. AndroidManifest.xml:
   - Path: `android/app/src/main/AndroidManifest.xml`
   - Implement the complete XML with package `com.manh.voyagerhydration`, `android:usesCleartextTraffic="true"`, `uses-feature android:name="android.hardware.location.gps" android:required="false"`, and permissions:
     * `android.permission.INTERNET`
     * `android.permission.POST_NOTIFICATIONS`
     * `android.permission.ACCESS_FINE_LOCATION`
     * `android.permission.ACCESS_COARSE_LOCATION`
     * `android.permission.VIBRATE`
     * `android.permission.SCHEDULE_EXACT_ALARM`
   - Include MainActivity with `android.intent.action.MAIN` and `android.intent.category.LAUNCHER`.
3. Asset Integration:
   - Run `node .agents/teamwork/explorer_m4_3/copy_assets.cjs` (or populate `android/app/src/main/res/mipmap-*` and `drawable/splash.png` from `public/assets/character/voyager_base.png`).
4. Capacitor Sync:
   - Run `npx cap sync android` to ensure web assets in `dist/` and Capacitor plugins are fully registered.
5. GitHub Actions CI Workflow:
   - Create `.github/workflows/build-apk.yml` matching the exact specifications in `explorer_m4_2/handoff.md` (runner `ubuntu-latest`, `node-version: 20`, `java-version: 21` Temurin, `npm test`, `npm run build`, `npx cap sync android`, `chmod +x android/gradlew`, `./gradlew assembleDebug`, `actions/upload-artifact@v4` for `android/app/build/outputs/apk/debug/app-debug.apk`).
   - ZERO tab characters (`\t`) in YAML indentation!
   - Create `.gitattributes` to enforce `android/gradlew text eol=lf`.

Verification Requirements:
1. Run `npm test` and ensure all 293+ unit tests pass.
2. Run `npm run build` (`tsc && vite build`) and ensure clean exit code 0.
3. Run `npm run test:e2e` and verify that ALL 196/196 tests pass with 100% pass rate!
4. Document all implementation details, commands, and outputs in `d:\uống nước\.agents\teamwork\worker_m4\handoff.md`.
5. Notify parent orchestrator via `send_message`.
