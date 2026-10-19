// Hospital builds borrow the same material/primitive pool. Retire only their
// instance buffers, signs, wall raycasts and reflective bathroom resources.
export function disposeHospital(h,materials={}){
  h.disposeProps?.();const borrowed=new Set(Object.values(materials)),geometries=new Set(),ownMaterials=new Set(),textures=new Set();
  for(const root of [h.group,...h.wallMeshes||[]])root?.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry&&!o.geometry.userData.sharedPrimitive)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m&&!borrowed.has(m))ownMaterials.add(m);});
  for(const m of ownMaterials)for(const value of Object.values(m))if(value?.isTexture)textures.add(value);
  for(const g of geometries)g.dispose();for(const t of textures)t.dispose();for(const m of ownMaterials)m.dispose();h.group.removeFromParent();h.group.clear();
}
