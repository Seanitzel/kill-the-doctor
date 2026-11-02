import {Vector4} from 'three';
// A room-volume light attenuation, evaluated at the actual fragment position.
// Shared hospital materials stay bright outside the room, even in one draw call.
export class OfficeDarkness{
 constructor(room){this.bounds={value:new Vector4((room.x-11)*3-1.48,(room.x+room.w-12)*3+1.48,(room.z-11)*3-1.48,(room.z+room.h-12)*3+1.48)};this.enabled={value:0};this.entries=new Map();}
 install(root){root.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){if(!m||this.entries.has(m)||m.isShaderMaterial)continue;const compile=m.onBeforeCompile,key=m.customProgramCacheKey;this.entries.set(m,{compile,key});const self=this;m.onBeforeCompile=function(shader,renderer){compile.call(this,shader,renderer);shader.uniforms.ktdOfficeBounds=self.bounds;shader.uniforms.ktdOfficeOff=self.enabled;shader.vertexShader='varying vec3 ktdRoomPoint;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
 vec4 ktdWorld=vec4(transformed,1.0);
 #ifdef USE_INSTANCING
 ktdWorld=instanceMatrix*ktdWorld;
 #endif
 ktdRoomPoint=(modelMatrix*ktdWorld).xyz;`);shader.fragmentShader='varying vec3 ktdRoomPoint;uniform vec4 ktdOfficeBounds;uniform float ktdOfficeOff;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`#include <opaque_fragment>
 float ktdInside=step(ktdOfficeBounds.x,ktdRoomPoint.x)*step(ktdRoomPoint.x,ktdOfficeBounds.y)*step(ktdOfficeBounds.z,ktdRoomPoint.z)*step(ktdRoomPoint.z,ktdOfficeBounds.w)*step(ktdRoomPoint.y,3.7);
 gl_FragColor.rgb*=mix(1.0,.12,ktdInside*ktdOfficeOff);`);};m.customProgramCacheKey=()=>key.call(m)+'-ktd-office-volume-v1';m.needsUpdate=true;}});}
 set(off,floor=0){this.enabled.value=off&&floor===0?1:0;}
 dispose(){for(const [m,original]of this.entries){m.onBeforeCompile=original.compile;m.customProgramCacheKey=original.key;m.needsUpdate=true;}this.entries.clear();this.enabled.value=0;}
}
