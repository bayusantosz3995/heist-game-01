// The blueprint renderer: everything is drawn in code on one canvas — deep
// blue paper, white ink, amber danger, gold loot — so safe cover, danger and
// loot are obvious at a glance. Also draws the HUD, the alarm meter and every
// screen (title, briefing, pause, busted, floor clear, getaway).
import { ALARM, CAMERA, GUARD, LASER, PALETTE, PLAYER, WORLD } from './config.js';
import { laserIsLive, laserIsWarning } from './laser.js';
import { guardAlertness } from './guard.js';

export const SCREEN = {
  TITLE: 'title',
  BRIEFING: 'briefing',
  PLAY: 'play',
  PAUSED: 'paused',
  BUSTED: 'busted',
  LEVEL_DONE: 'levelDone',
  GETAWAY: 'getaway',
};

const W = WORLD.width;
const H = WORLD.height;

export function createRenderer(canvas) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  function text(str, x, y, size, color, align = 'left', weight = '700', mono = true) {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ${mono ? '"Courier New", monospace' : 'Arial, sans-serif'}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(str, x, y);
  }

  function drawBackground() {
    ctx.fillStyle = PALETTE.paper;
    ctx.fillRect(0, 0, W, H);
    // Faint blueprint grid.
    ctx.strokeStyle = PALETTE.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 40) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, H);
    }
    for (let y = 0; y <= H; y += 40) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(W, y + 0.5);
    }
    ctx.stroke();
    // Sheet frame + title block.
    ctx.strokeStyle = 'rgba(234, 244, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, W - 16, H - 16);
    text('ASHFORD GRAND CASINO — FLOOR PLAN', 20, H - 18, 11, 'rgba(159, 195, 232, 0.8)');
    text('SCALE 1:50 · SHEET A-101 · DRAWN IN CODE', W - 20, H - 18, 11, 'rgba(159, 195, 232, 0.8)', 'right');
  }

  function drawCone(x, y, facing, range, halfAngle, fill, edge) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, range, facing - halfAngle, facing + halfAngle);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawRect(r, fill, edge, width = 2) {
    ctx.fillStyle = fill;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = edge;
    ctx.lineWidth = width;
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  }

  function drawRoom(state) {
    const def = state.def;
    // Exit zone: green, pulsing once the objective is secured.
    const exitReady = state.objective.taken;
    const pulse = exitReady ? 0.75 + Math.sin(state.time * 4) * 0.25 : 0.3;
    ctx.fillStyle = `rgba(61, 220, 132, ${0.14 * pulse + 0.05})`;
    ctx.fillRect(def.exit.x, def.exit.y, def.exit.w, def.exit.h);
    ctx.strokeStyle = PALETTE.exit;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(def.exit.x, def.exit.y, def.exit.w, def.exit.h);
    ctx.setLineDash([]);
    text(exitReady ? `${def.exit.label} →` : `${def.exit.label} (LOCKED)`, def.exit.x + def.exit.w / 2, def.exit.y + def.exit.h / 2 + 5, 13, PALETTE.exit, 'center');

    // Lasers: bright live beams, faint dashed when off, flicker when warning.
    for (const laser of state.lasers) {
      const live = laserIsLive(laser, state.time);
      const warn = laserIsWarning(laser, state.time);
      const flicker = warn ? (Math.sin(state.time * 30) > 0 ? 0.8 : 0.2) : 1;
      ctx.strokeStyle = live ? PALETTE.laser : PALETTE.laserOff;
      ctx.globalAlpha = live ? 1 : flicker * 0.9;
      ctx.lineWidth = live ? 3 : 1.5;
      ctx.setLineDash(live ? [] : [6, 6]);
      if (live) {
        ctx.shadowColor = PALETTE.laser;
        ctx.shadowBlur = 12;
      }
      ctx.beginPath();
      ctx.moveTo(laser.x1, laser.y1);
      ctx.lineTo(laser.x2, laser.y2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      for (const [ex, ey] of [[laser.x1, laser.y1], [laser.x2, laser.y2]]) {
        drawRect({ x: ex - 5, y: ey - 5, w: 10, h: 10 }, PALETTE.paperDark, PALETTE.laser, 1.5);
      }
    }

    // Loot: gold shapes with a glow, labelled with their value.
    for (const item of state.loot) {
      if (item.taken) continue;
      drawLootShape(item);
    }
    // Objective: bigger, brighter, with a beacon ring.
    if (!state.objective.taken) {
      const o = state.objective;
      const ring = 26 + Math.sin(state.time * 3) * 4;
      ctx.strokeStyle = PALETTE.loot;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(o.x, o.y, ring, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      drawLootShape({ ...o, kind: o.kind === 'diamond' ? 'diamond' : 'objective' }, true);
    }
    // Pickups: dealer uniform (teal) and loop charges (cyan).
    for (const item of state.pickups) {
      if (item.taken) continue;
      const color = item.kind === 'disguise' ? PALETTE.disguise : '#7fd4ff';
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(item.x, item.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.paperDark;
      ctx.font = '700 13px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(item.kind === 'disguise' ? 'D' : 'L', item.x, item.y + 5);
      text(item.label, item.x, item.y + 30, 10, color, 'center');
    }

    // Cover and walls.
    for (const c of def.cover) {
      drawRect(c, PALETTE.coverFill, PALETTE.coverEdge, 2);
      if (c.label) text(c.label, c.x + c.w / 2, c.y + c.h / 2 + 4, 10, PALETTE.inkDim, 'center');
    }
    for (const wall of def.walls) {
      drawRect(wall, PALETTE.wallFill, PALETTE.wallEdge, 2);
    }

    // Camera cones, then cameras.
    for (const cam of state.cameras) {
      if (cam.looped > 0) {
        drawCone(cam.x, cam.y, cam.angle, CAMERA.viewRange, CAMERA.viewHalfAngle, 'rgba(160,160,170,0.10)', 'rgba(160,160,170,0.4)');
      } else {
        drawCone(cam.x, cam.y, cam.angle, CAMERA.viewRange, CAMERA.viewHalfAngle, PALETTE.cameraCone, PALETTE.cameraConeEdge);
      }
    }
    // Guard cones, then guards.
    for (const guard of state.guards) {
      const hot = guardAlertness(guard);
      drawCone(
        guard.x, guard.y, guard.facing, GUARD.viewRange, GUARD.viewHalfAngle,
        `rgba(255, 176, 46, ${0.14 + hot * 0.18})`, PALETTE.guardConeEdge,
      );
    }
    // Guard bodies. (Camera bodies are drawn after the HUD, below: the
    // top-mounted cameras sit under the HUD bar otherwise.)
    for (const guard of state.guards) {
      const hot = guardAlertness(guard);
      ctx.fillStyle = guard.state === 'chase' ? '#ff5252' : PALETTE.guard;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PALETTE.paperDark;
      ctx.lineWidth = 2;
      ctx.stroke();
      // Facing tick.
      ctx.beginPath();
      ctx.moveTo(guard.x, guard.y);
      ctx.lineTo(guard.x + Math.cos(guard.facing) * 18, guard.y + Math.sin(guard.facing) * 18);
      ctx.strokeStyle = PALETTE.paperDark;
      ctx.lineWidth = 3;
      ctx.stroke();
      // Awareness arc above the guard.
      if (hot > 0.02 && guard.state !== 'chase') {
        ctx.strokeStyle = hot > 0.6 ? PALETTE.alarmHigh : PALETTE.guard;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(guard.x, guard.y - 22, 9, -Math.PI / 2, -Math.PI / 2 + hot * Math.PI * 2);
        ctx.stroke();
      }
      if (guard.state === 'chase') text('!', guard.x, guard.y - 24, 18, PALETTE.alarmHigh, 'center', '700', false);
      else if (guard.state === 'suspicious' || guard.state === 'search') text('?', guard.x, guard.y - 24, 16, PALETTE.guard, 'center', '700', false);
    }

    // The thief: white figure, noise ring while running, teal when disguised.
    const p = state.player;
    if (p.running) {
      ctx.strokeStyle = PALETTE.noise;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 150, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = p.disguised ? PALETTE.disguise : PALETTE.player;
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.paperDark;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Mask band + facing tick.
    ctx.strokeStyle = PALETTE.paperDark;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(p.x - 6, p.y - 2);
    ctx.lineTo(p.x + 6, p.y - 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.facing) * 17, p.y + Math.sin(p.facing) * 17);
    ctx.lineWidth = 3;
    ctx.stroke();
    if (p.disguised) text('DEALER', p.x, p.y - 22, 10, PALETTE.disguise, 'center');
    if (p.lootCarried > 0) text(`LOOT x${p.lootCarried}`, p.x, p.y + 28, 10, PALETTE.loot, 'center');
  }

  function drawLootShape(item, big = false) {
    const s = big ? 15 : 11;
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.shadowColor = PALETTE.loot;
    ctx.shadowBlur = 14;
    ctx.fillStyle = PALETTE.loot;
    if (item.kind === 'chips') {
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.ellipse(0, -i * 4, s, s * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (item.kind === 'cash' || item.kind === 'gold') {
      ctx.fillRect(-s, -s * 0.6, s * 2, s * 1.2);
      ctx.strokeStyle = PALETTE.paperDark;
      ctx.lineWidth = 2;
      ctx.strokeRect(-s, -s * 0.6, s * 2, s * 1.2);
    } else {
      // Diamond / objective: a rotated square with a facet line.
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s, 0);
      ctx.lineTo(0, s);
      ctx.lineTo(-s, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = PALETTE.paperDark;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-s, 0);
      ctx.lineTo(s, 0);
      ctx.stroke();
    }
    ctx.restore();
    text(item.label, item.x, item.y + 30, 10, PALETTE.loot, 'center');
  }

  function alarmColor(value) {
    if (value < 40) return PALETTE.alarmLow;
    if (value < 75) return PALETTE.alarmMid;
    return PALETTE.alarmHigh;
  }

  function drawHUD(state) {
    ctx.fillStyle = 'rgba(8, 29, 56, 0.92)';
    ctx.fillRect(0, 0, W, 46);
    ctx.strokeStyle = 'rgba(234, 244, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 46.5);
    ctx.lineTo(W, 46.5);
    ctx.stroke();
    const def = state.def;
    text(`${def.name} · ${state.levelIndex + 1}/3`, 16, 20, 13, PALETTE.ink);
    text(
      state.objective.taken ? `✓ ${state.objective.label} — GO TO ${def.exit.label}` : `◯ ${def.objectiveText}`,
      16, 38, 11, state.objective.taken ? PALETTE.exit : PALETTE.inkDim,
    );
    // Alarm meter, centre.
    const ax = W / 2 - 130;
    const label = state.lockdown > 0 ? `LOCKDOWN ${Math.ceil(state.lockdown)}s` : `ALARM ${Math.round(state.alarm)}%`;
    text(label, W / 2, 19, 13, alarmColor(state.alarm), 'center');
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(ax, 26, 260, 10);
    ctx.fillStyle = alarmColor(state.alarm);
    ctx.fillRect(ax, 26, 260 * (state.alarm / 100), 10);
    ctx.strokeStyle = 'rgba(234,244,255,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(ax + 0.5, 26.5, 260, 10);
    // Right: loot, loops, time.
    text(`LOOT $${state.lootValue.toLocaleString()}`, W - 16, 20, 13, PALETTE.loot, 'right');
    text(`LOOP x${state.player.loopCharges} · ${Math.floor(state.levelTime / 60)}:${String(Math.floor(state.levelTime % 60)).padStart(2, '0')}`, W - 16, 38, 11, PALETTE.inkDim, 'right');
    // Toast message.
    if (state.message && state.messageTimer > 0) {
      ctx.globalAlpha = Math.min(1, state.messageTimer);
      text(state.message, W / 2, 72, 15, PALETTE.loot, 'center');
      ctx.globalAlpha = 1;
    }
    // Controls hint.
    text('WASD / ARROWS move · SHIFT run (loud!) · Q loop camera · P pause · M mute', W / 2, H - 34, 11, 'rgba(159,195,232,0.75)', 'center');
    // Lockdown banner.
    if (state.lockdown > 0) {
      ctx.fillStyle = 'rgba(255, 82, 82, 0.16)';
      ctx.fillRect(0, 46, W, 30);
      text('⚠ LOCKDOWN — EVERY GUARD IS HUNTING YOU ⚠', W / 2, 66, 14, PALETTE.alarmHigh, 'center');
    }
    // Zap / lockdown flash.
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255, 82, 82, ${state.flash * 0.5})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = 'rgba(8, 29, 56, 0.94)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  }

  function drawSchematic(def, x, y, w, h) {
    const sx = w / WORLD.width;
    const sy = h / WORLD.height;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = PALETTE.paperDark;
    ctx.fillRect(x, y, w, h);
    const px = (v) => x + v * sx;
    const py = (v) => y + v * sy;
    for (const wall of def.walls) {
      ctx.fillStyle = PALETTE.wallFill;
      ctx.fillRect(px(wall.x), py(wall.y), Math.max(2, wall.w * sx), Math.max(2, wall.h * sy));
    }
    for (const c of def.cover) {
      ctx.fillStyle = PALETTE.coverFill;
      ctx.fillRect(px(c.x), py(c.y), c.w * sx, c.h * sy);
    }
    for (const laser of def.lasers) {
      ctx.strokeStyle = PALETTE.laser;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px(laser.x1), py(laser.y1));
      ctx.lineTo(px(laser.x2), py(laser.y2));
      ctx.stroke();
    }
    for (const cam of def.cameras) {
      ctx.fillStyle = PALETTE.camera;
      ctx.beginPath();
      ctx.arc(px(cam.x), py(cam.y), 5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const g of def.guards) {
      ctx.fillStyle = PALETTE.guard;
      ctx.beginPath();
      ctx.arc(px(g.waypoints[0].x), py(g.waypoints[0].y), 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.loot;
    ctx.beginPath();
    ctx.arc(px(def.objective.x), py(def.objective.y), 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.exit;
    ctx.lineWidth = 2;
    ctx.strokeRect(px(def.exit.x), py(def.exit.y), def.exit.w * sx, def.exit.h * sy);
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.arc(px(def.start.x), py(def.start.y), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(234,244,255,0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
  }

  function drawTitle() {
    drawBackground();
    text('BLUEPRINT', W / 2, 250, 92, PALETTE.ink, 'center', '700', false);
    text('THE ASHFORD CASINO JOB', W / 2, 300, 30, PALETTE.loot, 'center');
    text('A heist in three floors, drawn on blueprint paper.', W / 2, 340, 16, PALETTE.inkDim, 'center');
    text('Read the cones. Time the lasers. Mind the noise.', W / 2, 368, 16, PALETTE.inkDim, 'center');
    text('WASD / ARROWS — move      SHIFT — run (loud!)', W / 2, 440, 15, PALETTE.ink, 'center');
    text('Q — loop the nearest camera      P — pause      M — mute', W / 2, 468, 15, PALETTE.ink, 'center');
    text('Walk is silent. Running is fast — and guards hear it.', W / 2, 510, 14, PALETTE.guard, 'center');
    text('The dealer uniform fools guards, not cameras. Running tears it off.', W / 2, 534, 14, PALETTE.disguise, 'center');
    const blink = Math.sin(Date.now() / 300) > -0.2;
    if (blink) text('— PRESS ENTER OR CLICK TO START —', W / 2, 620, 20, PALETTE.exit, 'center');
    text('An original game — art, code and sound made for this bounty.', W / 2, 700, 12, PALETTE.inkDim, 'center');
  }

  function drawBriefing(state) {
    drawBackground();
    drawRoom(state);
    ctx.fillStyle = 'rgba(8, 29, 56, 0.72)';
    ctx.fillRect(0, 0, W, H);
    panel(190, 90, 900, 620);
    const def = state.def;
    text(`FLOOR ${state.levelIndex + 1} — ${def.name}`, 640, 150, 30, PALETTE.ink, 'center', '700', false);
    text(def.subtitle, 640, 182, 15, PALETTE.inkDim, 'center');
    drawSchematic(def, 300, 210, 680, 300);
    text(`OBJECTIVE: ${def.objectiveText}`, 640, 548, 14, PALETTE.loot, 'center');
    const tools = [`LOOP FEED x${state.player.loopCharges} (Q freezes the nearest camera)`];
    if (def.pickups.some((p) => p.kind === 'disguise')) tools.push('A DEALER UNIFORM is stashed on this floor — guards will ignore you');
    if (def.lasers.length > 0) tools.push('LASER GRID: cross on the dark beat, or go around');
    tools.forEach((t, i) => text(`· ${t}`, 640, 576 + i * 22, 13, PALETTE.inkDim, 'center'));
    const blink = Math.sin(Date.now() / 300) > -0.2;
    if (blink) text('— PRESS ENTER TO BEGIN THE FLOOR —', 640, 672, 18, PALETTE.exit, 'center');
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(8, 29, 56, 0.7)';
    ctx.fillRect(0, 0, W, H);
    text('PAUSED', W / 2, 380, 56, PALETTE.ink, 'center', '700', false);
    text('Press P or ENTER to resume', W / 2, 420, 16, PALETTE.inkDim, 'center');
  }

  /** Camera bodies, painted after the HUD so wall-mounted cameras show. */
  function drawCameraBodies(state) {
    for (const cam of state.cameras) {
      ctx.fillStyle = cam.looped > 0 ? '#9a9aa5' : PALETTE.camera;
      ctx.beginPath();
      ctx.arc(cam.x, cam.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.paperDark;
      ctx.beginPath();
      ctx.arc(cam.x, cam.y, 4, 0, Math.PI * 2);
      ctx.fill();
      if (cam.looped > 0) text('LOOPED', cam.x, cam.y + 24, 10, '#c9c9d4', 'center');
    }
  }

  function drawBusted(state) {
    ctx.fillStyle = 'rgba(60, 8, 8, 0.72)';
    ctx.fillRect(0, 0, W, H);
    panel(340, 180, 600, 320);
    text('BUSTED!', W / 2, 260, 56, PALETTE.alarmHigh, 'center', '700', false);
    text('A guard caught you with the goods in hand.', W / 2, 300, 15, PALETTE.inkDim, 'center');
    text(`Loot kept: $${state.lootValue.toLocaleString()} · Score: ${state.score.toLocaleString()}`, W / 2, 360, 15, PALETTE.ink, 'center');
    text('The alarm meter and the "!" over a guard are your warnings —', W / 2, 400, 13, PALETTE.inkDim, 'center');
    text('break line of sight and the heat dies down.', W / 2, 422, 13, PALETTE.inkDim, 'center');
    const blink = Math.sin(Date.now() / 300) > -0.2;
    if (blink) text('— PRESS ENTER TO RETRY THIS FLOOR —', W / 2, 480, 18, PALETTE.exit, 'center');
  }

  function drawLevelDone(state) {
    ctx.fillStyle = 'rgba(8, 29, 56, 0.72)';
    ctx.fillRect(0, 0, W, H);
    panel(340, 220, 600, 320);
    text('FLOOR CLEAR', W / 2, 300, 48, PALETTE.exit, 'center', '700', false);
    text(`${state.def.name} — done in ${Math.floor(state.levelTime)}s`, W / 2, 340, 15, PALETTE.inkDim, 'center');
    text(`Loot so far: $${state.lootValue.toLocaleString()}`, W / 2, 400, 16, PALETTE.loot, 'center');
    text(`Score: ${state.score.toLocaleString()}`, W / 2, 430, 16, PALETTE.ink, 'center');
    const blink = Math.sin(Date.now() / 300) > -0.2;
    if (blink) text('— PRESS ENTER FOR THE NEXT FLOOR —', W / 2, 500, 18, PALETTE.exit, 'center');
  }

  function drawGetaway(state) {
    drawBackground();
    text('YOU GOT AWAY', W / 2, 200, 64, PALETTE.exit, 'center', '700', false);
    text('The Ashford Diamond is yours. The van is already moving.', W / 2, 248, 17, PALETTE.inkDim, 'center');
    panel(390, 300, 500, 250);
    const rows = [
      ['LOOT', `$${state.lootValue.toLocaleString()}`],
      ['TIME BONUS', `+$${state.timeBonus.toLocaleString()}`],
      ['GHOST BONUS', state.ghostBonus > 0 ? `+$${state.ghostBonus.toLocaleString()}` : '—'],
      ['TOTAL SCORE', `${state.score.toLocaleString()}`],
    ];
    rows.forEach(([label, value], i) => {
      const y = 350 + i * 44;
      text(label, 420, y, 16, i === 3 ? PALETTE.loot : PALETTE.inkDim);
      text(value, 860, y, 16, i === 3 ? PALETTE.loot : PALETTE.ink, 'right');
    });
    if (state.ghostBonus > 0) text('GHOST: never spotted, alarm never past 30. Clean work.', W / 2, 590, 14, PALETTE.disguise, 'center');
    const blink = Math.sin(Date.now() / 300) > -0.2;
    if (blink) text('— PRESS ENTER TO RUN IT AGAIN —', W / 2, 660, 18, PALETTE.exit, 'center');
  }

  /** Paint the current state under the current screen. */
  function draw(state, screen) {
    drawBackground();
    if (screen === SCREEN.TITLE) {
      drawTitle();
      return;
    }
    if (screen === SCREEN.GETAWAY) {
      drawGetaway(state);
      return;
    }
    if (screen === SCREEN.BRIEFING) {
      drawBriefing(state);
      return;
    }
    drawRoom(state);
    drawHUD(state);
    drawCameraBodies(state);
    if (screen === SCREEN.PAUSED) drawPaused();
    if (screen === SCREEN.BUSTED) drawBusted(state);
    if (screen === SCREEN.LEVEL_DONE) drawLevelDone(state);
  }

  return { draw };
}
