# Task Assignment: Challenger M7-2 (Audio Playback & Asset Verification Challenger)

## Identity
- Role: Adversarial Verifier / Challenger
- Working Directory: D:\uống nước\.agents\teamwork\challenger_m7_2
- Target Project: Voyager's Cosmic Hydration (`D:\uống nước`)

## Inputs
- Authoritative User Request: `D:\uống nước\.agents\teamwork\ORIGINAL_REQUEST.md`
- Project Specification: `D:\uống nước\.agents\teamwork\PROJECT.md`
- Worker Handoff Report: `D:\uống nước\.agents\teamwork\worker_m7\handoff.md`

## Challenge Scope & Instructions
1. Stress test audio playback and asset handling:
   - Verify physical existence and byte sizes of `public/assets/audio/voyager_greeting.mp3`, `voyager_battle.mp3`, `voyager_violin.mp3`.
   - Test audio preview lifecycle: Start preview track A -> immediately switch to track B -> verify track A stops and track B plays.
   - Test preview stop button: Verify audio pauses and resets `currentTime = 0`.
   - Test looping alarm playback: Verify `audio.loop === true`, volume adheres to `MASTER_HEADROOM_GAIN`, and `stopAlarmPlayback()` cleans up completely.
   - Test fallback to procedural tones if audio track is set to procedural ('violin', 'bubble', 'ripple').
2. Run `npm test` and `npm run test:e2e` to confirm zero regressions across all test suites.
3. Provide an explicit verdict: **APPROVE** or **REQUEST_CHANGES**.

## Output
Write your challenge report to:
`D:\uống nước\.agents\teamwork\challenger_m7_2\handoff.md`
End with: `Verdict: **APPROVE**` or `Verdict: **REQUEST_CHANGES** (reason)`.


## 2026-10-31T18:02:28Z
You are Challenger M7-2 for project Voyager's Cosmic Hydration at D:\uống nước.
Your working directory is D:\uống nước\.agents\teamwork\challenger_m7_2.
Read your instructions in D:\uống nước\.agents\teamwork\challenger_m7_2\DISPATCH.md.
Also read:
- D:\uống nước\.agents\teamwork\ORIGINAL_REQUEST.md
- D:\uống nước\.agents\teamwork\PROJECT.md
- D:\uống nước\.agents\teamwork\worker_m7\handoff.md

Perform adversarial stress testing on audio asset handling, preview switching, looping alarm audio, and fallback mechanisms.
Run npm test and npm run test:e2e.
Write your report and verdict (APPROVE or REQUEST_CHANGES) to:
D:\uống nước\.agents\teamwork\challenger_m7_2\handoff.md
Send a completion message back when done.
