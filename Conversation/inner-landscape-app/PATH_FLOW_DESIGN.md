# The "Path" Flow — Technical Design Document

## 1. Purpose and relationship to the existing app

The project originally shipped one front end: a chat-style co-design flow (`index.html` + `app.js`) where the user talks to an AI to describe a scene, which is then turned into a generated 2D image, a 360° VR panorama, ambient music, and a sound effect.

The **path flow** (`path.html` + `path.js` + `path.css`) is a second, independent front end for the same backend. It replaces free-form conversation with a **structured, non-chat picker interface**: the user builds up a scene by tapping bubbles instead of typing sentences. It does not touch or import `app.js` — it is a self-contained IIFE module with its own state, its own screens, and its own copy of the shared subsystems it needs (background music, OpenAI calls, generation calls). The two pages are launched independently (`start.bat` → `index.html`, `start-path.bat` → `path.html`) and both are served by the same Python process, `Conversation/local_server.py`.

Because both pages call the exact same three server endpoints (`/save-generated-files`, `/generate-2d-experience`, `/generate-vr-experience`), the path flow gets generation-record archiving (the `record/<timestamp>/{2D,VR}/` folders) and VR pre-generation for free, with no backend changes required for the new page itself.

## 2. Screen-by-screen flow

```
language → intro → bubbles ⇄ (picker overlay) → confirm → experience
```

### 2.1 Language screen
User picks `zh-CN` or `en-US`. This sets `state.language` and drives every subsequent piece of UI text via a `UI_TEXT[lang][key]` lookup table plus a small `L(zh, en)` helper that wraps bilingual option labels as `{ "zh-CN": ..., "en-US": ... }` objects.

