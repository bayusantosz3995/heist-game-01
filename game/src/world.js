// The world: one level's full state and its fixed-step advance. Ties the
// thief, guards, cameras and lasers together, owns the alarm, lockdown,
// pickups, scoring and the level flow. Pure logic — no DOM — so Node tests
// and the autopilot can run it headlessly.
import { ALARM, CAMERA, LASER, LOOP, PLAYER, SCORE, WORLD } from './config.js';
import { loadLevelDef, LEVELS } from './levels.js';
import { createGuard, stepGuard, GUARD_STATES } from './guard.js';
import { createCamera, stepCamera, cameraSeesThief, loopCamera } from './camera.js';
import { createLaser, stepLaser } from './laser.js';
import { createPlayer, stepPlayer, useLoopCharge, addLoopCharges } from './player.js';
import { dist, pointInRect } from './vision.js';

export const PHASE = {
  PLAY: 'play',
  BUSTED: 'busted',
  LEVEL_DONE: 'levelDone',
  GETAWAY: 'getaway',
};

/** Build the runtime state for level `index` (0-based). */
export function createWorld(levelIndex = 0) {
  const def = loadLevelDef(levelIndex);
  return {
    levelIndex,
    def,
    phase: PHASE.PLAY,
    time: 0,
    levelTime: 0,
    player: createPlayer(def.start, levelIndex === 0 ? LOOP.startCharges : 0),
    guards: def.guards.map(createGuard),
    cameras: def.cameras.map(createCamera),
    lasers: def.lasers.map(createLaser),
    loot: def.loot.map((l) => ({ ...l, taken: false })),
    pickups: def.pickups.map((p) => ({ ...p, taken: false })),
    objective: { ...def.objective, taken: false },
    alarm: 0,
    maxAlarm: 0,
    lockdown: 0,
    caughtBy: null,
    score: 0,
    lootValue: 0,
    lootTaken: 0,
    timeBonus: 0,
    ghostBonus: 0,
    spotted: false,
    flash: 0, // white/red screen flash timer (zap / lockdown)
    message: null,
    messageTimer: 0,
  };
}

/** Walls + cover: what blocks sight and movement. */
export function blockersOf(world) {
  return [...world.def.walls, ...world.def.cover];
}

/** Use a Loop Feed charge on the nearest camera within reach. */
export function useLoop(state) {
  if (state.phase !== PHASE.PLAY) return false;
  let best = null;
  let bestD = 320;
  for (const cam of state.cameras) {
    const d = dist(state.player.x, state.player.y, cam.x, cam.y);
    if (d < bestD) {
      bestD = d;
      best = cam;
    }
  }
  if (!best || !useLoopCharge(state.player)) return false;
  loopCamera(best);
  return true;
}

function addScore(state, value, label) {
  state.score += value;
  state.message = label;
  state.messageTimer = 2.2;
}

/**
 * Advance the world one fixed step. `input` is {mx, my, run, loop}.
 * Returns an array of event names for sound and screen effects.
 */
