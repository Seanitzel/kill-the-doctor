<script setup>
import {ref,computed,onMounted,onBeforeUnmount,useId} from 'vue';
import * as T from 'three';
import land from './game/earth-land.json';
import {assetUrl} from './game/asset-url.js';
import {flightView,FlightClock} from './game/flight-view.js';
const props=defineProps({from:Object,to:Object,audio:Object});const emit=defineEmits(['finish']);
const canvas=ref(null),fallback=ref(false),progress=ref(0),arrived=ref(false),view=flightView(props.from,props.to),clock=new FlightClock(),uid=useId().replaceAll(':','');
const plane=computed(()=>({...view.point(progress.value),angle:view.bearing(progress.value)}));
const controller=new AbortController();let renderer,scene,observer,frame,textureDeadline,disposed=false,finished=false,flightSound=null,bitmap=null;
const ownedTextures=new Set(),ownedMaterials=new Set(),ownedGeometry=new Set();
const own=(collection,value)=>(collection.add(value),value);
function stopSound(){if(flightSound)props.audio?.releaseSynth(flightSound,true);flightSound=null;}
function startSound(){if(disposed||finished||document.hidden||arrived.value||flightSound)return;flightSound=props.audio?.flight({elapsed:clock.elapsed/1000});}
function finish(){if(finished||disposed)return;finished=true;stopSound();cancelAnimationFrame(frame);emit('finish');}
function visibility(){clock.step(performance.now(),false);if(document.hidden)stopSound();else startSound();}
function disposeGraphics(){
 observer?.disconnect();observer=null;
 for(const value of ownedTextures)value.dispose();ownedTextures.clear();bitmap?.close();bitmap=null;
 for(const value of ownedGeometry)value.dispose();ownedGeometry.clear();for(const value of ownedMaterials)value.dispose();ownedMaterials.clear();
 const oldRenderer=renderer;renderer=null;scene=null;oldRenderer?.dispose();oldRenderer?.forceContextLoss();
}
function contextLost(event){event.preventDefault();if(disposed||!renderer)return;fallback.value=true;disposeGraphics();}
function fallbackAtlas(){
 const atlas=document.createElement('canvas');atlas.width=1024;atlas.height=512;const c=atlas.getContext('2d');c.fillStyle='#124178';c.fillRect(0,0,1024,512);c.fillStyle='#649071';
 for(const ring of land){c.beginPath();ring.forEach(([lon,lat],i)=>{const x=(lon+180)/360*1024,y=(90-lat)/180*512;i?c.lineTo(x,y):c.moveTo(x,y);});c.closePath();c.fill();}
 const texture=own(ownedTextures,new T.CanvasTexture(atlas));texture.colorSpace=T.SRGBColorSpace;return texture;
}
// Optional detail loads never block progression; abort requests and close late bitmaps.
async function detailTexture(material,render){
 textureDeadline=setTimeout(()=>controller.abort(),5000);
 try{const response=await fetch(assetUrl('images/earth-blue-marble.jpg'),{signal:controller.signal});if(!response.ok)return;const blob=await response.blob();const image=await createImageBitmap(blob,{imageOrientation:'flipY'});if(disposed||controller.signal.aborted||!renderer){image.close();return;}
 const texture=own(ownedTextures,new T.Texture(image));texture.flipY=false;texture.colorSpace=T.SRGBColorSpace;texture.needsUpdate=true;const old=material.map;material.map=texture;material.needsUpdate=true;old.dispose();ownedTextures.delete(old);bitmap=image;render();
 }catch{/* The geographic atlas remains available offline. */}finally{clearTimeout(textureDeadline);}
}
function initializeGlobe(){
 renderer=new T.WebGLRenderer({canvas:canvas.value,antialias:true,alpha:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.outputColorSpace=T.SRGBColorSpace;
 scene=new T.Scene();const camera=new T.OrthographicCamera(-1/.84,1/.84,1/.84,-1/.84,.1,10);camera.position.z=4;
 const geometry=own(ownedGeometry,new T.SphereGeometry(1,72,48));geometry.rotateY(-Math.PI/2);
 const material=own(ownedMaterials,new T.MeshPhongMaterial({map:fallbackAtlas(),shininess:8,specular:'#33445d'})),globe=new T.Mesh(geometry,material);globe.quaternion.copy(view.orientation);scene.add(globe);
 scene.add(new T.AmbientLight('#d8e9ff',1.6));const light=new T.DirectionalLight('#ffffff',1.4);light.position.set(-2,3,5);scene.add(light);
 const atmosphereMaterial=own(ownedMaterials,new T.ShaderMaterial({transparent:true,side:T.BackSide,blending:T.AdditiveBlending,depthWrite:false,vertexShader:'varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.0);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 n;varying vec3 v;void main(){float glow=pow(1.0-abs(dot(normalize(n),normalize(v))),3.0);gl_FragColor=vec4(0.12,0.55,1.0,glow*0.7);}'}));
 const atmosphere=new T.Mesh(geometry,atmosphereMaterial);atmosphere.scale.setScalar(1.025);scene.add(atmosphere);
 const resize=()=>{if(disposed||!renderer)return;const size=canvas.value.getBoundingClientRect();renderer.setSize(Math.max(1,size.width),Math.max(1,size.height),false);renderer.render(scene,camera);};
 observer=new ResizeObserver(resize);observer.observe(canvas.value);resize();detailTexture(material,resize);
 return ()=>{if(renderer)renderer.render(scene,camera);};
}
// The SVG fallback uses the same projection as WebGL: labels and plane never change route.
const fallbackLand=land.map(ring=>{let path='',drawing=false;for(const [lon,lat]of ring){const latR=lat*Math.PI/180,lonR=lon*Math.PI/180,v=new T.Vector3(Math.cos(latR)*Math.sin(lonR),Math.sin(latR),Math.cos(latR)*Math.cos(lonR)).applyQuaternion(view.orientation);if(v.z<0){drawing=false;continue;}path+=`${drawing?'L':'M'}${500+v.x*420},${500-v.y*420}`;drawing=true;}return path+'Z';});
onMounted(()=>{
 try{initializeGlobe();}catch{disposeGraphics();fallback.value=true;}
 document.addEventListener('visibilitychange',visibility);canvas.value.addEventListener('webglcontextlost',contextLost);
 props.audio?.start().then(startSound).catch(()=>{});startSound();
 const draw=now=>{if(disposed||finished)return;const state=clock.step(now,!document.hidden);progress.value=state.progress;
 if(!document.hidden){startSound();if(state.arrive){arrived.value=true;stopSound();props.audio?.flightArrival();}if(state.finish){finish();return;}}
 frame=requestAnimationFrame(draw);};frame=requestAnimationFrame(draw);
});
onBeforeUnmount(()=>{disposed=true;cancelAnimationFrame(frame);clearTimeout(textureDeadline);controller.abort();document.removeEventListener('visibilitychange',visibility);canvas.value?.removeEventListener('webglcontextlost',contextLost);stopSound();disposeGraphics();});
</script>
<template>
 <section class="travel-screen flight-screen" aria-label="Flight to the next international assignment">
  <header><div><span class="eyebrow">KTD / INTERNATIONAL</span><h2>FLIGHT ROUTE</h2><p>TRAVEL ACROSS THE WORLD</p></div><span class="flight-state" aria-live="polite">{{arrived?'ARRIVED':'IN FLIGHT'}} <i class="live-dot"></i></span></header>
  <div class="earth-stage" role="img" :aria-label="`Airplane traveling from ${from.name} to ${to.name}`">
   <div class="earth-halo"></div><canvas v-show="!fallback" ref="canvas" aria-hidden="true"></canvas>
   <svg v-if="fallback" class="earth-fallback" viewBox="0 0 1000 1000"><defs><clipPath :id="uid+'-disk'"><circle cx="500" cy="500" r="420"/></clipPath><radialGradient :id="uid+'-sea'"><stop stop-color="#286fa4"/><stop offset="1" stop-color="#062b56"/></radialGradient></defs><circle cx="500" cy="500" r="420" :fill="`url(#${uid}-sea)`"/><g :clip-path="`url(#${uid}-disk)`"><path v-for="(d,i) in fallbackLand" :key="i" :d="d" fill="#8eaa7c"/></g></svg>
   <svg class="flight-overlay" viewBox="0 0 1000 1000" aria-hidden="true">
    <defs><filter :id="uid+'-glow'" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="7"/></filter></defs>
    <path :d="view.path" class="route-halo"/><path :d="view.path" class="route-dots"/>
    <g v-for="(pin,i) in [view.departure,view.arrival]" :key="i" :transform="`translate(${pin.x} ${pin.y})`" class="country-pin" :class="{landed:i===1&&arrived}">
     <circle r="22" fill="#ffc842" opacity=".55" :filter="`url(#${uid}-glow)`"/><ellipse rx="13" ry="5" fill="#fbd261"/>
     <path d="M0 0C-5-12-18-23-18-36A18 18 0 0 1 18-36C18-23 5-12 0 0Z" fill="#f5b832" stroke="#ffe9a7" stroke-width="3"/><circle cy="-36" r="8" fill="#fff9d7"/>
    </g>
    <g :transform="`translate(${plane.x} ${plane.y}) rotate(${plane.angle}) scale(${view.planeSize/100})`" class="route-plane">
     <path d="M50 0Q48-5 34-6L7-7-17-40-27-40-14-7-38-6-47-20-54-20-48 0-54 20-47 20-38 6-14 7-27 40-17 40 7 7 34 6Q48 5 50 0Z" fill="#f3f6f9" stroke="#9cb5c9" stroke-width="1.5"/>
     <path d="M32-4L37 0 32 4M-8-5L-13-28M-8 5L-13 28" stroke="#647d96" stroke-width="2" fill="none"/>
    </g>
   </svg>
   <span class="country-label from-label" :style="{left:view.departure.x/10+'%',top:view.departure.y/10+'%'}"><small>PREVIOUS COUNTRY</small><b>{{from.name}}</b></span>
   <span class="country-label to-label" :style="{left:view.arrival.x/10+'%',top:view.arrival.y/10+'%'}"><small>NEXT COUNTRY</small><b>{{to.name}}</b></span>
  </div>
  <footer><div class="flight-caption"><span>{{from.name}}</span><span aria-hidden="true">→</span><strong>{{to.name}}</strong></div><p>{{arrived?'Your next story begins…':'Your next assignment is waiting.'}}</p><div class="journey-progress" role="progressbar" aria-label="Flight progress" :aria-valuenow="Math.round(progress*100)" aria-valuemin="0" aria-valuemax="100"><i :style="{width:progress*100+'%'}"></i></div></footer>
  <button class="skip-flight" @click="finish">Skip flight →</button>
 </section>
</template>
<style scoped>
.flight-screen{position:absolute;inset:0;z-index:35;display:flex;align-items:center;justify-content:center;overflow:hidden;background:radial-gradient(ellipse at 50% 45%,#081c36 0,#020b1a 62%,#010611 100%);isolation:isolate;color:#e9f0fa}.flight-screen:before{content:'';position:absolute;inset:0;z-index:-1;opacity:.5;background-image:radial-gradient(1px 1px at 18px 25px,#c9e2ff 80%,transparent),radial-gradient(1px 1px at 120px 92px,#a1bfec 80%,transparent),radial-gradient(1px 1px at 70px 155px,#c9e2ff 80%,transparent);background-size:193px 177px,269px 233px,337px 271px}.flight-screen header{position:absolute;display:flex;justify-content:space-between;top:max(5%,env(safe-area-inset-top));left:6%;right:6%;align-items:start}.flight-screen h2{margin:12px 0 7px;font:500 clamp(20px,3vw,29px) var(--mono);letter-spacing:.14em}.flight-screen header p{font:10px var(--mono);letter-spacing:.19em;color:#7b98bc;margin:0}.flight-screen .eyebrow{font:9px var(--mono);letter-spacing:.2em;color:#819ab7}.flight-state{font:10px var(--mono);letter-spacing:.13em;margin-top:16px;color:#b5cae5}.earth-stage{position:absolute;width:min(86vw,82vh,850px);height:min(86vw,82vh,850px);top:48%;left:50%;transform:translate(-50%,-50%)}.earth-stage canvas,.earth-fallback,.flight-overlay{width:100%;height:100%;position:absolute;inset:0;display:block}.earth-halo{position:absolute;inset:8%;border-radius:50%;box-shadow:0 0 12px #57b9ff,0 0 48px #1477db88,0 0 95px #0764b14d;background:#09254a}.flight-overlay{overflow:visible}.route-halo,.route-dots{fill:none;stroke-linecap:round;stroke-dasharray:2 15}.route-halo{stroke:#eff8ff;stroke-width:8}.route-dots{stroke:#101b2e;stroke-width:3.5}.route-plane{filter:drop-shadow(0 4px 5px #0009)}.country-label{position:absolute;display:flex;flex-direction:column;gap:5px;white-space:nowrap;padding:9px 13px;border:1px solid #647fa4;background:#071328e8;border-radius:5px;box-shadow:0 0 16px #3a7ac51a;min-width:105px;text-align:center;pointer-events:none}.country-label small{font:8px var(--mono);letter-spacing:.15em;color:#9db2d1}.country-label b{font:500 clamp(14px,2.4vw,22px) var(--mono);letter-spacing:.02em}.from-label{transform:translate(-100%,calc(-100% - 39px))}.to-label{transform:translate(0,calc(-100% - 39px));border-color:#d4b266}.country-label:after{content:'';position:absolute;height:28px;width:1px;background:#90abd1;bottom:-29px;right:0}.to-label:after{right:auto;left:0;background:#edc97a}.flight-screen footer{position:absolute;left:50%;transform:translateX(-50%);bottom:max(5%,env(safe-area-inset-bottom));text-align:center}.flight-caption{display:flex;gap:20px;align-items:center;justify-content:center;font:clamp(14px,2vw,21px) var(--mono)}.flight-caption>span:nth-child(2){color:#d6bb73}.flight-caption strong{font-weight:500;color:#f5d78e}.flight-screen footer p{font:10px var(--mono);color:#8fa7c5;margin:12px 0}.journey-progress{height:2px;background:#2b405e;width:220px;max-width:50vw;margin:auto}.journey-progress i{display:block;background:#dfc078;height:100%}.flight-screen>.skip-flight{position:absolute;bottom:4%;right:5%;min-height:44px;background:transparent;border:none;color:#a2b6cf;font:10px var(--mono);padding:12px}.landed{filter:brightness(1.4)}
@media(max-height:600px){.earth-stage{width:min(67vw,95vh);height:min(67vw,95vh);top:49%}.flight-screen header{top:max(6%,env(safe-area-inset-top));left:4%;right:4%}.flight-screen h2{font-size:18px;margin:7px 0}.flight-screen header p{font-size:8px}.flight-state{font-size:9px}.country-label{padding:6px 8px;min-width:82px;gap:4px}.country-label small{font-size:7px}.country-label b{font-size:13px}.from-label{transform:translate(-100%,calc(-100% - 22px))}.to-label{transform:translate(0,calc(-100% - 22px))}.country-label:after{height:18px;bottom:-19px}.flight-screen footer{bottom:5%;left:4%;transform:none;text-align:left}.flight-caption{font-size:12px;gap:10px;justify-content:start}.flight-screen footer p{font-size:8px;max-width:160px;line-height:1.5;margin:8px 0}.journey-progress{width:140px;margin:0}.flight-screen>.skip-flight{right:3%;bottom:4%}}
@media(max-width:600px) and (min-height:601px){.earth-stage{width:100vw;height:100vw;top:47%}.country-label{min-width:84px;padding:8px}.country-label b{font-size:14px}.country-label small{font-size:6px}.flight-state{font-size:8px}.flight-screen header p{font-size:8px}.flight-screen footer{bottom:12%}}
</style>
