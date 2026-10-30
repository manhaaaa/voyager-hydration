import React, { useState, useEffect, useMemo } from 'react';

// ============================================================================
// 1. Type Definitions & Constants
// ============================================================================

export type VoyagerExpression = 'idle' | 'happy' | 'sleeping' | 'gentle' | 'strict';
export type VoyagerSize = 'sm' | 'md' | 'lg' | 'xl';
export type VoyagerAccessory = 'sailor_hat' | 'star_cape' | 'star_halo' | 'violin';

export interface VoyagerChibiProps {
  expression?: VoyagerExpression;
  state?: VoyagerExpression; // Backwards-compatible alias
  size?: VoyagerSize;
  customImageUrl?: string | null;
  className?: string;
  onClick?: () => void;
  showAura?: boolean;
  showSpeechBubble?: boolean;
  speechText?: string;
  interactive?: boolean;
  alt?: string;
}

export const VOYAGER_ACCESSORIES: readonly VoyagerAccessory[] = [
  'sailor_hat',
  'star_cape',
  'star_halo',
  'violin',
];

export const VOYAGER_SIZES: Record<VoyagerSize, { width: number; height: number; classNames: string; iconSize: number }> = {
  sm: { width: 48, height: 48, classNames: 'w-12 h-12', iconSize: 14 },
  md: { width: 96, height: 96, classNames: 'w-24 h-24', iconSize: 20 },
  lg: { width: 144, height: 144, classNames: 'w-36 h-36', iconSize: 28 },
  xl: { width: 192, height: 192, classNames: 'w-48 h-48', iconSize: 36 },
};

// ============================================================================
// 2. Pure Helper Utilities (Conforming to E2E Tests 8.7, 8.8, 8.9, 8.10)
// ============================================================================

export function sanitizeExpression(expr?: string | null): VoyagerExpression {
  const valid: readonly VoyagerExpression[] = ['idle', 'happy', 'sleeping', 'gentle', 'strict'];
  if (!expr) return 'idle';
  return (valid as readonly string[]).includes(expr) ? (expr as VoyagerExpression) : 'idle';
}

export const VOYAGER_EXPRESSION_IMAGES: Record<VoyagerExpression, string> = {
  idle: '/assets/character/voyager_base.png',
  happy: '/assets/character/voyager_happy.png',
  sleeping: '/assets/character/voyager_sleeping.png',
  gentle: '/assets/character/voyager_gentle.png',
  strict: '/assets/character/voyager_strict.png',
};

export function resolveAvatarSrc(customUrl?: string | null, expression?: VoyagerExpression): string {
  if (!customUrl || customUrl.trim() === '') {
    if (expression && expression !== 'idle' && VOYAGER_EXPRESSION_IMAGES[expression]) {
      return VOYAGER_EXPRESSION_IMAGES[expression];
    }
    return '/assets/character/voyager_base.png';
  }
  return customUrl;
}

export function formatSpeech(text?: string | null): string | null {
  if (!text || text.trim() === '') return null;
  const trimmed = text.trim();
  if (trimmed.length > 80) {
    return trimmed.slice(0, 77) + '...';
  }
  return trimmed;
}

// ============================================================================
// 3. Sub-Components: Vector Overlays & Accessories
// ============================================================================

/**
 * Star Halo Diadem (Vòng Thánh Ngôi Sao)
 * Recognized as 'star_halo'
 */
const StarHalo: React.FC<{ size: VoyagerSize }> = ({ size }) => {
  if (size === 'sm') return null;
  return (
    <div
      data-testid="accessory-star-halo"
      data-accessory="star_halo"
      className="absolute -top-3 left-1/2 -translate-x-1/2 pointer-events-none z-20 animate-pulse"
    >
      <svg width="36" height="24" viewBox="0 0 36 24" fill="none" className="drop-shadow-[0_0_6px_#FBBF24]">
        {/* 8-Point Golden Diadem Halo */}
        <path d="M18 0L20.5 7L28 8.5L22 13.5L24 21L18 16.5L12 21L14 13.5L8 8.5L15.5 7L18 0Z" fill="#FBBF24" />
        <circle cx="18" cy="11" r="2.5" fill="#FEF08A" />
      </svg>
    </div>
  );
};

