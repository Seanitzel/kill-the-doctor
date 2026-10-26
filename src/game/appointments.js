export const APPOINTMENT_MIN_SECONDS=120,APPOINTMENT_MAX_SECONDS=300,TARGET_PRIVACY_GRACE=30;
export class TargetAppointment {
  constructor(random=Math.random){const sample=Math.min(1,Math.max(0,Number(random())||0));this.duration=APPOINTMENT_MIN_SECONDS+Math.min(180,Math.floor(sample*181));this.startedAt=null;this.endsAt=null;this.completed=false;}
  start(now){if(this.startedAt!==null)return false;this.startedAt=now;this.endsAt=now+this.duration;return true;}
  update(now){if(this.startedAt===null||this.completed||now<this.endsAt)return false;this.completed=true;return true;}
  changeRemaining(now,factor){if(this.completed||this.startedAt===null||!Number.isFinite(factor)||factor<=0)return false;this.endsAt=now+Math.min(Number.MAX_SAFE_INTEGER-now,Math.max(1,(this.endsAt-now)*factor));return true;}
  interrupt(now){if(this.completed)return false;this.start(now);this.endsAt=now;return true;}
  remaining(now){return this.startedAt===null?this.duration:Math.max(0,Math.ceil(this.endsAt-now));}
}
