import { describe, it } from 'node:test';
import { assert, registerTest, fileExists, readProjectFile } from '../harness.ts';

describe('Tier 1 - Feature 16: Android Permissions in AndroidManifest.xml', () => {
  const tier = 'Tier 1';
  const fId = 'F16';
  const manifestPath = 'android/app/src/main/AndroidManifest.xml';

  it('16.1: AndroidManifest.xml file exists in Android platform directory', () => {
    registerTest(tier, fId, '16.1', 'AndroidManifest.xml existence', () => {
      assert.ok(fileExists(manifestPath), `AndroidManifest.xml must exist at ${manifestPath} per R5`);
    });
  });

  it('16.2: Declares android.permission.POST_NOTIFICATIONS', () => {
    registerTest(tier, fId, '16.2', 'Declares POST_NOTIFICATIONS', () => {
      const content = readProjectFile(manifestPath);
      assert.ok(content, 'AndroidManifest.xml must be readable');
      assert.ok(content.includes('android.permission.POST_NOTIFICATIONS'),
        'POST_NOTIFICATIONS permission must be declared in AndroidManifest.xml per R5');
    });
  });

  it('16.3: Declares android.permission.ACCESS_FINE_LOCATION', () => {
    registerTest(tier, fId, '16.3', 'Declares ACCESS_FINE_LOCATION', () => {
      const content = readProjectFile(manifestPath);
      assert.ok(content, 'AndroidManifest.xml must be readable');
      assert.ok(content.includes('android.permission.ACCESS_FINE_LOCATION'),
        'ACCESS_FINE_LOCATION permission must be declared in AndroidManifest.xml per R5');
    });
  });

  it('16.4: Declares android.permission.ACCESS_COARSE_LOCATION', () => {
    registerTest(tier, fId, '16.4', 'Declares ACCESS_COARSE_LOCATION', () => {
      const content = readProjectFile(manifestPath);
      assert.ok(content, 'AndroidManifest.xml must be readable');
      assert.ok(content.includes('android.permission.ACCESS_COARSE_LOCATION'),
        'ACCESS_COARSE_LOCATION permission must be declared in AndroidManifest.xml per R5');
    });
  });

  it('16.5: Declares android.permission.INTERNET for Open-Meteo Weather API', () => {
    registerTest(tier, fId, '16.5', 'Declares INTERNET permission', () => {
      const content = readProjectFile(manifestPath);
      assert.ok(content, 'AndroidManifest.xml must be readable');
      assert.ok(content.includes('android.permission.INTERNET'),
        'INTERNET permission must be declared in AndroidManifest.xml');
    });
  });
});
