import {test,expect,devices} from '@playwright/test';
const phone=!!process.env.KTD_VISUAL_PHONE;
if(phone){const {defaultBrowserType,...device}=devices['iPhone 12 Pro Max landscape'];test.use({...device,browserName:'webkit',launchOptions:{}});}
async function boot(page){
 await page.goto('/favicon.svg');await page.evaluate(()=>localStorage.setItem('ktd-northline-v1',JSON.stringify({internationalVersion:3,playMode:'story',storyReplayId:'china',guidanceMilestones:{story:true},settings:{quality:'high',volume:0,speech:false}})));
 await page.goto('/');await page.getByRole('button',{name:'ENTER THE HOSPITAL',exact:false}).click();await page.getByRole('button',{name:'Skip story',exact:true}).click();await page.waitForFunction(()=>window.__ktd?.engine.mission&&!window.__ktd.engine.paused);await page.evaluate(()=>window.__ktd.engine.renderer.setAnimationLoop(null));
}

test('both visiting patients stand, walk to the closed office door and only then open it',async({page},info)=>{
 await boot(page);const report=await page.evaluate(()=>{
  const e=window.__ktd.engine,o=e.objectives.china;e.setFloor(o.officeFloor);e.playerPos.set(0,0,30);o.breakAt=Infinity;
  for(const n of e.npcs)if(n!==o.doctor&&!n.officeVisitor)n.dead=true;
  const step=()=>{e.mission.tick(.05);e.time+=.05;o.update(.05);e.updateNPCs(.05);e.updateEnvironment(.05);},shut=()=>{for(const d of o.doors){d.open=false;d.angle=0;d.pivot.rotation.y=0;d.manualClosed=true;}};
  for(let i=0;i<1200&&!o.patients.entries.every(v=>v.phase==='ready');i++)step();if(!o.patients.entries.every(v=>v.n.seated))throw Error('Waiting patients did not reach their seats');shut();const start=e.mission.elapsed;o.patients.begin(start);
  const openings=[],standing=[],hook=o.patients.beforeOpen.bind(o.patients);let closedAgain=false;
  o.patients.beforeOpen=(n,d)=>{const closed=!d.open,result=hook(n,d),v=o.patients.entries.find(v=>v.n===n);if(closed&&result!==false&&v&&o.doors.includes(d))openings.push({index:v.index,range:Math.hypot(n.pos.x-d.x,n.pos.z-d.z),motion:!!v.motion,seated:!!n.seated,at:e.mission.elapsed-start});return result;};
  for(let i=0;i<700&&!e.mission.result;i++){
   step();const [a,b]=o.patients.entries;
   if(!closedAgain&&a.visited&&a.phase==='ready'){shut();closedAgain=true;}
   for(const v of o.patients.entries)if(v.phase==='standing'&&!standing.some(s=>s.index===v.index))standing.push({index:v.index,open:v.door.open,at:e.mission.elapsed-start});
   if(b.visited&&b.phase==='ready')break;
  }
  return{standing,openings,visits:o.patients.entries.map(v=>({seated:v.n.seated,visited:v.visited,entered:v.enteredAt-start})),result:e.mission.result};
 });
 console.log('Visitor approach report',JSON.stringify(report));expect(report.result).toBeNull();expect(report.standing).toHaveLength(2);expect(report.standing.every(s=>!s.open)).toBe(true);expect(report.openings).toHaveLength(2);
 for(const opening of report.openings){expect(opening.range).toBeLessThanOrEqual(1.35);expect(opening.motion).toBe(false);expect(opening.seated).toBe(false);expect(opening.at).toBeGreaterThan(report.standing.find(s=>s.index===opening.index).at+.85);}
 expect(report.visits.every(v=>v.seated&&v.visited)).toBe(true);expect(report.visits[1].entered-report.visits[0].entered).toBeGreaterThan(4);
 console.log('Physical visitor door approach',JSON.stringify(report));await info.attach('physical-door-approach',{body:JSON.stringify(report),contentType:'application/json'});
});

