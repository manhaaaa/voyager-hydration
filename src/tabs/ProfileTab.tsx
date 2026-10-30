import { useState, useRef, useMemo } from 'react';
import {
  User,
  Scale,
  Ruler,
  Clock,
  Activity,
  CloudSun,
  RefreshCw,
  Compass,
  Palette,
  Volume2,
  FileSpreadsheet,
  FileJson,
  Upload,
  RotateCcw,
  Check,
  Play
} from 'lucide-react';
import VoyagerChibi from '../components/VoyagerChibi';
import { playCosmicSound, playQuickTap, SoundType } from '../utils/audioEngine';
import {
  exportDataAsJson,
  exportDataAsCsv,
  triggerDownload,
  getStorageItem,
  setStorageItem,
  STORAGE_KEYS,
  DEFAULT_USER_PROFILE,
  AppSettings,
  DailyLogsMap
} from '../utils/storageEngine';
import type { UserProfile, WeatherData, ActivityLevel } from '../types';
import { calculateDailyWaterGoal, calculateBaseWater } from '../utils/hydrationEngine';

export interface ProfileTabProps {
  profile?: UserProfile;
  settings?: AppSettings;
  weather?: WeatherData | null;
  isWeatherLoading?: boolean;
  customAvatar?: string | null;
  dailyLogs?: DailyLogsMap;
  onUpdateProfile?: (updated: Partial<UserProfile>) => void | Promise<void>;
  onUpdateSettings?: (updated: Partial<AppSettings>) => void | Promise<void>;
  onUpdateAvatar?: (dataUrl: string | null) => void | Promise<void>;
  onRefreshWeather?: () => Promise<void>;
  className?: string;
}

export interface CompanionItem {
  id: number;
  name: string;              // Primary name matching Test 14.4
  codename: string;          // Reverse: 1999 Character name
  description: string;
  locked: false;             // 100% free / 0% paywall
}

export const COMPANIONS_CATALOG: readonly CompanionItem[] = [
  { id: 1, name: 'Voyager Nguyên Bản', codename: 'Voyager (Maestro)', description: 'Thuyền trưởng âm nhạc vũ trụ với cây đàn violin ngân hà', locked: false },
  { id: 2, name: 'Voyager Tinh Vân', codename: 'Sonetto', description: 'Nhà thơ ngân hà với những vần thơ điều khiển thời gian', locked: false },
  { id: 3, name: 'Voyager Thủy Thủ', codename: 'Regulus', description: 'Thủy thủ rock n roll du hành không gian cùng chú chó APPLe', locked: false },
  { id: 4, name: 'Voyager Hòa Âm', codename: 'Vertin', description: 'Người gìn giữ thời gian, người du hành vượt qua Bão Tố', locked: false },
  { id: 5, name: 'Voyager Hoàng Hôn', codename: 'Tooth Fairy', description: 'Bác sĩ ngân hà thanh tẩy và xoa dịu những cơn khát', locked: false },
  { id: 6, name: 'Voyager Siêu Tân Tinh', codename: 'Lilya', description: 'Phi công vũ trụ cưỡi chổi tên lửa tốc độ siêu thanh', locked: false },
] as const;

export interface CosmicThemeItem {
  id: string;                // Theme ID matching Test 14.5
  name: string;              // Vietnamese title
  englishName: string;       // Theme name from dispatch prompt
  previewColor: string;
  borderAccent: string;
  locked: false;             // 100% free / 0% paywall
}

export const COSMIC_THEMES_CATALOG: readonly CosmicThemeItem[] = [
  { id: 'deep_space', name: 'Biển Sao Đêm', englishName: 'Deep Cosmic', previewColor: '#0B0F19', borderAccent: '#38BDF8', locked: false },
  { id: 'nebula_aurora', name: 'Dải Ngân Hà Rực Rỡ', englishName: 'Nebula Purple', previewColor: '#1E1035', borderAccent: '#818CF8', locked: false },
  { id: 'supernova_gold', name: 'Ánh Hoàng Hôn Sao Hỏa', englishName: 'Solar Gold', previewColor: '#2A1805', borderAccent: '#FBBF24', locked: false },
  { id: 'cosmic_ocean', name: 'Vùng Tối Trăng Khuyết', englishName: 'Starlight Blue', previewColor: '#03203C', borderAccent: '#0284C7', locked: false },
] as const;

