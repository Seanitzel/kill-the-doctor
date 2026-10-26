export const CHARACTERS = [
  {id:'male',name:'Adrian',gender:'male',accent:'#485766',hair:'#342b28',skin:'#d4ad8d',cost:0,description:'A composed, tailored silhouette'},
  {id:'female',name:'Alex',gender:'female',accent:'#596c77',hair:'#302329',skin:'#d4ad8d',cost:0,description:'A polished, confident presence'},
  {id:'custom',name:'Your character',gender:'male',accent:'#3f657b',hair:'#211d22',skin:'#805a45',cost:0,description:'Create an identity of your own'},
];
const LEGACY_PROFILES={
  noah:{name:'Noah',gender:'male',accent:'#5c756d',hair:'#292421',skin:'#bb8664'},
  samira:{name:'Samira',gender:'female',accent:'#76627e',hair:'#211d22',skin:'#a97758'},
  river:{name:'River',gender:'male',accent:'#806549',hair:'#afaba4',skin:'#d4ad8d'},
  iman:{name:'Iman',gender:'female',accent:'#3f657b',hair:'#2c2628',skin:'#805a45'},
};
export const OUTFIT_COLORS=['#485766','#3f657b','#5c756d','#76627e','#806549','#803e49','#20252d','#e6dcd0'];
export const HAIR_COLORS=['#171619','#514339','#8b6541','#afaba4','#d0aa6f','#df789d','#a84e7d'];
export const HIGHLIGHT_COLORS=['#d0aa6f','#ece3d2','#df789d','#b389d2'];
export const SKIN_COLORS=['#f3ddca','#d4ad8d','#bb8664','#a97758','#805a45','#5c3c2d','#3e281f','#271c18'];
export const EYE_COLORS=['#566d89','#537b60','#79533a','#a4a5a0','#7a6042'];
export const PREMIUM_OUTFITS=[{id:'nocturne',name:'Nocturne · double-breasted suit',cost:100,base:'suit',color:'#1d2534',trim:'#b8a477'},{id:'ivory',name:'Ivory · evening two-piece',cost:115,base:'suit',color:'#e2d9ca',trim:'#253344'},{id:'velvet',name:'Velvet · burgundy tailoring',cost:125,base:'suit',color:'#702c46',trim:'#c4a1a5'},{id:'cobalt',name:'Cobalt · fitted city suit',cost:140,base:'suit',color:'#244970',trim:'#a7bdcb'},{id:'expedition',name:'Expedition · belted field coat',cost:150,base:'jacket',color:'#5c6659',trim:'#c4b495'}];
export const FACE_SHAPES={eyeShape:[{id:'natural',name:'Natural'},{id:'almond',name:'Almond'},{id:'round',name:'Round'},{id:'lifted',name:'Lifted'}],noseShape:[{id:'natural',name:'Natural'},{id:'slender',name:'Slender'},{id:'broad',name:'Broad'},{id:'defined',name:'Defined bridge'}],mouthShape:[{id:'natural',name:'Natural'},{id:'full',name:'Full'},{id:'soft',name:'Soft bow'},{id:'wide',name:'Wide'}]};
export function normalizeWardrobe(value){return PREMIUM_OUTFITS.filter(o=>Array.isArray(value)&&value.includes(o.id)).map(o=>o.id);}
export function ownsOutfit(save,id){return !PREMIUM_OUTFITS.some(o=>o.id===id)||normalizeWardrobe(save.ownedOutfits).includes(id);}
export function purchaseOutfit(save,id){const item=PREMIUM_OUTFITS.find(o=>o.id===id);if(!item||ownsOutfit(save,id)||save.coins<item.cost)return false;save.coins-=item.cost;save.ownedOutfits=[...normalizeWardrobe(save.ownedOutfits),id];return true;}
export const OUTFITS=[{id:'casual',name:'Casual shirt'},{id:'jacket',name:'Field jacket'},{id:'tactical',name:'Tactical vest'},{id:'suit',name:'Tailored suit'},...PREMIUM_OUTFITS];
export const HAIRSTYLE_CHOICES=[{id:'original',name:'Signature cut'},{id:'cropped',name:'Cropped'},{id:'slick',name:'Slicked back'},{id:'ponytail',name:'Back ponytail'},{id:'ponytail-front',name:'Side-part ponytail'},{id:'ponytail-side',name:'Side ponytail'},{id:'afro',name:'Natural afro'},{id:'braids',name:'Long braids'},{id:'straight',name:'Long straight'},{id:'curls-short',name:'Short curls'},{id:'curls-long',name:'Long curls'}];
export const TATTOO_CHOICES=[{id:'none',name:'No tattoos'},{id:'botanical',name:'Botanical ink'},{id:'geometric',name:'Geometric ink'}];
const validHex=value=>typeof value==='string'&&/^#[a-f0-9]{6}$/i.test(value);
export function defaultAppearance(c=CHARACTERS[0]){return {eyeShape:'natural',mouthShape:'natural',noseShape:'natural',name:'',gender:c.gender||'male',accent:c.accent,hair:c.hair,skin:c.skin,eyes:EYE_COLORS[0],outfit:c.id==='male'?'suit':'casual',hairstyle:c.id==='female'?'slick':'original',highlights:'none',tattoos:'none',glasses:false,sunglasses:false,cap:false,watch:false,purse:false,jewelry:false};}
export function normalizeAppearance(value={},base=CHARACTERS[0]){
  value=value&&typeof value==='object'?value:{};const result=defaultAppearance(base);if(typeof value.name==='string')result.name=value.name.slice(0,24);
  if(['male','female'].includes(value.gender))result.gender=value.gender;
  for(const key of ['accent','hair','skin','eyes'])if(validHex(value[key]))result[key]=value[key];
  if(value.highlights==='none'||validHex(value.highlights))result.highlights=value.highlights;
  for(const [key,options] of [['outfit',OUTFITS],['hairstyle',HAIRSTYLE_CHOICES],['tattoos',TATTOO_CHOICES]])if(options.some(option=>option.id===value[key]))result[key]=value[key];
  for(const key of ['glasses','sunglasses','cap','watch','purse','jewelry'])result[key]=value[key]===true;
  for(const [key,choices] of Object.entries(FACE_SHAPES))if(choices.some(o=>o.id===value[key]))result[key]=value[key];
  if(result.sunglasses)result.glasses=false;
  return result;
}
export function migrateCharacterSave(data){
  const legacy=LEGACY_PROFILES[data.character],id=legacy?'custom':CHARACTERS.some(c=>c.id===data.character)?data.character:'male';
  const base=legacy||CHARACTERS.find(c=>c.id===id),appearance=normalizeAppearance(data.appearance,base);
  if(legacy){appearance.gender=legacy.gender;if(!appearance.name.trim())appearance.name=legacy.name;}
  const customAppearance=normalizeAppearance(data.customAppearance|| (id==='custom'?appearance:{}),CHARACTERS[2]);
  return {character:id,unlockedCharacters:CHARACTERS.map(c=>c.id),appearance,customAppearance,customSlots:normalizeCustomSlots(data.customSlots)};
}
export function normalizeCustomSlots(value){return Array.from({length:3},(_,i)=>value?.[i]&&typeof value[i]==='object'?normalizeAppearance(value[i],CHARACTERS[2]):null);}
export function saveCustomSlot(save,index){if(!Number.isInteger(index)||index<0||index>2)return false;save.customSlots=normalizeCustomSlots(save.customSlots);save.customSlots[index]=normalizeAppearance(profileFor(save),CHARACTERS[2]);return true;}
export function loadCustomSlot(save,index){if(!Number.isInteger(index)||index<0||index>2||!save.customSlots?.[index])return false;save.character='custom';save.appearance=normalizeAppearance(save.customSlots[index],CHARACTERS[2]);save.customAppearance={...save.appearance};return true;}
export function clearCustomSlot(save,index){if(!Number.isInteger(index)||index<0||index>2)return false;save.customSlots=normalizeCustomSlots(save.customSlots);save.customSlots[index]=null;return true;}
export function selectHairstyle(save){save.appearance.cap=false;}
export function profileFor(save){const base=CHARACTERS.find(c=>c.id===save.character)||CHARACTERS[0],appearance=normalizeAppearance(save.appearance,base);if(!ownsOutfit(save,appearance.outfit))appearance.outfit='casual';if(base.id!=='custom')for(const key of Object.keys(FACE_SHAPES))appearance[key]='natural';return {...base,...appearance,gender:base.id==='custom'?appearance.gender:base.gender,name:appearance.name.trim()||base.name,refined:true};}
export function selectCharacter(save,id){const c=CHARACTERS.find(c=>c.id===id);if(!c)return false;if(save.character==='custom')save.customAppearance=normalizeAppearance(save.appearance,CHARACTERS[2]);save.character=id;save.appearance=id==='custom'?normalizeAppearance(save.customAppearance,CHARACTERS[2]):defaultAppearance(c);save.unlockedCharacters=CHARACTERS.map(c=>c.id);return true;}
export function unlockCharacter(save,id){return CHARACTERS.some(c=>c.id===id)&&!save.unlockedCharacters?.includes(id)?selectCharacter(save,id):false;}
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
