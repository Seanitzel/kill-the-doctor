import {stickVector} from './input.js';
// A single movement pointer owns the stick. Every release path uses the same
// neutralization; losing capture must never leave the last vector latched.
export class MoveGesture{
 constructor(send){this.send=send;this.pointer=null;}
 start(id,capture){if(this.pointer!==null)return false;this.pointer=id;try{capture?.();}catch{this.reset();return false;}return true;}
 trackTouch(id){this.touch=id;}
 releaseTouches(changed,remaining){if(remaining===0||changed.includes(this.touch)){this.reset();return true;}return false;}
 move(id,dx,dy,{buttons=1,pointerType='touch'}={}){if(id!==this.pointer)return null;if(pointerType==='mouse'&&buttons===0){this.reset();return null;}const v=stickVector(dx,dy,44);this.send(v.forward,v.strafe);return v;}
 end(id){if(id!==this.pointer)return false;this.reset();return true;}
 reset(){this.pointer=null;this.touch=null;this.send(0,0);}
}
