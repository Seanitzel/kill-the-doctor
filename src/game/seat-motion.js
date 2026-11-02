const smooth=t=>t*t*(3-2*t);
// One bounded transition shared by player seats and the security post.
export class SeatMotion{
 constructor(standing,seat){this.standing={x:standing.x,z:standing.z};this.seat={...seat};this.amount=0;this.target=1;this.done=false;}
 stand(){this.target=0;this.done=false;}
 update(dt){this.amount=Math.max(0,Math.min(1,this.amount+(this.target?1:-1)*Math.max(0,dt)/.85));this.done=this.amount===this.target;const t=smooth(this.amount);return {x:this.standing.x+(this.seat.x-this.standing.x)*t,z:this.standing.z+(this.seat.z-this.standing.z)*t,y:t?-.35*t:0,weight:t,lean:Math.sin(Math.PI*this.amount)*.24};}
}
