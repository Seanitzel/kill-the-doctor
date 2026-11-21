import {tileAt,key} from './layout.js';
// Geometry and decorative finishes must agree about openings in wall bays.
export const WALL_HEIGHT=3.64;
export const WINDOW_SILL=1.12;
export const WINDOW_HEAD=2.61;
export const WINDOW_HEADER_HEIGHT=1.04;
export function wallHasWindow(wall){return !wall.door&&!wall.exterior&&Math.round(wall.x+wall.z)%4===0;}
export function floralWallBand(wall){
 const bottom=wallHasWindow(wall)?WINDOW_HEAD+.05:1.24,top=WALL_HEIGHT-.08;
 return {bottom,top,height:top-bottom,center:(bottom+top)/2,window:wallHasWindow(wall)};
}

const glassWallPlans=new WeakMap();
// Only the outward-facing wall of each far side hallway; room partitions stay solid.
export function farHallGlass(layout,wall){
 if(!wall.exterior||wall.axis!=='z'||wall.door)return false;
 const hall=w=>[-1,1].some(side=>{const p=tileAt(w.x+side*.3,w.z);return layout.cells.get(key(p.x,p.z))?.room==='hall';});
 let plan=glassWallPlans.get(layout);if(!plan||plan.wallCount!==layout.walls.length){
 const counts=new Map();for(const w of layout.walls)if(w.exterior&&w.axis==='z'&&w.z<=24&&hall(w))counts.set(w.x,(counts.get(w.x)||0)+1);
 // Expanded hospitals have short projecting annexes farther out than the
 // original long hallways. Choose the long wall on each side, not that annex.
 const longest=sign=>[...counts].filter(([x])=>Math.sign(x)===sign).sort((a,b)=>b[1]-a[1])[0]?.[0];
 plan={wallCount:layout.walls.length,sides:[longest(-1),longest(1)]};glassWallPlans.set(layout,plan);}
 return plan.sides.includes(wall.x)&&wall.z<=24&&hall(wall);
}
