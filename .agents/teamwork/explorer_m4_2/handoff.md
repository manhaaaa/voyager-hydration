# Handoff Report: GitHub Actions CI Workflow Technical Specification

**Author**: `explorer_m4_2`  
**Milestone**: Milestone 4 — Capacitor Android & GitHub Actions CI  
**Target File**: `.github/workflows/build-apk.yml`  
**Reference Artifacts**:
- `d:\uống nước\.agents\teamwork\explorer_m4_2\proposed_build-apk.yml`
- `d:\uống nước\.agents\teamwork\explorer_m4_2\proposed_gitattributes`

---

## 1. Observation

### 1.1 Requirements & Authoritative Specifications
- **ORIGINAL_REQUEST.md (§R5, Lines 66-67)**:
  > "Tạo file `.github/workflows/build-apk.yml` sử dụng Node 20 và Java 21 để tự động build React, đồng bộ Capacitor Android, và chạy `./gradlew assembleDebug` để xuất file `.apk` lên GitHub Artifacts."
- **ORIGINAL_REQUEST.md (§Acceptance Criteria, Line 74)**:
  > "- [ ] File `.github/workflows/build-apk.yml` tồn tại, cú pháp YAML hợp lệ, cấu hình đúng môi trường Node 20, Java 21 và bước build `./gradlew assembleDebug`."
- **PROJECT.md (§Feature 17, Line 32)**:
  > "GitHub Actions CI APK Build: `.github/workflows/build-apk.yml` with Node 20, Java 21, Vite build, Capacitor sync, `./gradlew assembleDebug`, upload artifact"
- **PROJECT.md (§Code Layout, Lines 100-102)**:
  > ```
  > d:/uống nước/
  > ├── .github/
  > │   └── workflows/
  > │       └── build-apk.yml
  > ```
- **sub_orch_m4/SCOPE.md (Lines 20-27)**:
  > "GitHub Actions CI Workflow:
  > - `.github/workflows/build-apk.yml`:
  >   * Target runner: `ubuntu-latest`.
  >   * Node.js version 20 (`actions/setup-node@v4`).
  >   * Java JDK version 21 Temurin (`actions/setup-java@v4`).
  >   * Build web app (`npm run build`).
  >   * Capacitor sync (`npx cap sync android`).
  >   * Gradle assemble (`./gradlew assembleDebug`).
  >   * Artifact upload (`actions/upload-artifact@v4`)."

### 1.2 Test Harness Assertions for Feature 17
Inspection of the test suite revealed 10 concrete automated checks across Tier 1, Tier 2, and Tier 3:

1. **`tests/e2e/tier1-features/f17_github_actions_ci.test.ts`**:
   - **Line 11 (Test 17.1)**: `assert.ok(fileExists(workflowPath))` where `workflowPath = '.github/workflows/build-apk.yml'`.
   - **Line 19 (Test 17.2)**: `assert.ok(content.includes('ubuntu-latest'))`.
   - **Line 27 (Test 17.3)**: `assert.ok(content.includes('node-version: 20') || content.includes('node-version: "20"'))`.
   - **Line 36 (Test 17.4)**: `assert.ok(content.includes('java-version: 21') || content.includes('java-version: "21"'))`.
   - **Line 45 (Test 17.5)**: `assert.ok(content.includes('assembleDebug'))`.

2. **`tests/e2e/tier2-boundaries/f17_ci_boundaries.test.ts`**:
   - **Lines 13-15 (Test 17.6)**: `assert.ok(content.includes('upload-artifact'))` AND `assert.ok(content.includes('app-debug.apk') || content.includes('outputs/apk'))`.
   - **Lines 24-25 (Test 17.7)**: `assert.ok(content.includes('chmod +x') || content.includes('gradlew'))`.
   - **Lines 34-35 (Test 17.8)**: `assert.ok(content.includes('push') && (content.includes('main') || content.includes('master')))`.
   - **Lines 45-46 (Test 17.9)**: YAML indentation check: `content.split('\n').filter(l => l.startsWith('\t')).length === 0` (strictly disallows tab characters `\t`).
   - **Lines 55-56 (Test 17.10)**: `assert.ok(content.includes('npm test') || content.includes('test'))` (requires a test execution step prior to building the bundle).

