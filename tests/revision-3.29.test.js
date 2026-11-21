import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {COUNTRIES} from '../src/game/international.js';
import {EVENING_WEATHER,STORY_WEATHER,addEveningWeather,updateEveningWeather,storySkyColor} from '../src/game/evening-weather.js';
import {addNightSky,updateNightSky} from '../src/game/night-sky.js';
import {snowHeight} from '../src/game/snow-ground.js';
import {disposeObjectResources} from '../src/game/resources.js';

test('Story climate changes are isolated from Freeplay and every other country',()=>{
 const overrides={france:'storm',nigeria:'clear',america:'clear',england:'snow'};
 for(const {id}of COUNTRIES){
  assert.equal(STORY_WEATHER[id],overrides[id]||EVENING_WEATHER[id]);
  for(const story of [true,false]){
   const root=new T.Group(),weather=addEveningWeather(root,id,{story});
   try{assert.equal(weather.weather,(story?STORY_WEATHER:EVENING_WEATHER)[id]);if(story&&['nigeria','america'].includes(id)){assert.equal(weather.count,0);updateEveningWeather(root,true,100);assert.equal(weather.particles.visible,false);assert.equal(weather.flash.intensity,0);}}
   finally{disposeObjectResources(root,{textures:true});}
  }
 }
});

test('England retains the existing snowflake buffer and appearance while settled snow has smooth bounded relief',()=>{
 const root=new T.Group(),legacy=new T.Group(),state=addEveningWeather(root,'england',{story:true}),old=addEveningWeather(legacy,'russia');
 try{
  assert.equal(state.count,old.count);assert.equal(state.particles.material.size,old.particles.material.size);assert.equal(state.particles.material.color.getHex(),old.particles.material.color.getHex());assert.equal(state.particles.material.opacity,old.particles.material.opacity);
  updateEveningWeather(root,true,30);updateEveningWeather(legacy,true,30);assert.deepEqual(state.positions,old.positions);
  const geometry=state.snowSurface.geometry,positions=geometry.attributes.position;let low=Infinity,high=-Infinity;
  for(let i=0;i<positions.count;i++){const y=positions.getY(i);assert.ok(Number.isFinite(y));low=Math.min(low,y);high=Math.max(high,y);}
  assert.ok(high-low>.20);assert.ok(high<.45);for(const z of [37,40,44,46])assert.ok(snowHeight(1.5,z)<.06,'the pedestrian entrance path stays shallow');
  for(let i=0;i<200;i++)updateEveningWeather(root,true,i);assert.equal(state.snowSurface.geometry,geometry);assert.equal(geometry.attributes.position,positions);
 }finally{disposeObjectResources(root,{textures:true});disposeObjectResources(legacy,{textures:true});}
});

test('Story sky, precipitation and sunset illumination stay visible from indoors without depending on the threshold',()=>{
 for(const {id}of COUNTRIES){
  const group=new T.Group();addEveningWeather(group,id,{story:true});addNightSky(group,{story:true,country:id});const weather=group.userData.evening,sky=group.userData.nightSky,view={floor:0,camera:new T.PerspectiveCamera()};
  try{
   weather.began=20;const colours=[],lights=[];
   for(const outside of [false,false,true,true,false]){updateEveningWeather(group,outside,45,null,{visible:true});updateNightSky(group,outside,45,false,view);colours.push(storySkyColor(id,25).getHex());lights.push(weather.sun.intensity);assert.equal(sky.root.visible,true);assert.equal(weather.particles.visible,weather.count>0);}
   assert.equal(new Set(colours).size,1);assert.equal(new Set(lights).size,1);
   view.floor=1;updateNightSky(group,false,45,false,view);assert.equal(sky.root.visible,false);
   updateEveningWeather(group,false,45,null,{visible:false});assert.equal(weather.sun.intensity,0,'retiring the exterior clears sunset lighting from the menu');
  }finally{disposeObjectResources(group,{textures:true});}
 }
 assert.equal(storySkyColor('nigeria',0).getHexString(),'071e31');assert.equal(storySkyColor('nigeria',300).getHexString(),'071e31');
});

test('Egypt has a setting sun followed by a nighttime-only crescent, with a gradual fade and a continuous colour transition',()=>{
 const group=new T.Group();addEveningWeather(group,'egypt',{story:true});addNightSky(group,{story:true,country:'egypt'});const weather=group.userData.evening,sky=group.userData.nightSky,view={floor:0,camera:new T.PerspectiveCamera()},bodies=sky.celestials;
 try{
  weather.began=100;let previousY=Infinity;
  for(const age of [0,30,60,90,115,149,150,156,162,240]){
   updateEveningWeather(group,false,100+age,null,{visible:true});updateNightSky(group,false,100+age,false,view);
   assert.ok(bodies.sun.position.y<=previousY);previousY=bodies.sun.position.y;
   assert.equal(bodies.moon.visible,age>=150);if(age===0)assert.equal(bodies.sun.visible,true);if(age>=150)assert.equal(bodies.sun.visible,false);
   if(age===150)assert.equal(bodies.moon.material.uniforms.visibility.value,0);if(age===156)assert.ok(bodies.moon.material.uniforms.visibility.value>0&&bodies.moon.material.uniforms.visibility.value<1);
  }
  const before=storySkyColor('egypt',149.99),after=storySkyColor('egypt',150);assert.ok(['r','g','b'].every(k=>Math.abs(before[k]-after[k])<.001));
  assert.ok(bodies.moon.material.uniforms.sunDirection.value.z>0,'crescent light is behind the visible lunar hemisphere');
 }finally{disposeObjectResources(group,{textures:true});}
});

test('American moon is fully illuminated and new celestial/snow geometry retires exactly once',()=>{
 const group=new T.Group();addNightSky(group,{story:true,country:'america'});addEveningWeather(group,'england',{story:true});const sky=group.userData.nightSky;
 assert.ok(sky.moon.material.uniforms.sunDirection.value.z<-.9);
 const geometry=group.userData.evening.snowSurface.geometry,moon=sky.moon.geometry;let snowReleases=0,moonReleases=0;geometry.addEventListener('dispose',()=>snowReleases++);moon.addEventListener('dispose',()=>moonReleases++);disposeObjectResources(group,{textures:true});assert.equal(snowReleases,1);assert.equal(moonReleases,1);
});
