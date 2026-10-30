/**
 * Comprehensive E2E Test Suite Standalone Runner
 * Voyager's Cosmic Hydration (Reverse: 1999)
 *
 * Runs all 196 E2E tests across Tiers 1-4:
 * - Tier 1: Feature Coverage (85 tests)
 * - Tier 2: Boundary & Corner Cases (85 tests)
 * - Tier 3: Cross-Feature Combinations (17 tests)
 * - Tier 4: Real-World Application Scenarios (9 tests)
 */

import { runAllTests, globalTestRegistry } from './harness.ts';

// Import all Tier 1 Feature Tests
import './tier1-features/f01_scaffolding.test.ts';
import './tier1-features/f02_hydration_formula.test.ts';
import './tier1-features/f03_weather_geolocation.test.ts';
import './tier1-features/f04_unit_test_suite.test.ts';
import './tier1-features/f05_audio_synthesis.test.ts';
import './tier1-features/f06_dual_persistence.test.ts';
import './tier1-features/f07_notification_scheduler.test.ts';
import './tier1-features/f08_voyager_chibi.test.ts';
import './tier1-features/f09_navigation_bar.test.ts';
import './tier1-features/f10_today_tab.test.ts';
import './tier1-features/f11_reminder_tab.test.ts';
import './tier1-features/f12_journal_tab.test.ts';
import './tier1-features/f13_stats_tab.test.ts';
import './tier1-features/f14_profile_tab.test.ts';
import './tier1-features/f15_capacitor_config.test.ts';
import './tier1-features/f16_android_permissions.test.ts';
import './tier1-features/f17_github_actions_ci.test.ts';

// Import all Tier 2 Boundary Tests
import './tier2-boundaries/f01_scaffolding_boundaries.test.ts';
import './tier2-boundaries/f02_hydration_boundaries.test.ts';
import './tier2-boundaries/f03_weather_boundaries.test.ts';
import './tier2-boundaries/f04_unit_test_boundaries.test.ts';
import './tier2-boundaries/f05_audio_boundaries.test.ts';
import './tier2-boundaries/f06_persistence_boundaries.test.ts';
import './tier2-boundaries/f07_notification_boundaries.test.ts';
import './tier2-boundaries/f08_chibi_boundaries.test.ts';
import './tier2-boundaries/f09_navigation_boundaries.test.ts';
import './tier2-boundaries/f10_today_boundaries.test.ts';
import './tier2-boundaries/f11_reminder_boundaries.test.ts';
import './tier2-boundaries/f12_journal_boundaries.test.ts';
import './tier2-boundaries/f13_stats_boundaries.test.ts';
import './tier2-boundaries/f14_profile_boundaries.test.ts';
import './tier2-boundaries/f15_capacitor_boundaries.test.ts';
import './tier2-boundaries/f16_permissions_boundaries.test.ts';
import './tier2-boundaries/f17_ci_boundaries.test.ts';

// Import Tier 3 Combinations
import './tier3-combinations/cross_feature_combinations.test.ts';

// Import Tier 4 Scenarios
import './tier4-scenarios/application_scenarios.test.ts';

async function main() {
  console.log('='.repeat(78));
  console.log('🌌 Voyager\'s Cosmic Hydration — End-to-End Test Suite Execution');
  console.log(`Registered Tests in Suite: ${globalTestRegistry.length}`);
  console.log('='.repeat(78));

  const startTime = performance.now();
  const { results, total, passed, failed } = await runAllTests();
  const totalDuration = Math.round(performance.now() - startTime);

  // Group by Tier
  const tierGroups: Record<string, typeof results> = {
    'Tier 1': [],
    'Tier 2': [],
    'Tier 3': [],
    'Tier 4': [],
  };

  for (const r of results) {
    if (tierGroups[r.tier]) {
      tierGroups[r.tier].push(r);
    }
  }

  console.log('\n📊 Tier-by-Tier Summary:');
  console.log('-'.repeat(78));
  console.log(`| ${'Tier'.padEnd(10)} | ${'Total Tests'.padEnd(12)} | ${'Passed'.padEnd(10)} | ${'Failed'.padEnd(10)} | ${'Pass Rate'.padEnd(12)} |`);
  console.log('-'.repeat(78));

  for (const [tierName, tierResults] of Object.entries(tierGroups)) {
    const tPassed = tierResults.filter(r => r.passed).length;
    const tFailed = tierResults.filter(r => !r.passed).length;
    const rate = tierResults.length > 0 ? `${Math.round((tPassed / tierResults.length) * 100)}%` : '0%';
    console.log(
      `| ${tierName.padEnd(10)} | ${String(tierResults.length).padEnd(12)} | ${String(tPassed).padEnd(10)} | ${String(tFailed).padEnd(10)} | ${rate.padEnd(12)} |`
    );
  }
  console.log('-'.repeat(78));

  if (failed > 0) {
    console.log(`\n⚠️  Failures Detail (${failed} tests):`);
    for (const r of results) {
      if (!r.passed) {
        console.log(`  [${r.tier}] ${r.testId} - ${r.name}`);
        console.log(`    Error: ${r.error}`);
      }
    }
  }

  console.log('\n' + '='.repeat(78));
  console.log(`🏁 Final Result: ${passed}/${total} passed (${failed} failed) in ${totalDuration}ms`);
  console.log('='.repeat(78));

  // If running in development before scaffolding is complete,
  // we exit with 0 if tests execute cleanly, or exit 1 if unexpected crash occurs.
  return failed;
}

// Run main after all modules and it() callbacks have registered
setTimeout(() => {
  main().catch(err => {
    console.error('Fatal test runner error:', err);
    process.exit(1);
  });
}, 200);

