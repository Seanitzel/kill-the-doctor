import * as T from "three";
import { mesh, sign } from "./assets.js";
// Explicit physical landings: stairs never bypass the restricted basement gate.
export const STAIR_UP = { x: -30, z: -17.2 },
  STAIR_DOWN = { x: -33, z: -17.2 };
export function addStairwell(group, batch, m, layout) {
  if (!layout.expanded || layout.floor > 2) return;
  const base = new T.Group();
  base.name = "Public stairwell connecting three floors";
  group.add(base);
  const flight = (offset) => {
    for (let i = 0; i < 10; i++) {
      batch.box(
        m.steel,
        -30,
        offset + 0.09 + i * 0.18,
        -18 - i * 0.4,
        2.05,
        0.18,
        0.42,
      );
      batch.box(
        m.steel,
        -33,
        offset + 1.89 + i * 0.18,
        -21.6 + i * 0.4,
        2.05,
        0.18,
        0.42,
      );
    }
    batch.box(m.floor, -31.5, offset + 1.78, -22.2, 5.1, 0.16, 1);
    for (const x of [-34.1, -31.9, -31.1, -28.9]) {
      for (const i of [0, 3, 6, 9]) {
        const z = x < -31.5 ? -21.6 + i * 0.4 : -18 - i * 0.4,
          y = offset + (x < -31.5 ? 1.8 : 0) + i * 0.18;
        batch.box(m.steel, x, y + 0.6, z, 0.045, 1.15, 0.045);
      }
      const rail = mesh(
        "box",
        m.steel,
        [0.055, 0.06, 4.5],
        [x, offset + (x < -31.5 ? 3.16 : 1.36), -19.8],
        base,
      );
      rail.rotation.x = x < -31.5 ? -0.423 : 0.423;
    }
  };
  if (layout.floor < 2) flight(0);
  if (layout.floor > 0) flight(-3.6);
  const label = sign(
    "STAIRS",
    `${layout.floor < 2 ? "↑ UP  " : ""}${layout.floor > 0 ? "↓ DOWN" : ""} · PUBLIC FLOORS`,
    2.4,
    0.45,
  );
  label.position.set(-29, 2.5, -16.7);
  label.rotation.y = Math.PI;
  group.add(label);
  if (layout.floor < 2)
    layout.stairLinks.push({
      ...STAIR_UP,
      type: "stairs",
      destination: layout.floor + 1,
      direction: 1,
      label: "Walk upstairs · " + (layout.floor + 1),
    });
  if (layout.floor > 0)
    layout.stairLinks.push({
      ...STAIR_DOWN,
      type: "stairs",
      destination: layout.floor - 1,
      direction: -1,
      label: "Walk downstairs · " + (layout.floor - 1),
    });
}
export function beginStairs(e, item) {
  if (
    e.stairTravel ||
    !e.levels[e.floor].expanded ||
    !e.levels[e.floor].stairLinks.some(
      (s) => s.destination === item.destination,
    ) ||
    Math.hypot(e.playerPos.x - item.x, e.playerPos.z - item.z) > 2.5
  )
    return false;
  e.keys.clear();
  e.resetTouch();
  e.aiming = false;
  e.stairTravel = {
    destination: item.destination,
    direction: item.direction,
    age: 0,
  };
  e.notify(item.direction > 0 ? "Walking upstairs…" : "Walking downstairs…");
  return true;
}
export function advanceStairs(e, dt) {
  const s = e.stairTravel;
  if (!s) return false;
  s.age += dt;
  const t = Math.min(1, s.age / 3.2),
    forward = s.direction > 0 ? t : 1 - t;
  let x, z, y;
  if (forward < 0.43) {
    const f = forward / 0.43;
    x = -30;
    z = T.MathUtils.lerp(-17.2, -22, f);
    y = 1.8 * f;
  } else if (forward < 0.57) {
    const f = (forward - 0.43) / 0.14;
    x = T.MathUtils.lerp(-30, -33, f);
    z = -22;
    y = 1.8;
  } else {
    const f = (forward - 0.57) / 0.43;
    x = -33;
    z = T.MathUtils.lerp(-22, -17.2, f);
    y = 1.8 + 1.8 * f;
  }
  if (s.direction < 0) y -= 3.6;
  e.playerPos.set(x, y, z);
  e.player.root.position.copy(e.playerPos);
  e.player.root.rotation.y =
    s.direction > 0
      ? forward < 0.43
        ? Math.PI
        : forward < 0.57
          ? -Math.PI / 2
          : 0
      : forward > 0.57
        ? Math.PI
        : forward > 0.43
          ? Math.PI / 2
          : 0;
  e.playerSpeed = 1.6;
  e.player.animate?.(e.time, 1.6, dt);
  if (t === 1) {
    const p = s.direction > 0 ? STAIR_DOWN : STAIR_UP;
    e.setFloor(s.destination);
    e.playerPos.set(p.x, 0, p.z);
    e.player.root.position.copy(e.playerPos);
    e.yaw = s.direction > 0 ? 0 : Math.PI;
    e.stairTravel = null;
    e.hooks.transition?.();
    e.updateCamera(0.2, true);
    e.notify(`Floor ${e.floor} · stairs landing`);
    e.emitHUD();
  }
  return true;
}
