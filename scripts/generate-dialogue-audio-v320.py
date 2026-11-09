"""Add missing 3.20 lines using the existing four locally designed fictional voices.

Run artifacts/audio-v5/venv/bin/python scripts/generate-dialogue-audio-v320.py.
No paid service or audio playback. Existing manifest entries and recordings remain
unchanged. Country-take merge proposals are written under ignored artifacts only.
"""
from pathlib import Path
import hashlib,importlib.util,json,shutil,subprocess,time
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('northline_voice_v5',ROOT/'scripts/generate-dialogue-audio-v5.py')
voice=importlib.util.module_from_spec(spec);spec.loader.exec_module(voice)
WORK=ROOT/'artifacts/audio-v320';OUTPUT=ROOT/'public/audio/dialogue'
LINES=[
 ('Raise your hands! You’re under arrest!','arrest-command'),
 ('Please, don’t shoot. I surrender.','surrender'),
 ('You are not taking me anywhere.','resistance'),
 ('Stay back!','resistance'),
 ('Dodge the spray quickly!','urgent-warning'),
 ('Oh, I thought the doctor was around.','office-visitor'),
 ('Oh, I thought I was next. Sorry about that.','office-visitor'),
 ('What are you doing?','suspicious-witness'),
 ('Excuse me, please wait outside.','room-request'),
 ('You need to leave now, or I will call security.','room-warning'),
 ('Please come with me. We’re getting you out of here.','rescue'),
 ('I need to collect a patient file. Please wait outside.','schedule'),
 ('I need to speak to a colleague. Please wait outside.','schedule'),
 ('I’m taking a short break. Please wait outside.','schedule'),
 ('Who’s there?','distraction'),
 ('Did someone call me?','distraction'),
 ('My head… something isn’t right.','dizzy'),
]
def jobs():
 code="import{dialogueKey}from'./src/game/life-rules.js';const rows="+json.dumps(LINES)+";console.log(JSON.stringify(rows.flatMap(([text,category])=>['female','male'].map(gender=>({text,category,gender,key:dialogueKey(text,gender)})))));"
 return json.loads(subprocess.check_output([voice.NODE,'--input-type=module','-e',code],cwd=ROOT))
