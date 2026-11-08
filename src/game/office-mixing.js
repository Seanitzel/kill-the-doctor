import * as T from 'three';
import {mesh,material} from './assets.js';
import {disposeObjectResources} from './resources.js';
// One owned prop, one cached rig, no camera-dependent pose or per-frame traversal.
export class OfficeMixing{
 constructor(e,cup){this.e=e;this.cup=cup;this.root=new T.Group();this.root.name='Coffee mixing spoon';e.scene.add(this.root);const metal=material('#a9b7bb',{metalness:.8,roughness:.25});mesh('cylinder',metal,[.006,.16,.006],[0,-.05,0],this.root);mesh('sphere',metal,[.018,.006,.026],[0,-.135,0],this.root);this.root.visible=false;this.target=new T.Vector3();}
 update(active){this.root.visible=!!active;if(!active)return;const e=this.e;this.cup.getWorldPosition(this.target);this.target.add(new T.Vector3(Math.cos(e.time*6)*.025,.15,Math.sin(e.time*6)*.025));const pose=e.player.poseMixing?.(this.target);if(!pose){this.root.visible=false;return;}this.root.position.copy(pose.grip);this.root.quaternion.identity();if(e.time>=(this.nextSound||0)){e.audio.sound('stir');this.nextSound=e.time+.72;}}
 dispose(){if(this.disposed)return;this.disposed=true;this.root.removeFromParent();disposeObjectResources(this.root);this.e=this.cup=null;}
}
