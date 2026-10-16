export const CHARACTERS = [
  {id:'male',name:'Adrian',gender:'male',accent:'#667683',hair:'#514e50',skin:'#efddce',cost:0,description:'The quiet observer'},
  {id:'female',name:'Alex',gender:'female',accent:'#697b88',hair:'#433f3f',skin:'#efddce',cost:0,description:'The night visitor'},
  {id:'noah',name:'Noah',gender:'male',accent:'#5c756d',hair:'#292421',skin:'#bb8664',cost:0,description:'A familiar face'},
  {id:'samira',name:'Samira',gender:'female',accent:'#76627e',hair:'#211d22',skin:'#a97758',cost:0,description:'A measured approach'},
  {id:'river',name:'River',gender:'male',accent:'#806549',hair:'#afaba4',skin:'#d4ad8d',cost:180,description:'The veteran'},
  {id:'iman',name:'Iman',gender:'female',accent:'#3f657b',hair:'#2c2628',skin:'#805a45',cost:220,description:'The investigator'},
];
export const OUTFIT_COLORS=['#667683','#3f657b','#5c756d','#76627e','#806549','#803e49'];
export const HAIR_COLORS=['#211d22','#514339','#8b6541','#afaba4'];
export const SKIN_COLORS=['#efddce','#d4ad8d','#bb8664','#a97758','#805a45'];
export const EYE_COLORS=['#566d89','#537b60','#79533a','#a4a5a0','#7a6042'];
export const OUTFITS=[{id:'casual',name:'Casual shirt'},{id:'jacket',name:'Field jacket'},{id:'tactical',name:'Tactical vest'}];
export const HAIRSTYLE_CHOICES=[{id:'original',name:'Original'},{id:'cropped',name:'Cropped'},{id:'ponytail',name:'Ponytail'}];
export function defaultAppearance(c=CHARACTERS[0]){return {name:'',accent:c.accent,hair:c.hair,skin:c.skin,eyes:EYE_COLORS[0],outfit:'casual',hairstyle:'original',jewelry:false};}
export function profileFor(save){const base=CHARACTERS.find(c=>c.id===save.character)||CHARACTERS[0];return {...base,...save.appearance,gender:base.gender,name:save.appearance?.name?.trim()||base.name};}
export function selectCharacter(save,id){const c=CHARACTERS.find(c=>c.id===id);if(!c||!save.unlockedCharacters.includes(id))return false;save.character=id;save.appearance=defaultAppearance(c);return true;}
export function unlockCharacter(save,id){const c=CHARACTERS.find(c=>c.id===id);if(!c||save.unlockedCharacters.includes(id)||save.coins<c.cost)return false;save.coins-=c.cost;save.unlockedCharacters.push(id);return selectCharacter(save,id);}
export function weaponInfo(save,kind=save.loadout?.weapon||'pistol'){
  const sniper=kind==='sniper'&&save.upgrades?.sniper>0,mag=save.upgrades?.magazine||0;
  return sniper?{id:'sniper',name:'SCOPED RIFLE',capacity:4+mag,reserve:16,range:80,cooldown:1.05,reload:2.2,fov:19}:{id:'pistol',name:'SERVICE PISTOL',capacity:6+mag*2,reserve:30,range:28,cooldown:.32,reload:1.4,fov:48};
}
export function maskProtects(save){return !!(save.upgrades?.mask&&save.loadout?.mask);}
export const STAFF_BONUS=25;
export function mayHitStaff(mission,npc){return npc.role==='patient'||npc.id==='target'||mission.targetDown;}
export function seesDrawnWeapon(observer,player,yaw,visible,range=11){
  if(!visible)return false;const dx=player.x-observer.x,dz=player.z-observer.z,d=Math.hypot(dx,dz);
  return d<range&&(d<2.5||(dx*Math.sin(yaw)+dz*Math.cos(yaw))/Math.max(d,.001)>.1);
}
