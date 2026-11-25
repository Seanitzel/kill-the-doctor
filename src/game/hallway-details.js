import * as T from 'three';
import {mesh,material} from './assets.js';
import {key,world} from './layout.js';

export function addHallwayCameras(group,layout){
 const root=new T.Group();root.name='Hallway corner security cameras';group.add(root);let count=0,cornerIndex=0;
 const ivory=material('#d0d4d0'),dark=material('#232d35'),lens=material('#152e3c',{metalness:.5,roughness:.1});
 for(const cell of layout.cells.values()){
  if(cell.room!=='hall')continue;
  const corner=[[-1,-1],[-1,1],[1,-1],[1,1]].find(([dx,dz])=>!layout.cells.has(key(cell.x+dx,cell.z))&&!layout.cells.has(key(cell.x,cell.z+dz)));
  if(!corner||count>=4)continue;if(cornerIndex++%2)continue;const [dx,dz]=corner,p=world(cell.x,cell.z),g=new T.Group();g.name='Wall-mounted hospital security camera';g.position.set(p.x+dx*1.27,3.04,p.z+dz*1.27);g.rotation.y=Math.atan2(-dx,-dz);g.rotation.x=.26;root.add(g);
  mesh('box',ivory,[.13,.18,.04],[0,.03,-.17],g);mesh('box',ivory,[.045,.07,.20],[0,0,-.07],g);mesh('box',ivory,[.18,.14,.31],[0,0,.12],g);mesh('box',dark,[.155,.115,.014],[0,0,.285],g);const eye=mesh('cylinder',lens,[.045,.018,.045],[0,0,.302],g);eye.rotation.x=Math.PI/2;count++;
 }
 return root;
}
