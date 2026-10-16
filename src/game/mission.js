import { rng, makeLayout, FLOORS } from './layout.js';
import {CHARACTERS,STAFF_BONUS,mayHitStaff,defaultAppearance,OUTFITS,HAIRSTYLE_CHOICES} from './loadout.js';
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
export function defaultSave(){return {coins:0,completed:0,attempts:0,character:'male',unlockedCharacters:CHARACTERS.filter(c=>!c.cost).map(c=>c.id),appearance:defaultAppearance(),loadout:{weapon:'pistol',mask:false},storySeen:[],lastStory:'',upgrades:Object.fromEntries(UPGRADE_INFO.map(u=>[u.id,0])),settings:{volume:.5,speech:true,sensitivity:1,quality:'high',difficulty:'standard'}};}
export function readSave(storage) {
  const blank = defaultSave();
  try {
    const data = JSON.parse(storage.getItem(SAVE_KEY));
    if (!data || typeof data !== 'object') return blank;
    for (const k of ['coins', 'completed', 'attempts']) blank[k] = Math.max(0, Math.floor(Number(data[k]) || 0));
    if(Array.isArray(data.unlockedCharacters))blank.unlockedCharacters=[...new Set([...blank.unlockedCharacters,...data.unlockedCharacters.filter(id=>CHARACTERS.some(c=>c.id===id))])];
    if(blank.unlockedCharacters.includes(data.character))blank.character=data.character;
    const profile=CHARACTERS.find(c=>c.id===blank.character);blank.appearance={...defaultAppearance(profile),jewelry:!!data.appearance?.jewelry};
    if(typeof data.appearance?.name==='string')blank.appearance.name=data.appearance.name.slice(0,24);
    for(const k of ['accent','hair','skin','eyes'])if(/^#[a-f0-9]{6}$/i.test(data.appearance?.[k]))blank.appearance[k]=data.appearance[k];
    if(OUTFITS.some(o=>o.id===data.appearance?.outfit))blank.appearance.outfit=data.appearance.outfit;
    if(HAIRSTYLE_CHOICES.some(o=>o.id===data.appearance?.hairstyle))blank.appearance.hairstyle=data.appearance.hairstyle;
    for (const u of UPGRADE_INFO) blank.upgrades[u.id] = Math.min(u.max, Math.max(0, Math.floor(Number(data.upgrades?.[u.id]) || 0)));
    blank.loadout={weapon:data.loadout?.weapon==='sniper'&&blank.upgrades.sniper?'sniper':'pistol',mask:!!data.loadout?.mask&&!!blank.upgrades.mask};
    blank.storySeen=Array.isArray(data.storySeen)?data.storySeen.filter(id=>typeof id==='string').slice(-128):[];blank.lastStory=typeof data.lastStory==='string'?data.lastStory:'';
    const a=data.activeAssignment;
    if(a&&a.round===blank.completed+1&&typeof a.storyId==='string'&&Number.isSafeInteger(a.seed)&&Number.isSafeInteger(a.attempt)&&a.attempt>=0)blank.activeAssignment={round:a.round,storyId:a.storyId,seed:a.seed,attempt:a.attempt,introSeen:a.introSeen===true};
    if (data.settings) {
      blank.settings.volume = Math.min(1, Math.max(0, Number(data.settings.volume) || 0));
      blank.settings.speech = data.settings.speech !== false;
      blank.settings.sensitivity = Math.min(2, Math.max(0.3, Number(data.settings.sensitivity) || 1));
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
    this.round = save.completed + 1;
    this.difficulty = save.settings.difficulty;
    const doctors=STAFF.filter(s=>s.name.startsWith('Dr.'));const targetIndex=(attempt+Math.floor(this.random()*3))%doctors.length;
    const floor = attempt === 0 ? 0 : Math.floor(this.random() * FLOORS.length);
    const availableRooms = makeLayout(floor).rooms.filter(r => !['cafe', 'office', 'utility', 'morgue'].includes(r.kind));
    this.target = { ...doctors[targetIndex], id: 'target', floor, room: availableRooms[Math.floor(this.random() * availableRooms.length)] };
    this.state = 'investigate'; this.clues = []; this.elapsed = 0; this.timer = 0;
    this.staffKills = 0; this.shots = 0; this.targetDown = false; this.identified = false; this.result = null;
    this.suspicion = 0; this.blackoutCount = 0;
  }
  clue(type) {
    if (this.clues.some(c => c.type === type) || this.result) return null;
    const target = this.target;
    const clues = {
      directory: { title: 'Department confirmed', text: `${target.name} is assigned to ${target.room.name}, ${target.room.wing} wing, ${FLOORS[target.floor].toLowerCase()}.`, source: 'Northline staff directory' },
      schedule: { title: 'Rounds schedule', text: `${target.name} is on consultation rounds in room ${target.room.number}. Look for ${target.glasses ? 'dark-rimmed glasses and ' : ''}${target.accent === '#47758a' ? 'slate-blue' : 'blue'} scrubs.`, source: 'Staff allocation terminal' },
      log: { title: 'Location verified', text: `The latest handover places ${target.name} inside ${target.room.name}, room ${target.room.number}. Their badge must match before you act.`, source: `${target.room.wing} wing handover log` },
    };
    if (!clues[type]) return null;
    const c = { ...clues[type], type, time: this.elapsed }; this.clues.push(c); return c;
  }
  identify() { if (!this.targetDown && !this.result) { this.identified = true; this.state = 'discovered'; } }
  eliminate(npc) {
    if (this.result || npc.dead) return;
    this.shots++;
    if (npc.role === 'patient') { return this.finish(false, 'A patient was harmed. The assignment is void.'); }
    if(!mayHitStaff(this,npc)){this.suspicion=Math.min(100,this.suspicion+20);return false;}
    if(npc.role==='police'){this.suspicion=100;return true;}
    this.staffKills++;
    if (npc.id === 'target') {
      this.targetDown = true; this.state = 'escape';
      this.timer = ({ relaxed: 150, standard: 110, hard: 75 })[this.difficulty] + (this.save.upgrades.suppressor ? 15 : 0);
      this.suspicion = 65;
    } else { this.suspicion = Math.min(100, this.suspicion + 38); }
    return true;
  }
  tick(dt) {
    if (this.result) return;
    this.elapsed += dt;
    if (this.state === 'escape') { this.timer = Math.max(0, this.timer - dt); if (this.timer <= 0) return this.finish(false, 'Police sealed the exits before you escaped.'); }
    else this.suspicion = Math.max(0, this.suspicion - dt * 1.1);
  }
  escape() { if (this.targetDown && !this.result) return this.finish(true, 'Assignment complete. You left the hospital before lockdown.'); }
  finish(success, reason) {
    if (this.result) return this.result;
    this.state = 'results';
    const breakdown = success ? [
      { label: 'Assigned target', coins: 140 }, { label: 'Successful escape', coins: 100 },
      { label: 'Evidence collected', coins: this.clues.length * 20 },
      { label: 'Additional staff', coins: Math.max(0, this.staffKills - 1) * STAFF_BONUS },
      { label: 'Efficient escape', coins: Math.min(60, Math.floor(this.timer / 3)) },
    ] : [];
    const coins = breakdown.reduce((sum, row) => sum + row.coins, 0);
    this.save.coins += coins; this.save.attempts++; if (success) this.save.completed++;
    this.result = { success, reason, coins, breakdown, duration: this.elapsed, targetDown: this.targetDown, escaped: success, staffKills: this.staffKills, clues: this.clues.length };
    return this.result;
  }
}
