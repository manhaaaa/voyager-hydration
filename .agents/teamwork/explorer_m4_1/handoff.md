# Handoff Report: Technical Specification for Capacitor Android Integration

## 1. Observation

### Codebase State & Existing Files
1. **Capacitor Configuration (`capacitor.config.ts:1-21`)**:
   - `appId`: `'com.manh.voyagerhydration'`
   - `appName`: `'Voyager Hydration'`
   - `webDir`: `'dist'`
   - `server`: `{ androidScheme: 'https', cleartext: true }`
   - `plugins`: `LocalNotifications` with `iconColor: '#38BDF8'` and `sound: 'beep.wav'`.
2. **Installed Packages (`package.json:14-26`)**:
   - `@capacitor/android`: `^7.0.0`
   - `@capacitor/cli`: `^7.0.0` (CLI version: `7.6.10`)
   - `@capacitor/core`: `^7.0.0`
   - `@capacitor/filesystem`: `^7.0.0`
   - `@capacitor/geolocation`: `^7.0.0`
   - `@capacitor/local-notifications`: `^7.0.0`
   - `@capacitor/preferences`: `^7.0.0`
3. **Template Archive (`node_modules/@capacitor/cli/assets/android-template.tar.gz`)**:
   - Contains complete standard Android Gradle 8.11.1 + AGP 8.7.2 + Android SDK 35 project template.
   - Contains `gradlew`, `gradlew.bat`, `gradle/wrapper/gradle-wrapper.jar`, `gradle/wrapper/gradle-wrapper.properties`.
4. **Current E2E Test Suite Status (`npm run test:e2e`)**:
   - **Passed**: 186/196 tests (100% of Tier 2, Tier 3, Tier 4; 75/85 of Tier 1).
   - **Failed**: 10 tests, strictly composed of:
     * 5 tests in Tier 1 Feature 16 (`f16_android_permissions.test.ts`):
       - `16.1`: `AndroidManifest.xml` existence at `android/app/src/main/AndroidManifest.xml`
       - `16.2`: Declares `android.permission.POST_NOTIFICATIONS`
       - `16.3`: Declares `android.permission.ACCESS_FINE_LOCATION`
       - `16.4`: Declares `android.permission.ACCESS_COARSE_LOCATION`
       - `16.5`: Declares `android.permission.INTERNET`
     * 5 tests in Tier 1 Feature 17 (`f17_github_actions_ci.test.ts`):
       - Handled in parallel by CI subagent `implementer_m4_2`.
5. **Boundary Test Invariants (`f16_permissions_boundaries.test.ts:9-63`)**:
   - `16.6`: Requires `android.permission.VIBRATE` or `android.permission.SCHEDULE_EXACT_ALARM`
   - `16.7`: Requires `uses-feature` declaration for `android.hardware.location.gps` with `required="false"`
   - `16.8`: Requires valid XML `<manifest>` and `<application>` tags
   - `16.9`: Requires package attribute matching `com.manh.voyagerhydration`
   - `16.10`: Requires Main Activity with `android.intent.action.MAIN` and `android.intent.category.LAUNCHER`
6. **Capacitor CLI Automation Mechanics (`node_modules/@capacitor/cli/dist/android/common.js:54-94`)**:
   - `editProjectSettingsAndroid` modifies `MainActivity.java` package, `app/build.gradle` namespace and applicationId, and `strings.xml`.
   - It does **not** inject custom permissions or attributes into `AndroidManifest.xml`.
   - Therefore, `android/app/src/main/AndroidManifest.xml` must be explicitly authored with the full set of permissions and configuration.

---

## 2. Logic Chain

1. **Scaffolding Strategy**:
   - Running `npx cap add android` extracts `android-template.tar.gz` and binds project metadata (`appId` `com.manh.voyagerhydration`, `appName` `Voyager Hydration`).
   - Running `npm run build` beforehand guarantees that `dist/` is present, allowing `cap add` to immediately synchronize web assets into `android/app/src/main/assets/public`.
   - Subsequent `npx cap sync android` registers installed Capacitor plugins (`filesystem`, `geolocation`, `local-notifications`, `preferences`) into `capacitor.settings.gradle`, `app/capacitor.build.gradle`, and `capacitor.plugins.json`.

