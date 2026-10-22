<script setup>
import {computed} from 'vue';
import {RotateCcw,ArrowLeft,ArrowRight,TriangleAlert} from 'lucide-vue-next';
const props=defineProps({stage:Object,error:String,country:String});const emit=defineEmits(['cancel','retry','lighter','reload']);
const progress=computed(()=>Math.round(Math.max(0,Math.min(1,props.stage?.progress||0))*100));
</script>
<template>
  <section class="mission-preparation" :aria-busy="!error" :aria-label="error?'Assignment could not start':'Game loading'">
    <div class="preparation-panel">
      <span v-if="error" class="eyebrow">KTD / {{country}} / ASSIGNMENT</span>
      <TriangleAlert v-if="error" class="preparation-symbol" :size="32"/>
      <h1>{{error?'Let’s get you back in.':'Game loading'}}</h1>
      <p v-if="error" role="alert">{{error}}</p>
      <template v-if="!error"><div class="preparation-track" role="progressbar" aria-label="Game loading" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100"><i :style="{width:progress+'%'}"></i></div><div class="preparation-meta"><span>{{progress}}%</span></div></template>
      <div v-if="error" class="preparation-actions"><button class="primary" @click="emit('retry')">TRY AGAIN <RotateCcw :size="17"/></button><button class="secondary" @click="emit('lighter')">TRY LIGHTER GRAPHICS <ArrowRight :size="17"/></button><button class="text-button" @click="emit('reload')">Reload game</button></div>
      <button class="preparation-back" @click="emit('cancel')"><ArrowLeft :size="15"/> {{error?'Return to menu':'Cancel & return to menu'}}</button>
      <small v-if="error">Your coins, upgrades and campaign progress are saved.</small>
    </div>
  </section>
</template>
<style scoped>
.mission-preparation{position:fixed;inset:0;z-index:180;display:grid;place-items:center;overflow:auto;padding:28px;background:radial-gradient(ellipse at 50% 0%,#24495b,#0a1b29 68%);color:#e3f0f5;touch-action:manipulation}.preparation-panel{width:min(460px,100%)}.preparation-panel>.eyebrow{display:block;letter-spacing:.15em;color:#93b5c7;font-size:10px}.preparation-symbol{display:block;color:#e0c6a7;margin:26px 0 20px}.preparation-panel h1{font:500 clamp(28px,5vw,42px) var(--display);margin:0 0 12px;line-height:1.1}.preparation-panel p{font-size:13px;line-height:1.7;color:#b6cbd6;min-height:2em}.preparation-track{height:4px;background:#7196aa33;margin-top:24px;overflow:hidden}.preparation-track i{display:block;height:100%;background:#b8dce9;transition:width .18s}.preparation-meta{display:flex;justify-content:flex-end;color:#8eb0c0;font:10px var(--mono);margin-top:10px}.preparation-actions{display:grid;gap:10px;margin-top:20px}.preparation-actions .primary{margin:0}.preparation-back{display:flex;align-items:center;gap:8px;min-height:44px;color:#c1dbe7;font-size:12px;margin-top:18px}.preparation-panel>small{display:block;color:#82a5b9;font-size:10px;margin-top:12px;line-height:1.6}@media(max-height:500px){.mission-preparation{padding:16px 24px}.preparation-panel{max-width:560px}.preparation-panel p{margin:8px 0}.preparation-track{margin-top:14px}.preparation-back{margin-top:10px}.preparation-actions{grid-template-columns:1fr 1fr;gap:10px}.preparation-actions .text-button{grid-column:1/-1;margin:0}.preparation-panel>small{margin-top:3px}}@media(prefers-reduced-motion:reduce){.preparation-track i{transition:none}}
</style>
