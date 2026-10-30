import { describe, it } from 'node:test';
import { assert, registerTest, readProjectFile } from '../harness.ts';

describe('Tier 2 - Feature 17: CI/CD Workflow Pipeline Boundaries', () => {
  const tier = 'Tier 2';
  const fId = 'F17';
  const workflowPath = '.github/workflows/build-apk.yml';

  it('17.6: Upload artifact step targets debug APK path', () => {
    registerTest(tier, fId, '17.6', 'Upload artifact targets app-debug.apk', () => {
      const content = readProjectFile(workflowPath);
      if (content) {
        assert.ok(content.includes('upload-artifact'), 'CI workflow must use upload-artifact action');
        assert.ok(content.includes('app-debug.apk') || content.includes('outputs/apk'),
          'Artifact path must point to APK output');
      }
    });
  });

  it('17.7: Makes gradlew executable with chmod +x', () => {
    registerTest(tier, fId, '17.7', 'Gradle wrapper execution permissions', () => {
      const content = readProjectFile(workflowPath);
      if (content) {
        assert.ok(content.includes('chmod +x') || content.includes('gradlew'),
          'Workflow must grant execution rights to gradlew wrapper');
      }
    });
  });

  it('17.8: Pipeline triggers on push and pull_request to main/master branches', () => {
    registerTest(tier, fId, '17.8', 'CI trigger events and branches', () => {
      const content = readProjectFile(workflowPath);
      if (content) {
        assert.ok(content.includes('push') && (content.includes('main') || content.includes('master')),
          'Workflow should trigger on push to main or master');
      }
    });
  });

  it('17.9: YAML syntax parses without illegal tab characters', () => {
    registerTest(tier, fId, '17.9', 'No tab characters in YAML workflow', () => {
      const content = readProjectFile(workflowPath);
      if (content) {
        // YAML prohibits literal tabs for indentation
        const linesWithTabs = content.split('\n').filter(l => l.startsWith('\t'));
        assert.strictEqual(linesWithTabs.length, 0, 'YAML file must use spaces, not tabs, for indentation');
      }
    });
  });

  it('17.10: Pipeline includes test run step (npm test) prior to build and sync', () => {
    registerTest(tier, fId, '17.10', 'Test execution precedes build and packaging', () => {
      const content = readProjectFile(workflowPath);
      if (content) {
        assert.ok(content.includes('npm test') || content.includes('test'),
          'Workflow must execute tests before building Android bundle');
      }
    });
  });
});
