import * as fs from 'node:fs';
import * as path from 'node:path';
import assert from 'node:assert';

export const PROJECT_ROOT = path.resolve(process.cwd());

// ============================================================================
// Canonical Specification Oracles derived from ORIGINAL_REQUEST.md
// ============================================================================

export function canonicalCalculateBaseWater(weightKg: number): number {
  if (weightKg === undefined || weightKg === null || isNaN(weightKg) || weightKg <= 0) {
    return 60 * 35; // Default fallback weight 60kg -> 2100 ml
  }
  const sanitized = Math.min(300, Math.max(20, weightKg));
  return sanitized * 35;
}

export function canonicalCalculateActivityWater(level: 'sedentary' | 'moderate' | 'high' | string): number {
  switch (level) {
    case 'sedentary':
      return 0;
    case 'moderate':
      return 350;
    case 'high':
      return 700;
    default:
      return 350;
  }
}

export function canonicalCalculateWeatherWater(
  temp: number,
  humidity: number,
  autoAdjust = true
): { total: number; tempBonus: number; humidBonus: number } {
  if (!autoAdjust) {
    return { total: 0, tempBonus: 0, humidBonus: 0 };
  }
  let tempBonus = 0;
  if (temp >= 28 && temp <= 32) {
    tempBonus = 250;
  } else if (temp > 32) {
    tempBonus = 500;
  }

  let humidBonus = 0;
  if (humidity < 40) {
    humidBonus = 150;
  }

  return {
    total: tempBonus + humidBonus,
    tempBonus,
    humidBonus,
  };
}

export function canonicalRoundToNearest50(ml: number): number {
  return Math.round(ml / 50) * 50;
}

export function canonicalCalculateDailyGoal(
  weightKg: number,
  activityLevel: 'sedentary' | 'moderate' | 'high' | string,
  temp = 25,
  humidity = 60,
  autoAdjust = true
): number {
  const base = canonicalCalculateBaseWater(weightKg);
  const activity = canonicalCalculateActivityWater(activityLevel);
  const weather = canonicalCalculateWeatherWater(temp, humidity, autoAdjust).total;
  return canonicalRoundToNearest50(base + activity + weather);
}

export function canonicalRemainingCups(targetMl: number, consumedMl: number, cupSize = 250): number {
  const deficit = Math.max(0, targetMl - consumedMl);
  if (deficit === 0) return 0;
  return Math.ceil(deficit / cupSize);
}

export function canonicalFormatVolume(ml: number, unit: 'ml' | 'L' = 'L'): string {
  if (unit === 'ml') {
    return `${Math.round(ml)} ml`;
  }
  const liters = ml / 1000;
  const str = (ml % 1000 === 0)
    ? liters.toFixed(1)
    : (ml % 100 === 0 ? liters.toFixed(1) : liters.toFixed(2));
  return `${str.replace('.', ',')} L`;
}


export function canonicalIsInQuietHours(date: Date, wakeTime = '07:00', sleepTime = '01:00'): boolean {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const currentTotal = hours * 60 + minutes;

  const [wakeH, wakeM] = wakeTime.split(':').map(Number);
  const [sleepH, sleepM] = sleepTime.split(':').map(Number);
  const wakeTotal = wakeH * 60 + wakeM;
  const sleepTotal = sleepH * 60 + sleepM;

  if (sleepTotal < wakeTotal) {
    // Crosses midnight (e.g. 01:00 to 07:00)
    return currentTotal >= sleepTotal && currentTotal < wakeTotal;
  } else {
    return currentTotal >= sleepTotal || currentTotal < wakeTotal;
  }
}

export function canonicalAdjustForQuietHours(scheduledDate: Date, wakeTime = '07:00', sleepTime = '01:00'): Date {
  if (!canonicalIsInQuietHours(scheduledDate, wakeTime, sleepTime)) {
    return new Date(scheduledDate);
  }
  const [wakeH, wakeM] = wakeTime.split(':').map(Number);
  const adjusted = new Date(scheduledDate);
  adjusted.setHours(wakeH, wakeM, 0, 0);
  if (adjusted.getTime() <= scheduledDate.getTime()) {
    adjusted.setDate(adjusted.getDate() + 1);
  }
  return adjusted;
}

export function canonicalSmartInterval(minutesToSleep: number, remainingGlasses: number): number {
  if (remainingGlasses <= 0) return 180;
  const raw = minutesToSleep / remainingGlasses;
  return Math.max(45, Math.min(150, Math.round(raw)));
}

// ============================================================================
// File Inspection Helpers
// ============================================================================

