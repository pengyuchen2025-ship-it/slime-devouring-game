// 键盘（WASD / 方向键 / 空格）+ 触屏或鼠标浮动摇杆
export function createInput(stickEl, knobEl, onSkill) {
  const keys = new Set();
  const dir = { x: 0, z: 0 };
  let ptr = null;
  addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) onSkill(); return; }
    keys.add(e.code);
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());

  const canvasTarget = e => !e.target.closest('.ui-block');
  addEventListener('pointerdown', e => {
    if (!canvasTarget(e) || ptr) return;
    ptr = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0 };
    stickEl.style.display = 'block';
    stickEl.style.left = e.clientX + 'px'; stickEl.style.top = e.clientY + 'px';
    knobEl.style.transform = 'translate(-50%,-50%)';
  });
  addEventListener('pointermove', e => {
    if (!ptr || e.pointerId !== ptr.id) return;
    let dx = e.clientX - ptr.x0, dy = e.clientY - ptr.y0;
    const len = Math.hypot(dx, dy), max = 55;
    if (len > max) { dx *= max / len; dy *= max / len; }
    ptr.dx = dx; ptr.dy = dy;
    knobEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  });
  const end = e => { if (ptr && e.pointerId === ptr.id) { ptr = null; stickEl.style.display = 'none'; } };
  addEventListener('pointerup', end);
  addEventListener('pointercancel', end);

  return {
    read() {
      let x = 0, z = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) z -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) z += 1;
      if (ptr) {
        const len = Math.hypot(ptr.dx, ptr.dy);
        if (len > 6) { x = ptr.dx / 55; z = ptr.dy / 55; }
      }
      const l = Math.hypot(x, z);
      if (l > 1) { x /= l; z /= l; }
      dir.x = x; dir.z = z;
      return dir;
    },
  };
}
