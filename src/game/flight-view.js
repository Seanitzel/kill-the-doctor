import {Vector3,Quaternion} from 'three';
export const FLIGHT_TIMING=Object.freeze({lead:550,travel:5800,arrival:550});
const clamp=n=>Math.max(0,Math.min(1,n));
export function earthPoint(country){const lat=country.lat*Math.PI/180,lon=country.lon*Math.PI/180;return new Vector3(Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon));}
// Keep both locations on the visible hemisphere with geographic north facing up.
// The texture and location markers share this transform, so pins remain geographic.
export function flightView(from,to){
  const a=earthPoint(from),b=earthPoint(to),middle=a.clone().add(b).normalize();
  if(middle.lengthSq()<.01)middle.copy(a.clone().cross(new Vector3(0,1,0)).normalize());
  const facing=new Quaternion().setFromUnitVectors(middle,new Vector3(0,0,1));
  const north=new Vector3(0,1,0).applyQuaternion(facing),roll=new Quaternion().setFromAxisAngle(new Vector3(0,0,1),Math.PI/2-Math.atan2(north.y,north.x));
  const orientation=roll.multiply(facing),project=p=>{const v=p.clone().applyQuaternion(orientation);return{x:500+v.x*420,y:500-v.y*420,z:v.z};};
  const departure=project(a),arrival=project(b),span=Math.hypot(arrival.x-departure.x,arrival.y-departure.y);
  const bend=Math.max(64,Math.min(150,span*.3)),dx=arrival.x-departure.x,dy=arrival.y-departure.y;
  const control={x:(departure.x+arrival.x)/2+dy/Math.max(1,span)*bend,y:(departure.y+arrival.y)/2-dx/Math.max(1,span)*bend};
  const point=t=>{t=clamp(t);const s=1-t;return{x:s*s*departure.x+2*s*t*control.x+t*t*arrival.x,y:s*s*departure.y+2*s*t*control.y+t*t*arrival.y};};
  const bearing=t=>{const x=2*(1-t)*(control.x-departure.x)+2*t*(arrival.x-control.x),y=2*(1-t)*(control.y-departure.y)+2*t*(arrival.y-control.y);return Math.atan2(y,x)*180/Math.PI;};
  return {orientation,departure,arrival,point,bearing,planeSize:Math.max(30,Math.min(70,span*.25)),path:`M${departure.x},${departure.y}Q${control.x},${control.y} ${arrival.x},${arrival.y}`};
}
// One visible-time clock owns both the plane position and the arrival/finish events.
export class FlightClock{
  constructor(){this.elapsed=0;this.last=null;this.arrived=false;this.finished=false;}
  step(now,visible=true){
    if(!visible){this.last=null;return this.state();}
    if(this.last!==null)this.elapsed+=Math.max(0,now-this.last);this.last=now;
    return this.state();
  }
  state(){const progress=clamp((this.elapsed-FLIGHT_TIMING.lead)/FLIGHT_TIMING.travel);const arrive=progress===1&&!this.arrived,finish=this.elapsed>=Object.values(FLIGHT_TIMING).reduce((a,b)=>a+b,0)&&!this.finished;if(arrive)this.arrived=true;if(finish)this.finished=true;return {progress,arrive,finish};}
}
