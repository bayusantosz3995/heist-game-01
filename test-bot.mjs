// Bot playtest: an autopilot plays level 1 (The Casino Floor) headlessly and
// must reach the exit with the objective, uncaught. It steers between
// waypoints along the open corridors and flees from any guard whose cone
// covers it. Run: node test-bot.mjs
import { STEP, GUARD, CAMERA } from './game/src/config.js';
import { createWorld, stepWorld, blockersOf, PHASE } from './game/src/world.js';
import { seesTarget, dist } from './game/src/vision.js';

// Open corridors: left lane up, the y=330 lane across, the right lane down.
const ROUTE_TO_OBJECTIVE = [
  { x: 150, y: 700 },
  { x: 150, y: 550 },
  { x: 150, y: 330 },
  { x: 1150, y: 330 },
  { x: 1150, y: 120 },
];
const ROUTE_TO_EXIT = [
  { x: 1150, y: 330 },
  { x: 1150, y: 700 },
  { x: 1185, y: 725 },
];

const MAX_SECONDS = 150;
const world = createWorld(0);
const blockers = blockersOf(world);
let route = ROUTE_TO_OBJECTIVE;
let waypointIndex = 0;
let fled = 0;
let waited = 0;
let steps = 0;
let maxAlarm = 0;

function threat() {
  // The nearest guard whose cone currently covers the thief.
  let worst = null;
  let worstD = Infinity;
  for (const guard of world.guards) {
    const d = seesTarget(guard, world.player, GUARD.viewRange, guard.facing, GUARD.viewHalfAngle, blockers);
    if (d >= 0 && d < worstD) {
      worstD = d;
      worst = guard;
    }
    if (guard.awareness > 30 && dist(guard.x, guard.y, world.player.x, world.player.y) < worstD) {
      worstD = dist(guard.x, guard.y, world.player.x, world.player.y);
      worst = worst ?? guard;
    }
  }
  return worst;
}

while (steps < MAX_SECONDS / STEP) {
  steps += 1;
  const danger = threat();
  let mx = 0;
  let my = 0;
  if (danger) {
    // Flee directly away from the threatening guard.
    const dx = world.player.x - danger.x;
    const dy = world.player.y - danger.y;
    const len = Math.hypot(dx, dy) || 1;
    mx = dx / len;
    my = dy / len;
    fled += 1;
  } else {
    const target = route[waypointIndex];
    const d = dist(world.player.x, world.player.y, target.x, target.y);
    if (d < 28) {
      waypointIndex += 1;
      if (waypointIndex >= route.length) {
        if (!world.objective.taken) {
          // Wait for the objective pickup to register, then head for the exit.
          waypointIndex = route.length - 1;
        } else {
          break;
        }
      }
    } else {
      mx = (target.x - world.player.x) / d;
      my = (target.y - world.player.y) / d;
    }
  }
  if (world.objective.taken && route === ROUTE_TO_OBJECTIVE) {
    route = ROUTE_TO_EXIT;
    waypointIndex = 0;
  }
  const events = stepWorld(world, { mx, my, run: false, loop: false }, STEP);
  maxAlarm = Math.max(maxAlarm, world.alarm);
  if (events.includes('caught') || world.phase === PHASE.BUSTED) break;
  if (world.phase === PHASE.LEVEL_DONE) break;
}

const seconds = (steps * STEP).toFixed(1);
console.log(`bot finished in ${seconds}s sim time, phase=${world.phase}`);
console.log(`objective taken: ${world.objective.taken}, loot: $${world.lootValue}, max alarm: ${Math.round(maxAlarm)}, flee steps: ${fled}`);
if (world.phase !== PHASE.LEVEL_DONE) {
  console.log(`FAIL: bot did not clear level 1 (player at ${Math.round(world.player.x)},${Math.round(world.player.y)}, alarm ${Math.round(world.alarm)})`);
  process.exit(1);
}
console.log('PASS: bot cleared level 1 with the objective, uncaught');
