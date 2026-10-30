## 2026-10-30T15:46:03Z
You are assigned as Explorer 3 for Milestone 2: "Audio, Persistence & Voyager Chibi".
Your identity: teamwork_explorer
Your working directory: d:\uống nước\.agents\teamwork\explorer_m2_3\
Original request file: d:\uống nước\.agents\teamwork\ORIGINAL_REQUEST.md
Project plan: d:\uống nước\.agents\teamwork\PROJECT.md
Scope file: d:\uống nước\.agents\teamwork\sub_orch_m2\SCOPE.md
UI Survey report: d:\uống nước\.agents\teamwork\explorer_survey_3\ui_ci_survey_report.md
Base asset: public/assets/voyager_base.png

Objective:
Detail the exact implementation blueprint for `src/components/VoyagerChibi.tsx`:
1. Design the 5 expression states:
   - `idle`: gentle bobbing float with celestial stars around hair.
   - `happy`: sparkling aura, celebration bounce, heart/star confetti.
   - `sleeping`: cosmic Zzz bubble, closed eyes glow (active during quiet hours 01:00-07:00).
   - `gentle`: warm smile, water droplet gesture offering a drink.
   - `strict`: playing the cosmic violin with musical starlight notes.
2. Character styling details: White sailor hat, starry galaxy cape, cyan/cosmic blue hair, star diadem halo, violin accessory.
3. Custom user upload support: gracefully render custom PNG/GIF if user uploads a custom character image from their device, maintaining the same framed Card-UI border styling.
4. Interactive props: `expression`, `size`, `className`, `customImageUrl`, `onClick`, `showAura`.
5. Document the blueprint in `d:\uống nước\.agents\teamwork\explorer_m2_3\voyager_chibi_blueprint.md`.
6. Write `handoff.md` and notify orchestrator with send_message.

Boundaries:
- Do NOT modify production code files. Design blueprint only.
