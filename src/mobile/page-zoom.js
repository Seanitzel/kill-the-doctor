// Browser pinch zoom is separate from the game's camera zoom. If a menu was
// magnified, preserve Safari's reverse pinch even after entering gameplay.
export function installPageZoomRecovery(view=window){
 const root=view.document?.documentElement,viewport=view.visualViewport;
 const sync=()=>root?.classList.toggle('page-zoomed',(viewport?.scale||1)>1.01);
 viewport?.addEventListener('resize',sync);sync();
 return()=>{viewport?.removeEventListener('resize',sync);root?.classList.remove('page-zoomed');};
}
