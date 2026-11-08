// WebAudio 合成音效，不依赖音频文件
let ctx = null, master = null;
export function unlockAudio() {
  if (ctx) { ctx.resume(); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
}
function tone({ type = 'sine', f0, f1, dur, vol = 0.3, delay = 0 }) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.02);
}
let lastPop = 0;
export const sfx = {
  pop(big01 = 0) {
    if (!ctx || ctx.currentTime - lastPop < 0.03) return;
    lastPop = ctx.currentTime;
    const base = 900 - big01 * 650 + Math.random() * 120;
    tone({ f0: base, f1: base * 0.35, dur: 0.12 + big01 * 0.2, vol: 0.25 + big01 * 0.2 });
    if (big01 > 0.5) tone({ type: 'triangle', f0: 120, f1: 50, dur: 0.35, vol: 0.35 });
  },
  boing() { tone({ type: 'triangle', f0: 180, f1: 420, dur: 0.18, vol: 0.2 }); },
  tier() { [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'square', f0: f, f1: f, dur: 0.16, vol: 0.12, delay: i * 0.09 })); },
  click() { tone({ type: 'square', f0: 700, f1: 900, dur: 0.06, vol: 0.1 }); },
  swell() { tone({ type: 'sawtooth', f0: 120, f1: 520, dur: 0.45, vol: 0.15 }); },
  beep() { tone({ type: 'square', f0: 1200, f1: 1200, dur: 0.12, vol: 0.12 }); },
  slam() { tone({ type: 'triangle', f0: 90, f1: 40, dur: 0.4, vol: 0.4 }); },
};
