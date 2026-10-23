import {assetUrl} from './asset-url.js';
// The creator supplied these songs for KTD. Stream one compressed track at a time.
export const PHONE_TRACKS=Object.freeze([
 Object.freeze({id:'nju7N4ez4zo',title:'Puppet (feat. Ena)',artist:'VENUS'}),
 Object.freeze({id:'EZ8hIZpRaMw',title:'Can’t you see?',artist:'VENUS'}),
 Object.freeze({id:'08uSLSoOsRc',title:'Let me in',artist:'VENUS'}),
]);
export const nextPhoneTrack=index=>(Math.max(0,Number.isInteger(index)?index:0)+1)%PHONE_TRACKS.length;
export const isOutsideHospital=(floor,pos)=>floor===0&&Number.isFinite(pos?.z)&&pos.z>35.9;
export function canTakeBreak(engine){return !!engine.mission&&!engine.mission.result&&!engine.mission.targetDown&&!engine.mission.policeAlert&&engine.mission.state!=='escape'&&!engine.paused;}
export class PhoneAudio {
 constructor({volume=.5,onChange=()=>{},createAudio=()=>new Audio()}={}){
  this.audio=createAudio();this.audio.preload='metadata';this.audio.loop=false;this.onChange=onChange;this.disposed=false;this.generation=0;
  this.state={selected:0,playing:false,buffering:false,time:0,duration:0,error:''};
  this.listeners={playing:()=>this.update({playing:true,buffering:false,error:''}),pause:()=>this.update({playing:false,buffering:false}),waiting:()=>this.update({buffering:true}),canplay:()=>this.update({buffering:false}),loadedmetadata:()=>this.update({duration:Number.isFinite(this.audio.duration)?this.audio.duration:0}),timeupdate:()=>this.update({time:this.audio.currentTime||0}),ended:()=>this.select(nextPhoneTrack(this.state.selected)),error:()=>this.update({playing:false,buffering:false,error:'Song could not load. Try again or choose another track.'})};
  for(const[type,listener]of Object.entries(this.listeners))this.audio.addEventListener(type,listener);
  this.setVolume(volume);this.audio.src=this.url(0);this.publish();
 }
 url(index){return assetUrl(`audio/phone/${PHONE_TRACKS[index].id}.mp3`);}
 publish(){if(!this.disposed)this.onChange({...this.state});}
 update(patch){if(this.disposed)return;Object.assign(this.state,patch);this.publish();}
 setVolume(value){if(!this.disposed)this.audio.volume=Math.min(1,Math.max(0,Number(value)||0));}
 async play(){if(this.disposed)return;const generation=++this.generation;this.update({error:'',buffering:true});try{await this.audio.play();}catch(error){if(this.disposed||generation!==this.generation||error?.name==='AbortError')return;this.update({playing:false,buffering:false,error:error?.name==='NotAllowedError'?'Tap play to start the music.':'Song could not play. Try again or choose another track.'});}}
 pause(){if(this.disposed)return;this.generation++;this.audio.pause();this.update({playing:false,buffering:false});}
 toggle(){if(this.state.playing||this.state.buffering)this.pause();else this.play();}
 select(index){if(this.disposed||!Number.isInteger(index)||index<0||index>=PHONE_TRACKS.length)return;this.pause();this.update({selected:index,time:0,duration:0,error:''});this.audio.src=this.url(index);this.play();}
 seek(seconds){if(this.disposed||!Number.isFinite(seconds)||!this.state.duration)return;this.audio.currentTime=Math.min(this.state.duration,Math.max(0,seconds));this.update({time:this.audio.currentTime});}
 dispose(){if(this.disposed)return;this.disposed=true;this.generation++;for(const[type,listener]of Object.entries(this.listeners))this.audio.removeEventListener(type,listener);this.audio.pause();this.audio.removeAttribute('src');this.audio.load();this.onChange=()=>{};}
}
