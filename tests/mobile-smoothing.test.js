import test from 'node:test';
import assert from 'node:assert/strict';
import {ACESFilmicToneMapping,SRGBColorSpace,HalfFloatType,UnsignedByteType,Vector4} from 'three';
import {MobileSmoothing} from '../src/game/mobile-smoothing.js';

function fakeRenderer(float=true){
 const original={name:'previous'},viewport=new Vector4(2,3,100,80),scissor=new Vector4(4,5,60,40);
 return{extensions:{has:()=>float},width:1200,height:600,target:original,viewport,scissor,scissorTest:true,draws:[],toneMapping:ACESFilmicToneMapping,toneMappingExposure:1.16,outputColorSpace:SRGBColorSpace,
 getDrawingBufferSize(v){return v.set(this.width,this.height);},getRenderTarget(){return this.target;},setRenderTarget(v){this.target=v;},getViewport(v){return v.copy(this.viewport);},setViewport(v){this.viewport.copy(v);},getScissor(v){return v.copy(this.scissor);},setScissor(v){this.scissor.copy(v);},getScissorTest(){return this.scissorTest;},setScissorTest(v){this.scissorTest=v;},render(scene){this.draws.push({scene,target:this.target});if(this.failAt===this.draws.length)throw Error('draw failed');}};
}
test('mobile smoothing reuses bounded targets and runs scene, output and FXAA in order',()=>{
 const r=fakeRenderer(),s=new MobileSmoothing(r),scene={},target=r.target,v=r.viewport.clone(),c=r.scissor.clone();
 s.render(r,scene,{});assert.equal(r.draws.length,3);assert.equal(r.draws[0].scene,scene);assert.equal(r.draws[0].target,s.sceneTarget);assert.equal(r.draws[1].target,s.colorTarget);assert.equal(r.draws[2].target,null);assert.equal(s.output.uniforms.tDiffuse.value,s.sceneTarget.texture);assert.equal(s.fxaa.uniforms.tDiffuse.value,s.colorTarget.texture);assert.equal(s.output.uniforms.toneMappingExposure.value,1.16);assert.ok('ACES_FILMIC_TONE_MAPPING' in s.output.material.defines);assert.ok('SRGB_TRANSFER' in s.output.material.defines);assert.equal(s.fxaa.material.toneMapped,false);
 assert.equal(r.target,target);assert.deepEqual(r.viewport,v);assert.deepEqual(r.scissor,c);assert.equal(r.scissorTest,true);assert.equal(s.sceneTarget.texture.type,HalfFloatType);assert.equal(s.sceneTarget.samples,0);assert.equal(s.colorTarget.samples,0);assert.equal(s.colorTarget.depthBuffer,false);
 let resized=0;s.sceneTarget.addEventListener('dispose',()=>resized++);const texture=s.sceneTarget.texture;s.render(r,scene,{});assert.equal(resized,0);assert.equal(s.sceneTarget.texture,texture);r.width=900;r.height=450;s.render(r,scene,{});assert.equal(resized,1);assert.equal(s.sceneTarget.width,900);assert.equal(s.colorTarget.height,450);assert.deepEqual(s.fxaa.uniforms.resolution.value.toArray(),[1/900,1/450]);s.dispose();
});
test('smoothing restores renderer state when a pass fails and releases resources once',()=>{
 const r=fakeRenderer(false),s=new MobileSmoothing(r),target=r.target;r.failAt=2;assert.equal(s.sceneTarget.texture.type,UnsignedByteType);assert.throws(()=>s.render(r,{},{}),/draw failed/);assert.equal(r.target,target);assert.deepEqual(r.viewport.toArray(),[2,3,100,80]);assert.deepEqual(r.scissor.toArray(),[4,5,60,40]);assert.equal(r.scissorTest,true);
 const count={scene:0,color:0,output:0,fxaa:0};for(const[key,obj]of[['scene',s.sceneTarget],['color',s.colorTarget],['output',s.output.material],['fxaa',s.fxaa.material]])obj.addEventListener('dispose',()=>count[key]++);s.dispose();s.dispose();const draws=r.draws.length;s.render(r,{},{});assert.equal(r.draws.length,draws);assert.deepEqual(count,{scene:1,color:1,output:1,fxaa:1});
});
