## 2026-10-30T15:11:16Z

You are assigned as Explorer 2 (Spec Miner) for Milestone 1: "Scaffolding & Core Hydration Engine".
Your identity: teamwork_spec_miner
Your working directory: d:\uống nước\.agents\teamwork\explorer_m1_2\
Original request file: d:\uống nước\.agents\teamwork\ORIGINAL_REQUEST.md
Project plan: d:\uống nước\.agents\teamwork\PROJECT.md
Scope file: d:\uống nước\.agents\teamwork\sub_orch_m1\SCOPE.md
Prior spec report: d:\uống nước\.agents\teamwork\spec_miner_survey_2\spec_report.md

Objective:
Detail the exact implementation blueprint for `src/utils/hydrationEngine.ts`:
1. Full TypeScript types and interfaces: UserProfile, WeatherData, HydrationCalculationResult.
2. Complete formulas and functions:
   - $W_{base} = \text{weight} \times 35$
   - $W_{activity}$: sedentary (+0), moderate (+350), high (+700)
   - $W_{weather}$: 28-32°C (+250), >32°C (+500), humidity < 40% (+150), cumulative
   - Rounding to 50 ml or 0.1 L
   - Fetching Open-Meteo with 30-min local caching and fallback coordinates (Hà Nội: `21.0285, 105.8542`, Vinh: `18.6734, 105.6813`)
3. Provide complete, unabridged TypeScript function signatures and implementation logic for the Worker.
4. Document the blueprint in `d:\uống nước\.agents\teamwork\explorer_m1_2\hydration_engine_blueprint.md`.
5. Write `handoff.md` in your working directory and notify the orchestrator with send_message.

Boundaries:
- Do NOT implement or edit source code files. Extract and specify blueprint only.
