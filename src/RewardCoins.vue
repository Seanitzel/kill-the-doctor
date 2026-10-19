<script setup>
import {ref,onMounted,onBeforeUnmount,watch} from 'vue';
import {Coins} from 'lucide-vue-next';
const props=defineProps({result:Object,balance:Number});const emit=defineEmits(['tick']);
const base=Math.max(0,props.result.balanceBefore??props.balance-props.result.coins),display=ref(base),flying=ref(false),done=ref(false);let raf,elapsed=0,last=0,lastStep=-1;
onMounted(()=>{if(!(props.result.coins>0)){display.value=props.balance;done.value=true;return;}function frame(now){raf=requestAnimationFrame(frame);if(document.hidden){last=0;return;}if(last)elapsed+=Math.min(80,now-last);last=now;flying.value=elapsed>200;const progress=Math.min(1,Math.max(0,(elapsed-900)/1250));display.value=base+Math.round(props.result.coins*(1-(1-progress)**3));const step=Math.floor(progress*11);if(progress>0&&step!==lastStep){emit('tick');lastStep=step;}if(elapsed>=2350){display.value=props.balance;done.value=true;cancelAnimationFrame(raf);}}raf=requestAnimationFrame(frame);});
watch(()=>props.balance,value=>{if(done.value)display.value=value;});
onBeforeUnmount(()=>cancelAnimationFrame(raf));
</script>
<template><div class="reward-card coin-reward" :class="{flying,done}"><div><span class="eyebrow">MISSION REWARD</span><strong><Coins :size="25"/> {{result.coins}}<small>COINS</small></strong></div><span class="balance" aria-live="polite">BALANCE <b>{{display}}</b></span><span v-if="result.coins>0&&!done" class="reward-flight" aria-hidden="true"><i v-for="n in 14" :key="n" :style="{'--n':n}">✦</i></span></div></template>
