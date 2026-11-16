import base64
import csv
import importlib.util
import io
import json
import re
import shutil
import subprocess
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path, PurePosixPath
from urllib import error as urlerror
from urllib import request as urlrequest
from urllib.parse import parse_qs, quote, unquote


ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = ROOT.parent
PROMPT_DIR = ROOT / "Prompt"
LOG_DIR = ROOT / "Log"
EXPERIENCE_DIR = ROOT / "Experience"
RECORD_DIR = PROJECT_ROOT / "record"
SAM_DIR = PROJECT_ROOT / "SAM"
STUDY2_CSV_PATH = RECORD_DIR / "study2_responses.csv"
# Test-mode submissions (see the "测试模式" toggle in study2.js) go to a
# completely separate file so trying the flow out never touches real
# participant data -- no shared rows, no filtering-by-flag to get wrong.
STUDY2_TEST_CSV_PATH = RECORD_DIR / "study2_responses_test.csv"
STUDY2_CSV_HEADER = ["timestamp", "participant", "profile", "modality", "valence", "arousal", "dominance", "confidence"]


def study2_csv_path(is_test):
    return STUDY2_TEST_CSV_PATH if is_test else STUDY2_CSV_PATH


STUDY2_WIDE_PROFILE_COUNT = 24
# 8 participants (1-6 at the original offsets, 7-8 added at gap-filling
# offsets -- see profilesForParticipant()/PARTICIPANT_OFFSETS in study2.js)
# give every work exactly 4 reviews now, not 3.
STUDY2_WIDE_REVIEWERS_PER_WORK = 4


def study2_wide_header(max_reviewers=STUDY2_WIDE_REVIEWERS_PER_WORK):
    return (
        ["profile", "modality", "original_valence", "original_arousal", "original_dominance"]
        + [
            f"reviewer{i}_{field}"
            for i in range(1, max_reviewers + 1)
            # confidence has no "original" counterpart -- it's the reviewer's own
            # certainty judging someone else's emotional state, not something the
            # original creator would have self-rated.
            for field in ("participant", "valence", "arousal", "dominance", "confidence")
        ]
    )


def build_study2_wide_rows(rows, max_reviewers=STUDY2_WIDE_REVIEWERS_PER_WORK):
    # Reshapes the append-only submission log (one row per participant x
    # profile x modality) into one row per *work* (profile x modality), with
    # each of its reviewers' scores side by side. This is what the
    # researcher's two analyses actually need:
    #   1. reviewer score vs. the original creator's SAM score for that work
    #      (original_* columns are left blank here -- that data lives outside
    #      this app; the researcher merges it in for their own stats).
    #   2. agreement/variance across the reviewers of the same work, which
    #      requires seeing their scores in the same row to compare.
    # Every profile x modality combination is emitted even with zero reviews
    # so far, so the sheet also doubles as a "what's still missing" checklist
    # during an in-progress study. max_reviewers is overridden to the filter
    # size when a caller asks for a participant subset (see
    # handle_get_study2_wide/handle_download_study2_wide_csv), so a
    # cohort-only export doesn't carry mostly-empty reviewer columns sized
    # for the full participant count.
    grouped = {}
    for row in rows:
        key = (row.get("profile", ""), row.get("modality", ""))
        grouped.setdefault(key, []).append(row)

    wide_rows = []
    for profile_num in range(1, STUDY2_WIDE_PROFILE_COUNT + 1):
        profile = f"P{profile_num}"
        for modality in ("VR", "2D"):
            reviews = grouped.get((profile, modality), [])
            wide_row = {
                "profile": profile,
                "modality": modality,
                "original_valence": "",
                "original_arousal": "",
                "original_dominance": "",
            }
            for i in range(1, max_reviewers + 1):
                review = reviews[i - 1] if i - 1 < len(reviews) else None
                wide_row[f"reviewer{i}_participant"] = review["participant"] if review else ""
                wide_row[f"reviewer{i}_valence"] = review["valence"] if review else ""
                wide_row[f"reviewer{i}_arousal"] = review["arousal"] if review else ""
                wide_row[f"reviewer{i}_dominance"] = review["dominance"] if review else ""
                wide_row[f"reviewer{i}_confidence"] = review.get("confidence", "") if review else ""
            wide_rows.append(wide_row)
    return wide_rows
# Pre-made ambience clips. Keyed by the exact weather id path.js resolves via
# backupSoundCategoryForWeather() (leaf id when a leaf has its own clip, e.g.
# "rain_thunder", else the top-level branch, e.g. "overcast"). A category with
# a matching, existing file skips ElevenLabs/fal.ai generation entirely -- see
# handle_generate_2d_experience/handle_generate_vr_experience. Anything not
# listed here still generates normally; if that result comes back effectively
# silent (see is_effectively_silent) it's just logged, since there's no clip
# to substitute for it.
BACKUP_SOUND_DIR = PROJECT_ROOT / "record" / "backup"
BACKUP_SOUND_PATHS = {
    "clear": BACKUP_SOUND_DIR / "backup_wind_bird.mp3",
    "wind_breeze": BACKUP_SOUND_DIR / "backup_wind_bird.mp3",
    "overcast": BACKUP_SOUND_DIR / "backup_thunder_wind.mp3",
    "rain_thunder": BACKUP_SOUND_DIR / "backup_thunder_rain.mp3",
    "rain_light": BACKUP_SOUND_DIR / "backup_rain_light.mp3",
    "snow_first": BACKUP_SOUND_DIR / "backup_snow.mp3",
    "snow_light": BACKUP_SOUND_DIR / "backup_snow.mp3",
    "wind_gale": BACKUP_SOUND_DIR / "backup_wind(loud)_leaves.mp3",
}
# Last-resort substitute for a generation that comes back effectively silent
# with no specific weather category resolved at all (see
# handle_generate_2d_experience/handle_generate_vr_experience) -- calm breeze
# ambience is the safest generic stand-in for the vague "quiet ambience"
# default hint that produces this case.
GENERIC_QUIET_FALLBACK_CATEGORY = "clear"


