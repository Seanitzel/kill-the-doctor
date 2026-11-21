import * as T from 'three';
// One bounded, deterministic 512px finish per surface; no per-frame texture work.
const SIZE=512;
const hash=(x,y)=>{let n=Math.imul(x,374761393)^Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;};
function noise(x,y){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);return T.MathUtils.lerp(T.MathUtils.lerp(hash(ix,iy),hash(ix+1,iy),u),T.MathUtils.lerp(hash(ix,iy+1),hash(ix+1,iy+1),u),v);}
function fbm(x,y){let sum=0,amp=.55;for(let i=0;i<4;i++){sum+=noise(x,y)*amp;x=x*2.03+7;y=y*2.03-3;amp*=.5;}return sum;}
export function finishTexture(profile,ceiling=false){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=SIZE;const c=canvas.getContext('2d');
 c.fillStyle=ceiling?profile.ceilingColor||'#d2b58c':profile.floor;c.fillRect(0,0,SIZE,SIZE);
 let seed=193;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const marble=!ceiling&&['marble','black-gold-marble'].includes(profile.flooring),gold=profile.flooring==='black-gold-marble';
 if(marble&&c.createImageData){
  const image=c.createImageData(SIZE,SIZE),data=image.data;
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
   const u=x/SIZE,v=y/SIZE,warp=fbm(u*4,v*4),ribbon=Math.sin((u*1.8+v*.8+warp*1.65)*Math.PI*4),fine=Math.abs(Math.sin((u*3-v+warp)*Math.PI*13)),vein=Math.pow(1-Math.abs(ribbon),gold?13:22),cloud=fbm(u*8,v*8),i=(x+y*SIZE)*4;
   const base=gold?[15+cloud*14,18+cloud*12,20+cloud*12]:[232+cloud*20,235+cloud*17,234+cloud*17];
   const pigment=gold?[196+cloud*35,137+cloud*39,51+cloud*32]:[135,149,147];const strength=gold?Math.min(.96,vein*.88+(fine<.027?.25:0)):vein*.38;
   for(let k=0;k<3;k++)data[i+k]=T.MathUtils.lerp(base[k],pigment[k],strength);data[i+3]=255;
  }c.putImageData(image,0,0);
 }
 if(ceiling&&profile.ceiling==='slats'||!ceiling&&profile.flooring==='wood'){
  const rows=ceiling?24:10;c.strokeStyle=ceiling?'#8c7253':profile.grout;
  for(let i=0;i<rows;i++){const y=i*SIZE/rows;c.fillStyle=`rgba(80,49,20,${.035+random()*.06})`;c.fillRect(0,y,SIZE,SIZE/rows-1);c.fillStyle=c.strokeStyle;c.fillRect(0,y,SIZE,ceiling?3:1.3);if(!ceiling)c.fillRect((i%3)*SIZE/3,y,1,SIZE/rows);for(let grain=0;grain<5;grain++){c.fillStyle='rgba(70,43,20,.06)';c.fillRect(random()*100,y+random()*SIZE/rows,200+random()*200,.6);}}
 }else{
  // Keep four divisions per existing 3m floor module: dimensions never change.
  const grout=ceiling?profile.ceilingGrout||'#a7aaa6':profile.grout,width=ceiling?2:profile.groutWidth||1.2;
  if(ceiling)for(let x=0;x<4;x++)for(let y=0;y<4;y++){c.fillStyle=`rgba(255,255,255,${.025+random()*.07})`;c.fillRect(x*128+2,y*128+2,124,124);}
  if(profile.grainy&&!ceiling&&c.createImageData){
   // Continuous mineral grain and irregular aggregate avoid square stamp
   // artifacts. Several scales remain legible at ordinary walking distance.
   const image=c.createImageData(SIZE,SIZE),data=image.data,base=Number.parseInt(profile.floor.slice(1,3),16);
   for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
    const fine=(hash(x,y)-.5)*40,grain=(noise(x*.68,y*.68)-.5)*54,cloud=(noise(x*.14,y*.14)-.5)*22,chip=noise(x*.36+37,y*.36+19),value=base+fine+grain+cloud+(chip>.72?28:chip<.28?-25:0),i=(x+y*SIZE)*4;
    data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;
   }
   c.putImageData(image,0,0);
  }
  c.fillStyle=grout;for(let i=0;i<=4;i++){c.fillRect(i*128-width/2,0,width,SIZE);c.fillRect(0,i*128-width/2,SIZE,width);}
 }
 for(let i=0;i<(profile.worn?3300:500);i++){c.fillStyle=`rgba(66,53,35,${profile.worn?.035:.012})`;c.fillRect(random()*SIZE,random()*SIZE,profile.worn?2.8:1.5,1);}
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;map.userData={finish:ceiling?'ceiling':profile.flooring||'tile',divisions:4,groutWidth:profile.groutWidth||1.2};return map;
}
