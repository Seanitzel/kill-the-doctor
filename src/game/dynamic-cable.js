import * as THREE from 'three';
// A short deforming clinical cable keeps its geometry and GPU buffers for its lifetime.
export function createCableGeometry(){
  const points=[new THREE.Vector3(),new THREE.Vector3(0,-.3,.1),new THREE.Vector3(.2,-.4,.4)];
  const curve=new THREE.CatmullRomCurve3(points);
  const geometry=new THREE.TubeGeometry(curve,12,.014,5,false);
  geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
  geometry.attributes.normal.setUsage(THREE.DynamicDrawUsage);
  geometry.userData.cable={curve,point:new THREE.Vector3(),tangent:new THREE.Vector3(),side:new THREE.Vector3(),normal:new THREE.Vector3(),up:new THREE.Vector3(0,1,0)};
  return geometry;
}
export function updateCableGeometry(geometry,start,end){
  const s=geometry.userData.cable;
  s.curve.points[0].copy(start);s.curve.points[1].copy(start).lerp(end,.55);s.curve.points[1].y-=.35;s.curve.points[2].copy(end);
  const positions=geometry.attributes.position,normals=geometry.attributes.normal;
  for(let i=0;i<=12;i++){
    s.curve.getPoint(i/12,s.point);s.curve.getTangent(i/12,s.tangent);
    s.up.set(0,Math.abs(s.tangent.y)>.98?0:1,Math.abs(s.tangent.y)>.98?1:0);
    s.side.crossVectors(s.tangent,s.up).normalize();s.normal.crossVectors(s.side,s.tangent).normalize();
    for(let j=0;j<=5;j++){
      const angle=j/5*Math.PI*2,c=Math.cos(angle),n=Math.sin(angle),index=i*6+j;
      const x=s.side.x*c+s.normal.x*n,y=s.side.y*c+s.normal.y*n,z=s.side.z*c+s.normal.z*n;
      normals.setXYZ(index,x,y,z);positions.setXYZ(index,s.point.x+x*.014,s.point.y+y*.014,s.point.z+z*.014);
    }
  }
  positions.needsUpdate=true;normals.needsUpdate=true;geometry.computeBoundingSphere();
}
