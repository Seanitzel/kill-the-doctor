import {tileAt,key} from './layout.js';

// Privacy follows the character's body at the real open doorway, rather than
// retaining an intrusion until the centre of its floor cell changes.
export function privacyRoomAt(layout,pos,radius=.3){
 const cell=tileAt(pos.x,pos.z),id=layout.cells.get(key(cell.x,cell.z))?.room,room=layout.rooms.find(r=>r.id===id);
 if(!room)return null;
 for(const d of layout.doors){
  if(d.room!==id||Math.abs(d.angle??(d.open?Math.PI/2:0))<.2)continue;
  const inward=Math.sign(room.center.z-d.z);
  if(Math.abs(pos.x-d.x)<=.86-radius&&(pos.z-d.z)*inward<=radius)return null;
 }
 return room;
}

// Escalation follows continuous occupancy. Leaving cancels the grace period.
export class RoomPrivacy{
 constructor(){this.rooms=new Map();this.active=null;}
 enter(id,now,{warningDelay=5,reportDelay=10}={}){if(this.active===id)return null;this.leave();const s={entries:(this.rooms.get(id)?.entries||0)+1,warnings:1,enteredAt:now,warningDelay,reportDelay:Math.max(warningDelay,reportDelay),stage:'requested'};this.rooms.set(id,s);this.active=id;return 'request';}
 leave(){this.active=null;}
 update(id,now){if(!id||this.active!==id)return null;const s=this.rooms.get(id);if(!s)return null;const elapsed=now-s.enteredAt;if(s.warnings===1&&elapsed>=s.warningDelay){s.warnings=2;s.warnedAt=now;s.stage='warned';return 'warning';}if(s.warnings===2&&now-s.warnedAt>=s.reportDelay-s.warningDelay){s.warnings=3;s.stage='reported';return 'security';}return null;}
 release(id){this.rooms.delete(id);if(this.active===id)this.active=null;}
 dispose(){this.rooms.clear();this.active=null;}
}
