import React, { useMemo } from 'react';
import { Star } from 'lucide-react';
import VoyagerChibi, { VoyagerExpression } from './VoyagerChibi';
import { playQuickTap } from '../utils/audioEngine';

export interface CosmicWaterPlanetProps {
  currentMl: number;
  goalMl: number;
  customImageUrl?: string | null;
  voyagerExpression?: VoyagerExpression;
  isQuietNow?: boolean;
  onChibiClick?: () => void;
  showSpeechBubble?: boolean;
  speechText?: string;
  className?: string;
}

export const CosmicWaterPlanet: React.FC<CosmicWaterPlanetProps> = ({
  currentMl,
  goalMl,
  customImageUrl = null,
  voyagerExpression,
  isQuietNow = false,
  onChibiClick,
  showSpeechBubble = false,
  speechText,
  className = '',
}) => {
  // Clamped visual fill percentage (0% - 100%) for reservoir height
  const visualPercent = useMemo(() => {
    if (!Number.isFinite(currentMl) || !Number.isFinite(goalMl) || goalMl <= 0) return 0;
    const pct = Math.round((currentMl / goalMl) * 100);
    return Math.min(100, Math.max(0, pct));
  }, [currentMl, goalMl]);

  // True un-clamped percentage for display or triggers
  const truePercent = useMemo(() => {
    if (!Number.isFinite(currentMl) || !Number.isFinite(goalMl) || goalMl <= 0) return 0;
    return Math.round((currentMl / goalMl) * 100);
  }, [currentMl, goalMl]);

  // Determine Voyager Chibi expression
  const resolvedMood = useMemo<VoyagerExpression>(() => {
    if (voyagerExpression) return voyagerExpression;
    if (isQuietNow) return 'sleeping';
    if (truePercent >= 100) return 'happy';
    return 'idle';
  }, [voyagerExpression, isQuietNow, truePercent]);

  const handleChibiTap = () => {
    playQuickTap();
    if (onChibiClick) onChibiClick();
  };

  const statusDescription = useMemo(() => {
    if (visualPercent === 0) return 'Tinh cầu cằn cỗi (0%)';
    if (visualPercent < 40) return 'Nguồn nước khởi tạo';
    if (visualPercent < 80) return 'Đại dương dâng tràn';
    if (visualPercent < 100) return 'Gần chạm ngưỡng đích';
    return 'Hành tinh đại dương hoàn hảo (100%)';
  }, [visualPercent]);

  return (
    <div
      data-testid="wave-tank-container"
      data-cosmic-planet="true"
      data-fill-percent={visualPercent}
      className={`relative w-full h-80 sm:h-88 rounded-3xl border-2 border-[#1E293B] shadow-[0_4px_0_#1E293B] bg-gradient-to-b from-[#0B0F19] via-[#0D1527] to-[#080D1A] overflow-hidden select-none flex flex-col justify-between p-4 ${className}`}
    >
      {/* 1. Ambient Cosmic Background Twinkling Stars */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <span className="absolute top-4 left-6 text-yellow-300 text-xs animate-pulse opacity-70">✦</span>
        <span className="absolute top-12 right-10 text-sky-200 text-xs animate-ping opacity-60">★</span>
        <span className="absolute top-24 left-1/4 text-amber-100 text-[10px] animate-pulse opacity-50">✦</span>
        <span className="absolute top-8 right-1/3 text-indigo-300 text-sm animate-pulse opacity-40">★</span>
        <span className="absolute bottom-8 left-8 text-sky-400 text-xs animate-pulse opacity-40">✦</span>
        <span className="absolute bottom-12 right-12 text-yellow-200 text-[10px] animate-ping opacity-50">★</span>
      </div>

      {/* 2. 100% Target Orbit Line & Floating Star Buoy */}
      <div className="relative z-20 flex items-center justify-between pointer-events-none">
        <div className="bg-slate-900/90 border border-yellow-400/50 rounded-lg px-2.5 py-0.5 shadow-[0_2px_0_#1E293B] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-[10px] font-bold text-yellow-300">100% Mục tiêu</span>
        </div>

        <div className="flex-1 mx-3 border-t-2 border-dashed border-yellow-400/50" />

        <div
          data-testid="star-buoy"
          className="flex items-center justify-center w-7 h-7 rounded-full bg-yellow-400/20 border-2 border-yellow-400 shadow-[0_0_12px_rgba(251,191,36,0.7)] animate-bounce pointer-events-auto"
        >
          <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
        </div>
      </div>

      {/* 3. Center Stage: Cosmic Water Planet Sphere */}
      <div className="relative z-10 flex items-center justify-center my-auto">
        {/* Tilted Planetary Orbital Ring (Back Half) */}
        <div
          className="absolute w-64 h-20 border-2 border-yellow-300/30 rounded-[100%] rotate-[-20deg] pointer-events-none z-0"
          style={{
            boxShadow: visualPercent >= 100 ? '0 0 15px rgba(251,191,36,0.4)' : 'none',
          }}
        />

        {/* Planet Sphere Main Container */}
        <div
          data-testid="cosmic-water-planet"
          className={`relative w-48 h-48 sm:w-52 sm:h-52 rounded-full overflow-hidden border-2 border-slate-700/80 transition-all duration-700 ease-out z-10 ${
            visualPercent >= 100
              ? 'ring-4 ring-sky-400/60 shadow-[0_0_35px_rgba(56,189,248,0.7),0_0_70px_rgba(129,140,248,0.4)]'
              : visualPercent > 0
              ? 'shadow-[0_0_20px_rgba(56,189,248,0.35)]'
              : 'shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]'
          }`}
          style={{
            background: 'radial-gradient(circle at 35% 30%, #334155 0%, #1E293B 45%, #0F172A 85%, #0B0F19 100%)',
          }}
        >
          {/* Base Layer: Barren Crater Basins (Visible when dry or under transparent water) */}
          <div className="absolute inset-0 pointer-events-none opacity-60">
            {/* Crater 1 (North-West) */}
            <div className="absolute top-6 left-8 w-10 h-7 rounded-full border border-slate-600 bg-slate-900/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]" />
            {/* Crater 2 (South-West) */}
            <div className="absolute bottom-10 left-10 w-8 h-6 rounded-full border border-slate-600 bg-slate-900/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]" />
            {/* Crater 3 (East) */}
            <div className="absolute top-16 right-7 w-12 h-9 rounded-full border border-slate-600 bg-slate-900/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]" />
            {/* Fault lines */}
            <div className="absolute top-12 left-14 w-12 border-t border-dashed border-slate-600/50 rotate-45" />
          </div>

          {/* Liquid Ocean Reservoir (Rises dynamically according to visualPercent) */}
          <div
            className="absolute bottom-0 left-0 right-0 z-10 transition-all duration-700 ease-out"
            style={{ height: `${visualPercent}%` }}
          >
            {/* Back Wave (Nebula Indigo) */}
            <div className="absolute -top-6 left-0 right-0 w-[200%] h-8 opacity-45 pointer-events-none animate-wave">
              <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full">
                <path
                  d="M0,0 C150,90 350,-40 500,45 C650,130 900,-30 1200,30 L1200,120 L0,120 Z"
                  fill="#818CF8"
                />
              </svg>
            </div>

            {/* Front Wave (Celestial Cyan) */}
            <div
              className="absolute -top-5 left-0 right-0 w-[200%] h-8 opacity-90 pointer-events-none animate-wave"
              style={{ animationDuration: '6s' }}
            >
              <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full">
                <path
                  d="M0,30 C300,-40 450,80 700,20 C950,-40 1050,70 1200,10 L1200,120 L0,120 Z"
                  fill="#0284C7"
                />
              </svg>
            </div>

            {/* Ocean Liquid Body Fill */}
            <div className="w-full h-full bg-gradient-to-b from-[#38BDF8]/90 via-[#0284C7]/95 to-[#0F172A] relative overflow-hidden">
              {/* Internal rising stardust bubbles */}
              <div className="absolute bottom-2 left-[20%] w-2 h-2 rounded-full bg-white/50 animate-ping" />
              <div className="absolute bottom-6 left-[65%] w-1.5 h-1.5 rounded-full bg-sky-200/60 animate-pulse" />
              <div className="absolute bottom-10 left-[40%] w-2.5 h-2.5 rounded-full bg-white/40 animate-bounce" />
              <div className="absolute top-2 right-[25%] w-1 h-1 rounded-full bg-yellow-200/70 animate-ping" />
            </div>
          </div>

          {/* Spherical Specular 3D Highlight & Atmosphere Corona Overlay */}
          <div
            className="absolute inset-0 pointer-events-none z-20 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.05) 35%, transparent 60%)',
            }}
          />

          {/* 100% Atmospheric Shimmer Cloud Band */}
          {visualPercent >= 100 && (
            <div className="absolute inset-0 pointer-events-none z-20 rounded-full animate-pulse opacity-40 bg-gradient-to-tr from-transparent via-sky-300/30 to-indigo-300/30" />
          )}
        </div>

        {/* Tilted Planetary Orbital Ring (Front Half) */}
        <div className="absolute w-64 h-20 border-b-2 border-yellow-300/50 rounded-[100%] rotate-[-20deg] pointer-events-none z-20" />

        {/* 4. Voyager Chibi Floating atop the Liquid Surface */}
        <div
          data-testid="floating-chibi-anchor"
          className="absolute left-1/2 -translate-x-1/2 z-30 transition-all duration-700 ease-out flex flex-col items-center pointer-events-auto"
          style={{
            bottom: `clamp(16px, calc(${visualPercent}% - 28px), calc(100% - 116px))`,
          }}
        >
          <VoyagerChibi
            expression={resolvedMood}
            size="md"
            customImageUrl={customImageUrl}
            showAura={truePercent >= 100}
            showSpeechBubble={showSpeechBubble}
            speechText={speechText}
            interactive={true}
            onClick={handleChibiTap}
          />

          {/* Liquid Ripple Oval beneath Chibi */}
          <div
            className={`w-20 h-2 rounded-full blur-[2px] -mt-1 animate-pulse transition-colors duration-500 ${
              visualPercent > 0 ? 'bg-sky-300/50' : 'bg-slate-600/30'
            }`}
          />
        </div>
      </div>

      {/* 5. Bottom Telemetry Status Pill */}
      <div className="relative z-20 flex items-center justify-between text-[11px] font-bold text-slate-400 px-1 pt-1 border-t border-slate-800/80">
        <span className="text-sky-300">
          Tiến độ: <strong className="text-white">{visualPercent}%</strong>
        </span>
        <span className="text-slate-400">{statusDescription}</span>
      </div>
    </div>
  );
};

export default CosmicWaterPlanet;
