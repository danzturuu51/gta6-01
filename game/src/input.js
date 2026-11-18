// Keyboard and mouse input for a third-person game. Held keys are read every
// frame; one-shot presses (enter car, punch, pause, mission) are queued as
// flags and taken once by the loop, so a press between frames is never lost.

export function createInput(canvas) {
  const keys = new Set();
  let pressed = new Set();
  let mouseDown = false;
  let dragX = 0;
  let dragY = 0;
  let dragging = false;

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    pressed.add(event.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    keys.clear();
  });

  canvas.addEventListener('pointerdown', (event) => {
    dragging = true;
    mouseDown = true;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    dragX += event.movementX || 0;
    dragY += event.movementY || 0;
  });
  const endDrag = () => {
    dragging = false;
    mouseDown = false;
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  return {
    held(code) {
      return keys.has(code);
    },
    // WASD / arrows as -1..1 axes: forward is W, right strafe is D.
    moveAxis() {
      const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0)
        - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
      const s = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0)
        - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      return { forward: f, strafe: s };
    },
    // One-shot: was this code pressed since the last take?
    wasPressed(code) {
      return pressed.has(code);
    },
    takePressed() {
      const out = pressed;
      pressed = new Set();
      return out;
    },
    takeDrag() {
      const d = { x: dragX, y: dragY };
      dragX = 0;
      dragY = 0;
      return d;
    },
    takeClick() {
      const c = mouseDown;
      mouseDown = false;
      return c;
    },
  };
}
