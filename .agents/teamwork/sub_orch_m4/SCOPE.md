# Scope: Milestone 4 — Capacitor Android & GitHub Actions CI

## Objective
Set up the native Android platform configuration using Capacitor 7 (`android/` directory and permissions in `AndroidManifest.xml`) and establish the automated GitHub Actions CI build workflow (`.github/workflows/build-apk.yml`) to compile and package the release/debug APK.

## Deliverables
1. `capacitor.config.ts`:
   - `appId`: `com.manh.voyagerhydration`
   - `appName`: `Voyager Hydration`
   - `webDir`: `dist`
   - `androidScheme`: `https`
2. Android Project Configuration:
   - Android platform generation via `npx cap add android` and synchronization via `npx cap sync android`.
   - `android/app/src/main/AndroidManifest.xml` with required Android permissions:
     * `android.permission.POST_NOTIFICATIONS`
     * `android.permission.ACCESS_FINE_LOCATION`
     * `android.permission.ACCESS_COARSE_LOCATION`
     * `android.permission.INTERNET`
3. GitHub Actions CI Workflow:
   - `.github/workflows/build-apk.yml`:
     * Target runner: `ubuntu-latest`.
     * Node.js version 20 (`actions/setup-node@v4`).
     * Java JDK version 21 Temurin (`actions/setup-java@v4`).
     * Build web app (`npm run build`).
     * Capacitor sync (`npx cap sync android`).
     * Gradle assemble (`./gradlew assembleDebug`).
     * Artifact upload (`actions/upload-artifact@v4`).

## Dependencies
- Milestone 1 (Dependencies, Scaffolding)
- Milestone 2 (Assets, Engines)
- Milestone 3 (Web Build, UI)

## Completion Criteria
1. `android/app/src/main/AndroidManifest.xml` exists and declares all 4 permissions.
2. `.github/workflows/build-apk.yml` exists and declares runner `ubuntu-latest`, Node 20, Java 21, and `./gradlew assembleDebug`.
3. `npm run test:e2e` passes 196/196 tests (100% pass rate).
4. `npm test` passes all unit tests.
5. `npm run build` succeeds cleanly.
