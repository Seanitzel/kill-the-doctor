import {SeatMotion} from './seat-motion.js';
import {OFFICE_VISITOR_LINES} from './dialogue-v25.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
// Borrow existing visitors, never spawn or teleport a witness into view.
export class OfficeVisitors{
 constructor(office){this.office=office;this.e=office.e;this.entries=[];this.started=null;this.discoveryAt=null;this.reserve();}
 reserve(){if(this.entries.length)return;const o=this.office,e=this.e,nav=e.systems.navigationFor(o.officeFloor),used=new Set(),reserved=new Set();
  for(const [index,door] of o.doors.entries()){
   const inside=Math.sign(o.office.center.z-door.z),goal=nav.nearest({x:door.x+.1,z:door.z+inside*.95}).point;
   const seat=e.hospitals[o.officeFloor].seats.filter(s=>!s.room&&!reserved.has(s)&&!e.npcs.some(n=>n.floor===o.officeFloor&&!n.dead&&distance(n.pos,s)<.65)).sort((a,b)=>distance(a,door)-distance(b,door)).find(s=>{const front={x:s.x+Math.sin(s.rotation)*.95,z:s.z+Math.cos(s.rotation)*.95};return e.canStand(front.x,front.z,.3,o.officeFloor)&&nav.route(front,goal).length;});
   if(seat)reserved.add(seat);
   const waiting=nav.nearest(seat?{x:seat.x+Math.sin(seat.rotation)*.95,z:seat.z+Math.cos(seat.rotation)*.95}:{x:door.x+2.5,z:door.z-inside*2.7}).point;
   let n=e.npcs.filter(n=>n.role==='patient'&&n.floor===o.officeFloor&&!n.dead&&!n.lying&&!n.baby&&!n.blind&&!n.recruit&&!n.rescuePatient&&!n.appointmentDeparture&&!used.has(n)).sort((a,b)=>distance(a.pos,waiting)-distance(b.pos,waiting))[0];if(!n)n=e.spawnNPC({name:index?'Rowan Chen':'Maya Carter',gender:index?'male':'female',skin:index?'#c49776':'#92664d',hair:'#272323',accent:'#748c98'},'patient',o.officeFloor,waiting,null,`office-waiting-${index}`,{fixed:true});used.add(n);
   const saved={speed:n.speed,activity:n.activity,seated:n.seated,baselineY:n.baselineY,fixed:n.fixed},home={x:n.pos.x,z:n.pos.z};e.systems.stand(n,waiting);n.officeVisitor=true;n.speed=2.1;n.activity=null;e.routeNPC(n,waiting);const existingSeat=seat?{...seat,yOffset:-.35}:null;this.entries.push({n,door,index,goal,waiting,seat:existingSeat,home,saved,phase:'staging'});
  }
 }
 begin(now){if(this.started!==null)return;this.started=now;for(const v of this.entries)v.due=now+(v.index?13+this.e.mission.random()*4:3+this.e.mission.random()*3);}
 prepare(n){const v=this.entries.find(v=>v.n===n);if(!v)return false;const e=this.e,o=this.office,now=e.mission.elapsed;if(n.dead||n.evacuating||n.reporting)return false;
  if(['staging','restaging'].includes(v.phase)&&distance(n.pos,v.waiting)<.4){v.phase=v.phase==='staging'?'sitting':'resitting';v.standing={x:n.pos.x,z:n.pos.z};v.motionAt=now;if(v.seat)v.motion=new SeatMotion(v.standing,v.seat);else v.phase=v.phase==='sitting'?'ready':'restaged';n.activity='rest';n.path=[];}
  const discovery=this.discoveryAt!==null&&!o.case.sealed&&now>=this.discoveryAt&&v===this.entries.find(item=>!item.door.locked);
  if((v.phase==='ready'||v.phase==='restaged')&&(discovery||this.started!==null&&now>=v.due&&(v.index===0||this.entries[v.index-1]?.enteredAt!=null&&now>=this.entries[v.index-1].enteredAt+5)&&v.visited!==true&&!o.case.coffeePrepared)&&!v.door.locked){v.nextPhase=discovery?'discovering':'entering';v.phase='standing';v.motionAt=now;if(!v.seat){v.phase=v.nextPhase;n.activity=null;e.routeNPC(n,v.goal);return true;}v.motion=new SeatMotion(v.standing||v.waiting,v.seat);v.motion.amount=1;v.motion.stand();n.seated=false;n.activity='rest';}
  if(['entering','discovering'].includes(v.phase)&&distance(n.pos,v.goal)<.45){n.activity='rest';n.path=[];if(v.phase==='discovering'){e.audio.gasp?.({x:n.pos.x,y:1.5,z:n.pos.z,floor:o.officeFloor});o.discoveryVisible=true;v.phase='discovered';}else{v.phase='waiting';v.visited=true;v.until=now+8;v.enteredAt=now;n.visual.root.rotation.y=Math.atan2(e.playerPos.x-n.pos.x,e.playerPos.z-n.pos.z);e.life?.speak(n,OFFICE_VISITOR_LINES[Math.floor(e.mission.random()*OFFICE_VISITOR_LINES.length)],true);}}
  if(v.phase==='waiting'&&now>=v.until){v.phase='restaging';n.activity=null;e.routeNPC(n,v.waiting);}
  if(['staging','restaging','entering','discovering'].includes(v.phase)){n.activity=null;if(n.cursor>=n.path.length&&now>=(v.retry||0)){e.routeNPC(n,['entering','discovering'].includes(v.phase)?v.goal:v.waiting);v.retry=now+1;}}
  if(v.motion){const motion=v.motion,p=motion.update(Math.max(0,Math.min(.1,now-(v.motionAt??now))));v.motionAt=now;n.pos.set(p.x,p.y,p.z);n.baselineY=p.y;n.visual.root.rotation.y=v.seat.rotation;n.seatPose=p;if(motion.done){v.motion=null;if(motion.target){v.phase=v.phase==='sitting'?'ready':'restaged';n.seated=true;}else{v.phase=v.nextPhase;n.seated=false;n.seatPose=null;n.activity=null;e.routeNPC(n,v.goal);}}}
  return true;
 }
 collapse(now){this.discoveryAt=null;}
 discover(){const v=this.entries.find(v=>!v.door.locked)||this.entries[0];if(v){v.door.open=true;v.n.activity=null;this.e.routeNPC(v.n,v.goal);v.phase='discovering';}this.office.discoveryVisible=true;}
 // Crossing the threshold is the visual cue; a brief response window permits USE
 // or movement to stop mixing before suspicion becomes irreversible.
 witnesses(){const now=this.e.mission.elapsed;return this.entries.filter(v=>['entering','waiting'].includes(v.phase)&&this.office.roomOf(v.n.pos)===this.office.office.id&&now-(v.enteredAt??now)>.4).map(v=>v.n);}
 pose(){for(const v of this.entries)if(v.n.floor===this.e.floor&&(v.n.seated||v.n.seatPose))v.n.visual.poseSeated?.(v.n.seatPose?.weight??1,v.n.seatPose?.lean??0);}
 dispose(){for(const v of this.entries){v.n.officeVisitor=false;v.n.waitingChair=null;v.n.speed=v.saved.speed;}this.entries=[];this.office=this.e=null;}
}
