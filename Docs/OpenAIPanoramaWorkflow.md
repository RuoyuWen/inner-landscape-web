# OpenAI 360 Panorama Workflow

Blueprint node: `Generate 360 HDRI From Prompt`

This node is now a pure generator. It sends `Final Prompt` directly to the image API and does not refine or append text internally.

## Inputs

- `Api Key`: OpenAI API key.
- `Final Prompt`: Complete image-generation prompt.
- `Output Name`: Generated file stem.
- `Relative Output Directory`: Default `Saved/AI360`.
- `Image Model`: Default `gpt-image-1`.
- `Image Size`: Default `1536x1024`.
- `Image Quality`: Default `high`.
- `Content Import Path`: Default `/Game/AI360`.
- `Record Timestamp`: Optional. When set, the generated PNG is also copied to `record/<Record Timestamp>/VR/image.png` at the project root. Wire it from `Load Generated Prompt JSON`'s `Record Timestamp` output pin to keep this in the same record folder as the matching 2D preview. Leave empty to skip archiving. See [GenerationRecordWorkflow.md](GenerationRecordWorkflow.md).

## Recommended Blueprint Flow

1. Call `Refine AI Generation Prompt` with preset `Skybox`.
2. Connect `On Success -> Result.Refined Prompt` to this node's `Final Prompt`.
3. Alternatively, skip refinement and provide your own complete prompt directly.

## Output

The node saves a PNG, converts it with `Scripts/png_to_hdr.py`, and imports the HDR into the Content Browser in editor builds. All filesystem paths are project-relative.

For `Output Name = ForestNight`:

- `Saved/AI360/ForestNight.png`
- `Saved/AI360/ForestNight.hdr`
- `/Game/AI360/ForestNight.ForestNight`

The PNG-to-HDR step creates a Radiance RGBE file for the UE workflow, but cannot reconstruct true HDR lighting data absent from the generated image.
