import * as T from 'three';
const rounded=n=>Math.round(n*100000)/100000;
// Exact rectilinear union, followed by greedy surface meshing. Adjacent and
// perpendicular wall modules share one skin, including rails and skirting:
// no coincident end caps or overlapping top faces to flicker at the corners.
export class JoinedWalls{
 constructor(){this.boxes=[];this.materials=[];}
 box(material,x,y,z,w,h,d){let id=this.materials.indexOf(material);if(id<0){id=this.materials.length;this.materials.push(material);}this.boxes.push({id:id+1,min:[x-w/2,y-h/2,z-d/2].map(rounded),max:[x+w/2,y+h/2,z+d/2].map(rounded)});}
 finish(parent){
  if(!this.boxes.length)return [];
  const coordinates=[0,1,2].map(axis=>[...new Set(this.boxes.flatMap(b=>[b.min[axis],b.max[axis]]))].sort((a,b)=>a-b)),sizes=coordinates.map(c=>c.length-1),[nx,ny,nz]=sizes;
  const indices=coordinates.map(c=>new Map(c.map((n,i)=>[n,i]))),cells=new Uint16Array(nx*ny*nz),offset=(x,y,z)=>x+nx*(y+ny*z);
  for(const box of this.boxes){const lo=box.min.map((v,a)=>indices[a].get(v)),hi=box.max.map((v,a)=>indices[a].get(v));for(let z=lo[2];z<hi[2];z++)for(let y=lo[1];y<hi[1];y++)for(let x=lo[0];x<hi[0];x++)cells[offset(x,y,z)]=box.id;}
  const buffers=this.materials.map(()=>({positions:[],normals:[],uvs:[],indices:[]}));let quads=0;
  for(let axis=0;axis<3;axis++){
   const u=(axis+1)%3,v=(axis+2)%3,nu=sizes[u],nv=sizes[v],mask=new Int16Array(nu*nv),position=[0,0,0];
   for(let plane=0;plane<=sizes[axis];plane++){
    for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){position[u]=i;position[v]=j;position[axis]=plane-1;const a=plane?cells[offset(...position)]:0;position[axis]=plane;const b=plane<sizes[axis]?cells[offset(...position)]:0;mask[i+nu*j]=a&&!b?a:b&&!a?-b:0;}
    for(let j=0;j<nv;j++)for(let i=0;i<nu;){const code=mask[i+nu*j];if(!code){i++;continue;}let width=1,height=1;while(i+width<nu&&mask[i+width+nu*j]===code)width++;
     outer:while(j+height<nv){for(let k=0;k<width;k++)if(mask[i+k+nu*(j+height)]!==code)break outer;height++;}
     const buffer=buffers[Math.abs(code)-1],base=buffer.positions.length/3,normal=[0,0,0];normal[axis]=Math.sign(code);
     for(const [a,b]of [[i,j],[i+width,j],[i+width,j+height],[i,j+height]]){const point=[0,0,0];point[axis]=coordinates[axis][plane];point[u]=coordinates[u][a];point[v]=coordinates[v][b];buffer.positions.push(...point);buffer.normals.push(...normal);buffer.uvs.push(point[u],point[v]);}
     buffer.indices.push(...(code>0?[0,1,2,0,2,3]:[0,2,1,0,3,2]).map(n=>base+n));quads++;
     for(let h=0;h<height;h++)mask.fill(0,i+nu*(j+h),i+width+nu*(j+h));i+=width;
    }
   }
  }
  const meshes=[];buffers.forEach((buffer,i)=>{if(!buffer.positions.length)return;const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(buffer.positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(buffer.normals,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(buffer.uvs,2));geometry.setIndex(buffer.indices);geometry.computeBoundingSphere();const mesh=new T.Mesh(geometry,this.materials[i]);mesh.name='Joined hospital wall surfaces';mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);meshes.push(mesh);});
  parent.userData.wallSurfaceStats={modules:this.boxes.length,quads,drawCalls:meshes.length};this.boxes=[];this.materials=[];return meshes;
 }
}
