import * as T from "three";
// Borrows the office's cup. Geometry/material ownership remains with that office.
export class CoffeeSip {
  constructor(visual, cup, parent, desk) {
    this.visual = visual;
    this.cup = cup;
    this.parent = parent;
    this.desk = new T.Vector3(desk.x, desk.y, desk.z);
    this.target = new T.Vector3();
    this.rotation = new T.Quaternion();
    this.started = null;
  }
  update(active, time) {
    if (!this.cup) return;
    if (!active) {
      this.started = null;
      if (this.cup.parent !== this.parent) this.parent.attach(this.cup);
      this.cup.position.copy(this.desk);
      this.cup.rotation.set(0, 0, 0);
      return;
    }
    this.started ??= time;
    const age = time - this.started,
      pose = this.visual.poseDrinking?.(age);
    if (!pose) return;
    this.visual.root.updateMatrixWorld(true);
    if (this.cup.parent !== this.parent) this.parent.attach(this.cup);
    this.target.copy(pose.grip);
    this.parent.worldToLocal(this.target);
    this.target.y -= 0.025;
    this.target.z += 0.025;
    const pickup =
      T.MathUtils.smoothstep(age, 0, 0.45) *
      (1 - T.MathUtils.smoothstep(age, 4.5, 5));
    this.cup.position.copy(this.desk).lerp(this.target, pickup);
    this.cup.rotation.set(-pose.lift * 0.28, 0, 0);
  }
  dispose() {
    this.cup = null;
    this.visual = null;
    this.parent = null;
  }
}
