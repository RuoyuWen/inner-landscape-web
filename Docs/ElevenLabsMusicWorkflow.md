# ElevenLabs Music Workflow

Blueprint node: `Generate Music From Prompt`

This node is a pure Eleven Music generator. It does not call OpenAI or append production instructions.

## Inputs

- `Eleven Labs Api Key`: Required ElevenLabs API key.
- `Final Prompt`: Complete music prompt, maximum 4100 characters.
- `Output Name`: Default `GeneratedMusic`.
- `Relative Output Directory`: Default `Saved/AIMusic`.
- `Content Import Path`: Default `/Game/AIMusic`.
- `Music Model Id`: Default `music_v1`.
- `Output Format`: Default `mp3_44100_128`.
- `Duration Seconds`: `3-600`.
- `Force Instrumental`: Default `true`.
- `Loop In Unreal`: Marks the imported SoundWave as looping; it does not make the composition itself seamless.
- `Normalize Volume`, `Volume Gain Db`, `Convert To Wav For Unreal`, and `Ffmpeg Executable Path`: Local conversion controls.
- `Record Timestamp`: Optional. When set, the final audio file is also copied to `record/<Record Timestamp>/VR/music.<ext>` at the project root. Wire it from `Load Generated Prompt JSON`'s `Record Timestamp` output pin. Leave empty to skip archiving. See [GenerationRecordWorkflow.md](GenerationRecordWorkflow.md).

## Recommended Blueprint Flow

1. Call `Refine AI Generation Prompt` with preset `Music`.
2. Connect `Result.Refined Prompt` to this node's `Final Prompt`.
3. Or skip refinement and supply a complete Eleven Music prompt directly.

The node calls Eleven Music, saves the source file, converts it to stereo 48 kHz 16-bit WAV, imports it, and returns `Imported Music`.

Avoid copyrighted artist names, song titles, and lyrics in the final prompt.
