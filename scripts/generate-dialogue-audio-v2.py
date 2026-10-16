"""Rebuild bundled two-take Kokoro speech with situation-specific performances.

Run with artifacts/audio-v2/venv/bin/python. Existing downloaded models are reused;
new work, backups and metrics are isolated under ignored artifacts/audio-v3/.
Text/gender hashes are obtained from the game's ALL_DIALOGUE_LINES export.
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
WORK = ROOT / 'artifacts/audio-v3'
MODELS = ROOT / 'artifacts/audio-v2/models'
OUTPUT = ROOT / 'public/audio/dialogue'
FFMPEG = '/opt/homebrew/bin/ffmpeg'
NODE = os.environ.get('NORTHLINE_NODE', '/Users/seandvir/.nvm/versions/node/v22.19.0/bin/node')
ESPEAK = '/opt/homebrew/lib/libespeak-ng.dylib'
ESPEAK_DATA = '/opt/homebrew/share/espeak-ng-data'
os.environ['PHONEMIZER_ESPEAK_LIBRARY'] = ESPEAK


def dialogue_jobs():
    code = """
import {ALL_DIALOGUE_LINES,CONVERSATIONS,ENTRY_REACTIONS,CLINICAL_CONVERSATIONS,
PATIENT_PAIN_LINES,SUSPICION_LINES,RECRUIT_DIALOGUE,dialogueKey} from './src/game/life-rules.js';
const categories = new Map();
for(const text of Object.values(ENTRY_REACTIONS).flat())categories.set(text,'interruption');
for(const pairs of Object.values(CLINICAL_CONVERSATIONS))for(const [doctor,patient]of pairs){categories.set(doctor,'clinician');categories.set(patient,'clinical-patient');}
for(const text of PATIENT_PAIN_LINES)categories.set(text,'pain');
for(const text of SUSPICION_LINES)categories.set(text,'suspicion');
for(const [key,text]of Object.entries(RECRUIT_DIALOGUE))categories.set(text,['invite','question','accept'].includes(key)?'anxious':'reassuring');
console.log(JSON.stringify(ALL_DIALOGUE_LINES.flatMap(text=>['female','male'].map(gender=>({text,gender,key:dialogueKey(text,gender),category:categories.get(text)||'conversation'})))));
"""
    return json.loads(subprocess.check_output([NODE, '--input-type=module', '-e', code], cwd=ROOT))


def spoken_text(text, category, take):
    substitutions = {
        'There is another': "There's another", 'I will check': "I'll check",
        'It has been': "It's been", 'That is nice': "That's nice",
        'I have already': "I've already", 'I am going to': "I'm going to",
        'You have barely': "You've barely", 'We are examining': "We're examining",
        'We are looking': "We're looking", 'I did not hear': "I didn't hear",
        'This will only': "This'll only", 'I have been': "I've been",
        'I am after': "I'm after", 'They are all': "They're all",
        'I will wait': "I'll wait", 'I am going alone': "I'm going alone",
        'The staff are': "The staff are",
    }
    for original, spoken in substitutions.items():
        text = text.replace(original, spoken)
    text = text.replace('twelve hour', 'twelve-hour').replace('Maybe Acamol?', 'Maybe Ah-kah-mol?')
    # Punctuation and short hesitations shape the model's phrasing. No fake breaths,
    # pitch shifting, added echo or promise of a prompt-conditioned emotion model.
    specific = {
        'Did you hear that?': ['Did you... hear that?', 'Wait. Did you hear that?'],
        'That was weird.': ['That... was weird.', 'Huh. That was weird.'],
        'Ow... please, that really hurts.': ['Ow! Please... that really hurts.', 'Ow... please. That really hurts.'],
        'My head is spinning. Can someone help me sit down?': ["My head's spinning... can someone help me sit down?", "Oh... my head's spinning. Can someone help me sit down?"],
        'My heart is racing. Something is wrong. I need somewhere quiet.': ["My heart's racing. Something's wrong... I need somewhere quiet.", "My heart's racing... something's wrong. I need somewhere quiet."],
        'Why are they watching me? Tell me what is going on.': ["Why are they watching me? Tell me... what's going on?", "Why are they watching me? Tell me what's going on."],
        'They are all in on it? Okay. I will wait until you make your move.': ["They're all in on it? Okay... I'll wait until you make your move.", "They're all in on it? ... Okay. I'll wait until you make your move."],
        'Stay here. Breathe slowly. I am going alone.': ["Stay here. Breathe slowly... I'm going alone.", "Stay here... breathe slowly. I'm going alone."],
    }
    return specific.get(text, [text, text])[take]


def performance(job, take):
    category, text, female = job['category'], job['text'], job['gender'] == 'female'
    # Category-specific supplied model styles. Different blends plus pace and
    # phrase spacing give actual second performances rather than rate-shifted files.
    styles = {
        'conversation': ((.68, .32), .965, .20, .085),
        'interruption': ((.28, .72), 1.035, .23, .075),
        'clinician': ((.79, .21), .96, .28, .10),
        'clinical-patient': ((.48, .52), .955, .25, .12),
        'pain': ((.17, .83), .895, .31, .14),
        'suspicion': ((.24, .76), .94, .30, .14),
        'anxious': ((.12, .88), 1.045, .28, .11),
        'reassuring': ((.72, .28), .945, .31, .12),
    }
    blend, speed, sentence_pause, clause_pause = styles[category]
    if category == 'conversation' and any(t in text for t in ['busy night','missed dinner','twelve hour']):
        speed -= .035; sentence_pause += .04
    seed = int(job['key'].split('-')[1], 16)
    variation = ((seed % 7)-3)*.006
    speed += variation + (.033 if take else -.012)
    weight = min(.94, max(.08, blend[1] + (.09 if take else -.025)))
    primary, expressive = ('af_heart','af_bella') if female else ('am_michael','am_fenrir')
    return {
        'voice': primary, 'voiceBlend': {primary: round(1-weight, 3), expressive: round(weight, 3)},
        'delivery': category, 'speed': round(speed, 3),
        'sentencePause': round(sentence_pause + (.025 if take else 0),3),
        'clausePause': round(clause_pause + (.015 if take else 0),3),
    }


def write_wave(path, audio, rate):
    with wave.open(str(path), 'wb') as stream:
        stream.setnchannels(1); stream.setsampwidth(2); stream.setframerate(rate)
        stream.writeframes((np.clip(audio, -1, 1) * 32767).astype('<i2').tobytes())


def main():
    WORK.mkdir(parents=True, exist_ok=True)
    stage = WORK / 'dialogue-prepared'; stage.mkdir(exist_ok=True)
    backup = WORK / 'dialogue-original'
    if not backup.exists(): shutil.copytree(OUTPUT, backup)
    jobs = dialogue_jobs()
    existing = {entry['key']:entry for entry in json.loads((OUTPUT/'manifest.json').read_text())} if os.environ.get('NORTHLINE_ONLY_MISSING') else {}
    kokoro = Kokoro(str(MODELS / 'kokoro-v1.0.onnx'), str(MODELS / 'voices-v1.0.bin'),
                    espeak_config=EspeakConfig(ESPEAK, ESPEAK_DATA))
    manifest = []
    for index, job in enumerate(jobs):
        if job['key'] in existing:
            manifest.append(existing[job['key']]); continue
        text, gender, key = job['text'], job['gender'], job['key']; records = []
        for take in range(2):
            config = performance(job, take); spoken = spoken_text(text, job['category'], take)
            filename = f'{key}{"-alt" if take else ""}.mp3'
            style = sum(weight * kokoro.get_voice_style(voice) for voice,weight in config['voiceBlend'].items())
            generated, rate = kokoro.create(spoken, voice=style, speed=config['speed'], lang='en-us',
                                           sentence_pause=config['sentencePause'], clause_pause=config['clausePause'], trim=True)
            assert np.all(np.isfinite(generated)) and len(generated)>rate*.3
            generated = np.pad(generated,(int(rate*.012),int(rate*.09)))
            wav = stage / (filename+'.wav'); write_wave(wav,generated,rate)
            destination = stage / filename
            subprocess.run([FFMPEG,'-v','error','-y','-i',str(wav),'-af',
                            'highpass=f=70,lowpass=f=10500,loudnorm=I=-20:TP=-3:LRA=11',
                            '-ar','24000','-ac','1','-c:a','libmp3lame','-b:a','80k',
                            '-metadata','comment=Locally generated synthetic Kokoro dialogue',str(destination)],check=True)
            records.append({'file':filename,**config,'spokenText':spoken,
                            'duration':round(len(generated)/rate,3),'bytes':destination.stat().st_size,
                            'sha256':hashlib.sha256(destination.read_bytes()).hexdigest()})
        manifest.append({**job,'spokenText':records[0]['spokenText'],'synthetic':True,
                         'engine':'Kokoro 82M v1.0','variants':records})
        print(f'{index+1}/{len(jobs)} {key} {job["category"]}: {records[0]["duration"]:.2f}s / {records[1]["duration"]:.2f}s',flush=True)
    for record in manifest:
        for take in record['variants']:
            if (stage/take['file']).exists(): shutil.copyfile(stage/take['file'],OUTPUT/take['file'])
    (OUTPUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    (WORK/'dialogue-metrics.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(f'Prepared {len(manifest)} keys / {len(manifest)*2} synthetic dialogue clips.',flush=True)


if __name__ == '__main__': main()
