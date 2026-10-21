<script setup>
import {ref,onMounted,onBeforeUnmount} from 'vue';
import {RotateCcw,ArrowLeft,ArrowRight,TriangleAlert} from 'lucide-vue-next';
const props=defineProps({stage:Object,error:String,country:String});const emit=defineEmits(['cancel','retry','lighter','reload']);
const seconds=ref(0);let interval;
onMounted(()=>{interval=setInterval(()=>seconds.value++,1000);});onBeforeUnmount(()=>clearInterval(interval));
</script>
<template>
  <section class="mission-preparation" :aria-busy="!error" :aria-label="error?'Assignment could not start':'Preparing assignment'">
    <div class="preparation-panel">
      <span class="eyebrow">KTD / {{country}} / ASSIGNMENT</span>
      <TriangleAlert v-if="error" class="preparation-symbol" :size="32"/><span v-else class="preparation-spinner" aria-hidden="true"></span>
      <h1>{{error?'Let’s get you back in.':stage?.label||'Preparing your assignment'}}</h1>
      <p v-if="error" role="alert">{{error}}</p><p v-else aria-live="polite">{{stage?.detail||'Preparing the hospital. Your assignment will open automatically.'}}</p>
      <template v-if="!error"><div class="preparation-track" role="progressbar" aria-label="Assignment preparation" :aria-valuenow="Math.round((stage?.progress||0)*100)" aria-valuemin="0" aria-valuemax="100"><i :style="{width:Math.max(2,(stage?.progress||0)*100)+'%'}"></i></div><div class="preparation-meta"><span>STEP PROGRESS · {{Math.round((stage?.progress||0)*100)}}%</span><span>{{seconds}}s</span></div><p v-if="seconds>=12" class="preparation-slow">Still working. The first visit can take longer while files download and graphics prepare. You can return to the menu safely.</p></template>
      <div v-if="error" class="preparation-actions"><button class="primary" @click="emit('retry')">TRY AGAIN <RotateCcw :size="17"/></button><button class="secondary" @click="emit('lighter')">TRY LIGHTER GRAPHICS <ArrowRight :size="17"/></button><button class="text-button" @click="emit('reload')">Reload game</button></div>
      <button class="preparation-back" @click="emit('cancel')"><ArrowLeft :size="15"/> {{error?'Return to menu':'Cancel & return to menu'}}</button>
      <small>Your coins, upgrades and campaign progress are saved.</small>
    </div>
  </section>
</template>
<style scoped>
.mission-preparation{position:fixed;inset:0;z-index:180;display:grid;place-items:center;overflow:auto;padding:28px;background:radial-gradient(ellipse at 50% 0%,#24495b,#0a1b29 68%);color:#e3f0f5;touch-action:manipulation}.preparation-panel{width:min(520px,100%)}.preparation-panel>.eyebrow{display:block;letter-spacing:.15em;color:#93b5c7;font-size:10px}.preparation-spinner{display:block;width:38px;height:38px;margin:32px 0 24px;border:2px solid #7295a744;border-top-color:#bde5ee;border-radius:50%;animation:preparation-spin .9s linear infinite}.preparation-symbol{display:block;color:#e0c6a7;margin:26px 0 20px}.preparation-panel h1{font:500 clamp(28px,5vw,42px) var(--display);margin:0 0 12px;line-height:1.1}.preparation-panel p{font-size:13px;line-height:1.7;color:#b6cbd6;min-height:2em}.preparation-track{height:4px;background:#7196aa33;margin-top:24px;overflow:hidden}.preparation-track i{display:block;height:100%;background:#b8dce9;transition:width .18s}.preparation-meta{display:flex;justify-content:space-between;color:#8eb0c0;font:10px var(--mono);margin-top:10px}.preparation-slow{font-size:12px!important;border-left:2px solid #648b9f;padding-left:12px;margin-top:20px}.preparation-actions{display:grid;gap:10px;margin-top:20px}.preparation-actions .primary{margin:0}.preparation-back{display:flex;align-items:center;gap:8px;min-height:44px;color:#c1dbe7;font-size:12px;margin-top:18px}.preparation-panel>small{display:block;color:#82a5b9;font-size:10px;margin-top:12px;line-height:1.6}@keyframes preparation-spin{to{transform:rotate(360deg)}}@media(max-height:500px){.mission-preparation{padding:16px 24px}.preparation-panel{max-width:560px}.preparation-spinner{width:25px;height:25px;margin:16px 0}.preparation-panel p{margin:8px 0}.preparation-track{margin-top:14px}.preparation-back{margin-top:10px}.preparation-actions{grid-template-columns:1fr 1fr;gap:10px}.preparation-actions .text-button{grid-column:1/-1;margin:0}.preparation-panel>small{margin-top:3px}}@media(prefers-reduced-motion:reduce){.preparation-spinner{animation-duration:2s}.preparation-track i{transition:none}}
</style>
