import React from 'react';
import { Droplets, Bell, Calendar, BarChart3, User, LucideIcon } from 'lucide-react';
import { playQuickTap } from '../utils/audioEngine';

export type TabId = 'reminder' | 'journal' | 'today' | 'stats' | 'profile';

export interface TabDefinition {
  id: TabId;
  label: string;
  icon: LucideIcon;
  isVip?: false;
  isLocked?: false;
}

// Order matches E2E test 9.9 ('Nhắc nước', 'Nhật ký', 'Hôm nay', 'Thống kê', 'Cá nhân')
// while placing the hero 'today' tab directly in the prominent center (index 2).
export const TABS: readonly TabDefinition[] = [
  { id: 'reminder', label: 'Nhắc nước', icon: Bell, isVip: false, isLocked: false },
  { id: 'journal', label: 'Nhật ký', icon: Calendar, isVip: false, isLocked: false },
  { id: 'today', label: 'Hôm nay', icon: Droplets, isVip: false, isLocked: false },
  { id: 'stats', label: 'Thống kê', icon: BarChart3, isVip: false, isLocked: false },
  { id: 'profile', label: 'Cá nhân', icon: User, isVip: false, isLocked: false },
] as const;

export interface NavigationBarProps {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
  className?: string;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  activeTab,
  onTabChange,
  className = '',
}) => {
  const handleSelect = (tabId: TabId) => {
    playQuickTap();
    onTabChange(tabId);
  };

  return (
    <nav
      data-testid="navigation-bar"
      className={`fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50 bg-[#0B0F19]/95 backdrop-blur-md border-t-2 border-[#1E293B] shadow-[0_-4px_20px_rgba(0,0,0,0.5)] px-2 pb-safe select-none ${className}`}
      style={{ borderTop: '2px solid #1E293B', position: 'fixed' }}
    >
      <div className="flex items-center justify-around h-16">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          const isTodayTab = tab.id === 'today';

          return (
            <button
              key={tab.id}
              type="button"
              data-testid={`nav-tab-${tab.id}`}
              onClick={() => handleSelect(tab.id)}
              className={`relative flex flex-col items-center justify-center flex-1 h-full min-h-[48px] py-1 transition-all duration-150 active:scale-95 ${
                isActive ? 'text-[#38BDF8]' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isTodayTab ? (
                // Elevated Center Hero Icon
                <div
                  className={`-mt-5 w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all ${
                    isActive
                      ? 'bg-[#0284C7] border-[#38BDF8] text-white shadow-[0_0_15px_rgba(56,189,248,0.5)] -translate-y-1'
                      : 'bg-[#131B2E] border-[#1E293B] text-slate-300 shadow-[0_4px_0_#1E293B]'
                  }`}
                >
                  <Icon className="w-6 h-6 animate-pulse" />
                </div>
              ) : (
                <Icon className={`w-5 h-5 mb-1 transition-transform ${isActive ? 'scale-110' : ''}`} />
              )}

              <span
                className={`text-[10px] tracking-tight ${
                  isActive ? 'font-bold text-[#38BDF8]' : 'font-medium text-slate-400'
                }`}
              >
                {tab.label}
              </span>

              {/* Active Indicator Bar */}
              {isActive && !isTodayTab && (
                <div className="absolute bottom-1 w-6 h-1 bg-[#38BDF8] rounded-full shadow-[0_0_8px_#38BDF8]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default NavigationBar;
