// Keyboard (and click-to-confirm) input. Movement keys are read as a vector
// every frame; action keys (confirm, pause, mute, loop) fire once per press.
export const ACTION = {
  CONFIRM: 'confirm',
  PAUSE: 'pause',
  MUTE: 'mute',
  LOOP: 'loop',
};

const MOVE_KEYS = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export function createInput(canvas) {
  const down = new Set();
  const pressed = new Set();
  let clickQueued = false;

  function onKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (!e.repeat) pressed.add(e.code);
    down.add(e.code);
  }
  function onKeyUp(e) {
    down.delete(e.code);
  }
  function onClick() {
    clickQueued = true;
  }
  function onBlur() {
    down.clear();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('click', onClick);

  /** Movement vector for this frame, plus whether run is held. */
  function movement() {
    let mx = 0;
    let my = 0;
    for (const code of down) {
      const v = MOVE_KEYS[code];
      if (v) {
        mx += v[0];
        my += v[1];
      }
    }
    return { mx, my, run: down.has('ShiftLeft') || down.has('ShiftRight') };
  }

  /** True once when the key for `action` was pressed since the last poll. */
  function action(name) {
    if (name === ACTION.CONFIRM && clickQueued) return true;
    const codes = {
      [ACTION.CONFIRM]: ['Enter', 'Space'],
      [ACTION.PAUSE]: ['KeyP', 'Escape'],
      [ACTION.MUTE]: ['KeyM'],
      [ACTION.LOOP]: ['KeyQ'],
    }[name];
    return codes.some((c) => pressed.has(c));
  }

  /** Clear the one-shot presses; call once per frame after polling. */
  function endFrame() {
    pressed.clear();
    clickQueued = false;
  }

  return { movement, action, endFrame };
}
