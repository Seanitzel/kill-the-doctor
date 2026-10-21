import {footprint,obstacleBounds} from './collision.js';
export const VENDING_LOCATION=Object.freeze({x:8.7,z:29.5});
export const vendingBounds=()=>footprint(VENDING_LOCATION.x,VENDING_LOCATION.z,.74,1.14,2.05,0,'vending-machine');
export function overlaps(a,b,pad=0){return a.minX<b.maxX+pad&&a.maxX>b.minX-pad&&a.minZ<b.maxZ+pad&&a.maxZ>b.minZ-pad;}
export function doorClearance(door){const hinge=door.x-.86,forward=door.openAngle<0;return {minX:hinge-.2,maxX:hinge+1.92,minZ:door.z-(forward ? .9 : 1.92),maxZ:door.z+(forward ? 1.92 : .9)};}
export function chairFits(x,z,rotation,layout,colliders){
 const seat=footprint(x,z,.8,.76,1.18,rotation,'chair');
 if(layout.floor<3&&overlaps(seat,vendingBounds(),.15))return false;
 if(layout.doors.some(d=>overlaps(seat,doorClearance(d),.1)))return false;
 return !colliders.some(c=>(c.minY??0)<1.18&&(c.maxY??3.6)>0&&overlaps(seat,obstacleBounds(c),.015));
}
