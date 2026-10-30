# Milestone 4 Investigation & Verification Specification

**Author**: `explorer_m4_3`  
**Mission**: Milestone 4 ("Capacitor Android & GitHub Actions CI") Verification & Implementation Plan  
**Target Pass Rate**: 196/196 E2E tests (100% pass rate)

---

## 1. Observation

### 1.1 Current Test Suite Status
Executing `npm run test:e2e` yields **186/196 passed (10 failed)**:
```
📊 Tier-by-Tier Summary:
------------------------------------------------------------------------------
| Tier       | Total Tests  | Passed     | Failed     | Pass Rate    |
------------------------------------------------------------------------------
| Tier 1     | 85           | 75         | 10         | 88%          |
| Tier 2     | 85           | 85         | 0          | 100%         |
| Tier 3     | 17           | 17         | 0          | 100%         |
| Tier 4     | 9            | 9          | 0          | 100%         |
------------------------------------------------------------------------------

⚠️  Failures Detail (10 tests):
  [Tier 1] 16.1 - AndroidManifest.xml existence
    Error: AndroidManifest.xml must exist at android/app/src/main/AndroidManifest.xml per R5
  [Tier 1] 16.2 - Declares POST_NOTIFICATIONS
    Error: AndroidManifest.xml must be readable
  [Tier 1] 16.3 - Declares ACCESS_FINE_LOCATION
    Error: AndroidManifest.xml must be readable
  [Tier 1] 16.4 - Declares ACCESS_COARSE_LOCATION
    Error: AndroidManifest.xml must be readable
  [Tier 1] 16.5 - Declares INTERNET permission
    Error: AndroidManifest.xml must be readable
  [Tier 1] 17.1 - build-apk.yml exists
    Error: Workflow file must exist at .github/workflows/build-apk.yml per R5
  [Tier 1] 17.2 - Runner targets ubuntu-latest
    Error: build-apk.yml must be readable
  [Tier 1] 17.3 - Configures Node.js version 20
    Error: build-apk.yml must be readable
  [Tier 1] 17.4 - Configures Java JDK 21
    Error: build-apk.yml must be readable
  [Tier 1] 17.5 - Contains ./gradlew assembleDebug step
    Error: build-apk.yml must be readable

==============================================================================
🏁 Final Result: 186/196 passed (10 failed) in 47ms
==============================================================================
```

Unit test execution (`npm test`) yields **293/293 passed (100%)** across 13 test files.  
Web production build (`npm run build`) compiles cleanly in 5.75s (`dist/index.html`, `dist/assets/*`).

### 1.2 Test Harness (`tests/e2e/harness.ts`) Path & Read Operations
`harness.ts` inspects project files relative to `process.cwd()` using:
- `fileExists(relativeFilePath: string): boolean`: checks `fs.existsSync(path.resolve(PROJECT_ROOT, relativeFilePath))`
- `readProjectFile(relativeFilePath: string): string | null`: reads file UTF-8 content or returns `null` if missing.

### 1.3 Exact Assertions in Feature 16 (`f16_android_permissions.test.ts`)
- File path: `android/app/src/main/AndroidManifest.xml`
- **16.1**: `assert.ok(fileExists(manifestPath))`
- **16.2**: `assert.ok(content.includes('android.permission.POST_NOTIFICATIONS'))`
- **16.3**: `assert.ok(content.includes('android.permission.ACCESS_FINE_LOCATION'))`
- **16.4**: `assert.ok(content.includes('android.permission.ACCESS_COARSE_LOCATION'))`
- **16.5**: `assert.ok(content.includes('android.permission.INTERNET'))`

### 1.4 Exact Assertions in Feature 17 (`f17_github_actions_ci.test.ts`)
- File path: `.github/workflows/build-apk.yml`
- **17.1**: `assert.ok(fileExists(workflowPath))`
- **17.2**: `assert.ok(content.includes('ubuntu-latest'))`
- **17.3**: `assert.ok(content.includes('node-version: 20') || content.includes('node-version: "20"'))`
- **17.4**: `assert.ok(content.includes('java-version: 21') || content.includes('java-version: "21"'))`
- **17.5**: `assert.ok(content.includes('assembleDebug'))`

