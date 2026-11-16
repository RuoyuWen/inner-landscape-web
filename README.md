# AI Inner Landscape Co-Creation

A browser-based creative system that turns a person's descriptions or visual choices into landscape prompts, 2D scenes, spatial sound, and 360-degree experiences. The interface and dialogue default to English; Chinese remains available in the two creation flows.

## Run locally

Install Python 3.10 or newer. The Python server uses only the standard library, so no pip installation is required. Install FFmpeg with `ffmpeg` and `ffprobe` on your PATH for audio conversion, backup ambience, seamless loops, and VR sound generation.

From the repository root:

```sh
python Conversation/local_server.py
```

Open one of these addresses:

| Page | Local address |
| --- | --- |
| Dialogue creation | http://localhost:8765/inner-landscape-app/ |
| Visual road creation | http://localhost:8765/inner-landscape-app/path.html |
| Generation history and panorama playback | http://localhost:8765/inner-landscape-app/record.html |
| Study 2 questionnaire | http://localhost:8765/inner-landscape-app/study2.html |
| Study 2 results and CSV exports | http://localhost:8765/inner-landscape-app/study2-results.html |

On Windows, you can also double-click `Conversation/start.bat`, `start-path.bat`, or `start_study2.bat`. Keep one local server running at a time.

## API keys

No API keys are distributed with this repository. Enter your own keys in the page's Settings panel:

- OpenAI for dialogue, prompt synthesis, and image generation.
- ElevenLabs for audio, or fal.ai as the alternative sound effect provider.

Keys entered into the settings are kept in browser session storage. Image and sound generation requests pass through the localhost Python server; dialogue requests use the configured provider directly. Generation requires an appropriate provider account, model access, and available credits. No paid provider requests are needed to browse existing records.

Keep key files, `.env` files, access tokens, and private keys out of commits. `.gitignore` excludes common credential filenames and local caches. The legacy ElevenLabs key text file is deliberately absent.

## Included files

- `Conversation/inner-landscape-app/`: HTML, CSS, JavaScript, and the shared WebGL/WebXR panorama viewer.
- `Conversation/local_server.py`: static assets, generation, prompt/log saving, history, study progress, and CSV exports.
- `Conversation/music/`, `Conversation/Voice/`, `Conversation/intro_source/`: music, narration, and introduction images.
- `Conversation/Prompt/`, `Conversation/Log/`, `Conversation/Experience/`: existing prompts, dialogue logs, and generated experiences, preserved in their original language.
- `record/`: archived scenes, backup ambience, study stimuli, and existing response data.
- `SAM/`: Self-Assessment Manikin rating images.
- `Scripts/`: PNG-to-HDR conversion and supporting project scripts.
- `Docs/`: original system/workflow documentation and supplementary materials. Original documents retain their existing language.

The existing research records are included for completeness. Keep this repository private and invite specific collaborators when sharing these materials.

## VR and Unreal integration

The browser can display panoramas on desktop and supports immersive VR on compatible WebXR devices. Headset access requires a secure context; plain HTTP on another device is not sufficient. The server binds to localhost for local use.

VR generation writes fixed import files into `Saved/AI360/`, `Saved/AISFX/`, and `Saved/AIMusic/`. These directories are regenerated locally and ignored by Git. The Unreal editor project, engine caches, and compiled binaries are separate from this web repository.

## Hosting

This repository contains the full local web application. GitHub stores the source and resources; uploading it does not deploy the Python backend. GitHub Pages alone cannot run the generation, saving, history-listing, or study API endpoints. Run the local server for the complete workflow.
