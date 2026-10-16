"""Prepare bundled synthetic dialogue without changing game dialogue keys.

Run with artifacts/audio-v2/venv/bin/python after installing kokoro-onnx,
downloading its v1.0 model and voices to artifacts/audio-v2/models, and
installing espeak-ng. See public/audio/dialogue/SOURCES.txt.
"""
from pathlib import Path
import hashlib
import json
import os
import shutil
import subprocess
import wave

import numpy as np
from kokoro_onnx import Kokoro
from kokoro_onnx.config import EspeakConfig

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / 'artifacts/audio-v2'
OUTPUT = ROOT / 'public/audio/dialogue'
FFMPEG = '/opt/homebrew/bin/ffmpeg'
ESPEAK = '/opt/homebrew/lib/libespeak-ng.dylib'
ESPEAK_DATA = '/opt/homebrew/share/espeak-ng-data'
os.environ['PHONEMIZER_ESPEAK_LIBRARY'] = ESPEAK


def spoken_text(text):
    substitutions = {
        'There is another': "There's another",
        'I will check': "I'll check",
        'It has been': "It's been",
        'That is nice': "That's nice",
        'I have already': "I've already",
        'I am going to': "I'm going to",
        'You have barely': "You've barely",
        'We are examining': "We're examining",
        'We are looking': "We're looking",
        'I did not hear': "I didn't hear",
    }
    for original, spoken in substitutions.items():
        text = text.replace(original, spoken)
    return text.replace('twelve hour', 'twelve-hour')


def delivery(text, take):
    if 'Excuse me' in text or text.startswith('Oh!'):
        return 'alert, polite interruption', (1.02 if take == 0 else 1.06), .13, .055
    if 'twelve hour' in text or 'busy night' in text or 'missed dinner' in text:
        return 'tired, conversational', (.94 if take == 0 else .98), .20, .09
    if text.endswith('?'):
        return 'friendly question', (.98 if take == 0 else 1.03), .14, .06
    if text.startswith(('Thank you', 'Of course', 'Yes', 'No, please')):
        return 'warm, casual reply', (.96 if take == 0 else 1.02), .15, .06
    return 'relaxed conversation', (.97 if take == 0 else 1.025), .16, .07


def write_wave(path, audio, rate):
    with wave.open(str(path), 'wb') as stream:
        stream.setnchannels(1)
        stream.setsampwidth(2)
        stream.setframerate(rate)
        stream.writeframes((np.clip(audio, -1, 1) * 32767).astype('<i2').tobytes())


def main():
    WORK.mkdir(parents=True, exist_ok=True)
    stage = WORK / 'dialogue-prepared'
    stage.mkdir(exist_ok=True)
    backup = WORK / 'dialogue-original'
    if not backup.exists():
        shutil.copytree(OUTPUT, backup)
    jobs = json.loads((OUTPUT / 'manifest.json').read_text())
    kokoro = Kokoro(str(WORK / 'models/kokoro-v1.0.onnx'),
                    str(WORK / 'models/voices-v1.0.bin'),
                    espeak_config=EspeakConfig(ESPEAK, ESPEAK_DATA))
    manifest = []
    for index, job in enumerate(jobs):
        text, gender, key = job['text'], job['gender'], job['key']
        spoken = spoken_text(text)
        voice = 'af_heart' if gender == 'female' else 'am_michael'
        secondary = 'af_bella' if gender == 'female' else 'am_fenrir'
        records = []
        for take in range(2):
            feeling, speed, sentence_pause, clause_pause = delivery(text, take)
            filename = f'{key}{"-alt" if take else ""}.mp3'
            style = voice if take == 0 else (
                .88 * kokoro.get_voice_style(voice) + .12 * kokoro.get_voice_style(secondary))
            generated, rate = kokoro.create(spoken, voice=style, speed=speed,
                                           lang='en-us', sentence_pause=sentence_pause,
                                           clause_pause=clause_pause, trim=True)
            assert np.all(np.isfinite(generated)) and len(generated) > rate * .3
            # Keep natural dynamics; leave ample silence-free room for spatial playback.
            generated = np.pad(generated, (int(rate * .012), int(rate * .075)))
            wav = stage / (filename + '.wav')
            write_wave(wav, generated, rate)
            destination = stage / filename
            subprocess.run([FFMPEG, '-v', 'error', '-y', '-i', str(wav),
                            '-af', 'highpass=f=75,lowpass=f=10500,loudnorm=I=-20:TP=-3:LRA=7',
                            '-ar', '24000', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '80k',
                            '-metadata', 'comment=Locally generated synthetic Kokoro dialogue',
                            str(destination)], check=True)
            records.append({'file': filename, 'voice': voice,
                            'voiceBlend': ({voice: .88, secondary: .12} if take else {voice: 1}),
                            'delivery': feeling, 'speed': speed,
                            'duration': round(len(generated) / rate, 3),
                            'bytes': destination.stat().st_size,
                            'sha256': hashlib.sha256(destination.read_bytes()).hexdigest()})
        manifest.append({'text': text, 'gender': gender, 'key': key,
                         'spokenText': spoken, 'synthetic': True, 'engine': 'Kokoro 82M v1.0',
                         'variants': records})
        print(f'{index + 1}/{len(jobs)} {key}: {records[0]["duration"]:.2f}s / '
              f'{records[1]["duration"]:.2f}s', flush=True)
    # Replace live assets only after the complete set succeeds.
    for record in manifest:
        for take in record['variants']:
            shutil.copyfile(stage / take['file'], OUTPUT / take['file'])
    (OUTPUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    (WORK / 'dialogue-metrics.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(f'Prepared {len(manifest)} keys / {len(manifest) * 2} synthetic dialogue clips.', flush=True)


if __name__ == '__main__':
    main()
