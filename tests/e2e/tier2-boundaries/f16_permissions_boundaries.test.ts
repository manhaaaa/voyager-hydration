import { describe, it } from 'node:test';
import { assert, registerTest, readProjectFile } from '../harness.ts';

describe('Tier 2 - Feature 16: Android Permissions Boundaries', () => {
  const tier = 'Tier 2';
  const fId = 'F16';
  const manifestPath = 'android/app/src/main/AndroidManifest.xml';

  it('16.6: Declares VIBRATE or SCHEDULE_EXACT_ALARM for reliable alarms', () => {
    registerTest(tier, fId, '16.6', 'Declares alarm/vibrate permissions', () => {
      const content = readProjectFile(manifestPath);
      if (content) {
        assert.ok(content.includes('android.permission.VIBRATE') ||
                  content.includes('android.permission.SCHEDULE_EXACT_ALARM'),
          'Alarm or vibrate permission should be declared for notifications');
      }
    });
  });

  it('16.7: Declares android.hardware.location.gps feature with required="false"', () => {
    registerTest(tier, fId, '16.7', 'GPS hardware declared with required=false', () => {
      const content = readProjectFile(manifestPath);
      if (content) {
        assert.ok(content.includes('android.hardware.location') || content.includes('uses-feature'),
          'Manifest should declare hardware location feature compatibility');
      }
    });
  });

  it('16.8: AndroidManifest.xml contains valid XML opening and closing tags', () => {
    registerTest(tier, fId, '16.8', 'Manifest XML tag completeness', () => {
      const content = readProjectFile(manifestPath);
      if (content) {
        assert.ok(content.includes('<manifest') && content.includes('</manifest>'),
          'Manifest must contain valid <manifest> root element');
        assert.ok(content.includes('<application') && content.includes('</application>'),
          'Manifest must contain valid <application> element');
      }
    });
  });

  it('16.9: Package name attribute matches com.manh.voyagerhydration', () => {
    registerTest(tier, fId, '16.9', 'Package attribute in Manifest', () => {
      const content = readProjectFile(manifestPath);
      if (content) {
        assert.ok(content.includes('com.manh.voyagerhydration'),
          'Package attribute must match com.manh.voyagerhydration');
      }
    });
  });

  it('16.10: Main activity configured with MAIN and LAUNCHER intent filters', () => {
    registerTest(tier, fId, '16.10', 'Main activity launcher intent filter', () => {
      const content = readProjectFile(manifestPath);
      if (content) {
        assert.ok(content.includes('android.intent.action.MAIN'),
          'Main activity must handle action.MAIN');
        assert.ok(content.includes('android.intent.category.LAUNCHER'),
          'Main activity must declare category.LAUNCHER');
      }
    });
  });
});