### 2.2 Intro screen
Shows a static image from `intro_source/` (`Chinese.png` or `English.png`), a short refined text passage (kept close to the original chatbot's opening: a breathing-based grounding cue, then a transition into "there is a road ahead of you"), and plays a matching voice-over file from `voice/` (`Chinese_Intro.mp3` / `English_Intro.mp3`) via `playIntroVoice()`. Entering this screen also starts the ambient background music (see §5).

### 2.3 Bubbles screen — the core interaction
This is the picker surface. It shows:
- A live-reactive SVG illustration (`#pathSketch`) on one side.
- Five bubble buttons: **季节/Season, 天气/Weather, 时间/Time, 光线/Light, 路/Road**.

Four of the five bubbles (season/weather/time/light) are backed by `BUBBLE_CATEGORIES`, a data-only tree structure: each category has an `options` array, and each option can carry a `children` array for one further level of drill-down, plus a `custom: true` leaf at the first level for free-text input. Example (season):

```js
{ id: "spring", label: L("春", "Spring"), children: [
  { id: "spring_early", label: L("早春", "Early spring") },
  { id: "spring_mid",   label: L("仲春", "Mid-spring") },
  { id: "spring_late",  label: L("暮春", "Late spring") },
]}
```

Tapping a bubble opens a full-screen picker overlay (`#pathPicker`) driven by `openPicker(categoryKey)` / `renderPicker()`. The picker keeps a small navigation stack, `picker.path`, so any depth can be a valid final answer — the user can stop at "夏/Summer" without drilling into "盛夏/Peak summer", or go one level deeper. A breadcrumb row lets the user step back up the tree instead of only being able to clear the whole selection. Any already-made selection can be revisited by tapping its bubble again, not just cleared.

The **road** bubble is the exception: rather than a tree, it opens a **3-facet panel** (see §4) because it needs to set three independent values (course, width, surface) at once rather than resolve to one leaf.

Every time a selection changes, `updateSketchPreview()` writes `data-season` / `data-weather` / `data-time` / `data-light` attributes onto the `#pathSketch` SVG root, and `applyRoadVisual()` recomputes the road's actual polygon geometry (see §4.3). All non-road visual variation is pure CSS, driven by attribute selectors in `path.css`; the road's geometry is computed in JS because SVG `points` attributes aren't something CSS can express.

### 2.4 Confirm screen
Shows a summary of everything selected so far (`renderSelectionSummary()`), plus buttons to go back and edit, or to trigger AI summarization (`summarizeSelections()`, §6), save the resulting prompt/log (`saveResult()`), and kick off 2D/VR generation.

### 2.5 Experience screen
After 2D generation completes, `start2dExperience()` stops the intro voice and background music, loads the generated image and sound into `<img>`/`<audio>` elements, and (where supported) requests fullscreen.

## 3. The reactive sketch (SVG)

`#pathSketch` is one static SVG document containing indexed, individually-classed elements for every visual motif that needs to react to a choice: `sketch-cloud-1/2/3`, `sketch-rain-1..6`, `sketch-snow-1..10`, `sketch-wind-1..3`, `sketch-lightning`, `sketch-mist`, `sketch-blossoms`, `sketch-fallen-leaves`, `sketch-tree-left/right`, and a `sketch-sun-group` wrapping the sun disc and its ray lines together (so moving the sun for morning/noon/sunset moves the rays with it — an earlier version animated the disc and rays separately and they visibly desynced).

CSS reacts to two attribute-selector patterns on `.path-sketch`:
- `[data-weather^="rain"]` — prefix match, "look" shared by an entire top-level branch (e.g. any kind of rain shows rain lines at all).
- `[data-weather="rain_light"]` — exact match, refinement for one specific leaf (e.g. light rain shows fewer, thinner rain lines than heavy rain).

**A real bug that was found and fixed here**: several leaf-level "reduce/hide" overrides (`rain_light`, `snow_first`, `wind_breeze`) were silently losing the CSS cascade to the general prefix rule, because the general rule had an extra type selector (e.g. `.path-sketch[data-weather^="rain"] .sketch-rain line`) giving it higher specificity than the override (`.path-sketch[data-weather="rain_light"] .sketch-rain-2`, no type selector). The fix was to add matching type selectors to the overrides (`line.sketch-rain-2`, `circle.sketch-snow-2`, `path.sketch-wind-2`) so both rules sit at equal specificity and source order (override declared later) decides correctly.

## 4. The road bubble

### 4.1 Data model
Unlike the other four categories, `road` is not a tree. It is three independent facets, each a flat option list:

```js
const ROAD_FACETS = [
  { key: "course",  label: L("走向", "Course"),  options: [straight, gentle_bend, winding] },
  { key: "width",   label: L("宽度", "Width"),   options: [narrow, medium, wide] },
  { key: "surface", label: L("路面", "Surface"), options: [dirt, stone, gravel, asphalt] },
];
const ROAD_DEFAULTS = { course: "straight", width: "medium", surface: "dirt" };
```

The **course** facet is deliberately not framed as a yes/no "is it straight" question (an explicit design correction mid-session): the options are *笔直向前/Straight ahead*, *微微蜿蜒/Gently winding*, *蜿蜒曲折/Winding and twisting* — a spectrum, not a binary.

`openRoadPicker()` / `renderRoadPicker()` render all three facets as chip rows in one panel (`roadDraft` holds the in-progress picks), plus a `roadCustomToggle` escape hatch that lets the user type one free-text description of the whole road instead. Confirming writes a single combined object to `state.selections.road`:

```js
{ course, width, surface, custom: false, label: "蜿蜒曲折 · 宽阔 · 石板" }
```

so every other piece of generic code (`renderBubbles`, `renderSelectionSummary`) that just reads `selection.label` keeps working unmodified for this bubble too.

### 4.2 Geometry — genuine polyline winding, not a whole-shape tilt
The road is drawn as an SVG `<polygon>` (`.sketch-road`) plus a center `<polyline>` (`.sketch-road-line`, changed from a plain two-point `<line>` specifically to support intermediate kink points). Both are computed, not CSS-driven:

```js
const ROAD_WIDTH_GEOMETRY = {
  narrow: { apexHalf: 12, baseHalf: 90 },
  medium: { apexHalf: 20, baseHalf: 130 },
  wide:   { apexHalf: 30, baseHalf: 170 },
};

const ROAD_COURSE_GEOMETRY = {
  straight:     { checkpoints: [{t:0, dx:0}, {t:1, dx:0}] },
  gentle_bend:  { checkpoints: [{t:0, dx:0}, {t:0.55, dx:18}, {t:1, dx:18}] },
  winding:      { checkpoints: [{t:0, dx:0}, {t:0.35, dx:-20}, {t:0.65, dx:20}, {t:1, dx:8}] },
};
```

`buildRoadPoints(widthKey, courseKey)` walks the course's checkpoints from the vanishing-point apex (y=215) to the foreground base (y=320) in the sketch's 480×320 viewBox. At each checkpoint it linearly interpolates the half-width between `apexHalf` and `baseHalf`, offsets the centerline by that checkpoint's `dx`, and emits a left-edge and right-edge vertex. More checkpoints means more polygon vertices, which reads visually as an angular kink (a genuine 折线) at each one rather than a smooth curve — matching the explicit request ("路弯弯曲曲（折线...）") and keeping the bend modest (`dx` stays small relative to the 480px canvas width, per "弯度不用过大，只需要表示出来"). `applyRoadVisual()` writes the resulting `points` string onto the polygon, the surface fill color (`ROAD_SURFACE_FILLS`) onto its `style.fill`, and the center `points` onto the polyline.

With no road selection made, `currentRoadStyle()` falls back to `ROAD_DEFAULTS` (straight/medium/dirt), which reproduces the exact hardcoded road shape the sketch always had — so the new picker is additive, not a visual regression for users who never touch the road bubble.

### 4.3 Text description
`roadDescription()` turns the three facet choices into a natural-language noun phrase for prompting, e.g. `"a wide, winding, twisting stone-paved path"`, using three small adjective/noun lookup tables (`ROAD_WIDTH_ADJECTIVES`, `ROAD_COURSE_ADJECTIVES`, `ROAD_SURFACE_NOUNS`). A custom free-text road selection short-circuits this and returns the user's raw label instead.

## 5. Background music

Ported verbatim from `app.js` so the two pages share the exact same ambience: `MUSIC_TRACKS` (two mp3 paths), a `musicState` object tracking two `<audio>` elements (`audios[0]`/`audios[1]`) for crossfading, `startBackgroundMusic(volume)`, `duckBackgroundMusic()` / `restoreBackgroundMusicVolume()` (dip the music while the intro voice-over plays, restore after), `maybeCrossfadeMusic(audio)` and `playNextMusicTrack()` for gapless track-to-track transitions, and `fadeAudio(audio, targetVolume, durationMs, pauseWhenDone)` as the shared timer-based volume-ramp primitive. Music starts when the language is chosen (`chooseLanguage()`) and stops when the user moves into the confirm screen or starts the 2D experience.

## 6. Prompt synthesis (the AI step)

`summarizeSelections()` is the one point where an LLM is involved. It calls OpenAI's Responses API directly from the browser (`POST https://api.openai.com/v1/responses`, model `gpt-4o`), with structured output enforced via `text.format = { type: "json_schema", schema: FINAL_RESULT_SCHEMA }`:

```js
const FINAL_RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    atmosphere_description: { type: "string" },
    prompt2_sound: { type: "string" },
    prompt3_music: { type: "string" },
    negative_prompt: { type: "string" },
    scene_tags: { type: "array", items: { type: "string" } },
  },
  required: ["title", "atmosphere_description", "prompt2_sound", "prompt3_music", "negative_prompt", "scene_tags"],
};
```

Two design decisions here are load-bearing for consistency across repeated generations:

**a) The road/composition sentence is never AI-authored.** `buildRoadStructureSentence(roadDescription())` produces a fixed template string:

