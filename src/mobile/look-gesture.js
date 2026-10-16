// Only pointers starting on the look surface participate. A movement thumb plus
// one look finger remains ordinary two-thumb play, not a pinch.
export class LookGesture {
  constructor({look,zoom}){this.look=look;this.zoom=zoom;this.points=new Map();this.distance=0;}
  start(id,x,y){if(this.points.size>=2)return false;this.points.set(id,{x,y});this.distance=this.span();return true;}
  span(){if(this.points.size<2)return 0;const [a,b]=this.points.values();return Math.hypot(a.x-b.x,a.y-b.y);}
  move(id,x,y){
    const previous=this.points.get(id);if(!previous)return;
    const dx=x-previous.x,dy=y-previous.y;previous.x=x;previous.y=y;
    if(this.points.size===2){const next=this.span();if(this.distance>12&&next>12)this.zoom(Math.min(1.18,Math.max(.85,next/this.distance)));this.distance=next;}
    else this.look(dx,dy);
  }
  end(id){this.points.delete(id);this.distance=this.span();}
  reset(){this.points.clear();this.distance=0;}
}
export function cameraZoom(value,ratio){return Math.min(1.8,Math.max(.65,(Number(value)||1)*(Number.isFinite(ratio)?ratio:1)));}
