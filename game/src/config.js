// BLUEPRINT — The Ashford Casino Job: tuning constants and the blueprint palette.
// Everything the other modules agree on lives here: world size, speeds, detection
// rates, alarm math, scoring, and the colours that make safe cover, danger and
// loot obvious at a glance.
export const WORLD = { width: 1280, height: 800, wall: 24 };
export const STEP = 1 / 60;

// The player: a thief drawn as a white blueprint figure.
export const PLAYER = {
  radius: 13,
  walkSpeed: 168,
  runSpeed: 252,
  noiseRadius: 150,
  pickupRadius: 36,
  lootSlowdown: 0.03, // speed lost per loot item carried (max 5 items counted)
  maxLootSlowdown: 0.15,
};

// Guards: amber figures with vision cones. Awareness 0..100; at 100 they chase.
export const GUARD = {
  radius: 14,
  patrolSpeed: 72,
  chaseSpeed: 158,
  investigateSpeed: 120,
  viewRange: 185,
  viewHalfAngle: 0.62, // radians, ~35 degrees
  catchRadius: 26,
  awarenessRate: 70, // per second at point-blank range, scaled by distance
  awarenessDecay: 34, // per second while the thief is unseen
  runMultiplier: 1.6, // running is easier to spot
  searchTime: 4, // seconds a guard looks around after losing the trail
};

// Cameras: magenta cones sweeping from wall mounts. They feed the alarm directly.
export const CAMERA = {
  viewRange: 250,
  viewHalfAngle: 0.5, // ~28 degrees
  alarmRate: 20, // alarm points per second while the thief is in a live cone
};

// Lasers: beams that cycle on and off. Crossing a live beam zaps the alarm.
export const LASER = {
  period: 4.0, // seconds per full cycle
  onTime: 2.4, // seconds the beam is live in each cycle
  warnTime: 0.45, // seconds of flicker before the beam switches on
  zapAlarm: 30, // alarm points per hit
  zapCooldown: 1.0, // seconds before the same beam can zap again
};

// The alarm: 0..100. At 100 the casino locks down and every guard hunts.
export const ALARM = {
  decay: 2.5, // points per second while nothing is detecting the thief
  guardSpotted: 40, // points added the moment a guard reaches full awareness
  lockdownTime: 12, // seconds a lockdown lasts
  lockdownReset: 50, // alarm value when a lockdown ends
};

// Tools: Loop Feed charges freeze the nearest camera for a few seconds.
export const LOOP = { duration: 8, startCharges: 2 };

// The disguise: a dealer uniform. Guards ignore a disguised thief, cameras do
// not, and running tears it off.
export const DISGUISE = { label: 'DEALER' };

// Scoring: loot value + time bonus + a ghost bonus for staying quiet.
export const SCORE = {
  ghostBonus: 2000,
  ghostAlarmMax: 30, // alarm must never pass this for the ghost bonus
  timeBonusPerSecond: 10,
};

// Blueprint palette: deep blue paper, white ink, amber danger, gold loot.
export const PALETTE = {
  paper: '#0d2b52',
  paperDark: '#081d38',
  grid: 'rgba(120, 180, 255, 0.10)',
  ink: '#eaf4ff',
  inkDim: '#9fc3e8',
  wallFill: '#16407a',
  wallEdge: '#eaf4ff',
  coverFill: '#123a6e',
  coverEdge: '#7fb8ff',
  guard: '#ffb02e',
  guardCone: 'rgba(255, 176, 46, 0.20)',
  guardConeEdge: 'rgba(255, 176, 46, 0.55)',
  camera: '#e06ee8',
  cameraCone: 'rgba(224, 110, 232, 0.16)',
  cameraConeEdge: 'rgba(224, 110, 232, 0.5)',
  laser: '#ff5252',
  laserOff: 'rgba(255, 82, 82, 0.25)',
  loot: '#ffd94a',
  lootGlow: 'rgba(255, 217, 74, 0.35)',
  player: '#ffffff',
  playerRing: 'rgba(255, 255, 255, 0.5)',
  noise: 'rgba(255, 120, 120, 0.45)',
  exit: '#3ddc84',
  alarmLow: '#3ddc84',
  alarmMid: '#ffb02e',
  alarmHigh: '#ff5252',
  disguise: '#2ee6a8',
};
