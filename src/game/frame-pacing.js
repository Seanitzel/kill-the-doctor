// Retain target phase across browser refresh jitter. Accepting a slightly early
// frame avoids dropping every other 60 Hz callback; a stall never queues work.
export function framePhase(previous, now, fps) {
  if (!Number.isFinite(previous) || !Number.isFinite(fps)) return now;
  const interval = 1000 / fps;
  const elapsed = now - previous;
  const tolerance = interval * .25;
  if (elapsed + tolerance < interval) return null;
  return previous + Math.max(1, Math.floor((elapsed + tolerance) / interval)) * interval;
}

// Rendering a distant pose less often must not slow its animation clock.
export function poseElapsed(actor, now, dt) {
  const elapsed = actor.lastPoseAt === undefined
    ? dt
    : Math.min(.25, Math.max(dt, now - actor.lastPoseAt));
  actor.lastPoseAt = now;
  return elapsed;
}
