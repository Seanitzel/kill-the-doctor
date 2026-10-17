import test from 'node:test';
import assert from 'node:assert/strict';
import { Mission, defaultSave, purchase, readSave, writeSave, SAVE_KEY } from '../src/game/mission.js';
import { makeLayout, findPath, key } from '../src/game/layout.js';
const memory = () => { const map = new Map(); return { getItem: k => map.get(k) ?? null, setItem: (k,v) => map.set(k,v) }; };
test('Every department, entrance, clue, and elevator is connected on all three floors', () => {
  for (const floor of [0,1,2]) {
    const layout = makeLayout(floor);
    for (const room of layout.rooms) {
      const path = findPath(layout, {x:11,z:21}, {x:room.x+1,z:room.z+2});
      assert.ok(path.length > 0, `${room.name} is reachable`);
      const blocked = findPath(layout, {x:11,z:21}, {x:room.x+1,z:room.z+2}, false);
      if(room.kind!=='bathroom')assert.ok(blocked.length > 0, `${room.name} has an open secondary route`);else assert.equal(layout.doors.filter(d=>d.room===room.id).length,1);
    }
    assert.ok(findPath(layout,{x:11,z:21},{x:11,z:3}).length);
  }
});
test('Clues reveal evidence progressively and cannot be collected twice', () => {
  const m = new Mission(defaultSave(), 101);
  assert.equal(m.clues.length,0); assert.equal(m.clue('directory').title,'Department confirmed');
  assert.equal(m.clue('directory'),null); assert.equal(m.clues.length,1);
  assert.ok(m.clue('schedule').text.includes(m.target.room.number));
  assert.ok(m.clue('log').text.includes(m.target.name)); assert.equal(m.clues.length,3);
});
test('Staff cannot be eliminated before the assigned doctor', () => {
  const m = new Mission(defaultSave(), 101); assert.equal(m.eliminate({id:'other',role:'doctor'}),false);
  assert.equal(m.staffKills,0); assert.equal(m.targetDown,false); assert.equal(m.state,'investigate');
});
test('A patient hit ends the mission immediately with no reward', () => {
  const save=defaultSave();const m=new Mission(save,102);m.eliminate({id:'patient',role:'patient'});
  assert.equal(m.result.success,false);assert.match(m.result.reason,/patient/);assert.equal(m.result.coins,0);assert.equal(save.coins,0);
  assert.equal(m.clue('directory'),null);
});
test('Target objective activates emergency and successful escape grants exactly one reward', () => {
  const save=defaultSave(),m=new Mission(save,103);m.clue('directory');m.identify();m.eliminate({id:'target',role:'doctor'});
  assert.equal(m.state,'escape');assert.equal(m.timer,110);m.tick(5);const result=m.escape();
  assert.equal(result.success,true);assert.equal(result.targetDown,true);assert.equal(result.escaped,true);assert.equal(result.coins,295);
  assert.equal(save.coins,295);assert.equal(save.completed,1);m.escape();m.finish(true,'again');assert.equal(save.coins,295);
});
test('Timer expiry fails; exiting before the objective earns nothing', () => {
  const m=new Mission(defaultSave(),104);assert.equal(m.escape(),undefined);assert.equal(m.result,null);
  m.eliminate({id:'target',role:'nurse'});m.tick(111);assert.equal(m.result.success,false);assert.match(m.result.reason,/Police/);assert.equal(m.result.coins,0);
});
test('Upgrades enforce coin cost and level caps, and progress survives reload', () => {
  const save=defaultSave();assert.equal(purchase(save,'shoes'),false);save.coins=1000;
  assert.equal(purchase(save,'shoes'),true);assert.equal(save.coins,880);assert.equal(purchase(save,'shoes'),true);assert.equal(save.coins,640);
  assert.equal(purchase(save,'shoes'),true);assert.equal(save.coins,280);assert.equal(purchase(save,'shoes'),false);
  assert.equal(purchase(save,'suppressor'),true);assert.equal(save.coins,100);assert.equal(purchase(save,'suppressor'),false);
  const storage=memory();assert.equal(writeSave(storage,save),true);assert.deepEqual(readSave(storage),save);
  const m=new Mission(save,99);m.eliminate({id:'target',role:'doctor'});assert.equal(m.timer,125);
});
test('Malformed saves are repaired and unavailable storage does not break gameplay', () => {
  const s=memory();s.setItem(SAVE_KEY,'bad json');assert.deepEqual(readSave(s),defaultSave());
  s.setItem(SAVE_KEY,JSON.stringify({coins:-55,upgrades:{shoes:999},settings:{quality:'nonsense'}}));
  const repaired=readSave(s);assert.equal(repaired.coins,0);assert.equal(repaired.upgrades.shoes,3);assert.equal(repaired.settings.quality,'high');
  assert.equal(writeSave({setItem(){throw Error('blocked')}},defaultSave()),false);
});
test('Assignments are varied, deterministic, and always placed in playable rooms', () => {
  const assignments=new Set();
  for(let i=0;i<30;i++){const save=defaultSave();save.attempts=i;const m=new Mission(save,i+123);const again=new Mission(save,i+123);assert.equal(m.target.name,again.target.name);assert.equal(m.target.room.id,again.target.room.id);const l=makeLayout(m.target.floor);assert.ok(l.cells.has(key(m.target.room.x+1,m.target.room.z+1)));assignments.add(`${m.target.name}-${m.target.room.id}`);}
  assert.ok(assignments.size>10);
});
