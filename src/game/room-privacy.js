// Warnings belong to the appointment, not the doorway. Leaving stops timed
// escalation; returning does not erase warnings already given in this room.
export class RoomPrivacy{
 constructor(){this.rooms=new Map();this.active=null;}
 enter(id,now,{warningDelay=30,reportDelay=60}={}){if(this.active===id)return null;this.leave();const s=this.rooms.get(id)||{entries:0,warnings:0};s.entries++;s.warnings=Math.min(3,s.warnings+1);s.enteredAt=now;s.warningDelay=warningDelay;s.reportDelay=Math.max(warningDelay,reportDelay);s.stage=['new','requested','warned','reported'][s.warnings];this.rooms.set(id,s);this.active=id;return['','request','warning','security'][s.warnings];}
 leave(){this.active=null;}
 update(id,now){if(!id||this.active!==id)return null;const s=this.rooms.get(id);if(!s)return null;const elapsed=now-s.enteredAt;if(s.warnings===1&&elapsed>=s.warningDelay){s.warnings=2;s.stage='warned';return'warning';}if(s.warnings===2&&elapsed>=(s.entries>1?s.warningDelay:s.reportDelay)){s.warnings=3;s.stage='reported';return'security';}return null;}
 release(id){this.rooms.delete(id);if(this.active===id)this.active=null;}
 dispose(){this.rooms.clear();this.active=null;}
}
