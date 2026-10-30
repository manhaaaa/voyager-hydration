## 2026-10-30T15:00:48Z

You are assigned to the Survey phase of the project "Voyager's Cosmic Hydration".
Your identity: teamwork_explorer
Your working directory: d:\uống nước\.agents\teamwork\explorer_survey_3\
Original request file: d:\uống nước\.agents\teamwork\ORIGINAL_REQUEST.md

Objective:
Investigate and document the UI design system, component architecture, 5 main tabs, and CI build automation:
1. Read d:\uống nước\.agents\teamwork\ORIGINAL_REQUEST.md thoroughly.
2. Detail the Card-UI design system:
   - Deep 2px border `#1E293B`, cosmic palette (dark blue, galaxy blues, stellar glow, starlight accents), Tailwind configuration.
   - Fixed bottom navigation bar with 5 tabs: Nhắc nước (Reminder), Nhật ký (Journal), Hôm nay (Today), Thống kê (Stats), Cá nhân (Profile).
   - Zero VIP/paywalls or locked features (100% free and unlocked).
3. Specify Voyager Chibi component (`src/components/VoyagerChibi.tsx`):
   - 5 expression states: idle, happy, sleeping, gentle, strict (playing violin).
   - Star cape, sailor hat, cosmic teal hair, violin elements.
   - Support for custom user uploaded PNG/GIF.
4. Detail the 5 screens:
   - TodayTab: streak badge 🔥, weather widget, current/goal, cup deficit prompt, galaxy wave water tank with star float, Chibi Voyager floating, quick log buttons (+50ml, +150ml, +250ml default checked, +500ml), custom ml modal.
   - ReminderTab: next reminder countdown with Voyager holding cosmic bell, reminder toggle, 3 reminder modes (Nhẹ nhàng, Thông minh, Đều đặn), wake/sleep hours (07:00 / 01:00) with quiet hours (01:00-07:00), 3 sounds with preview.
   - JournalTab: monthly calendar view with water cup levels and gold medal badges, streak card with smiling flame.
   - StatsTab: Week / Month / Custom tabs, bar chart with target dashed line and mini Voyager sitting on top of the water column, completion days & record streak.
   - ProfileTab: Voyager avatar, username edit, custom image upload, body stats & weather adjustments toggle, 6 companions, 4 space themes, unit setting, export JSON/CSV data.
5. Detail GitHub Actions workflow `.github/workflows/build-apk.yml`:
   - Node 20, Java 21, Vite build, Capacitor sync, `./gradlew assembleDebug`, upload APK artifact.
6. Document the complete UI/UX specification and component architecture in `d:\uống nước\.agents\teamwork\explorer_survey_3\ui_ci_survey_report.md`.
7. Write a complete, self-contained `handoff.md` in your working directory and notify the orchestrator with send_message.

Boundaries:
- Do NOT create or modify implementation source code files. Survey and design specifications only.
