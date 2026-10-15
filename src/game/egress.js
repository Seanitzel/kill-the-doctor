import {tileAt,key} from './layout.js';
import {blocksBody,obstacleBounds,footprint,segmentHit3D} from './collision.js';
const STEP=.6,RADIUS=.24;
const distance2=(a,b)=>(a.x-b.x)**2+(a.z-b.z)**2;
// A finer flow field lets a crowd route around furniture and swung-open door leaves.
// Fields are shared by all people heading to the same lift, exit or reporting station.
export class EgressNavigation{
  constructor(layout,colliders){
    this.nodes=new Map();this.fields=new Map();
    this.obstacles=colliders.filter(c=>blocksBody(c)).map(c=>{
      if(!c.object?.pivot)return obstacleBounds(c);
      const d=c.object,p=d.pivot.position,a=d.openAngle;
      return footprint(p.x+Math.cos(a)*.86,p.z-Math.sin(a)*.86,1.72,.1,2.6,a,'door');
    }).map(c=>({minX:c.minX-RADIUS,maxX:c.maxX+RADIUS,minZ:c.minZ-RADIUS,maxZ:c.maxZ+RADIUS,minY:0,maxY:2}));
    for(let gx=-48;gx<=45;gx++)for(let gz=-44;gz<=57;gz++){
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
  nearest(position,reachable=null,requireClear=false){
    let best=null,min=Infinity;
    for(const node of this.nodes.values()){
      const d=distance2(node.point,position);
      if(d>=min||reachable&&!reachable.has(node)||requireClear&&!this.clear(position,node.point))continue;
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
  route(position,goal){
    const field=this.fieldFor(goal);let next=this.nearest(position,field,true);const path=[];
    while(next){path.push({x:next.point.x/3+11,z:next.point.z/3+11});next=field.get(next);}
    return path;
  }
}
