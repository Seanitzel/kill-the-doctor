// Local development diagnostics only; removed from normal builds by Vite.
export function startCameraDiagnostics(getEngine){
  const timer=setInterval(()=>{
    const e=getEngine();if(!e?.mission||window.__northline?.loading)return;
    const c=e.renderer.domElement,r=c.getBoundingClientRect(),v=window.visualViewport;
    const sample={revision:e.cameraRevision,mobile:e.mobile,ua:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight,visualWidth:v?.width,visualHeight:v?.height,scale:v?.scale},canvas:{width:c.width,height:c.height,cssWidth:r.width,cssHeight:r.height},position:e.playerPos.toArray(),camera:e.camera.position.toArray(),direction:e.camera.getWorldDirection(e.playerPos.clone()).toArray(),aspect:e.camera.aspect,pitch:e.pitch,yaw:e.yaw,aiming:e.aiming,floor:e.floor,paused:e.paused,clues:e.mission.clues.length,target:e.mission.target.name,obstacles:e.hospitals.map(h=>h.colliders.reduce((a,c)=>(a[c.type||'other']=(a[c.type||'other']||0)+1,a),{}))};
    fetch('/__northline-camera',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(sample)}).catch(()=>{});
  },1500);
  return ()=>clearInterval(timer);
}
