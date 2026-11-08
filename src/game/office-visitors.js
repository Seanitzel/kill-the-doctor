import {OFFICE_VISITOR_LINES} from './dialogue-v25.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
// Borrow existing visitors, never spawn or teleport a witness into view.
export class OfficeVisitors{
 constructor(office){this.office=office;this.e=office.e;this.entries=[];this.started=null;this.discoveryAt=null;this.reserve();}
 reserve(){const o=this.office,e=this.e,nav=e.systems.navigationFor(0),used=new Set();
  for(const [index,door] of o.doors.entries()){
   const inside=Math.sign(o.office.center.z-door.z),goal=nav.nearest({x:door.x+.1,z:door.z+inside*.95}).point,waiting=nav.nearest({x:door.x+.1,z:door.z-inside*2.7}).point;
   const n=e.npcs.filter(n=>n.role==='patient'&&n.floor===0&&!n.dead&&!n.lying&&!n.baby&&!n.blind&&!n.recruit&&!n.rescuePatient&&!n.appointmentDeparture&&!used.has(n)).sort((a,b)=>distance(a.pos,waiting)-distance(b.pos,waiting))[0];if(!n)continue;used.add(n);
   const saved={speed:n.speed,activity:n.activity,seated:n.seated,baselineY:n.baselineY,fixed:n.fixed},home={x:n.pos.x,z:n.pos.z};e.systems.stand(n,waiting);n.officeVisitor=true;n.speed=2.1;n.activity=null;e.routeNPC(n,waiting);this.entries.push({n,door,index,goal,waiting,home,saved,phase:'staging'});
  }
 }
 begin(now){if(this.started!==null)return;this.started=now;for(const v of this.entries)v.due=now+(v.index?13+this.e.mission.random()*4:3+this.e.mission.random()*3);}
 prepare(n){const v=this.entries.find(v=>v.n===n);if(!v)return false;const e=this.e,o=this.office,now=e.mission.elapsed;if(n.dead||n.evacuating||n.reporting)return false;
  if(v.phase==='staging'&&distance(n.pos,v.waiting)<.4){v.phase='ready';n.activity='rest';n.path=[];}
  const discovery=this.discoveryAt!==null&&!o.case.sealed&&now>=this.discoveryAt&&v===this.entries.find(item=>!item.door.locked);
  if((v.phase==='ready'||v.phase==='restaged')&&(discovery||this.started!==null&&now>=v.due&&v.visited!==true&&!o.case.coffeePrepared)&&!v.door.locked){v.phase=discovery?'discovering':'entering';n.activity=null;e.routeNPC(n,v.goal);}
  if(['entering','discovering'].includes(v.phase)&&distance(n.pos,v.goal)<.45){n.activity='rest';n.path=[];if(v.phase==='discovering'){e.audio.gasp?.({x:n.pos.x,y:1.5,z:n.pos.z,floor:0});o.discoveryVisible=true;v.phase='discovered';}else{v.phase='waiting';v.visited=true;v.until=now+2;v.enteredAt=now;n.visual.root.rotation.y=Math.atan2(e.playerPos.x-n.pos.x,e.playerPos.z-n.pos.z);e.life?.speak(n,OFFICE_VISITOR_LINES[Math.floor(e.mission.random()*OFFICE_VISITOR_LINES.length)],true);}}
  if(v.phase==='waiting'&&now>=v.until){v.phase='restaging';n.activity=null;e.routeNPC(n,v.waiting);}
  if(v.phase==='restaging'&&distance(n.pos,v.waiting)<.4){v.phase='restaged';n.activity='rest';n.path=[];}
  if(['staging','restaging','entering','discovering'].includes(v.phase)){n.activity=null;if(n.cursor>=n.path.length&&now>=(v.retry||0)){e.routeNPC(n,['entering','discovering'].includes(v.phase)?v.goal:v.waiting);v.retry=now+1;}}
  return true;
 }
 collapse(now){this.discoveryAt=now+7;}
 // Crossing the threshold is the visual cue; a brief response window permits USE
 // or movement to stop mixing before suspicion becomes irreversible.
 witnesses(){const now=this.e.mission.elapsed;return this.entries.filter(v=>['entering','waiting'].includes(v.phase)&&this.office.roomOf(v.n.pos)===this.office.office.id&&now-(v.enteredAt??now)>.4).map(v=>v.n);}
 dispose(){for(const v of this.entries){v.n.officeVisitor=false;v.n.speed=v.saved.speed;}this.entries=[];this.office=this.e=null;}
}
