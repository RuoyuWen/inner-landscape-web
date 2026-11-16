# OpenAI Prompt Refiner Workflow

Blueprint node: `Refine AI Generation Prompt`

This standalone node converts a short natural-language idea into a final prompt. It does not generate an image or audio file.

## Inputs

- `Api Key`: OpenAI API key.
- `Simple Description`: Short scene or creative intent.
- `Preset`: `Skybox`, `Sound Effect`, `Music`, or `Custom`.
- `Model`: Default `gpt-5.4`.
- `Custom System Prompt`: Used only by the `Custom` preset.
- `Max Output Tokens`: Default `800`.

## Blueprint Connections

- Skybox: `Refined Prompt -> Generate 360 HDRI From Prompt.Final Prompt`
- Sound effect: `Refined Prompt -> Generate Sound Effect From Prompt.Final Prompt`
- Music: `Refined Prompt -> Generate Music From Prompt.Final Prompt`

You can also store, edit, display, or approve `Refined Prompt` before calling a generator. Each generator remains usable without OpenAI when a complete prompt is supplied directly.
