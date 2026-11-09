import {PriorityQueue} from './priority-queue.js';
import {tileAt,key} from './layout.js';
import {blocksBody,obstacleBounds,footprint,segmentHit2D,circleOverlaps,STRUCTURE_CLEARANCE} from './collision.js';
const STEP=.6,RADIUS=.24;
export const MAX_EGRESS_FIELDS=8;
const distance2=(a,b)=>(a.x-b.x)**2+(a.z-b.z)**2;
// A finer flow field lets a crowd route around furniture and swung-open door leaves.
// Fields are shared by all people heading to the same lift, exit or reporting station.
export class EgressNavigation{
  constructor(layout,colliders,{respectLocked=false}={}){
    this.nodes=new Map();this.fields=new Map();this.gridBounds={minX:layout.expanded?-58:-48,maxX:45,minZ:layout.expanded?-58:-44,maxZ:67};
    this.bodyObstacles=colliders.filter(c=>!c.dynamic&&blocksBody(c)&&c.type!=='entrance-glass').map(c=>{
      if(!c.object?.pivot)return obstacleBounds(c);
      const d=c.object,p=d.pivot.position,a=d.openAngle;
      if(respectLocked&&d.locked)return {...obstacleBounds(c)};return footprint(p.x+Math.cos(a)*.86,p.z-Math.sin(a)*.86,1.72,.1,2.6,a,'door');
    });
    this.obstacles=this.bodyObstacles.map(c=>{const radius=['wall','door'].includes(c.type)?STRUCTURE_CLEARANCE+.02:RADIUS;return {minX:c.minX-radius,maxX:c.maxX+radius,minZ:c.minZ-radius,maxZ:c.maxZ+radius,minY:0,maxY:2};});
    for(let gx=layout.expanded?-58:-48;gx<=45;gx++)for(let gz=layout.expanded?-58:-44;gz<=67;gz++){
      const point={x:gx*STEP,z:gz*STEP},cell=tileAt(point.x,point.z);
      if(!layout.cells.has(key(cell.x,cell.z))||!this.clear(point,point))continue;
      this.nodes.set(key(gx,gz),{gx,gz,point,edges:[]});
    }
    for(const n of this.nodes.values())for(const [dx,dz] of [[1,0],[0,1]]){
      const other=this.nodes.get(key(n.gx+dx,n.gz+dz));
      if(other&&this.clear(n.point,other.point)){n.edges.push(other);other.edges.push(n);}
    }
  }
  clear(a,b){for(let i=0;i<this.obstacles.length;i++)if(segmentHit2D(a,b,this.obstacles[i])!==null)return false;return true;}
  clearDeparture(a,b){
    const length=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.max(1,Math.ceil(length/.1));
    for(let step=0;step<=steps;step++){const fraction=step/steps,x=a.x+(b.x-a.x)*fraction,z=a.z+(b.z-a.z)*fraction;for(let i=0;i<this.bodyObstacles.length;i++){const c=this.bodyObstacles[i],radius=c.type==='wall'||c.type==='door'?STRUCTURE_CLEARANCE-.001:.219;if(circleOverlaps(x,z,radius,c))return false;}}
    return true;
  }
  nearest(position,reachable=null,requireClear=false){
    // Runtime circles may stand in the 2cm safety band or beside a rounded
    // furniture corner that an inflated grid box excludes. Let them walk out
    // using their actual body clearance instead of becoming permanently stuck.
    const departure=requireClear&&this.obstacles.some(c=>position.x>=c.minX&&position.x<=c.maxX&&position.z>=c.minZ&&position.z<=c.maxZ);
    let best=null,min=Infinity;
    const consider=node=>{if(!node||reachable&&!reachable.has(node))return;const d=distance2(node.point,position);if(d>min||d===min&&best&&(node.gx>best.gx||node.gx===best.gx&&node.gz>=best.gz))return;if(requireClear&&!(departure?this.clearDeparture(position,node.point):this.clear(position,node.point)))return;best=node;min=d;};
    if(!this.gridBounds){for(const node of this.nodes.values())consider(node);return best;}
    const cx=Math.round(position.x/STEP),cz=Math.round(position.z/STEP),b=this.gridBounds,max=Math.max(Math.abs(cx-b.minX),Math.abs(cx-b.maxX),Math.abs(cz-b.minZ),Math.abs(cz-b.maxZ));
    // Invalid/far-outside positions use the finite scan, never enormous rings.
    if(!Number.isFinite(max)||max>256){for(const node of this.nodes.values())consider(node);return best;}
    for(let r=0;r<=max;r++){
      for(let x=cx-r;x<=cx+r;x++){consider(this.nodes.get(key(x,cz-r)));if(r)consider(this.nodes.get(key(x,cz+r)));}
      for(let z=cz-r+1;z<cz+r;z++){consider(this.nodes.get(key(cx-r,z)));consider(this.nodes.get(key(cx+r,z)));}
      const outside=Math.min(position.x-(cx-r-1)*STEP,(cx+r+1)*STEP-position.x,position.z-(cz-r-1)*STEP,(cz+r+1)*STEP-position.z);
      if(best&&outside*outside>min)break;
    }
    return best;
  }
  fieldFor(goal){
    const end=this.nearest(goal);if(!end)return new Map();
    let field=this.fields.get(end);
    if(!field){
      field=new Map([[end,null]]);const queue=[end];
      for(let i=0;i<queue.length;i++)for(const n of queue[i].edges)if(!field.has(n)){field.set(n,queue[i]);queue.push(n);}
      this.fields.set(end,field);while(this.fields.size>MAX_EGRESS_FIELDS)this.fields.delete(this.fields.keys().next().value);
    }
    this.fields.delete(end);this.fields.set(end,field);return field;
  }
  // Moving contacts use a bounded, temporary A* search, not a new persistent
  // whole-floor flow field for every moving goal.
  routeTransient(position,goal){
    const start=this.nearest(position,null,true),end=this.nearest(goal);if(!start||!end)return [];
    const previous=new Map([[start,null]]),cost=new Map([[start,0]]),closed=new Set(),heuristic=n=>Math.abs(n.gx-end.gx)+Math.abs(n.gz-end.gz),open=new PriorityQueue(n=>cost.get(n)+heuristic(n));open.push(start);
    let found=false;
    while(open.size){
      const node=open.pop();if(node===end){found=true;break;}closed.add(node);
      for(const next of node.edges){if(closed.has(next))continue;const candidate=cost.get(node)+1;if(candidate<(cost.get(next)??Infinity)){cost.set(next,candidate);previous.set(next,node);open.push(next);}}
    }
    if(!found)return [];const path=[];for(let node=end;node;node=previous.get(node))path.push({x:node.point.x/3+11,z:node.point.z/3+11});return path.reverse();
  }
  routeAvoiding(position,goal,people){
    const clearPeople=(a,b)=>people.every(p=>{const dx=b.x-a.x,dz=b.z-a.z,len=dx*dx+dz*dz,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/Math.max(len,.0001))),before=Math.hypot(a.x-p.x,a.z-p.z),nearest=Math.hypot(a.x+t*dx-p.x,a.z+t*dz-p.z);return nearest>=.51||before<.51&&Math.hypot(b.x-p.x,b.z-p.z)>before&&(a.x-p.x)*dx+(a.z-p.z)*dz>=0;});
    const start=[...this.nodes.values()].sort((a,b)=>distance2(a.point,position)-distance2(b.point,position)).slice(0,80).find(n=>this.clearDeparture(position,n.point)&&clearPeople(position,n.point)),end=this.nearest(goal);if(!start||!end)return [];
    const previous=new Map([[start,null]]),cost=new Map([[start,0]]),closed=new Set(),heuristic=n=>Math.abs(n.gx-end.gx)+Math.abs(n.gz-end.gz),open=new PriorityQueue(n=>cost.get(n)+heuristic(n));open.push(start);
    while(open.size){const node=open.pop();if(node===end){const path=[];for(let n=end;n;n=previous.get(n))path.push({x:n.point.x/3+11,z:n.point.z/3+11});return path.reverse();}closed.add(node);for(const next of node.edges){if(closed.has(next)||!clearPeople(node.point,next.point))continue;const score=cost.get(node)+1;if(score<(cost.get(next)??Infinity)){cost.set(next,score);previous.set(next,node);open.push(next);}}}
    return [];
  }
  smoothRoute(position,goal){
    const path=this.routeTransient(position,goal);if(!path.length)return [];
    return this.smoothPath(position,path);
  }
  smoothPath(position,path){
    const points=path.map(p=>({x:(p.x-11)*3,z:(p.z-11)*3})),result=[];let from=position,index=0;
    while(index<points.length){
      let next=points.length-1;
      while(next>index&&!(result.length?this.clear(from,points[next]):this.clear(from,points[next])||this.clearDeparture(from,points[next])))next--;
      if(!(result.length?this.clear(from,points[next]):this.clear(from,points[next])||this.clearDeparture(from,points[next])))return [];
      result.push(path[next]);from=points[next];index=next+1;
    }
    return result;
  }
  route(position,goal){
    const field=this.fieldFor(goal);let next=this.nearest(position,field,true);const path=[];
    while(next){path.push({x:next.point.x/3+11,z:next.point.z/3+11});next=field.get(next);}
    return path;
  }
}
