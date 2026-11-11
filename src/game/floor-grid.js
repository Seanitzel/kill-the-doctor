// Screen-derivative filtering keeps distant grout from turning into unstable
// one-pixel dashes. World coordinates keep the grid continuous across instances.
export function filteredFloorGrid(material){
 material.customProgramCacheKey=()=> 'ktd-filtered-floor-grid-v1';
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec2 vFloorGrid;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
   vec4 gridPosition=vec4(transformed,1.0);
   #ifdef USE_INSTANCING
    gridPosition=instanceMatrix*gridPosition;
   #endif
   vFloorGrid=(modelMatrix*gridPosition).xz/0.75;`);
  shader.fragmentShader='varying vec2 vFloorGrid;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   vec2 gridPixel=max(fwidth(vFloorGrid),vec2(0.00001));
   vec2 gridDistance=abs(fract(vFloorGrid-0.5)-0.5)/gridPixel;
   float grout=1.0-smoothstep(0.55,1.25,min(gridDistance.x,gridDistance.y));
   float gridFade=1.0-smoothstep(0.3,0.75,max(gridPixel.x,gridPixel.y));
   diffuseColor.rgb*=1.0-0.22*grout*gridFade;`);
 };
 material.userData.filteredFloorGrid=true;return material;
}
