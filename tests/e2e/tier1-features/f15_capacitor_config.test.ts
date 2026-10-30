import { describe, it } from 'node:test';
import { assert, registerTest, fileExists, readProjectFile } from '../harness.ts';

describe('Tier 1 - Feature 15: Capacitor Android Configuration', () => {
  const tier = 'Tier 1';
  const fId = 'F15';

  it('15.1: capacitor.config.ts file existence at project root', () => {
    registerTest(tier, fId, '15.1', 'capacitor.config.ts existence', () => {
      assert.ok(fileExists('capacitor.config.ts'), 'capacitor.config.ts must exist at project root per R5');
    });
  });

  it('15.2: appId matches "com.manh.voyagerhydration"', () => {
    registerTest(tier, fId, '15.2', 'appId matches com.manh.voyagerhydration', () => {
      const content = readProjectFile('capacitor.config.ts');
      assert.ok(content, 'capacitor.config.ts must be readable');
      assert.ok(content.includes('com.manh.voyagerhydration'), 'appId must be com.manh.voyagerhydration');
    });
  });

  it('15.3: appName matches "Voyager Hydration"', () => {
    registerTest(tier, fId, '15.3', 'appName matches Voyager Hydration', () => {
      const content = readProjectFile('capacitor.config.ts');
      assert.ok(content, 'capacitor.config.ts must be readable');
      assert.ok(content.includes('Voyager Hydration'), 'appName must be Voyager Hydration');
    });
  });

  it('15.4: webDir matches "dist"', () => {
    registerTest(tier, fId, '15.4', 'webDir matches dist', () => {
      const content = readProjectFile('capacitor.config.ts');
      assert.ok(content, 'capacitor.config.ts must be readable');
      assert.ok(content.includes('dist'), 'webDir must match dist');
    });
  });

  it('15.5: Server config specifies androidScheme: "https"', () => {
    registerTest(tier, fId, '15.5', 'androidScheme specifies https', () => {
      const content = readProjectFile('capacitor.config.ts');
      assert.ok(content, 'capacitor.config.ts must be readable');
      assert.ok(content.includes('androidScheme') || content.includes('https'),
        'server configuration must declare androidScheme');
    });
  });
});
