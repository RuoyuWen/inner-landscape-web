# Path Bubble Design Workflow

An alternate, non-chatbot front end for the same co-design goal: turn a moment into a generation-ready scene. Where `inner-landscape-app/index.html` interviews the player turn by turn about ~15 scene fields, this flow fixes the scene concept and only asks for 4 quick choices.

Files: `Conversation/inner-landscape-app/path.html` / `path.css` / `path.js`. Fully self-contained — no shared code with `app.js`, and not linked from `index.html`'s home screen (open it directly at `/inner-landscape-app/path.html`). It links out to [the record review page](GenerationRecordWorkflow.md#review-page) in its top bar.

## Fixed scene concept

The scene is always **a road/path extending into the distance, flanked by trees on both sides** (matching the hand-drawn references in `Conversation/intro_source/Chinese.png` / `English.png`). Nothing else is collected or generated — no place, sound sources, spatial layout, or important objects like the old flow. This was a deliberate simplification, not a missing feature: see the system prompt in `buildPathFinalPromptSystemPrompt()`, which explicitly forbids the AI from introducing people, buildings, vehicles, signage, or text. Plain, well-constrained text-to-image prompting was enough for this — no image-to-image / reference-image editing needed.

## Screens

1. **Language** — 中文 / English, mirrors the old home screen's choice but as its own first screen (this page has no chat, so there's no separate "start" step).
2. **Intro** — shows `intro_source/Chinese.png` or `English.png`, new copy (rewritten for this flow, not reused from `introGuide`), and plays the *existing* `voice/Chinese_Intro.mp3` / `English_Intro.mp3` (same files the old chat flow's intro screen uses — reused, not re-recorded, per explicit instruction; the two unused `1Chinese_Intro.mp3` / `1English_Intro.mp3` files were left alone).
3. **Bubbles** — 4 circular buttons (季节 Season / 天气 Weather / 时间 Time / 光线 Light). Clicking one opens `#pathPicker`, a tree-structured chip picker (`BUBBLE_CATEGORIES` in `path.js`): each category has ~4-5 top-level options, each with 2-3 sub-options, plus a "自定义/Custom" free-text option always present at the first level. The player can confirm a selection at **any depth** (top-level or leaf) — there's no forced drill-down, and each bubble holds exactly one final value (single-select, matching the confirmed design decision).
4. **Confirm** — one OpenAI Responses API call (`summarizeSelections()`) turns the up-to-4 selections into the same `prompt1_environment_360` / `prompt2_sound` / `prompt3_music` shape the rest of the system already uses (`FINAL_RESULT_SCHEMA`, copied from `app.js`). From here: save prompt/log, generate 2D, generate VR — all hitting the *exact same* `/save-generated-files`, `/generate-2d-experience`, `/generate-vr-experience` endpoints the old flow uses, so record archiving (`record/<timestamp>/...`) and the fixed-path VR pregeneration both work identically, with zero backend changes.
5. **Experience** — same fullscreen image+audio playback pattern as the old flow's experience screen (no music track, matching the earlier decision to disable music generation).

## Settings / API keys

`path.html` has its own minimal settings drawer (OpenAI / ElevenLabs / fal.ai keys + sound-effect provider). It reads and writes the *same* `sessionStorage` keys the main app uses (`innerLandscapeApiKey`, `innerLandscapeElevenLabsKey`, `innerLandscapeFalKey`) — since both pages are served from the same origin, keys set on one page are already available on the other. The sound-provider preference is stored separately under `innerLandscapePathSoundProvider` in `localStorage` to avoid touching the old app's draft-storage shape.

## What's intentionally not shared with `app.js`

Per explicit instruction, this is a new, independent surface — `index.html`/`app.js` are untouched. A few small helpers are duplicated rather than imported (`buildFlatImagePrompt`, sound-prompt noise-guard wrapping, the OpenAI Responses call plumbing) since there's no build step or module system in this project to share code between two standalone HTML entry points without adding one.
