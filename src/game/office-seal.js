// Two independent game-clock deadlines; never exposed as a numerical countdown.
export class OfficeSeal{
 constructor(){this.collapsedAt=null;this.closedAt=null;this.lockedAt=null;this.failed=null;}
 collapse(now){this.collapsedAt=now;this.closedAt=this.lockedAt=null;this.failed=null;}
 update(now,{inside=false,closed=false,locked=false}={}){if(this.collapsedAt===null||this.failed||this.lockedAt!==null)return this.failed;if(this.closedAt===null){if(now-this.collapsedAt>=5&&!(inside&&closed&&now-this.collapsedAt<=5))return this.failed='close';if(inside&&closed)this.closedAt=now;}if(this.closedAt!==null){if(inside&&closed&&locked&&now-this.closedAt<=5){this.lockedAt=now;return null;}if(now-this.closedAt>=5)return this.failed='lock';}return null;}
 get stage(){return this.lockedAt!==null?'secured':this.closedAt!==null?'lock':this.collapsedAt!==null?'close':'waiting';}
}
