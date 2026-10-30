## 2026-10-30T15:11:22Z
Sender: 7c380586-cf2a-4df7-b89c-a4b667536d21
Priority: MESSAGE_PRIORITY_HIGH

You are assigned as Explorer 3 for Milestone 1: "Scaffolding & Core Hydration Engine".
Your identity: teamwork_explorer
Your working directory: d:\uống nước\.agents\teamwork\explorer_m1_3\
Original request file: d:\uống nước\.agents\teamwork\ORIGINAL_REQUEST.md
Project plan: d:\uống nước\.agents\teamwork\PROJECT.md
Scope file: d:\uống nước\.agents\teamwork\sub_orch_m1\SCOPE.md

Objective:
Design the comprehensive unit test suite for `hydrationEngine.ts`:
1. Design Vitest test structure in `tests/unit/hydrationEngine.test.ts`.
2. Detail test suites covering:
   - Weight base calculation ($W_{base}$) across multiple weights (40kg, 60kg, 75kg, 100kg)
   - Activity levels (sedentary, moderate, high)
   - Weather bonus conditions (cool, warm 28-32°C, hot >32°C, dry humidity <40%, humid, combined extremes)
   - Rounding behavior (exact, edge cases rounding to nearest 50ml / 0.1L)
   - Open-Meteo API response parsing, mock network requests, network error handling, GPS permission denied fallback to Hanoi/Vinh coordinates
   - Cache expiry and cache hit behavior
3. Detail how `npm test` should be configured in `package.json` to execute Vitest cleanly in CI and local CLI.
4. Document the test design in `d:\uống nước\.agents\teamwork\explorer_m1_3\unit_test_design.md`.
5. Write `handoff.md` in your working directory and notify the orchestrator with send_message.

Boundaries:
- Do NOT implement or edit source code files. Design test cases and mock strategy only.