> "The scene shows {road description}, extending from the foreground to one vanishing point at the horizon, shown in centered one-point perspective. Two rows of trees line both sides of the path, evenly spaced, canopies visible against the sky. The path and its flanking trees are the only structural elements in the scene — no forks, no side paths, no clearings, no other landmarks."

This sentence is sent to the model as `fixed_scene_concept` (context, not something to rephrase) and the model is asked only for `atmosphere_description` — a separate sentence about mood/lighting/season/weather. The two are concatenated client-side afterward:

```js
prompt1EnvironmentText = [roadStructureSentence, finalPrompts.atmosphere_description, PANORAMA_360_SUFFIX]
  .filter(Boolean).join(" ");
```

`road` is explicitly excluded from the `selections` payload sent to the model (`if (category.key === "road") return;`) precisely because its wording is already fully determined by the template, not something the AI should re-derive.

**b) Sound prompts are anchored to concrete weather keywords, not vague paraphrase.** `WEATHER_SOUND_HINTS` maps every weather leaf id (and each top-level id as a fallback, plus a generic `default`) to a concrete acoustic description, e.g.:

```js
rain_thunder: "steady rain with distant, low rolling thunder -- no sharp cracks",
wind_gale:    "powerful, forceful gale-force wind with creaking branches",
snow_first:   "very quiet, hushed first snowfall, barely audible",
```

