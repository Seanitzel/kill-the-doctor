import * as T from 'three';

// Keep the entrance and the pedestrian/traffic lanes almost level. Larger
// accumulations sit to either side, so the existing movement plane stays valid.
export function snowHeight(x,z){
 const grain=.008*Math.sin(x*.83+z*.44)+.006*Math.sin(x*1.73-z*.71);
 let depth=.028+grain;
 for(const [cx,cz,height,spread]of [[-12,40,.24,15],[13,41,.20,18],[-22,58,.28,21],[22,59,.25,18]])depth+=height*Math.exp(-((x-cx)**2+(z-cz)**2)/spread);
 return depth;
}
export function addSnowGround(root,material){
 const geometry=new T.PlaneGeometry(52,24,80,40);geometry.rotateX(-Math.PI/2);
 const positions=geometry.attributes.position;
 for(let i=0;i<positions.count;i++)positions.setY(i,snowHeight(positions.getX(i),positions.getZ(i)+49));
 geometry.computeVertexNormals();
 const surface=new T.Mesh(geometry,material);surface.name='Uneven settled snow and soft roadside drifts';surface.position.z=49;surface.receiveShadow=true;root.add(surface);return surface;
}
