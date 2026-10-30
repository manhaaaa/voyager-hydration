import { useState, useMemo } from 'react';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Award,
  Droplets,
  Flame
} from 'lucide-react';
import VoyagerChibi from '../components/VoyagerChibi';
import { playQuickTap } from '../utils/audioEngine';
import type { DailyLogsMap } from '../utils/storageEngine';
import { getStorageItem, STORAGE_KEYS } from '../utils/storageEngine';

export interface StatsTabProps {
  dailyLogs?: DailyLogsMap;
  currentDailyTargetMl?: number;
  unit?: 'ml' | 'L';
  customAvatar?: string | null;
  currentStreak?: number;
  recordStreak?: number;
  className?: string;
}

export type TimeframeMode = 'week' | 'month' | 'custom';

export const DAY_LABELS: readonly string[] = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export interface DailyStatItem {
  dayLabel: string;      // 'T2'..'CN'
  dateStr: string;       // 'YYYY-MM-DD'
  consumedMl: number;
  targetMl: number;
  isGoalReached: boolean;
  fillPct: number;       // 0 to 100
  isPeak: boolean;
}

export function getMondayOfOffset(offsetWeeks: number = 0): Date {
  const now = new Date();
  const day = now.getDay(); // 0 is Sunday, 1 is Monday
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) + offsetWeeks * 7;
  const monday = new Date(now);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function formatWeekHeader(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const startDay = monday.getDate();
  const startMonth = monday.getMonth() + 1;
  const endDay = sunday.getDate();
  const endMonth = sunday.getMonth() + 1;
  return `< ${startDay}/${startMonth} - ${endDay}/${endMonth} >`;
}

