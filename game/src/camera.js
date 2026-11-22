// Sweeping security cameras. A camera pans back and forth between two angles;
// while the thief stands in its live cone the alarm climbs. A Loop Feed charge
// freezes a camera mid-sweep for a few seconds — the cone goes grey and blind.
import { CAMERA, LOOP } from './config.js';
import { seesTarget } from './vision.js';

/** Build a camera's runtime state from a level definition entry. */
export function createCamera(def) {
  return {
    x: def.x,
    y: def.y,
    sweepMin: def.sweepMin,
    sweepMax: def.sweepMax,
    speed: def.speed,
    angle: (def.sweepMin + def.sweepMax) / 2,
    direction: 1,
    looped: 0, // seconds of freeze left
  };
}

/** Advance the sweep; a looped camera holds still and counts down. */
export function stepCamera(camera, dt) {
  if (camera.looped > 0) {
    camera.looped = Math.max(0, camera.looped - dt);
    return;
  }
  camera.angle += camera.direction * camera.speed * dt;
  if (camera.angle >= camera.sweepMax) {
    camera.angle = camera.sweepMax;
    camera.direction = -1;
  } else if (camera.angle <= camera.sweepMin) {
    camera.angle = camera.sweepMin;
    camera.direction = 1;
  }
}

/** Freeze this camera for the loop duration. */
export function loopCamera(camera) {
  camera.looped = LOOP.duration;
}

/**
 * Is the thief inside this camera's live cone? Returns true only when the
 * camera is not looped, the thief is in range and angle, and the line of
 * sight is clear.
 */
export function cameraSeesThief(camera, player, blockers) {
  if (camera.looped > 0) return false;
  return (
    seesTarget(camera, player, CAMERA.viewRange, camera.angle, CAMERA.viewHalfAngle, blockers) >= 0
  );
}
