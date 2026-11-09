<script setup>
import {ref,computed,onMounted,onBeforeUnmount,watch} from 'vue';
import {ArrowLeft,ArrowRight,SkipForward,BookOpen} from 'lucide-vue-next';
import {prepareImage,prepareStory} from './game/media-preload.js';
import {assetUrl} from './game/asset-url.js';
import {STORY_NOTICE,storyVisual,storyDuration} from './game/stories.js';
const props=defineProps({story:Object,paused:Boolean,ending:Boolean});const emit=defineEmits(['finish','references','back']);
const panel=ref(0),finished=ref(false),imageReady=ref(false),pictureError=ref(false);let timer,loadSerial=0,disposed=false;
const visual=computed(()=>storyVisual(props.story,panel.value));
const crop=computed(()=>{const v=visual.value;return `0 ${v.crop[0]+5} ${v.width} ${v.crop[1]-v.crop[0]-10}`;});
function schedule(){clearTimeout(timer);if(imageReady.value&&!props.paused&&!finished.value&&(props.ending||panel.value<props.story.panels.length-1))timer=setTimeout(next,storyDuration(props.story,panel.value));}
function finish(){if(finished.value)return;finished.value=true;clearTimeout(timer);emit('finish');}
function next(){if(finished.value||props.paused)return;if(panel.value<props.story.panels.length-1){panel.value++;schedule();}else finish();}
function back(){clearTimeout(timer);if(panel.value>0){panel.value--;schedule();}else emit('back');}
function key(e){if(props.paused)return;if(['Space','Enter'].includes(e.code)&&e.target.closest?.('button,a,input,select,textarea'))return;if(['Space','ArrowRight','Enter'].includes(e.code)){e.preventDefault();if(props.ending||panel.value<props.story.panels.length-1)next();}if(e.code==='ArrowLeft'){e.preventDefault();back();}if(e.code==='Escape')emit('back');}
async function loadPicture(){const serial=++loadSerial;imageReady.value=false;pictureError.value=false;clearTimeout(timer);try{await prepareImage(visual.value.src);if(!disposed&&serial===loadSerial){imageReady.value=true;schedule();}}catch{if(!disposed&&serial===loadSerial)pictureError.value=true;}}
watch(visual,loadPicture);watch(()=>props.paused,schedule);onMounted(()=>{prepareStory(props.story).catch(()=>{});loadPicture();window.addEventListener('keydown',key);});onBeforeUnmount(()=>{disposed=true;loadSerial++;clearTimeout(timer);window.removeEventListener('keydown',key);});
</script>
<template>
  <section class="story-intro" :aria-label="ending?'Mission completion story':'Story introduction'">
    <div class="story-top"><button :disabled="finished" @click="back" class="story-skip"><ArrowLeft :size="16"/>{{panel?'Previous picture':ending?'Continue journey':'Back to menu'}}</button><span class="eyebrow">KTD / {{ending?'CASE CLOSED':'CLIENT FILES'}}</span><button :disabled="finished" @click="finish" class="story-skip">{{ending?'Continue journey':'Skip story'}} <SkipForward :size="16"/></button></div>
    <div v-if="!imageReady" class="story-media-loading" role="status">{{pictureError?'Picture unavailable. Check your connection.':'STORY LOADING'}}<button v-if="pictureError" @click="loadPicture">Retry picture</button><i v-else></i></div><Transition name="story-fade" mode="out-in"><div v-if="imageReady" :key="panel" class="story-scene">
      <div class="story-art" @click="panel<story.panels.length-1&&next()"><svg :viewBox="crop" preserveAspectRatio="xMidYMid slice" role="img" :aria-label="`Illustrated ${ending?'mission ending':'fictional case'}: ${story.title}, scene ${panel+1}`"><image :href="assetUrl(visual.src)" :width="visual.width" :height="visual.height"/></svg><div class="story-shade"></div></div>
      <div class="story-copy"><span class="eyebrow">{{story.theme}} / {{String(panel+1).padStart(2,'0')}}</span><h1>{{panel===0?story.title:story.panels[panel][0]}}</h1><p>{{story.panels[panel][1]}}</p><ol v-if="panel===story.panels.length-1&&story.assignmentSteps?.length" class="assignment-tasks"><li v-for="step in story.assignmentSteps" :key="step">{{step}}</li></ol></div>
    </div></Transition>
    <footer class="story-bottom"><div><div class="story-progress"><i v-for="n in story.panels.length" :key="n" :class="{active:n<=panel+1}"></i></div><small>{{ending?'Your evidence is secured. Your mission reward has been saved.':STORY_NOTICE}}</small><button v-if="!ending" @click="emit('references')"><BookOpen :size="13"/> Story references</button></div><button class="primary" :disabled="finished||!imageReady" @click="next"><span>{{finished?'GAME LOADING':panel===story.panels.length-1?(ending?'CONTINUE JOURNEY':'ENTER THE HOSPITAL'):'CONTINUE'}}</span><ArrowRight :size="21"/></button></footer>
  </section>
</template>

<style scoped>.story-media-loading{position:absolute;inset:40% 15%;text-align:center;font:12px var(--mono);letter-spacing:.16em}.story-media-loading i{display:block;width:160px;height:2px;background:#96bdce;margin:20px auto;animation:pulse 1s infinite}.story-media-loading button{display:block;margin:20px auto}.story-copy:has(.assignment-tasks){pointer-events:auto}.assignment-tasks{font-size:clamp(12px,1.35vw,18px);line-height:1.5;padding-left:1.3em;max-width:760px}.assignment-tasks li{margin:6px 0}</style>
