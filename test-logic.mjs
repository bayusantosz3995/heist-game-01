// Logic tests for BLUEPRINT (Node, no DOM): vision, guards, cameras, lasers,
// the thief, and the world rules. Run: node test-logic.mjs
import { STEP, GUARD, CAMERA, LASER, ALARM, PLAYER } from './game/src/config.js';
import { hasLineOfSight, seesTarget, moveCircle, pointToSegment } from './game/src/vision.js';
import { createGuard, stepGuard } from './game/src/guard.js';
import { createCamera, stepCamera, cameraSeesThief, loopCamera } from './game/src/camera.js';
import { createLaser, laserIsLive, stepLaser } from './game/src/laser.js';
import { createPlayer, stepPlayer, playerSpeed, useLoopCharge } from './game/src/player.js';
import { createWorld, stepWorld, useLoop, PHASE } from './game/src/world.js';
import { stageShot } from './game/src/shots.js';

let passed = 0;
let failed = 0;
function check(name, ok, detail = '') {
  if (ok) {
    passed += 1;
    console.log(`  PASS ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name} ${detail}`);
  }
}
const wall = { x: 100, y: 100, w: 20, h: 200 };
const noWalls = [];

console.log('vision');
check('LOS clear with no blockers', hasLineOfSight(0, 0, 500, 500, noWalls));
check('LOS blocked by a wall', !hasLineOfSight(0, 200, 500, 200, [wall]));
check('LOS clear around a wall', hasLineOfSight(0, 50, 500, 50, [wall]));
check(
  'cone sees a target ahead',
  seesTarget({ x: 0, y: 0 }, { x: 100, y: 0 }, 185, 0, 0.62, noWalls) >= 0,
);
check(
  'cone misses a target behind',
  seesTarget({ x: 0, y: 0 }, { x: -100, y: 0 }, 185, 0, 0.62, noWalls) === -1,
);
check(
  'cone misses a target out of range',
  seesTarget({ x: 0, y: 0 }, { x: 300, y: 0 }, 185, 0, 0.62, noWalls) === -1,
);
check(
  'cone misses a target behind a wall',
  seesTarget({ x: 0, y: 200 }, { x: 300, y: 200 }, 500, 0, 0.62, [wall]) === -1,
);
check('point-to-segment distance', Math.abs(pointToSegment(5, 5, 0, 0, 10, 0) - 5) < 0.001);
{
  const moved = moveCircle({ x: 50, y: 150 }, 10, 100, 0, [wall]);
  check('circle stops at a wall', moved.x === 90 && moved.y === 150, `got ${moved.x},${moved.y}`);
  const slide = moveCircle({ x: 50, y: 150 }, 10, 100, 40, [wall]);
  check('circle slides along a wall', slide.x === 90 && Math.abs(slide.y - 190) < 0.001, `got ${slide.x},${slide.y}`);
}

console.log('guard');
{
  const guard = createGuard({ waypoints: [{ x: 0, y: 0 }, { x: 200, y: 0 }], facing: 0 });
  const player = { x: 100, y: 0, running: false, disguised: false };
  const ctx = { player, blockers: noWalls, solids: noWalls, lockdown: false, noise: null };
  stepGuard(guard, 1, ctx);
  check('awareness rises inside the cone', guard.awareness > 20, `got ${guard.awareness}`);
  player.x = -500;
  const before = guard.awareness;
  stepGuard(guard, 1, ctx);
  check('awareness decays outside the cone', guard.awareness < before, `got ${guard.awareness}`);
}
{
  const guard = createGuard({ waypoints: [{ x: 0, y: 0 }, { x: 200, y: 0 }], facing: 0 });
  const player = { x: 100, y: 0, running: false, disguised: true };
  stepGuard(guard, 1, { player, blockers: noWalls, solids: noWalls, lockdown: false, noise: null });
  check('disguise fools the guard', guard.awareness === 0, `got ${guard.awareness}`);
}
{
  const guard = createGuard({ waypoints: [{ x: 0, y: 0 }, { x: 200, y: 0 }], facing: 0 });
  const player = { x: 60, y: 0, running: false, disguised: false };
  const ctx = { player, blockers: noWalls, solids: noWalls, lockdown: false, noise: null };
  let caught = null;
  for (let i = 0; i < 600 && !caught; i += 1) {
    caught = stepGuard(guard, STEP, ctx);
  }
  check('guard chases at full awareness and catches', caught === 'caught' && guard.state === 'chase');
}
{
  const guard = createGuard({ waypoints: [{ x: 0, y: 0 }, { x: 200, y: 0 }], facing: 0 });
  const player = { x: 500, y: 500, running: false, disguised: false };
  const result = stepGuard(guard, STEP, {
    player, blockers: noWalls, solids: noWalls, lockdown: false, noise: { x: 50, y: 10 },
  });
  check('guard investigates a noise', guard.state === 'suspicious', `got ${guard.state}`);
  check('noise alone never catches', result === null);
}

console.log('camera');
{
  const cam = createCamera({ x: 0, y: 0, sweepMin: -0.5, sweepMax: 0.5, speed: 1 });
  const player = { x: 100, y: 0 };
  check('camera sees the thief in its cone', cameraSeesThief(cam, player, noWalls));
  loopCamera(cam);
  check('looped camera is blind', !cameraSeesThief(cam, player, noWalls));
  const a0 = cam.angle;
  stepCamera(cam, 1);
  check('looped camera holds its angle', cam.angle === a0);
  stepCamera(cam, 10);
  check('loop wears off', cam.looped === 0);
}

