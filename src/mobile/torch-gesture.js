// Keep a tap distinct from a drag, including a drag that returns to its origin.
export class TorchGesture {
  start(pointer,y,brightness=1){if(this.pointer!==undefined)return false;this.pointer=pointer;this.y=y;this.brightness=brightness;this.dragged=false;return true;}
  move(pointer,y){if(pointer!==this.pointer)return null;const delta=this.y-y;if(Math.abs(delta)>=6)this.dragged=true;return this.dragged?Math.min(2.5,Math.max(.5,this.brightness+delta*.02)):null;}
  end(pointer){if(pointer!==this.pointer)return null;const dragged=this.dragged;this.reset();return dragged;}
  reset(){this.pointer=undefined;this.dragged=false;}
}
