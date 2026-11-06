import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  hospitalSim,
  advanceSim,
  disposeSim,
  withCanvas,
} from "./helpers/hospital-sim.js";
import {
  Mission,
  defaultSave,
  purchase,
  UPGRADE_INFO,
  upgradePrice,
  readSave,
  SAVE_KEY,
} from "../src/game/mission.js";
import { sodaFactor, HospitalExtras } from "../src/game/hospital-extras.js";
import {
  normalizeSavedColors,
  saveOutfitColor,
  removeOutfitColor,
} from "../src/game/saved-colors.js";
import { rng, makeLayout, FLOORS } from "../src/game/layout.js";
import { buildHospital } from "../src/game/hospital.js";
import { disposeHospital } from "../src/game/hospital-disposal.js";
import {
  EscapeThreats,
  ATTACKS,
  threatKind,
} from "../src/game/escape-threats.js";
import { PatientDetails } from "../src/game/patient-details.js";
import { ITCH_SECONDS, itchStrength } from "../src/game/skin-irritation.js";
import { EmergencyArrivals } from "../src/game/emergency-arrivals.js";
import { SecurityResponse } from "../src/game/security-response.js";
import { overlaps } from "../src/game/furniture-placement.js";
import {
  STAIR_UP,
  STAIR_DOWN,
  beginStairs,
  advanceStairs,
} from "../src/game/stairs.js";
import { EgressNavigation } from "../src/game/egress.js";
import { updateEntrance } from "../src/game/entrance.js";