export const ProfileTab: React.FC<ProfileTabProps> = ({
  profile: propProfile,
  weather: propWeather,
  isWeatherLoading = false,
  customAvatar: propAvatar,
  onUpdateProfile,
  onUpdateSettings,
  onUpdateAvatar,
  onRefreshWeather,
  className = '',
}) => {
  const profile = propProfile || getStorageItem<UserProfile>(STORAGE_KEYS.USER_PROFILE, DEFAULT_USER_PROFILE);
  const customAvatar = propAvatar !== undefined ? propAvatar : getStorageItem<string | null>('voyager_custom_avatar', null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Calculated base and goal water
  const baseWater = useMemo(() => calculateBaseWater(profile.weightKg), [profile.weightKg]);
  const calculatedGoal = useMemo(() => {
    const bonus = profile.autoWeatherAdjust && propWeather ? propWeather.bonusMl : 0;
    return calculateDailyWaterGoal(profile.weightKg, profile.activityLevel, bonus);
  }, [profile.weightKg, profile.activityLevel, profile.autoWeatherAdjust, propWeather]);

  // Handle avatar upload
  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(png|gif|jpeg|jpg)$/)) {
      setAvatarError('Chỉ chấp nhận file ảnh định dạng PNG, GIF hoặc JPEG.');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setAvatarError('Dung lượng ảnh tối đa là 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (
        result.startsWith('data:image/png;base64,') ||
        result.startsWith('data:image/gif;base64,') ||
        result.startsWith('data:image/jpeg;base64,')
      ) {
        setAvatarError(null);
        if (onUpdateAvatar) {
          onUpdateAvatar(result);
        } else {
          setStorageItem('voyager_custom_avatar', result);
        }
      } else {
        setAvatarError('Định dạng Base64 không hợp lệ.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetAvatar = () => {
    playQuickTap();
    if (onUpdateAvatar) {
      onUpdateAvatar(null);
    } else {
      setStorageItem('voyager_custom_avatar', null);
    }
  };

  // Sound Preview audition
  const handleSoundPreview = (type: SoundType) => {
    playCosmicSound(type, { volume: 1.0 });
  };

  return (
    <div className={`space-y-4 pb-20 select-none ${className}`}>
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <User className="w-5 h-5 text-cosmic-blue" />
          Hồ sơ du hành
        </h2>
        <span className="text-xs text-cosmic-muted">Phiên bản 1.0.0</span>
      </div>

      {/* ==================================================================== */}
      {/* 1. User Avatar & Profile Card (Test 14.1, 14.9)                      */}
      {/* ==================================================================== */}
      <div className="bg-cosmic-card border-2 border-cosmic-border rounded-3xl p-5 shadow-card flex flex-col items-center text-center relative">
        {/* Voyager Chibi Avatar */}
        <div className="relative mb-2">
          <VoyagerChibi
            size="lg"
            expression="happy"
            customImageUrl={customAvatar}
            showAura={true}
          />
        </div>

        {/* Username Editing Input (Default "Mạnh") */}
        <div className="w-full max-w-xs mt-1">
          <input
            type="text"
            data-testid="profile-username-input"
            value={profile.name}
            onChange={(e) => {
              const val = e.target.value;
              if (onUpdateProfile) onUpdateProfile({ name: val });
            }}
            placeholder="Tên của bạn"
            className="w-full text-center text-lg font-black text-white bg-slate-900/60 border-2 border-cosmic-border rounded-xl px-3 py-1 focus:border-sky-400 focus:outline-none"
          />
        </div>

        {/* Avatar Upload Buttons */}
        <div className="flex items-center gap-2 mt-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarFile}
            accept="image/png,image/gif,image/jpeg"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl border-2 border-cosmic-border bg-slate-800 text-xs font-bold text-slate-200 hover:border-sky-400 active:scale-95 flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            Đổi ảnh PNG/GIF
          </button>

          {customAvatar && (
            <button
              type="button"
              onClick={handleResetAvatar}
              className="px-3 py-1.5 rounded-xl border-2 border-cosmic-border bg-slate-800 text-xs font-bold text-rose-300 hover:border-rose-400 active:scale-95 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Mặc định
            </button>
          )}
        </div>

        {avatarError && (
          <p className="text-[11px] font-bold text-rose-400 mt-2">{avatarError}</p>
        )}

        {/* Verbatim Disclaimer required by Test 14.1 */}
        <p className="text-xs text-cosmic-muted mt-3">Tiến độ lưu trên máy này.</p>
      </div>

      {/* ==================================================================== */}
      {/* 2. Body Metrics & Hydration Formula Card (Test 14.2, 14.10)          */}
      {/* ==================================================================== */}
      <div className="bg-cosmic-card border-2 border-cosmic-border rounded-3xl p-5 shadow-card space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Scale className="w-4 h-4 text-cosmic-gold" />
          Chỉ số cơ thể & Công thức nước
        </h3>

        <div className="grid grid-cols-3 gap-2.5">
          {/* Cân nặng (kg) */}
          <div className="p-2.5 rounded-xl bg-slate-900 border-2 border-cosmic-border space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
              <Scale className="w-3 h-3 text-sky-400" /> Cân nặng
            </span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="20"
                max="300"
                data-testid="input-weight"
                value={profile.weightKg}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (onUpdateProfile) onUpdateProfile({ weightKg: val });
                }}
                className="w-full bg-transparent text-white font-mono font-bold text-sm outline-none"
              />
              <span className="text-xs text-slate-400 font-bold">kg</span>
            </div>
          </div>

          {/* Chiều cao (cm) */}
          <div className="p-2.5 rounded-xl bg-slate-900 border-2 border-cosmic-border space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
              <Ruler className="w-3 h-3 text-emerald-400" /> Chiều cao
            </span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="100"
                max="250"
                data-testid="input-height"
                value={profile.heightCm}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (onUpdateProfile) onUpdateProfile({ heightCm: val });
                }}
                className="w-full bg-transparent text-white font-mono font-bold text-sm outline-none"
              />
              <span className="text-xs text-slate-400 font-bold">cm</span>
            </div>
          </div>

          {/* Tuổi */}
          <div className="p-2.5 rounded-xl bg-slate-900 border-2 border-cosmic-border space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" /> Tuổi
            </span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="10"
                max="120"
                data-testid="input-age"
                value={profile.age}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (onUpdateProfile) onUpdateProfile({ age: val });
                }}
                className="w-full bg-transparent text-white font-mono font-bold text-sm outline-none"
              />
              <span className="text-xs text-slate-400 font-bold">tuổi</span>
            </div>
          </div>
        </div>

        {/* Mức độ vận động (Activity Level) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-sky-400" /> Mức độ vận động
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'sedentary', label: 'Ít (+0ml)' },
              { id: 'moderate', label: 'Vừa (+350ml)' },
              { id: 'high', label: 'Cao (+700ml)' },
            ].map((act) => (
              <button
                key={act.id}
                type="button"
                onClick={() => {
                  playQuickTap();
                  if (onUpdateProfile) onUpdateProfile({ activityLevel: act.id as ActivityLevel });
                }}
                className={`py-2 px-1 rounded-xl border-2 text-xs font-bold transition-all ${
                  profile.activityLevel === act.id
                    ? 'border-sky-400 bg-sky-950/40 text-white shadow-sm'
                    : 'border-cosmic-border bg-slate-900/60 text-slate-400 hover:text-white'
                }`}
              >
                {act.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live Hydration Target Summary */}
        <div className="p-3 rounded-2xl bg-slate-900/80 border border-sky-500/20 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400">Nước cơ bản (W_base):</div>
            <div className="text-xs font-mono font-bold text-sky-300">
              {profile.weightKg} kg × 35 = {baseWater} ml
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-slate-400">Mục tiêu hằng ngày:</div>
            <div className="text-sm font-mono font-black text-amber-300">
              {calculatedGoal} ml ({(calculatedGoal / 1000).toFixed(1).replace('.', ',')} L)
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. Weather Auto Adjustment & GPS Card (Test 14.3)                     */}
      {/* ==================================================================== */}
      <div className="bg-cosmic-card border-2 border-cosmic-border rounded-3xl p-5 shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <CloudSun className="w-4 h-4 text-sky-400" />
            Thời tiết & Điều chỉnh mục tiêu
          </h3>
          <button
            type="button"
            onClick={() => {
              playQuickTap();
              if (onRefreshWeather) onRefreshWeather();
            }}
            disabled={isWeatherLoading}
            className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-sky-300 hover:text-white active:scale-95 disabled:opacity-50"
            aria-label="Làm mới thời tiết GPS"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isWeatherLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Auto Weather Adjustment Toggle Switch (Test 14.3) */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 border-2 border-cosmic-border">
          <div className="pr-2">
            <div className="text-xs font-bold text-white">
              Tự động điều chỉnh mục tiêu theo thời tiết
            </div>
            <div className="text-[11px] text-cosmic-muted">
              Cộng thêm nước khi trời nóng hoặc khô hanh
            </div>
          </div>

          <button
            type="button"
            data-testid="weather-auto-adjust-toggle"
            onClick={() => {
              playQuickTap();
              if (onUpdateProfile) {
                onUpdateProfile({ autoWeatherAdjust: !profile.autoWeatherAdjust });
              }
            }}
            className={`w-12 h-6 flex items-center rounded-full p-0.5 transition-colors border-2 ${
              profile.autoWeatherAdjust ? 'bg-sky-500 border-sky-400' : 'bg-slate-700 border-slate-600'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                profile.autoWeatherAdjust ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Weather Formula Explanation Box */}
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-300 space-y-1">
          <div className="font-bold text-sky-300">Công thức phụ thu thời tiết:</div>
          <div>• Nhiệt độ 28°C - 32°C: <span className="font-bold text-amber-300">+250 ml</span></div>
          <div>• Nhiệt độ &gt; 32°C: <span className="font-bold text-rose-300">+500 ml</span></div>
          <div>• Độ ẩm &lt; 40%: <span className="font-bold text-sky-300">+150 ml</span></div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. 6 Companions Selector (100% Free / Zero Paywalls - Test 14.4)      */}
      {/* ==================================================================== */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cosmic-muted flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-cosmic-gold" />
            Bạn đồng hành (6/6 mở khóa miễn phí)
          </h3>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/30">
            100% Miễn phí
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {COMPANIONS_CATALOG.map((comp) => {
            const isSelected = profile.selectedCompanion === comp.name;
            return (
              <div
                key={comp.id}
                onClick={() => {
                  playQuickTap();
                  if (onUpdateProfile) onUpdateProfile({ selectedCompanion: comp.name });
                  if (onUpdateSettings) onUpdateSettings({ selectedCompanion: comp.name });
                }}
                className={`p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-cosmic-gold bg-amber-950/20 shadow-[0_4px_0_#FBBF24]'
                    : 'border-cosmic-border bg-cosmic-card/70 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-white">{comp.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-cosmic-gold stroke-[3]" />}
                </div>
                <div className="text-[10px] font-semibold text-cosmic-blue">{comp.codename}</div>
                <div className="text-[10px] text-cosmic-muted mt-1 line-clamp-2 leading-tight">
                  {comp.description}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 5. 4 Cosmic Themes Selector (100% Free / Zero Paywalls - Test 14.5)   */}
      {/* ==================================================================== */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cosmic-muted flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-cosmic-purple" />
            Chủ đề không gian (4/4 mở khóa)
          </h3>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/30">
            0% Khóa
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {COSMIC_THEMES_CATALOG.map((theme) => {
            const isSelected = (profile.selectedTheme || 'deep_space') === theme.id;
            return (
              <div
                key={theme.id}
                onClick={() => {
                  playQuickTap();
                  if (onUpdateProfile) onUpdateProfile({ selectedTheme: theme.id });
                  if (onUpdateSettings) onUpdateSettings({ selectedTheme: theme.id });
                }}
                className={`p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-sky-400 bg-sky-950/30 shadow-[0_4px_0_#38BDF8]'
                    : 'border-cosmic-border bg-cosmic-card/70 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-4 h-4 rounded-full border border-white/40"
                    style={{ backgroundColor: theme.borderAccent }}
                  />
                  <span className="text-xs font-black text-white">{theme.name}</span>
                </div>
                <div className="text-[10px] text-slate-400">{theme.englishName}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 6. General Settings & Audio Controls (Test 14.6, T3.05)              */}
      {/* ==================================================================== */}
      <div className="bg-cosmic-card border-2 border-cosmic-border rounded-3xl p-5 shadow-card space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-sky-400" />
          Cài đặt chung & Âm thanh
        </h3>

        {/* Unit Toggle: ml vs L (Test 14.6) */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 border-2 border-cosmic-border">
          <div>
            <div className="text-xs font-bold text-white">Đơn vị hiển thị</div>
            <div className="text-[11px] text-cosmic-muted">Lít (L) hoặc Mililít (ml)</div>
          </div>

          <div className="flex bg-slate-800 rounded-xl p-0.5 border border-slate-700">
            <button
              type="button"
              onClick={() => {
                playQuickTap();
                if (onUpdateProfile) onUpdateProfile({ unit: 'L' });
                if (onUpdateSettings) onUpdateSettings({ unit: 'L' });
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold ${
                profile.unit === 'L' ? 'bg-sky-500 text-slate-950 font-black' : 'text-slate-400'
              }`}
            >
              L
            </button>
            <button
              type="button"
              onClick={() => {
                playQuickTap();
                if (onUpdateProfile) onUpdateProfile({ unit: 'ml' });
                if (onUpdateSettings) onUpdateSettings({ unit: 'ml' });
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold ${
                profile.unit === 'ml' ? 'bg-sky-500 text-slate-950 font-black' : 'text-slate-400'
              }`}
            >
              ml
            </button>
          </div>
        </div>

        {/* Sound Enabled Switch (Test T3.05) */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 border-2 border-cosmic-border">
          <div>
            <div className="text-xs font-bold text-white">Hiệu ứng âm thanh ngân hà</div>
            <div className="text-[11px] text-cosmic-muted">Âm thanh phản hồi Web Audio API</div>
          </div>

          <button
            type="button"
            data-testid="profile-sound-toggle"
            onClick={() => {
              playQuickTap();
              const nextVal = !profile.soundEnabled;
              if (onUpdateProfile) onUpdateProfile({ soundEnabled: nextVal });
              if (onUpdateSettings) onUpdateSettings({ soundEnabled: nextVal });
            }}
            className={`w-12 h-6 flex items-center rounded-full p-0.5 transition-colors border-2 ${
              profile.soundEnabled ? 'bg-sky-500 border-sky-400' : 'bg-slate-700 border-slate-600'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                profile.soundEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Audio Audition Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => handleSoundPreview('ripple')}
            className="flex-1 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-[11px] font-bold text-sky-300 hover:border-sky-400 active:scale-95 flex items-center justify-center gap-1"
          >
            <Play className="w-3 h-3 fill-current" /> Gợn nhẹ
          </button>
          <button
            type="button"
            onClick={() => handleSoundPreview('violin')}
            className="flex-1 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-[11px] font-bold text-indigo-300 hover:border-indigo-400 active:scale-95 flex items-center justify-center gap-1"
          >
            <Play className="w-3 h-3 fill-current" /> Violin
          </button>
          <button
            type="button"
            onClick={() => handleSoundPreview('bubble')}
            className="flex-1 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-[11px] font-bold text-amber-300 hover:border-amber-400 active:scale-95 flex items-center justify-center gap-1"
          >
            <Play className="w-3 h-3 fill-current" /> Chuông
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 7. Data Management & Instant File Downloads (Test 14.7, 14.8)        */}
      {/* ==================================================================== */}
      <div className="bg-cosmic-card border-2 border-cosmic-border rounded-3xl p-5 shadow-card space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          Xuất dữ liệu & Sao lưu
        </h3>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Nút Xuất JSON (Test 14.7) */}
          <button
            type="button"
            data-testid="export-json-button"
            onClick={() => {
              playQuickTap();
              const jsonStr = exportDataAsJson();
              triggerDownload('voyager_hydration_backup.json', jsonStr, 'application/json');
            }}
            className="py-2.5 px-3 rounded-2xl border-2 border-cosmic-border bg-slate-900 text-xs font-bold text-white hover:border-sky-400 active:translate-y-0.5 flex items-center justify-center gap-1.5 shadow-sm"
          >
            <FileJson className="w-4 h-4 text-sky-400" />
            <span>Xuất JSON</span>
          </button>

          {/* Nút Xuất CSV (Test 14.8) */}
          <button
            type="button"
            data-testid="export-csv-button"
            onClick={() => {
              playQuickTap();
              const csvStr = exportDataAsCsv();
              triggerDownload('voyager_hydration_logs.csv', csvStr, 'text/csv');
            }}
            className="py-2.5 px-3 rounded-2xl border-2 border-cosmic-border bg-slate-900 text-xs font-bold text-white hover:border-emerald-400 active:translate-y-0.5 flex items-center justify-center gap-1.5 shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Xuất CSV (Excel)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileTab;
