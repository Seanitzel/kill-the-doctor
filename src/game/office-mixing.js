import * as T from 'three';
import {mesh,material} from './assets.js';
import {disposeObjectResources} from './resources.js';
// Turn slightly toward the working right hand instead of reaching across it.
export const mixingYaw=(from,cup)=>Math.atan2(cup.x-from.x,cup.z-from.z)+.25;
const STIR_SPEED=6,STIR_RADIUS=.025,GRIP_HEIGHT=.15;
// The cup owns the spoon trajectory. The arm must reach it; never drag the spoon
// outside the cup to compensate for an anatomically unreachable player pose.
export class OfficeMixing{
 constructor(e,cup){this.e=e;this.cup=cup;this.root=new T.Group();this.root.name='Coffee mixing spoon';e.scene.add(this.root);const metal=material('#a9b7bb',{metalness:.8,roughness:.25});mesh('cylinder',metal,[.006,.16,.006],[0,-.05,0],this.root);const bowl=mesh('sphere',metal,[.018,.006,.026],[0,-.135,0],this.root);bowl.name='Coffee spoon bowl';this.root.visible=false;this.target=new T.Vector3();this.cupRotation=new T.Quaternion();this.reach={reachable:false,error:Infinity};this.lastReachable=false;}
 trajectory(phase,out=this.target){out.set(Math.cos(phase)*STIR_RADIUS,GRIP_HEIGHT,Math.sin(phase)*STIR_RADIUS);return this.cup.localToWorld(out);}
 validateReach(player=this.e.player){let error=0;for(let i=0;i<8;i++){const measured=player.mixingReach?.(this.trajectory(i*Math.PI/4));error=Math.max(error,measured?.error??Infinity);}this.reach.error=error;this.reach.reachable=error<=.02;return this.reach;}
 update(active){this.root.visible=false;this.lastReachable=false;if(!active)return false;const e=this.e;this.trajectory(e.time*STIR_SPEED);const pose=e.player.poseMixing?.(this.target);this.lastError=pose?.error??Infinity;if(!pose?.reachable)return false;this.lastReachable=true;this.root.visible=true;this.root.position.copy(this.target);this.root.quaternion.copy(this.cup.getWorldQuaternion(this.cupRotation));const cycle=Math.floor(e.time*STIR_SPEED/(Math.PI*2));if(cycle!==this.soundCycle&&cycle%2===0){e.audio.sound('stir');this.soundCycle=cycle;}return true;}
 dispose(){if(this.disposed)return;this.disposed=true;this.root.removeFromParent();disposeObjectResources(this.root);this.e=this.cup=null;}
}