export function stepWorld(state, input, dt) {
  const events = [];
  if (state.phase !== PHASE.PLAY) return events;
  state.time += dt;
  state.levelTime += dt;
  state.flash = Math.max(0, state.flash - dt);
  state.messageTimer = Math.max(0, state.messageTimer - dt);
  if (state.messageTimer === 0) state.message = null;

  const blockers = blockersOf(state);
  const noise = stepPlayer(state.player, input.mx, input.my, input.run, dt, blockers);

  if (input.loop) {
    if (useLoop(state)) events.push('loop');
    else events.push('loopFail');
  }

  // Guards: awareness, chase, and the caught moment.
  let spottedNow = false;
  for (const guard of state.guards) {
    const before = guard.spotted;
    const result = stepGuard(guard, dt, {
      player: state.player,
      blockers,
      solids: blockers,
      lockdown: state.lockdown > 0,
      noise,
    });
    if (guard.spotted && !before) {
      state.alarm = Math.min(100, state.alarm + ALARM.guardSpotted);
      state.spotted = true;
      spottedNow = true;
      events.push('alert');
    }
    if (guard.awareness >= 100) spottedNow = true;
    if (result === 'caught') {
      state.phase = PHASE.BUSTED;
      state.caughtBy = guard;
      events.push('caught');
      return events;
    }
  }

  // Cameras feed the alarm while the thief is in a live cone.
  let cameraSeen = false;
  for (const cam of state.cameras) {
    stepCamera(cam, dt);
    if (cameraSeesThief(cam, state.player, blockers)) {
      state.alarm = Math.min(100, state.alarm + CAMERA.alarmRate * dt);
      cameraSeen = true;
    }
  }
  if (cameraSeen && !state.spotted) events.push('cameraSeen');

  // Lasers zap the alarm on contact.
  for (const laser of state.lasers) {
    if (stepLaser(laser, dt, state.time, state.player) === 'zap') {
      state.alarm = Math.min(100, state.alarm + LASER.zapAlarm);
      state.flash = 0.25;
      events.push('zap');
    }
  }

  // The alarm decays while nothing detects the thief.
  const detecting = spottedNow || cameraSeen;
  if (!detecting && state.lockdown <= 0) {
    state.alarm = Math.max(0, state.alarm - ALARM.decay * dt);
  }
  state.maxAlarm = Math.max(state.maxAlarm, state.alarm);

  // Lockdown: at full alarm every guard hunts; survive it and it eases off.
  if (state.alarm >= 100 && state.lockdown <= 0) {
    state.lockdown = ALARM.lockdownTime;
    state.flash = 0.5;
    events.push('lockdown');
  }
  if (state.lockdown > 0) {
    state.lockdown -= dt;
    if (state.lockdown <= 0) {
      state.alarm = ALARM.lockdownReset;
      state.lockdown = 0;
      events.push('lockdownEnd');
    }
  }

  // Pickups: loot, disguise and loop charges are collected on touch.
  const p = state.player;
  for (const item of state.loot) {
    if (!item.taken && dist(p.x, p.y, item.x, item.y) <= PLAYER.pickupRadius) {
      item.taken = true;
      p.lootCarried += 1;
      state.lootTaken += 1;
      state.lootValue += item.value;
      addScore(state, item.value, `+$${item.value.toLocaleString()} ${item.label}`);
      events.push('pickup');
    }
  }
  for (const item of state.pickups) {
    if (!item.taken && dist(p.x, p.y, item.x, item.y) <= PLAYER.pickupRadius) {
      item.taken = true;
      if (item.kind === 'disguise') {
        p.disguised = true;
        addScore(state, 0, 'DISGUISE ON — guards see a dealer');
        events.push('disguise');
      } else if (item.kind === 'loop') {
        addLoopCharges(p, 1);
        addScore(state, 0, 'LOOP FEED +1');
        events.push('pickup');
      }
    }
  }
  if (!state.objective.taken && dist(p.x, p.y, state.objective.x, state.objective.y) <= PLAYER.pickupRadius) {
    state.objective.taken = true;
    if (state.objective.value > 0) {
      state.lootValue += state.objective.value;
      state.lootTaken += 1;
      p.lootCarried += 1;
    }
    addScore(state, state.objective.value, `${state.objective.label} SECURED`);
    events.push('objective');
  }

  // The exit only counts once the objective is secured.
  if (state.objective.taken && pointInRect(p.x, p.y, state.def.exit)) {
    const bonus = Math.max(0, Math.round((state.def.parTime - state.levelTime) * SCORE.timeBonusPerSecond));
    state.timeBonus += bonus;
    state.score += bonus;
    if (state.levelIndex >= LEVELS.length - 1) {
      state.phase = PHASE.GETAWAY;
      if (state.maxAlarm <= SCORE.ghostAlarmMax && !state.spotted) {
        state.ghostBonus = SCORE.ghostBonus;
        state.score += SCORE.ghostBonus;
      }
      events.push('getaway');
    } else {
      state.phase = PHASE.LEVEL_DONE;
      events.push('levelDone');
    }
  }
  return events;
}

/** Advance to the next level, carrying score, loot and loop charges. */
export function nextLevel(state) {
  const next = createWorld(state.levelIndex + 1);
  next.score = state.score;
  next.lootValue = state.lootValue;
  next.lootTaken = state.lootTaken;
  next.timeBonus = state.timeBonus;
  next.maxAlarm = state.maxAlarm;
  next.spotted = state.spotted;
  next.player.loopCharges = state.player.loopCharges;
  next.player.lootCarried = 0;
  return next;
}

/** Total score shown on the getaway screen. */
export function finalScore(state) {
  return state.score;
}

/** Is any guard currently chasing the thief? */
export function anyChase(state) {
  return state.guards.some((g) => g.state === GUARD_STATES.CHASE);
}

/** World bounds guard: keep the thief inside the room. */
export function clampToWorld(player) {
  player.x = Math.max(WORLD.wall + PLAYER.radius, Math.min(WORLD.width - WORLD.wall - PLAYER.radius, player.x));
  player.y = Math.max(WORLD.wall + PLAYER.radius, Math.min(WORLD.height - WORLD.wall - PLAYER.radius, player.y));
}
