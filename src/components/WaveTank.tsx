import React, { useMemo } from 'react';
import { Star } from 'lucide-react';
import VoyagerChibi, { VoyagerExpression } from './VoyagerChibi';
import { playQuickTap } from '../utils/audioEngine';

export interface WaveTankProps {
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

export const WaveTank: React.FC<WaveTankProps> = ({
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
    if (goalMl <= 0) return 0;
    const pct = Math.round((currentMl / goalMl) * 100);
    return Math.min(100, Math.max(0, pct));
  }, [currentMl, goalMl]);

  // True un-clamped percentage for display or triggers
  const truePercent = useMemo(() => {
    if (goalMl <= 0) return 0;
    return Math.round((currentMl / goalMl) * 100);
  }, [currentMl, goalMl]);

  // Determine Voyager Chibi expression
  const resolvedMood = useMemo<VoyagerExpression>(() => {
    if (isQuietNow) return 'sleeping';
    if (voyagerExpression) return voyagerExpression;
    if (truePercent >= 100) return 'happy';
    return 'idle';
  }, [isQuietNow, voyagerExpression, truePercent]);

  const handleChibiTap = () => {
    playQuickTap();
    if (onChibiClick) onChibiClick();
  };

  return (
    <div
      data-testid="wave-tank-container"
      data-fill-percent={visualPercent}
      className={`relative w-full h-72 sm:h-80 rounded-3xl border-2 border-[#1E293B] shadow-[0_4px_0_#1E293B] bg-gradient-to-b from-[#0B0F19] via-[#0D1527] to-[#080D1A] overflow-hidden select-none ${className}`}
    >
      {/* 1. Ambient Cosmic Background Twinkling Stars */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <span className="absolute top-4 left-6 text-yellow-300 text-xs animate-pulse opacity-70">✦</span>
        <span className="absolute top-12 right-10 text-sky-200 text-xs animate-ping opacity-60">★</span>
        <span className="absolute top-20 left-1/4 text-amber-100 text-[10px] animate-pulse opacity-50">✦</span>
        <span className="absolute top-8 right-1/3 text-indigo-300 text-sm animate-pulse opacity-40">★</span>
      </div>

      {/* 2. 100% Target Line & Floating Star Buoy (Vạch đích nét đứt & Phao ngôi sao) */}
      <div className="absolute top-6 left-0 right-0 z-20 pointer-events-none flex items-center px-4">
        {/* Left Badge */}
        <div className="bg-slate-900/90 border border-yellow-400/50 rounded-lg px-2 py-0.5 shadow-[0_2px_0_#1E293B]">
          <span className="text-[10px] font-bold text-yellow-300">100% Mục tiêu</span>
        </div>

        {/* Dashed line */}
        <div className="flex-1 mx-2 border-t-2 border-dashed border-yellow-400/60" />

        {/* Right Star Buoy */}
        <div
          data-testid="star-buoy"
          className="flex items-center justify-center w-7 h-7 rounded-full bg-yellow-400/20 border-2 border-yellow-400 shadow-[0_0_10px_rgba(251,191,36,0.6)] animate-bounce"
        >
          <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
        </div>
      </div>

      {/* 3. Liquid Wave Reservoir (Rises dynamically according to visualPercent) */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 transition-all duration-700 ease-out"
        style={{ height: `${visualPercent}%` }}
      >
        {/* Back Wave (Indigo/Deep Cyan) */}
        <div className="absolute -top-6 left-0 right-0 w-[200%] h-8 opacity-45 pointer-events-none animate-wave">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full">
            <path
              d="M0,0 C150,90 350,-40 500,45 C650,130 900,-30 1200,30 L1200,120 L0,120 Z"
              fill="#818CF8"
            />
          </svg>
        </div>

        {/* Front Wave (Celestial Cyan/Blue) */}
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

        {/* Liquid Body Gradient Fill */}
        <div className="w-full h-full bg-gradient-to-b from-[#0284C7]/85 via-[#0369A1]/95 to-[#0F172A] relative overflow-hidden">
          {/* Internal rising bubbles */}
          <div className="absolute bottom-2 left-[20%] w-2 h-2 rounded-full bg-white/40 animate-ping" />
          <div className="absolute bottom-6 left-[65%] w-1.5 h-1.5 rounded-full bg-sky-200/50 animate-pulse" />
          <div className="absolute bottom-10 left-[40%] w-2.5 h-2.5 rounded-full bg-white/30 animate-bounce" />
        </div>
      </div>

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

        {/* Water Ripple Oval beneath Chibi */}
        <div className="w-20 h-2 bg-sky-300/40 rounded-full blur-[2px] -mt-1 animate-pulse" />
      </div>
    </div>
  );
};

export default WaveTank;
