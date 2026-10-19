import {MathUtils} from 'three';
export function updateEntrance(entrance,opened,dt){
 entrance.amount=MathUtils.damp(entrance.amount,opened?1:0,5,dt);
 for(const leaf of entrance.leaves){const x=1.5+leaf.userData.side*(1.5+entrance.amount*3);leaf.position.x=x;const bounds=leaf.userData.bodyBounds;if(bounds){bounds.minX=x-1.5;bounds.maxX=x+1.5;}}
}
