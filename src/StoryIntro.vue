<script setup>
import {ref,computed,onMounted,onBeforeUnmount,watch} from 'vue';
import {ArrowRight,SkipForward,BookOpen} from 'lucide-vue-next';
import {assetUrl} from './game/asset-url.js';
import {STORY_NOTICE,STORY_CROPS,storyDuration} from './game/stories.js';
const props=defineProps({story:Object,paused:Boolean});const emit=defineEmits(['finish','references']);
const panel=ref(0);let timer;
const crop=computed(()=>{const c=STORY_CROPS[props.story.id];return `0 ${c[panel.value]+5} 1024 ${c[panel.value+1]-c[panel.value]-10}`;});
function schedule(){clearTimeout(timer);if(!props.paused)timer=setTimeout(next,storyDuration(props.story,panel.value));}
function next(){if(panel.value<2){panel.value++;schedule();}else emit('finish');}
function key(e){if(props.paused)return;if(['Space','Enter'].includes(e.code)&&e.target.closest?.('button,a,input,select,textarea'))return;if(['Space','ArrowRight','Enter'].includes(e.code)){e.preventDefault();next();}if(e.code==='Escape')emit('finish');}
watch(()=>props.paused,schedule);onMounted(()=>{schedule();window.addEventListener('keydown',key);});onBeforeUnmount(()=>{clearTimeout(timer);window.removeEventListener('keydown',key);});
</script>
<template>
  <section class="story-intro" aria-label="Story introduction">
    <div class="story-top"><span class="eyebrow">KTD / PATIENT FILES</span><button @click="emit('finish')" class="story-skip">Skip story <SkipForward :size="16"/></button></div>
    <Transition name="story-fade" mode="out-in"><div :key="panel" class="story-scene">
      <div class="story-art" @click="next"><svg :viewBox="crop" preserveAspectRatio="xMidYMid slice" role="img" :aria-label="`Illustrated fictional case: ${story.title}, scene ${panel+1}`"><image :href="assetUrl(`stories/${story.id}.png`)" width="1024" height="1536"/></svg><div class="story-shade"></div></div>
      <div class="story-copy"><span class="eyebrow">{{story.theme}} / {{String(panel+1).padStart(2,'0')}}</span><h1>{{panel===0?story.title:story.panels[panel][0]}}</h1><p>{{story.panels[panel][1]}}</p></div>
    </div></Transition>
    <footer class="story-bottom"><div><div class="story-progress"><i v-for="n in 3" :key="n" :class="{active:n<=panel+1}"></i></div><small>{{STORY_NOTICE}}</small><button @click="emit('references')"><BookOpen :size="13"/> Story references</button></div><button class="primary" @click="next"><span>{{panel===2?'ENTER NORTHLINE':'CONTINUE'}}</span><ArrowRight :size="21"/></button></footer>
  </section>
</template>