def resolve_backup_sound_path(category):
    path = BACKUP_SOUND_PATHS.get((category or "").strip().lower())
    return path if path and path.is_file() else None

# Fixed, overwrite-in-place paths the UE Blueprint side imports from directly
# (see Source/vrst/PregeneratedVRImporter.cpp) so a designer never has to
# rewire an import path after a web-triggered VR regeneration.
AI360_DIR = PROJECT_ROOT / "Saved" / "AI360"
AISFX_DIR = PROJECT_ROOT / "Saved" / "AISFX"
AIMUSIC_DIR = PROJECT_ROOT / "Saved" / "AIMusic"
VR_PANORAMA_STEM = "VRExperiencePanorama"
VR_SFX_STEM = "VRExperienceSFX"
VR_MUSIC_STEM = "VRExperienceMusic"


def _load_png_to_hdr_module():
    spec = importlib.util.spec_from_file_location("png_to_hdr", PROJECT_ROOT / "Scripts" / "png_to_hdr.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


PNG_TO_HDR = _load_png_to_hdr_module()


def parse_byte_range(range_header, file_size):
    match = re.match(r"bytes=(\d*)-(\d*)", range_header or "")
    if not match:
        raise ValueError(f"Invalid Range header: {range_header}")
    start_str, end_str = match.groups()
    if start_str == "" and end_str == "":
        raise ValueError(f"Invalid Range header: {range_header}")
    if start_str == "":
        start = max(file_size - int(end_str), 0)
        end = file_size - 1
    else:
        start = int(start_str)
        end = int(end_str) if end_str != "" else file_size - 1
    end = min(end, file_size - 1)
    if start > end or start >= file_size:
        raise ValueError("Range not satisfiable")
    return start, end


class InnerLandscapeHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def send_head(self):
        # SimpleHTTPRequestHandler has no Range support, so a Range GET (which
        # every <audio>/<video> element issues) always gets back a 200 with the
        # full body instead of 206. Chrome tolerates that for small files but
        # aborts the load (net::ERR_ABORTED -> NotSupportedError) for larger
        # ones -- which is why long backup ambience clips silently failed to
        # play in the browser while short generated clips did not.
        self._range_remaining = None
        path = self.translate_path(self.path)
        file_path = Path(path)
        if not file_path.is_file():
            return super().send_head()

        file_size = file_path.stat().st_size
        ctype = self.guess_type(path)
        range_header = self.headers.get("Range")
        try:
            if range_header:
                start, end = parse_byte_range(range_header, file_size)
                self.send_response(206)
            else:
                start, end = 0, file_size - 1
                self.send_response(200)
        except ValueError:
            self.send_error(416, "Requested Range Not Satisfiable")
            return None

        self.send_header("Content-type", ctype)
        self.send_header("Accept-Ranges", "bytes")
        if range_header:
            self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
        self.send_header("Content-Length", str(end - start + 1))
        self.send_header("Last-Modified", self.date_time_string(file_path.stat().st_mtime))
        self.end_headers()

        stream = file_path.open("rb")
        stream.seek(start)
        self._range_remaining = end - start + 1
        return stream

    def copyfile(self, source, outputfile):
        remaining = self._range_remaining
        if remaining is None:
            super().copyfile(source, outputfile)
            return
        bufsize = 64 * 1024
        try:
            while remaining > 0:
                chunk = source.read(min(bufsize, remaining))
                if not chunk:
                    break
                outputfile.write(chunk)
                remaining -= len(chunk)
        finally:
            source.close()

    def do_GET(self):
        request_path = self.path.split("?", 1)[0]
        if request_path.startswith("/record/"):
            self.handle_record_file(write_body=True)
            return
        if request_path.startswith("/sam-assets/"):
            self.handle_sam_asset_file(write_body=True)
            return
        if request_path == "/list-records":
            self.handle_list_records()
            return
        if request_path == "/study2/responses":
            self.handle_get_study2_responses()
            return
        if request_path == "/study2/responses.csv":
            self.handle_download_study2_csv()
            return
        if request_path == "/study2/responses-wide":
            self.handle_get_study2_wide()
            return
        if request_path == "/study2/responses-wide.csv":
            self.handle_download_study2_wide_csv()
            return
        super().do_GET()

    def do_HEAD(self):
        request_path = self.path.split("?", 1)[0]
        if request_path.startswith("/record/"):
            self.handle_record_file(write_body=False)
            return
        if request_path.startswith("/sam-assets/"):
            self.handle_sam_asset_file(write_body=False)
            return
        super().do_HEAD()

    def do_POST(self):
        if self.path == "/save-generated-files":
            self.handle_save_generated_files()
            return
        if self.path == "/generate-2d-experience":
            self.handle_generate_2d_experience()
            return
        if self.path == "/generate-vr-experience":
            self.handle_generate_vr_experience()
            return
        if self.path == "/save-sketch":
            self.handle_save_sketch()
            return
        if self.path == "/study2/submit-sam":
            self.handle_submit_sam()
            return
        self.send_error(404, "Not found")

    def read_json_payload(self):
        length = int(self.headers.get("Content-Length", "0"))
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def send_json(self, status, payload):
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(payload, ensure_ascii=False).encode("utf-8"))

    def handle_save_generated_files(self):
        try:
            payload = self.read_json_payload()
            prompt = payload["prompt"]
            log = payload["log"]
            timestamp = safe_timestamp(payload.get("timestamp", ""))

            PROMPT_DIR.mkdir(exist_ok=True)
            LOG_DIR.mkdir(exist_ok=True)

            prompt_path = PROMPT_DIR / "generated_prompt.json"
            log_path = LOG_DIR / f"log_{timestamp}.json"

            prompt_with_timestamp = {**prompt, "timestamp": timestamp}
            prompt_path.write_text(json.dumps(prompt_with_timestamp, ensure_ascii=False, indent=2), encoding="utf-8")
            log_path.write_text(json.dumps(log, ensure_ascii=False, indent=2), encoding="utf-8")

            self.send_json(200, {
                "ok": True,
                "prompt_path": str(prompt_path),
                "log_path": str(log_path),
            })
        except Exception as exc:
            self.send_json(500, {"ok": False, "error": str(exc)})

    def handle_generate_2d_experience(self):
        try:
            payload = self.read_json_payload()
            openai_key = payload.get("openai_api_key", "").strip()
            elevenlabs_key = payload.get("elevenlabs_api_key", "").strip()
            fal_key = payload.get("fal_api_key", "").strip()
            sound_provider = (payload.get("sound_provider") or "elevenlabs").strip().lower()
            flat_image_prompt = payload.get("flat_image_prompt", "").strip()
            sound_prompt = payload.get("sound_prompt", "").strip()
            ffmpeg_path = payload.get("ffmpeg_path", "").strip() or "ffmpeg"
            timestamp = safe_timestamp(payload.get("timestamp", ""))
            backup_sound_category = payload.get("backup_sound_category", "")
            direct_backup_path = resolve_backup_sound_path(backup_sound_category)

            cached_sound = find_cached_sound_effect(timestamp) if not is_none_prompt(sound_prompt) else None

            if not openai_key:
                raise ValueError("OpenAI API key is required for image generation.")
            if not flat_image_prompt:
                raise ValueError("Flat image prompt is empty.")
            if not is_none_prompt(sound_prompt) and not cached_sound and not direct_backup_path:
                if sound_provider == "falai" and not fal_key:
                    raise ValueError("fal.ai API key is required for sound effect generation.")
                if sound_provider != "falai" and not elevenlabs_key:
                    raise ValueError("ElevenLabs API key is required for sound effect generation.")

            experience_dir = EXPERIENCE_DIR / f"experience_{timestamp}"
            experience_dir.mkdir(parents=True, exist_ok=True)

            image_path = experience_dir / "image.png"
            generate_openai_image(openai_key, flat_image_prompt, image_path, payload.get("image_model", "gpt-image-2"))

            sound_path = None
            if not is_none_prompt(sound_prompt):
                if direct_backup_path:
                    # This weather has its own matching clip -- skip generation
                    # entirely rather than pay for an ElevenLabs call. Re-encode
                    # (not raw-copy) since backup files are of unknown container
                    # quality -- see normalize_audio_to_mp3.
                    sound_path = experience_dir / "sound_effect.mp3"
                    normalize_audio_to_mp3(direct_backup_path, sound_path, ffmpeg_path=ffmpeg_path)
                elif cached_sound:
                    sound_path = experience_dir / f"sound_effect{cached_sound.suffix}"
                    shutil.copy2(cached_sound, sound_path)
                else:
                    if sound_provider == "falai":
                        sound_path = generate_falai_sound(fal_key, sound_prompt, experience_dir / "sound_effect")
                        make_seamless_loop(sound_path, ffmpeg_path=ffmpeg_path)
                    else:
                        sound_path = experience_dir / "sound_effect.mp3"
                        generate_elevenlabs_sound(elevenlabs_key, sound_prompt, sound_path)
                    if is_effectively_silent(sound_path, ffmpeg_path=ffmpeg_path):
                        generic_fallback = None if backup_sound_category else resolve_backup_sound_path(GENERIC_QUIET_FALLBACK_CATEGORY)
                        if generic_fallback:
                            # No specific weather category was resolved (e.g. a
                            # custom weather entry with no keyword match), so the
                            # prompt used the generic "quiet ambience" hint -- a
                            # calm-breeze clip is a reasonable stand-in for that,
                            # unlike for a resolved-but-uncovered category (e.g.
                            # rain_heavy), where substituting would misrepresent it.
                            print(f"[warn] generated sound effect for '{sound_provider}' came back effectively "
                                  f"silent -- substituting generic ambience clip: {sound_path}")
                            normalize_audio_to_mp3(generic_fallback, sound_path, ffmpeg_path=ffmpeg_path)
                        else:
                            print(f"[warn] generated sound effect for '{backup_sound_category or sound_provider}' "
                                  f"came back effectively silent, no backup clip covers it: {sound_path}")

            # Music generation is disabled for now (ElevenLabs credit cost) --
            # generate_elevenlabs_music() is kept around, just unused, so this is
            # easy to turn back on.
            manifest = {
                "image_model": payload.get("image_model", "gpt-image-2"),
                "flat_image_prompt": flat_image_prompt,
                "sound_prompt": sound_prompt if sound_path else "none",
                "music_prompt": "disabled",
                "image_path": str(image_path),
                "sound_path": str(sound_path) if sound_path else None,
                "music_path": None,
            }
            manifest_path = experience_dir / "manifest.json"
            manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

            archive_record_files(timestamp, "2D", [image_path, sound_path])

            self.send_json(200, {
                "ok": True,
                "manifest_path": str(manifest_path),
                "image_url": local_url(image_path),
                "sound_url": local_url(sound_path) if sound_path else None,
                "music_url": None,
            })
        except Exception as exc:
            self.send_json(500, {"ok": False, "error": str(exc)})

    def handle_generate_vr_experience(self):
        try:
            payload = self.read_json_payload()
            openai_key = payload.get("openai_api_key", "").strip()
            elevenlabs_key = payload.get("elevenlabs_api_key", "").strip()
            fal_key = payload.get("fal_api_key", "").strip()
            sound_provider = (payload.get("sound_provider") or "elevenlabs").strip().lower()
            environment_prompt = payload.get("environment_prompt", "").strip()
            sound_prompt = payload.get("sound_prompt", "").strip()
            ffmpeg_path = payload.get("ffmpeg_path", "").strip() or "ffmpeg"
            timestamp = safe_timestamp(payload.get("timestamp", ""))
            backup_sound_category = payload.get("backup_sound_category", "")
            direct_backup_path = resolve_backup_sound_path(backup_sound_category)

            cached_sound = find_cached_sound_effect(timestamp) if not is_none_prompt(sound_prompt) else None

            if not openai_key:
                raise ValueError("OpenAI API key is required for panorama generation.")
            if not environment_prompt:
                raise ValueError("Environment 360 prompt is empty.")
            if not is_none_prompt(sound_prompt) and not cached_sound and not direct_backup_path:
                if sound_provider == "falai" and not fal_key:
                    raise ValueError("fal.ai API key is required for sound effect generation.")
                if sound_provider != "falai" and not elevenlabs_key:
                    raise ValueError("ElevenLabs API key is required for sound effect generation.")

            # Fixed, overwrite-in-place filenames: the whole point is that the
            # UE Blueprint import node never needs its path rewired.
            AI360_DIR.mkdir(parents=True, exist_ok=True)
            panorama_png = AI360_DIR / f"{VR_PANORAMA_STEM}.png"
            panorama_hdr = AI360_DIR / f"{VR_PANORAMA_STEM}.hdr"
            generate_openai_image(openai_key, environment_prompt, panorama_png, payload.get("image_model", "gpt-image-2"))
            width, height, rgb = PNG_TO_HDR.read_png(panorama_png)
            PNG_TO_HDR.write_hdr(panorama_hdr, width, height, rgb)

            sfx_wav = None
            if not is_none_prompt(sound_prompt):
                AISFX_DIR.mkdir(parents=True, exist_ok=True)
                if direct_backup_path:
                    # This weather has its own matching clip -- skip generation
                    # entirely rather than pay for an ElevenLabs call.
                    sfx_source = direct_backup_path
                elif cached_sound:
                    sfx_source = cached_sound
                else:
                    if sound_provider == "falai":
                        sfx_source = generate_falai_sound(fal_key, sound_prompt, AISFX_DIR / f"{VR_SFX_STEM}.source")
                        make_seamless_loop(sfx_source, ffmpeg_path=ffmpeg_path)
                    else:
                        sfx_source = AISFX_DIR / f"{VR_SFX_STEM}.source.mp3"
                        generate_elevenlabs_sound(elevenlabs_key, sound_prompt, sfx_source)
                    if is_effectively_silent(sfx_source, ffmpeg_path=ffmpeg_path):
                        generic_fallback = None if backup_sound_category else resolve_backup_sound_path(GENERIC_QUIET_FALLBACK_CATEGORY)
                        if generic_fallback:
                            print(f"[warn] generated sound effect for '{sound_provider}' came back effectively "
                                  f"silent -- substituting generic ambience clip: {sfx_source}")
                            sfx_source = generic_fallback
                        else:
                            print(f"[warn] generated sound effect for '{backup_sound_category or sound_provider}' "
                                  f"came back effectively silent, no backup clip covers it: {sfx_source}")
                sfx_wav = AISFX_DIR / f"{VR_SFX_STEM}.wav"
                convert_audio_to_wav(sfx_source, sfx_wav, channels=1, ffmpeg_path=ffmpeg_path)

            # Music generation is disabled for now (ElevenLabs credit cost) --
            # generate_elevenlabs_music() is kept around, just unused, so this is
            # easy to turn back on.
            archive_record_files(timestamp, "VR", [panorama_png, sfx_wav])

            self.send_json(200, {
                "ok": True,
                "panorama_png_path": str(panorama_png),
                "panorama_hdr_path": str(panorama_hdr),
                "sound_wav_path": str(sfx_wav) if sfx_wav else None,
                "music_wav_path": None,
            })
        except Exception as exc:
            self.send_json(500, {"ok": False, "error": str(exc)})

    def handle_list_records(self):
        try:
            self.send_json(200, {"ok": True, "records": list_records()})
        except Exception as exc:
            self.send_json(500, {"ok": False, "error": str(exc)})

    def handle_save_sketch(self):
        try:
            payload = self.read_json_payload()
            timestamp = safe_timestamp(payload.get("timestamp", ""))
            data_url = payload.get("sketch_png", "")
            prefix = "data:image/png;base64,"
            if not data_url.startswith(prefix):
                raise ValueError("sketch_png must be a PNG data URL.")

            sketch_dir = RECORD_DIR / timestamp / "Sketch"
            sketch_dir.mkdir(parents=True, exist_ok=True)
            sketch_path = sketch_dir / "sketch.png"
            sketch_path.write_bytes(base64.b64decode(data_url[len(prefix):]))

            self.send_json(200, {
                "ok": True,
                "sketch_url": f"/record/{quote(timestamp)}/Sketch/{quote(sketch_path.name)}",
            })
        except Exception as exc:
            self.send_json(500, {"ok": False, "error": str(exc)})

    def handle_record_file(self, write_body):
        self.serve_dir_file("/record/", RECORD_DIR, write_body)

    def handle_sam_asset_file(self, write_body):
        self.serve_dir_file("/sam-assets/", SAM_DIR, write_body)

    def serve_dir_file(self, url_prefix, base_dir, write_body):
        try:
            relative = unquote(self.path.split("?", 1)[0][len(url_prefix):])
            relative_path = PurePosixPath(relative)
            if not relative or relative_path.is_absolute() or ".." in relative_path.parts:
                self.send_error(403, "Forbidden")
                return

            dir_root = base_dir.resolve()
            file_path = (base_dir / relative_path).resolve()
            if file_path != dir_root and dir_root not in file_path.parents:
                self.send_error(403, "Forbidden")
                return
            if not file_path.is_file():
                self.send_error(404, "Not found")
                return

            file_size = file_path.stat().st_size
            range_header = self.headers.get("Range")
            if range_header:
                try:
                    start, end = parse_byte_range(range_header, file_size)
                except ValueError:
                    self.send_error(416, "Requested Range Not Satisfiable")
                    return
                self.send_response(206)
                self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
            else:
                start, end = 0, file_size - 1
                self.send_response(200)
            self.send_header("Content-Type", self.guess_type(str(file_path)))
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Content-Length", str(end - start + 1))
            self.end_headers()
            if write_body:
                with file_path.open("rb") as f:
                    f.seek(start)
                    self.wfile.write(f.read(end - start + 1))
        except Exception as exc:
            self.send_error(500, str(exc))

    def handle_submit_sam(self):
        try:
            payload = self.read_json_payload()
            participant = str(payload.get("participant", "")).strip()
            profile = str(payload.get("profile", "")).strip()
            modality = str(payload.get("modality", "")).strip().upper()
            if not participant:
                raise ValueError("participant is required.")
            if not profile:
                raise ValueError("profile is required.")
            if modality not in ("VR", "2D"):
                raise ValueError("modality must be 'VR' or '2D'.")
            try:
                valence = int(payload.get("valence"))
                arousal = int(payload.get("arousal"))
                dominance = int(payload.get("dominance"))
            except (TypeError, ValueError):
                raise ValueError("valence/arousal/dominance must be integers.")
            if not all(1 <= v <= 9 for v in (valence, arousal, dominance)):
                raise ValueError("valence/arousal/dominance must be between 1 and 9.")
            try:
                confidence = int(payload.get("confidence"))
            except (TypeError, ValueError):
                raise ValueError("confidence must be an integer.")
            if not 1 <= confidence <= 7:
                raise ValueError("confidence must be between 1 and 7.")

            csv_path = study2_csv_path(bool(payload.get("test")))
            timestamp = time.strftime("%Y%m%d%H%M%S")
            RECORD_DIR.mkdir(parents=True, exist_ok=True)
            is_new = not csv_path.is_file()
            with csv_path.open("a", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                if is_new:
                    writer.writerow(STUDY2_CSV_HEADER)
                writer.writerow([timestamp, participant, profile, modality, valence, arousal, dominance, confidence])

            self.send_json(200, {"ok": True})
        except Exception as exc:
            self.send_json(500, {"ok": False, "error": str(exc)})

    def is_study2_test_request(self):
        return "1" in self.study2_query_values("test") or "true" in self.study2_query_values("test")

    def study2_query_values(self, key):
        query = self.path.split("?", 1)[1] if "?" in self.path else ""
        return parse_qs(query).get(key, [])

    def study2_participant_filter(self):
        # ?participants=7,8 restricts a response/export to just that cohort
        # -- e.g. exporting the two participants added after the original 6
        # separately, without touching how the unfiltered exports behave.
        values = self.study2_query_values("participants")
        if not values:
            return None
        participants = {p.strip() for p in values[0].split(",") if p.strip()}
        return participants or None

    def handle_get_study2_responses(self):
        try:
            self.send_json(200, {"ok": True, "responses": self.read_study2_rows()})
        except Exception as exc:
            self.send_json(500, {"ok": False, "error": str(exc)})

    def handle_download_study2_csv(self):
        is_test = self.is_study2_test_request()
        participant_filter = self.study2_participant_filter()
        rows = self.read_study2_rows()
        buffer = io.StringIO()
        writer = csv.DictWriter(buffer, fieldnames=STUDY2_CSV_HEADER)
        writer.writeheader()
        writer.writerows(rows)
        data = buffer.getvalue().encode("utf-8")
        suffix = "_" + "-".join(sorted(participant_filter, key=int)) if participant_filter else ""
        filename = f"study2_responses{suffix}{'_test' if is_test else ''}.csv"
        self.send_response(200)
        self.send_header("Content-Type", "text/csv; charset=utf-8")
        self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def read_study2_rows(self):
        csv_path = study2_csv_path(self.is_study2_test_request())
        rows = []
        if csv_path.is_file():
            with csv_path.open("r", newline="", encoding="utf-8") as f:
                rows = list(csv.DictReader(f))
        participant_filter = self.study2_participant_filter()
        if participant_filter:
            rows = [row for row in rows if row.get("participant") in participant_filter]
        return rows

    def handle_get_study2_wide(self):
        try:
            participant_filter = self.study2_participant_filter()
            max_reviewers = len(participant_filter) if participant_filter else STUDY2_WIDE_REVIEWERS_PER_WORK
            wide_rows = build_study2_wide_rows(self.read_study2_rows(), max_reviewers=max_reviewers)
            self.send_json(200, {"ok": True, "rows": wide_rows})
        except Exception as exc:
            self.send_json(500, {"ok": False, "error": str(exc)})

    def handle_download_study2_wide_csv(self):
        is_test = self.is_study2_test_request()
        participant_filter = self.study2_participant_filter()
        max_reviewers = len(participant_filter) if participant_filter else STUDY2_WIDE_REVIEWERS_PER_WORK
        wide_rows = build_study2_wide_rows(self.read_study2_rows(), max_reviewers=max_reviewers)
        buffer = io.StringIO()
        writer = csv.DictWriter(buffer, fieldnames=study2_wide_header(max_reviewers))
        writer.writeheader()
        writer.writerows(wide_rows)
        data = buffer.getvalue().encode("utf-8")
        suffix = "_" + "-".join(sorted(participant_filter, key=int)) if participant_filter else ""
        filename = f"study2_responses_wide{suffix}{'_test' if is_test else ''}.csv"
        self.send_response(200)
        self.send_header("Content-Type", "text/csv; charset=utf-8")
        self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


def safe_timestamp(value):
    return "".join(ch for ch in str(value) if ch.isdigit()) or "untitled"


def is_none_prompt(value):
    return not value or value.strip().lower() == "none"


def archive_record_files(timestamp, mode, paths):
    record_mode_dir = RECORD_DIR / timestamp / mode
    record_mode_dir.mkdir(parents=True, exist_ok=True)
    for path in paths:
        if path is None:
            continue
        shutil.copy2(path, record_mode_dir / path.name)


def find_cached_sound_effect(timestamp):
    """2D and VR generation share the same sound_prompt for a given timestamp
    (both read state.output.result.prompt2_sound for that one generateOutputs()
    call). Whichever mode ran first already archived its sound effect into
    record/<timestamp>/<mode>/ -- reuse that instead of paying for a second
    generation of what is semantically the same request.
    """
    for mode in ("VR", "2D"):
        mode_dir = RECORD_DIR / timestamp / mode
        if not mode_dir.is_dir():
            continue
        match = next((f for f in mode_dir.iterdir() if f.is_file() and f.stem == "sound_effect"), None)
        if match:
            return match
    return None


def list_records():
    if not RECORD_DIR.is_dir():
        return []

    records = []
    for timestamp_dir in sorted(RECORD_DIR.iterdir(), reverse=True):
        if not timestamp_dir.is_dir():
            continue

        modes = {}
        for mode in ("2D", "VR"):
            mode_dir = timestamp_dir / mode
            if not mode_dir.is_dir():
                continue

            # VR archives the fixed Unreal-facing filenames (VRExperiencePanorama /
            # VRExperienceSFX) rather than the generic "image"/"sound_effect" stems
            # 2D uses, so each key needs to accept both spellings.
            stem_aliases = {
                "image": ("image", VR_PANORAMA_STEM),
                "sound_effect": ("sound_effect", VR_SFX_STEM),
                "music": ("music",),
            }
            files = {}
            for key, stems in stem_aliases.items():
                match = next((f for f in mode_dir.iterdir() if f.is_file() and f.stem in stems), None)
                if match:
                    files[key] = f"/record/{quote(timestamp_dir.name)}/{mode}/{quote(match.name)}"
            if files:
                modes[mode] = files

        sketch_dir = timestamp_dir / "Sketch"
        sketch_file = None
        if sketch_dir.is_dir():
            sketch_file = next((f for f in sketch_dir.iterdir() if f.is_file() and f.stem == "sketch"), None)

        if modes or sketch_file:
            record = {
                "timestamp": timestamp_dir.name,
                "label": format_timestamp_label(timestamp_dir.name),
                "modes": modes,
            }
            if sketch_file:
                record["sketch"] = f"/record/{quote(timestamp_dir.name)}/Sketch/{quote(sketch_file.name)}"
            records.append(record)

    return records


def format_timestamp_label(timestamp):
    if len(timestamp) == 14 and timestamp.isdigit():
        return f"{timestamp[0:4]}-{timestamp[4:6]}-{timestamp[6:8]} {timestamp[8:10]}:{timestamp[10:12]}:{timestamp[12:14]}"
    return timestamp


def local_url(path):
    relative = path.resolve().relative_to(ROOT).as_posix()
    return "/" + "/".join(quote(part) for part in relative.split("/"))


def post_json(url, body, headers, timeout):
    encoded = json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urlrequest.Request(url, data=encoded, method="POST", headers={
        "Content-Type": "application/json",
        **headers,
    })
    try:
        with urlrequest.urlopen(req, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urlerror.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code}: {detail}") from exc


def get_json(url, headers, timeout):
    req = urlrequest.Request(url, method="GET", headers=headers)
    try:
        with urlrequest.urlopen(req, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urlerror.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code}: {detail}") from exc


def post_binary(url, body, headers, timeout):
    encoded = json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urlrequest.Request(url, data=encoded, method="POST", headers={
        "Content-Type": "application/json",
        **headers,
    })
    try:
        with urlrequest.urlopen(req, timeout=timeout) as response:
            return response.read()
    except urlerror.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code}: {detail}") from exc


