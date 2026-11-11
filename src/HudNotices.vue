<script setup>
defineProps({appointment:Object,toast:Object,phoneOpen:Boolean,reports:Boolean});
const duration=value=>`${Math.floor(Math.max(0,value||0)/60)}:${String(Math.floor(Math.max(0,value||0)%60)).padStart(2,'0')}`;
</script>
<template>
  <div class="hud-notices" :class="{'has-appointment':!phoneOpen && appointment && (appointment.inside || !appointment.complete)}">
    <aside v-if="appointment?.inside && !phoneOpen" class="appointment-warning" role="alert"><strong>LEAVE THE OFFICE TO AVOID RAISING THE DOCTOR’S SUSPICION.</strong><span>Wait until the appointment is over · {{duration(appointment.seconds)}} remaining</span><b>{{appointment.warnings>=2?'Final warning · security will be called if you remain.':'Please wait outside. Staying in the room will trigger a security warning.'}}</b></aside>
    <aside v-else-if="appointment && !appointment.complete && !phoneOpen" class="appointment-wait" role="status"><div>Appointment ends in <b>{{duration(appointment.seconds)}}</b></div><span>Wait outside · Mystery Soda changes this timer.</span></aside>
    <div v-if="toast && !reports && toast.kind!=='office-urgent'" class="toast" :class="toast.kind" role="status"><span class="toast-line"></span><span>{{toast.text}}</span></div>
  </div>
</template>
<style scoped>
.hud-notices{display:contents}.hud-notices.has-appointment{position:absolute;z-index:25;top:143px;left:50%;transform:translateX(-50%);display:grid;gap:10px;width:min(500px,72vw);pointer-events:none}
.hud-notices:empty{display:none}
.hud-notices.has-appointment .appointment-wait,.hud-notices.has-appointment .appointment-warning,.hud-notices.has-appointment .toast{position:static;transform:none;inset:auto;box-sizing:border-box;width:100%;min-width:0;max-width:none;margin:0;overflow-wrap:anywhere}
.hud-notices.has-appointment .appointment-wait{padding:12px 16px;gap:5px}.appointment-wait div{display:flex;flex-wrap:wrap;justify-content:center;align-items:baseline;gap:8px}.appointment-wait div b{font-size:18px;font-variant-numeric:tabular-nums}
.hud-notices.has-appointment .toast{animation:none;line-height:1.5;padding:12px 16px}.hud-notices.has-appointment .toast>span:last-child{min-width:0}
@media(max-height:580px){.hud-notices.has-appointment{top:calc(env(safe-area-inset-top,0px) + 105px);width:min(420px,46vw);gap:7px}.hud-notices.has-appointment .appointment-wait,.hud-notices.has-appointment .appointment-warning,.hud-notices.has-appointment .toast{padding:8px 11px;font-size:10px}.hud-notices.has-appointment .appointment-wait span{font-size:9px}.appointment-wait div b{font-size:15px}}
@media(max-width:600px) and (orientation:portrait){.hud-notices.has-appointment{top:156px;width:calc(100% - 32px)}}
</style>