export const StatsTab: React.FC<StatsTabProps> = ({
  dailyLogs: propDailyLogs,
  currentDailyTargetMl = 2000,
  unit = 'L',
  customAvatar = null,
  currentStreak = 0,
  recordStreak: propRecordStreak,
  className = '',
}) => {
  const dailyLogs = useMemo(
    () => propDailyLogs || getStorageItem<DailyLogsMap>(STORAGE_KEYS.DAILY_LOGS, {}),
    [propDailyLogs]
  );

  const [timeframe, setTimeframe] = useState<TimeframeMode>('week');
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [selectedBarDate, setSelectedBarDate] = useState<string | null>(null);

  // Record streak derivation
  const recordStreak = useMemo(() => {
    if (propRecordStreak !== undefined) return propRecordStreak;
    const storedRecord = getStorageItem<number>('voyager_record_streak', 0);
    return Math.max(storedRecord, currentStreak);
  }, [propRecordStreak, currentStreak]);

  // Compute Monday date of current selected week
  const currentMonday = useMemo(() => getMondayOfOffset(weekOffset), [weekOffset]);
  const weekRangeLabel = useMemo(() => formatWeekHeader(currentMonday), [currentMonday]);

  // Compute 7 days of the week
  const weeklyStats = useMemo(() => {
    const items: DailyStatItem[] = [];
    let totalMl = 0;
    let completedDays = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(currentMonday);
      d.setDate(currentMonday.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const record = dailyLogs[dateStr];
      const consumedMl = record?.consumedMl || 0;
      const targetMl = record && record.targetMl > 0 ? record.targetMl : currentDailyTargetMl;
      const isGoalReached = targetMl > 0 && consumedMl >= targetMl;

      totalMl += consumedMl;
      if (isGoalReached) completedDays++;

      items.push({
        dayLabel: DAY_LABELS[i],
        dateStr,
        consumedMl,
        targetMl,
        isGoalReached,
        fillPct: 0,
        isPeak: false,
      });
    }

    // Peak detection conforming to Test 13.6
    const peakDay = items.reduce((max, d) => (d.consumedMl > max.consumedMl ? d : max), items[0]);
    if (peakDay.consumedMl > 0) {
      peakDay.isPeak = true;
    }

    // Chart ceiling scaling conforming to Test 13.7
    const chartMaxMl = Math.max(currentDailyTargetMl * 1.25, ...items.map((d) => d.consumedMl), 2500);

    // Fill percentage calculation
    items.forEach((item) => {
      item.fillPct = Math.min(100, Math.round((item.consumedMl / chartMaxMl) * 100));
    });

    const averageMl = Math.round(totalMl / 7);
    const completionRatePct = Math.round((completedDays / 7) * 100);
    const goalHeightPct = Math.min(100, Math.round((currentDailyTargetMl / chartMaxMl) * 100));

    return {
      items,
      totalMl,
      averageMl,
      completedDays,
      completionRatePct,
      peakDay,
      chartMaxMl,
      goalHeightPct,
    };
  }, [dailyLogs, currentMonday, currentDailyTargetMl]);

  // Volume format helper
  const formatVol = (ml: number) => {
    if (unit === 'ml') {
      return `${ml.toLocaleString()} ml`;
    }
    const l = ml / 1000;
    const str = (ml % 1000 === 0) ? l.toFixed(1) : (ml % 100 === 0 ? l.toFixed(1) : l.toFixed(2));
    return `${str.replace('.', ',')} L`;
  };

  return (
    <div className={`space-y-4 pb-20 select-none ${className}`}>
      {/* ==================================================================== */}
      {/* Header & Segmented Timeframe Switcher (Test 13.1)                    */}
      {/* ==================================================================== */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-cosmic-blue" />
          Thống kê ngân hà
        </h2>

        {/* 3 Timeframe Segmented Switcher: Tuần, Tháng, Tùy chỉnh */}
        <div className="flex bg-cosmic-card border-2 border-cosmic-border rounded-xl p-0.5 shadow-sm">
          <button
            type="button"
            onClick={() => {
              playQuickTap();
              setTimeframe('week');
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              timeframe === 'week'
                ? 'bg-cosmic-blue text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tuần
          </button>
          <button
            type="button"
            onClick={() => {
              playQuickTap();
              setTimeframe('month');
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              timeframe === 'month'
                ? 'bg-cosmic-blue text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tháng
          </button>
          <button
            type="button"
            onClick={() => {
              playQuickTap();
              setTimeframe('custom');
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              timeframe === 'custom'
                ? 'bg-cosmic-blue text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tùy chỉnh
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* Week Navigator (Test 13.2: < DD/MM - DD/MM >)                        */}
      {/* ==================================================================== */}
      <div className="flex items-center justify-between bg-cosmic-card border-2 border-cosmic-border rounded-2xl px-4 py-2.5 shadow-card">
        <button
          type="button"
          onClick={() => {
            playQuickTap();
            setWeekOffset((o) => o - 1);
          }}
          className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white active:scale-95"
          aria-label="Tuần trước"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="text-xs font-black text-white tracking-wider">
          {weekRangeLabel}
        </span>

        <button
          type="button"
          onClick={() => {
            playQuickTap();
            setWeekOffset((o) => o + 1);
          }}
          className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white active:scale-95"
          aria-label="Tuần sau"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ==================================================================== */}
      {/* 7-Day Bar Chart Card (Tests 13.4, 13.5, 13.6, 13.7)                  */}
      {/* ==================================================================== */}
      <div className="bg-cosmic-card border-2 border-cosmic-border rounded-3xl p-5 shadow-card relative">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-bold uppercase tracking-wider text-cosmic-muted">
            Lượng nước mỗi ngày ({unit})
          </div>
          {weeklyStats.peakDay.consumedMl > 0 && (
            <div className="text-[11px] font-bold text-amber-300 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span>Đỉnh: {formatVol(weeklyStats.peakDay.consumedMl)}</span>
            </div>
          )}
        </div>

        {/* Chart Canvas Area */}
        <div className="h-64 relative flex items-end justify-between pt-14 pb-2 px-1">
          {/* Horizontal Dashed Target Reference Line (Test 13.5) */}
          <div
            className="absolute inset-x-0 border-t-2 border-dashed border-sky-400 z-10 pointer-events-none"
            style={{ bottom: `${weeklyStats.goalHeightPct}%` }}
          >
            <span className="absolute right-1 -top-4 text-[9px] font-bold text-sky-300 bg-[#0B0F19]/90 px-1 py-0.5 rounded border border-sky-400/40">
              Mục tiêu ({formatVol(currentDailyTargetMl)})
            </span>
          </div>

          {/* 7 Daily Bar Columns */}
          {weeklyStats.items.map((item) => {
            const isSelected = selectedBarDate === item.dateStr;
            return (
              <div
                key={item.dayLabel}
                onClick={() => {
                  playQuickTap();
                  setSelectedBarDate(isSelected ? null : item.dateStr);
                }}
                className="relative flex flex-col items-center flex-1 h-full justify-end cursor-pointer group"
              >
                {/* Mini Voyager Chibi Perched atop Peak Column (Test 13.6) */}
                {item.isPeak && item.consumedMl > 0 && (
                  <div
                    data-testid="peak-column-chibi"
                    className="absolute z-20 pointer-events-none transition-all duration-300 flex flex-col items-center"
                    style={{ bottom: `calc(${item.fillPct}% + 4px)` }}
                  >
                    <div className="scale-75 -mb-2">
                      <VoyagerChibi
                        size="sm"
                        expression="happy"
                        customImageUrl={customAvatar}
                        showAura={true}
                      />
                    </div>
                  </div>
                )}

                {/* Bar Track & Liquid Reservoir (Test 13.7) */}
                <div className="w-7 sm:w-9 h-44 bg-slate-800/40 rounded-xl relative overflow-hidden flex flex-col justify-end border border-slate-700/50">
                  {/* Filled Liquid Level */}
                  <div
                    className={`w-full rounded-t-lg transition-all duration-500 relative overflow-hidden ${
                      item.isGoalReached
                        ? 'bg-gradient-to-t from-sky-600 via-sky-400 to-amber-300 shadow-[0_0_8px_rgba(56,189,248,0.5)]'
                        : 'bg-gradient-to-t from-sky-700 via-sky-500 to-indigo-400'
                    }`}
                    style={{ height: `${item.fillPct}%` }}
                  >
                    {/* Glowing miniature bubble particles */}
                    {item.fillPct > 20 && (
                      <>
                        <div className="absolute bottom-2 left-1.5 w-1 h-1 rounded-full bg-white/70 animate-ping" />
                        <div className="absolute bottom-6 right-1.5 w-1 h-1 rounded-full bg-sky-200/60 animate-pulse" />
                      </>
                    )}
                  </div>
                </div>

                {/* Day Label (Test 13.4: T2 - CN) */}
                <span
                  className={`text-[11px] font-bold mt-2 transition-colors ${
                    item.isPeak ? 'text-amber-300' : 'text-slate-400 group-hover:text-white'
                  }`}
                >
                  {item.dayLabel}
                </span>

                {/* Active Tooltip */}
                {isSelected && (
                  <div className="absolute -top-7 z-30 bg-slate-900 border border-sky-400 rounded px-1.5 py-0.5 text-[10px] font-bold text-white shadow-lg whitespace-nowrap">
                    {formatVol(item.consumedMl)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* Summary Statistics Grid (Tests 13.3, 13.8, 13.9, 13.10)              */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-2 gap-3">
        {/* Card 1: Trung bình ngày (Test 13.3, 13.8) */}
        <div className="bg-cosmic-card border-2 border-cosmic-border rounded-2xl p-3.5 shadow-card space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-cosmic-muted uppercase">
            <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
            <span>Trung bình</span>
          </div>
          <div
            data-testid="stats-average-intake"
            className="text-lg font-black text-white"
          >
            {formatVol(weeklyStats.averageMl)}
          </div>
          <div className="text-[10px] text-slate-400">Mỗi ngày trong tuần</div>
        </div>

        {/* Card 2: Hoàn thành mục tiêu (Test 13.9) */}
        <div className="bg-cosmic-card border-2 border-cosmic-border rounded-2xl p-3.5 shadow-card space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-cosmic-muted uppercase">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Hoàn thành</span>
          </div>
          <div
            data-testid="stats-completion-count"
            className="text-lg font-black text-amber-300"
          >
            {weeklyStats.completedDays} / 7 ngày
          </div>
          <div className="text-[10px] text-slate-400">
            Tỷ lệ {weeklyStats.completionRatePct}%
          </div>
        </div>

        {/* Card 3: Tổng lượng nước (Test 13.3) */}
        <div className="bg-cosmic-card border-2 border-cosmic-border rounded-2xl p-3.5 shadow-card space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-cosmic-muted uppercase">
            <Droplets className="w-3.5 h-3.5 text-sky-400" />
            <span>Tổng lượng</span>
          </div>
          <div
            data-testid="stats-total-volume"
            className="text-lg font-black text-sky-300"
          >
            {formatVol(weeklyStats.totalMl)}
          </div>
          <div className="text-[10px] text-slate-400">Trong 7 ngày qua</div>
        </div>

        {/* Card 4: Chuỗi kỷ lục (Test 13.10) */}
        <div className="bg-cosmic-card border-2 border-cosmic-border rounded-2xl p-3.5 shadow-card space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-cosmic-muted uppercase">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Kỷ lục 🔥</span>
          </div>
          <div
            data-testid="stats-record-streak"
            className="text-lg font-black text-rose-300"
          >
            {recordStreak} ngày
          </div>
          <div className="text-[10px] text-slate-400">Chuỗi cao nhất mọi thời đại</div>
        </div>
      </div>
    </div>
  );
};

export default StatsTab;
