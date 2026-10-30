## 2026-10-30T15:00:39Z
[Message] timestamp=2026-10-30T15:00:39Z sender=7c380586-cf2a-4df7-b89c-a4b667536d21 priority=MESSAGE_PRIORITY_HIGH content=You are assigned to the Survey phase of the project "Voyager's Cosmic Hydration".
Your identity: teamwork_spec_miner
Your working directory: d:\uống nước\.agents\teamwork\spec_miner_survey_2\
Original request file: d:\uống nước\.agents\teamwork\ORIGINAL_REQUEST.md

Objective:
Investigate and produce precise mathematical and technical specifications for the core logic, audio, and storage engines:
1. Read d:\uống nước\.agents\teamwork\ORIGINAL_REQUEST.md thoroughly.
2. Specify the Hydration calculation logic (src/utils/hydrationEngine.ts):
   - Formula: W_total = W_base + W_activity + W_weather.
   - W_base = Weight (kg) * 35 (ml).
   - W_activity: Sedentary (+0 ml), Moderate (+350 ml), High (+700 ml).
   - W_weather: Open-Meteo Weather API (https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,weather_code).
     * +250 ml if temp is 28°C - 32°C.
     * +500 ml if temp > 32°C.
     * +150 ml if relative humidity < 40%.
     * Cumulative rules (e.g. if >32°C and humidity < 40%, sum is +650 ml).
   - Rounding rules: round to nearest 50 ml or 0.1 L.
   - Fallback location: Hanoi (lat: 21.0285, lon: 105.8542) or Vinh (lat: 18.6734, lon: 105.6813) when GPS disabled/denied.
   - Error handling, offline caching, and mock data when network fails.
3. Specify Web Audio API sound synthesis:
   - "Gợn nhẹ" (Gentle Ripple): soft sine wave frequency sweep / water droplet sound.
   - "Violin Tinh cầu" (Cosmic Violin): harmonic sawtooth/triangle synthesis simulating Voyager's space violin.
   - "Chuông bong bóng" (Bubble Chime): FM or bell-like crystalline ping.
4. Specify Offline Persistence & Notification Engine:
   - Dual-layer storage: localStorage and @capacitor/preferences.
   - Local notifications scheduling (@capacitor/local-notifications), calculation of next reminder time based on modes (Gentle, Smart, Regular), and quiet hours (01:00 - 07:00).
5. Document all specs, test cases, and edge case scenarios in `d:\uống nước\.agents\teamwork\spec_miner_survey_2\spec_report.md`.
6. Write a complete, self-contained `handoff.md` in your working directory and notify the orchestrator with send_message.

Boundaries:
- Do NOT create or modify implementation source code files. Extract and define specifications only.