/**
 * Sailor Hat (Mũ Thủy Thủ Trắng)
 * Recognized as 'sailor_hat'
 */
const SailorHat: React.FC<{ size: VoyagerSize }> = ({ size }) => {
  if (size === 'sm') return null;
  return (
    <div
      data-testid="accessory-sailor-hat"
      data-accessory="sailor_hat"
      className="absolute top-0.5 right-2 pointer-events-none z-20 -rotate-12"
    >
      <svg width="28" height="18" viewBox="0 0 28 18" fill="none">
        {/* Crisp White Sailor Cap */}
        <ellipse cx="14" cy="8" rx="12" ry="6" fill="#FFFFFF" stroke="#1E293B" strokeWidth="1.5" />
        {/* Dark Navy Band */}
        <path d="M4 8C4 11 9 13 14 13C19 13 24 11 24 8" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
        {/* Golden Anchor / Star Pin */}
        <polygon points="14,6 15,9 17.5,9.5 15.5,11.5 16,14 14,12.5 12,14 12.5,11.5 10.5,9.5 13,9" fill="#FBBF24" />
      </svg>
    </div>
  );
};

/**
 * Star Cape (Khăn Choàng Bầu Trời Sao)
 * Recognized as 'star_cape'
 */
const StarCape: React.FC<{ size?: VoyagerSize }> = () => {
  return (
    <div
      data-testid="accessory-star-cape"
      data-accessory="star_cape"
      className="absolute inset-0 pointer-events-none z-0 rounded-2xl overflow-hidden"
    >
      <div className="absolute inset-x-2 bottom-0 top-1/4 bg-gradient-to-t from-indigo-950/40 via-purple-900/20 to-transparent rounded-b-2xl">
        {/* Constellation Starlets */}
        <div className="absolute bottom-2 left-3 w-1 h-1 bg-yellow-200 rounded-full animate-ping opacity-60" />
        <div className="absolute bottom-4 right-4 w-1 h-1 bg-sky-200 rounded-full animate-pulse opacity-80" />
        <div className="absolute bottom-3 left-1/2 w-0.5 h-0.5 bg-white rounded-full opacity-70" />
      </div>
    </div>
  );
};

/**
 * Cosmic Star Violin & Bow
 * Recognized as 'violin'
 */
