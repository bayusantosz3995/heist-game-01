// Timed laser beams. Each beam cycles on and off on a shared clock with its
// own phase offset, flickers a warning just before it switches on, and zaps
// the alarm when the thief crosses it live. Beams never hurt guards.
import { LASER } from './config.js';
import { pointToSegment } from './vision.js';

/** Build a laser's runtime state from a level definition entry. */
export function createLaser(def) {
  return {
    x1: def.x1,
    y1: def.y1,
    x2: def.x2,
    y2: def.y2,
    phase: def.phase ?? 0,
    cooldown: 0,
  };
}

/** Is the beam live at world time `t`? */
export function laserIsLive(laser, t) {
  const cycle = ((t / LASER.period + laser.phase) % 1 + 1) % 1;
  return cycle * LASER.period < LASER.onTime;
}

/** Is the beam in its warning flicker (about to switch on)? */
export function laserIsWarning(laser, t) {
  const cycle = ((t / LASER.period + laser.phase) % 1 + 1) % 1;
  const inCycle = cycle * LASER.period;
  return inCycle >= LASER.period - LASER.warnTime;
}

/**
 * Step one laser: count its zap cooldown down, and report whether the thief
 * is touching its live beam. Returns 'zap' on a fresh hit, else null.
 */
export function stepLaser(laser, dt, t, player) {
  laser.cooldown = Math.max(0, laser.cooldown - dt);
  if (!laserIsLive(laser, t) || laser.cooldown > 0) return null;
  const d = pointToSegment(player.x, player.y, laser.x1, laser.y1, laser.x2, laser.y2);
  if (d <= player.radius) {
    laser.cooldown = LASER.zapCooldown;
    return 'zap';
  }
  return null;
}
