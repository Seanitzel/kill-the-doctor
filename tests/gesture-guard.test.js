import test from 'node:test';
import assert from 'node:assert/strict';
import {installGameGestureGuard} from '../src/mobile/gesture-guard.js';

function dispatch(target,type,touches=0){const event=new Event(type,{cancelable:true});Object.defineProperty(event,'touches',{value:Array(touches).fill({})});target.dispatchEvent(event);return event;}
test('Gameplay cancels both rapid touch endings, Safari zoom gestures and double-click defaults',()=>{
  const target=new EventTarget(),remove=installGameGestureGuard(target,()=>true);
  for(const type of ['touchend','touchend','gesturestart','gesturechange','gestureend','dblclick'])assert.equal(dispatch(target,type).defaultPrevented,true,type);
  assert.equal(dispatch(target,'touchmove',2).defaultPrevented,true);
  remove();assert.equal(dispatch(target,'touchend').defaultPrevented,false);
});
test('Gesture guard preserves pointer input, event propagation, and menu scrolling/zoom',()=>{
  const target=new EventTarget();let playing=true,received=0;
  const remove=installGameGestureGuard(target,()=>playing);
  target.addEventListener('touchend',()=>received++);
  dispatch(target,'touchend');assert.equal(received,1);
  for(const type of ['pointerdown','pointermove','pointerup','click'])assert.equal(dispatch(target,type).defaultPrevented,false,type);
  assert.equal(dispatch(target,'touchmove',1).defaultPrevented,false);
  playing=false;
  for(const type of ['touchend','gesturestart','touchmove','dblclick'])assert.equal(dispatch(target,type,2).defaultPrevented,false,type);
  remove();
});
