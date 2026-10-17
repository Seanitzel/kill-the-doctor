"""Prepare stable fictional American / Southern voice identities with Qwen3-TTS.

Run in artifacts/audio-v5/venv. Reference WAVs are generated entirely by Qwen's
VoiceDesign model from written descriptions; no real-person reference audio is used.
The Base model reuses each designed identity across complete dialogue phrases.
"""
from pathlib import Path
import hashlib,json,os,shutil,subprocess,time,wave
ROOT=Path(__file__).resolve().parents[1];WORK=ROOT/'artifacts/audio-v5';OUTPUT=ROOT/'public/audio/dialogue'
os.environ['HF_HOME']=str(WORK/'huggingface')
import mlx.core as mx
import numpy as np
from mlx_audio.tts.utils import load_model
NODE=os.environ.get('NORTHLINE_NODE','/Users/seandvir/.nvm/versions/node/v22.19.0/bin/node');FFMPEG='/opt/homebrew/bin/ffmpeg'
MODEL='mlx-community/Qwen3-TTS-12Hz-1.7B-Base-4bit'
MODEL_REVISION="37e955a1deb861c088ae5f3a67043185f3d1a60c"
DESIGN_MODEL="mlx-community/Qwen3-TTS-12Hz-1.7B-VoiceDesign-4bit"
DESIGN_REVISION="5c390979e4b93af5f2932f90742ca99c7dd04687"
DESIGNED_PROFILES={'female-standard': {'seed': 8214, 'description': 'A warm adult American woman with a clear midrange feminine voice and a neutral General American accent. Conversational, grounded and confident, with natural connected speech and expressive but restrained intonation. Studio recording, no background sound.', 'file': 'female-standard-designed.wav', 'referenceText': 'Please keep your arm still. This will only take a moment. I can hear somebody in the corridor. If you need anything, call me and I will come right back.'}, 'male-standard': {'seed': 4365, 'description': 'An adult American man with a distinct low baritone masculine voice and a neutral General American accent. Relaxed, warm and clear, with conversational pacing and natural connected speech. Studio recording, no background sound.', 'file': 'male-standard-designed.wav', 'referenceText': 'Please keep your arm still. This will only take a moment. I can hear somebody in the corridor. If you need anything, call me and I will come right back.'}, 'female-southern': {'seed': 1764, 'description': 'An adult American woman from Texas, with a warm lower feminine voice and a mild authentic Southern American accent. A relaxed Texas drawl, friendly and conversational, clear intelligible words with natural connected speech. Not exaggerated. Studio recording, no background sound.', 'file': 'female-southern-designed.wav', 'referenceText': 'Please keep your arm still. This will only take a moment. I can hear somebody in the corridor. If you need anything, call me and I will come right back.'}, 'male-southern': {'seed': 9027, 'description': 'An adult American man from Texas, with a warm deep masculine baritone voice and a mild authentic Southern American accent. A relaxed Texas drawl, friendly and grounded, clear intelligible words with natural connected speech. Not exaggerated. Studio recording, no background sound.', 'file': 'male-southern-designed.wav', 'referenceText': 'Please keep your arm still. This will only take a moment. I can hear somebody in the corridor. If you need anything, call me and I will come right back.'}}



def jobs():
    code="""
import{ALL_DIALOGUE_LINES,ENTRY_REACTIONS,CLINICAL_CONVERSATIONS,PATIENT_PAIN_LINES,SUSPICION_LINES,RECRUIT_DIALOGUE,DISTRESS_LINES,ANNOUNCEMENT_LINES,WITNESS_LINES,dialogueKey}from'./src/game/life-rules.js';
const categories=new Map();for(const text of Object.values(ENTRY_REACTIONS).flat())categories.set(text,'interruption');
for(const pairs of Object.values(CLINICAL_CONVERSATIONS))for(const[doctor,patient]of pairs){categories.set(doctor,'clinician');categories.set(patient,'clinical-patient');}
for(const[texts,category]of[[PATIENT_PAIN_LINES,'pain'],[SUSPICION_LINES,'suspicion'],[Object.values(RECRUIT_DIALOGUE),'recruitment'],[DISTRESS_LINES,'distress'],[ANNOUNCEMENT_LINES,'announcement'],[Object.values(WITNESS_LINES),'witness']])for(const text of texts)categories.set(text,category);
console.log(JSON.stringify(ALL_DIALOGUE_LINES.flatMap(text=>['female','male'].map(gender=>({text,gender,key:dialogueKey(text,gender),category:categories.get(text)||'conversation'})))));
"""
    return json.loads(subprocess.check_output([NODE,'--input-type=module','-e',code],cwd=ROOT))


def rendition(text):
    swaps={'There is another':"There's another",'I will check':"I'll check",'It has been':"It's been",'That is nice':"That's nice",'I have already':"I've already",'I am going to':"I'm going to",'You have barely':"You've barely",'We are examining':"We're examining",'We are looking':"We're looking",'I did not hear':"I didn't hear",'I have been':"I've been",'I am after':"I'm after",'They are all':"They're all",'I will wait':"I'll wait",'I am going alone':"I'm going alone",'I am here':"I'm here",'Let us go':"Let's go",'I am calling':"I'm calling",'twelve hour':'twelve-hour','Maybe Acamol?':'Maybe Ah-kah-mol?'}
    for a,b in swaps.items():text=text.replace(a,b)
    return text.replace('... ', ', ')


