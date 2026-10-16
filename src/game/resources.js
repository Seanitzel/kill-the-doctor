// Dispose owned scene resources once, preserving the small shared primitive pool.
export function disposeObjectResources(root, {textures = false} = {}) {
  const geometries=new Set(),materials=new Set(),maps=new Set(),skeletons=new Set();
  root?.traverse(o=>{
    if(o.isInstancedMesh)o.dispose();
    if(o.skeleton)skeletons.add(o.skeleton);
    if(o.geometry&&!o.geometry.userData.sharedPrimitive)geometries.add(o.geometry);
    for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m){materials.add(m);if(textures)for(const value of Object.values(m))if(value?.isTexture)maps.add(value);}
    o.shadow?.dispose();
  });
  for(const skeleton of skeletons)skeleton.dispose();
  for(const geometry of geometries)geometry.dispose();
  for(const mat of materials)mat.dispose();
  for(const map of maps)map.dispose();
}
