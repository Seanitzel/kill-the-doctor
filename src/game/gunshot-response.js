// Sound uses the shot's world position, rather than the listener or camera.
export function shotResponse(distance,suppressed=false){
 const scale=suppressed?.45:1;
 return distance<=6*scale?'panic':distance<=18*scale?'alarm':distance<=45*scale?'suspicion':null;
}
