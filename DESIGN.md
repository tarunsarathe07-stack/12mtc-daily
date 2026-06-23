# 12 Minutes Daily Design System

## Brand Concept

12 Minutes Daily is a premium daily exam-current-affairs habit product. It should feel like a polished consumer app for serious aspirants: fast, calm, useful, and habit-forming.

The visual language is:

- Atomberg-like consumer polish
- Editorial clarity without becoming a law journal
- Exam-prep utility without looking like a school dashboard
- Daily streak energy without looking like Kahoot or a neon game

## Color Rules

- Base canvas: soft cream / warm grey `#FBF9F5`.
- Card surfaces: clean white with subtle elevation.
- Primary authority: Deep Indigo `#283593`.
- Energy/action: Saffron `#F9A01B`.
- Coral only for wrong, urgent, or destructive states.
- No green primary. Avoid green unless a true semantic success state cannot be expressed otherwise.
- No purple/neon gradients.
- Indigo gradients are reserved for premium moments: landing demo, quiz focus, result cards.

## Typography Rules

- Use Geist as the main interface and display font.
- Headlines should be large, confident, and simple.
- Avoid chunky toy-like display type.
- Body copy should be short, direct, and written for a 15-17 year old aspirant.
- Prefer plain labels: Read, Learn, Quiz, Revise, Streak.
- Avoid jargon: mission, dossier, cockpit, cognitive momentum, intelligence lens, elite cohort.

## Spacing, Radius, Shadow

- Use an 8px rhythm with generous breathing room.
- Main cards: 24-32px radius.
- Buttons: pill-shaped.
- Use soft shadows instead of thick borders.
- Do not wrap every section in a generic rounded white box. Use rows, strips, progress rails, and compact modules when containment is not needed.

## Page Principles

- Landing: communicate the product in 5 seconds and show the loop visually.
- Today: one obvious next action. Everything else supports it.
- Shorts: premium editorial reading card with source, date, image/topic visual, and no clipped text.
- Study note: scan-first sections with key exam angle and sticky next action.
- Blog: publication-like funnel content, separate from current affairs.
- Battle: focused quiz surface with tension, not a noisy game.
- Results/Profile: progress identity with charts, streaks, mastery bars, and next-step CTAs.

## Component Rules

- Primary CTA: saffron pill, dark text.
- Authority action: deep indigo pill, white text.
- Cards: white, soft elevated, minimal border.
- Progress: saffron fill on subtle indigo/grey track.
- Topic tags: restrained indigo/saffron family, no rainbow.
- Empty/loading/error states must include the next useful action.
- Icon buttons need accessible labels.

## Motion Rules

- Motion should clarify progress or reward a meaningful completion.
- Use fast transitions: 120-300ms.
- Landing demo can be richer; workflow screens should feel instant.
- Respect `prefers-reduced-motion`.

## Copy Rules

Use:

- “Read today’s 12”
- “Know why it matters”
- “Take the quiz”
- “Revise weak topics”
- “Build your streak”
- “Save for revision”

Avoid:

- fake social proof
- long explanations above the fold
- abstract “intelligence” copy that does not explain the task
- legal-academy-only language that blocks future IPM/other-exam expansion

## What Not To Do

- Do not redesign backend or content architecture for visual work.
- Do not mix blogs with current affairs.
- Do not remove mock mode.
- Do not use courtroom green as primary.
- Do not create a generic SaaS dashboard.
- Do not overuse the 3D streak coin; reserve it for celebration moments.
