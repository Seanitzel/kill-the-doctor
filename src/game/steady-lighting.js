import * as T from 'three';
// Fixed world-space fixture field. The existing bounded 3/6 PBR light slots
// evaluate nearby fixtures at each surface instead of switching lights around
// the player. Retain light colours, power/falloff settings and exposure.
// Normalize the repeated fixture contributions to the previous local-pool
// image energy: distributing the pool must not multiply scene brightness.
export class SteadyLighting {
 constructor(e){this.e=e;this.entries=new Map();this.maps=[];this.on={value:0};this.spotBudget={value:.15};this.fixtureBudget={value:e.mobile?.5:.4};this.map={value:null};this.ranks=e.localLights?.length||6;this.size=128;this.min=-64;
  for(const h of e.hospitals){const data=new Float32Array(this.size*this.size*this.ranks*4),fixtures=h.fixtures;for(let z=0;z<this.size;z++)for(let x=0;x<this.size;x++){const wx=this.min+x+.5,wz=this.min+z+.5,near=fixtures.map(p=>({p,d:(p.x-wx)**2+(p.z-wz)**2})).sort((a,b)=>a.d-b.d);for(let r=0;r<this.ranks;r++){const p=near[r]?.p||near[0]?.p||new T.Vector3(0,3,0),i=((z*this.ranks+r)*this.size+x)*4;data[i]=p.x;data[i+1]=p.y;data[i+2]=p.z;data[i+3]=1;}}const map=new T.DataTexture(data,this.size,this.size*this.ranks,T.RGBAFormat,T.FloatType);map.needsUpdate=true;this.maps.push(map);}
 }
 install(root){root?.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){if(!m||this.entries.has(m)||!m.isMeshStandardMaterial)continue;const compile=m.onBeforeCompile,key=m.customProgramCacheKey;const retire=()=>this.entries.delete(m);this.entries.set(m,{compile,key,retire});m.addEventListener('dispose',retire);const self=this;m.onBeforeCompile=function(shader,renderer){compile.call(this,shader,renderer);shader.uniforms.ktdSteady=self.on;shader.uniforms.ktdFixtureBudget=self.fixtureBudget;shader.uniforms.ktdSpotBudget=self.spotBudget;shader.uniforms.ktdFixtureMap=self.map;
   shader.vertexShader='varying vec3 ktdFixtureWorld;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
   vec4 ktdFixtureVertex=vec4(transformed,1.0);
   #ifdef USE_INSTANCING
   ktdFixtureVertex=instanceMatrix*ktdFixtureVertex;
   #endif
   ktdFixtureWorld=(modelMatrix*ktdFixtureVertex).xyz;`);
   shader.fragmentShader=`varying vec3 ktdFixtureWorld;uniform float ktdSteady;uniform float ktdFixtureBudget;uniform float ktdSpotBudget;uniform sampler2D ktdFixtureMap;
   vec3 ktdFixedFixture(float rank){vec2 cell=clamp(floor(ktdFixtureWorld.xz+64.0),vec2(0.0),vec2(127.0));vec2 uv=vec2((cell.x+.5)/128.0,(cell.y*${self.ranks.toFixed(1)}+rank+.5)/${(128*self.ranks).toFixed(1)});return texture2D(ktdFixtureMap,uv).xyz;}
   `+shader.fragmentShader;
   let lights=T.ShaderChunk.lights_fragment_begin.replace('SpotLight spotLight;','SpotLight spotLight; float ktdShadowMatch;');
   lights=lights.replace('pointLight = pointLights[ i ];',`pointLight = pointLights[ i ];
   if(ktdSteady>.5 && UNROLLED_LOOP_INDEX < ${self.ranks}){pointLight.position=(viewMatrix*vec4(ktdFixedFixture(float(UNROLLED_LOOP_INDEX)),1.0)).xyz;pointLight.color*=ktdFixtureBudget;}`);
   // The shadow-casting ceiling spotlight is first; the handheld torch is left
   // untouched. Its shadow map remains useful in the player's nearby region.
   lights=lights.replace('spotLight = spotLights[ i ];',`spotLight = spotLights[ i ];
   ktdShadowMatch=1.0;
   if(ktdSteady>.5 && UNROLLED_LOOP_INDEX==0){vec3 fixedPosition=(viewMatrix*vec4(ktdFixedFixture(0.0),1.0)).xyz;ktdShadowMatch=1.0-step(.1,distance(fixedPosition,spotLight.position));spotLight.color*=ktdSpotBudget;spotLight.position=fixedPosition;spotLight.direction=normalize((viewMatrix*vec4(0.0,1.0,0.0,0.0)).xyz);}`);
   lights=lights.replace('( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ]','( directLight.visible && receiveShadow && ktdShadowMatch>.5 ) ? getShadow( spotShadowMap[ i ]');
   shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>',lights);
  };m.customProgramCacheKey=()=>key.call(m)+'-fixed-fixture-field-v1';m.needsUpdate=true;}});}
 update(enabled,floor){this.on.value=enabled?1:0;this.map.value=this.maps[floor]||this.maps[0];}
 dispose(){for(const [m,p]of this.entries){m.removeEventListener('dispose',p.retire);m.onBeforeCompile=p.compile;m.customProgramCacheKey=p.key;m.needsUpdate=true;}this.entries.clear();for(const t of this.maps)t.dispose();this.maps=[];this.on.value=0;this.e=null;}
}