### 1.5 Latent Tier 2 Boundary Conditions
In `tests/e2e/tier2-boundaries/f16_permissions_boundaries.test.ts` and `f17_ci_boundaries.test.ts`, assertions are guarded with `if (content) { ... }`. When the files do not exist, `content === null` and the tests pass vacuously. As soon as the files are created, the following checks execute:
- **16.6**: `assert.ok(content.includes('android.permission.VIBRATE') || content.includes('android.permission.SCHEDULE_EXACT_ALARM'))`
- **16.7**: `assert.ok(content.includes('android.hardware.location') || content.includes('uses-feature'))`
- **16.8**: `assert.ok(content.includes('<manifest') && content.includes('</manifest>'))` and `assert.ok(content.includes('<application') && content.includes('</application>'))`
- **16.9**: `assert.ok(content.includes('com.manh.voyagerhydration'))`
- **16.10**: `assert.ok(content.includes('android.intent.action.MAIN'))` and `assert.ok(content.includes('android.intent.category.LAUNCHER'))`
- **17.6**: `assert.ok(content.includes('upload-artifact'))` and `assert.ok(content.includes('app-debug.apk') || content.includes('outputs/apk'))`
- **17.7**: `assert.ok(content.includes('chmod +x') || content.includes('gradlew'))`
- **17.8**: `assert.ok(content.includes('push') && (content.includes('main') || content.includes('master')))`
- **17.9**: `const linesWithTabs = content.split('\n').filter(l => l.startsWith('\t')); assert.strictEqual(linesWithTabs.length, 0)` (**ZERO tab characters allowed in YAML**)
- **17.10**: `assert.ok(content.includes('npm test') || content.includes('test'))`

### 1.6 Android Asset Resources
- Character asset source: `public/assets/character/voyager_base.png` (PNG format, 400,867 bytes).
- Android target locations:
  - App launcher icons: `android/app/src/main/res/mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/{ic_launcher,ic_launcher_round,ic_launcher_foreground}.png`
  - Splash screen: `android/app/src/main/res/drawable/splash.png` and `android/app/src/main/res/drawable-{port,land}-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/splash.png`

---

## 2. Logic Chain

1. **Root cause of 10 failures**:
   - `android/app/src/main/AndroidManifest.xml` does not exist on disk, causing failures in tests 16.1, 16.2, 16.3, 16.4, 16.5.
   - `.github/workflows/build-apk.yml` does not exist on disk, causing failures in tests 17.1, 17.2, 17.3, 17.4, 17.5.
2. **Preventing latent regressions in Tier 2**:
   - Creating minimalistic stub files satisfying only Tier 1 will cause Tier 2 boundary tests (16.6-16.10, 17.6-17.10) to execute and potentially fail.
   - Specifically:
     - `AndroidManifest.xml` must include package `com.manh.voyagerhydration`, `<manifest>` & `<application>` tags, `android.permission.VIBRATE`, `android.permission.SCHEDULE_EXACT_ALARM`, `<uses-feature android:name="android.hardware.location.gps" android:required="false" />`, and MainActivity with `action.MAIN` + `category.LAUNCHER`.
     - `build-apk.yml` must use spaces exclusively (no `\t`), include `upload-artifact` targeting `app-debug.apk` / `outputs/apk`, include `chmod +x` for gradlew, include triggers for `push` to `main`/`master`, and include `npm test` before building.
3. **Execution proof**:
   - The test script `.agents/teamwork/explorer_m4_3/verify_specs.cjs` was written and executed against the exact proposed content for both files.
   - Output confirmed: All F16 checks (16.2 to 16.10) passed, and all F17 checks (17.2 to 17.10) passed.
   - Once written to their respective paths, tests 16.1 and 17.1 pass immediately, raising passing tests from 186/196 to **196/196 (100%)**.

---

## 3. Caveats

