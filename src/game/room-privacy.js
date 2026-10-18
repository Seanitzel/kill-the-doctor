// One state per occupied room, owned by the current mission. Time is game time,
// so pausing never advances a warning and leaving promptly cancels escalation.
export class RoomPrivacy {
  constructor(){this.rooms=new Map();this.active=null;}
  enter(id,now){
    if(this.active===id)return null;
    this.leave();
    const state=this.rooms.get(id)||{entries:0,stage:'new'};
    state.entries++;state.enteredAt=now;state.stage=state.entries>1?'reported':'requested';
    this.rooms.set(id,state);this.active=id;
    return state.stage==='reported'?'security':'request';
  }
  leave(){this.active=null;}
  update(id,now){
    if(!id||this.active!==id)return null;
    const state=this.rooms.get(id);if(!state)return null;
    const elapsed=now-state.enteredAt;
    if(state.stage==='requested'&&elapsed>=6){state.stage='warned';return 'warning';}
    if(state.stage==='warned'&&elapsed>=14){state.stage='reported';return 'security';}
    return null;
  }
  dispose(){this.rooms.clear();this.active=null;}
}