test("soda uses independent 40/60 rolls with exact boundaries and the correct repeated distribution", () => {
  assert.deepEqual(
    [0, 0.399999, 0.4, 0.999999].map((x) => sodaFactor(() => x)),
    [2, 2, 0.5, 0.5],
  );
  const random = rng(9821);
  let slow = 0,
    fast = 0,
    maxRun = 0,
    run = 0,
    last;
  for (let i = 0; i < 100000; i++) {
    const f = sodaFactor(random);
    if (f === 2) slow++;
    else fast++;
    run = f === last ? run + 1 : 1;
    maxRun = Math.max(maxRun, run);
    last = f;
  }
  assert.ok(slow > 39000 && slow < 41000, `${slow} doubles`);
  assert.equal(slow + fast, 100000);
  assert.ok(maxRun < 35);
  const e = hospitalSim("nigeria");
  let extras;
  try {
    extras = withCanvas(() => new HospitalExtras(e));
    const samples = [0.2, 0.8],
      appointment = {
        startedAt: 0,
        completed: false,
        changeRemaining(_now, f) {
          this.factor = f;
          return true;
        },
      };
    e.life = { targetCase: { appointment } };
    e.player = { root: new T.Group() };
    e.mission.random = () => {
      throw Error("Map seed must not drive drinks");
    };
    extras.sodaRandom = () => samples.shift();
    extras.sodas = 2;
    assert.ok(extras.drink());
    assert.equal(appointment.factor, 2);
    assert.ok(extras.drink());
    assert.equal(appointment.factor, 0.5);
  } finally {
    extras?.dispose();
    disposeSim(e);
  }
});
test("five custom outfit colors replace defaults, survive saves, reject invalid data and can be removed", () => {
  const s = defaultSave();
  for (const c of ["#AABBCC", "#123456", "#223344", "#CC9944", "#EECCAA"])
    assert.ok(saveOutfitColor(s, c));
  assert.equal(s.savedOutfitColors.length, 5);
  assert.equal(saveOutfitColor(s, "#111111"), false);
  assert.ok(saveOutfitColor(s, "#aabbcc"));
  assert.equal(saveOutfitColor(s, "red"), false);
  const data = JSON.stringify(s),
    loaded = readSave({ getItem: (k) => (k === SAVE_KEY ? data : null) });
  assert.deepEqual(loaded.savedOutfitColors, s.savedOutfitColors);
  removeOutfitColor(loaded, "#aabbcc");
  assert.ok(saveOutfitColor(loaded, "#111111"));
  assert.equal(loaded.savedOutfitColors.length, 5);
  assert.deepEqual(
    normalizeSavedColors(["junk", "#112233", "#112233", {}, null]),
    ["#112233"],
  );
});
test("each upgrade price is 150 coins above the old tier, without altering owned upgrades", () => {
  const s = defaultSave();
  s.coins = 5000;
  for (const u of UPGRADE_INFO) {
    for (let level = 0; level < u.max; level++) {
      s.upgrades[u.id] = level;
      assert.equal(upgradePrice(s, u.id), (u.cost - 150) * (level + 1) + 150);
    }
  }
  s.upgrades.magazine = 0;
  const before = s.coins,
    cost = upgradePrice(s, "magazine");
  assert.ok(purchase(s, "magazine"));
  assert.equal(s.coins, before - cost);
  assert.equal(s.upgrades.magazine, 1);
});
test("France custodian stops rota notifications after collection and the first break begins promptly", () => {
  const e = hospitalSim("france");
  try {
    const c = e.covert;
    assert.ok(c.breakAt <= 18);
    e.mission.elapsed = 40;
    e.playerPos.set(0, 0, 30);
    c.documentTaken = true;
    c.phase = "complete";
    let messages = [];
    e.notify = (t) => messages.push(t);
    for (let i = 0; i < 8; i++) {
      e.mission.elapsed += 30;
      c.update();
    }
    assert.equal(
      messages.filter((t) =>
        /returning|bathroom break|custodian returned/i.test(t),
      ).length,
      0,
    );
    assert.equal(c.objective(), null);
  } finally {
    disposeSim(e);
  }
});
test("searched desk and cupboard drawers toggle closed and reopen without awarding contents twice", () => {
  const e = hospitalSim();
  try {
    const o = e.objectives.china,
      c = o.case;
    c.poisoned = c.sealed = c.badge = true;
    for (const d of o.drawers) {
      e.playerPos.set(d.x, 0, d.z);
      const i = { type: `china-drawer-${d.id}`, ...d };
      assert.ok(o.interact(i));
      assert.ok(d.opened && d.searched);
      assert.ok(
        o
          .interactions()
          .find((x) => x.type === `china-drawers-close-${d.kind}`),
      );
      assert.ok(o.interact(i));
      assert.equal(d.opened, false);
      assert.ok(o.interact(i));
      assert.equal(d.opened, true);
    }
  } finally {
    disposeSim(e);
  }
});
test("spit has a 1.5-second dodge warning, misses a sidestep and blocks movement for ten seconds on hit", () => {
  for (const dodge of [false, true]) {
    const e = hospitalSim("india");
    let p;
    try {
      e.npcs = [
        e.spawnNPC(
          { name: "Visitor" },
          "patient",
          0,
          { x: 0, z: 24 },
          null,
          "spitter",
        ),
      ];
      e.playerPos.set(0, 0, 25.8);
      e.lineOfSight = () => true;
      p = withCanvas(() => new PatientDetails(e));
      p.spitters = e.npcs;
      p.nextSpit = 0;
      e.mission.elapsed = 1;
      p.update(0.1);
      assert.ok(p.spit);
      assert.equal(e.itchUntil, undefined);
      assert.equal(p.spitWarningUntil, 2.5);
      if (dodge) e.playerPos.x = 1;
      for (let i = 0; i < 22; i++) {
        e.mission.elapsed += 0.1;
        p.update(0.1);
      }
      assert.equal((e.itchUntil || 0) > e.mission.elapsed, !dodge);
      if (!dodge) {
        assert.ok(e.itchUntil - e.mission.elapsed <= 10);
        assert.match(e.message, /10 seconds/);
      }
    } finally {
      p?.dispose();
      disposeSim(e);
    }
  }
  assert.equal(ITCH_SECONDS, 10);
  assert.equal(itchStrength(10), 0);
  assert.ok(itchStrength(8) > 0.9);
  assert.ok(itchStrength(0.1) < 0.01);
});
function threatWorld() {
  const e = hospitalSim("israel");
  e.npcs = [];
  e.playerPos.set(0, 0, 30);
  for (let i = 0; i < 5; i++) {
    const n = e.spawnNPC(
      { name: `Accomplice ${i}`, gender: "male" },
      "doctor",
      0,
      { x: 0, z: i * 2 },
      e.levels[0].rooms.find((r) => r.kind === "office"),
      `bad-${i}`,
    );
    n.complicity = "Fictional case";
  }
  const g = e.spawnNPC(
    { name: "Guard" },
    "security",
    0,
    { x: 0, z: 22 },
    null,
    "guard",
  );
  const threats = withCanvas(() => new EscapeThreats(e));
  e.escapeThreats = threats;
  e.mission.targetDown = true;
  e.mission.beginEscape();
  threats.update(0);
  return { e, threats, g };
}
test("security tracks live first; accomplices unlock only after all guards are defeated, with room-only hidden dots", () => {
  const { e, threats, g } = threatWorld();
  try {
    assert.ok(threats.enabled);
    assert.equal(threats.entries.length, 5);
    let dots = threats.tracking();
    assert.deepEqual(
      dots.map((d) => d.id),
      ["guard"],
    );
    g.pos.x = 3;
    assert.equal(threats.tracking()[0].x, 3);
    g.dead = true;
    dots = threats.tracking();
    assert.equal(dots.length, 5);
    const a = threats.entries.find((a) => a.phase === "seeking");
    assert.ok(a);
    a.n.pos.set(a.spot.approach.x, 0, a.spot.approach.z);
    threats.prepare(a.n);
    assert.equal(a.phase, "hidden");
    const dot = threats.tracking().find((d) => d.id === a.n.id);
    assert.equal(dot.kind, "hidden");
    assert.equal(dot.x, a.spot.room.center.x);
    assert.equal(dot.z, a.spot.room.center.z);
    assert.ok(threats.interactions().some((i) => i.id === a.n.id));
    assert.deepEqual(
      Array.from({ length: 5 }, (_, i) => threatKind(i)),
      ["gun", "gun", "syringe", "gas", "spray"],
    );
  } finally {
    threats.dispose();
    disposeSim(e);
  }
});
test("undiscovered hiders can relocate after a room visit, while ordinary staff are not hiding actors", () => {
  const { e, threats } = threatWorld();
  try {
    const a = threats.entries.find((a) => a.phase === "seeking");
    a.n.pos.set(a.spot.approach.x, 0, a.spot.approach.z);
    threats.prepare(a.n);
    const first = a.spot;
    first.kind = "cupboard";
    e.playerPos.set(first.room.center.x, 0, first.room.center.z);
    threats.update(0.1);
    assert.equal(a.phase, "hidden");
    e.mission.elapsed += 4;
    e.playerPos.set(0, 0, 30);
    threats.update(0.1);
    assert.equal(a.phase, "emerging");
    e.mission.elapsed += 1;
    threats.update(1);
    assert.equal(a.phase, "seeking");
    assert.notEqual(a.spot.room, first.room);
    assert.equal(first.occupied, null);
  } finally {
    threats.dispose();
    disposeSim(e);
  }
});
test("all four attack types telegraph, respect solid cover, allow a dodge, and fail immediately only on a hit", () => {
  for (const kind of Object.keys(ATTACKS))
    for (const dodge of [true, false]) {
      const { e, threats } = threatWorld();
      try {
        const a = threats.entries[0];
        a.kind = kind;
        a.phase = "runner";
        e.lineOfSight = () => true;
        e.playerPos.copy(a.n.pos).add(new T.Vector3(0, 0, 1));
        threats.update(0.1);
        assert.ok(a.attack, kind);
        assert.equal(e.mission.result, null);
        assert.match(e.message, /cover|Syringe|gas/);
        if (dodge) e.lineOfSight = () => false;
        e.mission.elapsed += ATTACKS[kind].windup + 0.01;
        threats.update(0.1);
        assert.equal(!!e.mission.result, !dodge, kind);
        if (!dodge) assert.equal(e.mission.result.success, false);
      } finally {
        threats.dispose();
        disposeSim(e);
      }
    }
});
test("escape with living security is successful; deadline still fails; hidden rewards are deduplicated", () => {
  const save = defaultSave();
  let m = new Mission(save, 800);
  m.targetDown = true;
  m.beginEscape();
  assert.equal(m.escape().success, true);
  m = new Mission(defaultSave(), 800);
  m.targetDown = true;
  m.beginEscape();
  m.tick(m.timer + 0.01);
  assert.equal(m.result.success, false);
  m = new Mission(defaultSave(), 800);
  m.targetDown = true;
  m.beginEscape();
  const n = {
    id: "hidden",
    role: "doctor",
    complicity: "case",
    wasHidden: true,
  };
  assert.equal(m.eliminate(n), true);
  assert.equal(m.eliminate(n), false);
  assert.equal(m.accompliceKills, 1);
  assert.equal(m.hiddenAccompliceKills, 1);
  assert.equal(m.accompliceBonus(), 60);
  assert.equal(
    m.escape().breakdown.find((r) => r.label === "Marked accomplices").coins,
    60,
  );
});
test("hiding attacks are absent before level five and every owned threat prop is released once", () => {
  const e = hospitalSim("france"),
    early = withCanvas(() => new EscapeThreats(e));
  assert.equal(early.enabled, false);
  assert.equal(early.spots.length, 0);
  early.dispose();
  disposeSim(e);
  const world = threatWorld();
  let count = 0;
  for (const a of world.threats.entries)
    a.prop.traverse((o) =>
      o.material?.addEventListener("dispose", () => count++),
    );
  world.threats.dispose();
  const after = count;
  world.threats.dispose();
  assert.equal(count, after);
  assert.ok(after > 0);
  assert.equal(
    world.e.hospitals[0].colliders.some((c) => c.type === "hiding-cupboard"),
    false,
  );
  disposeSim(world.e);
});
test("level-six layouts have a rear exit and real stairs on every public floor; landings traverse 0→1→2→1→0", () => {
  const e = hospitalSim("india");
  const old = e.hospitals;
  try {
    e.levels = FLOORS.map((_, i) =>
      makeLayout(i, e.mission.country.index, true),
    );
    e.hospitals = withCanvas(() =>
      e.levels.map((l) => buildHospital(l, e.materials, e.mission.country)),
    );
    assert.equal(e.levels[0].exits.length, 2);
    assert.equal(e.hospitals[0].entrances.length, 2);
    for (let f = 0; f < 3; f++) {
      assert.ok(
        e.hospitals[f].group.getObjectByName(
          "Public stairwell connecting three floors",
        ),
      );
      assert.ok(e.levels[f].stairLinks.length);
      const nav = new EgressNavigation(e.levels[f], e.hospitals[f].colliders);
      assert.ok(
        nav.route({ x: 0, z: 18 }, f === 2 ? STAIR_DOWN : STAIR_UP).length,
        `Floor ${f} stair access`,
      );
    }
    e.setFloor = (f) => (e.floor = f);
    e.updateCamera = () => {};
    e.player = { root: new T.Group(), animate() {} };
    e.keys = new Set();
    e.updateTorch = () => {};
    for (const dest of [1, 2, 1, 0]) {
      const link = e.levels[e.floor].stairLinks.find(
        (l) => l.destination === dest,
      );
      e.playerPos.set(link.x, 0, link.z);
      assert.ok(beginStairs(e, link));
      for (let i = 0; i < 65; i++) advanceStairs(e, 0.05);
      assert.equal(e.floor, dest);
      assert.equal(e.playerPos.y, 0);
      assert.equal(e.stairTravel, null);
    }
    const entrance = e.hospitals[0].entrances[1];
    updateEntrance(entrance, true, 10);
    assert.ok(
      entrance.leaves.every(
        (l) => Math.abs(l.position.x - entrance.center.x) > 4.4,
      ),
    );
  } finally {
    for (const h of e.hospitals) disposeHospital(h, e.materials);
    e.hospitals = old;
    disposeSim(e);
  }
});
test("ambulance turning lane misses every solid lamp and stretcher/arrival bed remain solid and bounded", () => {
  const e = hospitalSim("france");
  let a;
  try {
    e.npcs = [];
    e.playerPos.set(-20, 0, 0);
    a = withCanvas(() => new EmergencyArrivals(e));
    a.nextAt = 0;
    let bedChecked = false;
    for (let frame = 0; frame < 12000; frame++) {
      e.mission.elapsed += 0.05;
      e.time += 0.05;
      a.update(0.05);
      e.updateEnvironment(0.05);
      if (a.phase !== "idle")
        for (const c of e.hospitals[0].colliders.filter(
          (c) => c.type === "streetlamp",
        ))
          assert.equal(overlaps(a.vanCollider, c), false);
      if (a.phase === "transport") {
        const c = a.bedCollider;
        assert.ok(e.hospitals[0].colliders.includes(c));
        assert.equal(
          e.canStand((c.minX + c.maxX) / 2, (c.minZ + c.maxZ) / 2, 0.2, 0),
          false,
        );
        bedChecked = true;
      }
      if (a.phase === "idle" && a.events) break;
    }
    assert.ok(bedChecked);
    assert.equal(a.phase, "idle");
    assert.ok(a.admissionCollider);
    assert.ok(e.hospitals[0].colliders.includes(a.admissionCollider));
    a.dispose();
    assert.equal(
      e.hospitals[0].colliders.some((c) =>
        ["admitted-patient-bed", "emergency-stretcher", "ambulance"].includes(
          c.type,
        ),
      ),
      false,
    );
  } finally {
    a?.dispose();
    disposeSim(e);
  }
});
test("countdown rounds once and never displays sixty seconds", async () => {
  const { clockText } = await import("../src/game/time-format.js");
  assert.equal(clockText(599.99, true, 2), "10:00");
  assert.equal(clockText(60.01, true, 2), "01:01");
  assert.equal(clockText(59.01, true, 2), "01:00");
  assert.equal(clockText(-1, true, 2), "00:00");
  assert.equal(clockText(NaN), "0:00");
});
test("ambulance crew yields around a guard and a temporary blocking pedestrian instead of stalling", () => {
  const e = hospitalSim("france");
  let a, response;
  try {
    const guard = e.spawnNPC(
      {},
      "security",
      0,
      { x: 4, z: 37.4 },
      null,
      "security-0",
    );
    guard.outsideGuard = guard.stationary = true;
    response = withCanvas(() => new SecurityResponse(e));
    e.securityResponse = response;
    e.playerPos.set(-20, 0, 0);
    a = withCanvas(() => new EmergencyArrivals(e));
    a.nextAt = 0;
    let blocker,
      wasYielding = false;
    for (let frame = 0; frame < 6000; frame++) {
      e.mission.elapsed += 0.05;
      e.time += 0.05;
      a.update(0.05);
      if (!blocker && a.phase === "transport" && a.crew.position.z < 32) {
        const p = a.crew.position;
        blocker = e.spawnNPC(
          {},
          "patient",
          0,
          { x: p.x, z: p.z },
          null,
          "blocking-visitor",
        );
        blocker.stationary = true;
        blocker.activity = "rest";
      }
      e.updateNPCs(0.05);
      e.updateEnvironment(0.05);
      if (blocker?.emergencyYieldUntil > e.mission.elapsed) wasYielding = true;
      if (a.phase === "handover") break;
    }
    assert.ok(blocker && wasYielding);
    assert.equal(
      a.phase,
      "handover",
      `${a.phase} at ${a.crew?.position.toArray()}`,
    );
    assert.ok(
      Math.hypot(guard.guardStanding.x - 4.55, guard.guardStanding.z - 37.4) >
        3,
    );
  } finally {
    a?.dispose();
    response?.dispose();
    disposeSim(e);
  }
});

