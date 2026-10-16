<script setup>
import {ref,computed,watch,onMounted,onBeforeUnmount} from 'vue';
import {Check,Lock,Coins} from 'lucide-vue-next';
import {CHARACTERS,OUTFIT_COLORS,HAIR_COLORS,SKIN_COLORS,EYE_COLORS,OUTFITS,HAIRSTYLE_CHOICES,profileFor,selectCharacter,unlockCharacter} from './game/loadout.js';
import {portrait} from './game/assets.js';
const props=defineProps({save:Object,engine:Object});const emit=defineEmits(['change']);
const profile=computed(()=>profileFor(props.save)),preview=ref(portrait(profile.value)),previewMode=ref('face');let timer;
const thumbs=Object.fromEntries(CHARACTERS.map(c=>[c.id,portrait(c)]));
function update(){emit('change');clearTimeout(timer);timer=setTimeout(()=>{preview.value=props.engine?.ready?props.engine.portrait(profile.value,'civilian',{fullBody:previewMode.value==='outfit'}):portrait(profile.value);},120);}
function view(mode){previewMode.value=mode;update();}
function choose(c){if(selectCharacter(props.save,c.id))update();}
function unlock(c){if(unlockCharacter(props.save,c.id))update();}
onMounted(update);
watch(()=>[props.save.appearance.accent,props.save.appearance.hair,props.save.appearance.skin,props.save.appearance.eyes,props.save.appearance.outfit,props.save.appearance.hairstyle],update);onBeforeUnmount(()=>clearTimeout(timer));
</script>
<template>
  <div class="studio-title"><div><h2>Make it personal.</h2><p class="modal-lead">Six identities. Choose your eyes, hair, outfit and accessories.</p></div><span class="studio-coins"><Coins :size="19"/> {{save.coins}}</span></div>
  <div class="character-studio"><aside class="studio-preview"><img :src="preview" :alt="`${profile.name} character preview`"/><div class="preview-views"><button :aria-pressed="previewMode==='face'" @click="view('face')">Face</button><button :aria-pressed="previewMode==='outfit'" @click="view('outfit')">Outfit</button></div><strong>{{profile.name}}</strong><span>{{profile.description}}</span><small>Appearance changes apply to the next assignment.</small></aside><div class="studio-options">
    <div class="profile-grid"><article v-for="c in CHARACTERS" :key="c.id" :class="{selected:save.character===c.id}"><button :aria-label="`Select ${c.name}`" :disabled="!save.unlockedCharacters.includes(c.id)" @click="choose(c)"><img :src="thumbs[c.id]" :alt="c.name"/><span>{{c.name}}<small>{{c.description}}</small></span><Check v-if="save.character===c.id" :size="16"/><Lock v-else-if="!save.unlockedCharacters.includes(c.id)" :size="15"/></button><button v-if="!save.unlockedCharacters.includes(c.id)" class="unlock-profile" :disabled="save.coins<c.cost" @click="unlock(c)">Unlock <Coins :size="12"/> {{c.cost}}</button></article></div>
    <label class="studio-name">DISPLAY NAME<input v-model="save.appearance.name" maxlength="24" :placeholder="CHARACTERS.find(c=>c.id===save.character)?.name" @input="update"/></label>
    <div class="style-choices"><label>OUTFIT<select aria-label="Outfit style" v-model="save.appearance.outfit"><option v-for="style in OUTFITS" :value="style.id" :key="style.id">{{style.name}}</option></select></label><label>HAIRSTYLE<select aria-label="Hairstyle" v-model="save.appearance.hairstyle"><option v-for="style in HAIRSTYLE_CHOICES" :value="style.id" :key="style.id">{{style.name}}</option></select></label></div>
    <div v-for="row in [{id:'eyes',title:'EYE COLOR',colors:EYE_COLORS},{id:'accent',title:'CLOTHING',colors:OUTFIT_COLORS},{id:'hair',title:'HAIR',colors:HAIR_COLORS},{id:'skin',title:'SKIN TONE',colors:SKIN_COLORS}]" :key="row.id" class="palette-row"><span>{{row.title}}</span><div><button v-for="color in row.colors" :key="color" :style="{background:color}" :class="{selected:save.appearance[row.id]===color}" :aria-label="`${row.title} ${color}`" :aria-pressed="save.appearance[row.id]===color" @click="save.appearance[row.id]=color"><Check v-if="save.appearance[row.id]===color" :size="14"/></button></div></div>
    <label class="jewelry-option"><input type="checkbox" v-model="save.appearance.jewelry" @change="update"/><span>Steel necklace & earrings<small>Cosmetic accessory · remove before entering MRI.</small></span></label><p class="mri-explanation">MRI magnets can attract magnetic objects. Northline’s fatal attraction is a dramatized game hazard; MRI does not use ionizing radiation.</p>
  </div></div>
</template>
