// The three floors of the Ashford Grand Casino. Each level is one room the
// thief crosses on a single screen: walls, cover that blocks sight and
// movement, guards on patrol routes, sweeping cameras, timed lasers, loot,
// one objective item, and the exit. Every level has several routes: the
// direct line is watched, the long way round is safer.
import { WORLD } from './config.js';

function borderWalls() {
  const { width, height, wall } = WORLD;
  return [
    { x: 0, y: 0, w: width, h: wall, label: '' },
    { x: 0, y: height - wall, w: width, h: wall, label: '' },
    { x: 0, y: 0, w: wall, h: height, label: '' },
    { x: width - wall, y: 0, w: wall, h: height, label: '' },
  ];
}

// Cover: casino furniture tall enough to hide behind. `label` is the
// blueprint annotation drawn on it.
function table(x, y, label) {
  return { x, y, w: 120, h: 70, label };
}

export const LEVELS = [
  {
    id: 1,
    name: 'THE CASINO FLOOR',
    subtitle: 'Floor 1 — slip past the dealers, lift the High-Roller Pass',
    parTime: 90,
    start: { x: 70, y: 700 },
    walls: borderWalls(),
    cover: [
      table(200, 180, 'ROULETTE'),
      table(500, 180, 'BLACKJACK'),
      table(800, 180, 'ROULETTE'),
      table(350, 420, 'POKER'),
      table(650, 420, 'CRAPS'),
      table(950, 420, 'BACCARAT'),
      table(200, 600, 'SLOTS'),
      table(800, 600, 'SLOTS'),
    ],
    guards: [
      { waypoints: [{ x: 300, y: 300 }, { x: 900, y: 300 }], facing: 0 },
      { waypoints: [{ x: 1000, y: 600 }, { x: 1000, y: 200 }], facing: -Math.PI / 2 },
    ],
    cameras: [{ x: 640, y: 30, sweepMin: 0.6, sweepMax: 2.54, speed: 0.45 }],
    lasers: [],
    loot: [
      { x: 250, y: 120, kind: 'chips', value: 500, label: '$500 CHIPS' },
      { x: 1000, y: 350, kind: 'chips', value: 500, label: '$500 CHIPS' },
      { x: 500, y: 650, kind: 'cash', value: 1000, label: '$1,000 CASH' },
    ],
    pickups: [
      { x: 110, y: 720, kind: 'disguise', label: 'DEALER UNIFORM' },
      { x: 60, y: 120, kind: 'loop', label: 'LOOP FEED +1' },
    ],
    objective: { x: 1150, y: 120, kind: 'pass', value: 0, label: 'HIGH-ROLLER PASS' },
    objectiveText: 'Lift the HIGH-ROLLER PASS, then reach the EXIT',
    exit: { x: 1130, y: 690, w: 110, h: 70, label: 'EXIT' },
  },
  {
    id: 2,
    name: 'HIGH-ROLLER SUITES',
    subtitle: 'Floor 2 — time the laser grid, or take the long way round',
    parTime: 110,
    start: { x: 70, y: 700 },
    walls: [
      ...borderWalls(),
      // Two suite dividers with door gaps at different heights: three zones,
      // and the gaps never line up, so every route crosses open floor.
      { x: 420, y: 24, w: 20, h: 296, label: '' },
      { x: 420, y: 480, w: 20, h: 296, label: '' },
      { x: 840, y: 24, w: 20, h: 156, label: '' },
      { x: 840, y: 340, w: 20, h: 436, label: '' },
    ],
    cover: [
      { x: 150, y: 300, w: 110, h: 64, label: 'BAR' },
      { x: 560, y: 150, w: 110, h: 64, label: 'LOUNGE' },
      { x: 560, y: 600, w: 110, h: 64, label: 'LOUNGE' },
      { x: 980, y: 300, w: 110, h: 64, label: 'SAFE ROOM' },
    ],
    guards: [
      { waypoints: [{ x: 200, y: 150 }, { x: 200, y: 650 }], facing: Math.PI / 2 },
      { waypoints: [{ x: 640, y: 250 }, { x: 640, y: 700 }], facing: Math.PI / 2 },
      { waypoints: [{ x: 1050, y: 150 }, { x: 1050, y: 600 }], facing: Math.PI / 2 },
    ],
    cameras: [
      { x: 640, y: 30, sweepMin: 0.7, sweepMax: 2.44, speed: 0.5 },
      { x: 1250, y: 400, sweepMin: 2.2, sweepMax: 4.08, speed: 0.4 },
    ],
    lasers: [
      // Two beams across the middle corridor, on opposite phases: one is
      // always live, so crossing needs timing, or the suite-door detour.
      { x1: 450, y1: 400, x2: 830, y2: 400, phase: 0 },
      { x1: 450, y1: 520, x2: 830, y2: 520, phase: 0.5 },
    ],
    loot: [
      { x: 200, y: 200, kind: 'cash', value: 1000, label: '$1,000 CASH' },
      { x: 640, y: 640, kind: 'chips', value: 500, label: '$500 CHIPS' },
      { x: 1050, y: 450, kind: 'cash', value: 1000, label: '$1,000 CASH' },
    ],
    pickups: [{ x: 640, y: 120, kind: 'loop', label: 'LOOP FEED +1' }],
    objective: { x: 1150, y: 120, kind: 'briefcase', value: 0, label: 'VAULT CODE BRIEFCASE' },
    objectiveText: 'Grab the VAULT CODE BRIEFCASE, then reach the EXIT',
    exit: { x: 1130, y: 690, w: 110, h: 70, label: 'EXIT' },
  },
  {
    id: 3,
    name: 'THE VAULT',
    subtitle: 'Floor 3 — the Ashford Diamond, ringed by lasers and lookouts',
    parTime: 130,
    start: { x: 70, y: 700 },
    walls: borderWalls(),
    cover: [
      { x: 620, y: 380, w: 40, h: 40, label: 'PEDESTAL' },
      { x: 220, y: 200, w: 100, h: 60, label: 'DEPOSIT' },
      { x: 960, y: 200, w: 100, h: 60, label: 'DEPOSIT' },
      { x: 220, y: 560, w: 100, h: 60, label: 'DEPOSIT' },
      { x: 960, y: 560, w: 100, h: 60, label: 'DEPOSIT' },
    ],
    guards: [
      { waypoints: [{ x: 300, y: 150 }, { x: 980, y: 150 }], facing: 0 },
      { waypoints: [{ x: 300, y: 650 }, { x: 980, y: 650 }], facing: 0 },
      // Lookouts: stationary, slowly scanning the vault floor.
      { waypoints: [{ x: 430, y: 400 }], facing: 0, scan: true },
      { waypoints: [{ x: 850, y: 400 }], facing: Math.PI, scan: true },
    ],
    cameras: [
      { x: 640, y: 30, sweepMin: 0.7, sweepMax: 2.44, speed: 0.55 },
      { x: 30, y: 400, sweepMin: -0.9, sweepMax: 0.9, speed: 0.4 },
      { x: 1250, y: 400, sweepMin: 2.24, sweepMax: 4.04, speed: 0.4 },
    ],
    lasers: [
      // A square of beams around the pedestal, alternating phases: the ring
      // is never fully dark, so the approach needs timing.
      { x1: 520, y1: 330, x2: 760, y2: 330, phase: 0 },
      { x1: 520, y1: 470, x2: 760, y2: 470, phase: 0.5 },
      { x1: 520, y1: 330, x2: 520, y2: 470, phase: 0.25 },
      { x1: 760, y1: 330, x2: 760, y2: 470, phase: 0.75 },
    ],
    loot: [
      { x: 200, y: 120, kind: 'gold', value: 1500, label: '$1,500 GOLD' },
      { x: 1080, y: 120, kind: 'gold', value: 1500, label: '$1,500 GOLD' },
      { x: 640, y: 700, kind: 'cash', value: 1000, label: '$1,000 CASH' },
    ],
    pickups: [
      { x: 120, y: 120, kind: 'loop', label: 'LOOP FEED +1' },
      { x: 1160, y: 120, kind: 'loop', label: 'LOOP FEED +1' },
    ],
    objective: { x: 640, y: 400, kind: 'diamond', value: 5000, label: 'THE ASHFORD DIAMOND' },
    objectiveText: 'Steal THE ASHFORD DIAMOND, then reach the GETAWAY VAN',
    exit: { x: 1130, y: 690, w: 110, h: 70, label: 'GETAWAY' },
  },
];

/** Deep-ish copy of a level definition, so play never mutates the original. */
export function loadLevelDef(index) {
  return JSON.parse(JSON.stringify(LEVELS[index]));
}