test("the actual doctor rigs lift the borrowed cup to the mouth and return it to the desk without owning it", async () => {
  const { realModel } = await import("./helpers/real-rig.js");
  const { makePlayer, disposeCharacterAssets } = await import(
    "../src/game/assets.js"
  );
  const { CoffeeSip } = await import("../src/game/coffee-sip.js");
  for (const gender of ["male", "female"]) {
    const assets = {
      [gender]: await realModel(gender === "male" ? "adrian" : "alex"),
      animations: {},
      sources: {},
      clipCache: {},
      clothCache: new Map(),
      appearanceCache: new Map(),
    };
    const avatar = makePlayer(
      assets,
      gender,
      { gender, skin: "#a87c5c" },
      "doctor",
    );
    const root = new T.Group(),
      cup = new T.Mesh(
        new T.CylinderGeometry(0.04, 0.035, 0.1),
        new T.MeshBasicMaterial(),
      );
    root.add(cup, avatar.root);
    const sip = new CoffeeSip(avatar, cup, root, { x: 0.3, y: 0.9, z: 0.2 });
    let disposals = 0;
    cup.geometry.addEventListener("dispose", () => disposals++);
    try {
      for (const yaw of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
        avatar.root.rotation.y = yaw;
        avatar.animate(0, 0, 0.3);
        sip.update(false, 0);
        sip.update(true, 10);
        assert.ok(
          cup.position.distanceTo(new T.Vector3(0.3, 0.9, 0.2)) < 0.001,
        );
        for (let i = 1; i <= 60; i++) {
          avatar.animate(i / 20, 0, 0.05);
          sip.update(true, 10 + i / 20);
        }
        avatar.root.updateMatrixWorld(true);
        const head = avatar.model
          .getObjectByName("Head")
          .getWorldPosition(new T.Vector3());
        assert.ok(cup.position.y > 1.35, `${gender}: cup must visibly rise`);
        assert.ok(
          cup.getWorldPosition(new T.Vector3()).distanceTo(head) < 0.3,
          `${gender}: cup reaches mouth`,
        );
        sip.update(true, 15);
        assert.ok(
          cup.position.distanceTo(new T.Vector3(0.3, 0.9, 0.2)) < 0.001,
        );
      }
      sip.dispose();
      assert.equal(disposals, 0);
      assert.equal(sip.visual, null);
    } finally {
      avatar.dispose();
      disposeCharacterAssets(assets);
      cup.geometry.dispose();
      cup.material.dispose();
    }
  }
});
