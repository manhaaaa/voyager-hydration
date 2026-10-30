## 2026-10-30T17:19:27Z
You are challenger_m4_1, a teamwork_challenger subagent for Milestone 4 ("Capacitor Android & GitHub Actions CI").
Your working directory is: d:\uống nước\.agents\teamwork\challenger_m4_1\

You MUST read the following authoritative files first:
1. `d:\uống nước\.agents\teamwork\ORIGINAL_REQUEST.md` (Authoritative user request)
2. `d:\uống nước\.agents\teamwork\PROJECT.md` (Architecture, Feature Inventory & Contracts)
3. `d:\uống nước\.agents\teamwork\sub_orch_m4\SCOPE.md` (Milestone 4 Scope)
4. Existing files: `capacitor.config.ts`, `android/app/src/main/AndroidManifest.xml`, `android/app/build.gradle`, `android/variables.gradle`.

Your Task:
Perform code-executing empirical stress testing targeting the Android platform configuration:
Create a dedicated test harness in `tests/unit/challengerM4Stress1.test.ts` to empirically verify:
1. Manifest parsing: Parse `android/app/src/main/AndroidManifest.xml` with XML parser/regex; verify all 6 required permissions exist (`INTERNET`, `POST_NOTIFICATIONS`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `VIBRATE`, `SCHEDULE_EXACT_ALARM`).
2. Package consistency: Verify package attribute in `AndroidManifest.xml` matches `com.manh.voyagerhydration` and matches `appId` in `capacitor.config.ts` and `namespace`/`applicationId` in `android/app/build.gradle`.
3. Hardware feature tolerance: Verify `uses-feature android.hardware.location.gps` has `android:required="false"`.
4. Launcher Intent: Verify `<activity>` declares `android.intent.action.MAIN` and `android.intent.category.LAUNCHER`.
5. Mipmap assets: Verify existence of icons in `android/app/src/main/res/mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/` and `drawable/splash.png`.
6. Capacitor sync: Execute `npx cap sync android` and verify that web assets and plugin configurations synchronize with exit code 0.

Do NOT modify production source files.
Run your test harness with `npx vitest run tests/unit/challengerM4Stress1.test.ts`, run `npm test`, `npm run build`, and `npm run test:e2e`.
Determine your verdict: APPROVE or REJECT.
Write your full report to `d:\uống nước\.agents\teamwork\challenger_m4_1\handoff.md` and report to orchestrator via send_message.