3. **`tests/e2e/tier3-combinations/cross_feature_combinations.test.ts`**:
   - **Lines 303-319 (Test T3.17)**: Requires pipeline configuration alignment:
     - `ciBuildCommand: './gradlew assembleDebug'`
     - `runnerJavaVersion: 21`
     - `runnerNodeVersion: 20`

### 1.3 Current Workspace Baseline
- Executing `npm run test:e2e` currently reports **186/196 passed**, with exactly 10 failures:
  - 5 failures from missing `android/app/src/main/AndroidManifest.xml` (Feature 16).
  - 5 failures from missing `.github/workflows/build-apk.yml` (Feature 17: tests 17.1 to 17.5).
- Executing `npm test` runs 13 test suites and passes **293/293 unit tests** cleanly.
- Executing `npm run build` (`tsc && vite build`) succeeds cleanly in 11.10s without TypeScript errors.

---

## 2. Logic Chain

### Step 2.1: Workflow File Location & Triggers
- **Premise**: Per R5, PROJECT.md, and test 17.1, the workflow must be placed at `.github/workflows/build-apk.yml`.
- **Triggers**: Per test 17.8 and dispatch instructions, the pipeline must trigger on:
  - `push` to `main` and `master`.
  - `pull_request` to `main` and `master`.
  - `workflow_dispatch` (allowing manual invocation from GitHub UI).

### Step 2.2: Virtual Environment & Toolchains
- **Runner**: Per test 17.2, `runs-on: ubuntu-latest`.
- **Node.js**: Per test 17.3, uses `actions/setup-node@v4` with `node-version: 20` and `cache: 'npm'`. This matches the Node version specified in R5 and speeds up CI runs.
- **Java JDK**: Per test 17.4, uses `actions/setup-java@v4` with `distribution: 'temurin'`, `java-version: 21`, and `cache: 'gradle'`. Capacitor 7 Android requires Java 17 or 21. Eclipse Temurin is the industry-standard distribution for GitHub Actions.

### Step 2.3: Build Sequence & Pipeline Steps
1. `actions/checkout@v4`: Clones the repository.
2. `actions/setup-node@v4`: Prepares Node.js 20 environment.
3. `actions/setup-java@v4`: Prepares Java 21 JDK and Gradle cache.
4. `npm ci`: Clean install using existing `package-lock.json`.
5. `npm test`: Runs Vitest unit test suite. Required by test 17.10 ("Pipeline includes test run step (npm test) prior to build and sync").
6. `npm run build`: Executes `tsc && vite build`, creating the `dist/` directory.
7. `npx cap sync android`: Copies `dist/` into `android/app/src/main/assets/public/` and synchronizes Capacitor plugins into Gradle.
8. `chmod +x android/gradlew`: Ensures execution permissions for Gradle wrapper on Linux.
9. `cd android && ./gradlew assembleDebug --no-daemon --stacktrace`: Compiles the debug APK.
10. `actions/upload-artifact@v4`: Uploads `android/app/build/outputs/apk/debug/app-debug.apk` with `retention-days: 14`. Satisfies test 17.6.

### Step 2.4: Cross-Platform Compatibility (Windows vs. Ubuntu Runner)
- **CRLF vs. LF Line Endings**:
  On Windows, files checked out or committed may have `\r\n` (CRLF) endings. If `android/gradlew` has CRLF endings on Ubuntu, bash will fail with `/bin/bash^M: bad interpreter: No such file or directory`.
  To prevent this, two safeguards are designed:
  1. A `.gitattributes` rule enforcing `android/gradlew text eol=lf`.
  2. An in-line normalization command before execution: `sed -i -e 's/\r$//' android/gradlew`.
- **Posix File Permissions**:
  Windows filesystems do not store the POSIX executable bit (`+x`). Even if git tracks permissions, commits from Windows often default to mode `100644`. Step 8 (`chmod +x android/gradlew`) guarantees executable permission on the runner.
- **YAML Tab Prohibition**:
  Per test 17.9, YAML indentation must use two spaces (`  `), strictly zero tabs (`\t`).

---

## 3. Caveats

1. **Gradle Build Dependency**:
   The workflow expects the `android/` directory to exist in the repository (generated by `npx cap add android` and maintained in source control). This is being handled in Milestone 4 by subagents `explorer_m4_1` and `worker_m4`.
