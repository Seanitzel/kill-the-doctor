// One state per occupied room, owned by the current mission. Time is game time,
// so pausing never advances a warning and leaving promptly cancels escalation.
export class RoomPrivacy {
  constructor(){this.rooms=new Map();this.active=null;}
  enter(id,now,{warningDelay=6,reportDelay=14}={}){
    if(this.active===id)return null;
    this.leave();
    const state=this.rooms.get(id)||{entries:0,stage:'new'};
    state.entries++;state.enteredAt=now;state.warningDelay=warningDelay;state.reportDelay=Math.max(warningDelay,reportDelay);state.stage=state.entries>1?'reported':'requested';
    this.rooms.set(id,state);this.active=id;
    return state.stage==='reported'?'security':'request';
  }
  leave(){this.active=null;}
  update(id,now){
    if(!id||this.active!==id)return null;
    const state=this.rooms.get(id);if(!state)return null;
    const elapsed=now-state.enteredAt;
    if(state.stage==='requested'&&elapsed>=state.warningDelay){state.stage='warned';return 'warning';}
    if(state.stage==='warned'&&elapsed>=state.reportDelay){state.stage='reported';return 'security';}
    return null;
  }
  release(id){this.rooms.delete(id);if(this.active===id)this.active=null;}
  dispose(){this.rooms.clear();this.active=null;}
}
