export function advanceSprint(state,{dt,requested,moving,allowed=true}){
  const max=state.maxStamina||100;
  let exhausted=!!state.sprintExhausted,released=state.sprintReleased!==false;
  let stamina=Math.max(0,Math.min(max,state.stamina));
  if(!requested)released=true;
  if(exhausted&&released&&stamina>=max*.25)exhausted=false;
  const running=!!(requested&&moving&&allowed&&!exhausted&&stamina>0);
  stamina=Math.max(0,Math.min(max,stamina+dt*(running?-17:23)));
  if(running&&stamina===0){exhausted=true;released=false;}
  return {running,stamina,sprintExhausted:exhausted,sprintReleased:released};
}
export function animationFootfalls(time,dt,rate,duration){
  if(!(duration>0)||!(rate>0)||!(dt>0))return 0;
  const half=duration/2;
  return Math.min(2,Math.max(0,Math.floor((time+dt*rate)/half)-Math.floor(time/half)));
}
