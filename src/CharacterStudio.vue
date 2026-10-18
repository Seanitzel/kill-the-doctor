<script setup>
import {ref,computed,watch,onMounted,onBeforeUnmount} from 'vue';
import {Check} from 'lucide-vue-next';
import {CHARACTERS,OUTFIT_COLORS,HAIR_COLORS,HIGHLIGHT_COLORS,SKIN_COLORS,EYE_COLORS,OUTFITS,HAIRSTYLE_CHOICES,TATTOO_CHOICES,profileFor,selectCharacter,saveCustomSlot,loadCustomSlot,clearCustomSlot,selectHairstyle} from './game/loadout.js';
import {portrait} from './game/assets.js';
import './studio-v3.css';
const props=defineProps({save:Object,engine:Object});const emit=defineEmits(['change']);
const profile=computed(()=>profileFor(props.save)),preview=ref(portrait(profile.value)),previewMode=ref('face'),previewView=ref('front');let timer;
const thumbs=Object.fromEntries(CHARACTERS.map(c=>[c.id,portrait(c)]));
const palettes=[{id:'accent',title:'Clothing color',colors:OUTFIT_COLORS},{id:'hair',title:'Hair color',colors:HAIR_COLORS},{id:'skin',title:'Skin tone',colors:SKIN_COLORS},{id:'eyes',title:'Eye color',colors:EYE_COLORS}];
function update(){emit('change');clearTimeout(timer);timer=setTimeout(()=>{preview.value=props.engine?.ready?props.engine.portrait(profile.value,'civilian',{fullBody:previewMode.value==='outfit',view:previewView.value}):portrait(profile.value);},120);}
function view(mode){previewMode.value=mode;update();}
function angle(mode){previewView.value=mode;update();}
function choose(c){if(selectCharacter(props.save,c.id))update();}
const slotMessage=ref('');
function slotAction(action,index){const success=action==='save'?saveCustomSlot(props.save,index):action==='load'?loadCustomSlot(props.save,index):clearCustomSlot(props.save,index);if(success){slotMessage.value=`Look ${index+1} ${action==='save'?'saved':action==='load'?'loaded':'cleared'}.`;update();}}
function hairstyleChanged(){selectHairstyle(props.save);}
function accessoryChanged(id){if(['glasses','sunglasses'].includes(id)&&props.save.appearance[id])props.save.appearance[id==='glasses'?'sunglasses':'glasses']=false;}
onMounted(update);watch(()=>props.save.appearance,update,{deep:true});onBeforeUnmount(()=>clearTimeout(timer));
</script>
<template>
  <div class="studio-title"><div><h2>Make it personal.</h2><p class="modal-lead">Adrian. Alex. Or someone entirely your own.</p></div></div>
  <div class="character-studio studio-v3"><aside class="studio-preview"><img :src="preview" :alt="`${profile.name}, ${previewView} ${previewMode} preview`"/><div class="preview-views"><button :aria-pressed="previewMode==='face'" @click="view('face')">Face</button><button :aria-pressed="previewMode==='outfit'" @click="view('outfit')">Outfit</button></div><div class="studio-angles" aria-label="Preview angle"><button v-for="direction in ['front','side','back']" :key="direction" :aria-pressed="previewView===direction" @click="angle(direction)">{{direction}}</button></div><strong>{{profile.name}}</strong><span>{{profile.description}}</span><small>Changes apply to the next assignment.</small></aside><div class="studio-options">
    <div class="profile-grid"><article v-for="c in CHARACTERS" :key="c.id" :class="{selected:save.character===c.id}"><button :aria-label="`Select ${c.name}`" @click="choose(c)"><img :src="thumbs[c.id]" :alt="c.name"/><span>{{c.name}}<small>{{c.id==='custom'?'Build your own look':c.description}}</small></span><Check v-if="save.character===c.id" :size="16"/></button></article></div>
    <label class="studio-name">DISPLAY NAME<input v-model="save.appearance.name" maxlength="24" :placeholder="CHARACTERS.find(c=>c.id===save.character)?.name"/></label>
    <label v-if="save.character==='custom'" class="studio-body">CHARACTER BASE<select aria-label="Character base" v-model="save.appearance.gender"><option value="male">Masculine</option><option value="female">Feminine</option></select></label>
    <div class="style-choices"><label>OUTFIT<select aria-label="Outfit style" v-model="save.appearance.outfit"><option v-for="style in OUTFITS" :value="style.id" :key="style.id">{{style.name}}</option></select></label><label>HAIRSTYLE<select aria-label="Hairstyle" v-model="save.appearance.hairstyle" @change="hairstyleChanged"><option v-for="style in HAIRSTYLE_CHOICES" :value="style.id" :key="style.id">{{style.name}}</option></select></label></div>
    <template v-for="row in palettes" :key="row.id">
      <div class="palette-row" :data-palette="row.id"><span>{{row.title}}</span><div><button v-for="color in row.colors" :key="color" :style="{background:color}" :class="{selected:save.appearance[row.id]===color}" :aria-label="`${row.title} ${color}`" :aria-pressed="save.appearance[row.id]===color" @click="save.appearance[row.id]=color"><Check v-if="save.appearance[row.id]===color" :size="14"/></button></div></div>
      <div v-if="row.id==='hair'" class="palette-row hair-highlights" data-palette="highlights"><span>HAIR HI-LIGHTS</span><div><button class="no-highlight" :class="{selected:save.appearance.highlights==='none'}" :aria-pressed="save.appearance.highlights==='none'" aria-label="No hair hi-lights" @click="save.appearance.highlights='none'">—</button><button v-for="color in HIGHLIGHT_COLORS" :key="color" :style="{background:color}" :class="{selected:save.appearance.highlights===color}" :aria-label="`Hair hi-lights ${color}`" :aria-pressed="save.appearance.highlights===color" @click="save.appearance.highlights=color"><Check v-if="save.appearance.highlights===color" :size="14"/></button></div></div>
    </template>
    <label class="studio-body">TATTOOS<select aria-label="Tattoo style" v-model="save.appearance.tattoos"><option v-for="tattoo in TATTOO_CHOICES" :key="tattoo.id" :value="tattoo.id">{{tattoo.name}}</option></select></label>
    <fieldset class="studio-accessories"><legend>ACCESSORIES</legend><label v-for="option in [{id:'glasses',name:'Glasses'},{id:'sunglasses',name:'Black sunglasses'},{id:'cap',name:'Cap'},{id:'watch',name:'Watch'},{id:'purse',name:'Crossbody purse'},{id:'jewelry',name:'Necklace & earrings'}]" :key="option.id"><input type="checkbox" v-model="save.appearance[option.id]" @change="accessoryChanged(option.id)"/><span>{{option.name}}</span></label></fieldset>
    <section class="saved-looks" aria-label="Saved custom characters"><h3>Your saved characters</h3><p>Keep up to three looks on this device. Load a look to use it as your custom character.</p><article v-for="(_,i) in 3" :key="i"><span><b>{{save.customSlots?.[i]?.name || `Look ${i+1}`}}</b><small>{{save.customSlots?.[i]?'Saved character':'Empty slot'}}</small></span><button v-if="save.customSlots?.[i]" @click="slotAction('load',i)" :aria-label="`Load saved character ${i+1}`">Load</button><button @click="slotAction('save',i)" :aria-label="`Save current look to slot ${i+1}`">{{save.customSlots?.[i]?'Replace':'Save'}}</button><button v-if="save.customSlots?.[i]" @click="slotAction('clear',i)" :aria-label="`Delete saved character ${i+1}`">×</button></article><p role="status">{{slotMessage}}</p></section>
    <p class="mri-explanation">Remove metal jewelry before entering MRI. This is a dramatized game hazard.</p>
  </div></div>
</template>