`weatherSoundHint()` resolves the current weather selection down to its most specific hint and sends it to the model as `weather_sound_hint`, with the system prompt instructing strict adherence to those keywords for `prompt2_sound` — so "雷阵雨/Thunderstorm" reliably yields a sound prompt describing rain-plus-thunder rather than something the model free-associates from a two-character label.

The final `state.output` bundles `prompt1_environment_360`, `prompt2_sound`, `prompt3_music` (used later by the generation calls) plus a `title` and a `timestamp` (`YYYYMMDDHHMMSS`, used as the shared record-folder key).

## 7. Generation and persistence (backend reuse)

All three network calls below hit the same shared Python server (`local_server.py`) that the chatbot page already used — no path-specific backend code exists beyond what both pages already shared.

- **`POST /save-generated-files`** — `saveResult()` sends `{ prompt: state.output.result, log, timestamp }`, where `log` includes `project_id: "PATH_<timestamp>"`, `mode: "path-bubble-picker"`, language, the raw per-category selections (including the full road facet object), and the title. This is what lands in `record/<timestamp>/...` and the `Log/`/`Prompt/` folders.
- **`POST /generate-2d-experience`** — sends a flattened (non-panoramic) version of the environment prompt (`buildFlatImagePrompt`, which strips the 360°/equirectangular phrasing and appends flat-2D-specific instructions), the sound prompt (post-processed by `buildSoundPrompt` to append a fixed "no static/hiss/distortion" noise-guard clause and truncate to a length budget), the chosen sound provider (`falai` or `elevenlabs`) and its key, and `image_model: "gpt-image-2"`. Response is `{ image_url, sound_url }`, used immediately by `start2dExperience()`.
- **`POST /generate-vr-experience`** — same shape but sends the full panoramic `prompt1_environment_360` as `environment_prompt` for a 360° equirectangular render, plus the same sound handling.

### 7.1 fal.ai audio post-processing (server-side, shared infrastructure)
For whichever sound-effect calls route through fal.ai's Stable Audio (`generate_falai_sound`, an async queue API: submit → poll → fetch → download), the server now also:
- Runs `steps=150` (raised from 100) for higher audio quality.
- Runs `make_seamless_loop(path, crossfade_seconds=1.2)` immediately afterward, which extracts head/tail/middle segments as **separate temp files** via `-ss`/`-t` before `-i` (not a single `-filter_complex` split graph — an ffmpeg `acrossfade` quirk silently produces empty output when the later-chronology segment is fed as the first input inside one graph), cross-fades tail+head into a seam file, concatenates middle+seam, and replaces the original file in place.

This is scoped only to the `falai` branch in both `handle_generate_2d_experience` and `handle_generate_vr_experience` — ElevenLabs's synchronous sound-generation call already has a native `loop: true` parameter and was left untouched.

## 8. What actually gets produced, end to end

For a completed run, the artifacts are:
1. A JSON prompt/log record saved under `record/<timestamp>/` (and `Prompt/`, `Log/`), tagged `mode: "path-bubble-picker"`.
2. A flat 2D landscape image + a matching ambient sound-effect track (seamlessly looped if generated via fal.ai) — the "2D experience."
3. A 360° equirectangular VR panorama + its own matching sound-effect track — the "VR experience," pre-generated for later in-headset playback.
4. Both are structurally deterministic in composition (one road, one-point perspective, two rows of flanking trees, no extra landmarks) regardless of which atmosphere/season/weather/time/light combination was picked — only the road's own width/course/surface and the AI-authored mood text vary.

## 9. Known gaps

- No real-browser verification has been performed on this document's author's side for the visual/interaction behavior of the picker UI or the sketch rendering (no browser tooling available in this environment) — verification of look-and-feel, click responsiveness, and the road polyline's visual appearance is still pending in an actual browser session.
- Everything else (syntax, CSS brace-balance, DOM-id cross-references, translation-key completeness, and the road's geometry/description/confirm-flow logic) has been checked with a Node.js-based harness that stubs DOM globals and evaluates the de-IIFE'd module directly.
