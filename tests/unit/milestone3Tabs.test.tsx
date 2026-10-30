// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Components & Tabs under test
import { NavigationBar, TABS } from '../../src/components/NavigationBar';
import { WaveTank } from '../../src/components/WaveTank';
import { TodayTab, QUICK_DRINK_OPTIONS } from '../../src/tabs/TodayTab';
import { ReminderTab } from '../../src/tabs/ReminderTab';
import { JournalTab, WEEKDAY_HEADERS } from '../../src/tabs/JournalTab';
import {
  StatsTab,
  DAY_LABELS,
  getMondayOfOffset,
  formatWeekHeader
} from '../../src/tabs/StatsTab';
import {
  ProfileTab,
  COMPANIONS_CATALOG,
  COSMIC_THEMES_CATALOG
} from '../../src/tabs/ProfileTab';

describe('Milestone 3 — 5 Main Tabs & Card-UI System Unit Tests', () => {
  // ==========================================================================
  // 1. NavigationBar Tests
  // ==========================================================================
  describe('NavigationBar Component (NavigationBar.tsx)', () => {
    it('defines exactly 5 tabs in specified order with 0% paywall/VIP locks', () => {
      expect(TABS.length).toBe(5);
      const expectedOrder = ['reminder', 'journal', 'today', 'stats', 'profile'];
      expect(TABS.map((t) => t.id)).toEqual(expectedOrder);

      const expectedLabels = ['Nhắc nước', 'Nhật ký', 'Hôm nay', 'Thống kê', 'Cá nhân'];
      expect(TABS.map((t) => t.label)).toEqual(expectedLabels);

      // 100% Free Guarantee: no locked or VIP tabs
      const lockedTabs = TABS.filter((t: any) => t.isVip || t.isLocked);
      expect(lockedTabs.length).toBe(0);
    });

    it('renders all 5 tabs and highlights active tab', () => {
      const handleTabChange = vi.fn();
      render(<NavigationBar activeTab="today" onTabChange={handleTabChange} />);

      const navElement = screen.getByTestId('navigation-bar');
      expect(navElement).toBeDefined();

      // Ensure all tabs exist
      for (const tab of TABS) {
        const tabBtn = screen.getByTestId(`nav-tab-${tab.id}`);
        expect(tabBtn).toBeDefined();
        expect(tabBtn.textContent).toContain(tab.label);
      }

      // Click on 'reminder' tab
      fireEvent.click(screen.getByTestId('nav-tab-reminder'));
      expect(handleTabChange).toHaveBeenCalledWith('reminder');
    });
  });

  // ==========================================================================
  // 2. WaveTank Tests
  // ==========================================================================
  describe('WaveTank Component (WaveTank.tsx)', () => {
    it('renders container and star buoy marker', () => {
      render(<WaveTank currentMl={1000} goalMl={2000} />);
      const container = screen.getByTestId('wave-tank-container');
      expect(container).toBeDefined();
      expect(container.getAttribute('data-fill-percent')).toBe('50');

      const starBuoy = screen.getByTestId('star-buoy');
      expect(starBuoy).toBeDefined();
    });

    it('clamps visual fill percentage to 100% on over-achievement', () => {
      render(<WaveTank currentMl={3500} goalMl={2000} />);
      const container = screen.getByTestId('wave-tank-container');
      expect(container.getAttribute('data-fill-percent')).toBe('100');
    });

    it('handles zero goal without crashing or NaN', () => {
      render(<WaveTank currentMl={0} goalMl={0} />);
      const container = screen.getByTestId('wave-tank-container');
      expect(container.getAttribute('data-fill-percent')).toBe('0');
    });
  });

  // ==========================================================================
  // 3. TodayTab Tests
  // ==========================================================================
  describe('TodayTab Screen (TodayTab.tsx)', () => {
    it('defines 4 quick drink options with +250ml checked by default', () => {
      expect(QUICK_DRINK_OPTIONS.length).toBe(4);
      expect(QUICK_DRINK_OPTIONS.map((o) => o.amount)).toEqual([50, 150, 250, 500]);

      const defaultOpt = QUICK_DRINK_OPTIONS.find((o) => o.isDefault);
      expect(defaultOpt).toBeDefined();
      expect(defaultOpt?.amount).toBe(250);
    });

    it('renders streak badge, weather widget, and central volume readout', () => {
      render(
        <TodayTab
          currentMl={1000}
          goalMl={1600}
          streak={5}
          weather={{
            temperature: 30,
            humidity: 65,
            weatherCode: 1,
            bonusMl: 250,
            locationName: 'Hà Nội',
            isFallback: false,
            timestamp: Date.now(),
          }}
        />
      );

      // Streak badge
      const streakBadge = screen.getByTestId('streak-badge');
      expect(streakBadge.textContent).toContain('5 ngày');

      // Weather widget
      const weatherWidget = screen.getByTestId('weather-widget');
      expect(weatherWidget.textContent).toContain('30°C');
      expect(weatherWidget.textContent).toContain('+250ml');

      // Consumed & Goal volumes
      const consumedVolume = screen.getByTestId('consumed-volume');
      const goalVolume = screen.getByTestId('goal-volume');
      expect(consumedVolume.textContent).toContain('1,0 L');
      expect(goalVolume.textContent).toContain('1,6 L');

      // Deficit prompt (1600 - 1000 = 600ml => 3 cups)
      const deficitPrompt = screen.getByTestId('deficit-prompt');
      expect(deficitPrompt.textContent).toContain('Thêm 3 ly >');
    });

    it('quick drink button invokes callback with exact ml increment', () => {
      const handleLog = vi.fn();
      render(<TodayTab currentMl={500} goalMl={2000} onLogDrink={handleLog} />);

      const btn250 = screen.getByTestId('quick-drink-250');
      fireEvent.click(btn250);
      expect(handleLog).toHaveBeenCalledWith(250);
    });
  });

  // ==========================================================================
  // 4. ReminderTab Tests
  // ==========================================================================
  describe('ReminderTab Screen (ReminderTab.tsx)', () => {
    const mockSettings: any = {
      language: 'vi',
      unit: 'L',
      soundEnabled: true,
      selectedSound: 'ripple',
      reminderEnabled: true,
      reminderMode: 'smart',
      wakeTime: '07:00',
      sleepTime: '01:00',
      selectedTheme: 'deep_space',
      selectedCompanion: 'Voyager Nguyên Bản',
    };

    it('renders countdown and master toggle switch', () => {
      const handleUpdateSettings = vi.fn();
      render(
        <ReminderTab
          settings={mockSettings}
          targetMl={2000}
          consumedMl={1000}
          onUpdateSettings={handleUpdateSettings}
        />
      );

      const countdown = screen.getByTestId('reminder-countdown');
      expect(countdown).toBeDefined();

      const toggle = screen.getByTestId('master-reminder-toggle');
      expect(toggle).toBeDefined();

      fireEvent.click(toggle);
      expect(handleUpdateSettings).toHaveBeenCalledWith({ reminderEnabled: false });
    });

    it('displays quiet hours window 01:00 - 07:00', () => {
      render(
        <ReminderTab
          settings={mockSettings}
          targetMl={2000}
          consumedMl={1000}
          onUpdateSettings={vi.fn()}
        />
      );
      expect(screen.getByText('01:00 - 07:00')).toBeDefined();
    });
  });

  // ==========================================================================
  // 5. JournalTab Tests
  // ==========================================================================
  describe('JournalTab Screen (JournalTab.tsx)', () => {
    it('defines 7 column headers T2 through CN', () => {
      expect(WEEKDAY_HEADERS.length).toBe(7);
      expect(WEEKDAY_HEADERS[0]).toBe('T2');
      expect(WEEKDAY_HEADERS[6]).toBe('CN');
    });

    it('renders smiling flame streak card with Reverse: 1999 quote', () => {
      render(
        <JournalTab
          dailyLogs={{}}
          currentStreak={7}
          defaultTargetMl={2000}
        />
      );

      const streakDays = screen.getByTestId('streak-days-count');
      expect(streakDays.textContent).toContain('7');

      const streakQuote = screen.getByTestId('streak-quote');
      expect(streakQuote.textContent).toContain('Bạn đang giữ nhịp tốt. Hãy cùng Voyager duy trì nhé!');
    });
  });

  // ==========================================================================
  // 6. StatsTab Tests
  // ==========================================================================
  describe('StatsTab Screen (StatsTab.tsx)', () => {
    it('defines 7 daily labels matching T2 to CN', () => {
      expect(DAY_LABELS.length).toBe(7);
      expect(DAY_LABELS).toEqual(['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']);
    });

    it('formats week header in `< DD/MM - DD/MM >` pattern', () => {
      const monday = new Date(2026, 9, 26); // 26 Oct 2026
      const formatted = formatWeekHeader(monday);
      expect(formatted).toBe('< 26/10 - 1/11 >');
    });

    it('computes Monday of offset correctly', () => {
      const mon = getMondayOfOffset(0);
      expect(mon.getDay()).toBe(1);
    });

    it('renders summary statistics cards with division-by-zero protection', () => {
      render(
        <StatsTab
          dailyLogs={{}}
          currentDailyTargetMl={2000}
          unit="L"
          currentStreak={3}
          recordStreak={8}
        />
      );

      const avgIntake = screen.getByTestId('stats-average-intake');
      expect(avgIntake.textContent).toContain('0,0 L');

      const recordStreakBadge = screen.getByTestId('stats-record-streak');
      expect(recordStreakBadge.textContent).toContain('8 ngày');
    });
  });

  // ==========================================================================
  // 7. ProfileTab Tests
  // ==========================================================================
  describe('ProfileTab Screen (ProfileTab.tsx)', () => {
    it('unblocks all 6 companions 100% free with zero paywall locks', () => {
      expect(COMPANIONS_CATALOG.length).toBe(6);
      const locked = COMPANIONS_CATALOG.filter((c) => c.locked);
      expect(locked.length).toBe(0);

      const names = COMPANIONS_CATALOG.map((c) => c.name);
      expect(names).toContain('Voyager Nguyên Bản');
      expect(names).toContain('Voyager Tinh Vân');
      expect(names).toContain('Voyager Thủy Thủ');
      expect(names).toContain('Voyager Hòa Âm');
      expect(names).toContain('Voyager Hoàng Hôn');
      expect(names).toContain('Voyager Siêu Tân Tinh');
    });

    it('unblocks all 4 space themes 100% free', () => {
      expect(COSMIC_THEMES_CATALOG.length).toBe(4);
      const locked = COSMIC_THEMES_CATALOG.filter((t) => t.locked);
      expect(locked.length).toBe(0);

      const ids = COSMIC_THEMES_CATALOG.map((t) => t.id);
      expect(ids).toContain('deep_space');
      expect(ids).toContain('nebula_aurora');
      expect(ids).toContain('supernova_gold');
      expect(ids).toContain('cosmic_ocean');
    });

    it('renders verbatim local storage disclaimer and default username Mạnh', () => {
      render(<ProfileTab />);
      expect(screen.getByText('Tiến độ lưu trên máy này.')).toBeDefined();

      const usernameInput = screen.getByTestId('profile-username-input') as HTMLInputElement;
      expect(usernameInput.value).toBe('Mạnh');
    });
  });
});