def generate_openai_image(api_key, prompt, output_path, model):
    body = {
        "model": model or "gpt-image-2",
        "prompt": prompt,
        "size": "1536x1024",
        "n": 1,
    }
    data = post_json(
        "https://api.openai.com/v1/images/generations",
        body,
        {"Authorization": f"Bearer {api_key}"},
        300,
    )
    item = (data.get("data") or [{}])[0]
    if item.get("b64_json"):
        output_path.write_bytes(base64.b64decode(item["b64_json"]))
        return
    if item.get("url"):
        with urlrequest.urlopen(item["url"], timeout=300) as response:
            output_path.write_bytes(response.read())
        return
    raise ValueError("OpenAI image response did not contain b64_json or url.")


def generate_elevenlabs_sound(api_key, prompt, output_path):
    audio = post_binary(
        "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_192",
        {
            "text": prompt[:450],
            "loop": True,
            "prompt_influence": 0.3,
            "model_id": "eleven_text_to_sound_v2",
            "duration_seconds": 20,
        },
        {"xi-api-key": api_key},
        300,
    )
    output_path.write_bytes(audio)


_AUDIO_EXTENSIONS_BY_CONTENT_TYPE = {
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/wave": "wav",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/flac": "flac",
    "audio/ogg": "ogg",
}


