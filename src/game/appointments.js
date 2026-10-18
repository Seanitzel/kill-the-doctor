export const APPOINTMENT_MIN_SECONDS=180,APPOINTMENT_MAX_SECONDS=300,TARGET_PRIVACY_GRACE=30;
export class TargetAppointment {
  constructor(random=Math.random){const sample=Math.min(1,Math.max(0,Number(random())||0));this.duration=APPOINTMENT_MIN_SECONDS+Math.min(120,Math.floor(sample*121));this.startedAt=null;this.endsAt=null;this.completed=false;}
  start(now){if(this.startedAt!==null)return false;this.startedAt=now;this.endsAt=now+this.duration;return true;}
  update(now){if(this.startedAt===null||this.completed||now<this.endsAt)return false;this.completed=true;return true;}
  remaining(now){return this.startedAt===null?this.duration:Math.max(0,Math.ceil(this.endsAt-now));}
}
