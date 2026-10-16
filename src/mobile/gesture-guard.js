// Safari can still recognize double-tap zoom on positioned game surfaces.
// Gameplay uses Pointer Events, so cancel touch defaults without stopping input.
export function installGameGestureGuard(target,isPlaying){
  function preventZoom(event){
    if(!isPlaying()||!event.cancelable)return;
    if(event.type==='touchend'||event.type==='dblclick'||event.type.startsWith('gesture')||event.touches?.length>1)event.preventDefault();
  }
  const events=['touchend','touchmove','gesturestart','gesturechange','gestureend','dblclick'];
  for(const type of events)target.addEventListener(type,preventZoom,{passive:false,capture:true});
  return ()=>{for(const type of events)target.removeEventListener(type,preventZoom,{capture:true});};
}
