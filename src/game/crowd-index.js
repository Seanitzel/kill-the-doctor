// A frame-local spatial index avoids scanning the entire hospital for every
// collision substep. Positions remain live references; queries include a margin
// for bodies moving across a bucket during this frame.
export class CrowdIndex{
 constructor(actors){this.buckets=new Map();for(const n of actors){if(n.dead||n.evacuated||n.lying||n.baby)continue;const key=`${n.floor}:${Math.floor(n.pos.x/3)}:${Math.floor(n.pos.z/3)}`;let bucket=this.buckets.get(key);if(!bucket)this.buckets.set(key,bucket=[]);bucket.push(n);}}
 nearby(point,floor){const x=Math.floor(point.x/3),z=Math.floor(point.z/3),result=[];for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const bucket=this.buckets.get(`${floor}:${x+dx}:${z+dz}`);if(bucket)result.push(...bucket);}return result;}
}
