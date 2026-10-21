<script setup>
import {ref,watch,onMounted,onBeforeUnmount} from 'vue';
import * as T from 'three';
import {makePlayer,portraitCamera} from './game/assets.js';
const props=defineProps({engine:Object,profile:Object,fullBody:Boolean});const canvas=ref(null),rotation=ref(0),unavailable=ref(false);let renderer,scene,avatar,observer,raf,drag,framing,disposed=false;let width=0,height=0;
function draw(){raf=null;if(disposed||!renderer||!avatar)return;const box=canvas.value.getBoundingClientRect();if(!box.width||!box.height)return;
  if(width!==box.width||height!==box.height){width=box.width;height=box.height;renderer.setSize(width,height,false);}
  if(!framing){const camera=portraitCamera(avatar,{fullBody:props.fullBody}),target=new T.Vector3().fromArray(camera.userData.portraitTarget);framing={camera,target,radius:camera.position.distanceTo(target)};}
  const {camera,target,radius}=framing,yaw=rotation.value*Math.PI/180,fit=width/height<1?height/width:1;
  camera.position.set(target.x+Math.sin(yaw)*radius*fit,target.y,target.z+Math.cos(yaw)*radius*fit);camera.aspect=width/height;camera.lookAt(target);camera.updateProjectionMatrix();renderer.render(scene,camera);
}
function request(){if(!raf&&!disposed)raf=requestAnimationFrame(draw);}
function rebuild(){if(!scene)return;avatar?.root.removeFromParent();avatar?.dispose();avatar=null;framing=null;if(!props.engine?.assets)return;avatar=makePlayer(props.engine.assets,props.profile.gender,props.profile,'civilian');avatar.animate(0,0,.35);scene.add(avatar.root);request();}
function down(e){if(e.button!==undefined&&e.button!==0)return;drag={id:e.pointerId,x:e.clientX,rotation:rotation.value};e.currentTarget.setPointerCapture(e.pointerId);}
function move(e){if(drag?.id!==e.pointerId)return;rotation.value=((drag.rotation+(e.clientX-drag.x)*.65)%360+360)%360;request();}
function end(e){if(drag?.id===e.pointerId)drag=null;}
watch(()=>props.profile,rebuild,{deep:true});watch(()=>props.fullBody,()=>{framing=null;request();});watch(rotation,request);watch(()=>props.engine?.ready,rebuild);
onMounted(()=>{try{renderer=new T.WebGLRenderer({canvas:canvas.value,antialias:true,alpha:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;scene=new T.Scene();scene.background=new T.Color('#7293a8');scene.add(new T.HemisphereLight('#e5f3ff','#6b7a89',2.5));const key=new T.DirectionalLight('#fff4e7',3);key.position.set(2,3,4);scene.add(key);const fill=new T.DirectionalLight('#b8dcfa',1.5);fill.position.set(-3,2,2);scene.add(fill);observer=new ResizeObserver(request);observer.observe(canvas.value);rebuild();if(!avatar)props.engine?.assetsPromise?.then(()=>{if(!disposed)rebuild();}).catch(()=>{unavailable.value=true;});}catch{unavailable.value=true;}});
onBeforeUnmount(()=>{disposed=true;cancelAnimationFrame(raf);observer?.disconnect();avatar?.dispose();scene?.clear();renderer?.dispose();renderer?.forceContextLoss();});
</script>
<template><div class="live-character-preview"><canvas ref="canvas" tabindex="0" role="img" :aria-label="`${profile.name} ${fullBody?'outfit':'face'} preview, drag to rotate 360 degrees`" @pointerdown="down" @pointermove="move" @pointerup="end" @pointercancel="end" @lostpointercapture="end" @keydown.left.prevent="rotation=(rotation+350)%360" @keydown.right.prevent="rotation=(rotation+10)%360"></canvas><p v-if="unavailable">Preview unavailable on this device.</p><small>Drag to rotate · {{Math.round(rotation)}}°</small><input aria-label="Character preview rotation" type="range" min="0" max="360" step="1" v-model.number="rotation"/></div></template>
<style scoped>.live-character-preview{width:100%}.live-character-preview canvas{display:block;width:100%;aspect-ratio:1;touch-action:none;cursor:grab;border-radius:2px}.live-character-preview canvas:active{cursor:grabbing}.live-character-preview small{display:block;text-align:center;margin:8px 0;color:#b9d3df;font-size:10px}.live-character-preview input{width:100%;accent-color:#b8def1}@media(max-height:500px) and (min-width:700px){.live-character-preview canvas{max-height:165px;aspect-ratio:1;object-fit:contain}}</style>
