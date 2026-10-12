export function stickVector(dx, dy, radius = 48, deadZone = .12) {
  const length=Math.hypot(dx,dy),fraction=Math.min(1,length/radius);
  if(fraction<=deadZone)return {forward:0,strafe:0,x:0,y:0};
  const strength=(fraction-deadZone)/(1-deadZone),scale=Math.min(radius,length)/(length||1);
  return {forward:-dy/length*strength,strafe:dx/length*strength,x:dx*scale,y:dy*scale};
}
export function createTouchInput(){return {forward:0,strafe:0,sprint:false,crouch:false,shot:false};}
