import test from 'node:test';
import assert from 'node:assert/strict';
import {stickVector,createTouchInput} from '../src/mobile/input.js';
test('Thumbstick has a dead zone, proportional movement and a bounded diagonal',()=>{assert.equal(stickVector(2,2).forward,0);const half=stickVector(0,-24);assert.ok(half.forward>0&&half.forward<1);const full=stickVector(80,-80);assert.ok(Math.abs(Math.hypot(full.forward,full.strafe)-1)<1e-8);assert.ok(Math.hypot(full.x,full.y)<=48.0001);assert.ok(stickVector(-20,0).strafe<0);assert.ok(stickVector(0,20).forward<0);});
test('Resetting native touch input releases movement, stance, and queued shots',()=>{assert.deepEqual(createTouchInput(),{forward:0,strafe:0,sprint:false,crouch:false,shot:false});});