def guess_audio_extension(content_type, file_name):
    if content_type:
        ext = _AUDIO_EXTENSIONS_BY_CONTENT_TYPE.get(content_type.split(";")[0].strip().lower())
        if ext:
            return ext
    if file_name and "." in file_name:
        return file_name.rsplit(".", 1)[-1].lower()
    return "wav"


def generate_falai_sound(api_key, prompt, output_base_path, seconds_total=10, steps=150):
    """Queue-based fal.ai call (submit -> poll status -> fetch result -> download).

    output_base_path has no extension; the actual file is written to
    "<output_base_path>.<ext>" with the extension taken from the response
    (fal-ai/stable-audio returns WAV, not mp3). Returns the Path actually written.
    """
    auth_headers = {"Authorization": f"Key {api_key}"}
    submit = post_json(
        "https://queue.fal.run/fal-ai/stable-audio",
        {
            "prompt": prompt[:1000],
            "seconds_total": max(0, min(47, int(seconds_total))),
            "steps": max(2, min(1000, int(steps))),
        },
        auth_headers,
        60,
    )
    request_id = submit.get("request_id")
    status_url = submit.get("status_url") or (request_id and f"https://queue.fal.run/fal-ai/stable-audio/requests/{request_id}/status")
    response_url = submit.get("response_url") or (request_id and f"https://queue.fal.run/fal-ai/stable-audio/requests/{request_id}")
    if not status_url or not response_url:
        raise RuntimeError(f"fal.ai did not return a request_id/status_url: {submit}")

    deadline = time.monotonic() + 180
    while True:
        status_data = get_json(status_url, auth_headers, 30)
        status = status_data.get("status")
        if status == "COMPLETED":
            break
        if status in ("IN_QUEUE", "IN_PROGRESS"):
            if time.monotonic() > deadline:
                raise TimeoutError(f"fal.ai sound generation timed out (last status: {status})")
            time.sleep(2)
            continue
        raise RuntimeError(f"fal.ai sound generation failed: {status_data}")

    result = get_json(response_url, auth_headers, 60)
    audio_file = result.get("audio_file") or {}
    audio_url = audio_file.get("url")
    if not audio_url:
        raise ValueError(f"fal.ai response did not contain audio_file.url: {result}")

    extension = guess_audio_extension(audio_file.get("content_type"), audio_file.get("file_name"))
    final_path = Path(f"{output_base_path}.{extension}")
    with urlrequest.urlopen(audio_url, timeout=300) as response:
        final_path.write_bytes(response.read())
    return final_path


