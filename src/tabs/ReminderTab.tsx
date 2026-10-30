import { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  Feather,
  Clock,
  BrainCircuit,
  Sun,
  Moon,
  Volume2,
  Play,
  Check,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import VoyagerChibi from '../components/VoyagerChibi';
import {
  scheduleNextReminders,
  cancelAllReminders,
  isInQuietHours,
  ScheduleRemindersParams,
  ReminderMode
} from '../utils/notificationEngine';
import { playCosmicSound, playQuickTap, SoundType } from '../utils/audioEngine';
import type { AppSettings } from '../utils/storageEngine';
import type { UserProfile } from '../types';

export interface ReminderTabProps {
  settings: AppSettings;
  profile?: UserProfile;
  targetMl: number;
  consumedMl: number;
  onUpdateSettings: (updated: Partial<AppSettings>) => void | Promise<void>;
  onScheduleReminders?: (params: ScheduleRemindersParams) => Promise<Date | null>;
  className?: string;
}

export const ReminderTab: React.FC<ReminderTabProps> = ({
  settings,
  targetMl,
  consumedMl,
  onUpdateSettings,
  onScheduleReminders,
  className = '',
}) => {
  const [nextReminderDate, setNextReminderDate] = useState<Date | null>(null);
  const [countdownText, setCountdownText] = useState<string>('Đang tính toán...');
  const [previewingSound, setPreviewingSound] = useState<SoundType | null>(null);

  // Wake and Sleep time
  const wakeTime = settings.wakeTime || '07:00';
  const sleepTime = settings.sleepTime || '01:00';
  const isEnabled = settings.reminderEnabled;
  const currentMode = settings.reminderMode || 'smart';

  // Check if currently inside quiet hours
  const isQuietNow = useMemo(() => {
    return isInQuietHours(new Date(), wakeTime, sleepTime);
  }, [wakeTime, sleepTime]);

  // Initial schedule calculation
  useEffect(() => {
    let isMounted = true;
    const initSchedule = async () => {
      if (!isEnabled) {
        setNextReminderDate(null);
        return;
      }
      try {
        const scheduleFn = onScheduleReminders || scheduleNextReminders;
        const nextTime = await scheduleFn({
          enabled: true,
          mode: currentMode,
          targetMl,
          consumedMl,
          wakeTime,
          sleepTime,
        });
        if (isMounted) setNextReminderDate(nextTime);
      } catch (err) {
        console.warn('[ReminderTab] Failed to schedule reminders:', err);
      }
    };

    initSchedule();
    return () => {
      isMounted = false;
    };
  }, [isEnabled, currentMode, targetMl, consumedMl, wakeTime, sleepTime, onScheduleReminders]);

  // Countdown timer loop conforming to Tests 11.1, 11.6, 11.10
  useEffect(() => {
    const updateCountdown = () => {
      if (!isEnabled) {
        setCountdownText('Đã tắt nhắc nhở');
        return;
      }
      if (!nextReminderDate) {
        setCountdownText('Chưa lên lịch');
        return;
      }
      const nowMs = Date.now();
      const diffMs = nextReminderDate.getTime() - nowMs;
      if (diffMs <= 0) {
        setCountdownText('Đã đến giờ uống nước!');
        return;
      }
      const hours = Math.floor(diffMs / (60 * 60 * 1000));
      const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
      setCountdownText(`Sau ${hours} giờ ${minutes} phút`);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 10000);
    return () => clearInterval(timer);
  }, [nextReminderDate, isEnabled]);

  // Master switch toggle
  const handleToggleReminder = async () => {
    playQuickTap();
    const nextState = !isEnabled;
    await onUpdateSettings({ reminderEnabled: nextState });

    if (!nextState) {
      await cancelAllReminders();
      setNextReminderDate(null);
    } else {
      const scheduleFn = onScheduleReminders || scheduleNextReminders;
      const nextTime = await scheduleFn({
        enabled: true,
        mode: currentMode,
        targetMl,
        consumedMl,
        wakeTime,
        sleepTime,
      });
      setNextReminderDate(nextTime);
    }
  };

  // Change mode
  const handleSelectMode = async (mode: ReminderMode) => {
    playQuickTap();
    await onUpdateSettings({ reminderMode: mode });
    if (isEnabled) {
      const scheduleFn = onScheduleReminders || scheduleNextReminders;
      const nextTime = await scheduleFn({
        enabled: true,
        mode,
        targetMl,
        consumedMl,
        wakeTime,
        sleepTime,
      });
      setNextReminderDate(nextTime);
    }
  };

  // Sound audition without modifying intake state
  const handlePreviewSound = (e: React.MouseEvent, sound: SoundType) => {
    e.stopPropagation();
    playCosmicSound(sound, { volume: 1.0 });
    setPreviewingSound(sound);
    setTimeout(() => setPreviewingSound(null), 1200);
  };

  // Select sound
  const handleSelectSound = async (sound: SoundType) => {
    playQuickTap();
    await onUpdateSettings({ selectedSound: sound });
  };

  return (
    <div className={`space-y-4 pb-20 select-none ${className}`}>
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-cosmic-gold" />
            Nhắc nhở vũ trụ
          </h2>
          <p className="text-xs text-cosmic-muted mt-0.5">
            Tiếng chuông ngân hà & nhịp sinh học
          </p>
        </div>
        <div
          className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
            isEnabled
              ? 'text-emerald-400 bg-emerald-950/40 border-emerald-500/40'
              : 'text-slate-400 bg-slate-900 border-slate-700'
          }`}
        >
          {isEnabled ? 'Đang hoạt động' : 'Đã tắt nhắc nhở'}
        </div>
      </div>

      {/* Card 1: Thẻ Nhắc lần tới (Next Reminder Countdown) */}
      <div className="bg-cosmic-card border-2 border-cosmic-border rounded-2xl p-4 shadow-card">
        <div className="flex items-center gap-4">
          {/* Voyager Chibi with Cosmic Bell */}
          <div className="relative">
            <VoyagerChibi
              size="md"
              expression={isQuietNow ? 'sleeping' : isEnabled ? 'gentle' : 'idle'}
              showAura={isEnabled}
              showSpeechBubble={true}
              speechText={
                isQuietNow
                  ? 'Suýt... Tinh cầu đang say giấc 🌙'
                  : isEnabled
                  ? 'Keng! Voyager luôn nhắc đúng giờ ✨'
                  : 'Voyager đang nghỉ ngơi...'
              }
            />
            {/* Cosmic Bell Badge */}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-cosmic-gold border-2 border-cosmic-border flex items-center justify-center text-slate-900 shadow-md">
              <Bell className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Countdown & Info */}
          <div className="flex-1 min-w-0">
            <div className="text-xs text-cosmic-muted font-medium uppercase tracking-wider">
              Lần nhắc kế tiếp
            </div>
            <div
              data-testid="reminder-countdown"
              className={`text-lg font-black tracking-tight mt-0.5 truncate ${
                isEnabled ? 'text-cosmic-blue' : 'text-slate-400'
              }`}
            >
              {countdownText}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <span>Chế độ:</span>
              <span className="font-semibold text-white capitalize">
                {currentMode === 'smart'
                  ? 'Thông minh'
                  : currentMode === 'gentle'
                  ? 'Nhẹ nhàng'
                  : 'Đều đặn'}
              </span>
            </div>
          </div>

          {/* Master Switch Toggle Button */}
          <div>
            <button
              type="button"
              data-testid="master-reminder-toggle"
              onClick={handleToggleReminder}
              className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-200 border-2 border-cosmic-border shadow-sm ${
                isEnabled ? 'bg-cosmic-blue' : 'bg-slate-700'
              }`}
              aria-label="Bật hoặc tắt nhắc uống nước"
            >
              <div
                className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-200 flex items-center justify-center ${
                  isEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              >
                {isEnabled ? (
                  <Check className="w-3.5 h-3.5 text-cosmic-deep stroke-[3]" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-slate-400" />
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Card 2: Mục Cách nhắc (3 Reminder Mode Selector Cards) */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-cosmic-muted">
          Cách thức nhắc nhở
        </h3>
        <div className="grid grid-cols-1 gap-2.5">
          {/* Mode 1: Thông minh (Default) */}
          <div
            onClick={() => handleSelectMode('smart')}
            className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
              currentMode === 'smart'
                ? 'bg-cosmic-card border-cosmic-blue shadow-[0_4px_0_#0284C7] ring-1 ring-cosmic-blue/40'
                : 'bg-cosmic-card/70 border-cosmic-border shadow-card hover:border-slate-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center border-2 ${
                    currentMode === 'smart'
                      ? 'bg-cosmic-blue/20 border-cosmic-blue text-cosmic-blue'
                      : 'bg-slate-800 border-cosmic-border text-slate-400'
                  }`}
                >
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    Thông minh
                    <span className="text-[10px] font-semibold text-cosmic-gold bg-amber-950/40 px-1.5 py-0.5 rounded-md border border-amber-500/30">
                      Mặc định
                    </span>
                  </div>
                  <div className="text-xs text-cosmic-muted mt-0.5">
                    Thích ứng (45 - 150 phút) theo lượng nước còn thiếu
                  </div>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  currentMode === 'smart'
                    ? 'border-cosmic-blue bg-cosmic-blue text-slate-900'
                    : 'border-slate-600'
                }`}
              >
                {currentMode === 'smart' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </div>
          </div>

          {/* Mode 2: Đều đặn (90 min) */}
          <div
            onClick={() => handleSelectMode('regular')}
            className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
              currentMode === 'regular'
                ? 'bg-cosmic-card border-cosmic-blue shadow-[0_4px_0_#0284C7] ring-1 ring-cosmic-blue/40'
                : 'bg-cosmic-card/70 border-cosmic-border shadow-card hover:border-slate-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center border-2 ${
                    currentMode === 'regular'
                      ? 'bg-cosmic-blue/20 border-cosmic-blue text-cosmic-blue'
                      : 'bg-slate-800 border-cosmic-border text-slate-400'
                  }`}
                >
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Đều đặn</div>
                  <div className="text-xs text-cosmic-muted mt-0.5">
                    Cố định 90 phút / lần (1.5 giờ) duy trì nhịp đều
                  </div>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  currentMode === 'regular'
                    ? 'border-cosmic-blue bg-cosmic-blue text-slate-900'
                    : 'border-slate-600'
                }`}
              >
                {currentMode === 'regular' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </div>
          </div>

          {/* Mode 3: Nhẹ nhàng (180 min) */}
          <div
            onClick={() => handleSelectMode('gentle')}
            className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
              currentMode === 'gentle'
                ? 'bg-cosmic-card border-cosmic-blue shadow-[0_4px_0_#0284C7] ring-1 ring-cosmic-blue/40'
                : 'bg-cosmic-card/70 border-cosmic-border shadow-card hover:border-slate-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center border-2 ${
                    currentMode === 'gentle'
                      ? 'bg-cosmic-blue/20 border-cosmic-blue text-cosmic-blue'
                      : 'bg-slate-800 border-cosmic-border text-slate-400'
                  }`}
                >
                  <Feather className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Nhẹ nhàng</div>
                  <div className="text-xs text-cosmic-muted mt-0.5">
                    Thưa thả 180 phút / lần (3 giờ) tập trung làm việc
                  </div>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  currentMode === 'gentle'
                    ? 'border-cosmic-blue bg-cosmic-blue text-slate-900'
                    : 'border-slate-600'
                }`}
              >
                {currentMode === 'gentle' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: Mục Giờ giấc & Giờ yên lặng (Quiet Hours) */}
      <div className="bg-cosmic-card border-2 border-cosmic-border rounded-2xl p-4 shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cosmic-purple" />
            Giờ giấc & Giờ yên lặng
          </h3>
          <span className="text-xs text-cosmic-muted font-mono">
            {sleepTime} - {wakeTime}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Wake Time */}
          <div className="p-2.5 rounded-xl bg-slate-900 border-2 border-cosmic-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-slate-300">Thức dậy</span>
            </div>
            <input
              type="time"
              value={wakeTime}
              onChange={(e) => {
                const val = e.target.value || '07:00';
                onUpdateSettings({ wakeTime: val });
              }}
              className="bg-transparent text-white font-mono font-bold text-xs outline-none cursor-pointer"
            />
          </div>

          {/* Sleep Time */}
          <div className="p-2.5 rounded-xl bg-slate-900 border-2 border-cosmic-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-400" />
              <span className="text-xs text-slate-300">Đi ngủ</span>
            </div>
            <input
              type="time"
              value={sleepTime}
              onChange={(e) => {
                const val = e.target.value || '01:00';
                onUpdateSettings({ sleepTime: val });
              }}
              className="bg-transparent text-white font-mono font-bold text-xs outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Quiet Hours Explanation */}
        <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <span>
            Thông báo tự động khóa trong khung Giờ yên lặng ({sleepTime} - {wakeTime}) và
            sẽ hoãn đến {wakeTime} sáng để bạn có một giấc ngủ an lành.
          </span>
        </div>
      </div>

      {/* Card 4: Mục Âm báo (Cosmic Sound Previewer) */}
      <div className="bg-cosmic-card border-2 border-cosmic-border rounded-2xl p-4 shadow-card space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-cosmic-blue" />
          Âm báo ngân hà
        </h3>

        <div className="grid grid-cols-1 gap-2.5">
          {/* Sound 1: Gợn nhẹ */}
          <div
            onClick={() => handleSelectSound('ripple')}
            className={`p-3 rounded-xl border-2 transition-all flex items-center justify-between cursor-pointer ${
              settings.selectedSound === 'ripple'
                ? 'bg-slate-900 border-cosmic-blue'
                : 'bg-slate-900/60 border-cosmic-border hover:border-slate-500'
            }`}
          >
            <div>
              <div className="text-sm font-semibold text-white">Gợn nhẹ</div>
              <div className="text-xs text-cosmic-muted">Giọt sương ngân hà & gợn sóng vũ trụ</div>
            </div>
            <button
              type="button"
              onClick={(e) => handlePreviewSound(e, 'ripple')}
              className={`px-3 py-1.5 rounded-lg border-2 border-cosmic-border text-xs font-bold flex items-center gap-1.5 active:translate-y-0.5 ${
                previewingSound === 'ripple'
                  ? 'bg-cosmic-blue text-slate-950 border-cosmic-blue'
                  : 'bg-cosmic-card text-cosmic-blue hover:bg-slate-800'
              }`}
            >
              <Play className="w-3 h-3 fill-current" />
              Thử âm
            </button>
          </div>

          {/* Sound 2: Violin Tinh cầu */}
          <div
            onClick={() => handleSelectSound('violin')}
            className={`p-3 rounded-xl border-2 transition-all flex items-center justify-between cursor-pointer ${
              settings.selectedSound === 'violin'
                ? 'bg-slate-900 border-cosmic-blue'
                : 'bg-slate-900/60 border-cosmic-border hover:border-slate-500'
            }`}
          >
            <div>
              <div className="text-sm font-semibold text-white">Violin Tinh cầu</div>
              <div className="text-xs text-cosmic-muted">Vĩ cầm Reverse: 1999 ngân nga</div>
            </div>
            <button
              type="button"
              onClick={(e) => handlePreviewSound(e, 'violin')}
              className={`px-3 py-1.5 rounded-lg border-2 border-cosmic-border text-xs font-bold flex items-center gap-1.5 active:translate-y-0.5 ${
                previewingSound === 'violin'
                  ? 'bg-cosmic-blue text-slate-950 border-cosmic-blue'
                  : 'bg-cosmic-card text-cosmic-blue hover:bg-slate-800'
              }`}
            >
              <Play className="w-3 h-3 fill-current" />
              Thử âm
            </button>
          </div>

          {/* Sound 3: Chuông bong bóng */}
          <div
            onClick={() => handleSelectSound('bubble')}
            className={`p-3 rounded-xl border-2 transition-all flex items-center justify-between cursor-pointer ${
              settings.selectedSound === 'bubble'
                ? 'bg-slate-900 border-cosmic-blue'
                : 'bg-slate-900/60 border-cosmic-border hover:border-slate-500'
            }`}
          >
            <div>
              <div className="text-sm font-semibold text-white">Chuông bong bóng</div>
              <div className="text-xs text-cosmic-muted">Pha lê lấp lánh réo rắt</div>
            </div>
            <button
              type="button"
              onClick={(e) => handlePreviewSound(e, 'bubble')}
              className={`px-3 py-1.5 rounded-lg border-2 border-cosmic-border text-xs font-bold flex items-center gap-1.5 active:translate-y-0.5 ${
                previewingSound === 'bubble'
                  ? 'bg-cosmic-blue text-slate-950 border-cosmic-blue'
                  : 'bg-cosmic-card text-cosmic-blue hover:bg-slate-800'
              }`}
            >
              <Play className="w-3 h-3 fill-current" />
              Thử âm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReminderTab;