2. **AndroidManifest.xml Requirements**:
   - From Tier 1 (`f16_android_permissions.test.ts:15-49`): Must declare `POST_NOTIFICATIONS`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, and `INTERNET`.
   - From Tier 2 (`f16_permissions_boundaries.test.ts:9-49`): Must declare `VIBRATE`, `SCHEDULE_EXACT_ALARM`, and optional `android.hardware.location.gps` with `android:required="false"`.
   - From User Dispatch: Must specify `package="com.manh.voyagerhydration"`, application theme (`@style/AppTheme`), orientation config changes, and `android:usesCleartextTraffic="true"` to support unencrypted HTTP weather fallback or local dev API access.

3. **Gradle Build Files & Wrapper Configuration**:
   - Capacitor 7 uses Gradle 8.11.1 (`gradle/wrapper/gradle-wrapper.properties`) and Android Gradle Plugin 8.7.2 (`build.gradle`).
   - App `build.gradle` requires `namespace "com.manh.voyagerhydration"` and `applicationId "com.manh.voyagerhydration"`.
   - On Linux/GitHub Actions runner (`ubuntu-latest`), `gradlew` must have Unix LF line endings to avoid `\r: command not found`.

---

## 3. Caveats

1. **Local Android SDK on Windows**:
   - The developer machine is running Windows and does not have the Android SDK or `ANDROID_HOME` configured in environment variables.
   - Running `./gradlew` locally on Windows will report missing Android SDK; this is expected and documented in Capacitor docs ("Unable to infer default Android SDK settings. This is fine"). Full APK compilation is offloaded to GitHub Actions CI (`ubuntu-latest` with Android SDK pre-installed).
2. **Capacitor Auto-Sync Overwrites**:
   - `capacitor.settings.gradle` and `app/capacitor.build.gradle` are auto-generated by Capacitor CLI during `npx cap sync android`. Do not manually edit these generated files; edit `capacitor.config.ts`, `settings.gradle`, or `app/build.gradle` instead.

---

## 4. Conclusion & Technical Specification

### A. Execution Steps for Implementer

1. **Step 1: Ensure Web Build**:
   ```powershell
   npm run build
   ```
2. **Step 2: Initialize Android Platform**:
   ```powershell
   npx cap add android
   ```
3. **Step 3: Update `android/app/src/main/AndroidManifest.xml`**:
   Write the complete authoritative manifest detailed in Section B below.
4. **Step 4: Normalize Gradle Wrapper Line Endings**:
   Ensure `android/gradlew` has LF line endings (`\n`).
5. **Step 5: Synchronize Capacitor Plugins**:
   ```powershell
   npx cap sync android
   ```

---

### B. Complete File Specifications

#### 1. `android/app/src/main/AndroidManifest.xml`
```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.manh.voyagerhydration">

    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />

    <!-- Optional Hardware Features -->
    <uses-feature
        android:name="android.hardware.location.gps"
        android:required="false" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">

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
                android:resource="@xml/file_paths" />
        </provider>
    </application>

</manifest>
```

#### 2. `android/build.gradle` (Root Build Script)
```groovy
// Top-level build file where you can add configuration options common to all sub-projects/modules.

buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.7.2'
        classpath 'com.google.gms:google-services:4.4.2'

        // NOTE: Do not place your application dependencies here; they belong
        // in the individual module build.gradle files
    }
}

apply from: "variables.gradle"

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

task clean(type: Delete) {
    delete rootProject.buildDir
}
```

#### 3. `android/app/build.gradle` (Application Module Build Script)
```groovy
apply plugin: 'com.android.application'

android {
    namespace "com.manh.voyagerhydration"
    compileSdk rootProject.ext.compileSdkVersion
    defaultConfig {
        applicationId "com.manh.voyagerhydration"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.0"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
        aaptOptions {
             // Files and dirs to omit from the packaged assets dir, modified to accommodate modern web apps.
             // Default: https://android.googlesource.com/platform/frameworks/base/+/282e181b58cf72b6ca770dc7ca5f91f135444502/tools/aapt/AaptAssets.cpp#61
            ignoreAssetsPattern '!.svn:!.git:!.ds_store:!*.scc:.*:!CVS:!thumbs.db:!picasa.ini:!*~'
        }
    }
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}

repositories {
    flatDir{
        dirs '../capacitor-cordova-android-plugins/src/main/libs', 'libs'
    }
}

dependencies {
    implementation fileTree(include: ['*.jar'], dir: 'libs')
    implementation "androidx.appcompat:appcompat:$androidxAppCompatVersion"
    implementation "androidx.coordinatorlayout:coordinatorlayout:$androidxCoordinatorLayoutVersion"
    implementation "androidx.core:core-splashscreen:$coreSplashScreenVersion"
    implementation project(':capacitor-android')
    testImplementation "junit:junit:$junitVersion"
    androidTestImplementation "androidx.test.ext:junit:$androidxJunitVersion"
    androidTestImplementation "androidx.test.espresso:espresso-core:$androidxEspressoCoreVersion"
    implementation project(':capacitor-cordova-android-plugins')
}

apply from: 'capacitor.build.gradle'

try {
    def servicesJSON = file('google-services.json')
    if (servicesJSON.text) {
        apply plugin: 'com.google.gms.google-services'
    }
} catch(Exception e) {
    logger.info("google-services.json not found, google-services plugin not applied. Push Notifications won't work")
}
```

