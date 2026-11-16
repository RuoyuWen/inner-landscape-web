# Generation Record Archive

Every completed generation (2D preview or VR asset) is additionally copied into a project-root `record/` folder, organized by the same timestamp that ties a 2D preview to its later VR generation:

```
record/
  <timestamp>/
    2D/
      image.png
      sound_effect.mp3
      music.mp3
    VR/
      image.png
      sound_effect.<mp3|wav>
      music.<mp3|wav>
```

This is a pure archive copy — it does not replace or change any existing output location (`Conversation/Experience/experience_<timestamp>/`, `Saved/AI360`, `Saved/AISFX`, `Saved/AIMusic`, and the `/Game/AI360` etc. imported assets all still work exactly as before).

## Timestamp

The timestamp is the one already generated client-side in `app.js` (`state.output.timestamp`) for a given conversation/prompt session. `/save-generated-files` now embeds it as a `"timestamp"` field inside `Conversation/Prompt/generated_prompt.json`.

## 2D side (automatic)

`Conversation/local_server.py`'s `/generate-2d-experience` handler copies whichever of `image.png` / `sound_effect.mp3` / `music.mp3` it generated into `record/<timestamp>/2D/` right after writing `manifest.json`. No Blueprint or app.js changes are needed for this half — it always fires when the 2D preview succeeds.

## VR side

There are now two ways VR output reaches `record/<timestamp>/VR/`:

- **`/generate-vr-experience` (automatic).** If the web app itself generated the VR assets (see [PregeneratedVRExperienceWorkflow.md](PregeneratedVRExperienceWorkflow.md)), it archives them the same way `/generate-2d-experience` does — no Blueprint involvement, no rewiring, it just happens.
- **The live C++ generator nodes (requires one-time Blueprint rewiring).** If a designer instead triggers `Generate 360 HDRI From Prompt` / `Generate Sound Effect From Prompt` / `Generate Music From Prompt` directly inside Unreal, those nodes have no timestamp of their own — a designer can trigger them independently of the web app, at any time. To archive their output under the same `record/<timestamp>/` folder as a matching 2D preview:

1. `Load Generated Prompt JSON` now has a `Record Timestamp` output pin (reads the `"timestamp"` field written by `/save-generated-files`; empty on older prompt files that predate this feature).
2. Connect that pin to the new `Record Timestamp` input on each of:
   - `Generate 360 HDRI From Prompt`
   - `Generate Sound Effect From Prompt`
   - `Generate Music From Prompt`
3. Leaving `Record Timestamp` empty on any node simply skips archiving for that node — generation and Content Browser import still work normally.

This rewiring has to be done by hand in the Blueprint graph; adding the parameter to the underlying `UFUNCTION` does not retroactively wire existing graphs.

## Sound effect is generated once, shared between 2D and VR

`/generate-2d-experience` and `/generate-vr-experience` send the exact same `sound_prompt` for a given `timestamp` (both read `state.output.result.prompt2_sound` from the one `generateOutputs()` call). Whichever endpoint runs first for that timestamp pays for the sound-effect generation once and archives it into `record/<timestamp>/{2D,VR}/sound_effect.<ext>` as described above; the *other* endpoint, run later for the same timestamp, checks `record/<timestamp>/VR/` then `record/<timestamp>/2D/` for an existing `sound_effect.*` file (`local_server.py`: `find_cached_sound_effect()`) and reuses those bytes instead of calling ElevenLabs/fal.ai again:

- 2D reuse: copies the cached file straight into `Experience/experience_<timestamp>/sound_effect.<ext>`.
- VR reuse: feeds the cached file directly into the existing `ffmpeg` conversion step as if it were freshly downloaded, so the fixed-path `VRExperienceSFX.wav` output is unaffected.

If a cache hit occurs, **no sound-effect API key is required at all** for that request (only the OpenAI key for the image/panorama). Which provider originally produced the cached audio wins for both modes — if you generate 2D with ElevenLabs then switch the Settings dropdown to fal.ai before generating VR for the same timestamp, VR still gets the ElevenLabs audio, not a fresh fal.ai one. Editing the scene and regenerating outputs produces a new timestamp, so it always gets fresh audio.

## Review page

`Conversation/inner-landscape-app/record.html` (linked from the main app's top bar) lets anyone browse `record/` in a browser: pick a timestamp from the list, then open its 2D or VR card. 2D playback is the flat image plus looping music/sound effect, same as the existing in-app "开始体验" screen. VR playback plays the same looping audio over a self-contained WebGL equirectangular panorama viewer (`record.js`) — drag to look around, scroll to zoom — so reviewers can see the 360 scene in a normal browser tab without a headset.

It's served by two additions to `local_server.py`:
- `GET /list-records` — scans `record/` and returns, per timestamp, which of `image` / `sound_effect` / `music` exist under `2D` and `VR`.
- `GET /record/<path>` (and `HEAD`) — serves files out of the project-root `record/` directory (outside the app's normal `Conversation/`-relative static root), with path-traversal checks.

## Notes

- Archiving is best-effort: if the `record/` copy fails (e.g. disk full, path too long), a warning is logged (`Logvrst`) but the generation itself still succeeds.
- The VR image is archived as `image.png` (the source panorama PNG, not the converted `.hdr`).
- VR audio file extensions depend on `Convert To Wav For Unreal` / `Output Format` on each node — archived as `.wav` when converted, otherwise the original ElevenLabs format extension.
