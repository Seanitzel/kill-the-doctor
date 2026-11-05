import * as T from 'three';
import {disposeObjectResources} from './resources.js';
export class MealProp{
 constructor(visual){this.visual=visual;this.root=new T.Group();this.root.name='Diner held spoon';visual.root.add(this.root);const steel=new T.MeshStandardMaterial({color:'#aebdc7',metalness:.6,roughness:.35}),handle=new T.Mesh(new T.CylinderGeometry(.003,.003,.115,6),steel);handle.rotation.x=Math.PI/2;this.root.add(handle);const bowl=new T.Mesh(new T.SphereGeometry(1,12,8),steel);bowl.scale.set(.017,.004,.025);bowl.position.z=-.078;this.root.add(bowl);this.food=new T.Mesh(new T.SphereGeometry(.012,8,6),new T.MeshStandardMaterial({color:'#cba376',roughness:.9}));this.food.scale.y=.5;this.food.position.set(0,.006,-.078);this.root.add(this.food);this.direction=new T.Vector3();this.rotation=new T.Quaternion();this.forward=new T.Vector3(0,0,1);this.root.visible=false;}
 update(pose){if(this.disposed)return;this.root.visible=!!pose;if(!pose)return;this.visual.root.updateWorldMatrix(true,true);this.root.position.copy(pose.grip);this.visual.root.worldToLocal(this.root.position);this.direction.copy(pose.direction).applyQuaternion(this.visual.root.getWorldQuaternion(this.rotation).invert());this.root.quaternion.setFromUnitVectors(this.forward,this.direction);}
 dispose(){if(this.disposed)return;this.disposed=true;this.root.removeFromParent();disposeObjectResources(this.root);}
}
