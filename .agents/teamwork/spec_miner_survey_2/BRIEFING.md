# BRIEFING — 2026-10-30T15:05:15Z

## Mission
Specify mathematical and technical specifications for the core hydration calculation engine, Web Audio API procedural synthesis, offline dual-layer storage, and local notification scheduler.

## 🔒 My Identity
- Archetype: teamwork_spec_miner
- Roles: spec_miner
- Working directory: d:\uống nước\.agents\teamwork\spec_miner_survey_2
- Original parent: 7c380586-cf2a-4df7-b89c-a4b667536d21
- Milestone: Survey & Specifications

## 🔒 Key Constraints
- NEVER create or modify implementation source code files (src/*, etc.).
- Extract and define specifications only.
- Write findings to spec_report.md and handoff.md in own folder.
- Self-contained handoff with 5 standard sections.

## Current Parent
- Conversation ID: 7c380586-cf2a-4df7-b89c-a4b667536d21
- Updated: not yet

## Task Summary
- **What to build/specify**:
  1. Hydration calculation engine logic, formulas, rounding, weather API integration, fallback coordinates, caching, and error resilience.
  2. Web Audio API synthesis models for 3 soundscapes: "Gợn nhẹ", "Violin Tinh cầu", "Chuông bong bóng".
  3. Offline persistence schema (dual-layer localStorage + @capacitor/preferences) and notification scheduling engine with modes & quiet hours.
- **Success criteria**:
  - Full mathematical formula definitions, exact inputs, outputs, error behaviors, edge case matrices.
  - Web Audio synthesis node graphs (Oscillators, Gains, BiquadFilters, Envelopes, Timings).
  - Storage keys, TypeScript types/interfaces, notification scheduling algorithms, quiet hour handling.
  - Documented in spec_report.md and handoff.md.

## Loaded Skills
- None explicitly requested; standard clean specification applied.

## Key Decisions Made
- Live probed Open-Meteo API endpoint to confirm JSON schema fields (`current.temperature_2m`, `current.relative_humidity_2m`, `current.weather_code`).
- Established cumulative environmental equation: $W_{total} = W_{base} + W_{activity} + W_{weather}$.
- Configured Hà Nội (`21.0285, 105.8542`) as primary fallback and Vinh (`18.6734, 105.6813`) as secondary fallback.
- Specified zero-external-asset Web Audio procedural synthesis (FM bell, sine droplet, and filtered harmonic sawtooth/triangle violin).
- Formulated deficit-adaptive "Smart" notification algorithm and strict 01:00 - 07:00 quiet hours enforcement.

## Artifact Index
- d:\uống nước\.agents\teamwork\ORIGINAL_REQUEST.md — Authoritative User Request
- d:\uống nước\.agents\teamwork\spec_miner_survey_2\DISPATCH.md — Task assignment
- d:\uống nước\.agents\teamwork\spec_miner_survey_2\progress.md — Execution heartbeat
- d:\uống nước\.agents\teamwork\spec_miner_survey_2\spec_report.md — Detailed technical specification report
- d:\uống nước\.agents\teamwork\spec_miner_survey_2\handoff.md — Self-contained handoff report