def write_wave(path,audio,rate):
    with wave.open(str(path),'wb')as stream:
        stream.setnchannels(1);stream.setsampwidth(2);stream.setframerate(rate)
        stream.writeframes((np.clip(audio,-1,1)*32767).astype('<i2').tobytes())


def prepare_profiles():
    """Create only invented voices; never read any real speaker's recording."""
    profile_path=WORK/'designed-profiles.json'
    if profile_path.exists():
        profiles=json.loads(profile_path.read_text())
        if all((WORK/p['file']).exists()and all(p[key]==DESIGNED_PROFILES[name][key]for key in ['seed','description','referenceText'])for name,p in profiles.items()):return profiles
    from huggingface_hub import snapshot_download
    model=load_model(snapshot_download(DESIGN_MODEL,revision=DESIGN_REVISION));profiles={}
    for name,spec in DESIGNED_PROFILES.items():
        mx.random.seed(spec['seed']);t=time.time()
        results=list(model.generate_voice_design(text=spec['referenceText'],instruct=spec['description'],language='English',max_tokens=750,temperature=.65,top_p=.9,verbose=False))
        audio=np.concatenate([np.array(r.audio).reshape(-1)for r in results]);assert np.isfinite(audio).all();write_wave(WORK/spec['file'],audio,model.sample_rate)
        profiles[name]={**spec,'duration':len(audio)/model.sample_rate,'generationSeconds':time.time()-t,'sampleRate':model.sample_rate}
    profile_path.write_text(json.dumps(profiles,indent=2)+'\n');del model;mx.clear_cache();return profiles


def main():
    WORK.mkdir(exist_ok=True);stage=WORK/'dialogue-prepared';stage.mkdir(exist_ok=True)
    backup=WORK/'dialogue-original'
    if not backup.exists():shutil.copytree(OUTPUT,backup)
    profiles=prepare_profiles();all_jobs=jobs();records={};begin=time.time()
    from huggingface_hub import snapshot_download
    model=load_model(snapshot_download(MODEL,revision=MODEL_REVISION));print('Qwen Base ready',flush=True)
    for profile_name,profile in profiles.items():
        gender,region=profile_name.split('-');voice_id='northline-'+profile_name
        reference=WORK/profile['file'];ref_hash=hashlib.sha256(reference.read_bytes()).hexdigest()
        group=sorted([job for job in all_jobs if job['gender']==gender],key=lambda job:len(job['text']))
        for start in range(0,len(group),4):
            batch=group[start:start+4];seed=(profile['seed']+start*17041)%2147483647;mx.random.seed(seed);t=time.time()
            results=list(model.batch_generate(texts=[rendition(job['text'])for job in batch],ref_audio=str(reference),ref_text=profile['referenceText'],lang_code='English',temperature=.65,top_p=.9,max_tokens=350,verbose=False))
            assert len(results)==len(batch)
            for result in results:
                job=batch[result.sequence_idx];audio=np.array(result.audio).reshape(-1);duration=len(audio)/model.sample_rate
                assert np.isfinite(audio).all()and .3<duration<18,(job['key'],duration)
                filename=job['key']+('-alt'if region=='southern'else'')+'.mp3';wav=stage/(filename+'.wav')
                audio=np.pad(audio,(int(model.sample_rate*.012),int(model.sample_rate*.05)));write_wave(wav,audio,model.sample_rate)
                target=stage/filename
                subprocess.run([FFMPEG,'-v','error','-y','-i',str(wav),'-af','highpass=f=70,lowpass=f=10500,loudnorm=I=-20:TP=-3:LRA=12','-ar','24000','-ac','1','-c:a','libmp3lame','-b:a','80k','-metadata','comment=Fictional Qwen-designed voice; no real-person reference recording',str(target)],check=True)
                records[(job['key'],region)]={'file':filename,'voice':voice_id,'voiceId':voice_id,'voiceRegion':region,'accent':('General American (designed)'if region=='standard'else'Southern American / Texas-inspired (designed)'),'syntheticDesigned':True,'designDescription':profile['description'],'referenceSha256':ref_hash,'delivery':job['category'],'spokenText':rendition(job['text']),'seed':seed,'temperature':.65,'speed':1,'duration':round(len(audio)/model.sample_rate,3),'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
            print(f'{profile_name} {min(start+4,len(group))}/{len(group)} in {time.time()-t:.2f}s; total{time.time()-begin:.1f}s',flush=True)
    manifest=[{**job,'spokenText':rendition(job['text']),'synthetic':True,'engine':'Qwen3-TTS 1.7B / MLX Audio 0.5.9','model':MODEL,'variants':[records[(job['key'],region)]for region in ['standard','southern']]}for job in all_jobs]
    assert len(records)==len(all_jobs)*2
    for entry in manifest:
        for variant in entry['variants']:shutil.copyfile(stage/variant['file'],OUTPUT/variant['file'])
    (OUTPUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');(WORK/'dialogue-metrics.json').write_text(json.dumps(manifest,indent=2)+'\n')
    registry={name:{**p,'voiceId':'northline-'+name,'referenceSha256':hashlib.sha256((WORK/p['file']).read_bytes()).hexdigest(),'syntheticDesigned':True,'sourceRecording':'No real-person recording; generated from the description with Qwen3-TTS VoiceDesign.'}for name,p in profiles.items()}
    (OUTPUT/'voice-profiles.json').write_text(json.dumps(registry,indent=2)+'\n')
    print(f'Prepared{len(manifest)}keys/{len(records)}files in{time.time()-begin:.1f}s',flush=True)

if __name__=='__main__':main()
