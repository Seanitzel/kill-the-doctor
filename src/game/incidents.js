import {lateContactRound} from './international.js';
import {JAMIE_SELF_TALK_LINES} from './dialogue-v25.js';
import {tileAt,key,rng} from './layout.js';
import {makePlayer} from './assets.js';
import {seesDrawnWeapon} from './loadout.js';
import {weaponModel} from './gear.js';
import {SUSPICION_LINES,RECRUIT_DIALOGUE,DISTRESS_LINES} from './life-rules.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const NAMES=['Jamie Cole','Dylan Hayes','Riley Brooks','Morgan Reed','Casey Ellis','Jordan Vale','Taylor Lane','Avery Quinn','Cameron Shaw','Robin West'];
export const SHOT_MEMORY_SECONDS=120;
function contactSlots(block){
  const slots=[0,1,2,3,4,5,6,7,8,9],random=rng(4099+block*7919);
  for(let i=9;i>0;i--){const j=Math.floor(random()*(i+1));[slots[i],slots[j]]=[slots[j],slots[i]];}
  return (block===0?[0,3,7]:slots.slice(0,3)).sort((a,b)=>a-b);
}
export function contactRound(round){const block=Math.floor((Math.max(1,round)-1)/10);return contactSlots(block).includes((round-1)%10);}
export function contactIdentity(round,seed,attempt=0){
  const random=rng((seed^Math.imul(round,2654435761)^Math.imul(attempt,7919))>>>0),block=Math.floor((round-1)/10),rank=Math.max(0,contactSlots(block).indexOf((round-1)%10)),index=(block*3+rank+attempt)%NAMES.length;
  return {name:NAMES[index],gender:random()<.5?'male':'female',skin:['#efddce','#c79774','#845331','#41281f'][Math.floor(random()*4)],hair:['#211d22','#71513a','#a58354'][Math.floor(random()*3)],accent:['#795b62','#487068','#625676'][Math.floor(random()*3)],hairstyle:['cropped','afro','straight','curls-short'][Math.floor(random()*4)]};
}
export class HospitalIncidents{
  constructor(engine){this.e=engine;this.contact=null;this.scan=0;this.heardSerial=0;this.nextConversation=0;this.trail=[];this.trailFloor=null;}
  setup(){
    const e=this.e;if(e.mission.type!=='standard'||!(lateContactRound(e.mission.round,e.mission.countryAttempt)??contactRound(e.mission.round)))return;this.arrivalAt=65+e.mission.random()*45;
  }
  arrive(){
    const e=this.e;if(this.contact||!this.arrivalAt||e.mission.elapsed<this.arrivalAt||e.mission.state==='escape'||e.mission.result)return false;
    const person=contactIdentity(e.mission.round,e.mission.seed,e.mission.countryAttempt||0),visual=makePlayer(e.assets,person.gender,{...person,outfit:'jacket'},'civilian'),n=e.spawnNPC(person,'patient',0,{x:3,z:30},null,'unexpected-contact',{visual});
    n.recruit={state:'panicked',nextBurst:e.mission.elapsed,speakAt:e.mission.elapsed+4,shotAt:0,phase:'calm'};n.activity='panic';n.speed=4.3;n.contamination=0;n.name=person.name;n.person=person;this.contact=n;
    this.privateRoom=e.levels[0].rooms.find(r=>r.kind==='bathroom');return true;
  }
  hearShot(origin,floor){
    const e=this.e,now=e.mission.elapsed,serial=++this.heardSerial,range=e.mission.save.upgrades.suppressor?15:90;
    for(const n of e.npcs){
      if(n.dead||n.evacuated||n.baby||n.floor!==floor||distance(n.pos,origin)>range||n.recruit?.state==='recruited')continue;
      const sees=seesDrawnWeapon(n.pos,origin,n.visual.root.rotation.y,e.lineOfSight(n.pos,origin,floor));
      if(!sees){n.noiseConcern={until:now+SHOT_MEMORY_SECONDS,serial,spoken:false};}
    }
  }
  roomAt(position,floor){const cell=tileAt(position.x,position.z),id=this.e.levels[floor].cells.get(key(cell.x,cell.z))?.room;return this.e.levels[floor].rooms.find(r=>r.id===id);}
  privateTogether(n){
    const e=this.e;if(n.floor!==e.floor||distance(n.pos,e.playerPos)>3.2)return false;
    const room=this.roomAt(e.playerPos,e.floor);if(!room||room.kind!=='bathroom'||this.roomAt(n.pos,n.floor)?.id!==room.id)return false;
    return !e.npcs.some(other=>other!==n&&!other.dead&&!other.evacuated&&other.floor===e.floor&&this.roomAt(other.pos,other.floor)?.id===room.id);
  }
  prompt(n){const state=n.recruit.state;return state==='panicked'?`Talk to ${n.name.split(' ')[0]}`:state==='escort'?'Talk in private':state==='recruited'?'Talk to your contact':'Visitor · protected';}
  interact(n){
    if(n.recruit.state==='panicked')this.e.hooks.contact?.({id:n.id,name:n.name,stage:'invite'});
    else if(n.recruit.state==='escort'){
      if(this.privateTogether(n))this.e.hooks.contact?.({id:n.id,name:n.name,stage:'offer'});
      else this.e.notify(`Lead ${n.name.split(' ')[0]} into the empty ground-floor bathroom, then use TALK.`);
    }else if(n.recruit.state==='recruited')this.e.notify(this.e.mission.targetDown?`${n.name.split(' ')[0]} is covering your escape.`:`${n.name.split(' ')[0]} is waiting for you to eliminate the primary target.`);
    else this.e.notify('The visitor wants to be left alone.');
  }
  choose(choice){
    const n=this.contact;if(!n||n.dead)return false;const e=this.e,state=n.recruit.state;
    if(choice==='escort'&&state==='panicked'){
      n.recruit.state='escort';n.recruit.phase='calm';n.speed=3.1;e.audio.stopDistress?.();n.activity=null;n.path=[];n.reaction=0;n.reporting=null;n.wait=0;n.recruit.nextRoute=0;
      e.notify(`Find the empty bathroom off the ground-floor atrium. ${n.name.split(' ')[0]} will follow you.`);return true;
    }
    if(choice==='recruit'&&state==='escort'&&this.privateTogether(n)){
      n.recruit.state='recruited';n.activity=null;n.reaction=0;n.reporting=null;n.path=[];n.wait=0;n.recruit.nextRoute=0;
      n.recruit.weapon=weaponModel('pistol');n.recruit.weapon.position.set(.33,1.23,.15);n.recruit.weapon.visible=false;n.visual.root.add(n.recruit.weapon);
      e.notify(`${n.name.split(' ')[0]} will act after your primary target is down.`,'clue');return true;
    }
    if(choice==='dismiss'&&['panicked','escort'].includes(state)){n.recruit.state='dismissed';n.activity='rest';n.path=[];n.reaction=0;return true;}
    return false;
  }
  speakRecruit(text,speaker='contact'){
    const e=this.e,n=this.contact;if(!n)return;
    const person=speaker==='player'?{gender:e.playerProfile?.gender||e.mission.save.appearance?.gender||e.mission.save.character}:n.person;
    e.audio.cancelVoices?.();e.audio.dialogue(text,person,.85,true,{x:e.playerPos.x,y:1.5,z:e.playerPos.z,floor:e.floor});
  }
  trackPlayer(){
    const e=this.e,p=e.playerPos,last=this.trail.at(-1);
    if(this.trailFloor!==e.floor||last&&distance(last,p)>5){this.trail=[];this.trailFloor=e.floor;}
    if(!this.trail.length||distance(this.trail.at(-1),p)>.45){this.trail.push({x:p.x,z:p.z});if(this.trail.length>96)this.trail.shift();}
  }
  followGoal(n){
    const e=this.e,p=e.playerPos;let length=0,last=p;
    for(let i=this.trail.length-1;i>=0;i--){const point=this.trail[i],segment=distance(last,point);if(length+segment>=1.8){const t=(1.8-length)/Math.max(segment,.001);return {x:last.x+(point.x-last.x)*t,z:last.z+(point.z-last.z)*t};}length+=segment;last=point;}
    return this.trail[0]||p;
  }
  route(n,goal){
    const nav=this.e.systems.navigationFor(n.floor);n.path=nav.smoothRoute?nav.smoothRoute(n.pos,goal):nav.routeTransient(n.pos,goal);n.cursor=0;n.wait=.7;
    n.recruit.routeGoal={x:goal.x,z:goal.z};n.recruit.routeAt=this.e.mission.elapsed;n.recruit.nextRoute=this.e.mission.elapsed+.65;
  }
  follow(n){
    const e=this.e,r=n.recruit,now=e.mission.elapsed;this.trackPlayer();
    if(n.floor!==e.floor){const lift=e.levels[n.floor].elevator;
      if(distance(n.pos,lift)<2){const arrival=e.systems.arrivalSpot(e.floor,n);if(arrival){n.floor=e.floor;n.pos.set(arrival.x,0,arrival.z);n.path=[];r.nextRoute=0;r.routeGoal=null;}}
      else if(now>=(r.nextRoute||0)&&(n.cursor>=n.path.length||!r.routeGoal||distance(r.routeGoal,lift)>.9)){n.activity=null;n.speed=4.5;this.route(n,lift);}return;
    }
    const gap=distance(n.pos,e.playerPos),sameArea=this.roomAt(n.pos,n.floor)?.id===this.roomAt(e.playerPos,e.floor)?.id,visible=e.lineOfSight(n.pos,e.playerPos,n.floor),moving=(e.playerSpeed||0)>.25;
    if(sameArea&&visible&&(gap<1.65||!moving&&gap<2.5)){n.path=[];n.cursor=0;n.activity=now<(r.laughUntil||0)?'laugh':'rest';r.routeGoal=null;return;}
    n.activity=null;const goal=sameArea&&visible?this.followGoal(n):e.playerPos;
    n.speed=gap>5?Math.min(6,Math.max(4.5,(e.playerSpeed||0)+.8)):Math.max(1.2,Math.min(4,(e.playerSpeed||0)+(gap-2.1)*1.4));
    if(now>=(r.nextRoute||0)&&(!r.routeGoal||distance(goal,r.routeGoal)>.9||n.cursor>=n.path.length))this.route(n,goal);
  }
  playLaugh(n){
    const e=this.e,r=n.recruit,now=e.mission.elapsed;if(n.floor!==e.floor||distance(n.pos,e.playerPos)>16)return false;
    n.voiceVersion=(n.voiceVersion||0)+1;if(e.life?.queue)e.life.queue=e.life.queue.filter(line=>line.actor!==n);
    e.audio.laugh?.(n.person,{x:n.pos.x,y:1.5,z:n.pos.z,floor:n.floor},.45,n.id);r.laughUntil=now+1.9;r.nextLaugh=now+25+e.mission.random()*20;
    e.hooks.soundCaption?.(`${n.name} gives a short nervous laugh.`);return true;
  }
  prepareNPC(n){
    if(!n.recruit||n.evacuating||n.reporting||n.recruit.state==='dismissed')return false;
    const e=this.e,r=n.recruit,now=e.mission.elapsed;
    if(r.state==='panicked'){
      if(now>=r.nextBurst){
        const points=[{x:-3,z:27},{x:0,z:18},{x:3,z:31}].sort((a,b)=>distance(n.pos,b)-distance(n.pos,a));
        r.nextBurst=now+15+e.mission.random()*9;r.burstUntil=now+4+e.mission.random()*2;r.phase='running';r.bursts=(r.bursts||0)+1;
        n.activity=null;n.reaction=0;n.worriedUntil=0;this.route(n,points[0]);
        if(n.floor===e.floor&&distance(n.pos,e.playerPos)<18){e.audio.distress?.(n.person,{x:n.pos.x,y:1.5,z:n.pos.z,floor:n.floor},.55);e.hooks.soundCaption?.(`${n.name} cries out and runs along the corridor.`);}
      }
      if(r.phase==='running'&&(now>=r.burstUntil||n.cursor>=n.path.length)){
        r.phase='calm';r.calmStarted=now;r.gesture=['selftalk','laugh','headTap','panic'][(r.bursts-1)%4];
        e.audio.stopDistress?.();n.path=[];n.reaction=0;r.speakAt=now+1.2;
      }
      if(r.phase==='running')n.activity=null;
      else{const age=now-(r.calmStarted??now);n.activity=age<1.2?'rest':age<5?r.gesture:'panic';}
      return true;
    }
    if(['escort','recruited'].includes(r.state)){
      if(r.state==='recruited'&&e.mission.targetDown)return this.prepareAlly(n);
      this.follow(n);
      return true;
    }
    return false;
  }
  prepareAlly(n){
    const e=this.e,r=n.recruit,now=e.mission.elapsed;n.activity=null;n.worriedUntil=0;n.evacuating=false;r.weapon.visible=true;n.speed=3.7;
    if(n.floor!==e.floor){const lift=e.levels[n.floor].elevator;if(distance(n.pos,lift)<2){const arrival=e.systems.arrivalSpot(e.floor,n);if(arrival){n.floor=e.floor;n.pos.set(arrival.x,0,arrival.z);n.path=[];r.nextRoute=0;}}else if(now>=(r.nextRoute||0))this.route(n,lift);return true;}
    const targets=e.npcs.filter(other=>!other.dead&&!other.evacuated&&other.floor===n.floor&&['doctor','nurse','security','police'].includes(other.role));
    let target=null,nearest=Infinity;for(const candidate of targets){const d=distance(n.pos,candidate.pos);if(d<nearest){nearest=d;target=candidate;}}
    if(target){
      if(nearest<13&&e.lineOfSight(n.pos,target.pos,n.floor)){
        n.path=[];n.visual.root.rotation.y=Math.atan2(target.pos.x-n.pos.x,target.pos.z-n.pos.z);n.visual.setAim?.(true);
        if(now>=r.shotAt){e.allyShot(n,target);r.shotAt=now+2.2+e.mission.random()*.9;}
      }else if(now>=(r.nextRoute||0)){n.visual.setAim?.(false);this.route(n,target.pos);}
    }else if(distance(n.pos,e.playerPos)>3&&now>=(r.nextRoute||0))this.route(n,e.playerPos);
    return true;
  }
  update(dt){
    const e=this.e,now=e.mission.elapsed;this.trackPlayer();this.arrive();this.scan-=dt;
    if(this.scan<=0&&!e.mission.targetDown){
      this.scan=.3;
      for(const n of e.npcs){
        const concern=n.noiseConcern;if(!concern)continue;if(now>=concern.until){n.noiseConcern=null;continue;}
        if(n.dead||n.evacuated||n.reporting||n.baby||n.floor!==e.floor||distance(n.pos,e.playerPos)>12||!e.lineOfSight(e.playerPos,n.pos))continue;
        n.worriedUntil=concern.until;
        if(!concern.spoken&&now>=this.nextConversation){
          concern.spoken=true;this.nextConversation=now+7;n.reaction=Math.max(n.reaction||0,1.1);
          e.life?.speak(n,SUSPICION_LINES[(concern.serial+n.id.length)%SUSPICION_LINES.length],true);
        }
      }
    }
    const n=this.contact;if(!n||n.dead||n.evacuated||e.mission.targetDown||!['panicked','escort','recruited'].includes(n.recruit.state))return;
    const r=n.recruit;r.nextLaugh??=now+12+e.mission.random()*13;
    if(now>=r.nextLaugh&&r.phase!=='running')this.playLaugh(n);
    if(r.state==='panicked'&&r.phase==='calm'&&now>=r.speakAt&&n.floor===e.floor&&distance(n.pos,e.playerPos)<15){
      r.speakAt=now+22;
      if(r.gesture==='laugh'){if(now>=(r.laughUntil||0))this.playLaugh(n);}
      else if(now>=(r.laughUntil||0)){const lines=r.gesture==='selftalk'?JAMIE_SELF_TALK_LINES:DISTRESS_LINES;e.life?.speak(n,lines[Math.floor(e.mission.random()*lines.length)],true);}
    }
  }
  hud(){const n=this.contact;if(!n||n.dead||n.evacuated||n.recruit.state==='dismissed'||n.recruit.state==='panicked'&&(n.floor!==this.e.floor||distance(n.pos,this.e.playerPos)>16))return null;return {name:n.name,state:n.recruit.state,label:n.recruit.state==='panicked'?'Distressed visitor nearby':n.recruit.state==='escort'?'Lead your contact to the bathroom':this.e.mission.targetDown?'Covering your escape':'Waiting for your signal'};}
  dispose(){this.contact=null;this.trail=[];this.e=null;}
}
