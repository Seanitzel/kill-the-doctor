import {test,expect} from '@playwright/test';

test('France and Nigeria route real character voices, decode recordings and release them within the existing memory budget',async({page},testInfo)=>{
  test.setTimeout(180000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    const destinations=new WeakMap(),connect=AudioNode.prototype.connect,Original=window.AudioContext||window.webkitAudioContext;
    AudioNode.prototype.connect=function(destination,...args){return connect.call(this,destinations.get(destination)||destination,...args);};
    class MutedContext extends Original{constructor(...args){super(...args);const silent=this.createGain();silent.gain.value=0;connect.call(silent,this.destination);destinations.set(this.destination,silent);}}
    window.AudioContext=window.webkitAudioContext=MutedContext;
    if(window.speechSynthesis)window.speechSynthesis.speak=()=>{};
    localStorage.setItem('ktd-northline-v1',JSON.stringify({internationalVersion:3,playMode:'story',countryId:sessionStorage.getItem('voice-country')||'france',storyReplayId:sessionStorage.getItem('voice-country')||'france',guidanceMilestones:{story:true},settings:{quality:'low',volume:.5,speech:true}}));
  });
  const reports=[];
  for(const country of ['france','nigeria']){
    await page.goto('/');await page.evaluate(country=>sessionStorage.setItem('voice-country',country),country);await page.reload();
    await page.getByRole('button',{name:'ENTER THE HOSPITAL',exact:false}).click();await page.getByRole('button',{name:'Skip story',exact:true}).click();
    await page.waitForFunction(()=>window.__ktd?.engine.mission&&!window.__ktd.engine.paused);
    const report=await page.evaluate(async()=>{
      const {countryVoice}=await import('/src/game/country-voices.js'),{default:bank}=await import('/src/game/story-voice-manifest.json?import');
      const e=window.__ktd.engine,a=e.audio;e.renderer.setAnimationLoop(null);a.cancelVoices();a.pause(false);await a.start();
      let fallback=0;a.speak=()=>{fallback++;};
      const actors=e.npcs.filter(n=>!n.baby).map(n=>{
        const caption=n.role==='patient'?'Have you been waiting here long?':'Excuse me, please wait outside.';
        const take=countryVoice(caption,n.person);return{id:n.id,role:n.role,gender:n.person.gender,playMode:n.person.voicePlayMode,key:take?.key,language:take?.language,pending:take?.pending};
      });
      const samples=[];
      for(const gender of ['female','male'])for(const role of ['patient','doctor']){
        const n=e.npcs.find(n=>!n.baby&&n.person.gender===gender&&n.role===role),caption=role==='patient'?'Have you been waiting here long?':'Excuse me, please wait outside.';
        const take=countryVoice(caption,n.person),record=await a.dialogue(caption,n.person,.5,false,{x:0,y:1,z:0,floor:e.floor});
        samples.push({gender,role,key:take.key,name:record?.name,channels:record?.source.buffer.numberOfChannels,duration:record?.source.buffer.duration});a.cancelVoices();
      }
      const pa=await a.announce('Sarah Collins, please report to imaging.');
      const announcement={name:pa?.name,publicAddress:pa?.publicAddress};a.cancelVoices();
      // Load enough different real recordings to cross the decoded-cache budget.
      const keys=Object.keys(bank.entries).filter(k=>k.startsWith(e.mission.country.id+'/staff/')).slice(0,55);
      for(const key of keys)await a.dialogueBuffer('countries/story/'+key,a.ctx);
      const before={bytes:a.dialogueBytes,entries:a.dialogueBuffers.size,requests:a.dialogueRequests.size};
      a.cancelVoices();const after={active:[...a.activeSamples].filter(r=>r.name.startsWith('voice-')).length,requests:a.dialogueRequests.size};
      return{country:e.mission.country.id,actors,samples,announcement,before,after,fallback};
    });
    expect(report.country).toBe(country);expect(report.actors.length).toBeGreaterThan(30);
    for(const actor of report.actors){expect(actor.playMode).toBe('story');expect(actor.pending).toBeFalsy();expect(actor.key).toContain(`/story/${country}/${actor.role==='patient'?'patient':'staff'}/`);expect(actor.key).toContain(`/${actor.gender}/`);expect(actor.language).toBe(actor.role==='patient'?(country==='france'?'fr':'ha'):'en');}
    for(const sample of report.samples){expect(sample.name).toBe('voice-'+sample.key);expect(sample.channels).toBe(1);expect(sample.duration).toBeGreaterThan(.15);}
    expect(report.announcement.publicAddress).toBe(true);expect(report.announcement.name).toContain(`/story/${country}/staff/en/female/`);
    expect(report.fallback).toBe(0);expect(report.before.bytes).toBeLessThanOrEqual(8*1024*1024);expect(report.before.entries).toBeLessThanOrEqual(32);expect(report.before.requests).toBe(0);expect(report.after).toEqual({active:0,requests:0});reports.push(report);
  }
  await testInfo.attach('story-voice-routing',{body:JSON.stringify(reports,null,2),contentType:'application/json'});expect(errors).toEqual([]);
});