export function readProjectFile(relativeFilePath: string): string | null {
  const absolutePath = path.resolve(PROJECT_ROOT, relativeFilePath);
  if (!fs.existsSync(absolutePath)) {
    return null;
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

export function fileExists(relativeFilePath: string): boolean {
  const absolutePath = path.resolve(PROJECT_ROOT, relativeFilePath);
  return fs.existsSync(absolutePath);
}

// ============================================================================
// Web Audio Mock Environment
// ============================================================================

export interface MockScheduledNode {
  type: string;
  frequency?: number;
  gain?: number;
  startTime?: number;
  stopTime?: number;
}

export class MockAudioContext {
  state: 'suspended' | 'running' | 'closed' = 'suspended';
  currentTime = 0;
  destination = { channelCount: 2 };
  nodesCreated: MockScheduledNode[] = [];

  async resume() {
    this.state = 'running';
  }

  createOscillator() {
    const node: any = {
      type: 'sine',
      frequency: {
        value: 440,
        setValueAtTime: (val: number, t: number) => { node.frequency.value = val; },
        exponentialRampToValueAtTime: (val: number, t: number) => { node.frequency.value = val; },
        linearRampToValueAtTime: (val: number, t: number) => { node.frequency.value = val; },
      },
      connect: (target: any) => {},
      start: (t = 0) => {
        this.nodesCreated.push({ type: `oscillator:${node.type}`, frequency: node.frequency.value, startTime: t });
      },
      stop: (t = 0) => {},
    };
    return node;
  }

  createGain() {
    const node: any = {
      gain: {
        value: 1,
        setValueAtTime: (val: number, t: number) => { node.gain.value = val; },
        exponentialRampToValueAtTime: (val: number, t: number) => { node.gain.value = val; },
        linearRampToValueAtTime: (val: number, t: number) => { node.gain.value = val; },
      },
      connect: (target: any) => {},
    };
    this.nodesCreated.push({ type: 'gain', gain: 1 });
    return node;
  }

  createBiquadFilter() {
    const node: any = {
      type: 'lowpass',
      frequency: { value: 350 },
      Q: { value: 1 },
      gain: { value: 0 },
      connect: (target: any) => {},
    };
    return node;
  }

  createDelay() {
    return {
      delayTime: { value: 0 },
      connect: (target: any) => {},
    };
  }
}

// ============================================================================
// Dual-Layer Storage Simulator
// ============================================================================

export class DualLayerStorageSimulator {
  private localMem = new Map<string, string>();
  private prefsMem = new Map<string, string>();

  async set(key: string, value: any): Promise<void> {
    const serialized = JSON.stringify(value);
    this.localMem.set(key, serialized);
    await new Promise(r => setTimeout(r, 2)); // simulate async
    this.prefsMem.set(key, serialized);
  }

  get<T>(key: string, fallback: T): T {
    if (this.localMem.has(key)) {
      try {
        return JSON.parse(this.localMem.get(key)!);
      } catch {
        return fallback;
      }
    }
    return fallback;
  }

  async getFromPreferences<T>(key: string, fallback: T): Promise<T> {
    if (this.prefsMem.has(key)) {
      try {
        return JSON.parse(this.prefsMem.get(key)!);
      } catch {
        return fallback;
      }
    }
    return fallback;
  }

  clearLocalStorage(): void {
    this.localMem.clear();
  }

  clearAll(): void {
    this.localMem.clear();
    this.prefsMem.clear();
  }

  async reconcile(): Promise<void> {
    for (const [k, v] of this.prefsMem.entries()) {
      if (!this.localMem.has(k)) {
        this.localMem.set(k, v);
      }
    }
  }
}

// ============================================================================
// Notification Scheduler Simulator
// ============================================================================

export interface ScheduledNotificationItem {
  id: number;
  title: string;
  body: string;
  schedule: { at: Date };
  extra?: any;
}

export class NotificationSchedulerSimulator {
  channels: Array<{ id: string; name: string }> = [];
  scheduled: ScheduledNotificationItem[] = [];
  permissionsGranted = true;

  async createChannel(channel: { id: string; name: string }): Promise<void> {
    this.channels.push(channel);
  }

  async schedule(options: { notifications: ScheduledNotificationItem[] }): Promise<void> {
    if (!this.permissionsGranted) return;
    this.scheduled.push(...options.notifications);
  }

  async cancel(options: { notifications: Array<{ id: number }> }): Promise<void> {
    const idsToCancel = new Set(options.notifications.map(n => n.id));
    this.scheduled = this.scheduled.filter(n => !idsToCancel.has(n.id));
  }

  async cancelAll(): Promise<void> {
    this.scheduled = [];
  }
}

// ============================================================================
// Lightweight Test Execution Framework for Standalone & Vitest / Node runner
// ============================================================================

export interface TestCaseResult {
  tier: string;
  featureId: string;
  testId: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

export type TestFn = () => void | Promise<void>;

export interface RegisteredTestCase {
  tier: string;
  featureId: string;
  testId: string;
  name: string;
  fn: TestFn;
}

export const globalTestRegistry: RegisteredTestCase[] = [];

export function registerTest(
  tier: string,
  featureId: string,
  testId: string,
  name: string,
  fn: TestFn
): void {
  globalTestRegistry.push({ tier, featureId, testId, name, fn });
}

export async function runAllTests(): Promise<{
  results: TestCaseResult[];
  total: number;
  passed: number;
  failed: number;
}> {
  const results: TestCaseResult[] = [];
  let passed = 0;
  let failed = 0;

  for (const t of globalTestRegistry) {
    const start = performance.now();
    let isPassed = false;
    let errorMsg: string | undefined;

    try {
      await t.fn();
      isPassed = true;
      passed++;
    } catch (err: any) {
      isPassed = false;
      failed++;
      errorMsg = err.message || String(err);
    }

    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    results.push({
      tier: t.tier,
      featureId: t.featureId,
      testId: t.testId,
      name: t.name,
      passed: isPassed,
      durationMs,
      error: errorMsg,
    });
  }

  return { results, total: globalTestRegistry.length, passed, failed };
}

// Assertion alias
export { assert };
