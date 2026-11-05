import * as T from 'three';
// Measure in the head bone's coordinates, independent of player yaw, translation
// and idle pose. Accessory dimensions follow each actual face rather than a neck
// joint offset or a guessed model-wide bounding box.
export function measureHead(model){
 const head=model?.getObjectByName('Head');if(!head)return null;model.parent?.updateWorldMatrix(true,false);model.updateMatrixWorld(true);
 const face=new T.Box3(),eyes=new T.Box3(),point=new T.Vector3();
 model.traverse(mesh=>{const box=mesh.material?.name==='Wolf3D_Skin'?face:mesh.material?.name==='Wolf3D_Eye'?eyes:null;if(!mesh.isSkinnedMesh||!box)return;for(let i=0;i<mesh.geometry.attributes.position.count;i++){mesh.getVertexPosition(i,point);point.applyMatrix4(mesh.matrixWorld);head.worldToLocal(point);box.expandByPoint(point);}});
 return face.isEmpty()?null:{head,face,eyes};
}
