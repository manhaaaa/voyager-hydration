# BRIEFING — 2026-10-30T15:16:00Z

## Mission
Detail the exact implementation blueprint for `src/utils/hydrationEngine.ts` covering types, mathematical hydration formulas, Open-Meteo weather fetch/caching/fallback, and helper logic for Milestone 1.

## 🔒 My Identity
- Archetype: teamwork_spec_miner
- Roles: Specification Miner, Algorithm & Interface Architect
- Working directory: d:\uống nước\.agents\teamwork\explorer_m1_2\
- Original parent: 7c380586-cf2a-4df7-b89c-a4b667536d21
- Milestone: Milestone 1: Scaffolding & Core Hydration Engine

## 🔒 Key Constraints
- Do NOT implement or edit source code files. Extract and specify blueprint only.
- Work read-only relative to project source, writing artifacts only to `d:\uống nước\.agents\teamwork\explorer_m1_2\`.
- Complete unabridged TypeScript interfaces, mathematical formulas, edge-case tables, and pseudocode/reference code for Worker.

## Current Parent
- Conversation ID: 7c380586-cf2a-4df7-b89c-a4b667536d21
- Updated: 2026-10-30T15:16:00Z

## Task Summary
- **What to build**: `hydration_engine_blueprint.md` detailing types, hydration calculation formulas ($W_{base}, W_{activity}, W_{weather}$), rounding rules, Open-Meteo API fetching + 30-min localStorage cache + coordinates fallbacks, and test cases.
- **Success criteria**: Complete interface contracts, verified mathematical formulas, edge cases probed, ready for Worker 2 implementation.
- **Interface contracts**: `d:\uống nước\.agents\teamwork\sub_orch_m1\SCOPE.md`, `d:\uống nước\.agents\teamwork\PROJECT.md`
- **Code layout**: Defined in `PROJECT.md`

## Loaded Skills
- None

## Key Decisions Made
- Confirmed live Open-Meteo schema: `current.temperature_2m`, `current.relative_humidity_2m`, `current.weather_code`.
- Implemented edge-case clamping for body weight: minimum 20kg (700ml), maximum 300kg (10500ml), fallback 60kg (2100ml) on invalid or non-positive values.
- Formulated exact boundary thresholds: $T \in [28.0, 32.0] \implies +250\text{ ml}$, $T > 32.0 \implies +500\text{ ml}$, $H < 40.0\% \implies +150\text{ ml}$.
- Structured dual fallback coordinates: Primary fallback Hà Nội (`21.0285, 105.8542`), Secondary fallback Vinh (`18.6734, 105.6813`).
- Established 30-minute localStorage cache with TTL checking and coordinate proximity checks (<0.1 deg delta).
- Documented full implementation blueprint with unabridged TypeScript code ready for Worker 2 in `hydration_engine_blueprint.md`.

## Artifact Index
- `d:\uống nước\.agents\teamwork\explorer_m1_2\DISPATCH.md` — Assigned instructions
- `d:\uống nước\.agents\teamwork\explorer_m1_2\BRIEFING.md` — Persistent state
- `d:\uống nước\.agents\teamwork\explorer_m1_2\progress.md` — Liveness heartbeat & step status
- `d:\uống nước\.agents\teamwork\explorer_m1_2\hydration_engine_blueprint.md` — Comprehensive blueprint for hydration engine
- `d:\uống nước\.agents\teamwork\explorer_m1_2\handoff.md` — Handoff report for sub-orchestrator
