import React, { useState, useEffect } from 'react';
import { Bell, Clock, Moon, Volume2 } from 'lucide-react';
import VoyagerChibi from './VoyagerChibi';

export interface AlarmRingingModalProps {
  isOpen: boolean;
  alarmTime: string;
  snoozeMinutes?: number;
  soundName?: string;
  onDismiss: () => void;
  onSnooze: () => void;
}

export const AlarmRingingModal: React.FC<AlarmRingingModalProps> = ({
  isOpen,
  alarmTime,
  snoozeMinutes = 5,
  soundName = 'Violin Tinh cầu',
  onDismiss,
  onSnooze,
}) => {
  const [currentClock, setCurrentClock] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  });

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentClock(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      data-testid="alarm-ringing-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alarm-modal-title"
    >
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border-2 border-amber-400 p-6 text-center shadow-[0_0_35px_rgba(251,191,36,0.35)] flex flex-col items-center space-y-4">
        {/* Pulsing Bell & Title */}
        <div className="flex items-center space-y-1 flex-col">
          <div className="w-14 h-14 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-400 animate-bounce">
            <Bell className="w-7 h-7" />
          </div>
          <h2 id="alarm-modal-title" className="text-xl font-bold text-amber-300 mt-2">
            Báo thức Voyager
          </h2>
          <p className="text-xs text-slate-400">Đã đến mốc thời gian hẹn ({alarmTime})</p>
        </div>

        {/* Digital Clock Display */}
        <div className="w-full bg-slate-950/80 rounded-2xl py-3 px-4 border border-amber-500/30">
          <div className="text-3xl font-black font-mono tracking-wider text-amber-400">
            {currentClock}
          </div>
          <div className="flex items-center justify-center space-x-1 text-xs text-slate-400 mt-1">
            <Clock className="w-3.5 h-3.5 text-amber-400/80" />
            <span>Mục tiêu thức dậy & nạp nước</span>
          </div>
        </div>

        {/* Voyager Chibi Character */}
        <div className="py-1">
          <VoyagerChibi
            expression="gentle"
            size="lg"
            showAura={true}
            showSpeechBubble={true}
            speechText="Đã đến giờ rồi! Hãy thức dậy và nạp nước tinh cầu nhé!"
          />
        </div>

        {/* Sound Info Pill */}
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-xs text-amber-200">
          <Volume2 className="w-3.5 h-3.5 text-amber-400" />
          <span>{soundName}</span>
        </div>

        {/* Action Buttons */}
        <div className="w-full grid grid-cols-2 gap-3 pt-2">
          {/* Snooze Button */}
          <button
            type="button"
            data-testid="alarm-snooze-btn"
            onClick={onSnooze}
            className="flex items-center justify-center space-x-1.5 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-300 font-bold text-sm border-2 border-slate-700 transition"
          >
            <Moon className="w-4 h-4 text-amber-400" />
            <span>Hoãn {snoozeMinutes}p</span>
          </button>

          {/* Dismiss Button */}
          <button
            type="button"
            data-testid="alarm-dismiss-btn"
            onClick={onDismiss}
            className="flex items-center justify-center space-x-1.5 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-sm border-2 border-amber-300 shadow-[0_4px_0_#b45309] transition"
          >
            <Bell className="w-4 h-4 text-slate-950" />
            <span>Dừng chuông</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlarmRingingModal;
