# Task Assignment: Explorer Survey 1 (Audio Architecture & Real Asset Playback)

## Identity
- Role: Explorer / Technical Investigator
- Working Directory: D:\uống nước\.agents\teamwork\explorer_m7_survey_1
- Target Project: Voyager's Cosmic Hydration (`D:\uống nước`)

## Objective
Investigate the existing audio engine and notification mechanisms in the project to design the integration of real audio files (voice lines, battle entry voice, violin) for Voyager from Reverse: 1999.

## Inputs
- Authoritative User Request: `D:\uống nước\.agents\teamwork\ORIGINAL_REQUEST.md`
- Project Specification: `D:\uống nước\.agents\teamwork\PROJECT.md`
- Existing Audio Engine: `src/utils/audioEngine.ts`
- Notification Engine: `src/utils/notificationEngine.ts`
- Public assets: `public/`

## Requirements to Investigate
1. Examine `src/utils/audioEngine.ts`: How is audio currently implemented (Web Audio API procedural synthesis)? How can it be cleanly extended or supplemented to support playing real audio files (.mp3, .wav, or .ogg) located in `public/assets/audio/`?
2. Audio preview and playback: How should audio preview work in the UI vs alarm triggering (looping until dismissed vs one-shot preview)? What audio APIs should be used (HTML5 Audio element, AudioContext, or Capacitor Native Audio if any)? What works reliably in both web browser (`npm run dev`/Vite) and Capacitor Android?
3. Sourcing and file format requirements for Voyager's audio (background voice, battle entry voice, violin theme).
4. Audio mocking in Vitest / jsdom environment: How are Audio / AudioContext currently mocked in unit tests, and what mocks are needed for real audio file playback testing?

## Output
Write your comprehensive analysis and recommendations to:
`D:\uống nước\.agents\teamwork\explorer_m7_survey_1\handoff.md`
Include:
- Observation (what currently exists in code with file paths and line numbers)
- Logic Chain (technical rationale for proposed audio engine updates)
- Caveats & Edge Cases (e.g. browser autoplay restrictions, mobile background audio, cleanup on stop/snooze)
- Recommendation (concrete interface, file paths, and implementation plan)


## 2026-10-31T17:26:49Z
Sender: 1b9ace2b-f679-4fe0-9a25-b3f7980770e8
Content:
You are an Explorer for project Voyager's Cosmic Hydration at D:\uống nước.
Your working directory is D:\uống nước\.agents\teamwork\explorer_m7_survey_1.
Read your instructions in D:\uống nước\.agents\teamwork\explorer_m7_survey_1\DISPATCH.md.
Also read D:\uống nước\.agents\teamwork\ORIGINAL_REQUEST.md and D:\uống nước\.agents\teamwork\PROJECT.md.

Investigate:
1. Audio architecture in src/utils/audioEngine.ts and how to integrate real audio files (.mp3, .wav, .ogg) in public/assets/audio/.
2. Web Audio / HTMLAudioElement playback mechanisms for previewing and looping alarm playback.
3. Audio mocking requirements in Vitest.

Write your final analysis and recommendations to:
D:\uống nước\.agents\teamwork\explorer_m7_survey_1\handoff.md
Send a completion message back when done.
