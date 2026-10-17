"""Bundle Pocket TTS supplied-preset speech, preserving dialogue text/gender keys.

Run with artifacts/audio-v4/venv/bin/python. Installs/models are build-time only;
no speech model or new dependency is shipped in the game.
"""
from pathlib import Path
import hashlib,json,os,shutil,subprocess,time,wave
ROOT=Path(__file__).resolve().parents[1]
WORK=ROOT/'artifacts/audio-v4';OUTPUT=ROOT/'public/audio/dialogue'
os.environ['HF_HOME']=str(WORK/'huggingface')
import numpy as np
import torch
from pocket_tts import TTSModel

NODE=os.environ.get('NORTHLINE_NODE','/Users/seandvir/.nvm/versions/node/v22.19.0/bin/node')
FFMPEG='/opt/homebrew/bin/ffmpeg'

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
    # Use ordinary conversational wording, not repeated fake hesitations or
    # an instruction prefix the model might read aloud. Captions stay exact.
    swaps={'There is another':"There's another",'I will check':"I'll check",'It has been':"It's been",'That is nice':"That's nice",'I have already':"I've already",'I am going to':"I'm going to",'You have barely':"You've barely",'We are examining':"We're examining",'We are looking':"We're looking",'I did not hear':"I didn't hear",'I have been':"I've been",'I am after':"I'm after",'They are all':"They're all",'I will wait':"I'll wait",'I am going alone':"I'm going alone",'I am here':"I'm here",'Let us go':"Let's go",'twelve hour':'twelve-hour','Maybe Acamol?':'Maybe Ah-kah-mol?'}
    for a,b in swaps.items():text=text.replace(a,b)
    return text.replace('... ', ', ')

def write_wav(path,audio,rate):
    with wave.open(str(path),'wb')as stream:
        stream.setnchannels(1);stream.setsampwidth(2);stream.setframerate(rate)
        stream.writeframes((np.clip(audio,-1,1)*32767).astype('<i2').tobytes())

def main():
    WORK.mkdir(exist_ok=True);stage=WORK/os.environ.get('NORTHLINE_STAGE','dialogue-prepared');stage.mkdir(exist_ok=True)
    backup=WORK/'dialogue-original'
    if not backup.exists():shutil.copytree(OUTPUT,backup)
    torch.set_num_threads(2);model=TTSModel.load_model(language='english',temp=.3)
    voices={gender:model.get_state_for_audio_prompt(voice)for gender,voice in [('female','alba'),('male','marius')]}
    existing={entry['key']:entry for entry in json.loads((OUTPUT/'manifest.json').read_text())}if os.environ.get('NORTHLINE_ONLY_MISSING')else{}
    manifest=[];begin=time.time();all_jobs=jobs()
    for i,job in enumerate(all_jobs):
        if job['key']in existing:
            manifest.append(existing[job['key']]);continue
        spoken=rendition(job['text']);voice='alba'if job['gender']=='female'else'marius';variants=[]
        for take in range(2):
            seed=(int(job['key'].split('-')[1],16)+take*17041)%2147483647;torch.manual_seed(seed)
            generated=model.generate_audio(voices[job['gender']],spoken,copy_state=True).detach().cpu().numpy().reshape(-1)
            assert np.isfinite(generated).all()and len(generated)>model.sample_rate*.3
            assert len(generated)<model.sample_rate*15
            generated=np.pad(generated,(int(model.sample_rate*.012),int(model.sample_rate*.04)))
            filename=job['key']+('-alt'if take else'')+'.mp3';wav=stage/(filename+'.wav');write_wav(wav,generated,model.sample_rate)
            target=stage/filename
            subprocess.run([FFMPEG,'-v','error','-y','-i',str(wav),'-af','highpass=f=70,lowpass=f=10500,loudnorm=I=-20:TP=-3:LRA=12','-ar','24000','-ac','1','-c:a','libmp3lame','-b:a','80k','-metadata','comment=Generated synthetic Pocket TTS dialogue; licensed supplied voice preset',str(target)],check=True)
            variants.append({'file':filename,'voice':voice,'voiceBlend':{voice:1},'delivery':job['category'],'spokenText':spoken,'seed':seed,'temperature':.3,'speed':1,'duration':round(len(generated)/model.sample_rate,3),'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
        manifest.append({**job,'spokenText':spoken,'synthetic':True,'engine':'Kyutai Pocket TTS 3.3.0','model':'english September 2026','variants':variants})
        print(f'{i+1}/{len(all_jobs)} {job["key"]} {job["category"]}: {variants[0]["duration"]}s / {variants[1]["duration"]}s',flush=True)
    # Keep the existing full set usable until every new file has succeeded.
    for entry in manifest:
        for take in entry['variants']:
            if(stage/take['file']).exists():shutil.copyfile(stage/take['file'],OUTPUT/take['file'])
    (OUTPUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    (WORK/'dialogue-metrics.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(f'Prepared {len(manifest)} keys / {len(manifest)*2} clips in {time.time()-begin:.1f}s.',flush=True)

if __name__=='__main__':main()