def convert_audio_to_wav(source_path, dest_path, channels, ffmpeg_path="ffmpeg"):
    # Deliberately no loudnorm/gain filtering here: it amplifies whatever noise
    # floor is already in the generated audio, which is the leading suspect for
    # the "杂音" reports on the C++ VR path. Just resample/downmix for Unreal.
    try:
        result = subprocess.run(
            [ffmpeg_path, "-y", "-i", str(source_path), "-ac", str(channels), "-ar", "48000", "-sample_fmt", "s16", str(dest_path)],
            capture_output=True,
            text=True,
        )
    except FileNotFoundError as exc:
        raise RuntimeError(f"Could not start ffmpeg ('{ffmpeg_path}'). Install ffmpeg and add it to PATH.") from exc

    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg audio conversion failed: {result.stderr[-2000:]}")
    if not dest_path.is_file():
        raise RuntimeError(f"ffmpeg finished but WAV output was not found: {dest_path}")


def normalize_audio_to_mp3(source_path, dest_path, ffmpeg_path="ffmpeg"):
    # Backup clips are user-supplied files of unknown provenance -- e.g.
    # backup_wind_bird.mp3 turned out to be an MP3-in-WAV-wrapper with an ID3
    # tag glued on front (RIFF/WAVE header sitting right after the ID3 tag).
    # ffmpeg's demuxer and Unreal (via convert_audio_to_wav) tolerate that
    # fine, but Chrome's <audio> element does not and silently refuses to
    # play it ("no supported source"). Re-encode to a clean, standard MP3
    # instead of raw-copying so the browser always gets something it can
    # actually decode, regardless of what container the source file is really in.
    try:
        result = subprocess.run(
            [ffmpeg_path, "-y", "-i", str(source_path), "-codec:a", "libmp3lame", "-qscale:a", "2", str(dest_path)],
            capture_output=True,
            text=True,
        )
    except FileNotFoundError as exc:
        raise RuntimeError(f"Could not start ffmpeg ('{ffmpeg_path}'). Install ffmpeg and add it to PATH.") from exc

    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg audio normalization failed: {result.stderr[-2000:]}")
    if not dest_path.is_file():
        raise RuntimeError(f"ffmpeg finished but normalized MP3 output was not found: {dest_path}")


