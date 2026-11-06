import { complicityFor } from "./security-rules.js";
import * as T from "three";
import { mesh, material } from "./assets.js";
import { weaponModel } from "./gear.js";
import { disposeObjectResources } from "./resources.js";
import { footprint } from "./collision.js";
import { tileAt, key } from "./layout.js";
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const HIDDEN_BONUS = 60;
export const ATTACKS = Object.freeze({
  gun: {
    range: 12,
    windup: 2.2,
    label: "Accomplice aiming · take cover!",
    reason: "An armed accomplice shot you.",
  },
  syringe: {
    range: 1.6,
    windup: 1.35,
    label: "Syringe raised · back away!",
    reason: "An accomplice incapacitated you with a fictional injection.",
  },
  gas: {
    range: 3.2,
    windup: 1.8,
    label: "Sleeping-gas sprayer charging · move out of range!",
    reason:
      "A masked accomplice incapacitated you with fictional sleeping gas.",
  },
  spray: {
    range: 2.4,
    windup: 1.25,
    label: "Short-range gas jet · dodge sideways!",
    reason: "An accomplice caught you in a fictional gas jet.",
  },
});
export function threatKind(index) {
  return index % 5 < 2
    ? "gun"
    : index % 5 === 2
      ? "syringe"
      : index % 5 === 3
        ? "gas"
        : "spray";
}
export class EscapeThreats {
  constructor(e) {
    this.e = e;
    this.enabled = e.mission.round >= 5 && !e.mission.photoOnly;
    this.entries = [];
    this.spots = [];
    this.root = new T.Group();
    this.root.name = "Optional escape threats";
    e.scene.add(this.root);
    this.colliders = [];
    if (this.enabled) {
      const pool = e.npcs.filter(
        (n) =>
          !n.dead &&
          n.id !== "target" &&
          !n.operationDoctor &&
          !n.recruit &&
          ["doctor", "nurse"].includes(n.role),
      );
      for (const n of pool) n.complicity ||= complicityFor(n);
      let count = pool.filter((n) => n.complicity).length;
      const available = pool.filter((n) => !n.complicity);
      while (count < 5 && available.length) {
        const n = available.splice(
          Math.floor(e.mission.random() * available.length),
          1,
        )[0];
        n.complicity = "Linked to the fictional case";
        count++;
      }
      this.makeSpots();
    }
  }
  roomAt(pos, floor) {
    const l = this.e.levels[floor],
      cell = tileAt(pos.x, pos.z);
    return l.rooms.find((r) => r.id === l.cells.get(key(cell.x, cell.z))?.room);
  }
  makeSpots() {
    const e = this.e;
    for (let floor = 0; floor < 3; floor++) {
      const h = e.hospitals[floor],
        nav = e.systems.navigationFor(floor);
      for (const w of h.workstations) {
        const room = e.levels[floor].rooms.find((r) => r.id === w.room);
        if (!room || !["office", "clinic", "lab"].includes(room.kind)) continue;
        this.addSpot(
          floor,
          room,
          "desk",
          {
            x: w.x + Math.cos(w.rotation) * 0.82,
            z: w.z - Math.sin(w.rotation) * 0.82,
          },
          w.rotation + Math.PI / 2,
          {
            x: w.x + Math.sin(w.rotation) * 1.1,
            z: w.z + Math.cos(w.rotation) * 1.1,
          },
        );
      }
      for (const c of h.colliders.filter((c) => c.type === "bed")) {
        const x = (c.minX + c.maxX) / 2,
          z = (c.minZ + c.maxZ) / 2,
          across = c.maxX - c.minX > c.maxZ - c.minZ,
          room = this.roomAt({ x, z }, floor);
        if (room)
          this.addSpot(
            floor,
            room,
            "bed",
            { x: x + (across ? 0.82 : 0), z: z + (across ? 0 : 0.82) },
            across ? Math.PI / 2 : 0,
            { x: x + (across ? 0 : 1.1), z: z + (across ? 1.1 : 0) },
          );
      }
      for (const bathroom of h.bathrooms)
        for (const p of bathroom.anchors.toilets)
          this.addSpot(floor, bathroom.room, "stall", p, p.yaw, p);
      const room =
        e.levels[floor].rooms.find((r) => r.kind === "office") ||
        e.levels[floor].rooms.find((r) => r.kind === "utility");
      if (!room) continue;
      const candidates = [...nav.nodes.values()].filter(
        (n) =>
          this.roomAt(n.point, floor)?.id === room.id &&
          e.canStand(n.point.x, n.point.z, 0.8, floor),
      );
      const p = candidates.sort(
        (a, b) =>
          distance(b.point, room.center) - distance(a.point, room.center),
      )[0]?.point;
      if (p) {
        const cabinet = new T.Group();
        cabinet.name = "Searchable staff hiding cupboard";
        cabinet.position.set(p.x, 0, p.z);
        cabinet.userData.floor = floor;
        this.root.add(cabinet);
        const shell = material("#79909b"),
          inside = material("#304856");
        for (const side of [-1, 1])
          mesh("box", shell, [0.07, 2.05, 0.8], [side * 0.6, 1.03, 0], cabinet);
        for (const y of [0.04, 2.05])
          mesh("box", shell, [1.25, 0.07, 0.8], [0, y, 0], cabinet);
        mesh("box", inside, [1.25, 2, 0.07], [0, 1.03, -0.4], cabinet);
        const door = new T.Group();
        door.position.set(-0.59, 0, 0.43);
        cabinet.add(door);
        mesh("box", shell, [1.18, 1.96, 0.06], [0.59, 1.03, 0], door);
        mesh(
          "box",
          material("#c7d2d5"),
          [0.04, 0.22, 0.05],
          [1.05, 1.07, 0.06],
          door,
        );
        const c = footprint(p.x, p.z, 1.3, 0.88, 2.1, 0, "hiding-cupboard");
        h.colliders.push(c);
        this.colliders.push({ floor, c });
        const spot = this.addSpot(floor, room, "cupboard", p, 0, {
          x: p.x,
          z: p.z + 1.15,
        });
        if (spot) {
          spot.door = door;
          spot.cabinet = cabinet;
        }
        e.systems.navigation[floor] = null;
      }
    }
  }
  addSpot(floor, room, kind, point, yaw, approach) {
    const nav = this.e.systems.navigationFor(floor),
      node = nav.nearest(approach);
    if (!node) return null;
    const spot = {
      id: `${floor}-${kind}-${this.spots.length}`,
      floor,
      room,
      kind,
      point: { x: point.x, z: point.z },
      yaw,
      approach: { ...node.point },
      occupied: null,
    };
    this.spots.push(spot);
    return spot;
  }
  start(actors) {
    if (this.started) return;
    this.started = true;
    const e = this.e;
    for (const [i, n] of actors.entries()) {
      n.accompliceHeld = false;
      n.reporting = null;
      if (!this.enabled) {
        this.run(n);
        continue;
      }
      const entry = { n, kind: threatKind(i), phase: "runner", nextRoute: 0 };
      n.escapeThreat = entry;
      this.entries.push(entry);
      this.makeWeapon(entry);
      if (i % 3 !== 0 && !n.operationDoctor && this.chooseSpot(entry)) continue;
      this.run(n);
    }
  }
  run(n) {
    n.hiding = false;
    n.accompliceHeld = false;
    n.lying = false;
    n.seated = false;
    n.baselineY = 0;
    n.pos.y = 0;
    n.visual.root.rotation.x = 0;
    n.visual.root.rotation.z = 0;
    n.activity = null;
    n.evacuating = true;
    n.evacLane = (this.e.mission.random() - 0.5) * 2;
    n.evacGoal = n.floor ? { x: 0, z: -24 } : { x: n.evacLane, z: 39 };
    n.evacSpeed = 2.7 + this.e.mission.random();
    this.e.systems.route(n, n.evacGoal);
  }
  chooseSpot(entry, exclude = null) {
    const e = this.e,
      n = entry.n,
      pool = this.spots
        .filter((s) => s.floor === n.floor && !s.occupied && s.room !== exclude)
        .sort(
          (a, b) => distance(n.pos, a.approach) - distance(n.pos, b.approach),
        )
        .slice(0, 6);
    if (!pool.length) return false;
    const spot = pool[Math.floor(e.mission.random() * pool.length)];
    entry.spot = spot;
    spot.occupied = n;
    entry.phase = "seeking";
    entry.nextRoute = 0;
    n.evacuating = false;
    n.activity = null;
    n.hiding = false;
    n.wasHidden = true;
    n.bonusValue = HIDDEN_BONUS;
    this.e.routeNPC(n, spot.approach);
    return true;
  }
  makeWeapon(entry) {
    const n = entry.n,
      g = new T.Group();
    g.name = `Accomplice ${entry.kind}`;
    n.visual.root.add(g);
    entry.prop = g;
    if (entry.kind === "gun") g.add(weaponModel("pistol"));
    else if (entry.kind === "syringe") {
      mesh(
        "cylinder",
        material("#d7e2e3"),
        [0.014, 0.15, 0.014],
        [0, 0, 0.04],
        g,
      ).rotation.x = Math.PI / 2;
      mesh(
        "cylinder",
        material("#637f92"),
        [0.003, 0.1, 0.003],
        [0, 0, 0.16],
        g,
      ).rotation.x = Math.PI / 2;
    } else {
      mesh("cylinder", material("#53677e"), [0.035, 0.16, 0.035], [0, 0, 0], g);
      mesh("box", material("#223645"), [0.04, 0.035, 0.16], [0, 0.08, 0.08], g);
      const mask = mesh(
        "sphere",
        material("#a1b4ae"),
        [0.08, 0.04, 0.035],
        [0, 0, 0.11],
        n.visual.head || g,
      );
      mask.name = "Accomplice protective gas mask";
      entry.mask = mask;
      const geometry = new T.BufferGeometry();
      geometry.setAttribute(
        "position",
        new T.Float32BufferAttribute(new Float32Array(36), 3),
      );
      entry.cloud = new T.Points(
        geometry,
        new T.PointsMaterial({
          color: entry.kind === "gas" ? "#b8a5db" : "#7cc4c8",
          size: 0.22,
          transparent: true,
          opacity: 0.38,
          depthWrite: false,
        }),
      );
      entry.cloud.frustumCulled = false;
      entry.cloud.visible = false;
      this.root.add(entry.cloud);
    }
    g.visible = false;
  }
  interactions() {
    if (!this.e.mission.targetDown) return [];
    return this.entries
      .filter(
        (a) => a.phase === "hidden" && !a.n.dead && a.n.floor === this.e.floor,
      )
      .map((a) => ({
        type: "threat-search",
        id: a.n.id,
        x: a.spot.approach.x,
        z: a.spot.approach.z,
        label: `Search ${a.spot.kind === "stall" ? "bathroom stall" : a.spot.kind === "bed" ? "under patient bed" : a.spot.kind === "desk" ? "under office desk" : "cupboard"}`,
      }));
  }
  interact(item) {
    const entry = this.entries.find((a) => a.n.id === item.id);
    if (
      !entry ||
      entry.phase !== "hidden" ||
      entry.n.floor !== this.e.floor ||
      distance(this.e.playerPos, entry.spot.approach) > 2.5
    )
      return false;
    this.reveal(entry);
    return true;
  }
  reveal(a) {
    const n = a.n,
      s = a.spot;
    if (!s) return;
    a.phase = "emerging";
    a.emergeAt = this.e.mission.elapsed;
    a.from = { x: n.pos.x, y: n.pos.y, z: n.pos.z };
    n.hiding = false;
    n.lying = false;
    n.seated = false;
    n.activity = "rest";
    n.path = [];
    if (s.door) s.open = true;
    this.e.notify("Hidden accomplice found · watch their hands!", "danger");
  }
  prepare(n) {
    const a = n.escapeThreat;
    if (!this.enabled || !a || n.dead || !this.e.mission.targetDown)
      return false;
    if (a.attack) {
      n.activity = "guard-aim";
      n.path = [];
      return true;
    }
    if (["hidden", "emerging"].includes(a.phase)) {
      n.path = [];
      n.activity = "rest";
      return true;
    }
    if (a.phase === "seeking") {
      const now = this.e.mission.elapsed;
      if (distance(n.pos, a.spot.approach) < 0.35) {
        a.phase = "hidden";
        n.hiding = true;
        n.lying = ["desk", "bed"].includes(a.spot.kind);
        n.seated = a.spot.kind === "stall";
        n.pos.set(
          a.spot.point.x,
          n.lying ? 0.22 : n.seated ? -0.38 : 0,
          a.spot.point.z,
        );
        n.baselineY = n.pos.y;
        n.visual.root.rotation.set(n.lying ? -Math.PI / 2 : 0, a.spot.yaw, 0);
        n.activity = "rest";
        n.path = [];
        return true;
      }
      n.activity = null;
      n.speed = 2.2;
      if (now >= a.nextRoute) {
        this.e.routeNPC(n, a.spot.approach);
        a.nextRoute = now + 2;
      }
      return true;
    }
    return false;
  }
  seen(a) {
    const n = a.n,
      e = this.e;
    return (
      n.floor === e.floor &&
      !n.dead &&
      !n.evacuated &&
      e.lineOfSight(n.pos, e.playerPos, n.floor)
    );
  }
  update(dt) {
    const e = this.e,
      now = e.mission.elapsed;
    if (e.mission.targetDown && !this.started)
      this.start(
        e.npcs.filter(
          (n) =>
            n.id !== "target" &&
            n.complicity &&
            !n.dead &&
            !n.evacuated &&
            !["security", "police"].includes(n.role),
        ),
      );
    for (const s of this.spots)
      if (s.door)
        s.door.rotation.y = T.MathUtils.damp(
          s.door.rotation.y,
          s.open ? -1.7 : 0,
          6,
          dt,
        );
    for (const child of this.root.children)
      if (child.userData.floor !== undefined)
        child.visible = child.userData.floor === e.floor;
    for (const a of this.entries) {
      const n = a.n;
      if (n.dead || n.evacuated) {
        if (a.prop) a.prop.visible = false;
        if (a.cloud) a.cloud.visible = false;
        if (a.spot) a.spot.occupied = null;
        continue;
      }
      if (a.phase === "hidden") {
        const inRoom =
          n.floor === e.floor &&
          this.roomAt(e.playerPos, e.floor)?.id === a.spot.room.id;
        if (inRoom) {
          a.visitedAt ??= now;
          if (
            a.spot.kind !== "cupboard" &&
            distance(e.playerPos, a.spot.approach) < 1.7 &&
            this.seen(a) &&
            (a.spot.kind === "stall" || e.crouched)
          )
            this.reveal(a);
        } else if (a.visitedAt !== undefined && now - a.visitedAt > 2) {
          const old = a.spot;
          this.reveal(a);
          a.relocateFrom = old.room;
        }
        continue;
      }
      if (a.phase === "emerging") {
        const t = Math.min(1, (now - a.emergeAt) / 0.8),
          s = a.spot;
        n.pos.set(
          T.MathUtils.lerp(a.from.x, s.approach.x, t),
          T.MathUtils.lerp(a.from.y, 0, t),
          T.MathUtils.lerp(a.from.z, s.approach.z, t),
        );
        n.visual.root.rotation.x *= 1 - t;
        n.visual.root.rotation.z = 0;
        if (t === 1) {
          s.occupied = null;
          s.open = false;
          a.phase = "runner";
          a.spot = null;
          n.baselineY = 0;
          if (a.relocateFrom && this.chooseSpot(a, a.relocateFrom)) {
            a.relocateFrom = null;
          } else this.run(n);
        }
        continue;
      }
      const attack = ATTACKS[a.kind],
        d = distance(n.pos, e.playerPos),
        visible = this.seen(a);
      if (
        !a.attack &&
        visible &&
        d < attack.range &&
        now >= (a.cooldown || 0)
      ) {
        a.attack = { at: now, origin: { x: e.playerPos.x, z: e.playerPos.z } };
        n.evacuating = false;
        n.activity = "guard-aim";
        n.path = [];
        e.notify(attack.label, "danger");
        e.audio.sound("gasp");
      }
      if (a.attack) {
        if (!visible || d > attack.range + 1) {
          a.attack = null;
          a.cooldown = now + 2;
          this.run(n);
          continue;
        }
        const age = now - a.attack.at;
        if (a.cloud) {
          a.cloud.visible = age > attack.windup - 0.6 && n.floor === e.floor;
          const p = a.cloud.geometry.attributes.position,
            dx = e.playerPos.x - n.pos.x,
            dz = e.playerPos.z - n.pos.z,
            length = Math.max(0.01, Math.hypot(dx, dz));
          for (let i = 0; i < 12; i++) {
            const f = ((age * 0.8 + i / 12) % 1) * attack.range;
            p.setXYZ(
              i,
              n.pos.x + (dx / length) * f + Math.sin(i * 3 + now) * 0.12,
              1.3 + Math.sin(i + now) * 0.14,
              n.pos.z + (dz / length) * f,
            );
          }
          p.needsUpdate = true;
        }
        if (age >= attack.windup) {
          if (a.kind === "gun") e.audio.sound("shot");
          const dodged =
            a.kind === "syringe"
              ? d > 1.25
              : a.kind === "gun"
                ? distance(e.playerPos, a.attack.origin) > 1.15
                : d > attack.range ||
                  distance(e.playerPos, a.attack.origin) > 0.95;
          if (!dodged) {
            e.mission.finish(
              false,
              attack.reason + " Watch the warning and break line of sight.",
            );
            e.finish();
            return;
          }
          a.attack = null;
          a.cooldown = now + 3;
          if (a.cloud) a.cloud.visible = false;
          this.run(n);
        }
      }
    }
  }
  pose() {
    const e = this.e;
    for (const a of this.entries) {
      const n = a.n;
      if (n.dead || n.evacuated || n.floor !== e.floor) continue;
      if (a.phase === "hidden") {
        n.visual.poseActivity?.("rest", e.time);
        if (n.seated) n.visual.poseSeated?.(1);
        continue;
      }
      if (a.attack) {
        n.visual.root.rotation.y = Math.atan2(
          e.playerPos.x - n.pos.x,
          e.playerPos.z - n.pos.z,
        );
        n.visual.poseActivity?.(
          a.kind === "gun" ? "guard-aim" : "examine",
          e.time,
        );
      }
      a.prop.visible = !!a.attack;
      if (a.prop.visible && n.visual.hand) {
        n.visual.root.updateMatrixWorld(true);
        n.visual.hand.getWorldPosition((this.grip ??= new T.Vector3()));
        a.prop.position.copy(n.visual.root.worldToLocal(this.grip));
        a.prop.position.z += 0.05;
      }
    }
  }
  tracking() {
    const e = this.e;
    if (!e.mission.targetDown) return [];
    const guards = e.npcs.filter(
      (n) => n.role === "security" && !n.dead && !n.evacuated,
    );
    if (guards.length)
      return guards.map((n) => ({
        id: n.id,
        kind: "security",
        floor: n.floor,
        x: n.pos.x,
        z: n.pos.z,
        label: "Security",
      }));
    return e.npcs
      .filter(
        (n) => n.complicity && n.id !== "target" && !n.dead && !n.evacuated,
      )
      .map((n) => {
        const a = n.escapeThreat,
          room = a?.phase === "hidden" ? a.spot.room : null;
        return {
          id: n.id,
          kind: room ? "hidden" : "accomplice",
          floor: n.floor,
          x: room ? room.center.x : n.pos.x,
          z: room ? room.center.z : n.pos.z,
          label: room ? `Search ${room.name}` : "Accomplice",
        };
      });
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const a of this.entries) {
      a.prop?.removeFromParent();
      disposeObjectResources(a.prop);
      a.mask?.removeFromParent();
      disposeObjectResources(a.mask);
      delete a.n.escapeThreat;
    }
    for (const { floor, c } of this.colliders) {
      const list = this.e.hospitals[floor].colliders,
        i = list.indexOf(c);
      if (i >= 0) list.splice(i, 1);
    }
    this.root.removeFromParent();
    disposeObjectResources(this.root);
    this.root.clear();
    this.entries = [];
    this.spots = [];
    this.colliders = [];
    this.e = null;
  }
}
