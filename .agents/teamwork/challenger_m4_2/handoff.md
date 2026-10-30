# Milestone 4 Empirical Challenge Report (challenger_m4_2)

## 1. Observation

- **Target Files Inspected**:
  * `.github/workflows/build-apk.yml`: 62 lines, 1354 bytes.
  * `.gitattributes`: 7 lines, 195 bytes.
  * `android/gradlew`: 253 lines, 8762 bytes.
  * `tests/unit/challengerM4Stress2.test.ts`: 320 lines, 20 test cases.

- **Direct Empirical Observations**:
  1. **Tab & Indentation Check (`.github/workflows/build-apk.yml`)**:
     * Verified line-by-line across all 62 lines.
     * Zero occurrences of `\t` detected: `lines.filter(l => l.includes('\t')).length === 0`.
     * YAML indentation adheres strictly to 2-space intervals.
  2. **YAML Parse Integrity**:
     * Built-in zero-dependency workflow YAML parser parsed the workflow file into a structured AST without exceptions.
     * Python 3.11 PyYAML (`yaml.safe_load`) parsed `.github/workflows/build-apk.yml` cleanly, matching workflow `name: "Build Android Debug APK"` and `jobs.build`.
  3. **Step Sequence Invariant**:
     * Line 36-37: Step "Install dependencies" runs `npm ci` (Step index 3).
     * Line 39-40: Step "Run unit tests" runs `npm test` (Step index 4).
     * Line 42-43: Step "Build web application" runs `npm run build` (Step index 5).
     * Line 45-46: Step "Sync Capacitor Android platform" runs `npx cap sync android` (Step index 6).
     * Line 48-51: Step "Make gradlew executable" runs `sed -i -e 's/\r$//' android/gradlew` & `chmod +x android/gradlew` (Step index 7).
     * Line 53-54: Step "Assemble Debug APK" runs `cd android && ./gradlew assembleDebug --no-daemon --stacktrace` (Step index 8).
     * Line 56-61: Step "Upload Debug APK Artifact" uses `actions/upload-artifact@v4` (Step index 9).
     * Sequence assertion verified: `npm ci` < `npm test` < `npm run build` < `npx cap sync android` < `./gradlew assembleDebug` < `upload-artifact`.
  4. **Toolchain Compatibility**:
     * Line 23-28: `actions/setup-node@v4` with `node-version: 20` and `cache: 'npm'`.
     * Line 29-35: `actions/setup-java@v4` with `distribution: 'temurin'`, `java-version: 21`, and `cache: 'gradle'`.
  5. **Gradle Assembly Command & Flags**:
     * Line 54: `run: cd android && ./gradlew assembleDebug --no-daemon --stacktrace`.
     * Flags `--no-daemon` and `--stacktrace` are present verbatim.
  6. **Artifact Upload Configuration**:
     * Line 59-61: `name: app-debug-apk`, `path: android/app/build/outputs/apk/debug/app-debug.apk`, `retention-days: 14`.
  7. **Cross-Platform Line Endings**:
     * Binary buffer examination of `android/gradlew`:
       - `gradlewBuf.includes(Buffer.from('\r\n')) === false` (0 CRLF occurrences).
       - `gradlewBuf.includes(Buffer.from('\n')) === true` (100% POSIX LF line endings).
       - First bytes: `#!/bin/sh`.
     * `.gitattributes` inspection:
       - Line 5: `android/gradlew text eol=lf`.
       - Line 6: `*.sh text eol=lf`.
       - Line 2: `* text=auto`.

- **Test Execution Outputs**:
  * `npx vitest run tests/unit/challengerM4Stress2.test.ts`:
    ```
    ✓ tests/unit/challengerM4Stress2.test.ts (20 tests) 710ms
    Test Files  1 passed (1)
    Tests       20 passed (20)
    ```
  * `npm test`:
    ```
    Test Files  15 passed (15)
    Tests       334 passed (334)
    Duration    34.55s
    ```
  * `npm run build`:
    ```
    ✓ 1613 modules transformed.
    dist/index.html                   0.84 kB │ gzip:  0.45 kB
    dist/assets/index-C6wtZAg2.css   43.34 kB │ gzip:  7.30 kB
    dist/assets/web-C_iMKAe0.js       0.90 kB │ gzip:  0.47 kB
    dist/assets/web-CrV1NDC2.js       1.25 kB │ gzip:  0.59 kB
    dist/assets/web-m07_wGpv.js       3.44 kB │ gzip:  1.10 kB
    dist/assets/index-CE94FOdX.js   275.70 kB │ gzip: 83.23 kB
    ✓ built in 7.42s
    ```
  * `npm run test:e2e`:
    ```
    ==============================================================================
    🏁 Final Result: 196/196 passed (0 failed) in 86ms
    ==============================================================================
    ```

