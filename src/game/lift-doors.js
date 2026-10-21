// Slide the visible part into the jamb pocket. Nothing renders beyond the portal.
// Visual width and physical bounds always describe the same exposed door surface.
export function setLiftOpening(lift,amount){
 lift.amount=Math.max(0,Math.min(1,amount));
 for(const leaf of lift.leaves){
  const width=1.235*(1-lift.amount),x=lift.x+leaf.userData.side*(1.24-width/2);
  leaf.position.x=x;leaf.scale.x=width/1.235;leaf.visible=width>.0001;
  const bounds=leaf.userData.bodyBounds;bounds.minX=x-width/2;bounds.maxX=x+width/2;
 }
}
