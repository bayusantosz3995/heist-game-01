// Geometry shared by guards, cameras, lasers and movement: line of sight,
// vision cones, and circle-vs-rectangle collision. Pure functions, no DOM,
// so the logic tests and the autopilot can use them from Node.
export const TAU = Math.PI * 2;

/** Normalise an angle to (-PI, PI]. */
export function normAngle(a) {
  while (a > Math.PI) a -= TAU;
  while (a <= -Math.PI) a += TAU;
  return a;
}

/** Smallest absolute difference between two angles, in radians. */
export function angleDiff(a, b) {
  return Math.abs(normAngle(a - b));
}

export function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

/** True when point (px, py) lies inside rect {x, y, w, h}. */
export function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

/** Segment-segment intersection test (inclusive of touching). */
export function segmentsCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  const d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** True when segment (ax, ay)-(bx, by) touches or crosses rect r. */
export function segmentHitsRect(ax, ay, bx, by, r) {
  if (pointInRect(ax, ay, r) || pointInRect(bx, by, r)) return true;
  const { x, y, w, h } = r;
  return (
    segmentsCross(ax, ay, bx, by, x, y, x + w, y) ||
    segmentsCross(ax, ay, bx, by, x + w, y, x + w, y + h) ||
    segmentsCross(ax, ay, bx, by, x + w, y + h, x, y + h) ||
    segmentsCross(ax, ay, bx, by, x, y + h, x, y)
  );
}

/**
 * Line of sight between two points: clear when no blocker rect is crossed.
 * `blockers` is an array of rects (walls and tall cover).
 */
export function hasLineOfSight(ax, ay, bx, by, blockers) {
  for (let i = 0; i < blockers.length; i += 1) {
    if (segmentHitsRect(ax, ay, bx, by, blockers[i])) return false;
  }
  return true;
}

/**
 * Vision-cone test: is the target inside the watcher's cone (range, facing,
 * half-angle) with a clear line of sight? Returns the distance when seen,
 * or -1 when not seen.
 */
export function seesTarget(eye, target, range, facing, halfAngle, blockers) {
  const d = dist(eye.x, eye.y, target.x, target.y);
  if (d > range) return -1;
  if (d < 1) return d;
  const bearing = Math.atan2(target.y - eye.y, target.x - eye.x);
  if (angleDiff(bearing, facing) > halfAngle) return -1;
  if (!hasLineOfSight(eye.x, eye.y, target.x, target.y, blockers)) return -1;
  return d;
}

/**
 * Move a circle (pos + radius) by (dx, dy) against solid rects, sliding along
 * walls: each axis is resolved separately. Large moves are split into small
 * substeps so a fast circle can never tunnel through a thin wall.
 */
export function moveCircle(pos, radius, dx, dy, solids) {
  let { x, y } = pos;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 4));
  const sx = dx / steps;
  const sy = dy / steps;
  for (let s = 0; s < steps; s += 1) {
    x += sx;
    for (let i = 0; i < solids.length; i += 1) {
      const r = solids[i];
      if (x + radius > r.x && x - radius < r.x + r.w && y + radius > r.y && y - radius < r.y + r.h) {
        x = sx > 0 ? r.x - radius : r.x + r.w + radius;
      }
    }
    y += sy;
    for (let i = 0; i < solids.length; i += 1) {
      const r = solids[i];
      if (x + radius > r.x && x - radius < r.x + r.w && y + radius > r.y && y - radius < r.y + r.h) {
        y = sy > 0 ? r.y - radius : r.y + r.h + radius;
      }
    }
  }
  return { x, y };
}

/** Distance from point (px, py) to segment (ax, ay)-(bx, by). */
export function pointToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return dist(px, py, ax + t * dx, ay + t * dy);
}