for(const index of [0,1])test(`${index?'male':'female'} visitor cannot reopen after timely closure; a fresh five seconds expires before standing and approaching`,async({page},info)=>{
 await boot(page);const report=await page.evaluate(index=>{
  const e=window.__ktd.engine,o=e.objectives.china;e.setFloor(o.officeFloor);e.playerPos.set(0,0,30);o.breakAt=Infinity;
  const v=o.patients.entries[index];for(const n of e.npcs)if(n!==o.doctor&&n!==v.n)n.dead=true;
  const walk=seconds=>{const until=e.mission.elapsed+seconds;while(e.mission.elapsed<until&&!e.mission.result){const dt=Math.min(.05,until-e.mission.elapsed);e.mission.tick(dt);e.time+=dt;o.update(dt);e.updateNPCs(dt);e.updateEnvironment(dt);}};
  for(let i=0;i<1200&&!v.n.seated;i++)walk(.05);if(!v.n.seated)throw Error('Visitor did not reach waiting seat');e.mission.elapsed=100;o.collapseDoctor(100);for(const d of o.doors){d.open=true;d.angle=d.openAngle;d.pivot.rotation.y=d.angle;}
  walk(3.5);const d=o.doors[0],side=Math.sign(o.office.center.z-d.z);e.playerPos.set(d.x,0,d.z+side*2.35);o.handleDoor(d);
  for(let i=0;i<40&&o.seal.stage!=='lock';i++)walk(.05);
  if(o.seal.closedAt===null)throw Error('Real door closure did not start lock window');const closedAt=o.seal.closedAt;
  walk(4.999);const protectedState={elapsed:e.mission.elapsed,closedAt,failed:o.seal.failed,discovery:o.patients.discoveryAt,doors:o.doors.map(d=>({open:d.open,angle:d.angle})),result:e.mission.result};
  walk(.001);const expired={elapsed:e.mission.elapsed,failed:o.seal.failed,phase:v.phase,open:v.door.open,manualClosed:v.door.manualClosed,result:e.mission.result};
  const hook=o.patients.beforeOpen.bind(o.patients);let opening;
  o.patients.beforeOpen=(n,door)=>{const closed=!door.open,result=hook(n,door);if(n===v.n&&door===v.door&&closed&&result!==false)opening={at:e.mission.elapsed,range:Math.hypot(n.pos.x-door.x,n.pos.z-door.z),motion:!!v.motion,seated:!!n.seated};return result;};
  walk(18);return{protectedState,expired,opening,found:v.phase==='discovered'&&o.roomOf(v.n.pos)===o.office.id,result:e.mission.result};
 },index);
 console.log('Lock window report',index,JSON.stringify(report));expect(report.protectedState.closedAt).toBeGreaterThan(104);expect(report.protectedState.elapsed-report.protectedState.closedAt).toBeCloseTo(4.999,5);expect(report.protectedState.failed).toBeNull();expect(report.protectedState.discovery).toBeNull();expect(report.protectedState.result).toBeNull();expect(report.protectedState.doors.every(d=>!d.open&&Math.abs(d.angle)<.025)).toBe(true);
 expect(report.expired.failed).toBe('lock');expect(report.expired.phase).toBe('standing');expect(report.expired.open).toBe(false);expect(report.expired.manualClosed).toBe(true);expect(report.expired.result).toBeNull();expect(report.opening.range).toBeLessThanOrEqual(1.35);expect(report.opening.at).toBeGreaterThan(report.expired.elapsed+.85);expect(report.opening.motion).toBe(false);expect(report.opening.seated).toBe(false);expect(report.found).toBe(true);expect(report.result?.success).toBe(false);expect(report.result.reason).toContain('visiting patient discovered the unconscious doctor');
 console.log('Late closure and physical discovery',index,JSON.stringify(report));await info.attach('independent-lock-window',{body:JSON.stringify(report),contentType:'application/json'});
});
