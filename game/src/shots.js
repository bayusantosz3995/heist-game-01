// The screenshot scenes behind ?shot=cover|getaway|briefing|caught. Each one
// builds a real world state and freezes it — no loop, no randomness — so the
// frame is exactly what the game looks like at that moment, every time.
// The cover stages the full heist in one frame: the thief mid-room, guards
// with vision cones, a sweeping camera, the loot target, and the alarm meter.
import { createWorld } from './world.js';
import { SCREEN } from './render.js';

/** Stage the named scene and return {state, screen} to paint. */
export function stageShot(name) {
  if (name === 'getaway') return stageGetaway();
  if (name === 'briefing') return stageBriefing();
  if (name === 'caught') return stageCaught();
  return stageCover();
}

function stageCover() {
  const state = createWorld(0);
  // The thief crossing the middle of the casino floor, mid-stride.
  state.player.x = 640;
  state.player.y = 470;
  state.player.facing = 0.3;
  state.player.lootCarried = 1;
  state.lootValue = 500;
  state.score = 500;
  // Guards placed mid-patrol with their cones sweeping toward the room.
  state.guards[0].x = 420;
  state.guards[0].y = 300;
  state.guards[0].facing = 0.5;
  state.guards[0].awareness = 55;
  state.guards[0].state = 'suspicious';
  state.guards[1].x = 1120;
  state.guards[1].y = 430;
  state.guards[1].facing = Math.PI;
  state.guards[1].awareness = 20;
  // The camera mid-sweep, cone washing the centre tables.
  state.cameras[0].angle = 1.9;
  // The alarm is warm but not critical: the job is tense, not blown.
  state.alarm = 32;
  state.maxAlarm = 32;
  state.levelTime = 47;
  state.message = 'The pass is on the far table — go!';
  state.messageTimer = 99;
  state.time = 47;
  return { state, screen: SCREEN.PLAY };
}

function stageGetaway() {
  const state = createWorld(2);
  state.phase = 'getaway';
  state.lootValue = 9500;
  state.lootTaken = 6;
  state.timeBonus = 1840;
  state.ghostBonus = 2000;
  state.score = 13340;
  state.maxAlarm = 28;
  return { state, screen: SCREEN.GETAWAY };
}

function stageBriefing() {
  const state = createWorld(0);
  state.player.loopCharges = 2;
  return { state, screen: SCREEN.BRIEFING };
}

function stageCaught() {
  const state = createWorld(1);
  // The fair caught moment, staged where the panel does not hide it: the
  // guard is on the thief at the bottom-left, awareness full, alarm high —
  // and the "!" says exactly why.
  state.player.x = 250;
  state.player.y = 620;
  state.player.facing = -Math.PI / 2;
  state.guards[0].x = 250;
  state.guards[0].y = 648;
  state.guards[0].facing = -Math.PI / 2;
  state.guards[0].awareness = 100;
  state.guards[0].state = 'chase';
  state.guards[1].x = 760;
  state.guards[1].y = 650;
  state.guards[1].facing = -Math.PI / 2;
  state.guards[1].awareness = 35;
  state.guards[2].x = 1050;
  state.guards[2].y = 300;
  state.guards[2].facing = Math.PI - 0.6;
  state.cameras[0].angle = 1.57;
  state.cameras[1].angle = Math.PI;
  state.alarm = 86;
  state.maxAlarm = 86;
  state.lootValue = 2500;
  state.score = 2500;
  state.levelTime = 73;
  state.time = 73;
  state.phase = 'busted';
  return { state, screen: SCREEN.BUSTED };
}