#### 4. `android/variables.gradle`
```groovy
ext {
    minSdkVersion = 23
    compileSdkVersion = 35
    targetSdkVersion = 35
    androidxActivityVersion = '1.9.2'
    androidxAppCompatVersion = '1.7.0'
    androidxCoordinatorLayoutVersion = '1.2.0'
    androidxCoreVersion = '1.15.0'
    androidxFragmentVersion = '1.8.4'
    coreSplashScreenVersion = '1.0.1'
    androidxWebkitVersion = '1.12.1'
    junitVersion = '4.13.2'
    androidxJunitVersion = '1.2.1'
    androidxEspressoCoreVersion = '3.6.1'
    cordovaAndroidVersion = '10.1.1'
}
```

#### 5. `android/settings.gradle`
```groovy
include ':app'
include ':capacitor-cordova-android-plugins'
project(':capacitor-cordova-android-plugins').projectDir = new File('./capacitor-cordova-android-plugins/')

apply from: 'capacitor.settings.gradle'
```

#### 6. `android/gradle/wrapper/gradle-wrapper.properties`
```properties
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-8.11.1-all.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
```

#### 7. `android/gradle.properties`
```properties
org.gradle.jvmargs=-Xmx1536m
android.useAndroidX=true
```

#### 8. `android/app/src/main/res/values/strings.xml`
```xml
<?xml version='1.0' encoding='utf-8'?>
<resources>
    <string name="app_name">Voyager Hydration</string>
    <string name="title_activity_main">Voyager Hydration</string>
    <string name="package_name">com.manh.voyagerhydration</string>
    <string name="custom_url_scheme">com.manh.voyagerhydration</string>
</resources>
```

#### 9. `android/app/src/main/java/com/manh/voyagerhydration/MainActivity.java`
```java
package com.manh.voyagerhydration;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {}
```

---

## 5. Verification Method

To independently verify the implementation:

1. **Verify Android Platform Directory Existence**:
   - Check directory: `android/app/src/main`
   - Check file: `android/app/src/main/AndroidManifest.xml`
   - Check wrapper: `android/gradlew`, `android/gradle/wrapper/gradle-wrapper.jar`

2. **Run E2E Test Suite**:
   ```powershell
   npm run test:e2e
   ```
   **Expected Outcome**:
   - Feature 15 (`tests/e2e/tier1-features/f15_capacitor_config.test.ts`): 5/5 PASSED
   - Feature 15 Boundaries (`tests/e2e/tier2-boundaries/f15_capacitor_boundaries.test.ts`): 5/5 PASSED
   - Feature 16 (`tests/e2e/tier1-features/f16_android_permissions.test.ts`): 5/5 PASSED
   - Feature 16 Boundaries (`tests/e2e/tier2-boundaries/f16_permissions_boundaries.test.ts`): 5/5 PASSED
   - Total Suite: 191/196 PASSED (the remaining 5 failed tests are Feature 17, assigned to CI track).

3. **Run Unit Tests**:
   ```powershell
   npm test
   ```
   **Expected Outcome**: 100% unit tests pass.

4. **Run TypeScript & Vite Build**:
   ```powershell
   npm run build
   ```
   **Expected Outcome**: Clean build without errors or warnings.

5. **Invalidation Conditions**:
   - Missing `android.permission.POST_NOTIFICATIONS` in `AndroidManifest.xml` will fail test 16.2.
   - Missing `android.permission.ACCESS_FINE_LOCATION` will fail test 16.3.
   - Missing `android.permission.ACCESS_COARSE_LOCATION` will fail test 16.4.
   - Missing `android.permission.INTERNET` will fail test 16.5.
   - Missing `uses-feature android.hardware.location.gps` will fail test 16.7.
   - Missing `package="com.manh.voyagerhydration"` in `<manifest>` tag will fail test 16.9.
