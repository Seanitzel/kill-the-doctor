<script setup>
import { ref,watch,onMounted,onBeforeUnmount } from 'vue';
import { Crosshair,Hand,Flashlight,RotateCcw,Footprints,Map,BookOpen,Pause,ArrowDown,Target,Shield } from 'lucide-vue-next';
import {LookGesture} from './look-gesture.js';
import { stickVector } from './input.js';
import { nativeFeedback } from './platform.js';
const props=defineProps({engine:Object,hud:Object});
const emit=defineEmits(['map','journal','pause']);
const knob=ref({x:0,y:0}),sprint=ref(false),crouch=ref(false),looking=ref(false);
watch(()=>props.hud.sprintEnabled,value=>{if(value!==undefined)sprint.value=value;});
let movePointer=null,firePointer=null,lastFire=null;
const lookGesture=new LookGesture({look:(x,y)=>props.engine.lookTouch(x,y),zoom:ratio=>props.engine.zoomTouch(ratio)});
function move(event){if(event.pointerId!==movePointer)return;event.preventDefault();const r=event.currentTarget.getBoundingClientRect();const vector=stickVector(event.clientX-r.left-r.width/2,event.clientY-r.top-r.height/2,44);knob.value={x:vector.x,y:vector.y};props.engine.setTouchMove(vector.forward,vector.strafe);}
function moveStart(event){if(movePointer!==null)return;event.preventDefault();movePointer=event.pointerId;event.currentTarget.setPointerCapture(event.pointerId);move(event);}
function moveEnd(event){if(event.pointerId!==movePointer)return;movePointer=null;knob.value={x:0,y:0};props.engine.setTouchMove(0,0);}
function lookStart(event){event.preventDefault();if(lookGesture.start(event.pointerId,event.clientX,event.clientY)){looking.value=true;event.currentTarget.setPointerCapture(event.pointerId);}}
function lookMove(event){if(!lookGesture.points.has(event.pointerId))return;event.preventDefault();lookGesture.move(event.pointerId,event.clientX,event.clientY);}
function lookEnd(event){lookGesture.end(event.pointerId);looking.value=lookGesture.points.size>0;}
function fireStart(event){if(firePointer!==null)return;event.preventDefault();event.stopPropagation();firePointer=event.pointerId;lastFire={x:event.clientX,y:event.clientY};event.currentTarget.setPointerCapture(event.pointerId);props.engine.requestTouchShot();}
function fireMove(event){if(event.pointerId!==firePointer)return;event.preventDefault();props.engine.lookTouch(event.clientX-lastFire.x,event.clientY-lastFire.y);lastFire={x:event.clientX,y:event.clientY};}
function fireEnd(event){if(event.pointerId===firePointer){firePointer=null;lastFire=null;}}
function buttonAction(event,name){if(event.type==='pointerdown'||event.detail===0)action(name);}
function toolAction(event,name){if(event.type==='pointerdown'||event.detail===0)emit(name);}
function action(name){nativeFeedback();if(name==='aim')props.engine.toggleAim();else if(name==='draw')props.engine.toggleWeapon();else if(name==='weapon')props.engine.switchWeapon();else if(name==='mask')props.engine.toggleMask();else if(name==='run'){sprint.value=!sprint.value;props.engine.touchInput.sprint=sprint.value;}else if(name==='crouch'){crouch.value=!crouch.value;props.engine.touchInput.crouch=crouch.value;}else if(name==='use')props.engine.interact();else if(name==='light')props.engine.toggleFlash();else if(name==='reload')props.engine.reload();}
function resetGestures(){movePointer=firePointer=null;lastFire=null;lookGesture.reset();knob.value={x:0,y:0};looking.value=sprint.value=crouch.value=false;props.engine?.resetTouch();}
onMounted(()=>{window.addEventListener('resize',resetGestures);window.addEventListener('blur',resetGestures);window.visualViewport?.addEventListener('resize',resetGestures);});
onBeforeUnmount(()=>{window.removeEventListener('resize',resetGestures);window.removeEventListener('blur',resetGestures);window.visualViewport?.removeEventListener('resize',resetGestures);resetGestures();});
</script>
<template>
  <div class="phone-controls">
    <div class="phone-look" :class="{looking}" data-testid="touch-look" aria-label="Drag to look around; pinch with two fingers to zoom" @pointerdown="lookStart" @pointermove="lookMove" @pointerup="lookEnd" @pointercancel="lookEnd" @lostpointercapture="lookEnd"><span>DRAG TO LOOK · PINCH TO ZOOM</span></div>
    <nav class="phone-tools" aria-label="Mission tools"><button aria-label="Hospital map" @pointerdown.prevent="toolAction($event,'map')" @click="toolAction($event,'map')"><Map :size="19"/></button><button aria-label="Evidence journal" @pointerdown.prevent="toolAction($event,'journal')" @click="toolAction($event,'journal')"><BookOpen :size="19"/></button><button aria-label="Pause mission" @pointerdown.prevent="toolAction($event,'pause')" @click="toolAction($event,'pause')"><Pause :size="19"/></button></nav>
    <div class="phone-move" data-testid="touch-move" aria-label="Movement joystick" @pointerdown="moveStart" @pointermove="move" @pointerup="moveEnd" @pointercancel="moveEnd" @lostpointercapture="moveEnd"><span class="stick-cross">+</span><span class="stick-knob" :style="{transform:`translate(${knob.x}px,${knob.y}px)`}"></span><small>MOVE</small></div>
    <div class="phone-stance"><button aria-label="Toggle sprint" :disabled="hud.sprintExhausted" :aria-pressed="sprint" :class="{active:sprint}" @pointerdown.prevent="buttonAction($event,'run')" @click="buttonAction($event,'run')"><Footprints :size="18"/><small>{{hud.sprintExhausted?'REST':'RUN'}}</small></button><button aria-label="Toggle crouch" :aria-pressed="crouch" :class="{active:crouch}" @pointerdown.prevent="buttonAction($event,'crouch')" @click="buttonAction($event,'crouch')"><ArrowDown :size="18"/><small>CROUCH</small></button></div>
    <div class="phone-gear"><button :aria-label="hud.assignment?.type==='evidence'?'Raise camera':hud.weaponDrawn?'Holster weapon':'Draw weapon'" :class="{active:hud.weaponDrawn}" @pointerdown.prevent="buttonAction($event,'draw')" @click="buttonAction($event,'draw')"><Crosshair :size="16"/><small>{{hud.assignment?.type==='evidence'?'CAMERA':hud.weaponDrawn?'HIDE':'DRAW'}}</small></button><button v-if="hud.assignment?.type!=='evidence'" aria-label="Switch weapon" @pointerdown.prevent="buttonAction($event,'weapon')" @click="buttonAction($event,'weapon')"><Target :size="16"/><small>{{hud.weaponKind==='sniper'?'PISTOL':'RIFLE'}}</small></button><button aria-label="Toggle mask" :class="{active:hud.masked}" @pointerdown.prevent="buttonAction($event,'mask')" @click="buttonAction($event,'mask')"><Shield :size="16"/><small>MASK</small></button></div>
    <div class="phone-actions">
      <button class="phone-use" data-testid="touch-use" aria-label="Interact" :class="{available:hud.prompt}" @pointerdown.prevent="buttonAction($event,'use')" @click="buttonAction($event,'use')"><Hand :size="21"/><small>USE</small></button>
      <button data-testid="touch-aim" aria-label="Toggle aim" :aria-pressed="hud.aiming" :class="{active:hud.aiming}" @pointerdown.prevent="buttonAction($event,'aim')" @click="buttonAction($event,'aim')"><Crosshair :size="22"/><small>AIM</small></button>
      <button class="phone-fire" data-testid="touch-fire" :aria-label="hud.assignment?.type==='evidence'?'Take evidence photograph':'Fire weapon'" @pointerdown="fireStart" @pointermove="fireMove" @pointerup="fireEnd" @pointercancel="fireEnd" @lostpointercapture="fireEnd"><Target :size="28"/><small>{{hud.assignment?.type==='evidence'?'PHOTO':'FIRE'}}</small><b>{{hud.assignment?.type==='evidence'?`${hud.assignment.photos.length}/3`:hud.ammo}}</b></button>
      <button aria-label="Toggle flashlight" :aria-pressed="hud.flashlight" :class="{active:hud.flashlight}" @pointerdown.prevent="buttonAction($event,'light')" @click="buttonAction($event,'light')"><Flashlight :size="20"/><small>LIGHT</small></button>
      <button v-if="hud.assignment?.type!=='evidence'" data-testid="touch-reload" aria-label="Reload weapon" @pointerdown.prevent="buttonAction($event,'reload')" @click="buttonAction($event,'reload')"><RotateCcw :size="20"/><small>{{hud.reloading?'LOADING':'RELOAD'}}</small></button>
    </div>
  </div>
</template>
