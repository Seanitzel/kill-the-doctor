"""Add only missing revision-3.2 dialogue using the four existing fictional voices.

Run with artifacts/audio-v5/venv/bin/python. Existing audio and manifest entries
are preserved byte for byte; output is staged and promoted only after success.
"""
from pathlib import Path
import hashlib, importlib.util, json, shutil, subprocess, time

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('northline_voice_v5', ROOT/'scripts/generate-dialogue-audio-v5.py')
voice = importlib.util.module_from_spec(spec)
spec.loader.exec_module(voice)
WORK = ROOT/'artifacts/audio-v32'
OUTPUT = ROOT/'public/audio/dialogue'


def jobs():
    return voice.jobs()


def main():
    WORK.mkdir(exist_ok=True)
    stage = WORK/'dialogue-prepared'
    stage.mkdir(exist_ok=True)
    manifest_path = OUTPUT/'manifest.json'
    original_bytes = manifest_path.read_bytes()
    existing = json.loads(original_bytes)
    existing_keys = {entry['key'] for entry in existing}
    pending = [job for job in jobs() if job['key'] not in existing_keys]
    if not pending:
        print('All revision-3.2 keys already prepared.', flush=True)
        return
    (WORK/'manifest-original.json').write_bytes(original_bytes)
    profiles = json.loads((voice.WORK/'designed-profiles.json').read_text())
    registry = json.loads((OUTPUT/'voice-profiles.json').read_text())
    for name, profile in profiles.items():
        reference = voice.WORK/profile['file']
        assert reference.exists(), f'Missing fictional reference: {reference}'
        assert hashlib.sha256(reference.read_bytes()).hexdigest() == registry[name]['referenceSha256']
    from huggingface_hub import snapshot_download
    model = voice.load_model(snapshot_download(voice.MODEL, revision=voice.MODEL_REVISION))
    records = {}
    begin = time.time()
    print(f'Qwen Base ready; adding {len(pending)} keys / {len(pending)*2} clips', flush=True)
    for name, profile in profiles.items():
        gender, region = name.split('-')
        reference = voice.WORK/profile['file']
        reference_hash = registry[name]['referenceSha256']
        group = sorted([job for job in pending if job['gender'] == gender], key=lambda job: len(job['text']))
        for start in range(0, len(group), 4):
            batch = group[start:start+4]
            seed = (profile['seed']+250000+start*17041) % 2147483647
            voice.mx.random.seed(seed)
            results = list(model.batch_generate(
                texts=[voice.rendition(job['text']) for job in batch],
                ref_audio=str(reference), ref_text=profile['referenceText'],
                lang_code='English', temperature=.65, top_p=.9,
                max_tokens=350, verbose=False))
            assert len(results) == len(batch)
            for result in results:
                job = batch[result.sequence_idx]
                audio = voice.np.array(result.audio).reshape(-1)
                duration = len(audio)/model.sample_rate
                assert voice.np.isfinite(audio).all() and .3 < duration < 18, (job['key'], duration)
                filename = job['key']+('-alt' if region == 'southern' else '')+'.mp3'
                wav = stage/(filename+'.wav')
                audio = voice.np.pad(audio, (int(model.sample_rate*.012), int(model.sample_rate*.05)))
                voice.write_wave(wav, audio, model.sample_rate)
                target = stage/filename
                subprocess.run([voice.FFMPEG, '-v', 'error', '-y', '-i', str(wav),
                    '-af', 'highpass=f=70,lowpass=f=10500,loudnorm=I=-20:TP=-3:LRA=12',
                    '-ar', '24000', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '80k',
                    '-metadata', 'comment=Fictional Qwen-designed voice; no real-person reference recording',
                    str(target)], check=True)
                records[(job['key'], region)] = {
                    'file': filename, 'voice': 'northline-'+name, 'voiceId': 'northline-'+name,
                    'voiceRegion': region, 'accent': 'General American (designed)' if region == 'standard' else 'Southern American / Texas-inspired (designed)',
                    'syntheticDesigned': True, 'designDescription': profile['description'],
                    'referenceSha256': reference_hash, 'delivery': job['category'],
                    'spokenText': voice.rendition(job['text']), 'seed': seed,
                    'temperature': .65, 'speed': 1, 'duration': round(len(audio)/model.sample_rate, 3),
                    'bytes': target.stat().st_size, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
                }
            print(f'{name} {min(start+4,len(group))}/{len(group)}; total {time.time()-begin:.1f}s', flush=True)
    additions = [{**job, 'spokenText': voice.rendition(job['text']), 'synthetic': True,
        'engine': 'Qwen3-TTS 1.7B / MLX Audio 0.5.9', 'model': voice.MODEL,
        'variants': [records[(job['key'], region)] for region in ['standard','southern']]} for job in pending]
    assert len(records) == len(pending)*2
    assert manifest_path.read_bytes() == original_bytes, 'Manifest changed during preparation; merge deliberately before promotion.'
    for entry in additions:
        for variant in entry['variants']:
            shutil.copyfile(stage/variant['file'], OUTPUT/variant['file'])
    current_keys = {job['key'] for job in jobs()}
    final_manifest = [entry for entry in existing+additions if entry['key'] in current_keys]
    for entry in existing:
        if entry['key'] not in current_keys:
            for variant in entry['variants']:
                (OUTPUT/variant['file']).unlink(missing_ok=True)
    (WORK/'dialogue-metrics.json').write_text(json.dumps(additions, indent=2)+'\n')
    staged_manifest = OUTPUT/'manifest.next.json'
    staged_manifest.write_text(json.dumps(final_manifest, indent=2)+'\n')
    staged_manifest.replace(manifest_path)
    print(f'Added {len(additions)} keys / {len(records)} clips in {time.time()-begin:.1f}s; final {len(final_manifest)*2} clips', flush=True)


if __name__ == '__main__':
    main()
