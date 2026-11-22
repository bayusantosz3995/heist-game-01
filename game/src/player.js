// The thief: movement, running noise, the dealer disguise, loot weight and
// Loop Feed charges. Walking is silent; running is fast but loud — guards
// within earshot come to look, and a running thief is spotted faster.
import { LOOP, PLAYER } from './config.js';
import { moveCircle } from './vision.js';

/** Fresh player state at a level's start position. */
export function createPlayer(start, loopCharges) {
  return {
    x: start.x,
    y: start.y,
    facing: 0,
    running: false,
    disguised: false,
    lootCarried: 0,
    loopCharges,
    moving: false,
  };
}

/** Current speed, slowed by the loot the thief is carrying. */
export function playerSpeed(player) {
  const slow = Math.min(PLAYER.maxLootSlowdown, player.lootCarried * PLAYER.lootSlowdown);
  return (player.running ? PLAYER.runSpeed : PLAYER.walkSpeed) * (1 - slow);
}

/**
 * Move the thief by a normalised (mx, my) input vector for one step.
 * Returns the noise position when running (guards investigate it), else null.
 */
export function stepPlayer(player, mx, my, run, dt, solids) {
  player.moving = mx !== 0 || my !== 0;
  player.running = run && player.moving;
  if (player.running && player.disguised) {
    // Running tears the disguise off.
    player.disguised = false;
  }
  if (!player.moving) return null;
  const len = Math.hypot(mx, my) || 1;
  const speed = playerSpeed(player);
  const dx = (mx / len) * speed * dt;
  const dy = (my / len) * speed * dt;
  const moved = moveCircle(player, PLAYER.radius, dx, dy, solids);
  player.x = moved.x;
  player.y = moved.y;
  player.facing = Math.atan2(dy, dx);
  return player.running ? { x: player.x, y: player.y } : null;
}

/** Spend a Loop Feed charge; returns false when none are left. */
export function useLoopCharge(player) {
  if (player.loopCharges <= 0) return false;
  player.loopCharges -= 1;
  return true;
}

/** Grant loop charges (pickups). */
export function addLoopCharges(player, n) {
  player.loopCharges += n;
}

/** A fresh Loop Feed stock for a new game. */
export function startingLoopCharges() {
  return LOOP.startCharges;
}
