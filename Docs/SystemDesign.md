# System Design: AI Inner Landscape Co-Creation System

## 1. Overview

The system has two major parts that are decoupled through the local file system rather than a live network connection. The first part is a browser-based web app backed by a small local Python server; it collects a structured scene description from the player and can render a quick 2D/audio preview — and can also pregenerate the VR assets themselves (see [PregeneratedVRExperienceWorkflow.md](PregeneratedVRExperienceWorkflow.md)). It has two independent front ends sharing the same Python backend: `index.html`/`app.js`, a conversational chatbot interview across ~15 scene fields, and `path.html`/`path.js`, a non-chat picker that fixes the scene to "a road flanked by trees" and only asks for 4 quick choices (season/weather/time/light) — see [PathBubbleDesignWorkflow.md](PathBubbleDesignWorkflow.md). Both converge on the same `prompt1_environment_360`/`prompt2_sound`/`prompt3_music` output shape and the same generation endpoints. The second major part is the Unreal Engine project; it either generates VR-ready assets live from a prompt (an OpenAI/ElevenLabs call per asset, blocking on the editor thread) or, if the web app already pregenerated them, imports the already-finished panorama HDRI skybox, ambient sound effect, and background music from a fixed local path with no network call at all.

The two sides do not talk to each other over HTTP. Instead they share one directory, `Conversation/`. The Python side writes JSON files into it; the Unreal side reads those same files from disk inside a Blueprint node. Unreal does not need the Python server to be running, and Python does not need to know Unreal exists — they only share a file format contract.

## 2. High-Level Architecture and Data Flow

```
Browser front end (inner-landscape-app/app.js)
  -> calls OpenAI Responses API directly (structured-output conversation agent)
     extracts scene fields turn by turn into a client-side state machine
  -> after user confirmation, calls OpenAI once more to produce the final prompts
     (json_schema output: prompt1_environment_360, prompt2_sound, prompt3_music,
      negative_prompt, scene_tags)
  -> POST http://localhost:8765/save-generated-files
       Python writes Conversation/Prompt/generated_prompt.json
       Python writes Conversation/Log/log_<timestamp>.json
  -> (optional) POST http://localhost:8765/generate-2d-experience
       Python calls the OpenAI Images API and the ElevenLabs sound/music APIs directly
       writes image.png / sound_effect.mp3 / music.mp3 + manifest.json under
       Conversation/Experience/experience_<timestamp>/
       the front end plays this back in-browser as a "2D preview experience"
       Python also copies those same files into record/<timestamp>/2D/ at the
       project root (see Docs/GenerationRecordWorkflow.md)
  -> (optional) POST http://localhost:8765/generate-vr-experience
       Python calls the OpenAI Images API with the un-flattened 360 prompt, converts
       the PNG to HDR in-process via Scripts/png_to_hdr.py (no subprocess), calls
       ElevenLabs sound/music, and converts each to WAV via ffmpeg (no loudnorm --
       see Docs/PregeneratedVRExperienceWorkflow.md for why)
       writes to fixed, overwrite-in-place paths: Saved/AI360/VRExperiencePanorama.*,
       Saved/AISFX/VRExperienceSFX.wav, Saved/AIMusic/VRExperienceMusic.wav
       also archives a copy into record/<timestamp>/VR/

Unreal Engine project (Source/vrst)
  -> Blueprint node: Load Generated Prompt JSON (PromptJsonReader.cpp)
       reads Conversation/Prompt/generated_prompt.json directly from disk
       parses out prompt1_environment_360 / prompt2_sound / prompt3_music, plus an
       optional "timestamp" field (Record Timestamp output) written by
       /save-generated-files, used to tie VR output back to the same
       record/<timestamp>/ folder as the matching 2D preview
  -> Blueprint node: Generate 360 HDRI From Prompt (OpenAIPanoramaGenerator.cpp)
       calls the OpenAI Images API, saves the returned PNG to Saved/AI360/
       synchronously shells out to system python via FPlatformProcess::ExecProcess,
       running Scripts/png_to_hdr.py <png path> <hdr path>
       imports the resulting .hdr into the Content Browser (/Game/AI360) as a
       panoramic skybox; if Record Timestamp is wired in, also copies the PNG to
       record/<timestamp>/VR/image.png
  -> Blueprint node: Generate Sound Effect From Prompt (ElevenLabsSoundEffectGenerator.cpp)
       calls the ElevenLabs sound-generation API, optionally converts to WAV via
       ffmpeg, imports into /Game/AISFX; if Record Timestamp is wired in, also
       copies the final audio file to record/<timestamp>/VR/sound_effect.<ext>
  -> Blueprint node: Generate Music From Prompt (ElevenLabsMusicGenerator.cpp)
       calls the ElevenLabs Music API, converts to 48 kHz stereo WAV,
       imports into /Game/AIMusic; if Record Timestamp is wired in, also copies
       the final audio file to record/<timestamp>/VR/music.<ext>
  -> Blueprint node: Import Pregenerated VR Experience (PregeneratedVRImporter.cpp)
       the fast alternative to the three live-generation nodes above: makes no
       network calls at all, just synchronously imports whichever of
       Saved/AI360/VRExperiencePanorama.hdr, Saved/AISFX/VRExperienceSFX.wav,
       Saved/AIMusic/VRExperienceMusic.wav already exist (written ahead of time by
       /generate-vr-experience) into /Game/AI360, /Game/AISFX, /Game/AIMusic;
       wire this into a "start experience" trigger so clicking it is instant
       instead of blocking on generation -- see PregeneratedVRExperienceWorkflow.md
  -> Blueprint node: Refine AI Generation Prompt (OpenAIPromptRefiner.cpp)
       optional upstream node that turns a short description into a complete
       prompt via an OpenAI text call; this path is independent of the web
       front end, so a designer can drive the whole generation flow from inside
       Unreal without ever opening the browser app
  -> OpenAIConversationNode.cpp is the generic low-level node
       (Send OpenAI Conversation Message), wrapping POST /v1/responses with
       plain text, json_object, and json_schema modes; the refiner and other
       nodes are built on top of it
  -> OpenAIRealtimeVoiceNode.cpp is a separate real-time voice channel
       (WebSocket to the OpenAI Realtime API): captures microphone audio,
       streams it up, receives streamed transcription/response audio, and
       plays it back through a USoundWaveProcedural; this is unrelated to
       asset generation and is used for live in-VR voice conversation
```