def measure_max_volume_db(path, ffmpeg_path="ffmpeg"):
    """None on any failure to probe -- callers should treat that as "not
    silent" rather than block generation on a broken/missing ffmpeg."""
    try:
        result = subprocess.run(
            [ffmpeg_path, "-i", str(path), "-af", "volumedetect", "-f", "null", "-"],
            capture_output=True,
            text=True,
        )
    except FileNotFoundError:
        return None
    match = re.search(r"max_volume:\s*(-?[\d.]+)\s*dB", result.stderr)
    return float(match.group(1)) if match else None


def is_effectively_silent(path, ffmpeg_path="ffmpeg", threshold_db=-35.0):
    """ElevenLabs' sound-generation model reliably renders "very quiet" /
    "muted stillness" style prompts as literal near-digital-silence rather
    than an audible-but-soft texture -- this is what actually causes the
    "file generated, but no sound" reports, independent of prompt_influence
    or the calm-weather backup-sound shortlist (a prompt not on that list can
    still land here, e.g. overcast/gloomy weather hints). Caught after the
    fact instead of guessed at up front, since which exact prompts trigger it
    is a model quirk, not something knowable from the text alone."""
    max_db = measure_max_volume_db(path, ffmpeg_path)
    return max_db is not None and max_db <= threshold_db


