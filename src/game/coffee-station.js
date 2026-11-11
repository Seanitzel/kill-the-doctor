import {coffeePlacement} from './coffee-placement.js';
import * as T from 'three';
import {mesh,material} from './assets.js';
export function coffeeStation(parent,room,options){
 const placement=coffeePlacement(room,options),{x,z,rotation}=placement,root=new T.Group();
 root.name='Staff coffee and cutlery station';root.position.set(x,0,z);root.rotation.y=rotation;root.userData.floor=room.floor;parent.add(root);
 const steel=material('#9ca8ab',{metalness:.65,roughness:.3}),black=material('#192329'),white=material('#eee8db'),coffee=material('#39271e'),glass=material('#b6d6dc',{transparent:true,opacity:.3,roughness:.2,depthWrite:false});
 const part=(name,shape,mat,size,pos,group=root)=>{const m=mesh(shape,mat,size,pos,group);m.name=name;return m;};
 part('Coffee counter','box',white,[2.8,.09,.8],[0,.94,0]);
 for(const side of[-1,1])part('Counter cabinet','box',black,[.62,.87,.68],[side*.99,.435,0]);
 const brewer=new T.Group();brewer.name='Drip coffee brewer';brewer.position.set(-.91,.99,-.07);root.add(brewer);
 part('Brewer tower','box',steel,[.48,.64,.22],[0,.32,-.14],brewer);
 part('Brewer canopy','box',black,[.57,.075,.49],[0,.66,0],brewer);
 part('Warming plate','cylinder',black,[.22,.025,.22],[0,.018,.075],brewer);
 part('Carafe coffee','cylinder',coffee,[.14,.19,.14],[0,.14,.08],brewer);
 part('Glass carafe','sphere',glass,[.185,.15,.17],[0,.19,.08],brewer);
 part('Carafe lid','cylinder',black,[.145,.035,.145],[0,.34,.08],brewer);
 const handle=new T.Mesh(new T.TorusGeometry(.11,.022,6,14,Math.PI*1.5),black);handle.name='Carafe handle';handle.rotation.z=-Math.PI*.75;handle.position.set(.21,.21,.08);brewer.add(handle);
 for(let i=0;i<2;i++){part('Brewer button','cylinder',black,[.032,.013,.032],[-.11+i*.13,.48,.002],brewer).rotation.x=Math.PI/2;part('Brewer indicator','sphere',material(i?'#96c69f':'#c99d76'),[.012,.012,.012],[-.11+i*.13,.56,-.018],brewer);}
 const stack=new T.Group();stack.name='Stack of paper cups';stack.position.set(-.26,.995,.06);root.add(stack);
 for(let i=0;i<8;i++){const cup=part('Stacked paper cup','cylinder',white,[.085,.10,.085],[0,.05+i*.033,0],stack);const rim=new T.Mesh(new T.TorusGeometry(.087,.006,5,20),white);rim.rotation.x=Math.PI/2;rim.position.y=.102+i*.033;rim.name='Paper cup rim';stack.add(rim);cup.scale.x*=1-i*.003;cup.scale.z*=1-i*.003;}
 part('Cutlery tray','box',black,[1.25,.035,.48],[.65,1.005,0]);
 for(let i=0;i<6;i++){const spoon=new T.Group();spoon.name=i===2?'Collectible cafeteria teaspoon':'Separated cafeteria teaspoon';spoon.position.set(.13+i*.16,1.035,.02);root.add(spoon);part('Spoon handle','box',steel,[.017,.009,.21],[0,0,.055],spoon);part('Spoon bowl','sphere',steel,[.033,.008,.046],[0,0,-.085],spoon);}
 for(let i=0;i<3;i++)part('Sugar packet','box',material(i%2?'#bcaa85':'#d6e1de'),[.09,.12,.025],[.35+i*.15,1.075,-.19]);
 const bin=new T.Group();bin.name='Cafeteria rubbish bin';bin.position.set(1.3,0,.9);root.add(bin);
 part('Bin body','cylinder',steel,[.25,.62,.25],[0,.31,0],bin);part('Bin dark opening','cylinder',black,[.22,.015,.22],[0,.63,0],bin);const lip=new T.Mesh(new T.TorusGeometry(.235,.025,6,20),steel);lip.rotation.x=Math.PI/2;lip.position.y=.64;bin.add(lip);
 const spoon=root.getObjectByName('Collectible cafeteria teaspoon');root.updateMatrixWorld(true);const point=spoon.getWorldPosition(new T.Vector3());
 return{root,spoon,point:placement.point,bounds:placement.bounds,extraBounds:[{...placement.bin,w:.52,d:.52,h:.68}]};
}
