import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Info,
  Medal,
  Trash2,
  Calendar as CalendarIcon,
  X,
  Droplet,
  Sparkles
} from 'lucide-react';
import { playQuickTap } from '../utils/audioEngine';
import type { DailyLogsMap, AppSettings } from '../utils/storageEngine';
import { getStorageItem, STORAGE_KEYS, DEFAULT_SETTINGS } from '../utils/storageEngine';

export interface JournalTabProps {
  dailyLogs?: DailyLogsMap;
  settings?: AppSettings;
  currentStreak?: number;
  defaultTargetMl?: number;
  unit?: 'ml' | 'L';
  onDeleteEntry?: (date: string, entryId: string) => void | Promise<void>;
  onSelectDate?: (date: string) => void;
  className?: string;
}

// Vietnamese weekday headers (Monday to Sunday)
export const WEEKDAY_HEADERS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;

// Helper to format local date YYYY-MM-DD
function formatLocalDate(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

// Smiling Flame SVG Icon Component
const SmilingFlameIcon: React.FC<{ size?: number }> = ({ size = 36 }) => {
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 36 36"
        fill="none"
        className="w-full h-full drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
      >
        <defs>
          <linearGradient id="flameGrad" x1="18" y1="2" x2="18" y2="34" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FDE047" />
            <stop offset="0.45" stopColor="#F59E0B" />
            <stop offset="1" stopColor="#EF4444" />
          </linearGradient>
        </defs>
        {/* Outer Flame Shape */}
        <path
          d="M18 2C18 2 24 8 24 16C24 17.5 23.6 19 23 20.3C22 17.5 19 15 19 15C19 15 20.5 19 19 22C17.5 19 15 17 15 12C15 12 11 16 11 21C11 26.5 14.1 32 18 34C10 32 6 25 6 19C6 11 14 5 18 2Z"
          fill="url(#flameGrad)"
        />
        <path
          d="M18 34C22 34 26 30 26 23C26 19 23 15 23 15C23 15 22 18 20 20C19 18 18 16 18 14C18 14 15 18 16 22C17 24 17.5 26 16.5 28C16 29 15 30 15 31C16 33 17 34 18 34Z"
          fill="#FEF08A"
        />
        {/* Cute Smiling Face on Flame */}
        <ellipse cx="14" cy="22" rx="1.2" ry="1.6" fill="#1E293B" />
        <ellipse cx="20" cy="22" rx="1.2" ry="1.6" fill="#1E293B" />
        <path
          d="M15 25.5C16 26.8 18 26.8 19 25.5"
          stroke="#1E293B"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

// Mini Cup SVG with dynamic water fill level (0% - 100%)
const CalendarCup: React.FC<{ fillPercentage: number; hasGoldMedal: boolean }> = ({
  fillPercentage,
  hasGoldMedal,
}) => {
  const clampedFill = Math.max(0, Math.min(100, fillPercentage));
  const fillHeight = (clampedFill / 100) * 12; // max cup body height is 12

  return (
    <div className="relative w-5 h-6 flex items-center justify-center">
      <svg width="18" height="22" viewBox="0 0 18 22" fill="none">
        {/* Cup Glass Contour */}
        <path
          d="M3 4L4.5 18C4.7 19.5 6 20.5 7.5 20.5H10.5C12 20.5 13.3 19.5 13.5 18L15 4H3Z"
          stroke={clampedFill > 0 ? '#38BDF8' : '#475569'}
          strokeWidth="1.5"
          fill="#0F172A"
        />
        {/* Liquid Fill */}
        {clampedFill > 0 && (
          <g>
            <clipPath id={`cupClip-${clampedFill}`}>
              <path d="M4 5L5.2 17.5C5.4 18.5 6.3 19.5 7.5 19.5H10.5C11.7 19.5 12.6 18.5 12.8 17.5L14 5H4Z" />
            </clipPath>
            <rect
              x="3"
              y={19 - fillHeight}
              width="12"
              height={fillHeight}
              fill={hasGoldMedal ? '#38BDF8' : '#0284C7'}
              clipPath={`url(#cupClip-${clampedFill})`}
            />
          </g>
        )}
      </svg>
      {/* Gold Medal / Star Badge if 100%+ achieved */}
      {hasGoldMedal && (
        <div
          data-testid="gold-medal-badge"
          className="absolute -top-1 -right-1 text-cosmic-gold animate-pulse drop-shadow-[0_0_4px_#FBBF24]"
        >
          <Medal className="w-3.5 h-3.5 fill-cosmic-gold stroke-[#1E293B] stroke-1" />
        </div>
      )}
    </div>
  );
};

export const JournalTab: React.FC<JournalTabProps> = ({
  dailyLogs: propDailyLogs,
  settings: propSettings,
  currentStreak: propStreak,
  defaultTargetMl = 2000,
  unit: propUnit,
  onDeleteEntry,
  onSelectDate,
  className = '',
}) => {
  const dailyLogs = useMemo(
    () => propDailyLogs || getStorageItem<DailyLogsMap>(STORAGE_KEYS.DAILY_LOGS, {}),
    [propDailyLogs]
  );
  const currentStreak = propStreak ?? getStorageItem<number>(STORAGE_KEYS.STREAK, 1);
  const unit = propUnit || propSettings?.unit || getStorageItem<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS).unit || 'L';

  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(
    () => formatLocalDate(today.getFullYear(), today.getMonth() + 1, today.getDate()),
    [today]
  );

  const [currentMonth, setCurrentMonth] = useState<{ year: number; month: number }>({
    year: today.getFullYear(),
    month: today.getMonth() + 1,
  });

  const [selectedDate, setSelectedDate] = useState<string>(todayKey);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);

  // Month navigation across year boundaries (Test 12.6)
  const handlePrevMonth = () => {
    playQuickTap();
    if (currentMonth.month === 1) {
      setCurrentMonth({ year: currentMonth.year - 1, month: 12 });
    } else {
      setCurrentMonth({ year: currentMonth.year, month: currentMonth.month - 1 });
    }
  };

  const handleNextMonth = () => {
    playQuickTap();
    if (currentMonth.month === 12) {
      setCurrentMonth({ year: currentMonth.year + 1, month: 1 });
    } else {
      setCurrentMonth({ year: currentMonth.year, month: currentMonth.month + 1 });
    }
  };

  // Calendar matrix calculations (Test 12.2, 12.10)
  const daysInMonth = useMemo(() => {
    return new Date(currentMonth.year, currentMonth.month, 0).getDate();
  }, [currentMonth.year, currentMonth.month]);

  // Leading empty days (Monday=0 ... Sunday=6)
  const leadingBlanks = useMemo(() => {
    const firstDay = new Date(currentMonth.year, currentMonth.month - 1, 1).getDay();
    return (firstDay + 6) % 7;
  }, [currentMonth.year, currentMonth.month]);

  // Day array for month
  const monthDays = useMemo(() => {
    const days: number[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    return days;
  }, [daysInMonth]);

  // Month string (Test 12.1)
  const monthLabel = `tháng ${currentMonth.month} năm ${currentMonth.year}`;

  // Selected Day records (Test 12.8)
  const selectedRecord = dailyLogs[selectedDate];
  const selectedEntries = selectedRecord?.entries || [];
  const selectedConsumed = selectedRecord ? selectedRecord.consumedMl : 0;
  const selectedTarget = selectedRecord && selectedRecord.targetMl > 0 ? selectedRecord.targetMl : defaultTargetMl;
  const isSelectedGoalMet = selectedTarget > 0 && selectedConsumed >= selectedTarget;

  const handleDayClick = (day: number) => {
    playQuickTap();
    const dateStr = formatLocalDate(currentMonth.year, currentMonth.month, day);
    setSelectedDate(dateStr);
    if (onSelectDate) onSelectDate(dateStr);
  };

  return (
    <div className={`space-y-4 pb-20 select-none ${className}`}>
      {/* Top Header & Month Navigator (Test 12.1) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-cosmic-blue" />
            Nhật ký ngân hà
          </h2>
          <button
            type="button"
            onClick={() => {
              playQuickTap();
              setShowInfoModal(true);
            }}
            className="p-1 rounded-full text-cosmic-muted hover:text-cosmic-blue hover:bg-slate-800 transition-colors"
            aria-label="Thông tin biểu tượng lịch"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        {/* Month Switcher Controls */}
        <div className="flex items-center gap-1.5 bg-cosmic-card border-2 border-cosmic-border rounded-xl px-2 py-1 shadow-sm">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 rounded-lg text-slate-400 hover:text-white active:bg-slate-800"
            aria-label="Tháng trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-white min-w-[125px] text-center capitalize">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 rounded-lg text-slate-400 hover:text-white active:bg-slate-800"
            aria-label="Tháng sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Monthly Calendar Grid (Test 12.2, 12.3, 12.4, 12.7) */}
      <div className="bg-cosmic-card border-2 border-cosmic-border rounded-2xl p-3 shadow-card">
        {/* 7 Weekday Header Row */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {WEEKDAY_HEADERS.map((dayName) => (
            <div key={dayName} className="text-xs font-bold text-cosmic-muted py-1">
              {dayName}
            </div>
          ))}
        </div>

        {/* Days Matrix */}
        <div className="grid grid-cols-7 gap-1.5">
          {/* Leading blank spacers */}
          {Array.from({ length: leadingBlanks }).map((_, idx) => (
            <div key={`blank-${idx}`} className="h-14 rounded-xl opacity-20 pointer-events-none" />
          ))}

          {/* Actual days of current month */}
          {monthDays.map((day) => {
            const dateStr = formatLocalDate(currentMonth.year, currentMonth.month, day);
            const isToday = dateStr === todayKey;
            const isSelected = dateStr === selectedDate;

            const rec = dailyLogs[dateStr];
            const consumed = rec ? rec.consumedMl : 0;
            const target = rec && rec.targetMl > 0 ? rec.targetMl : defaultTargetMl;
            const fillPct = target <= 0 ? 0 : Math.min(100, Math.round((consumed / target) * 100));
            const hasMedal = target > 0 && consumed >= target;

            return (
              <div
                key={`day-${day}`}
                data-testid={`calendar-day-${day}`}
                onClick={() => handleDayClick(day)}
                className={`h-14 rounded-xl border-2 flex flex-col items-center justify-between p-1 transition-all cursor-pointer relative ${
                  isSelected
                    ? 'border-cosmic-blue bg-cosmic-blue/10 shadow-[0_0_10px_rgba(56,189,248,0.35)]'
                    : isToday
                    ? 'border-cosmic-gold/60 bg-amber-950/20 hover:border-cosmic-blue'
                    : 'border-cosmic-border bg-slate-900/60 hover:border-slate-500'
                }`}
              >
                {/* Day number header */}
                <div className="flex items-center justify-between w-full px-0.5">
                  <span
                    className={`text-[11px] font-bold ${
                      isSelected
                        ? 'text-cosmic-blue'
                        : isToday
                        ? 'text-cosmic-gold'
                        : 'text-slate-300'
                    }`}
                  >
                    {day}
                  </span>
                  {isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cosmic-gold animate-ping" />
                  )}
                </div>

                {/* Mini Cup Water Graphic with Medal */}
                <CalendarCup fillPercentage={fillPct} hasGoldMedal={hasMedal} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Details Section (Test 12.8) */}
      <div className="bg-cosmic-card border-2 border-cosmic-border rounded-2xl p-4 shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">
              Chi tiết ngày {selectedDate.split('-').reverse().join('/')}
            </h3>
            <div className="text-xs text-cosmic-muted mt-0.5">
              {unit === 'ml'
                ? `${selectedConsumed.toLocaleString()} / ${selectedTarget.toLocaleString()} ml`
                : `${(selectedConsumed / 1000).toFixed(1).replace('.', ',')} / ${(selectedTarget / 1000).toFixed(1).replace('.', ',')} L`}
              {selectedTarget > 0 && ` (${Math.round((selectedConsumed / selectedTarget) * 100)}%)`}
            </div>
          </div>
          <div
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 ${
              isSelectedGoalMet
                ? 'text-cosmic-gold bg-amber-950/40 border-amber-500/40'
                : selectedConsumed > 0
                ? 'text-cosmic-blue bg-sky-950/40 border-sky-500/40'
                : 'text-slate-400 bg-slate-900 border-slate-700'
            }`}
          >
            {isSelectedGoalMet ? (
              <>
                <Medal className="w-3.5 h-3.5 text-cosmic-gold" />
                Đạt mục tiêu
              </>
            ) : selectedConsumed > 0 ? (
              'Đang tích lũy'
            ) : (
              'Chưa có dữ liệu'
            )}
          </div>
        </div>

        {/* Entries Chronological List */}
        {selectedEntries.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {selectedEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-2.5 rounded-xl bg-slate-900/80 border border-cosmic-border flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cosmic-blue/10 border border-cosmic-blue/30 flex items-center justify-center text-cosmic-blue">
                    <Droplet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white font-mono">
                      {entry.time}
                    </div>
                    <div className="text-xs font-semibold text-cosmic-blue">
                      +{entry.amountMl} ml
                    </div>
                  </div>
                </div>

                {onDeleteEntry && (
                  <button
                    type="button"
                    onClick={() => onDeleteEntry(selectedDate, entry.id)}
                    className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors"
                    aria-label="Xóa lượt uống này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-cosmic-muted text-xs space-y-1">
            <Droplet className="w-6 h-6 mx-auto text-slate-600 mb-1" />
            <p>Chưa có lượt uống nào được ghi nhận trong ngày này.</p>
            <p className="text-[11px] text-slate-500">
              Hãy tiếp thêm năng lượng ngân hà cùng Voyager nhé!
            </p>
          </div>
        )}
      </div>

      {/* Card: Thẻ Chuỗi ngày (Smiling Flame Streak Card - Test 12.5) */}
      <div
        data-testid="streak-card"
        className="bg-cosmic-card border-2 border-cosmic-border rounded-2xl p-4 shadow-card flex items-center gap-4 relative overflow-hidden"
      >
        {/* Smiling Flame Icon */}
        <div className="shrink-0">
          <SmilingFlameIcon size={46} />
        </div>

        {/* Streak Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              data-testid="streak-days-count"
              className="text-2xl font-black text-white tracking-tight"
            >
              {currentStreak}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-cosmic-gold bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-500/30">
              Ngày liên tiếp 🔥
            </span>
          </div>
          <p
            data-testid="streak-quote"
            className="text-xs text-cosmic-muted mt-1 leading-relaxed"
          >
            Bạn đang giữ nhịp tốt. Hãy cùng Voyager duy trì nhé!
          </p>
        </div>
      </div>

      {/* Info Modal for Calendar Legend */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-cosmic-card border-2 border-cosmic-border rounded-3xl p-5 max-w-xs w-full shadow-2xl space-y-4 text-cosmic-text">
            <div className="flex items-center justify-between border-b border-cosmic-border pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cosmic-gold" />
                Giải mã Nhật ký ngân hà
              </h4>
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-6 h-7 rounded border border-slate-600 flex items-center justify-center text-slate-500">
                  <CalendarCup fillPercentage={0} hasGoldMedal={false} />
                </div>
                <div>
                  <div className="font-semibold text-white">Cốc rỗng (0%)</div>
                  <div className="text-cosmic-muted">Chưa ghi nhận lượt uống nào trong ngày.</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-6 h-7 rounded border border-cosmic-blue flex items-center justify-center">
                  <CalendarCup fillPercentage={50} hasGoldMedal={false} />
                </div>
                <div>
                  <div className="font-semibold text-white">Mực nước dâng (1% - 99%)</div>
                  <div className="text-cosmic-muted">Mực nước biểu thị % mục tiêu đã đạt.</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-6 h-7 rounded border border-cosmic-blue flex items-center justify-center">
                  <CalendarCup fillPercentage={100} hasGoldMedal={true} />
                </div>
                <div>
                  <div className="font-semibold text-white">Huy chương vàng 🏅 (100%+)</div>
                  <div className="text-cosmic-muted">Chúc mừng bạn đã hoàn thành mục tiêu ngày!</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-6 h-7 flex items-center justify-center">
                  <SmilingFlameIcon size={24} />
                </div>
                <div>
                  <div className="font-semibold text-white">Ngọn lửa mặt cười 🔥</div>
                  <div className="text-cosmic-muted">Chuỗi các ngày liên tiếp đạt mục tiêu.</div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowInfoModal(false)}
              className="w-full py-2 rounded-xl bg-cosmic-blue text-slate-950 font-bold text-xs border-2 border-cosmic-border shadow-card active:translate-y-0.5"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalTab;