def _sibling_ffprobe_path(ffmpeg_path):
    ffmpeg_path_obj = Path(ffmpeg_path)
    if ffmpeg_path_obj.parent != Path("."):
        return str(ffmpeg_path_obj.parent / (ffmpeg_path_obj.stem.replace("ffmpeg", "ffprobe") + ffmpeg_path_obj.suffix))
    return "ffprobe"


def probe_duration_seconds(path, ffmpeg_path="ffmpeg"):
    ffprobe_path = _sibling_ffprobe_path(ffmpeg_path)
    try:
        result = subprocess.run(
            [ffprobe_path, "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
            capture_output=True,
            text=True,
        )
    except FileNotFoundError as exc:
        raise RuntimeError(f"Could not start ffprobe ('{ffprobe_path}'). It normally ships alongside ffmpeg.") from exc
    if result.returncode != 0:
        raise RuntimeError(f"ffprobe failed to read duration: {result.stderr[-2000:]}")
    return float(result.stdout.strip())


def make_seamless_loop(path, crossfade_seconds=1.2, ffmpeg_path="ffmpeg"):
    """Rewrites path in place so it loops seamlessly: the clip is cut into
    head/middle/tail segments, the tail is cross-faded into the head to build a
    "seam" segment, and the output is middle+seam -- so looping (end -> start)
    plays back with no audible click, because what follows the loop restart is
    exactly what originally followed the crossfaded head in the source clip.

    Used for fal.ai (Stable Audio) output only -- its API has no loop parameter,
    unlike ElevenLabs' sound-generation endpoint which already requests loopable
    audio directly. Best-effort: leaves the file untouched if anything goes wrong.

    Implementation note: this deliberately extracts head/middle/tail into separate
    files via `-ss/-t` before `-i` (rather than splitting one input with the atrim
    filter inside a single filter_complex graph) and cross-fades/concats those
    files in their own ffmpeg calls. Doing it in one filter graph with atrim
    reliably produced an empty output from acrossfade in testing whenever the
    chronologically-later segment was passed as acrossfade's first input --
    apparently a PTS-handling quirk of this filter/build -- while separate,
    independently-decoded file inputs did not hit it.
    """
    try:
        duration = probe_duration_seconds(path, ffmpeg_path)
    except RuntimeError:
        return

    crossfade = min(crossfade_seconds, duration / 3)
    if crossfade <= 0.05:
        return

    middle_end = duration - crossfade
    middle_duration = middle_end - crossfade

    stem, suffix = path.stem, path.suffix
    head_path = path.with_name(f"{stem}.loopfix_head{suffix}")
    tail_path = path.with_name(f"{stem}.loopfix_tail{suffix}")
    middle_path = path.with_name(f"{stem}.loopfix_middle{suffix}")
    seam_path = path.with_name(f"{stem}.loopfix_seam{suffix}")
    out_path = path.with_name(f"{stem}.loopfix_out{suffix}")
    temp_paths = [head_path, tail_path, middle_path, seam_path, out_path]

    def run(args):
        try:
            result = subprocess.run(args, capture_output=True, text=True)
        except FileNotFoundError:
            return False
        return result.returncode == 0

    try:
        ok = run([ffmpeg_path, "-y", "-ss", "0", "-t", str(crossfade), "-i", str(path), str(head_path)])
        ok = ok and run([ffmpeg_path, "-y", "-ss", str(middle_end), "-t", str(crossfade), "-i", str(path), str(tail_path)])
        ok = ok and run([ffmpeg_path, "-y", "-ss", str(crossfade), "-t", str(middle_duration), "-i", str(path), str(middle_path)])
        ok = ok and run([
            ffmpeg_path, "-y", "-i", str(tail_path), "-i", str(head_path),
            "-filter_complex", f"[0:a][1:a]acrossfade=d={crossfade}:c1=tri:c2=tri[seam]",
            "-map", "[seam]", str(seam_path),
        ])
        ok = ok and run([
            ffmpeg_path, "-y", "-i", str(middle_path), "-i", str(seam_path),
            "-filter_complex", "[0:a][1:a]concat=n=2:v=0:a=1[out]",
            "-map", "[out]", str(out_path),
        ])
        if ok and out_path.is_file():
            out_path.replace(path)
    finally:
        for temp_path in temp_paths:
            if temp_path.is_file():
                try:
                    temp_path.unlink()
                except OSError:
                    pass


def generate_elevenlabs_music(api_key, prompt, output_path):
    audio = post_binary(
        "https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128",
        {
            "prompt": prompt[:1200],
            "music_length_ms": 30000,
            "model_id": "music_v1",
            "force_instrumental": True,
        },
        {"xi-api-key": api_key},
        900,
    )
    output_path.write_bytes(audio)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("localhost", 8765), InnerLandscapeHandler)
    print("Inner Landscape server running at http://localhost:8765/inner-landscape-app/")
    server.serve_forever()
