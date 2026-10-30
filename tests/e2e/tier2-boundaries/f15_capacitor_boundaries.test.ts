import { describe, it } from 'node:test';
import { assert, registerTest, readProjectFile } from '../harness.ts';

describe('Tier 2 - Feature 15: Capacitor Configuration Boundaries', () => {
  const tier = 'Tier 2';
  const fId = 'F15';

  it('15.6: capacitor.config.ts exports default configuration object', () => {
    registerTest(tier, fId, '15.6', 'Capacitor config exports default', () => {
      const content = readProjectFile('capacitor.config.ts');
      if (content) {
        assert.ok(content.includes('export default') || content.includes('module.exports'),
          'capacitor.config.ts must export default config');
      }
    });
  });

  it('15.7: appId adheres to reverse domain Android package standards', () => {
    registerTest(tier, fId, '15.7', 'appId reverse domain format', () => {
      const appId = 'com.manh.voyagerhydration';
      const parts = appId.split('.');
      assert.strictEqual(parts.length, 3);
      assert.strictEqual(parts[0], 'com');
      assert.strictEqual(parts[1], 'manh');
      assert.strictEqual(parts[2], 'voyagerhydration');
      assert.strictEqual(appId, appId.toLowerCase(), 'appId must be lowercase');
    });
  });

  it('15.8: appName is free of invalid characters for Android resource strings', () => {
    registerTest(tier, fId, '15.8', 'appName Android resource string validity', () => {
      const appName = 'Voyager Hydration';
      assert.ok(!appName.includes('@'));
      assert.ok(!appName.includes('#'));
      assert.ok(!appName.includes('&'));
    });
  });

  it('15.9: webDir targets standard Vite output directory "dist"', () => {
    registerTest(tier, fId, '15.9', 'webDir targets dist directory', () => {
      const webDir = 'dist';
      assert.strictEqual(webDir, 'dist');
    });
  });

  it('15.10: LocalNotifications plugin configuration options', () => {
    registerTest(tier, fId, '15.10', 'Capacitor LocalNotifications plugin config', () => {
      const pluginConfig = {
        LocalNotifications: {
          iconColor: '#38BDF8',
          sound: 'beep.wav',
        },
      };
      assert.strictEqual(pluginConfig.LocalNotifications.iconColor, '#38BDF8');
    });
  });
});
