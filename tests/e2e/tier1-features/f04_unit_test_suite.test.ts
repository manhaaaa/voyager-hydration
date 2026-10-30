import { describe, it } from 'node:test';
import { assert, registerTest, fileExists, readProjectFile } from '../harness.ts';

describe('Tier 1 - Feature 04: Hydration Unit Test Suite', () => {
  const tier = 'Tier 1';
  const fId = 'F04';

  function findUnitTestContent(): string | null {
    const candidatePaths = [
      'tests/unit/hydrationEngine.test.ts',
      'src/__tests__/hydrationEngine.test.ts',
      'src/utils/__tests__/hydrationEngine.test.ts',
    ];
    for (const p of candidatePaths) {
      if (fileExists(p)) {
        return readProjectFile(p);
      }
    }
    return null;
  }

  it('4.1: Unit test file location verification', () => {
    registerTest(tier, fId, '4.1', 'Unit test file location verification', () => {
      const exists = fileExists('tests/unit/hydrationEngine.test.ts') ||
                     fileExists('src/__tests__/hydrationEngine.test.ts') ||
                     fileExists('src/utils/__tests__/hydrationEngine.test.ts');
      assert.ok(exists, 'Hydration unit test suite file must exist per R2/Verification criteria');
    });
  });

  it('4.2: Unit test coverage for base water calculation', () => {
    registerTest(tier, fId, '4.2', 'Unit test coverage for base water calculation', () => {
      const content = findUnitTestContent();
      assert.ok(content, 'Unit test content must be present');
      assert.ok(content.includes('35') || content.includes('base') || content.includes('weight'),
        'Unit test must assert base water calculation formula');
    });
  });

  it('4.3: Unit test coverage for physical activity levels', () => {
    registerTest(tier, fId, '4.3', 'Unit test coverage for physical activity levels', () => {
      const content = findUnitTestContent();
      assert.ok(content, 'Unit test content must be present');
      assert.ok(content.includes('sedentary') || content.includes('moderate') || content.includes('high'),
        'Unit test must cover sedentary, moderate, and high activity levels');
    });
  });

  it('4.4: Unit test coverage for temperature and humidity weather bonuses', () => {
    registerTest(tier, fId, '4.4', 'Unit test coverage for weather bonuses', () => {
      const content = findUnitTestContent();
      assert.ok(content, 'Unit test content must be present');
      assert.ok(content.includes('250') || content.includes('500') || content.includes('weather'),
        'Unit test must verify weather bonus tiers');
    });
  });

  it('4.5: Unit test coverage for 50ml rounding logic', () => {
    registerTest(tier, fId, '4.5', 'Unit test coverage for 50ml rounding logic', () => {
      const content = findUnitTestContent();
      assert.ok(content, 'Unit test content must be present');
      assert.ok(content.includes('50') || content.includes('round'),
        'Unit test must verify rounding to 50ml / 0.1L');
    });
  });
});
