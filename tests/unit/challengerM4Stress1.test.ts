import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

describe('Empirical Android Platform & Configuration Stress Test (Milestone 4)', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const manifestPath = path.join(rootDir, 'android/app/src/main/AndroidManifest.xml');
  const capConfigPath = path.join(rootDir, 'capacitor.config.ts');
  const appBuildGradlePath = path.join(rootDir, 'android/app/build.gradle');
  const variablesGradlePath = path.join(rootDir, 'android/variables.gradle');
  const stringsXmlPath = path.join(rootDir, 'android/app/src/main/res/values/strings.xml');

  // Helper to read file contents
  const read = (p: string) => fs.readFileSync(p, 'utf-8');

  describe('1. Manifest Parsing & Permission Matrix', () => {
    it('manifest file exists and is valid UTF-8 XML', () => {
      expect(fs.existsSync(manifestPath)).toBe(true);
      const content = read(manifestPath);
      expect(content).toContain('<?xml version="1.0" encoding="utf-8"?>');
      expect(content).toContain('<manifest');
      expect(content).toContain('</manifest>');
    });

    it('contains all 6 mandatory Android permissions actively declared', () => {
      const content = read(manifestPath);
      const requiredPermissions = [
        'android.permission.INTERNET',
        'android.permission.POST_NOTIFICATIONS',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.VIBRATE',
        'android.permission.SCHEDULE_EXACT_ALARM',
      ];

      // Extract all <uses-permission android:name="..." />
      const permissionRegex = /<uses-permission\s+android:name=["']([^"']+)["']\s*\/>/g;
      const foundPermissions: string[] = [];
      let match;
      while ((match = permissionRegex.exec(content)) !== null) {
        foundPermissions.push(match[1]);
      }

      for (const perm of requiredPermissions) {
        expect(
          foundPermissions,
          `Expected AndroidManifest.xml to declare permission ${perm}`
        ).toContain(perm);
      }
    });

    it('ensures no permissions are commented out or disabled', () => {
      const content = read(manifestPath);
      // Remove valid XML comments
      const stripped = content.replace(/<!--[\s\S]*?-->/g, '');
      const requiredPermissions = [
        'android.permission.INTERNET',
        'android.permission.POST_NOTIFICATIONS',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.VIBRATE',
        'android.permission.SCHEDULE_EXACT_ALARM',
      ];

      for (const perm of requiredPermissions) {
        expect(stripped).toContain(`android:name="${perm}"`);
      }
    });
  });

  describe('2. Package Consistency Across Ecosystem', () => {
    const expectedAppId = 'com.manh.voyagerhydration';

    it('matches package attribute in AndroidManifest.xml', () => {
      const manifest = read(manifestPath);
      const pkgMatch = manifest.match(/<manifest[^>]+package=["']([^"']+)["']/);
      expect(pkgMatch).not.toBeNull();
      expect(pkgMatch![1]).toBe(expectedAppId);
    });

    it('matches appId in capacitor.config.ts', () => {
      const capConfig = read(capConfigPath);
      const appIdMatch = capConfig.match(/appId:\s*['"]([^'"]+)['"]/);
      expect(appIdMatch).not.toBeNull();
      expect(appIdMatch![1]).toBe(expectedAppId);
    });

    it('matches namespace and applicationId in android/app/build.gradle', () => {
      const buildGradle = read(appBuildGradlePath);
      const namespaceMatch = buildGradle.match(/namespace\s+["']([^"']+)["']/);
      const applicationIdMatch = buildGradle.match(/applicationId\s+["']([^"']+)["']/);

      expect(namespaceMatch).not.toBeNull();
      expect(namespaceMatch![1]).toBe(expectedAppId);

      expect(applicationIdMatch).not.toBeNull();
      expect(applicationIdMatch![1]).toBe(expectedAppId);
    });

    it('matches package_name and custom_url_scheme in strings.xml', () => {
      const strings = read(stringsXmlPath);
      const pkgStringMatch = strings.match(/<string name="package_name">([^<]+)<\/string>/);
      const schemeMatch = strings.match(/<string name="custom_url_scheme">([^<]+)<\/string>/);

      expect(pkgStringMatch).not.toBeNull();
      expect(pkgStringMatch![1]).toBe(expectedAppId);

      expect(schemeMatch).not.toBeNull();
      expect(schemeMatch![1]).toBe(expectedAppId);
    });
  });

  describe('3. Hardware Feature Tolerance', () => {
    it('declares android.hardware.location.gps with android:required="false"', () => {
      const manifest = read(manifestPath);
      // Clean comments to ensure live declaration
      const stripped = manifest.replace(/<!--[\s\S]*?-->/g, '');

      const featureRegex =
        /<uses-feature\s+[^>]*android:name=["']android\.hardware\.location\.gps["'][^>]*\/>/s;
      const match = stripped.match(featureRegex);
      expect(match, 'uses-feature android.hardware.location.gps must be present').not.toBeNull();

      const featureTag = match![0];
      expect(featureTag).toContain('android:required="false"');
      expect(featureTag).not.toContain('android:required="true"');
    });

    it('ensures application does not block GPS-less devices from Google Play installation', () => {
      const manifest = read(manifestPath);
      // Verify no other required hardware features are accidentally marked true
      const requiredTrueRegex = /<uses-feature[^>]+android:required=["']true["']/g;
      const matches = manifest.match(requiredTrueRegex);
      expect(matches).toBeNull();
    });
  });

  describe('4. Launcher Intent & Activity Export Configuration', () => {
    it('MainActivity is declared with android:exported="true"', () => {
      const manifest = read(manifestPath);
      const activityRegex = /<activity\b([^>]*android:name=["']\.MainActivity["'][^>]*)>/s;
      const match = manifest.match(activityRegex);
      expect(match, 'MainActivity must be declared').not.toBeNull();
      const activityAttrs = match![0];
      expect(activityAttrs).toContain('android:exported="true"');
    });

    it('MainActivity declares android.intent.action.MAIN and android.intent.category.LAUNCHER', () => {
      const manifest = read(manifestPath);
      const activityBlockRegex = /<activity\b[^>]*android:name=["']\.MainActivity["'][^>]*>([\s\S]*?)<\/activity>/;
      const match = manifest.match(activityBlockRegex);
      expect(match).not.toBeNull();
      const activityBody = match![1];

      expect(activityBody).toContain('<intent-filter>');
      expect(activityBody).toContain('</intent-filter>');
      expect(activityBody).toContain('<action android:name="android.intent.action.MAIN" />');
      expect(activityBody).toContain('<category android:name="android.intent.category.LAUNCHER" />');
    });

    it('MainActivity configures singleTask launchMode and essential configChanges', () => {
      const manifest = read(manifestPath);
      const activityRegex = /<activity\b([^>]*android:name=["']\.MainActivity["'][^>]*)>/s;
      const match = manifest.match(activityRegex);
      expect(match).not.toBeNull();
      const attrs = match![0];
      expect(attrs).toContain('android:launchMode="singleTask"');
      expect(attrs).toContain('android:configChanges=');
      expect(attrs).toContain('orientation');
      expect(attrs).toContain('screenSize');
    });
  });

  describe('5. Mipmap & Splash Drawable Assets', () => {
    const densities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
    const resDir = path.join(rootDir, 'android/app/src/main/res');

    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    densities.forEach((density) => {
      it(`verifies mipmap-${density} contains valid launcher PNG assets`, () => {
        const mipmapDir = path.join(resDir, `mipmap-${density}`);
        expect(fs.existsSync(mipmapDir), `Directory ${mipmapDir} must exist`).toBe(true);

        const requiredIcons = ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png'];

        for (const icon of requiredIcons) {
          const iconPath = path.join(mipmapDir, icon);
          expect(fs.existsSync(iconPath), `Icon ${iconPath} must exist`).toBe(true);
          const stat = fs.statSync(iconPath);
          expect(stat.size, `Icon ${iconPath} size must be > 0 bytes`).toBeGreaterThan(0);

          // Verify PNG binary magic header
          const fd = fs.openSync(iconPath, 'r');
          const buffer = Buffer.alloc(8);
          fs.readSync(fd, buffer, 0, 8, 0);
          fs.closeSync(fd);
          expect(buffer.equals(pngHeader), `Icon ${iconPath} must be a valid PNG`).toBe(true);
        }
      });
    });

    it('verifies drawable/splash.png exists and is a valid PNG', () => {
      const splashPath = path.join(resDir, 'drawable', 'splash.png');
      expect(fs.existsSync(splashPath)).toBe(true);
      const stat = fs.statSync(splashPath);
      expect(stat.size).toBeGreaterThan(1000);

      const fd = fs.openSync(splashPath, 'r');
      const buffer = Buffer.alloc(8);
      fs.readSync(fd, buffer, 0, 8, 0);
      fs.closeSync(fd);
      expect(buffer.equals(pngHeader)).toBe(true);
    });
  });

  describe('6. Empirical Capacitor Android Synchronization', () => {
    it('executes npx cap sync android cleanly with exit code 0', () => {
      // Build first if dist is missing
      const distPath = path.join(rootDir, 'dist');
      if (!fs.existsSync(distPath) || !fs.existsSync(path.join(distPath, 'index.html'))) {
        execSync('npm run build', { cwd: rootDir, stdio: 'pipe' });
      }

      // Execute npx cap sync android
      let syncOutput = '';
      let exitCode = 0;
      try {
        const res = execSync('npx cap sync android', {
          cwd: rootDir,
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 60000,
        });
        syncOutput = res;
      } catch (err: any) {
        exitCode = err.status || 1;
        syncOutput = (err.stdout || '') + '\n' + (err.stderr || '');
      }

      expect(exitCode, `cap sync output:\n${syncOutput}`).toBe(0);
      expect(syncOutput).toMatch(/Copying web assets/i);
      expect(syncOutput).toMatch(/Sync finished/i);
    }, 60000);

    it('verifies public assets and capacitor configuration synced to Android assets', () => {
      const assetsDir = path.join(rootDir, 'android/app/src/main/assets');
      const publicHtml = path.join(assetsDir, 'public/index.html');
      const capConfigJson = path.join(assetsDir, 'capacitor.config.json');
      const capPluginsJson = path.join(assetsDir, 'capacitor.plugins.json');

      expect(fs.existsSync(publicHtml)).toBe(true);
      expect(fs.statSync(publicHtml).size).toBeGreaterThan(100);

      expect(fs.existsSync(capConfigJson)).toBe(true);
      const configObj = JSON.parse(read(capConfigJson));
      expect(configObj.appId).toBe('com.manh.voyagerhydration');
      expect(configObj.appName).toBe('Voyager Hydration');

      expect(fs.existsSync(capPluginsJson)).toBe(true);
      const pluginsList = JSON.parse(read(capPluginsJson));
      expect(Array.isArray(pluginsList)).toBe(true);
      const pluginPackages = pluginsList.map((p: any) => p.pkg);
      expect(pluginPackages).toContain('@capacitor/local-notifications');
      expect(pluginPackages).toContain('@capacitor/geolocation');
      expect(pluginPackages).toContain('@capacitor/preferences');
      expect(pluginPackages).toContain('@capacitor/filesystem');
    });

    it('verifies targetSdkVersion and compileSdkVersion in variables.gradle are modern (>= 34)', () => {
      const variablesContent = read(variablesGradlePath);
      const compileSdkMatch = variablesContent.match(/compileSdkVersion\s*=\s*(\d+)/);
      const targetSdkMatch = variablesContent.match(/targetSdkVersion\s*=\s*(\d+)/);
      const minSdkMatch = variablesContent.match(/minSdkVersion\s*=\s*(\d+)/);

      expect(compileSdkMatch).not.toBeNull();
      expect(parseInt(compileSdkMatch![1], 10)).toBeGreaterThanOrEqual(34);

      expect(targetSdkMatch).not.toBeNull();
      expect(parseInt(targetSdkMatch![1], 10)).toBeGreaterThanOrEqual(34);

      expect(minSdkMatch).not.toBeNull();
      expect(parseInt(minSdkMatch![1], 10)).toBeGreaterThanOrEqual(21);
    });
  });
});