const CosmicViolin: React.FC<{ size?: VoyagerSize }> = () => {
  return (
    <div
      data-testid="accessory-violin"
      data-accessory="violin"
      className="absolute bottom-1 right-0 pointer-events-none z-30 animate-pulse"
    >
      <svg width="34" height="42" viewBox="0 0 34 42" fill="none" className="drop-shadow-[0_0_8px_rgba(56,189,248,0.7)]">
        {/* Violin Body */}
        <path
          d="M12 10C8 10 6 14 6 18C6 22 9 24 9 26C9 28 6 30 6 34C6 38 10 40 16 40C22 40 26 38 26 34C26 30 23 28 23 26C23 24 26 22 26 18C26 14 24 10 20 10Z"
          fill="#0284C7"
          fillOpacity="0.85"
          stroke="#38BDF8"
          strokeWidth="1.5"
        />
        {/* F-holes */}
        <path d="M12 20C11 22 11 24 12 26" stroke="#FEF08A" strokeWidth="1" strokeLinecap="round" />
        <path d="M20 20C21 22 21 24 20 26" stroke="#FEF08A" strokeWidth="1" strokeLinecap="round" />
        {/* Violin Neck & Scroll */}
        <rect x="15" y="2" width="2" height="10" fill="#1E293B" />
        <circle cx="16" cy="2" r="2.5" fill="#FBBF24" />
        {/* Strings */}
        <line x1="14.5" y1="4" x2="14.5" y2="38" stroke="#FEF08A" strokeWidth="0.6" />
        <line x1="17.5" y1="4" x2="17.5" y2="38" stroke="#FEF08A" strokeWidth="0.6" />
        {/* Bow */}
        <line x1="2" y1="36" x2="32" y2="12" stroke="#FDE047" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
};

// ============================================================================
// 4. Expression Overlays
// ============================================================================

/**
 * Expression 1: Idle - Floating stars around locks
 */
const IdleOverlay: React.FC = () => (
  <div data-testid="expression-idle" className="absolute inset-0 pointer-events-none z-20">
    <span className="absolute top-3 left-2 text-yellow-300 text-xs animate-ping opacity-60">✦</span>
    <span className="absolute top-2 right-3 text-sky-200 text-xs animate-pulse opacity-75">★</span>
    <span className="absolute bottom-6 left-1 text-amber-200 text-[10px] animate-bounce opacity-50">✦</span>
  </div>
);

/**
 * Expression 2: Happy - Starry eyes, celebration sparkles, confetti & blush
 */
const HappyOverlay: React.FC = () => (
  <div data-testid="expression-happy" className="absolute inset-0 pointer-events-none z-20">
    {/* Sparkling celebration stars */}
    <span className="absolute -top-2 left-2 text-amber-400 text-sm animate-bounce">✦</span>
    <span className="absolute -top-3 right-3 text-yellow-300 text-sm animate-ping">★</span>
    <span className="absolute top-1/2 -left-2 text-rose-400 text-xs animate-pulse">♥</span>
    <span className="absolute top-1/2 -right-2 text-amber-300 text-xs animate-bounce">★</span>
    <span className="absolute -bottom-1 right-2 text-sky-300 text-xs animate-ping">✦</span>
    {/* Blushing rosy cheeks glow */}
    <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-3 h-1.5 bg-rose-400/40 rounded-full blur-[1px]" />
    <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-3 h-1.5 bg-rose-400/40 rounded-full blur-[1px]" />
  </div>
);

/**
 * Expression 3: Sleeping - Closed eyes glow & Zzz dream bubble
 */
const SleepingOverlay: React.FC = () => (
  <div data-testid="expression-sleeping" className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
    {/* Cosmic Dream Bubble Shell */}
    <div className="absolute inset-1 rounded-2xl bg-indigo-950/60 backdrop-blur-[1px] border border-indigo-400/30 shadow-[inset_0_0_12px_rgba(129,140,248,0.4)]" />
    {/* Rising Constellation Zzz */}
    <div className="absolute top-2 right-2 flex flex-col items-end">
      <span className="text-[12px] font-black text-indigo-200 animate-pulse tracking-wider">Zzz</span>
      <span className="text-[9px] font-bold text-sky-300 -mt-1 opacity-75 animate-bounce">z</span>
    </div>
    {/* Closed Eye Moonlight Glow */}
    <div className="w-12 h-4 border-b-2 border-indigo-300/80 rounded-b-full opacity-80" />
  </div>
);

/**
 * Expression 4: Gentle - Water droplet gesture offering
 */
const GentleOverlay: React.FC = () => (
  <div data-testid="expression-gentle" className="absolute inset-0 pointer-events-none z-20">
    {/* Glowing crystalline water droplet */}
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 animate-bounce flex flex-col items-center">
      <svg width="22" height="26" viewBox="0 0 22 26" fill="none" className="drop-shadow-[0_0_8px_rgba(56,189,248,0.9)]">
        <path
          d="M11 1C11 1 2 12 2 17C2 21.97 6.03 26 11 26C15.97 26 20 21.97 20 17C20 12 11 1 11 1Z"
          fill="#38BDF8"
        />
        {/* Specular Glint */}
        <ellipse cx="8" cy="14" rx="2.5" ry="5" fill="#FFFFFF" opacity="0.75" />
      </svg>
      {/* Ripple ring beneath */}
      <div className="w-8 h-1.5 bg-sky-400/40 rounded-full blur-[1px] -mt-1" />
    </div>
  </div>
);

/**
 * Expression 5: Strict - Playing cosmic star violin with musical starlight notes
 */
const StrictOverlay: React.FC<{ size?: VoyagerSize }> = ({ size }) => (
  <div data-testid="expression-strict" className="absolute inset-0 pointer-events-none z-20">
    <CosmicViolin size={size} />
    {/* Rising musical notes */}
    <span className="absolute top-1 left-2 text-yellow-300 text-sm font-bold animate-bounce">♪</span>
    <span className="absolute top-4 left-5 text-sky-300 text-xs font-bold animate-ping">♫</span>
    <span className="absolute -top-2 left-1/2 text-amber-200 text-sm font-bold animate-pulse">♩</span>
  </div>
);

// ============================================================================
// 5. Main Component: VoyagerChibi
// ============================================================================

export const VoyagerChibi: React.FC<VoyagerChibiProps> = ({
  expression: expressionProp,
  state: stateProp,
  size = 'md',
  customImageUrl = null,
  className = '',
  onClick,
  showAura = false,
  showSpeechBubble = false,
  speechText,
  interactive,
  alt = 'Voyager Chibi',
}) => {
  // Normalize expression with fallback to 'idle'
  const resolvedExpr = useMemo(() => {
    return sanitizeExpression(expressionProp || stateProp || 'idle');
  }, [expressionProp, stateProp]);

  // Image load error fallback state
  const [imageError, setImageError] = useState(false);

  // Reset error when customImageUrl changes
  useEffect(() => {
    setImageError(false);
  }, [customImageUrl]);

  // Resolve final image source
  const imageSrc = useMemo(() => {
    if (imageError) {
      return '/assets/character/voyager_base.png';
    }
    return resolveAvatarSrc(customImageUrl, resolvedExpr);
  }, [customImageUrl, imageError, resolvedExpr]);

  // Dimensions
  const dims = VOYAGER_SIZES[size] || VOYAGER_SIZES.md;
  const isInteractive = interactive !== undefined ? interactive : Boolean(onClick);

  // Sanitize speech text
  const cleanSpeech = useMemo(() => formatSpeech(speechText), [speechText]);

  // Dynamic animation classes per expression
  const animationClass = useMemo(() => {
    switch (resolvedExpr) {
      case 'happy':
        return 'animate-bounce';
      case 'sleeping':
        return 'animate-pulse';
      case 'strict':
      case 'gentle':
      case 'idle':
      default:
        return 'animate-float';
    }
  }, [resolvedExpr]);

  return (
    <div
      data-testid="voyager-chibi-container"
      data-expression={resolvedExpr}
      data-size={size}
      className={`relative inline-block select-none ${className}`}
      onClick={isInteractive ? onClick : undefined}
    >
      {/* Speech Bubble */}
      {showSpeechBubble && cleanSpeech && (
        <div
          data-testid="speech-bubble"
          className="absolute -top-11 left-1/2 -translate-x-1/2 z-40 px-3 py-1 bg-white border-2 border-[#1E293B] rounded-xl shadow-[0_3px_0_#1E293B] whitespace-nowrap pointer-events-none"
        >
          <span className="text-[11px] font-black text-[#1E293B]">{cleanSpeech}</span>
          {/* Downward triangle pointer */}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-[#1E293B]" />
        </div>
      )}

      {/* Main Chibi Avatar Frame */}
      <div
        className={`relative ${dims.classNames} aspect-square rounded-2xl border-2 border-[#1E293B] bg-gradient-to-b from-slate-900 via-sky-950 to-[#0A0E1A] overflow-hidden shadow-[0_4px_0_#1E293B] transition-transform duration-200 ${
          isInteractive ? 'cursor-pointer active:translate-y-1 active:shadow-none hover:scale-105' : ''
        } ${showAura || resolvedExpr === 'happy' ? 'ring-2 ring-yellow-400 shadow-[0_0_18px_rgba(251,191,36,0.6)]' : ''}`}
      >
        {/* Layer 1: Starry Galaxy Cape (Background) */}
        <StarCape size={size} />

        {/* Layer 2: Base Character Image */}
        <div className={`w-full h-full flex items-center justify-center p-1 ${animationClass}`}>
          <img
            src={imageSrc}
            alt={alt}
            onError={() => {
              if (!imageError) setImageError(true);
            }}
            className="w-full h-full object-contain pointer-events-none"
          />
        </div>

        {/* Layer 3: Visual Accessories */}
        <SailorHat size={size} />
        <StarHalo size={size} />

        {/* Layer 4: Expression-Specific Overlays */}
        {resolvedExpr === 'idle' && <IdleOverlay />}
        {resolvedExpr === 'happy' && <HappyOverlay />}
        {resolvedExpr === 'sleeping' && <SleepingOverlay />}
        {resolvedExpr === 'gentle' && <GentleOverlay />}
        {resolvedExpr === 'strict' && <StrictOverlay size={size} />}
      </div>
    </div>
  );
};

export default VoyagerChibi;
