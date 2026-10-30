import { describe, it } from 'node:test';
import { assert, registerTest, readProjectFile, fileExists } from '../harness.ts';

describe('Tier 1 - Feature 01: Project Scaffolding & Dependencies', () => {
  const tier = 'Tier 1';
  const fId = 'F01';

  it('1.1: Verify package.json structure and build scripts', () => {
    registerTest(tier, fId, '1.1', 'Verify package.json structure and build scripts', () => {
      const content = readProjectFile('package.json');
      assert.ok(content, 'package.json must exist in project root');
      const pkg = JSON.parse(content);
      assert.ok(pkg.scripts, 'package.json must define scripts');
      assert.ok(pkg.scripts.build, 'package.json must define a build script');
      assert.ok(pkg.scripts.test || pkg.scripts['test:e2e'], 'package.json must define a test script');
    });
    // Inline execution for node:test runner
    const content = readProjectFile('package.json');
    if (content) {
      const pkg = JSON.parse(content);
      assert.ok(pkg.scripts && pkg.scripts.build);
    }
  });

  it('1.2: Verify required production libraries (lucide-react, canvas-confetti, react)', () => {
    registerTest(tier, fId, '1.2', 'Verify required production libraries', () => {
      const content = readProjectFile('package.json');
      assert.ok(content, 'package.json must exist');
      const pkg = JSON.parse(content);
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      assert.ok(allDeps['react'], 'react must be in dependencies');
      assert.ok(allDeps['react-dom'], 'react-dom must be in dependencies');
      assert.ok(allDeps['lucide-react'], 'lucide-react must be in dependencies per R1');
      assert.ok(allDeps['canvas-confetti'], 'canvas-confetti must be in dependencies per R1');
    });
  });

  it('1.3: Verify all 7 required Capacitor Android packages', () => {
    registerTest(tier, fId, '1.3', 'Verify all 7 required Capacitor packages', () => {
      const content = readProjectFile('package.json');
      assert.ok(content, 'package.json must exist');
      const pkg = JSON.parse(content);
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      const requiredCap = [
        '@capacitor/core',
        '@capacitor/cli',
        '@capacitor/android',
        '@capacitor/local-notifications',
        '@capacitor/geolocation',
        '@capacitor/preferences',
        '@capacitor/filesystem',
      ];
      for (const capPkg of requiredCap) {
        assert.ok(allDeps[capPkg], `Capacitor package ${capPkg} must be declared in dependencies per R1`);
      }
    });
  });

  it('1.4: Verify styling configuration (Tailwind CSS, PostCSS, Autoprefixer)', () => {
    registerTest(tier, fId, '1.4', 'Verify styling configuration', () => {
      const content = readProjectFile('package.json');
      assert.ok(content, 'package.json must exist');
      const pkg = JSON.parse(content);
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      assert.ok(allDeps['tailwindcss'], 'tailwindcss must be installed');
      assert.ok(allDeps['postcss'], 'postcss must be installed');
      assert.ok(allDeps['autoprefixer'], 'autoprefixer must be installed');
      assert.ok(fileExists('tailwind.config.js') || fileExists('tailwind.config.ts'), 'Tailwind config must exist');
    });
  });

  it('1.5: Verify TypeScript and Vite configuration integrity', () => {
    registerTest(tier, fId, '1.5', 'Verify TypeScript and Vite configuration', () => {
      assert.ok(fileExists('tsconfig.json'), 'tsconfig.json must exist');
      assert.ok(fileExists('vite.config.ts') || fileExists('vite.config.js'), 'vite.config.ts must exist');
      const tsContent = readProjectFile('tsconfig.json');
      assert.ok(tsContent, 'tsconfig.json must be readable');
    });
  });
});
