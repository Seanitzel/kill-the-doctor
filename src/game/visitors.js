import {attachMobilityCane} from './accessibility-props.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export class HospitalVisitors{
  constructor(e){this.e=e;this.handles=[];this.people=[];for(const [i,floor] of [0,1].entries()){
    const person={name:i?'Sam Bennett':'Nadia Ellis',gender:i?'male':'female',skin:i?'#5c3c2d':'#b98664',hair:i?'#36302a':'#3a2621',accent:i?'#5f7387':'#8a6d80'},n=e.spawnNPC(person,'patient',floor,{x:0,z:21},null,`cane-visitor-${i}`,{fixed:true});
    n.blind=true;n.contamination=0;n.speed=.8;n.activity=null;n.caneRoute=0;n.caneNext=0;n.caneHandle=attachMobilityCane(n.visual,{side:1,length:1.05});this.handles.push(n.caneHandle);this.people.push(n);
  }}
  prepareNPC(n){if(!n.blind||n.evacuating||n.reporting)return false;const e=this.e;if(e.mission.elapsed>=(n.caneNext||0)&&n.cursor>=n.path.length){const points=[{x:0,z:21},{x:0,z:14},{x:0,z:7}];n.caneRoute=(n.caneRoute+1)%points.length;e.systems.route(n,points[n.caneRoute]);n.caneNext=e.mission.elapsed+9;n.activity=null;}return true;}
  animate(n,time,speed){n.caneHandle?.update?.(time,speed);}
  dispose(){for(const h of this.handles)h.dispose();this.handles=[];this.people=[];this.e=null;}
}
