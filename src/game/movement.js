export function advanceSprint(state,{requested,moving,allowed=true}){return {running:!!(requested&&moving&&allowed),stamina:state.maxStamina||100,sprintExhausted:false,sprintReleased:true};}
export function animationFootfalls(time,dt,rate,duration){
  if(!(duration>0)||!(rate>0)||!(dt>0))return 0;
  const half=duration/2;
  return Math.min(2,Math.max(0,Math.floor((time+dt*rate)/half)-Math.floor(time/half)));
}