2. **Android Keystore for Release**:
   This workflow specifies `./gradlew assembleDebug` and packages `app-debug.apk` as explicitly required by R5 and E2E tests. Release signing (`assembleRelease` with signing keystore secrets) is out of scope for Milestone 4 debug verification.
3. **Artifact Retention**:
   `retention-days: 14` is recommended to prevent exceeding GitHub storage quotas while allowing adequate time to download and test build artifacts.

---

## 4. Conclusion & Specification

### 4.1 Complete YAML Specification
Create `.github/workflows/build-apk.yml` with the following content (also saved at `d:\uống nước\.agents\teamwork\explorer_m4_2\proposed_build-apk.yml`):

```yaml
name: Build Android Debug APK

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
    name: Build Android Debug APK
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
          cache: 'gradle'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test

      - name: Build web application
        run: npm run build

      - name: Sync Capacitor Android platform
        run: npx cap sync android

      - name: Make gradlew executable
        run: |
          sed -i -e 's/\r$//' android/gradlew
          chmod +x android/gradlew

      - name: Assemble Debug APK
        run: cd android && ./gradlew assembleDebug --no-daemon --stacktrace

      - name: Upload Debug APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: app-debug-apk
          path: android/app/build/outputs/apk/debug/app-debug.apk
          retention-days: 14
```

### 4.2 `.gitattributes` Specification
Create `.gitattributes` in repository root with the following content (also saved at `d:\uống nước\.agents\teamwork\explorer_m4_2\proposed_gitattributes`):

```gitattributes
# Auto detect text files and perform LF normalization
* text=auto

# Ensure gradlew and shell scripts always have LF endings across Windows and Linux
android/gradlew text eol=lf
*.sh text eol=lf
```

### 4.3 Requirement Traceability Matrix

| Requirement / Test | Specification Detail | Passed by Proposed Content |
|---|---|---|
| R5 / Test 17.1 | File exists at `.github/workflows/build-apk.yml` | ✅ Yes |
| R5 / Test 17.2 | `runs-on: ubuntu-latest` | ✅ Yes |
| R5 / Test 17.3 | `node-version: 20` | ✅ Yes |
| R5 / Test 17.4 | `java-version: 21` (Temurin) | ✅ Yes |
| R5 / Test 17.5 | `./gradlew assembleDebug` command | ✅ Yes |
| Test 17.6 | `actions/upload-artifact` targeting `app-debug.apk` | ✅ Yes |
| Test 17.7 | `chmod +x android/gradlew` | ✅ Yes |
| Test 17.8 | Triggers on `push` to `main` and `master` | ✅ Yes |
| Test 17.9 | Zero tab characters for indentation (strict 2-space) | ✅ Yes |
| Test 17.10 | Step executing `npm test` prior to build and sync | ✅ Yes |
| Test T3.17 | Alignment of config, permissions, and CI pipeline | ✅ Yes |

---

## 5. Verification Method

### 5.1 Independent Verification Commands
Once the implementer writes `.github/workflows/build-apk.yml`:

1. **Verify E2E Tests for Feature 17**:
   ```bash
   node --experimental-strip-types tests/e2e/runner.ts
   ```
   **Expected**: Tests 17.1 through 17.5 in Tier 1 and tests 17.6 through 17.10 in Tier 2 will pass.

2. **Verify YAML Syntax & No Tabs**:
   Run via PowerShell:
   ```powershell
   Get-Content .github/workflows/build-apk.yml | Where-Object { $_ -match "^\t" }
   ```
   **Expected**: Empty output (0 lines starting with tab).

3. **Verify String Matches**:
   ```powershell
   Select-String -Path .github/workflows/build-apk.yml -Pattern "ubuntu-latest", "node-version: 20", "java-version: 21", "assembleDebug", "upload-artifact", "chmod \+x", "npm test"
   ```
   **Expected**: Matches found for all required tokens.

### 5.2 Invalidation Conditions
- Any occurrence of literal tab `\t` character at the beginning of any line in `.github/workflows/build-apk.yml`.
- Omission of the `npm test` step before `npm run build` (will fail Tier 2 boundary test 17.10).
- Altering the artifact upload path away from `android/app/build/outputs/apk/debug/app-debug.apk` (will fail Tier 2 boundary test 17.6).
