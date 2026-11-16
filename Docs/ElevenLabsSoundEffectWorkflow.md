# ElevenLabs Sound Effect Workflow

Blueprint node: `Generate Sound Effect From Prompt`

This node is a pure ElevenLabs generator. It does not call OpenAI or alter the prompt.

## Inputs

- `Api Key`: ElevenLabs API key.
- `Final Prompt`: Complete sound-effect prompt, maximum 450 characters.
- `Output Name`: Default `GeneratedSFX`.
- `Relative Output Directory`: Default `Saved/AISFX`.
- `Content Import Path`: Default `/Game/AISFX`.
- `Model Id`: Default `eleven_text_to_sound_v2`.
- `Output Format`: Default `mp3_44100_128`.
- `Duration Seconds`: Clamped to `0.5-30`.
- `Loop`: Requests loopable audio and marks the imported SoundWave as looping.
- `Prompt Influence`: `0-1`, default `0.3`.
- `Volume Gain Db` and `Normalize Volume`: Local WAV processing controls.
- `Convert To Wav For Unreal`: Default `true`.
- `Ffmpeg Executable Path`: `ffmpeg` or a full executable path.
- `Record Timestamp`: Optional. When set, the final audio file is also copied to `record/<Record Timestamp>/VR/sound_effect.<ext>` at the project root. Wire it from `Load Generated Prompt JSON`'s `Record Timestamp` output pin. Leave empty to skip archiving. See [GenerationRecordWorkflow.md](GenerationRecordWorkflow.md).

## Recommended Blueprint Flow

1. Call `Refine AI Generation Prompt` with preset `Sound Effect` for a scene description such as `nordic town in winter`.
2. Connect `Result.Refined Prompt` to this node's `Final Prompt`.
3. Or skip refinement and send a direct prompt such as `cold wind whistling through a snowy village street`.

The node saves the source audio, converts compressed audio to a UE-friendly WAV, imports it, and returns `Imported Sound` for playback.