## 2. Logic Chain

1. **YAML Validity & Tab Prohibition**:
   - Observation 1 & 2 confirm `.github/workflows/build-apk.yml` contains zero tabs and conforms to standard YAML grammar, verified independently by both the custom zero-dependency parser and Python's PyYAML library.
   - Adversarial negative tests confirmed that tab injection or missing colon triggers parsing errors as expected.

2. **Strict Step Ordering**:
   - In CI pipelines, running `npm run build` or `npx cap sync android` before running `npm test` can mask defects and waste compute resources on broken builds.
   - Observation 3 confirms that `npm test` precedes `npm run build` and `npx cap sync android`, guaranteeing that no broken code is compiled into web assets or synced into native Android project files.
   - Observation 3 also proves that `npm run build` compiles `dist/` before `npx cap sync android` copies it, preventing stale asset packaging.

3. **Toolchain Compatibility**:
   - Capacitor 7 and Android Gradle Plugin 8.x require JDK 21 and Node 20+.
   - Observation 4 confirms `actions/setup-node@v4` targets Node 20 with `npm` caching, and `actions/setup-java@v4` targets Temurin JDK 21 with `gradle` caching.

4. **CI-Ready Gradle Flags & Line-Ending Defenses**:
   - In non-interactive CI environments, Gradle daemons can cause leaked processes or flaky memory states. `--no-daemon` prevents orphaned background daemons, while `--stacktrace` ensures failure diagnostics are captured in CI logs.
   - On Windows environments, cloning or committing `android/gradlew` with CRLF line endings causes `/bin/sh^M: bad interpreter` failure on Linux (`ubuntu-latest`) runners.
   - Observation 3, 6, and 7 confirm a 3-layer defense against CRLF corruption:
     a) `android/gradlew` file itself is strictly LF formatted.
     b) `.gitattributes` enforces `android/gradlew text eol=lf`.
     c) The CI workflow explicitly runs `sed -i -e 's/\r$//' android/gradlew` and `chmod +x` before invoking Gradle.

5. **Artifact Packaging Path**:
   - Observation 6 confirms the uploaded artifact path is exactly `android/app/build/outputs/apk/debug/app-debug.apk` under `actions/upload-artifact@v4`.

6. **Regression & Build Integrity**:
   - Executing `npx vitest run tests/unit/challengerM4Stress2.test.ts` verified all 20 adversarial and invariant tests passed.
   - Executing `npm test` verified all 334 unit tests pass cleanly.
   - Executing `npm run build` verified TypeScript typechecking and Vite production asset bundling succeed with 0 errors.
   - Executing `npm run test:e2e` verified all 196 E2E tests pass across all 4 tiers (100% pass rate).

## 3. Caveats

- Live execution on GitHub's hosted runners (`ubuntu-latest`) requires pushing to a remote GitHub repository; this environment verified local syntax, parsing, file permissions, and build commands within Windows/Node.js/Vitest, while simulating the exact CI steps (`npm test`, `npm run build`, `npx cap sync android`).
- No modifications were made to any production source code in `src/` or `android/`.

## 4. Conclusion

**Verdict: APPROVE**

Milestone 4 deliverables regarding GitHub Actions CI (`.github/workflows/build-apk.yml`), cross-platform line ending configurations (`.gitattributes`, `android/gradlew`), step sequencing, and artifact packaging are fully compliant with `PROJECT.md`, `SCOPE.md`, and `ORIGINAL_REQUEST.md`. All empirical tests, unit tests, production builds, and E2E suites pass with 100% success.

## 5. Verification Method

To independently verify these findings:

1. **Run the dedicated empirical challenge test harness**:
   ```powershell
   npx vitest run tests/unit/challengerM4Stress2.test.ts
   ```
   *Expected output*: 20 tests pass.

2. **Run full unit test suite**:
   ```powershell
   npm test
   ```
   *Expected output*: 15 test suites pass, 334 tests pass.

3. **Run production web build**:
   ```powershell
   npm run build
   ```
   *Expected output*: Exit code 0, `dist/` directory generated.

4. **Run end-to-end test suite**:
   ```powershell
   npm run test:e2e
   ```
   *Expected output*: 196/196 tests pass across Tiers 1-4.

5. **Direct Line Endings Verification**:
   ```powershell
   node -e "const buf = require('fs').readFileSync('android/gradlew'); console.log('CRLF:', buf.includes(Buffer.from('\r\n')), 'LF:', buf.includes(Buffer.from('\n')))"
   ```
   *Expected output*: `CRLF: false LF: true`.
