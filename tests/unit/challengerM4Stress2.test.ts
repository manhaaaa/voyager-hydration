import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * Lightweight, zero-dependency YAML parser for GitHub Actions workflow files.
 * Validates indentation, tab prohibition, nested objects, lists, and multiline scalars.
 */
interface ParsedYaml {
  [key: string]: any;
}

function parseWorkflowYaml(content: string): ParsedYaml {
  const lines = content.split(/\r?\n/);

  // 1. Check for tab characters in indentation or anywhere in the file
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('\t')) {
      throw new Error(`Tab character detected on line ${i + 1}: ${JSON.stringify(line)}`);
    }
  }

  // 2. Tokenize non-empty, non-comment lines
  interface LineToken {
    lineNum: number;
    indent: number;
    trimmed: string;
    raw: string;
  }

  const tokens: LineToken[] = [];
  for (let idx = 0; idx < lines.length; idx++) {
    const raw = lines[idx];
    const trimmed = raw.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) {
      continue;
    }
    const indent = raw.search(/\S|$/);
    tokens.push({ lineNum: idx + 1, indent, trimmed, raw });
  }

  let curr = 0;

  function parseScalar(val: string): any {
    const s = val.trim();
    if (s === 'true') return true;
    if (s === 'false') return false;
    if (s === 'null' || s === '~') return null;
    if (/^-?\d+$/.test(s)) return parseInt(s, 10);
    if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s);
    if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
      return s.slice(1, -1);
    }
    return s;
  }

  function parseBlock(currentIndent: number): any {
    let result: any = null;
    let isArray = false;

    while (curr < tokens.length) {
      const token = tokens[curr];
      if (token.indent < currentIndent) {
        break;
      }
      if (token.indent > currentIndent) {
        throw new Error(`Inconsistent indentation at line ${token.lineNum}`);
      }

      if (token.trimmed.startsWith('- ')) {
        if (result === null) {
          result = [];
          isArray = true;
        } else if (!isArray) {
          throw new Error(`Syntax error: Unexpected sequence item at line ${token.lineNum}`);
        }

        const itemStr = token.trimmed.slice(2).trim();
        curr++;

        if (itemStr === '') {
          if (curr < tokens.length && tokens[curr].indent > token.indent) {
            result.push(parseBlock(tokens[curr].indent));
          } else {
            result.push(null);
          }
        } else if (itemStr.includes(':')) {
          // Object item in list e.g. "- name: Checkout repository"
          const colonIdx = itemStr.indexOf(':');
          const k = itemStr.slice(0, colonIdx).trim();
          const v = itemStr.slice(colonIdx + 1).trim();
          const itemObj: Record<string, any> = {};

          if (v === '|' || v === '|-') {
            let multiline = '';
            const blockIndent = curr < tokens.length ? tokens[curr].indent : token.indent + 2;
            while (curr < tokens.length && tokens[curr].indent >= blockIndent) {
              multiline += (multiline ? '\n' : '') + tokens[curr].raw.trimStart();
              curr++;
            }
            itemObj[k] = multiline;
          } else if (v === '') {
            if (curr < tokens.length && tokens[curr].indent > token.indent) {
              itemObj[k] = parseBlock(tokens[curr].indent);
            } else {
              itemObj[k] = null;
            }
          } else {
            itemObj[k] = parseScalar(v);
          }

          // Consume additional properties of this object indented further
          while (curr < tokens.length && tokens[curr].indent > token.indent) {
            const nextIndent = tokens[curr].indent;
            const subProps = parseBlock(nextIndent);
            if (typeof subProps === 'object' && subProps !== null && !Array.isArray(subProps)) {
              Object.assign(itemObj, subProps);
            } else {
              break;
            }
          }
          result.push(itemObj);
        } else {
          result.push(parseScalar(itemStr));
        }
      } else {
        if (result === null) {
          result = {};
          isArray = false;
        } else if (isArray) {
          throw new Error(`Syntax error: Unexpected mapping key at line ${token.lineNum}`);
        }

        const colonIdx = token.trimmed.indexOf(':');
        if (colonIdx === -1) {
          throw new Error(`Syntax error: Missing colon on line ${token.lineNum}: "${token.trimmed}"`);
        }

        const key = token.trimmed.slice(0, colonIdx).trim();
        const valuePart = token.trimmed.slice(colonIdx + 1).trim();
        curr++;

        if (valuePart === '|' || valuePart === '|-') {
          let multiline = '';
          const blockIndent = curr < tokens.length ? tokens[curr].indent : token.indent + 2;
          while (curr < tokens.length && tokens[curr].indent >= blockIndent) {
            multiline += (multiline ? '\n' : '') + tokens[curr].raw.trimStart();
            curr++;
          }
          result[key] = multiline;
        } else if (valuePart === '') {
          if (curr < tokens.length && tokens[curr].indent > token.indent) {
            result[key] = parseBlock(tokens[curr].indent);
          } else {
            result[key] = null;
          }
        } else {
          result[key] = parseScalar(valuePart);
        }
      }
    }

    return result;
  }

  return parseBlock(0);
}

