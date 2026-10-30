import { describe, it } from 'node:test';
import { assert, registerTest, fileExists, readProjectFile } from '../harness.ts';

describe('Tier 1 - Feature 17: GitHub Actions CI APK Build Workflow', () => {
  const tier = 'Tier 1';
  const fId = 'F17';
  const workflowPath = '.github/workflows/build-apk.yml';

  it('17.1: Workflow file exists at .github/workflows/build-apk.yml', () => {
    registerTest(tier, fId, '17.1', 'build-apk.yml exists', () => {
      assert.ok(fileExists(workflowPath), `Workflow file must exist at ${workflowPath} per R5`);
    });
  });

  it('17.2: Workflow runner targets ubuntu-latest', () => {
    registerTest(tier, fId, '17.2', 'Runner targets ubuntu-latest', () => {
      const content = readProjectFile(workflowPath);
      assert.ok(content, 'build-apk.yml must be readable');
      assert.ok(content.includes('ubuntu-latest'), 'Workflow must run on ubuntu-latest');
    });
  });

  it('17.3: Configures Node.js version 20', () => {
    registerTest(tier, fId, '17.3', 'Configures Node.js version 20', () => {
      const content = readProjectFile(workflowPath);
      assert.ok(content, 'build-apk.yml must be readable');
      assert.ok(content.includes('node-version: 20') || content.includes('node-version: "20"'),
        'Workflow must configure Node.js 20 per R5');
    });
  });

  it('17.4: Configures Java JDK version 21', () => {
    registerTest(tier, fId, '17.4', 'Configures Java JDK 21', () => {
      const content = readProjectFile(workflowPath);
      assert.ok(content, 'build-apk.yml must be readable');
      assert.ok(content.includes('java-version: 21') || content.includes('java-version: "21"'),
        'Workflow must configure Java 21 per R5');
    });
  });

  it('17.5: Contains ./gradlew assembleDebug execution step', () => {
    registerTest(tier, fId, '17.5', 'Contains ./gradlew assembleDebug step', () => {
      const content = readProjectFile(workflowPath);
      assert.ok(content, 'build-apk.yml must be readable');
      assert.ok(content.includes('assembleDebug'),
        'Workflow must execute ./gradlew assembleDebug to build APK artifact per R5');
    });
  });
});
