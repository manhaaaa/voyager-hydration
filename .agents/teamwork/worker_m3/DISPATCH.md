## 2026-10-30T16:22:32Z
You are worker_m3, a teamwork_worker subagent assigned to implement Milestone 3 ("5 Main Tab Screens & Card-UI System") for "Voyager's Cosmic Hydration".
Your working directory is: d:\uống nước\.agents\teamwork\worker_m3\

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You MUST read the following authoritative files first before writing any code:
1. `d:\uống nước\.agents\teamwork\ORIGINAL_REQUEST.md` (Authoritative user request)
2. `d:\uống nước\.agents\teamwork\PROJECT.md` (Architecture, Feature Inventory & Contracts)
3. `d:\uống nước\.agents\teamwork\sub_orch_m3\SCOPE.md` (Milestone 3 Scope)
4. `d:\uống nước\.agents\teamwork\explorer_m3_1\handoff.md` (Specs for NavigationBar, WaveTank, TodayTab)
5. `d:\uống nước\.agents\teamwork\explorer_m3_2\handoff.md` (Specs for ReminderTab, JournalTab)
6. `d:\uống nước\.agents\teamwork\explorer_m3_3\handoff.md` (Specs for StatsTab, ProfileTab, App.tsx)

Your Tasks & Exclusive File Ownership:
Implement and verify genuine, production-ready code for:
1. `src/components/NavigationBar.tsx`:
   - Fixed bottom bar with 5 tabs in exact order: `['reminder', 'journal', 'today', 'stats', 'profile']` with labels `['Nhắc nước', 'Nhật ký', 'Hôm nay', 'Thống kê', 'Cá nhân']`.
   - Card-UI styling: 2px solid `#1E293B`, elevated hero icon for 'today' tab, active pill indicator, tactile click feedback (`playQuickTap()`).
   - 100% Free / Zero VIP paywalls or locked badges.
2. `src/components/WaveTank.tsx`:
   - Dynamic SVG double-wave animation rising with fill percentage (clamped 0-100%).
   - 100% dashed goal line with floating star buoy on the right edge (`data-testid="star-buoy"`).
   - Rising cosmic bubbles and twinkling stars.
   - Voyager Chibi floating atop the liquid surface with soft water ripple underneath.
3. `src/tabs/TodayTab.tsx`:
   - Streak flame badge 🔥 `{streak} ngày`.
   - Weather widget with temperature, humidity, and bonus ml (`data-testid="weather-widget"`).
   - Readout of consumed vs goal (e.g. `1,0 L / 1,6 L` or `1000 ml / 1600 ml`).
   - Deficit prompt card: `Thêm X ly >` or `Mục tiêu hoàn thành! Xuất sắc 🎉`.
   - Integrated WaveTank with Voyager Chibi.
   - Quick drink cluster: `+50 ml`, `+150 ml`, `+250 ml` (default checked), `+500 ml`.
   - Custom intake modal dialog with validation (1 to 5000 ml).
   - Confetti burst (`canvas-confetti`) and celebratory fanfare (`playGoalCelebrationFanfare()`) on reaching 100% goal.
4. `src/tabs/ReminderTab.tsx`:
   - Countdown card displaying `Sau X giờ Y phút`, `Đã đến giờ uống nước!`, or `Đã tắt nhắc nhở`.
   - Voyager Chibi with cosmic bell.
   - Master toggle switch connected to reminder scheduler.
   - 3 Reminder Mode selector cards: `smart` (Thông minh - default), `regular` (Đều đặn - 90 min), `gentle` (Nhẹ nhàng - 180 min).
   - Quiet hours schedule card: Wake time (`07:00`), Sleep time (`01:00`), dynamic span string `01:00 - 07:00` with automatic 07:00 deferral logic.
   - Cosmic sound previewer: 3 sound cards for "Gợn nhẹ", "Violin Tinh cầu", "Chuông bong bóng" testing Web Audio API via `playCosmicSound()` without modifying hydration logs.
5. `src/tabs/JournalTab.tsx`:
   - Header with title "Nhật ký ngân hà" and month navigator with cross-year transitions (`tháng X năm YYYY`).
   - Monthly calendar grid: 7 columns `['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']`, leap year support.
   - Day progress: Empty cup indicator (0%), dynamic water fill level, gold checkmark/medal badge for 100%+ days.
   - Day selection detail: Chronological log entries with timestamp, volume in ml/L, container type, and delete entry action.
   - Smiling flame streak card 🔥: displays active streak days and quote: `"Bạn đang giữ nhịp tốt. Hãy cùng Voyager duy trì nhé!"`.
6. `src/tabs/StatsTab.tsx`:
   - Segmented mode switcher: `Tuần`, `Tháng`, `Tùy chỉnh`.
   - Week navigator with `< DD/MM - DD/MM >` header formatting.
   - 7-day bar chart with horizontal dashed target line (`border-dashed border-sky-400`), bubble particles, and mini Voyager Chibi perched atop the peak column.
   - Summary statistics cards: Average daily intake (safe against division by zero), completion count (`X / 7 ngày`), total volume consumed, and record streak.
7. `src/tabs/ProfileTab.tsx`:
   - Avatar card with Voyager Chibi, Base64 PNG/GIF upload & reset, editable username (default "Mạnh"), and verbatim disclaimer: `"Tiến độ lưu trên máy này."`.
   - Physical metrics form (Weight, Height, Age, Activity level: sedentary/moderate/high) with immediate recalculation of base water and daily goal.
   - Auto weather adjustment toggle with formula explanation (+250ml 28-32°C, +500ml >32°C, +150ml <40% humidity) and GPS refresh button.
   - 6 Companions selector (100% unlocked / zero paywalls, bridging Reverse: 1999 names and Vietnamese titles).
   - 4 Cosmic themes selector (100% unlocked: Deep Cosmic, Starlight Blue, Nebula Purple, Solar Gold).
   - Unit toggle (`ml` vs `L`) and sound switch with procedural Web Audio previews.
   - Instant file downloads: JSON backup and RFC-4180 CSV export with UTF-8 BOM `\uFEFF`.
8. `src/App.tsx`:
   - Central state management and lifecycle: storage reconciliation pass (`reconcileStorage`), dual-layer state hydration (`loadAppState`), Open-Meteo weather acquisition with GPS/fallback, and auto-creation of today's hydration record.
   - Mobile Card-UI container frame: `max-w-md mx-auto min-h-screen bg-cosmic-void text-cosmic-text flex flex-col relative pb-24 pt-safe px-4`.
   - Router mounting all 5 tabs and fixed bottom NavigationBar.

Verification Requirements:
1. Run `npm test` and ensure all unit tests pass.
2. Run `npm run build` (`tsc && vite build`) and ensure clean exit code 0.
3. Run `npm run test:e2e` and verify that all Milestone 1, 2, and 3 E2E test assertions pass.
4. Document all implementation details, commands, and outputs in `d:\uống nước\.agents\teamwork\worker_m3\handoff.md`.
5. Notify parent orchestrator via `send_message`.

## 2026-10-30T16:43:33Z
**Context**: Milestone 3 Implementation Status Check
**Content**: All 8 files in `src/components/`, `src/tabs/`, and `src/App.tsx` have been observed in place. Please report your test verification status (`npm test`, `npm run build`, `npm run test:e2e`) and wrap up `handoff.md`.
**Action**: Please complete testing, produce `handoff.md`, and reply with your completion report.