- **Native Android SDK on Windows**: Local generation via `npx cap add android` creates the Android project files locally, but compiling an APK locally requires Android Studio/SDK and Gradle. The full APK binary build is offloaded to GitHub Actions CI (`ubuntu-latest` runner with Java 21) as designed in §R5.
- **Image Resizing vs Direct Copying**: Native image scaling libraries like `sharp` are not installed in the workspace dependencies. The asset integration utility `.agents/teamwork/explorer_m4_3/copy_assets.cjs` safely copies the 400KB base PNG into all mipmap and splash directories without external binary dependencies.

---

## 4. Conclusion & Ready-to-Implement Specification

### Specification 1: `android/app/src/main/AndroidManifest.xml`
File available at `.agents/teamwork/explorer_m4_3/proposed_AndroidManifest.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.manh.voyagerhydration">

    <!-- Permissions required for Voyager Hydration (Reverse: 1999) per R5 & M4 -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />

    <!-- Hardware Feature Compatibility: GPS optional for graceful desktop/tablet fallback -->
    <uses-feature android:name="android.hardware.location.gps" android:required="false" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode|navigation"
            android:name=".MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

        </activity>

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths"></meta-data>
        </provider>
    </application>

</manifest>
```

### Specification 2: `.github/workflows/build-apk.yml`
File available at `.agents/teamwork/explorer_m4_3/proposed_build-apk.yml`:
```yaml
name: Build Android APK

on:
  push:
    branches:
      - main
      - master
  pull_request:
    branches:
      - main
      - master
  workflow_dispatch:

jobs:
  build:
    name: Build & Package Android APK
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Set up Java JDK 21 (Temurin)
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: 21

      - name: Install dependencies
        run: npm ci

      - name: Run Unit Tests & Lint Check
        run: npm test

      - name: Build Web Application
        run: npm run build

      - name: Sync Capacitor Android Project
        run: npx cap sync android

      - name: Grant Execute Permission to Gradlew
        run: chmod +x ./android/gradlew

      - name: Build Android Debug APK with Gradle
        run: |
          cd android
          ./gradlew assembleDebug

      - name: Upload Debug APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: voyagers-hydration-debug-apk
          path: android/app/build/outputs/apk/debug/app-debug.apk
          if-no-files-found: error
```

### Specification 3: Asset Integration Script
Script available at `.agents/teamwork/explorer_m4_3/copy_assets.cjs`:
- Copies `public/assets/character/voyager_base.png` to all mipmap densities: `mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/{ic_launcher,ic_launcher_round,ic_launcher_foreground}.png`
- Copies `public/assets/character/voyager_base.png` to all drawable splash densities: `drawable/splash.png` and `drawable-{land,port}-*/splash.png`.

### Implementation Roadmap for Milestone 4 Implementer
1. Run `npx cap add android` (or create the Android directory structure).
2. Write `android/app/src/main/AndroidManifest.xml` from `proposed_AndroidManifest.xml`.
3. Create directory `.github/workflows/` and write `.github/workflows/build-apk.yml` from `proposed_build-apk.yml`.
4. Run `node .agents/teamwork/explorer_m4_3/copy_assets.cjs` to populate Android launcher icons and splash drawables.
5. Run `npx cap sync android` to ensure web assets in `dist/` are synchronized into the Android platform.
6. Run `npm run test:e2e` to achieve 196/196 passing tests (100%).

---

## 5. Verification Method

To independently verify this specification:
1. **Static assertion check**:
   ```powershell
   node .agents/teamwork/explorer_m4_3/verify_specs.cjs
   ```
   *Expected output*: `F16 checks (16.2 to 16.10): ALL PASSED!`, `F17 checks (17.2 to 17.10): ALL PASSED!`, `Simulated verification: 196/196 tests will PASS with 100% rate!`
2. **E2E verification** (after implementing files):
   ```powershell
   npm run test:e2e
   ```
   *Expected output*:
   - `Final Result: 196/196 passed (0 failed)`
   - `Tier 1: 85/85 (100%)`
   - `Tier 2: 85/85 (100%)`
   - `Tier 3: 17/17 (100%)`
   - `Tier 4: 9/9 (100%)`
3. **Unit test verification**:
   ```powershell
   npm test
   ```
   *Expected output*: `13 passed (13)`, `293 passed (293)`.
4. **Build verification**:
   ```powershell
   npm run build
   ```
   *Expected output*: Clean exit with code 0.