describe('Challenger M4 Stress Test 2 — GitHub Actions CI & Cross-Platform Compatibility', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const workflowPath = path.join(rootDir, '.github/workflows/build-apk.yml');
  const gitattributesPath = path.join(rootDir, '.gitattributes');
  const gradlewPath = path.join(rootDir, 'android/gradlew');

  let workflowContent: string;
  let parsedWorkflow: ParsedYaml;

  // 1. YAML Syntax and Tab Indentation Verification
  describe('1. Workflow YAML Syntax & Indentation Integrity', () => {
    it('should exist at .github/workflows/build-apk.yml', () => {
      expect(fs.existsSync(workflowPath)).toBe(true);
      workflowContent = fs.readFileSync(workflowPath, 'utf8');
      expect(workflowContent.length).toBeGreaterThan(100);
    });

    it('must have ZERO tab characters on every line', () => {
      const lines = workflowContent.split(/\r?\n/);
      const tabViolations: { line: number; content: string }[] = [];

      lines.forEach((line, idx) => {
        if (line.includes('\t')) {
          tabViolations.push({ line: idx + 1, content: line });
        }
      });

      expect(tabViolations).toEqual([]);
    });

    it('must parse cleanly as valid YAML without syntax errors', () => {
      parsedWorkflow = parseWorkflowYaml(workflowContent);
      expect(parsedWorkflow).toBeDefined();
      expect(typeof parsedWorkflow).toBe('object');
      expect(parsedWorkflow.name).toBe('Build Android Debug APK');
    });

    it('should cross-validate successfully against Python PyYAML when available', () => {
      try {
        const escapedPath = workflowPath.replace(/\\/g, '/');
        const cmd = `python -c "import yaml, json; print(json.dumps(yaml.safe_load(open('${escapedPath}', 'r', encoding='utf-8'))))"`;
        const pyOutput = execSync(cmd, { encoding: 'utf-8', timeout: 5000 });
        const pyDoc = JSON.parse(pyOutput);

        expect(pyDoc.name).toBe('Build Android Debug APK');
        expect(pyDoc.jobs).toBeDefined();
        expect(pyDoc.jobs.build).toBeDefined();
      } catch (err: any) {
        // PyYAML check is an optional cross-validation oracle; if python is not in PATH, skip without error
        if (err.message && !err.message.includes('not recognized') && !err.message.includes('not found')) {
          throw err;
        }
      }
    });

    it('adversarial test: parser must fail loudly if tab indentation is introduced', () => {
      const corruptedYaml = "jobs:\n\tbuild:\n\t\truns-on: ubuntu-latest";
      expect(() => parseWorkflowYaml(corruptedYaml)).toThrow(/Tab character detected/);
    });

    it('adversarial test: parser must fail loudly if invalid syntax is introduced', () => {
      const invalidYaml = "jobs:\n  build:\n    runs-on ubuntu-latest"; // Missing colon
      expect(() => parseWorkflowYaml(invalidYaml)).toThrow(/Missing colon/);
    });

    it('specifies valid triggers and targets ubuntu-latest', () => {
      const onConfig = parsedWorkflow.on || parsedWorkflow[true as any];
      expect(onConfig).toBeDefined();
      expect(onConfig.push).toBeDefined();
      expect(onConfig.pull_request).toBeDefined();
      expect(onConfig.workflow_dispatch).toBeNull();

      expect(parsedWorkflow.jobs).toBeDefined();
      expect(parsedWorkflow.jobs.build).toBeDefined();
      expect(parsedWorkflow.jobs.build['runs-on']).toBe('ubuntu-latest');
      expect(Array.isArray(parsedWorkflow.jobs.build.steps)).toBe(true);
    });
  });

  // 2. Step Sequence Validation
  describe('2. Step Sequence Validation (Test before Build before Sync)', () => {
    it('verifies npm test is strictly invoked prior to npm run build and npx cap sync android', () => {
      const steps = parsedWorkflow.jobs.build.steps as Array<{ name?: string; run?: string; uses?: string }>;
      expect(steps.length).toBeGreaterThan(6);

      const findStepIndexByRun = (pattern: RegExp) =>
        steps.findIndex(step => typeof step.run === 'string' && pattern.test(step.run));

      const npmCiIndex = findStepIndexByRun(/\bnpm\s+ci\b/);
      const npmTestIndex = findStepIndexByRun(/\bnpm\s+test\b/);
      const npmBuildIndex = findStepIndexByRun(/\bnpm\s+run\s+build\b/);
      const capSyncIndex = findStepIndexByRun(/\bnpx\s+cap\s+sync\s+android\b/);
      const assembleIndex = findStepIndexByRun(/\.\/gradlew\s+assembleDebug\b/);

      expect(npmCiIndex).toBeGreaterThan(-1);
      expect(npmTestIndex).toBeGreaterThan(-1);
      expect(npmBuildIndex).toBeGreaterThan(-1);
      expect(capSyncIndex).toBeGreaterThan(-1);
      expect(assembleIndex).toBeGreaterThan(-1);

      // Strict pipeline invariant order:
      // 1. Dependencies installed (npm ci)
      // 2. Tests pass (npm test)
      // 3. Web build compiled (npm run build)
      // 4. Capacitor synced (npx cap sync android)
      // 5. Gradle debug APK assembled (./gradlew assembleDebug)
      expect(npmCiIndex).toBeLessThan(npmTestIndex);
      expect(npmTestIndex).toBeLessThan(npmBuildIndex);
      expect(npmBuildIndex).toBeLessThan(capSyncIndex);
      expect(capSyncIndex).toBeLessThan(assembleIndex);
    });

    it('adversarial test: sequence validator flags out-of-order build-before-test flow', () => {
      const validateOrder = (stepsList: Array<{ run?: string }>) => {
        const testIdx = stepsList.findIndex(s => s.run && /npm\s+test/.test(s.run));
        const buildIdx = stepsList.findIndex(s => s.run && /npm\s+run\s+build/.test(s.run));
        const syncIdx = stepsList.findIndex(s => s.run && /npx\s+cap\s+sync/.test(s.run));
        return testIdx < buildIdx && buildIdx < syncIdx;
      };

      // Inverted sequence: build before test
      const invertedSteps = [
        { run: 'npm run build' },
        { run: 'npm test' },
        { run: 'npx cap sync android' },
      ];
      expect(validateOrder(invertedSteps)).toBe(false);

      // Inverted sequence: sync before build
      const syncBeforeBuild = [
        { run: 'npm test' },
        { run: 'npx cap sync android' },
        { run: 'npm run build' },
      ];
      expect(validateOrder(syncBeforeBuild)).toBe(false);
    });
  });

  // 3. Java & Node Toolchain Compatibility
  describe('3. Java & Node Toolchain Compatibility', () => {
    it('configures Node.js 20 with npm caching', () => {
      const steps = parsedWorkflow.jobs.build.steps as Array<{ uses?: string; with?: Record<string, any> }>;
      const nodeStep = steps.find(s => s.uses && s.uses.startsWith('actions/setup-node'));

      expect(nodeStep).toBeDefined();
      expect(nodeStep?.with).toBeDefined();
      expect(String(nodeStep?.with?.['node-version'])).toBe('20');
      expect(nodeStep?.with?.cache).toBe('npm');
    });

    it('configures Java 21 Temurin distribution with gradle caching', () => {
      const steps = parsedWorkflow.jobs.build.steps as Array<{ uses?: string; with?: Record<string, any> }>;
      const javaStep = steps.find(s => s.uses && s.uses.startsWith('actions/setup-java'));

      expect(javaStep).toBeDefined();
      expect(javaStep?.with).toBeDefined();
      expect(String(javaStep?.with?.['java-version'])).toBe('21');
      expect(javaStep?.with?.distribution).toBe('temurin');
      expect(javaStep?.with?.cache).toBe('gradle');
    });

    it('adversarial test: detects incorrect node or java version configurations', () => {
      const checkToolchain = (nodeVer: any, javaVer: any, distro: string) => {
        return String(nodeVer) === '20' && String(javaVer) === '21' && distro === 'temurin';
      };

      expect(checkToolchain(18, 21, 'temurin')).toBe(false); // Outdated Node
      expect(checkToolchain(20, 17, 'temurin')).toBe(false); // Outdated Java
      expect(checkToolchain(20, 21, 'zulu')).toBe(false); // Non-temurin distro
      expect(checkToolchain(20, 21, 'temurin')).toBe(true);
    });
  });

  // 4. Gradle Assembly Command and Diagnostics
  describe('4. Gradle Assembly Command & Flags', () => {
    it('executes ./gradlew assembleDebug with --no-daemon and --stacktrace', () => {
      const steps = parsedWorkflow.jobs.build.steps as Array<{ name?: string; run?: string }>;
      const gradleStep = steps.find(s => s.run && s.run.includes('./gradlew assembleDebug'));

      expect(gradleStep).toBeDefined();
      const runCmd = gradleStep!.run!;

      expect(runCmd).toContain('./gradlew assembleDebug');
      expect(runCmd).toContain('--no-daemon');
      expect(runCmd).toContain('--stacktrace');
      expect(runCmd).toMatch(/cd\s+android\s+&&\s+\.\/gradlew/);
    });

    it('verifies gradlew executable preparation step with line-ending sanitization', () => {
      const steps = parsedWorkflow.jobs.build.steps as Array<{ name?: string; run?: string }>;
      const prepStep = steps.find(s => s.run && (s.run.includes('chmod +x') || s.run.includes('gradlew')));

      expect(prepStep).toBeDefined();
      const prepRun = prepStep!.run!;
      expect(prepRun).toContain('chmod +x android/gradlew');
      expect(prepRun).toMatch(/sed\s+-i.*android\/gradlew/);
    });

    it('adversarial test: rejects gradle commands missing CI diagnostics flags', () => {
      const validateGradleCmd = (cmd: string) => {
        const hasAssemble = cmd.includes('./gradlew assembleDebug');
        const hasNoDaemon = cmd.includes('--no-daemon');
        const hasStacktrace = cmd.includes('--stacktrace');
        return hasAssemble && hasNoDaemon && hasStacktrace;
      };

      expect(validateGradleCmd('./gradlew assembleDebug')).toBe(false);
      expect(validateGradleCmd('./gradlew assembleDebug --no-daemon')).toBe(false);
      expect(validateGradleCmd('./gradlew assembleDebug --no-daemon --stacktrace')).toBe(true);
    });
  });

  // 5. Artifact Upload Path Integrity
  describe('5. Artifact Upload Configuration', () => {
    it('specifies exact output path android/app/build/outputs/apk/debug/app-debug.apk', () => {
      const steps = parsedWorkflow.jobs.build.steps as Array<{ uses?: string; with?: Record<string, any> }>;
      const uploadStep = steps.find(s => s.uses && s.uses.startsWith('actions/upload-artifact'));

      expect(uploadStep).toBeDefined();
      expect(uploadStep?.with).toBeDefined();
      expect(uploadStep?.with?.path).toBe('android/app/build/outputs/apk/debug/app-debug.apk');
      expect(uploadStep?.with?.name).toBe('app-debug-apk');
      expect(uploadStep?.with?.['retention-days']).toBe(14);
    });

    it('adversarial test: flags wrong apk artifact destination', () => {
      const validateArtifactPath = (p: string) =>
        p === 'android/app/build/outputs/apk/debug/app-debug.apk';

      expect(validateArtifactPath('android/app/build/outputs/apk/release/app-release.apk')).toBe(false);
      expect(validateArtifactPath('app/build/outputs/apk/debug/app-debug.apk')).toBe(false);
      expect(validateArtifactPath('android/app/build/outputs/apk/debug/app-debug.apk')).toBe(true);
    });
  });

  // 6. Cross-Platform Line Endings Check (.gitattributes & android/gradlew)
  describe('6. Cross-Platform Line Endings & .gitattributes Integrity', () => {
    it('verifies android/gradlew exists and has strictly LF line endings (ZERO CRLF)', () => {
      expect(fs.existsSync(gradlewPath)).toBe(true);
      const gradlewBuf = fs.readFileSync(gradlewPath);

      // Verify no \r\n bytes in gradlew
      const hasCRLF = gradlewBuf.includes(Buffer.from('\r\n'));
      expect(hasCRLF).toBe(false);

      // Verify \n bytes exist
      const hasLF = gradlewBuf.includes(Buffer.from('\n'));
      expect(hasLF).toBe(true);

      // Verify POSIX shebang
      const firstLine = gradlewBuf.slice(0, 30).toString('utf8');
      expect(firstLine.startsWith('#!/bin/sh') || firstLine.startsWith('#!/usr/bin/env sh')).toBe(true);
    });

    it('verifies .gitattributes exists and enforces LF for android/gradlew and shell scripts', () => {
      expect(fs.existsSync(gitattributesPath)).toBe(true);
      const gitattrContent = fs.readFileSync(gitattributesPath, 'utf8');

      expect(gitattrContent).toMatch(/android\/gradlew\s+text\s+eol=lf/);
      expect(gitattrContent).toMatch(/\*\.sh\s+text\s+eol=lf/);
      expect(gitattrContent).toMatch(/\*\s+text=auto/);
    });

    it('adversarial test: CRLF detector triggers error when Windows carriage return is present', () => {
      const sampleLF = Buffer.from('#!/bin/sh\necho "Hello"\n');
      const sampleCRLF = Buffer.from('#!/bin/sh\r\necho "Hello"\r\n');

      const checkLFOnly = (buf: Buffer) => !buf.includes(Buffer.from('\r\n')) && buf.includes(Buffer.from('\n'));

      expect(checkLFOnly(sampleLF)).toBe(true);
      expect(checkLFOnly(sampleCRLF)).toBe(false);
    });
  });
});
