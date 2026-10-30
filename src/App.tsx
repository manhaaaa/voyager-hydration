import { useState, useEffect, useCallback, useMemo } from 'react';
import NavigationBar, { TabId } from './components/NavigationBar';
import TodayTab from './tabs/TodayTab';
import ReminderTab from './tabs/ReminderTab';
import JournalTab from './tabs/JournalTab';
import StatsTab from './tabs/StatsTab';
import ProfileTab from './tabs/ProfileTab';

import type { UserProfile, WeatherData } from './types';
import {
  calculateDailyWaterGoal,
  fetchWeatherData
} from './utils/hydrationEngine';
import {
  loadAppState,
  saveAppState,
  reconcileStorage,
  STORAGE_KEYS,
  DEFAULT_USER_PROFILE,
  DEFAULT_SETTINGS,
  AppSettings,
  DailyLogsMap,
  DailyHydrationRecord,
  HydrationEntry
} from './utils/storageEngine';
import {
  playQuickTap,
  playGoalCelebrationFanfare,
  setAudioMuted
} from './utils/audioEngine';
import { isInQuietHours } from './utils/notificationEngine';
import confetti from 'canvas-confetti';

export default function App() {
  // 1. Core Profile & Settings
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);

  // 2. Hydration Logs & Streaks
  const [dailyLogs, setDailyLogs] = useState<DailyLogsMap>({});
  const [streak, setStreak] = useState<number>(1);
  const [recordStreak, setRecordStreak] = useState<number>(1);

  // 3. Environmental & Navigation State
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabId>('today');


  // Today date key "YYYY-MM-DD"
  const todayKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Today's calculated water target
  const todayTargetMl = useMemo(() => {
    if (profile.customDailyTargetMl && profile.customDailyTargetMl > 0) {
      return profile.customDailyTargetMl;
    }
    const bonus = profile.autoWeatherAdjust && weather ? weather.bonusMl : 0;
    return calculateDailyWaterGoal(profile.weightKg, profile.activityLevel, bonus);
  }, [profile, weather]);

  // Today's record
  const todayRecord: DailyHydrationRecord = useMemo(() => {
    return dailyLogs[todayKey] || {
      date: todayKey,
      targetMl: todayTargetMl,
      consumedMl: 0,
      entries: [],
      isGoalReached: false,
    };
  }, [dailyLogs, todayKey, todayTargetMl]);

  // Check quiet hours
  const isQuietNow = useMemo(() => {
    const wake = settings.wakeTime || profile.wakeTime || '07:00';
    const sleep = settings.sleepTime || profile.bedTime || '01:00';
    return isInQuietHours(new Date(), wake, sleep);
  }, [settings.wakeTime, settings.sleepTime, profile.wakeTime, profile.bedTime]);

  // 4. Initialization Lifecycle
  useEffect(() => {
    async function initializeApp() {
      try {
        // Step 1: Storage reconciliation pass (native Preferences <-> localStorage)
        await reconcileStorage();

        // Step 2: Hydrate state from dual-layer persistence
        const [savedProfile, savedSettings, savedLogs, savedStreak, savedRecordStreak, savedAvatar] =
          await Promise.all([
            loadAppState<UserProfile>(STORAGE_KEYS.USER_PROFILE, DEFAULT_USER_PROFILE),
            loadAppState<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS),
            loadAppState<DailyLogsMap>(STORAGE_KEYS.DAILY_LOGS, {}),
            loadAppState<number>(STORAGE_KEYS.STREAK, 1),
            loadAppState<number>('voyager_record_streak', 1),
            loadAppState<string | null>('voyager_custom_avatar', null),
          ]);

        setProfile(savedProfile);
        setSettings(savedSettings);
        setDailyLogs(savedLogs);
        setStreak(savedStreak);
        setRecordStreak(savedRecordStreak);
        setCustomAvatar(savedAvatar);
        setAudioMuted(!savedProfile.soundEnabled);

        // Step 3: Fetch weather with GPS and fallback
        setIsWeatherLoading(true);
        try {
          const liveWeather = await fetchWeatherData();
          setWeather(liveWeather);
        } catch (err) {
          console.warn('[App] Weather fetch error, fallback active:', err);
        } finally {
          setIsWeatherLoading(false);
        }

      } catch (err) {
        console.error('[App] Startup error:', err);
      }
    }

    initializeApp();
  }, []);

  // Sync audio mute state with profile
  useEffect(() => {
    setAudioMuted(!profile.soundEnabled);
  }, [profile.soundEnabled]);

  // 5. State Modification Handlers
  const handleUpdateProfile = useCallback(async (updated: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updated };
      saveAppState(STORAGE_KEYS.USER_PROFILE, next).catch(() => {});
      return next;
    });
  }, []);

  const handleUpdateSettings = useCallback(async (updated: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updated };
      saveAppState(STORAGE_KEYS.SETTINGS, next).catch(() => {});
      return next;
    });
  }, []);

  const handleUpdateAvatar = useCallback(async (dataUrl: string | null) => {
    setCustomAvatar(dataUrl);
    await saveAppState('voyager_custom_avatar', dataUrl);
  }, []);

  const handleRefreshWeather = useCallback(async () => {
    setIsWeatherLoading(true);
    try {
      const freshWeather = await fetchWeatherData();
      setWeather(freshWeather);
    } catch (e) {
      console.warn('[App] Weather refresh failed:', e);
    } finally {
      setIsWeatherLoading(false);
    }
  }, []);

  // Water intake logging
  const handleLogIntake = useCallback(
    (amountMl: number) => {
      if (amountMl <= 0) return;
      playQuickTap();

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      setDailyLogs((prevLogs) => {
        const existing = prevLogs[todayKey] || {
          date: todayKey,
          targetMl: todayTargetMl,
          consumedMl: 0,
          entries: [],
          isGoalReached: false,
        };

        const prevConsumed = existing.consumedMl;
        const newConsumed = prevConsumed + amountMl;
        const target = existing.targetMl || todayTargetMl;
        const isGoalReached = target > 0 && newConsumed >= target;
        const previouslyReached = existing.isGoalReached;

        // Crossing 100% celebration
        if (isGoalReached && !previouslyReached) {
          try {
            if (typeof window !== 'undefined') {
              confetti({
                particleCount: 90,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#38BDF8', '#FBBF24', '#818CF8', '#FFFFFF', '#FDE047'],
              });
            }
          } catch {}
          if (profile.soundEnabled) {
            playGoalCelebrationFanfare().catch(() => {});
          }

          // Advance streaks
          setStreak((s) => {
            const nextStreak = s + 1;
            saveAppState(STORAGE_KEYS.STREAK, nextStreak).catch(() => {});
            setRecordStreak((r) => {
              const nextRecord = Math.max(r, nextStreak);
              saveAppState('voyager_record_streak', nextRecord).catch(() => {});
              return nextRecord;
            });
            return nextStreak;
          });
        }

        const newEntry: HydrationEntry = {
          id: `log_${Date.now()}`,
          timestamp: Date.now(),
          time: timeStr,
          amountMl,
          containerType: 'glass',
        };

        const updatedRecord: DailyHydrationRecord = {
          ...existing,
          targetMl: target,
          consumedMl: newConsumed,
          entries: [newEntry, ...existing.entries],
          isGoalReached,
        };

        const nextLogs = { ...prevLogs, [todayKey]: updatedRecord };
        saveAppState(STORAGE_KEYS.DAILY_LOGS, nextLogs).catch(() => {});
        return nextLogs;
      });
    },
    [todayKey, todayTargetMl, profile.soundEnabled]
  );

  // Delete single entry from a day's journal
  const handleDeleteEntry = useCallback(
    async (date: string, entryId: string) => {
      playQuickTap();
      setDailyLogs((prev) => {
        const dayRecord = prev[date];
        if (!dayRecord) return prev;

        const updatedEntries = dayRecord.entries.filter((e) => e.id !== entryId);
        const updatedConsumed = updatedEntries.reduce((sum, e) => sum + e.amountMl, 0);
        const isGoalReached = dayRecord.targetMl > 0 && updatedConsumed >= dayRecord.targetMl;

        const nextRecord: DailyHydrationRecord = {
          ...dayRecord,
          consumedMl: updatedConsumed,
          entries: updatedEntries,
          isGoalReached,
        };

        const nextLogs = { ...prev, [date]: nextRecord };
        saveAppState(STORAGE_KEYS.DAILY_LOGS, nextLogs).catch(() => {});
        return nextLogs;
      });
    },
    []
  );

  return (
    <div className="min-h-screen bg-cosmic-void text-cosmic-text font-sans antialiased selection:bg-cosmic-blue/30">
      {/* Mobile Card-UI container frame */}
      <main className="max-w-md mx-auto min-h-screen bg-cosmic-void text-cosmic-text flex flex-col relative pb-24 pt-safe px-4">
        {/* Tab Router Views */}
        {activeTab === 'today' && (
          <TodayTab
            currentMl={todayRecord.consumedMl}
            goalMl={todayTargetMl}
            streak={streak}
            weather={weather}
            userProfile={profile}
            settings={settings}
            customAvatar={customAvatar}
            isQuietNow={isQuietNow}
            onLogDrink={handleLogIntake}
            onNavigateTab={(tab) => setActiveTab(tab as TabId)}
          />
        )}

        {activeTab === 'reminder' && (
          <ReminderTab
            settings={settings}
            profile={profile}
            targetMl={todayTargetMl}
            consumedMl={todayRecord.consumedMl}
            onUpdateSettings={handleUpdateSettings}
          />
        )}

        {activeTab === 'journal' && (
          <JournalTab
            dailyLogs={dailyLogs}
            settings={settings}
            currentStreak={streak}
            defaultTargetMl={todayTargetMl}
            unit={profile.unit}
            onDeleteEntry={handleDeleteEntry}
          />
        )}

        {activeTab === 'stats' && (
          <StatsTab
            dailyLogs={dailyLogs}
            currentDailyTargetMl={todayTargetMl}
            unit={profile.unit}
            customAvatar={customAvatar}
            currentStreak={streak}
            recordStreak={recordStreak}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileTab
            profile={profile}
            settings={settings}
            weather={weather}
            isWeatherLoading={isWeatherLoading}
            customAvatar={customAvatar}
            dailyLogs={dailyLogs}
            onUpdateProfile={handleUpdateProfile}
            onUpdateSettings={handleUpdateSettings}
            onUpdateAvatar={handleUpdateAvatar}
            onRefreshWeather={handleRefreshWeather}
          />
        )}

        {/* Fixed Bottom Navigation Bar */}
        <NavigationBar activeTab={activeTab} onTabChange={setActiveTab} />
      </main>
    </div>
  );
}
