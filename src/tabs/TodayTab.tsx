import { useState, useEffect, useMemo, useCallback } from 'react';
import { Flame, Plus, Check, Droplets, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import WaveTank from '../components/WaveTank';
import {
  WeatherData,
  UserProfile,
} from '../types';
import {
  calculateDailyWaterGoal,
  fetchWeatherData,
  canonicalFormatVolume,
  canonicalRemainingCups,
} from '../utils/hydrationEngine';
import {
  getStorageItem,
  setStorageItem,
  STORAGE_KEYS,
  DEFAULT_USER_PROFILE,
  DEFAULT_SETTINGS,
  DailyLogsMap,
  HydrationEntry,
  AppSettings,
} from '../utils/storageEngine';
import {
  playQuickTap,
  playGoalCelebrationFanfare,
} from '../utils/audioEngine';

export interface TodayTabProps {
  currentMl?: number;
  goalMl?: number;
  streak?: number;
  weather?: WeatherData | null;
  userProfile?: UserProfile;
  settings?: AppSettings;
  customAvatar?: string | null;
  isQuietNow?: boolean;
  onLogDrink?: (amountMl: number) => void;
  onNavigateTab?: (tabId: string) => void;
}

export const QUICK_DRINK_OPTIONS = [
  { amount: 50, label: '+50 ml', isDefault: false },
  { amount: 150, label: '+150 ml', isDefault: false },
  { amount: 250, label: '+250 ml', isDefault: true },
  { amount: 500, label: '+500 ml', isDefault: false },
] as const;

export const TodayTab: React.FC<TodayTabProps> = ({
  currentMl: propCurrentMl,
  goalMl: propGoalMl,
  streak: propStreak,
  weather: propWeather,
  userProfile: propProfile,
  settings: propSettings,
  customAvatar: propAvatar,
  isQuietNow: propQuiet,
  onLogDrink,
}) => {
  // 1. Storage & State Hydration
  const [profile] = useState<UserProfile>(
    () => propProfile || getStorageItem(STORAGE_KEYS.USER_PROFILE, DEFAULT_USER_PROFILE)
  );
  const [settings] = useState<AppSettings>(
    () => propSettings || getStorageItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS)
  );
  const [weather, setWeather] = useState<WeatherData | null>(propWeather || null);
  const [streak] = useState<number>(() => propStreak ?? getStorageItem(STORAGE_KEYS.STREAK, 1));

  // Current day string "YYYY-MM-DD"
  const todayKey = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Today's consumed amount
  const [consumedMl, setConsumedMl] = useState<number>(() => {
    if (propCurrentMl !== undefined) return propCurrentMl;
    const logs = getStorageItem<DailyLogsMap>(STORAGE_KEYS.DAILY_LOGS, {});
    return logs[todayKey]?.consumedMl || 0;
  });

  // Modal dialog state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customInputMl, setCustomInputMl] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  // Chibi speech text
  const [speechText, setSpeechText] = useState<string | null>(null);

  // Sync prop changes
  useEffect(() => {
    if (propCurrentMl !== undefined) setConsumedMl(propCurrentMl);
  }, [propCurrentMl]);

  useEffect(() => {
    if (propWeather !== undefined) setWeather(propWeather);
  }, [propWeather]);

  // Fetch live weather on mount if not provided
  useEffect(() => {
    if (!weather) {
      fetchWeatherData().then((w) => setWeather(w)).catch(() => {});
    }
  }, []);

  // 2. Compute Daily Target Volume
  const goalMl = useMemo(() => {
    if (propGoalMl !== undefined) return propGoalMl;
    if (profile.customDailyTargetMl) return profile.customDailyTargetMl;
    const bonus = profile.autoWeatherAdjust && weather ? weather.bonusMl : 0;
    return calculateDailyWaterGoal(profile.weightKg, profile.activityLevel, bonus);
  }, [propGoalMl, profile, weather]);

  // Remaining cups calculation (250ml standard glass)
  const remainingCups = useMemo(() => {
    return canonicalRemainingCups(goalMl, consumedMl, 250);
  }, [goalMl, consumedMl]);

  // Formatted Readout
  const unit = (propProfile?.unit || propSettings?.unit || profile.unit || settings.unit || 'L');
  const consumedFormatted = canonicalFormatVolume(consumedMl, unit);
  const goalFormatted = canonicalFormatVolume(goalMl, unit);

  // 3. Starlight Confetti Celebration Trigger
  const triggerCelebration = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#38BDF8', '#FBBF24', '#818CF8', '#FFFFFF', '#FDE047'],
          disableForReducedMotion: true,
        });
      }
    } catch (e) {
      console.warn('[TodayTab] Confetti error:', e);
    }
    if (settings.soundEnabled) {
      playGoalCelebrationFanfare().catch(() => {});
    }
  }, [settings.soundEnabled]);

  // 4. Drink Logging Action
  const logIntake = useCallback(
    (amount: number) => {
      if (amount <= 0) return;
      playQuickTap();

      const prevConsumed = consumedMl;
      const nextConsumed = prevConsumed + amount;
      setConsumedMl(nextConsumed);

      // Check if crossing 100% goal for the first time today
      if (prevConsumed < goalMl && nextConsumed >= goalMl) {
        triggerCelebration();
        setSpeechText('Thuyền trưởng thật tuyệt vời! Mục tiêu đã hoàn thành! 🎉');
      } else {
        setSpeechText(`+${amount}ml đã được ghi nhận vào nhật ký ngân hà! ✨`);
      }

      // Persist to storage
      const now = new Date();
      const logs = getStorageItem<DailyLogsMap>(STORAGE_KEYS.DAILY_LOGS, {});
      const existingRecord = logs[todayKey] || {
        date: todayKey,
        targetMl: goalMl,
        consumedMl: 0,
        entries: [],
        isGoalReached: false,
      };

      const newEntry: HydrationEntry = {
        id: `log_${Date.now()}`,
        timestamp: Date.now(),
        time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        amountMl: amount,
        containerType: 'glass',
      };

      const updatedRecord = {
        ...existingRecord,
        targetMl: goalMl,
        consumedMl: nextConsumed,
        entries: [newEntry, ...existingRecord.entries],
        isGoalReached: nextConsumed >= goalMl,
      };

      logs[todayKey] = updatedRecord;
      setStorageItem(STORAGE_KEYS.DAILY_LOGS, logs);

      if (onLogDrink) onLogDrink(amount);
    },
    [consumedMl, goalMl, todayKey, triggerCelebration, onLogDrink]
  );

  // 5. Custom Modal Submission
  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(customInputMl.trim());
    if (isNaN(val) || !Number.isInteger(val) || val <= 0 || val > 5000) {
      setModalError('Vui lòng nhập số nguyên dương hợp lệ từ 1 đến 5000 ml.');
      return;
    }
    logIntake(val);
    setCustomInputMl('');
    setModalError(null);
    setIsModalOpen(false);
  };

  return (
    <div
      data-testid="today-tab-screen"
      className="flex flex-col gap-4 pb-24 px-4 pt-3 max-w-md mx-auto select-none"
    >
      {/* ==================================================================== */}
      {/* Header: Streak Flame, Title, Weather Widget                          */}
      {/* ==================================================================== */}
      <header className="flex items-center justify-between">
        {/* Left: Streak Flame Badge */}
        <div
          data-testid="streak-badge"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border-2 border-[#1E293B] bg-[#131B2E] shadow-[0_2px_0_#1E293B]"
        >
          <Flame className="w-5 h-5 text-amber-400 fill-amber-400 animate-pulse" />
          <span className="text-xs font-black text-amber-200">
            {propStreak ?? streak} ngày
          </span>
        </div>

        {/* Center: Title */}
        <div className="text-center">
          <h1 className="text-lg font-black tracking-tight text-white">Hôm nay</h1>
        </div>

        {/* Right: Weather Widget */}
        <div
          data-testid="weather-widget"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border-2 border-[#1E293B] bg-[#131B2E] shadow-[0_2px_0_#1E293B]"
        >
          <span className="text-xs font-black text-sky-300">
            {weather ? `${Math.round(weather.temperature)}°C` : '26°C'}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            {weather ? `${weather.humidity}%` : '60%'}
          </span>
          {weather && weather.bonusMl > 0 && (
            <span className="text-[10px] font-bold text-amber-300 bg-amber-400/20 px-1 rounded">
              +{weather.bonusMl}ml
            </span>
          )}
        </div>
      </header>

      {/* ==================================================================== */}
      {/* Central Volume Readout & Cup Deficit Prompt Card                    */}
      {/* ==================================================================== */}
      <section className="flex flex-col items-center justify-center p-4 rounded-3xl border-2 border-[#1E293B] bg-[#131B2E] shadow-[0_4px_0_#1E293B] text-center">
        {/* Large Readout: e.g. "1,0 L / 1,6 L" */}
        <div className="flex items-baseline gap-2">
          <span
            data-testid="consumed-volume"
            className="text-4xl font-black text-[#38BDF8] tracking-tight drop-shadow-[0_2px_10px_rgba(56,189,248,0.3)]"
          >
            {consumedFormatted}
          </span>
          <span className="text-xl font-bold text-slate-400">/</span>
          <span
            data-testid="goal-volume"
            className="text-2xl font-bold text-slate-300 tracking-tight"
          >
            {goalFormatted}
          </span>
        </div>

        {/* Deficit Prompt Card */}
        <button
          type="button"
          data-testid="deficit-prompt"
          onClick={() => {
            if (remainingCups > 0) logIntake(250);
          }}
          className="mt-2.5 px-3.5 py-1 rounded-full border border-sky-400/40 bg-sky-500/10 text-xs font-bold text-sky-200 hover:bg-sky-500/20 active:scale-95 transition-all shadow-[0_1px_0_#1E293B]"
        >
          {remainingCups > 0 ? `Thêm ${remainingCups} ly >` : 'Mục tiêu hoàn thành! Xuất sắc 🎉'}
        </button>
      </section>

      {/* ==================================================================== */}
      {/* Galaxy Wave Tank with Voyager Chibi Bobbing Atop Waves              */}
      {/* ==================================================================== */}
      <WaveTank
        currentMl={consumedMl}
        goalMl={goalMl}
        customImageUrl={propAvatar}
        isQuietNow={propQuiet}
        showSpeechBubble={Boolean(speechText)}
        speechText={speechText || undefined}
        onChibiClick={() => {
          setSpeechText('Thuyền trưởng, hãy nhớ bổ sung đủ nước cho cơ thể nhé! 🌌');
        }}
      />

      {/* ==================================================================== */}
      {/* Quick Drink Cluster: +50, +150, +250 (default checked), +500 ml      */}
      {/* ==================================================================== */}
      <section className="flex flex-col gap-2">
        <div className="grid grid-cols-4 gap-2">
          {QUICK_DRINK_OPTIONS.map((opt) => (
            <button
              key={opt.amount}
              type="button"
              data-testid={`quick-drink-${opt.amount}`}
              onClick={() => logIntake(opt.amount)}
              className={`relative flex flex-col items-center justify-center py-3 px-1 rounded-2xl border-2 transition-all active:translate-y-1 active:shadow-none ${
                opt.isDefault
                  ? 'border-[#38BDF8] bg-sky-950/40 text-white shadow-[0_4px_0_#0284C7]'
                  : 'border-[#1E293B] bg-[#131B2E] text-slate-200 shadow-[0_4px_0_#1E293B] hover:border-slate-600'
              }`}
            >
              {opt.isDefault && (
                <div
                  data-testid="default-checked-badge"
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#38BDF8] border border-white flex items-center justify-center text-slate-900"
                >
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}
              <Droplets className={`w-4 h-4 mb-1 ${opt.isDefault ? 'text-sky-300' : 'text-slate-400'}`} />
              <span className="text-xs font-black">{opt.label}</span>
            </button>
          ))}
        </div>

        {/* "+ Tự nhập" Custom Intake Button */}
        <button
          type="button"
          data-testid="custom-drink-button"
          onClick={() => {
            playQuickTap();
            setIsModalOpen(true);
          }}
          className="w-full py-2.5 rounded-2xl border-2 border-[#1E293B] bg-[#131B2E] shadow-[0_4px_0_#1E293B] text-xs font-black text-slate-300 hover:text-white hover:border-slate-600 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-1.5"
        >
          <Plus className="w-4 h-4 text-sky-400" />
          <span>+ Tự nhập lượng nước</span>
        </button>
      </section>

      {/* ==================================================================== */}
      {/* Custom Intake Modal Dialog                                          */}
      {/* ==================================================================== */}
      {isModalOpen && (
        <div
          data-testid="custom-intake-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn"
        >
          <div className="w-full max-w-sm rounded-3xl border-2 border-[#1E293B] bg-[#0B0F19] p-5 shadow-[0_6px_0_#1E293B] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-sky-400" />
                Ghi nhận nước uống tùy chọn
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCustomSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Lượng nước (ml):
                </label>
                <input
                  type="number"
                  min="1"
                  max="5000"
                  step="1"
                  placeholder="Ví dụ: 330"
                  value={customInputMl}
                  onChange={(e) => setCustomInputMl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#1E293B] bg-[#131B2E] text-white font-bold text-base focus:border-sky-400 focus:outline-none"
                  autoFocus
                />
                {modalError && (
                  <p className="text-[11px] font-bold text-rose-400 mt-1">{modalError}</p>
                )}
              </div>

              {/* Quick Preset Chips */}
              <div className="flex flex-wrap gap-1.5">
                {[100, 200, 330, 600, 1000].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setCustomInputMl(String(chip))}
                    className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 text-[11px] font-bold text-slate-300 hover:border-sky-400 active:scale-95"
                  >
                    {chip}ml
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border-2 border-[#1E293B] bg-[#131B2E] text-xs font-bold text-slate-300 active:translate-y-0.5"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl border-2 border-[#38BDF8] bg-[#0284C7] shadow-[0_3px_0_#0369A1] text-xs font-black text-white active:translate-y-0.5"
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TodayTab;
