import * as T from 'three';
import {mesh,material} from './assets.js';
// Narrow padded folding counter chair, as in the supplied reference: X frame,
// tall back, black round tubing, a foot rail, and one 65cm seat.
export function securityChair(){
 const root=new T.Group();root.name='Black folding security chair';const black=material('#111820',{roughness:.86}),steel=material('#14191f',{metalness:.55,roughness:.42});
 const tube=(a,b,r=.019)=>{const from=new T.Vector3(...a),to=new T.Vector3(...b),g=new T.CylinderGeometry(r,r,from.distanceTo(to),10),part=new T.Mesh(g,steel);part.position.copy(from).lerp(to,.5);part.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),to.sub(from).normalize());root.add(part);};
 const seat=mesh('box',black,[.50,.085,.46],[0,.65,0],root);seat.name='Padded 65cm seat';
 mesh('box',black,[.43,.16,.075],[0,1.18,-.23],root);
 for(const s of[-1,1]){tube([s*.25,.025,.29],[s*.23,1.2,-.25]);tube([s*.25,.025,-.29],[s*.23,.66,.20]);}
 tube([-.25,.22,.20],[.25,.22,.20],.014);tube([-.25,.13,-.26],[.25,.13,-.26],.014);return root;
}
