// Escalation follows continuous occupancy. Leaving cancels the grace period.
export class RoomPrivacy{
 constructor(){this.rooms=new Map();this.active=null;}
 enter(id,now,{warningDelay=5,reportDelay=10}={}){if(this.active===id)return null;this.leave();const s={entries:(this.rooms.get(id)?.entries||0)+1,warnings:1,enteredAt:now,warningDelay,reportDelay:Math.max(warningDelay,reportDelay),stage:'requested'};this.rooms.set(id,s);this.active=id;return 'request';}
 leave(){this.active=null;}
 update(id,now){if(!id||this.active!==id)return null;const s=this.rooms.get(id);if(!s)return null;const elapsed=now-s.enteredAt;if(s.warnings===1&&elapsed>=s.warningDelay){s.warnings=2;s.stage='warned';return 'warning';}if(s.warnings===2&&elapsed>=s.reportDelay){s.warnings=3;s.stage='reported';return 'security';}return null;}
 release(id){this.rooms.delete(id);if(this.active===id)this.active=null;}
 dispose(){this.rooms.clear();this.active=null;}
}
