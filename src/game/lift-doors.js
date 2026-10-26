// Slide the visible part into the jamb pocket. Nothing renders beyond the portal.
// Visual width and physical bounds always describe the same exposed door surface.
export function setLiftOpening(lift,amount){
 lift.amount=Math.max(0,Math.min(1,amount));
 for(const leaf of lift.leaves){
  const width=1.24*(1-lift.amount),x=lift.x+leaf.userData.side*(1.24-width/2);
  leaf.position.x=x;leaf.scale.x=width;leaf.visible=width>.0001;
  if(leaf.userData.seam){const seam=leaf.userData.seam;seam.visible=width>.012;seam.position.x=.5-.004/Math.max(width,.0001);seam.scale.x=.008/Math.max(width,.0001);}
  const bounds=leaf.userData.bodyBounds;bounds.minX=x-width/2;bounds.maxX=x+width/2;
 }
}

// Automatic closing waits for bodies to clear the actual threshold, not the
// entire surrounding corridor. Calling / arriving leaves time to enter.
export function liftAutoClose(lift,dt,player,actors=[],floor=0){
 const inside=Math.abs(player.x-lift.x)<1.05&&player.z<lift.faceZ-.3&&player.z>lift.faceZ-2.5;
 const threshold=p=>Math.abs(p.x-lift.x)<1.5&&Math.abs(p.z-lift.faceZ)<.65;
 const occupied=threshold(player)||actors.some(n=>n.floor===floor&&!n.dead&&!n.evacuated&&threshold(n.pos));
 if(inside||occupied){lift.closeTimer=1.5;return inside;}
 if(lift.open){lift.closeTimer=(lift.closeTimer??3.5)-dt;if(lift.closeTimer<=0){lift.open=false;lift.choosing=false;lift.selectionUsed=false;}}
 return inside;
}
