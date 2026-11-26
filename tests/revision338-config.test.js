import test from 'node:test';
import assert from 'node:assert/strict';
import {COUNTRIES,DEFAULT_HOSPITAL,setPlayMode,migrateInternational,countryFor} from '../src/game/international.js';
import {STORY_MISSIONS} from '../src/game/story-missions.js';
import {Mission,defaultSave,purchase,upgradeLevel} from '../src/game/mission.js';
import {securityCount} from '../src/game/security-rules.js';
import {interiorFor} from '../src/game/hospital-interiors.js';
import {HospitalIncidents} from '../src/game/incidents.js';
import {hospitalSim,disposeSim} from './helpers/hospital-sim.js';
import {applyInjury,injurySpeed} from '../src/game/injury.js';

test('the ten Story destinations have the exact authored assignment and difficulty progression',()=>{
 assert.deepEqual(COUNTRIES.map(c=>c.id),['france','nigeria','china','india','russia','venezuela','america','romania','uganda','england']);
 const types=['standard','standard','infiltration','rescue','infiltration','rescue','standard','infiltration','rescue','standard'];
 for(const [i,c] of COUNTRIES.entries()){const s=defaultSave();s.storyReplayId=c.id;const m=new Mission(s,13);assert.equal(m.selectionType,types[i]);assert.equal(m.story,STORY_MISSIONS[c.id]);if(m.china){assert.equal(m.china.instruments.length,{china:4,russia:6,romania:8}[c.id]);assert.equal(m.china.coverSeconds,{china:900,russia:600,romania:420}[c.id]);}}
 for(const [level,count]of[[1,1],[2,2],[7,3],[10,4]])assert.equal(securityCount(level),count);
 assert.deepEqual([STORY_MISSIONS.india.doctors,STORY_MISSIONS.venezuela.doctors,STORY_MISSIONS.uganda.doctors],[2,4,5]);
});

test('Story targets, room assignments, appearance and information boards stay fixed across new seeds and retries',()=>{
 for(const c of COUNTRIES){const s=defaultSave();s.storyReplayId=c.id;const first=new Mission(s,1,0);for(const attempt of[1,2,8]){s.countryAttempts[c.index]=attempt;const next=new Mission(s,98723+attempt,attempt);assert.deepEqual(next.target,first.target,c.id);assert.equal(next.seed,first.seed);assert.equal(next.informationBoardFloor,first.informationBoardFloor);}}
});

test('Romania and Uganda migrations preserve country completion, retries and pending flights',()=>{
 const m=migrateInternational({internationalVersion:3,completedCountryIds:['france','romania','uganda'],countryId:'romania',storyReplayId:'uganda',pendingTravel:{from:'romania',to:'uganda'},countryAttempts:[1,2,3,4,5,6,7,8,9,10]});
 assert.deepEqual(m.completedCountryIds,['france','romania','uganda']);assert.equal(m.countryId,'romania');assert.equal(m.storyReplayId,'uganda');assert.deepEqual(m.pendingTravel,{from:'romania',to:'uganda'});assert.deepEqual(m.countryAttempts,[1,2,3,4,5,6,7,8,9,10]);
});

test('Freeplay always offers the original default hospital; completed destinations opt into their own interiors',()=>{
 const s=defaultSave();assert.equal(setPlayMode(s,'freestyle','default'),true);assert.equal(countryFor(s),DEFAULT_HOSPITAL);const basic=new Mission(s,1);assert.equal(interiorFor(basic),null);assert.equal(setPlayMode(s,'freestyle','france'),false);
 s.completedCountryIds=['france'];assert.equal(setPlayMode(s,'freestyle','france'),true);const french=new Mission(s,1);assert.equal(french.country.id,'france');assert.equal(interiorFor(french).style,'French timber and daylight');assert.notEqual(new Mission(s,999).seed,french.seed);assert.equal(setPlayMode(s,'freestyle','default'),true);assert.equal(countryFor(s).default,true);
});

test('the distressed visitor arrives at exactly 30 seconds in Story chapters 2, 4, 7 and 10 only',()=>{
 for(const [i,c]of COUNTRIES.entries()){const s=defaultSave();s.storyReplayId=c.id;const m=new Mission(s),incidents=new HospitalIncidents({mission:m});incidents.setup();assert.equal(incidents.arrivalAt,[2,4,7,10].includes(i+1)?30:undefined,c.id);}
});

test('infiltration schedule notifications and timing stay hidden until the information board is checked',()=>{
 const e=hospitalSim();try{const o=e.objectives.china;assert.equal(o.hud().doctorTiming,null);assert.equal(o.hud().breakState,'Check the hospital information board');o.case.officeDiscovered=true;assert.notEqual(o.hud().doctorTiming,null);}finally{disposeSim(e);}
});

test('torso shots are lethal from either side; foot, hip and leg wounds impair movement while arm wounds do not',()=>{
 for(const part of['head','chest','back'])assert.equal(applyInjury(null,{part}).dead,true,part);
 for(const part of['leg','hips','foot']){const wound=applyInjury(null,{part});assert.equal(wound.dead,false);assert.ok(injurySpeed(wound)<1,part);}
 assert.equal(injurySpeed(applyInjury(null,{part:'arm'})),1);
});


test('legacy N95 ownership is displayed as one purchase and cannot be charged again',()=>{
 const s=defaultSave();s.coins=5000;s.upgrades.mask=1;
 assert.equal(upgradeLevel(s,'n95'),1);assert.equal(purchase(s,'n95'),false);assert.equal(s.coins,5000);
 assert.equal(purchase(s,'regularMask'),true);assert.equal(upgradeLevel(s,'regularMask'),1);assert.equal(upgradeLevel(s,'shoes'),0);
});

test('old Egypt and Somalia save IDs migrate to Romania and Uganda without losing completion or travel',()=>{
 const m=migrateInternational({internationalVersion:3,completedCountryIds:['france','egypt','somalia'],countryId:'egypt',storyReplayId:'somalia',pendingTravel:{from:'egypt',to:'somalia'}});
 assert.deepEqual(m.completedCountryIds,['france','romania','uganda']);assert.equal(m.countryId,'romania');assert.equal(m.storyReplayId,'uganda');assert.deepEqual(m.pendingTravel,{from:'romania',to:'uganda'});
});

test('all common failure delivery paths play one failure cue, including a pending physical collapse',async()=>{
 const {GameEngine}=await import('../src/game/engine.js');for(const collapse of [false,true]){let cues=0,results=0;const result={success:false,reason:'Failure'},e={mission:{result},pause(){},audio:{failureCue(){cues++;}},hooks:{result(){results++;}},playerCollapse:collapse?{bodyFall:{settled:false}}:null};GameEngine.prototype.finish.call(e);GameEngine.prototype.finish.call(e);assert.equal(cues,1);assert.equal(results,collapse?0:1);if(collapse){e.playerCollapse.bodyFall.settled=true;GameEngine.prototype.finish.call(e);assert.equal(cues,1);assert.equal(results,1);}}
});
