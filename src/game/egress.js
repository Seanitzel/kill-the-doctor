import {tileAt,key} from './layout.js';
import {blocksBody,obstacleBounds,footprint,segmentHit3D,circleOverlaps,STRUCTURE_CLEARANCE} from './collision.js';
const STEP=.6,RADIUS=.24;
const distance2=(a,b)=>(a.x-b.x)**2+(a.z-b.z)**2;
// A finer flow field lets a crowd route around furniture and swung-open door leaves.
// Fields are shared by all people heading to the same lift, exit or reporting station.
export class EgressNavigation{
  constructor(layout,colliders){
    this.nodes=new Map();this.fields=new Map();
    this.bodyObstacles=colliders.filter(c=>blocksBody(c)&&c.type!=='entrance-glass').map(c=>{
      if(!c.object?.pivot)return obstacleBounds(c);
      const d=c.object,p=d.pivot.position,a=d.openAngle;
      return footprint(p.x+Math.cos(a)*.86,p.z-Math.sin(a)*.86,1.72,.1,2.6,a,'door');
    });
    this.obstacles=this.bodyObstacles.map(c=>{const radius=['wall','door'].includes(c.type)?STRUCTURE_CLEARANCE+.02:RADIUS;return {minX:c.minX-radius,maxX:c.maxX+radius,minZ:c.minZ-radius,maxZ:c.maxZ+radius,minY:0,maxY:2};});
    for(let gx=-48;gx<=45;gx++)for(let gz=-44;gz<=67;gz++){
      const point={x:gx*STEP,z:gz*STEP},cell=tileAt(point.x,point.z);
      if(!layout.cells.has(key(cell.x,cell.z))||!this.clear(point,point))continue;
      this.nodes.set(key(gx,gz),{gx,gz,point,edges:[]});
    }
    for(const n of this.nodes.values())for(const [dx,dz] of [[1,0],[0,1]]){
      const other=this.nodes.get(key(n.gx+dx,n.gz+dz));
      if(other&&this.clear(n.point,other.point)){n.edges.push(other);other.edges.push(n);}
    }
  }
  clear(a,b){const from={x:a.x,y:.5,z:a.z},to={x:b.x,y:.5,z:b.z};return !this.obstacles.some(c=>segmentHit3D(from,to,c)!==null);}
  clearDeparture(a,b){
    const length=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.max(1,Math.ceil(length/.1));
    for(let step=0;step<=steps;step++){const fraction=step/steps,x=a.x+(b.x-a.x)*fraction,z=a.z+(b.z-a.z)*fraction;if(this.bodyObstacles.some(c=>circleOverlaps(x,z,['wall','door'].includes(c.type)?STRUCTURE_CLEARANCE-.001:.219,c)))return false;}
    return true;
  }
  nearest(position,reachable=null,requireClear=false){
    // Runtime circles may stand in the 2cm safety band or beside a rounded
    // furniture corner that an inflated grid box excludes. Let them walk out
    // using their actual body clearance instead of becoming permanently stuck.
    const departure=requireClear&&this.obstacles.some(c=>position.x>=c.minX&&position.x<=c.maxX&&position.z>=c.minZ&&position.z<=c.maxZ);
    let best=null,min=Infinity;
    for(const node of this.nodes.values()){
      const d=distance2(node.point,position);
      if(d>=min||reachable&&!reachable.has(node)||requireClear&&!(departure?this.clearDeparture(position,node.point):this.clear(position,node.point)))continue;
      best=node;min=d;
    }
    return best;
  }
  fieldFor(goal){
    const end=this.nearest(goal);if(!end)return new Map();
    let field=this.fields.get(end);
    if(!field){
      field=new Map([[end,null]]);const queue=[end];
      for(let i=0;i<queue.length;i++)for(const n of queue[i].edges)if(!field.has(n)){field.set(n,queue[i]);queue.push(n);}
      this.fields.set(end,field);
    }
    return field;
  }
  // Moving contacts use a bounded, temporary A* search, not a new persistent
  // whole-floor flow field for every moving goal.
  routeTransient(position,goal){
    const start=this.nearest(position,null,true),end=this.nearest(goal);if(!start||!end)return [];
    const open=[start],previous=new Map([[start,null]]),cost=new Map([[start,0]]),closed=new Set();
    const heuristic=n=>Math.abs(n.gx-end.gx)+Math.abs(n.gz-end.gz);
    let found=false;
    while(open.length){
      let best=0;for(let i=1;i<open.length;i++)if(cost.get(open[i])+heuristic(open[i])<cost.get(open[best])+heuristic(open[best]))best=i;
      const node=open.splice(best,1)[0];if(node===end){found=true;break;}closed.add(node);
      for(const next of node.edges){if(closed.has(next))continue;const candidate=cost.get(node)+1;if(candidate<(cost.get(next)??Infinity)){if(!cost.has(next))open.push(next);cost.set(next,candidate);previous.set(next,node);}}
    }
    if(!found)return [];const path=[];for(let node=end;node;node=previous.get(node))path.push({x:node.point.x/3+11,z:node.point.z/3+11});return path.reverse();
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