## 3. Python Side

`Conversation/local_server.py` runs a `http.server.ThreadingHTTPServer` bound to `localhost:8765`, with no third-party dependencies. It does two things:

**Static file serving.** It serves `inner-landscape-app/` (HTML/CSS/JS) and the media under `Conversation/` (music, intro voice clips, etc.) so the browser can load and run the app.

**Three POST endpoints.**

- `/save-generated-files` — receives the final scene prompts the front end already produced (after the OpenAI conversation and user confirmation) and writes them to disk: `Prompt/generated_prompt.json` (now including the session's `timestamp` field, see below) and a timestamped `Log/log_<ts>.json`. The log file holds the full conversation record, kept for research/review purposes, not for Unreal's consumption. This handler makes no external API calls; it is pure persistence.
- `/generate-2d-experience` — POSTs directly to `api.openai.com/v1/images/generations` for a 2D preview image, and to ElevenLabs' sound-generation and music endpoints for a matching sound effect and music track. The three media files plus a `manifest.json` are written to `Experience/experience_<timestamp>/`, and the same three files are additionally copied to `record/<timestamp>/2D/` at the project root. The Python path exists so a researcher can see a rough 2D-plus-audio preview in the browser without opening Unreal at all.
- `/generate-vr-experience` — the web app's own implementation of the VR asset pipeline: same OpenAI/ElevenLabs calls as the C++ generator nodes, but run from Python ahead of time and written to fixed, overwrite-in-place paths (`Saved/AI360/VRExperiencePanorama.*`, `Saved/AISFX/VRExperienceSFX.wav`, `Saved/AIMusic/VRExperienceMusic.wav`) that Unreal's `Import Pregenerated VR Experience` node reads from with zero network calls. See [PregeneratedVRExperienceWorkflow.md](PregeneratedVRExperienceWorkflow.md).

**Generation record archive.** The 2D preview, the pregenerated VR endpoint, and (if a designer wires `Record Timestamp` through) the live VR generator nodes all additionally archive their output into `record/<timestamp>/2D/` or `record/<timestamp>/VR/` at the project root, using the same client-generated timestamp for a given prompt session. See [GenerationRecordWorkflow.md](GenerationRecordWorkflow.md) for the full contract.

API keys live only in the browser (`sessionStorage` or page memory) for the whole session; the front end attaches them to each request body, and Python forwards them as HTTP headers to OpenAI/ElevenLabs. Keys are never written into `project.json` or any other output file, matching the design requirement that API keys must not end up in project output.

## 4. Unreal Engine Side

Everything on the Unreal side is exposed to Blueprint either as a `UBlueprintFunctionLibrary` (synchronous) or a `UBlueprintAsyncActionBase` / custom `UObject` (asynchronous), and it talks to external services directly through Unreal's built-in `Http` module (`IHttpRequest` / `IHttpResponse`) — never through Python. The important points in the asset-generation chain:

1. **File hand-off, not network hand-off.** `PromptJsonReader` does not fetch anything over the network; it resolves the project-relative path `Conversation/Prompt/generated_prompt.json` via `FPaths`, loads it, and parses it with `FJsonObject`. As long as Python has written the file, Unreal can read it at any time — the Python process does not need to still be running.

2. **The one place Unreal calls out to Python.** Unreal has no built-in way to turn a PNG into a Radiance RGBE `.hdr` file for a panoramic skybox. `OpenAIPanoramaGenerator::ConvertPngToHdr()` calls `FPlatformProcess::ExecProcess` to synchronously run `Scripts/png_to_hdr.py <png path> <hdr path>` using whatever `python` is on PATH. The script is deliberately dependency-free (it hand-rolls PNG decoding, zlib inflate, and the Paeth predictor using only the standard library) so it runs on a stock Python install with no virtualenv or pip install required on an artist's or designer's machine. The resulting `.hdr` is then imported into the Content Browser under `/Game/AI360`.

3. **Audio generation.** The sound-effect and music nodes call ElevenLabs directly, optionally convert the result to WAV via an external `ffmpeg` executable (not Python), and import the result as a `USoundWave` into `/Game/AISFX` or `/Game/AIMusic`.

4. **A second, independent prompt path.** `Refine AI Generation Prompt`, the three generator nodes, and `OpenAIConversationNode` are all plain Blueprint-exposed HTTP wrappers that can be freely wired together inside Unreal (e.g. "short description -> Refine -> feed straight into Generate 360 HDRI From Prompt"). This path never touches the web front end or Python; it is a second, self-contained way to produce the same three prompt strings that the web app also produces, and both paths converge on the same generator node inputs.

5. **Pregenerated import, no network.** `PregeneratedVRImporter::ImportPregeneratedVRExperience()` is the odd one out: a plain synchronous `UBlueprintFunctionLibrary` function (not a `UBlueprintAsyncActionBase`), because there is no async work to do. It never touches `IHttpRequest`, `png_to_hdr.py`, or `ffmpeg` — it just checks whether the three fixed-path files exist and, for whichever do, runs the same `UAssetImportTask` machinery the live generator nodes use. This is what makes a "start experience" button instant when the web app already ran `/generate-vr-experience`.

## 5. End-to-End Walkthrough

1. The user opens `inner-landscape-app` in a browser and has a conversation that progressively fills in the scene fields (feeling_keyword, place, season, weather, soundscape, spatial_structure, etc.).
2. On every turn, the front-end state machine (`state.scene` in `app.js`) re-extracts the *entire* checklist from a structured OpenAI response — not just the field that was just asked about — so one answer can update several fields at once.
3. On the confirmation screen the user edits or locks fields.
4. The front end makes one more OpenAI call to turn the confirmed scene into the three final generation prompts.
5. It POSTs that result to the local Python server, which writes `generated_prompt.json`.
6. Optionally, it also POSTs to `/generate-2d-experience` to get an immediate 2D image + sound + music preview rendered in the browser.
7. Optionally, it also POSTs to `/generate-vr-experience`, which runs the whole VR asset pipeline (panorama + SFX + music) in Python and writes it to the fixed paths described in [PregeneratedVRExperienceWorkflow.md](PregeneratedVRExperienceWorkflow.md), ahead of ever opening Unreal.
8. A designer opens the Unreal Editor. Two options from here:
   - **Live generation:** click `Load Generated Prompt JSON` to pull in the three prompt strings, then feed them into `Generate 360 HDRI From Prompt`, `Generate Sound Effect From Prompt`, and `Generate Music From Prompt`. Unreal makes its own HTTP calls, shells out to Python only for the PNG-to-HDR conversion step, and imports the resulting HDRI/SoundWave assets into `/Game/AI360`, `/Game/AISFX`, and `/Game/AIMusic`.
   - **Pregenerated (fast path):** if step 7 already ran, click `Import Pregenerated VR Experience` instead — no prompts, no HTTP calls, just an instant local import of whatever the web app already produced. This is what a "start experience" button should call for a click-and-go demo.

## 6. Key Design Trade-offs

**File-based hand-off instead of a network API between Python and Unreal.** This means Unreal never needs a long-running Python process and never has to handle connection failures or retries. The cost is that the Unreal step is manually triggered — a designer has to click the Blueprint node to read the file. The design spec explicitly states the first version "does not need to generate a complete VR scene directly," only "a standardized configuration usable by later 2D and VR generation modules," so this trade-off is intentional, not an oversight.

**A dependency-free PNG-to-HDR script instead of an image library.** This keeps Unreal's external Python dependency to "any stock Python on PATH," with no environment to maintain. `FPlatformProcess::ExecProcess` blocks synchronously, so the editor freezes for the duration of the conversion — an accepted cost for implementation simplicity.

**Two independent implementations of "call OpenAI/ElevenLabs to generate media," now duplicated a third time.** The web 2D preview, the Unreal VR asset pipeline (C++), and the web VR-pregeneration endpoint (Python, mirroring the C++ logic) share no code — they run in different runtimes with no shared execution environment, so each has to implement the same external API calls independently. The Python VR path does reuse `Scripts/png_to_hdr.py` directly (as a module, not a subprocess) rather than reimplementing PNG→HDR a third time, since that script already had no Unreal-specific dependencies.
