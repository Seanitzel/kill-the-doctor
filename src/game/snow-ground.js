import * as T from 'three';

// Keep the entrance and the pedestrian/traffic lanes almost level. Larger
// accumulations sit to either side, so the existing movement plane stays valid.
export function snowHeight(x,z){
 const grain=.012*Math.sin(x*3.3+z*2.4)+.009*Math.sin(x*5.7-z*4.1);
 // Continuous wind-rippled snow, with a shallow path straight to the doors.
 const path=T.MathUtils.smoothstep(Math.abs(x-1.5),2.2,5.5);
 let depth=.038+grain*.3+path*(.045+.022*Math.sin(x*.9+z*.55)+.018*Math.cos(z*1.4-x*.48)+grain);
 for(const [cx,cz,height,spread]of [[-9,40,.22,10],[11,42,.19,14],[-18,44,.17,18],[20,47,.21,16],[-15,57,.24,19],[15,58,.18,22],[-24,53,.22,12],[24,38,.15,12]])depth+=path*height*Math.exp(-((x-cx)**2+(z-cz)**2)/spread);
 return depth;
}
export function addSnowGround(root,material){
 const geometry=new T.PlaneGeometry(52,24,156,72);geometry.rotateX(-Math.PI/2);
 const positions=geometry.attributes.position;
 for(let i=0;i<positions.count;i++)positions.setY(i,snowHeight(positions.getX(i),positions.getZ(i)+49));
 geometry.computeVertexNormals();
 const surface=new T.Mesh(geometry,material);surface.name='Uneven settled snow and soft roadside drifts';surface.position.z=49;surface.receiveShadow=true;root.add(surface);return surface;
}