def main():
 WORK.mkdir(exist_ok=True);stage=WORK/'dialogue-prepared';stage.mkdir(exist_ok=True)
 manifest_path=OUTPUT/'manifest.json';original_bytes=manifest_path.read_bytes();existing=json.loads(original_bytes);existing_keys={entry['key']for entry in existing}
 requested=jobs();pending=[job for job in requested if job['key']not in existing_keys]
 (WORK/'requested-keys.json').write_text(json.dumps(requested,indent=2)+'\n')
 (WORK/'manifest-original.json').write_bytes(original_bytes)
 records={};begin=time.time()
 if pending:
  profiles=json.loads((voice.WORK/'designed-profiles.json').read_text());registry=json.loads((OUTPUT/'voice-profiles.json').read_text())
  for name,profile in profiles.items():
   reference=voice.WORK/profile['file'];assert reference.exists()
   assert hashlib.sha256(reference.read_bytes()).hexdigest()==registry[name]['referenceSha256']
  from huggingface_hub import snapshot_download
  model=voice.load_model(snapshot_download(voice.MODEL,revision=voice.MODEL_REVISION,local_files_only=True))
  print(f'Cached local Qwen Base ready; adding {len(pending)} keys / {len(pending)*2} takes',flush=True)
  for name,profile in profiles.items():
   gender,region=name.split('-');reference=voice.WORK/profile['file'];reference_hash=registry[name]['referenceSha256']
   group=sorted([job for job in pending if job['gender']==gender],key=lambda job:len(job['text']))
   for start in range(0,len(group),4):
    batch=group[start:start+4];seed=(profile['seed']+320000+start*17041)%2147483647;voice.mx.random.seed(seed)
    results=list(model.batch_generate(texts=[voice.rendition(job['text'])for job in batch],ref_audio=str(reference),ref_text=profile['referenceText'],lang_code='English',temperature=.65,top_p=.9,max_tokens=350,verbose=False))
    assert len(results)==len(batch)
    for result in results:
     job=batch[result.sequence_idx];audio=voice.np.array(result.audio).reshape(-1);duration=len(audio)/model.sample_rate
     assert voice.np.isfinite(audio).all()and .3<duration<18,(job['key'],duration)
     filename=job['key']+('-alt'if region=='southern'else'')+'.mp3';wav=stage/(filename+'.wav')
     audio=voice.np.pad(audio,(int(model.sample_rate*.012),int(model.sample_rate*.05)));voice.write_wave(wav,audio,model.sample_rate);target=stage/filename
     subprocess.run([voice.FFMPEG,'-v','error','-y','-i',str(wav),'-af','highpass=f=70,lowpass=f=10500,loudnorm=I=-20:TP=-3:LRA=12','-ar','24000','-ac','1','-c:a','libmp3lame','-b:a','80k','-metadata','comment=Fictional Qwen-designed voice; no real-person reference recording',str(target)],check=True)
     records[(job['key'],region)]={'file':filename,'voice':'northline-'+name,'voiceId':'northline-'+name,'voiceRegion':region,'accent':'General American (designed)'if region=='standard'else'Southern American / Texas-inspired (designed)','syntheticDesigned':True,'designDescription':profile['description'],'referenceSha256':reference_hash,'delivery':job['category'],'spokenText':voice.rendition(job['text']),'seed':seed,'temperature':.65,'speed':1,'duration':round(len(audio)/model.sample_rate,3),'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
    print(f'{name} {min(start+4,len(group))}/{len(group)}; elapsed {time.time()-begin:.1f}s',flush=True)
  additions=[{**job,'spokenText':voice.rendition(job['text']),'synthetic':True,'engine':'Qwen3-TTS 1.7B / MLX Audio 0.5.9','model':voice.MODEL,'variants':[records[(job['key'],region)]for region in['standard','southern']]}for job in pending]
  assert len(records)==len(pending)*2
 else:additions=[]
 assert manifest_path.read_bytes()==original_bytes,'Manifest changed during generation; deliberate merge required.'
 for entry in additions:
  for variant in entry['variants']:
   target=OUTPUT/variant['file'];assert not target.exists(),f'Will not overwrite {target}';shutil.copyfile(stage/variant['file'],target)
 if additions:
  next_manifest=OUTPUT/'manifest.next.json';next_manifest.write_text(json.dumps(existing+additions,indent=2)+'\n');next_manifest.replace(manifest_path)
 (WORK/'dialogue-metrics.json').write_text(json.dumps(additions,indent=2)+'\n')
 # Propose missing English country entries without editing source registration.
 bank=json.loads((ROOT/'src/game/country-voice-manifest.json').read_text());all_entries={entry['key']:entry for entry in existing+additions};proposals={}
 for job in requested:
  key=f"english/{job['gender']}/{job['key']}"
  if key in bank['entries']:continue
  entry=all_entries[job['key']];take=next(t for t in entry['variants']if t.get('voiceRegion')=='standard');target=ROOT/'public/audio/countries'/f'{key}.mp3';target.parent.mkdir(parents=True,exist_ok=True)
  if target.exists():assert hashlib.sha256(target.read_bytes()).hexdigest()==take['sha256'],f'Existing country take differs: {target}'
  else:shutil.copyfile(OUTPUT/take['file'],target)
  proposals[key]={'text':job['text'],'gender':job['gender'],'language':'en','voice':take['voice'],'engine':entry['engine'],'generatedLocally':True,'sourceKey':job['key'],'referenceSha256':take['referenceSha256'],'sha256':take['sha256'],'bytes':take['bytes'],'duration':take['duration']}
 (WORK/'country-entries-merge.json').write_text(json.dumps(proposals,indent=2)+'\n')
 print(f'Added {len(additions)} keys / {len(records)} takes; {len(proposals)} missing English take proposals; prior {len(existing)} entries unchanged; {time.time()-begin:.1f}s',flush=True)
if __name__=='__main__':main()
