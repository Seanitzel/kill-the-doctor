import * as T from 'three';
// A single canvas per office is repainted only when occupancy changes.
export class OfficeStatus{
 constructor(parent,door,room){if(!door||typeof document==='undefined')return;const canvas=document.createElement('canvas');canvas.width=384;canvas.height=176;this.ctx=canvas.getContext('2d');this.map=new T.CanvasTexture(canvas);this.map.colorSpace=T.SRGBColorSpace;this.panel=new T.Mesh(new T.PlaneGeometry(.70,.32),new T.MeshBasicMaterial({map:this.map}));this.panel.name='Live doctor office status';
  if(door.axis==='x'){const side=Math.sign(room.center.z-door.z)||1;this.panel.position.set(door.x+1.30,1.68,door.z-side*.18);this.panel.rotation.y=side>0?Math.PI:0;}else{const side=Math.sign(room.center.x-door.x)||1;this.panel.position.set(door.x-side*.18,1.68,door.z+1.30);this.panel.rotation.y=side>0?-Math.PI/2:Math.PI/2;}
  parent.add(this.panel);this.update(false);
 }
 update(away,unresponsive=false){const key=unresponsive?'DOCTOR IN OFFICE':away?'DOCTOR AWAY':'DOCTOR IN OFFICE';if(key===this.key||!this.ctx)return;this.key=key;const c=this.ctx;c.fillStyle=away?'#294c45':'#223e50';c.fillRect(0,0,384,176);c.textAlign='center';c.textBaseline='middle';c.fillStyle='#edf4ee';c.font='600 28px Arial';c.fillText(key,192,68);c.font='22px Arial';c.fillStyle='#beced3';c.fillText(away?'Please wait outside':'Private consultation',192,121);this.map.needsUpdate=true;}
 dispose(){if(this.disposed)return;this.disposed=true;this.panel?.removeFromParent();this.panel?.geometry.dispose();this.panel?.material.dispose();this.map?.dispose();this.ctx=null;}
}
