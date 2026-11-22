// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps, and the renderer paints what is there. The game moves
// between seven screens: title, briefing, play, paused, busted, floor clear
// and getaway.
//
// ?shot=cover|getaway|briefing|caught stages that scene instead of running
// the loop, paints it twice and sets window.__shotReady for a screenshot.
import { STEP } from './config.js';
import { createWorld, stepWorld, nextLevel, PHASE } from './world.js';
import { ACTION, createInput } from './input.js';
import { createRenderer, SCREEN } from './render.js';
import { stageShot } from './shots.js';
import { SFX, setMuted, isMuted } from './audio.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);

function announce(msg) {
  if (status) status.textContent = msg;
}

function playEventSound(event) {
  if (event === 'pickup') SFX.pickup();
  else if (event === 'objective') SFX.objective();
  else if (event === 'alert') SFX.alert();
  else if (event === 'zap') SFX.zap();
  else if (event === 'loop') SFX.loop();
  else if (event === 'lockdown') SFX.lockdown();
  else if (event === 'caught') SFX.caught();
  else if (event === 'getaway') SFX.getaway();
  else if (event === 'disguise') SFX.loop();
}

function runShot(name) {
  const scene = stageShot(name);
  let painted = 0;
  function paint() {
    renderer.draw(scene.state, scene.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let world = createWorld(0);
  let screen = SCREEN.TITLE;
  let accumulator = 0;
  let last = performance.now();

  function startFloor(index) {
    world = index === 0 ? createWorld(0) : nextLevel(world);
    screen = SCREEN.BRIEFING;
    announce(`${world.def.name}. ${world.def.objectiveText}`);
  }

  function retryFloor() {
    const carried = {
      score: world.score,
      lootValue: world.lootValue,
      lootTaken: world.lootTaken,
      timeBonus: world.timeBonus,
      maxAlarm: world.maxAlarm,
      spotted: world.spotted,
      loopCharges: world.player.loopCharges,
    };
    world = createWorld(world.levelIndex);
    Object.assign(world, {
      score: carried.score,
      lootValue: carried.lootValue,
      lootTaken: carried.lootTaken,
      timeBonus: carried.timeBonus,
      maxAlarm: carried.maxAlarm,
      spotted: carried.spotted,
    });
    world.player.loopCharges = carried.loopCharges;
    screen = SCREEN.BRIEFING;
  }

  function frame(now) {
    const dt = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;

    if (input.action(ACTION.MUTE)) setMuted(!isMuted());

    if (screen === SCREEN.TITLE) {
      if (input.action(ACTION.CONFIRM)) {
        SFX.click();
        startFloor(0);
      }
    } else if (screen === SCREEN.BRIEFING) {
      if (input.action(ACTION.CONFIRM)) {
        SFX.click();
        screen = SCREEN.PLAY;
      }
    } else if (screen === SCREEN.PLAY) {
      if (input.action(ACTION.PAUSE)) {
        screen = SCREEN.PAUSED;
      } else {
        accumulator += dt;
        let loopQueued = input.action(ACTION.LOOP);
        while (accumulator >= STEP) {
          const mv = input.movement();
          const events = stepWorld(
            world,
            { mx: mv.mx, my: mv.my, run: mv.run, loop: loopQueued },
            STEP,
          );
          loopQueued = false;
          for (const event of events) playEventSound(event);
          accumulator -= STEP;
          if (world.phase === PHASE.BUSTED) screen = SCREEN.BUSTED;
          else if (world.phase === PHASE.LEVEL_DONE) screen = SCREEN.LEVEL_DONE;
          else if (world.phase === PHASE.GETAWAY) screen = SCREEN.GETAWAY;
          if (world.phase !== PHASE.PLAY) break;
        }
      }
    } else if (screen === SCREEN.PAUSED) {
      if (input.action(ACTION.PAUSE) || input.action(ACTION.CONFIRM)) screen = SCREEN.PLAY;
    } else if (screen === SCREEN.BUSTED) {
      if (input.action(ACTION.CONFIRM)) retryFloor();
    } else if (screen === SCREEN.LEVEL_DONE) {
      if (input.action(ACTION.CONFIRM)) startFloor(world.levelIndex + 1);
    } else if (screen === SCREEN.GETAWAY) {
      if (input.action(ACTION.CONFIRM)) {
        world = createWorld(0);
        screen = SCREEN.TITLE;
      }
    }

    renderer.draw(world, screen);
    input.endFrame();
    requestAnimationFrame(frame);
  }

  announce('BLUEPRINT: The Ashford Casino Job. Press Enter to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
