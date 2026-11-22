// Guard AI: patrol routes, suspicion, investigation, chase and search.
// A guard's awareness fills while the thief is inside its vision cone and
// drains while unseen, so a brief glimpse is a warning, not a fail — the
// caught moment is fair because the player can always see it coming.
import { GUARD } from './config.js';
import { angleDiff, dist, moveCircle, normAngle, seesTarget } from './vision.js';

export const GUARD_STATES = {
  PATROL: 'patrol',
  SUSPICIOUS: 'suspicious',
  CHASE: 'chase',
  SEARCH: 'search',
  RETURN: 'return',
};

/** Build a guard's runtime state from a level definition entry. */
export function createGuard(def) {
  const start = def.waypoints[0];
  return {
    x: start.x,
    y: start.y,
    facing: def.facing ?? 0,
    waypoints: def.waypoints,
    waypointIndex: 1 % def.waypoints.length,
    scan: !!def.scan,
    baseFacing: def.facing ?? 0,
    scanAngle: 0,
    state: GUARD_STATES.PATROL,
    awareness: 0,
    investigate: null,
    lastSeen: null,
    searchTimer: 0,
    spotted: false, // set the moment awareness first hits 100
  };
}

function turnToward(guard, targetAngle, dt) {
  const diff = normAngle(targetAngle - guard.facing);
  const maxTurn = 4.5 * dt;
  guard.facing = normAngle(guard.facing + Math.max(-maxTurn, Math.min(maxTurn, diff)));
}

function moveToward(guard, tx, ty, speed, dt, solids) {
  const d = dist(guard.x, guard.y, tx, ty);
  if (d < 2) return true;
  const step = Math.min(d, speed * dt);
  const nx = guard.x + ((tx - guard.x) / d) * step;
  const ny = guard.y + ((ty - guard.y) / d) * step;
  const moved = moveCircle(guard, GUARD.radius, nx - guard.x, ny - guard.y, solids);
  guard.x = moved.x;
  guard.y = moved.y;
  turnToward(guard, Math.atan2(ty - guard.y, tx - guard.x), dt);
  return d <= step + 1;
}

/**
 * Step one guard. `ctx` carries the player, the blockers (walls + cover),
 * the solids (walls + cover, for movement), whether the casino is in
 * lockdown, and the noise the player is making (position or null).
 * Returns 'caught' when this guard reaches the thief at full awareness.
 */
export function stepGuard(guard, dt, ctx) {
  const { player, blockers, solids, lockdown } = ctx;
  const seen = seesTarget(
    guard,
    player,
    GUARD.viewRange,
    guard.facing,
    GUARD.viewHalfAngle,
    blockers,
  );

  // Awareness: a disguised thief reads as a dealer; running is easier to spot.
  if (seen >= 0 && !player.disguised) {
    const closeness = 1 - (seen / GUARD.viewRange) * 0.6;
    const rate = GUARD.awarenessRate * closeness * (player.running ? GUARD.runMultiplier : 1);
    guard.awareness = Math.min(100, guard.awareness + rate * dt);
    guard.lastSeen = { x: player.x, y: player.y };
  } else {
    guard.awareness = Math.max(0, guard.awareness - GUARD.awarenessDecay * dt);
  }

  if (guard.awareness >= 100 && guard.state !== GUARD_STATES.CHASE) {
    guard.state = GUARD_STATES.CHASE;
    guard.spotted = true;
  }
  if (lockdown && guard.state !== GUARD_STATES.CHASE) {
    guard.state = GUARD_STATES.CHASE;
    guard.lastSeen = { x: player.x, y: player.y };
  }
  // A noise the guard can hear: go and look, even without seeing anything.
  if (ctx.noise && guard.state === GUARD_STATES.PATROL) {
    if (dist(guard.x, guard.y, ctx.noise.x, ctx.noise.y) < 190) {
      guard.state = GUARD_STATES.SUSPICIOUS;
      guard.investigate = { x: ctx.noise.x, y: ctx.noise.y };
    }
  }

  switch (guard.state) {
    case GUARD_STATES.PATROL: {
      if (guard.scan) {
        // Lookouts sweep their gaze slowly back and forth instead of walking.
        guard.scanAngle += dt * 0.55;
        guard.facing = normAngle(guard.baseFacing + Math.sin(guard.scanAngle) * 0.9);
        break;
      }
      // A guard who half-sees the thief stops to stare instead of walking
      // on: the glimpse becomes a proper look, and the player can see the
      // "!" coming instead of being walked past.
      if (seen >= 0 && guard.awareness > 50) {
        turnToward(guard, Math.atan2(player.y - guard.y, player.x - guard.x), dt);
        break;
      }
      const target = guard.waypoints[guard.waypointIndex];
      if (moveToward(guard, target.x, target.y, GUARD.patrolSpeed, dt, solids)) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
      }
      break;
    }
    case GUARD_STATES.SUSPICIOUS: {
      if (guard.investigate && moveToward(guard, guard.investigate.x, guard.investigate.y, GUARD.investigateSpeed, dt, solids)) {
        guard.state = GUARD_STATES.SEARCH;
        guard.searchTimer = GUARD.searchTime;
      }
      break;
    }
    case GUARD_STATES.CHASE: {
      const target = lockdown || seen >= 0 ? { x: player.x, y: player.y } : guard.lastSeen;
      if (target) moveToward(guard, target.x, target.y, GUARD.chaseSpeed, dt, solids);
      if (dist(guard.x, guard.y, player.x, player.y) <= GUARD.catchRadius) return 'caught';
      if (!lockdown && seen < 0 && guard.awareness <= 0) {
        guard.state = GUARD_STATES.SEARCH;
        guard.searchTimer = GUARD.searchTime;
      }
      break;
    }
    case GUARD_STATES.SEARCH: {
      guard.searchTimer -= dt;
      guard.facing = normAngle(guard.facing + 1.8 * dt);
      if (guard.searchTimer <= 0) guard.state = GUARD_STATES.RETURN;
      break;
    }
    case GUARD_STATES.RETURN: {
      const home = guard.waypoints[0];
      if (guard.scan || moveToward(guard, home.x, home.y, GUARD.patrolSpeed, dt, solids)) {
        guard.state = GUARD_STATES.PATROL;
        guard.waypointIndex = 1 % guard.waypoints.length;
      }
      break;
    }
    default:
      break;
  }
  return null;
}

/** How suspicious this guard looks right now: 0 (calm) to 1 (certain). */
export function guardAlertness(guard) {
  return guard.state === GUARD_STATES.CHASE ? 1 : guard.awareness / 100;
}
