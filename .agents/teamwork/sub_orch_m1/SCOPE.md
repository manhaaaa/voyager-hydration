# Scope: Milestone 1 — Scaffolding & Core Hydration Engine

## Objective
Implement project scaffolding, dependencies, core hydration calculation engine, Open-Meteo weather integration, and full unit test suite.

## Required Features
- **F1**: Project scaffolding with Vite, React, TypeScript, and Tailwind CSS.
  - Dependencies: `lucide-react`, `canvas-confetti`, `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/local-notifications`, `@capacitor/geolocation`, `@capacitor/preferences`, `@capacitor/filesystem`.
  - Dev dependencies: `vitest` (or jest), `@testing-library/react`, etc. for running unit tests.
- **F2**: Hydration Engine (`src/utils/hydrationEngine.ts`):
  - $W_{base} = \text{Weight (kg)} \times 35\text{ ml}$.
  - $W_{activity}$: Ít vận động ($+0\text{ ml}$), Vừa ($+350\text{ ml}$), Cao ($+700\text{ ml}$).
  - $W_{weather}$: Open-Meteo Weather API integration:
    * $+250\text{ ml}$ if $28^\circ\text{C} - 32^\circ\text{C}$.
    * $+500\text{ ml}$ if $> 32^\circ\text{C}$.
    * $+150\text{ ml}$ if humidity $< 40\%$.
    * Cumulative summing.
  - $W_{total} = W_{base} + W_{activity} + W_{weather}$ rounded to nearest 50 ml or 0.1 L.
  - Automatic fallback coordinates (Hà Nội: `21.0285, 105.8542`, Vinh: `18.6734, 105.6813`) on GPS failure.
- **F3**: Open-Meteo API caller with caching and offline fallback.
- **F4**: Unit test suite (`tests/unit/hydrationEngine.test.ts`):
  - Passing 100% on `npm test`.

## Acceptance Criteria
- `npm test` passes 100% of unit tests covering all calculation rules, weather bonuses, rounding, and fallbacks.
- `npm run build` succeeds without TypeScript or syntax errors.
- Clean code layout per `d:\uống nước\.agents\teamwork\PROJECT.md`.
