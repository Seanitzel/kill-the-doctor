<script setup>
import {ref,computed,onMounted,onBeforeUnmount,watch} from 'vue';
import {ArrowLeft,ArrowRight,SkipForward,BookOpen} from 'lucide-vue-next';
import {assetUrl} from './game/asset-url.js';
import {STORY_NOTICE,storyVisual,storyDuration} from './game/stories.js';
const props=defineProps({story:Object,paused:Boolean,ending:Boolean});const emit=defineEmits(['finish','references','back']);
const panel=ref(0);let timer;
const visual=computed(()=>storyVisual(props.story,panel.value));
const crop=computed(()=>{const v=visual.value;return `0 ${v.crop[0]+5} ${v.width} ${v.crop[1]-v.crop[0]-10}`;});
function schedule(){clearTimeout(timer);if(!props.paused)timer=setTimeout(next,storyDuration(props.story,panel.value));}
function next(){if(panel.value<props.story.panels.length-1){panel.value++;schedule();}else emit('finish');}
function back(){clearTimeout(timer);if(panel.value>0){panel.value--;schedule();}else emit('back');}
function key(e){if(props.paused)return;if(['Space','Enter'].includes(e.code)&&e.target.closest?.('button,a,input,select,textarea'))return;if(['Space','ArrowRight','Enter'].includes(e.code)){e.preventDefault();next();}if(e.code==='ArrowLeft'){e.preventDefault();back();}if(e.code==='Escape')emit('back');}
watch(()=>props.paused,schedule);onMounted(()=>{schedule();window.addEventListener('keydown',key);});onBeforeUnmount(()=>{clearTimeout(timer);window.removeEventListener('keydown',key);});
</script>
<template>
  <section class="story-intro" :aria-label="ending?'Evidence mission ending':'Story introduction'">
    <div class="story-top"><button @click="back" class="story-skip"><ArrowLeft :size="16"/>{{panel?'Previous picture':ending?'Go to debrief':'Back to menu'}}</button><span class="eyebrow">KTD / {{ending?'CASE CLOSED':'CLIENT FILES'}}</span><button @click="emit('finish')" class="story-skip">{{ending?'Go to debrief':'Skip story'}} <SkipForward :size="16"/></button></div>
    <Transition name="story-fade" mode="out-in"><div :key="panel" class="story-scene">
      <div class="story-art" @click="next"><svg :viewBox="crop" preserveAspectRatio="xMidYMid slice" role="img" :aria-label="`Illustrated ${ending?'mission ending':'fictional case'}: ${story.title}, scene ${panel+1}`"><image :href="assetUrl(visual.src)" :width="visual.width" :height="visual.height"/></svg><div class="story-shade"></div></div>
      <div class="story-copy"><span class="eyebrow">{{story.theme}} / {{String(panel+1).padStart(2,'0')}}</span><h1>{{panel===0?story.title:story.panels[panel][0]}}</h1><p>{{story.panels[panel][1]}}</p></div>
    </div></Transition>
    <footer class="story-bottom"><div><div class="story-progress"><i v-for="n in story.panels.length" :key="n" :class="{active:n<=panel+1}"></i></div><small>{{ending?'Your evidence is secured. Your mission reward has been saved.':STORY_NOTICE}}</small><button v-if="!ending" @click="emit('references')"><BookOpen :size="13"/> Story references</button></div><button class="primary" @click="next"><span>{{panel===story.panels.length-1?(ending?'VIEW DEBRIEF':'ENTER NHALEWICK'):'CONTINUE'}}</span><ArrowRight :size="21"/></button></footer>
  </section>
</template>
