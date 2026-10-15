import {world,key,edgeKey} from './layout.js';
import {blocksBody} from './collision.js';
export function makeNavigation(layout,colliders){
  const furniture=colliders.filter(c=>!c.object&&blocksBody(c)&&c.maxX-c.minX>.4&&c.maxZ-c.minZ>.4);
  const nav={...layout,cells:new Map([...layout.cells].filter(([,cell])=>{const p=world(cell.x,cell.z);return !furniture.some(c=>p.x+.26>c.minX&&p.x-.26<c.maxX&&p.z+.26>c.minZ&&p.z-.26<c.maxZ);})),blockedEdges:new Set()};
  for(const cell of nav.cells.values())for(const [dx,dz] of [[1,0],[0,1]]){
    const neighbor=nav.cells.get(key(cell.x+dx,cell.z+dz));if(!neighbor)continue;
    const a=world(cell.x,cell.z),b=world(neighbor.x,neighbor.z);
    if(furniture.some(c=>segmentBox(a.x,a.z,b.x-a.x,b.z-a.z,c,.28)<1))nav.blockedEdges.add(edgeKey(key(cell.x,cell.z),key(neighbor.x,neighbor.z)));
  }
  return nav;
}
export function segmentBox(x, z, dx, dz, c, pad = 0) {
  let low = 0, high = 1;
  for (const [p, d, min, max] of [[x, dx, c.minX - pad, c.maxX + pad], [z, dz, c.minZ - pad, c.maxZ + pad]]) {
    if (Math.abs(d) < .000001) { if (p < min || p > max) return 1; }
    else { const a = (min - p) / d, b = (max - p) / d; low = Math.max(low, Math.min(a, b)); high = Math.min(high, Math.max(a, b)); if (low > high) return 1; }
  }
  return low > .005 && low < 1 ? low : 1;
}