console.log('laser');
{
  const laser = createLaser({ x1: 0, y1: 100, x2: 200, y2: 100, phase: 0 });
  check('laser live at t=0', laserIsLive(laser, 0));
  check('laser off mid-cycle', !laserIsLive(laser, 3.0));
  check('laser live again next cycle', laserIsLive(laser, 4.1));
  const player = { x: 100, y: 100, radius: 13 };
  check('beam zaps on contact', stepLaser(laser, STEP, 0, player) === 'zap');
  check('beam cooldown blocks a second zap', stepLaser(laser, STEP, 0, player) === null);
  const far = { x: 100, y: 200, radius: 13 };
  const laser2 = createLaser({ x1: 0, y1: 100, x2: 200, y2: 100, phase: 0 });
  check('beam misses away from the line', stepLaser(laser2, STEP, 0, far) === null);
  check('dark beam never zaps', stepLaser(createLaser({ x1: 0, y1: 100, x2: 200, y2: 100, phase: 0 }), STEP, 3.0, player) === null);
}

console.log('player');
{
  const p = createPlayer({ x: 0, y: 0 }, 2);
  const walk = playerSpeed(p);
  p.running = true;
  const run = playerSpeed(p);
  check('running is faster than walking', run > walk, `${walk} vs ${run}`);
  p.running = false;
  p.lootCarried = 5;
  check('loot slows the thief', playerSpeed(p) < walk, `${playerSpeed(p)} vs ${walk}`);
  p.lootCarried = 0;
  p.disguised = true;
  stepPlayer(p, 1, 0, true, STEP, noWalls);
  check('running tears the disguise off', p.disguised === false);
  check('loop charge spends', useLoopCharge(p) === true && p.loopCharges === 1);
  useLoopCharge(p);
  check('no loop charges left', useLoopCharge(p) === false);
}

console.log('world');
{
  const world = createWorld(0);
  check('level 1 has 2 guards, 1 camera, 3 loot', world.guards.length === 2 && world.cameras.length === 1 && world.loot.length === 3);
  check('world starts in play phase', world.phase === PHASE.PLAY);
  // Walk the thief onto the first loot item and check the pickup.
  const item = world.loot[0];
  world.player.x = item.x;
  world.player.y = item.y;
  const events = stepWorld(world, { mx: 0, my: 0, run: false, loop: false }, STEP);
  check('touching loot picks it up', item.taken && events.includes('pickup') && world.lootValue === item.value);
}
{
  const world = createWorld(0);
  world.alarm = 50;
  for (let i = 0; i < 60; i += 1) stepWorld(world, { mx: 0, my: 0, run: false, loop: false }, STEP);
  check('alarm decays while undetected', world.alarm < 50, `got ${world.alarm}`);
}
{
  const world = createWorld(0);
  world.alarm = 99;
  world.player.x = 640;
  world.player.y = 100; // inside the sweeping camera's reach
  let locked = false;
  for (let i = 0; i < 600 && !locked; i += 1) {
    const events = stepWorld(world, { mx: 0, my: 0, run: false, loop: false }, STEP);
    if (events.includes('lockdown')) locked = true;
    if (world.phase !== PHASE.PLAY) break;
  }
  check('full alarm triggers a lockdown', locked && world.lockdown > 0);
}
{
  const world = createWorld(0);
  world.player.x = 640;
  world.player.y = 200; // near the camera
  const ok = useLoop(world);
  check('loop feed freezes the nearest camera', ok && world.cameras[0].looped > 0);
  check('loop costs a charge', world.player.loopCharges === 1);
}
{
  const world = createWorld(0);
  world.player.x = world.objective.x;
  world.player.y = world.objective.y;
  stepWorld(world, { mx: 0, my: 0, run: false, loop: false }, STEP);
  check('objective is collected on touch', world.objective.taken);
  world.player.x = world.def.exit.x + 10;
  world.player.y = world.def.exit.y + 10;
  const events = stepWorld(world, { mx: 0, my: 0, run: false, loop: false }, STEP);
  check('exit with objective clears the floor', world.phase === PHASE.LEVEL_DONE && events.includes('levelDone'));
}
{
  const world = createWorld(0);
  world.player.x = world.def.exit.x + 10;
  world.player.y = world.def.exit.y + 10;
  stepWorld(world, { mx: 0, my: 0, run: false, loop: false }, STEP);
  check('exit without objective does nothing', world.phase === PHASE.PLAY);
}

console.log('shots');
for (const name of ['cover', 'getaway', 'briefing', 'caught', 'nonsense']) {
  const scene = stageShot(name);
  check(`shot ${name} stages a state and screen`, !!scene.state && typeof scene.screen === 'string');
}
{
  const cover = stageShot('cover');
  check('cover alarm is warm (20-50)', cover.state.alarm >= 20 && cover.state.alarm <= 50, `got ${cover.state.alarm}`);
  check('cover has a suspicious guard', cover.state.guards.some((g) => g.awareness > 30));
  check('cover objective is still out there', !cover.state.objective.taken);
  const caught = stageShot('caught');
  check('caught scene is busted phase', caught.state.phase === PHASE.BUSTED);
  const getaway = stageShot('getaway');
  check('getaway scene has a score', getaway.state.score > 0);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
