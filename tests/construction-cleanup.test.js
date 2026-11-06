import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { GameEngine } from "../src/game/engine.js";
function fixture(stage) {
  const owned = {
    disposed: 0,
    lost: 0,
    removed: 0,
    loops: [],
    added: [],
    removedEvents: [],
  };
  const canvas = {
    setAttribute() {},
    remove() {
      owned.removed++;
    },
    addEventListener(n) {
      owned.added.push(n);
    },
    removeEventListener(n) {
      owned.removedEvents.push(n);
    },
  };
  const renderer = {
    domElement: canvas,
    shadowMap: {},
    setPixelRatio() {},
    setAnimationLoop(v) {
      owned.loops.push(v);
    },
    renderLists: { dispose() {} },
    dispose() {
      owned.disposed++;
    },
    forceContextLoss() {
      owned.lost++;
    },
  };
  class Broken extends GameEngine {
    createRenderer() {
      return renderer;
    }
    buildFloor() {
      if (stage === "floor") throw Error("injected floor failure");
      return {
        group: new T.Group(),
        colliders: [],
        fixtures: [],
        wallMeshes: [],
        disposeProps() {},
      };
    }
    bindEvents() {
      this.handlers = { keydown() {}, resize() {} };
      window.addEventListener("keydown", this.handlers.keydown);
      throw Error("injected event failure");
    }
  }
  return { owned, Broken };
}
for (const stage of ["floor", "events"])
  test(`partial engine construction releases renderer, canvas and listeners after ${stage} failure`, () => {
    const old = {
      window: globalThis.window,
      document: globalThis.document,
      devicePixelRatio: globalThis.devicePixelRatio,
      navigator: globalThis.navigator,
    };
    const noop = () => {};
    globalThis.window = {
      location: { search: "" },
      matchMedia: () => ({ matches: false }),
      addEventListener: noop,
      removeEventListener: noop,
      visualViewport: { removeEventListener: noop },
    };
    globalThis.document = {
      createElement: () => ({
        getContext: () =>
          new Proxy(
            { measureText: () => ({ width: 40 }) },
            {
              get: (o, k) => o[k] || noop,
              set: (o, k, v) => ((o[k] = v), true),
            },
          ),
      }),
      removeEventListener: noop,
    };
    globalThis.devicePixelRatio = 1;
    const f = fixture(stage);
    try {
      assert.throws(
        () =>
          new f.Broken(
            { appendChild() {} },
            { volume: 0, quality: "balanced" },
            {},
          ),
        /injected/,
      );
      assert.equal(f.owned.disposed, 1);
      assert.equal(f.owned.lost, 1);
      assert.equal(f.owned.removed, 1);
      assert.equal(f.owned.loops.at(-1), null);
    } finally {
      for (const [k, v] of Object.entries(old)) {
        if (v === undefined) delete globalThis[k];
        else if (k !== "navigator") globalThis[k] = v;
      }
    }
  });
