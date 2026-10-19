import {countryPerson,coffeeLevel} from './population.js';
import {countryFor,campaignLevel,migrateInternational,recordInternationalResult} from './international.js';
import {campaignChallenge} from './campaign.js';
import { rng, makeLayout, FLOORS } from './layout.js';
import {CHARACTERS,STAFF_BONUS,mayHitStaff,defaultAppearance,migrateCharacterSave,normalizeWardrobe} from './loadout.js';
import {assignmentType,ASSIGNMENT_TYPES} from './assignment-types.js';
export const SAVE_KEY = 'ktd-northline-v1';
export const UPGRADE_INFO = [
  { id: 'shoes', name: 'Lightweight footwear', description: 'Move 8% faster per level. Quieter steps reduce suspicion.', cost: 120, max: 3 },
  { id: 'light', name: 'High-output flashlight', description: 'A longer, brighter beam for the emergency corridors.', cost: 90, max: 3 },
  { id: 'filter', name: 'Recovery filter', description: 'Recover 25% faster from fictional patient status effects.', cost: 100, max: 3 },
  { id: 'suppressor', name: 'Sound suppressor', description: 'Reduce shot noise and delay the police response by 15 seconds.', cost: 180, max: 1 },
  {id:'mask',name:'Protective face mask',description:'Blocks new gas exposure while equipped. Equip or remove it in your loadout.',cost:150,max:1},
  {id:'sniper',name:'Scoped rifle',description:'Unlock an 80 m rifle with a magnified scope. Switch weapons from the action bar.',cost:350,max:1},
  {id:'magazine',name:'Extended magazines',description:'Adds two pistol rounds and one rifle round per level.',cost:160,max:3},
  {id:'vitals',name:'Endurance training',description:'Adds 25 stamina per level for a longer sprint.',cost:130,max:3},
];
export const STAFF = [
  { name: 'Dr. Elias Voss', role: 'Consultant', gender: 'male', hair: '#3a2921', skin: '#d4a078', accent: '#47758a', glasses: true },
  { name: 'Dr. Mara Chen', role: 'Specialist', gender: 'female', hair: '#171c26', skin: '#e3b298', accent: '#416f8d', glasses: false },
  { name: 'Nurse Amara Reed', role: 'Charge nurse', gender: 'female', hair: '#27211f', skin: '#8f5c42', accent: '#6e9cac', glasses: false },
  { name: 'Dr. Theo Hart', role: 'Registrar', gender: 'male', hair: '#6c5543', skin: '#e4b396', accent: '#657b92', glasses: false },
  { name: 'Dr. Sofia Vale', role: 'Attending', gender: 'female', hair: '#573a2d', skin: '#c58d6c', accent: '#426e79', glasses: true },
  { name: 'Nurse Jonas Beck', role: 'Senior nurse', gender: 'male', hair: '#8b7761', skin: '#dfbba0', accent: '#4a8193', glasses: false },
];
export function defaultSave(){return {coins:0,completed:0,attempts:0,character:'male',unlockedCharacters:CHARACTERS.filter(c=>!c.cost).map(c=>c.id),appearance:defaultAppearance(),customAppearance:defaultAppearance(CHARACTERS[2]),customSlots:[null,null,null],ownedOutfits:[],playMode:'story',internationalVersion:2,completedCountryIds:null,pendingTravel:null,campaignCompleted:null,countryId:'france',countryAttempts:Array(20).fill(0),loadout:{weapon:'pistol',mask:false},storySeen:[],lastStory:'',upgrades:Object.fromEntries(UPGRADE_INFO.map(u=>[u.id,0])),settings:{volume:.5,speech:true,sensitivity:1,brightness:1,flashlightBrightness:1,quality:'high',difficulty:'standard'}};}
export function readSave(storage) {
  const blank = defaultSave();
  try {
    const data = JSON.parse(storage.getItem(SAVE_KEY));
    if (!data || typeof data !== 'object') return blank;
    for (const k of ['coins', 'completed', 'attempts']) blank[k] = Math.max(0, Math.floor(Number(data[k]) || 0));
    Object.assign(blank,migrateCharacterSave(data),migrateInternational(data));blank.ownedOutfits=normalizeWardrobe(data.ownedOutfits);
    for (const u of UPGRADE_INFO) blank.upgrades[u.id] = Math.min(u.max, Math.max(0, Math.floor(Number(data.upgrades?.[u.id]) || 0)));
    blank.loadout={weapon:data.loadout?.weapon==='sniper'&&blank.upgrades.sniper?'sniper':'pistol',mask:!!data.loadout?.mask&&!!blank.upgrades.mask};
    blank.storySeen=Array.isArray(data.storySeen)?data.storySeen.filter(id=>typeof id==='string').slice(-128):[];blank.lastStory=typeof data.lastStory==='string'?data.lastStory:'';
    const a=data.activeAssignment;
    // The case and target persist; watching its intro belongs to this page session.
    if(a&&a.round===blank.completed+1&&typeof a.storyId==='string'&&Number.isSafeInteger(a.seed)&&Number.isSafeInteger(a.attempt)&&a.attempt>=0)blank.activeAssignment={round:a.round,storyId:a.storyId,seed:a.seed,attempt:a.attempt,introSeen:false,type:ASSIGNMENT_TYPES.includes(a.type)?a.type:'standard'};
    if (data.settings) {
      blank.settings.volume = Math.min(1, Math.max(0, Number(data.settings.volume) || 0));
      blank.settings.speech = data.settings.speech !== false;
      blank.settings.sensitivity = Math.min(2, Math.max(0.3, Number(data.settings.sensitivity) || 1));
      for(const [setting,min,max] of [['brightness',.75,1.75],['flashlightBrightness',.5,2.5]]){const value=Number(data.settings[setting]);if(Number.isFinite(value))blank.settings[setting]=Math.min(max,Math.max(min,value));}
      if (['high', 'balanced', 'low'].includes(data.settings.quality)) blank.settings.quality = data.settings.quality;
      if (['relaxed', 'standard', 'hard'].includes(data.settings.difficulty)) blank.settings.difficulty = data.settings.difficulty;
    }
  } catch { /* A damaged or unavailable browser save starts a fresh profile. */ }
  return blank;
}
export function writeSave(storage, save) { try { storage.setItem(SAVE_KEY, JSON.stringify(save)); return true; } catch { return false; } }
export function purchase(save, id) {
  const info = UPGRADE_INFO.find(u => u.id === id);
  if (!info || save.upgrades[id] >= info.max) return false;
  const cost = info.cost * (save.upgrades[id] + 1);
  if (save.coins < cost) return false;
  save.coins -= cost; save.upgrades[id]++;
  if(id==='mask')save.loadout.mask=true;if(id==='sniper')save.loadout.weapon='sniper';
  return true;
}
export class Mission {
  constructor(save, seed = Date.now(), attempt = save.attempts) {
    this.save = save; this.random = rng(seed); this.seed = seed;
    this.round = campaignLevel(save);this.country=countryFor(save);this.playMode=save.playMode||'story';this.countryAttempt=save.countryAttempts?.[this.country.index]||0;this.type=assignmentType(save);this.keys=[];this.photos=[];this.photoImages={};this.operationDoctors=[];this.patientReleased=false;
    this.difficulty = save.settings.difficulty;this.challenge=campaignChallenge(this.round,this.difficulty);
    const doctors=STAFF.filter(s=>s.name.startsWith('Dr.'));const targetIndex=(attempt+Math.floor(this.random()*3))%doctors.length;
    const floor = attempt === 0 ? 0 : Math.floor(this.random() * 3);
    const availableRooms = makeLayout(floor,this.country.index).rooms.filter(r => !(coffeeLevel(this.round)?!['office','clinic'].includes(r.kind):['cafe', 'office', 'utility', 'morgue', 'bathroom'].includes(r.kind)));
    this.target = { ...doctors[targetIndex],name:this.country.doctor,gender:this.country.gender, id: 'target', floor, room: availableRooms[Math.floor(this.random() * availableRooms.length)] };
    if(this.type!=='standard')this.target={...doctors[0],name:this.country.doctor,gender:this.country.gender,id:'operation-doctor-0',floor:3,room:makeLayout(3).rooms[0]};
    this.target=countryPerson(this.target,'doctor',this.country,this.seed,'target',0);
    this.state = 'investigate'; this.clues = []; this.elapsed = 0; this.timer = 0;
    this.staffKills = 0; this.shots = 0; this.targetDown = false; this.identified = false; this.result = null;
    this.suspicion = 0; this.blackoutCount = 0;
  }
  clue(type) {
    if (this.clues.some(c => c.type === type) || this.result) return null;
    const target = this.target;
    const clues = {
      directory: { title: this.type==='standard'&&this.challenge.scheduleRequired?'Restricted staff allocation':'Department confirmed', text: this.type==='standard'&&this.challenge.scheduleRequired?`${target.name} works on the ${FLOORS[target.floor].toLowerCase()}, ${target.room.wing} wing. Exact allocations are restricted. Find the paper rota in Records while its custodian is on a coffee break.`:`${target.name} is assigned to ${target.room.name}, ${target.room.wing} wing, ${FLOORS[target.floor].toLowerCase()}.`, source: `${this.country.hospital} staff directory` },
      schedule: { title: 'Rounds schedule', text: `${target.name} is on consultation rounds in room ${target.room.number}. Look for ${target.glasses ? 'dark-rimmed glasses and ' : ''}${target.accent === '#47758a' ? 'slate-blue' : 'blue'} scrubs.`, source: 'Staff allocation terminal' },
      log: { title: 'Location verified', text: `The latest handover places ${target.name} inside ${target.room.name}, room ${target.room.number}. Their badge must match before you act.`, source: `${target.room.wing} wing handover log` },
    };
    if (!clues[type]) return null;
    const c = { ...clues[type], type, time: this.elapsed }; this.clues.push(c); return c;
  }
  identify() { if(this.challenge.verifyHandover&&!this.clues.some(c=>c.type==='log'))return false;if (!this.targetDown && !this.result) { this.identified = true; this.state = 'discovered'; } }
  eliminate(npc) {
    if (this.result || npc.dead) return;
    this.shots++;
    if (npc.role === 'patient') { return this.finish(false, 'A patient was harmed. The assignment is void.'); }
    if(this.type==='evidence')return this.finish(false,'A person was harmed. This was an evidence-only assignment.');
    if(this.type==='rescue'){
      if(!npc.id?.startsWith('operation-doctor-')||this.operationDoctors.includes(npc.id))return false;
      this.operationDoctors.push(npc.id);this.staffKills++;this.targetDown=this.operationDoctors.length===2;this.beginEscape(65);return true;
    }
    if(!mayHitStaff(this,npc)){this.suspicion=Math.min(100,this.suspicion+20);return false;}
    if(npc.role==='police'){this.suspicion=100;return true;}
    this.staffKills++;
    if (npc.id === 'target') {
      this.targetDown = true; this.state = 'escape';
      this.beginEscape(65);
    } else { this.suspicion = Math.min(100, this.suspicion + 38); }
    return true;
  }
  beginEscape(suspicion=0){if(this.state!=='escape'||!this.timer){this.state='escape';this.timer=({relaxed:150,standard:110,hard:75})[this.difficulty]*this.challenge.escapeScale+(this.type==='rescue'?100:0)+(this.save.upgrades.suppressor?15:0);}this.suspicion=Math.max(this.suspicion,suspicion);}
  collectKey(id){if(this.result||!['basement','theatre','laboratory'].includes(id)||this.keys.includes(id))return false;this.keys.push(id);return true;}
  photograph(id){if(this.type!=='evidence'||this.result||!['ledger','consent','theatre'].includes(id)||this.photos.includes(id))return false;this.photos.push(id);if(this.photos.length===3)this.beginEscape(0);return true;}
  releasePatient(){if(this.type!=='rescue'||!this.targetDown||this.patientReleased||this.result)return false;this.patientReleased=true;return true;}
  tick(dt) {
    if (this.result) return;
    this.elapsed += dt;
    if (this.state === 'escape') { this.timer = Math.max(0, this.timer - dt); if (this.timer <= 0) return this.finish(false, 'Police sealed the exits before you escaped.'); }
    else this.suspicion = Math.max(0, this.suspicion - dt * 1.1);
  }
  escape(patientPresent=false) { if (this.type==='evidence'&&this.photos.length!==3||this.type==='rescue'&&(!this.patientReleased||!patientPresent)||this.type==='standard'&&!this.targetDown)return; if (!this.result) return this.finish(true,this.type==='rescue'?'Patient rescued. You both left the hospital before lockdown.':this.type==='evidence'?'Evidence secured. You escaped with all three photographs and no casualties.':'Assignment complete. You left the hospital before lockdown.'); }
  finish(success, reason) {
    if (this.result) return this.result;
    this.state = 'results';
    const breakdown = success ? this.type==='evidence'?[{label:'Verified photographs',coins:this.photos.length*100},{label:'Nonviolent escape',coins:160}]:this.type==='rescue'?[{label:'Patient rescued',coins:300},{label:'Operation stopped',coins:160},{label:'Successful escort',coins:100}]:[
      { label: 'Assigned target', coins: 140 }, { label: 'Successful escape', coins: 100 },
      { label: 'Evidence collected', coins: this.clues.length * 20 },
      { label: 'Additional staff', coins: Math.max(0, this.staffKills - 1) * STAFF_BONUS },
      { label: 'Efficient escape', coins: Math.min(60, Math.floor(this.timer / 3)) },
    ] : [];
    const coins = breakdown.reduce((sum, row) => sum + row.coins, 0);
    const balanceBefore=this.save.coins;recordInternationalResult(this.save,this,success);this.save.coins += coins; this.save.attempts++; if (success) this.save.completed++;
    this.result = { balanceBefore,balanceAfter:this.save.coins,countryId:this.country.id,playMode:this.playMode,campaignComplete:this.save.campaignCompleted===20,type:this.type,photos:this.photos.length,rescued:this.type==='rescue'&&success,success, reason, coins, breakdown, duration: this.elapsed, targetDown: this.targetDown, escaped: success, staffKills: this.staffKills, clues: this.clues.length };
    return this.result;
  }
}
