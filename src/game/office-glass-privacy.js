import * as T from 'three';
import {tileAt,key,TILE} from './layout.js';

// Outward-facing opaque surfaces create a physical one-way view, including in
// mirrors. The inside face is culled; no camera-dependent global hiding is used.
export class OfficeGlassPrivacy{
 constructor(engine,office,doors,parent){
  this.floor=office.floor;this.active=false;this.root=new T.Group();this.root.name='Office glass privacy';this.root.userData.floor=this.floor;parent.add(this.root);this.surfaces=new T.Group();this.root.add(this.surfaces);this.surfaces.visible=false;this.material=new T.MeshStandardMaterial({color:'#777d82',roughness:.82,side:T.FrontSide});this.boundaries=[];this.doorSurfaces=[];
  const layout=engine.levels[this.floor],roomAt=(x,z)=>{const p=tileAt(x,z);return layout.cells.get(key(p.x,p.z))?.room;};
  for(const wall of layout.walls){if(wall.door||wall.exterior)continue;for(const side of [-1,1]){
   const dx=wall.axis==='z'?side*.3:0,dz=wall.axis==='x'?side*.3:0;
   if(roomAt(wall.x+dx,wall.z+dz)!==office.id||roomAt(wall.x-dx,wall.z-dz)!=='hall')continue;
   const outward=-side,pane=new T.Mesh(new T.PlaneGeometry(TILE-.06,3.5),this.material);pane.name='One-way grey privacy glazing';pane.position.set(wall.x+(wall.axis==='z'?outward*.097:0),1.82,wall.z+(wall.axis==='x'?outward*.097:0));pane.rotation.y=wall.axis==='z'?outward*Math.PI/2:outward<0?Math.PI:0;pane.receiveShadow=true;this.surfaces.add(pane);this.boundaries.push({axis:wall.axis,x:wall.x,z:wall.z,outward});
  }}
  for(const door of doors){if(!door.pivot)continue;const outside=-Math.sign(office.center.z-door.z),pane=new T.Mesh(new T.PlaneGeometry(.59,.54),this.material);pane.name='One-way grey office door window';pane.position.set(.86,1.84,outside*.05);pane.rotation.y=outside<0?Math.PI:0;pane.visible=false;door.pivot.add(pane);this.doorSurfaces.push(pane);}
 }
 set(active){this.active=!!active;this.surfaces.visible=this.active;for(const pane of this.doorSurfaces)pane.visible=this.active;}
 blocksSight(a,b,floor){
  if(!this.active||floor!==this.floor)return false;
  return this.boundaries.some(w=>{const axis=w.axis==='z'?'x':'z',along=axis==='x'?'z':'x',delta=b[axis]-a[axis];if((a[axis]-w[axis])*w.outward<=0||delta*w.outward>=0)return false;const t=(w[axis]-a[axis])/delta;return t>0&&t<1&&Math.abs(a[along]+(b[along]-a[along])*t-w[along])<=TILE/2;});
 }
 dispose(){for(const mesh of [...this.surfaces.children,...this.doorSurfaces]){mesh.removeFromParent();mesh.geometry.dispose();}this.material.dispose();this.root.removeFromParent();this.root.clear();this.doorSurfaces=[];this.boundaries=[];}
}
