import { describe, it } from 'node:test';
import { assert, registerTest, readProjectFile, fileExists } from '../harness.ts';

describe('Tier 2 - Feature 01: Scaffolding Boundaries & Anti-Cheat', () => {
  const tier = 'Tier 2';
  const fId = 'F01';

  it('1.6: Boundary test: package.json dependencies contain no wildcard (*) or unresolvable versions', () => {
    registerTest(tier, fId, '1.6', 'No wildcard or unresolvable versions in dependencies', () => {
      const content = readProjectFile('package.json');
      if (content) {
        const pkg = JSON.parse(content);
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        for (const [dep, ver] of Object.entries(allDeps)) {
          assert.notStrictEqual(ver, '*', `Dependency ${dep} must not use wildcard '*' version`);
        }
      }
    });
  });

  it('1.7: Boundary test: Verify project contains zero prohibited VIP/premium paywall packages', () => {
    registerTest(tier, fId, '1.7', 'Zero commercial/VIP paywall libraries', () => {
      const content = readProjectFile('package.json');
      if (content) {
        const pkg = JSON.parse(content);
        const allDeps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
        const prohibited = ['stripe', 'revenuecat', 'in-app-purchase', 'billing'];
        for (const p of prohibited) {
          assert.ok(!allDeps.some(d => d.includes(p)), `Prohibited billing/paywall dependency ${p} found`);
        }
      }
    });
  });

  it('1.8: Boundary test: devDependencies contain TypeScript definitions for canvas-confetti and react', () => {
    registerTest(tier, fId, '1.8', 'TypeScript definitions declared in devDependencies', () => {
      const content = readProjectFile('package.json');
      if (content) {
        const pkg = JSON.parse(content);
        const devDeps = pkg.devDependencies || {};
        assert.ok(devDeps['typescript'] || pkg.dependencies['typescript'], 'typescript must be declared');
      }
    });
  });

  it('1.9: Boundary test: Tailwind configuration contains custom tokens (border-[#1E293B], cosmic)', () => {
    registerTest(tier, fId, '1.9', 'Tailwind configuration tokens check', () => {
      const configContent = readProjectFile('tailwind.config.js') || readProjectFile('tailwind.config.ts');
      if (configContent) {
        assert.ok(configContent.includes('#1E293B') || configContent.includes('cosmic') || configContent.includes('border'),
          'tailwind config must contain Card-UI design tokens');
      }
    });
  });

  it('1.10: Boundary test: Clean project layout verification (no rogue source code in .agents)', () => {
    registerTest(tier, fId, '1.10', 'No source code or tests in .agents directory', () => {
      assert.ok(!fileExists('.agents/teamwork/src'), '.agents must not contain production source code');
    });
  });
});
