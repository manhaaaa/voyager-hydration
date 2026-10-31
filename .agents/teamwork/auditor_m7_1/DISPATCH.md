# Task Assignment: Forensic Auditor M7 (Integrity Verification)

## Identity
- Role: Forensic Auditor (`teamwork_auditor`)
- Working Directory: D:\uống nước\.agents\teamwork\auditor_m7_1
- Target Project: Voyager's Cosmic Hydration (`D:\uống nước`)

## Inputs
- Authoritative User Request: `D:\uống nước\.agents\teamwork\ORIGINAL_REQUEST.md`
- Project Specification: `D:\uống nước\.agents\teamwork\PROJECT.md`
- Worker Handoff Report: `D:\uống nước\.agents\teamwork\worker_m7\handoff.md`

## Audit Instructions & Forensic Checks
Perform systematic forensic checks:
1. **Audio Asset Authenticity & Integrity**:
   - Inspect `public/assets/audio/voyager_greeting.mp3`, `voyager_battle.mp3`, `voyager_violin.mp3`.
   - Verify they are authentic MP3 audio files with legitimate non-zero sizes (> 20KB).
   - Ensure they are not empty dummy files, zero-byte stubs, or text files renamed to .mp3.
2. **Implementation Authenticity (Anti-Cheating Check)**:
   - Check `src/utils/audioEngine.ts`: Is audio playback logic genuine?
   - Check `src/utils/storageEngine.ts`: Is `AlarmClockConfig` genuinely stored and loaded?
   - Check `src/components/AlarmRingingModal.tsx`: Are UI elements genuinely rendered?
   - Check `src/tabs/ReminderTab.tsx` and `src/App.tsx`: Is alarm scheduling and ticking genuine?
   - Verify there are NO hardcoded test outputs, no fake conditional branches specifically detecting test environments to bypass logic, and no TODO/placeholder implementations.
3. **Independent Clean-Room Test Execution**:
   - Independently execute `npm test` -> verify 100% pass (437/437 tests).
   - Independently execute `npm run test:e2e` -> verify 100% pass (196/196 tests).
   - Independently execute `npm run build` -> verify exit code 0 and zero TypeScript errors.
4. Provide a definitive binary verdict:
   - **CLEAN**: All checks pass, genuine implementation, authentic assets.
   - **INTEGRITY VIOLATION**: Any cheating, facade implementation, or counterfeit assets detected.

## Output
Write your full forensic audit report to:
`D:\uống nước\.agents\teamwork\auditor_m7_1\handoff.md`
End with: `Verdict: **CLEAN**` or `Verdict: **INTEGRITY VIOLATION** (evidence)`.


## 2026-10-31T18:02:35Z
From: 1b9ace2b-f679-4fe0-9a25-b3f7980770e8
You are Forensic Auditor M7 for project Voyager's Cosmic Hydration at D:\uống nước.
Your working directory is D:\uống nước\.agents\teamwork\auditor_m7_1.
Read your instructions in D:\uống nước\.agents\teamwork\auditor_m7_1\DISPATCH.md.
Also read:
- D:\uống nước\.agents\teamwork\ORIGINAL_REQUEST.md
- D:\uống nước\.agents\teamwork\PROJECT.md
- D:\uống nước\.agents\teamwork\worker_m7\handoff.md

Conduct a complete forensic integrity audit:
1. Verify audio asset authenticity and sizes (> 20KB, authentic MP3s, not dummy stubs).
2. Check for any cheating, hardcoded test results, fake mocks, or facade implementations.
3. Independently execute npm test, npm run test:e2e, and npm run build.
Write your forensic report and binary verdict (CLEAN or INTEGRITY VIOLATION) to:
D:\uống nước\.agents\teamwork\auditor_m7_1\handoff.md
Send a completion message back when done.
