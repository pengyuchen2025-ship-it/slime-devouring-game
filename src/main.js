import * as THREE from 'three';
import { SLIME, SKILLS, CHARACTERS, ITEM_TYPES, TIERS, MAP, BOSS, CARDS, KG_PER_UNIT, ONOMATOPOEIA, BIG_ONOMATOPOEIA } from './config.js';
import { ItemManager } from './items.js';
import { buildEnvironment, populate } from './world.js';
import { createSlime } from './slime.js';
import { createInput } from './input.js';
import { placeholderParts } from './placeholders.js';
import { sfx, unlockAudio } from './audio.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const isMobile = matchMedia('(pointer: coarse)').matches;

// ---------- 渲染 ----------
const renderer = new THREE.WebGLRenderer({ antialias: !isMobile || devicePixelRatio < 2, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.75 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 900);
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

const env = buildEnvironment(scene, renderer);
const items = new ItemManager(scene);
const START = { x: 0, z: 16 };
const world = populate(items, START);
items.build();

// 祭坛上的 Boss 虚影
const ghost = new THREE.Mesh(placeholderParts('garbage_truck')[0].geometry, new THREE.MeshBasicMaterial({ color: 0xb98cff, transparent: true, opacity: 0.45, depthWrite: false }));
ghost.scale.setScalar(3.2); ghost.position.y = 1.2;
env.altar.add(ghost);

// ---------- 史莱姆状态 ----------
const char = CHARACTERS.normal;
const skill = SKILLS[char.skill];
const slime = createSlime(scene, char.color, char.rim);
const S = {
  x: START.x, z: START.z, vx: 0, vz: 0,
  mass: SLIME.startRadius ** 3, r: SLIME.startRadius,
  attract: SLIME.attract, speedMul: 1, dissolveTime: SLIME.dissolveTime, eatFactor: SLIME.eatFactor,
  skillCdMul: 1, skillDurAdd: 0, bossDamage: SLIME.bossDamage,
  skillT: 0, skillCd: 0, squash: 0, tier: 0, bounceCd: 0,
};
const trueR = () => Math.cbrt(S.mass);
const effR = () => trueR() * (S.skillT > 0 ? skill.scale : 1);
// 每档门槛：该档最大物件尺寸
const tierSize = TIERS.map((_, k) => Math.max(...Object.values(ITEM_TYPES).filter(d => d.tier === k).map(d => d.size)));
const tierOf = r => { let t = 0; for (let k = 0; k < tierSize.length; k++) if (r * S.eatFactor >= tierSize[k]) t = k; return t; };

// ---------- 游戏流程 ----------
let running = false, paused = false, elapsed = 0, time = 0;
const input = createInput($('stick'), $('knob'), useSkill);
$('skill').addEventListener('pointerdown', e => { e.stopPropagation(); useSkill(); });
$('startbtn').addEventListener('click', () => { unlockAudio(); $('start').classList.remove('show'); running = true; sfx.tier(); banner('开吃！', '吞掉比你小的东西'); });
$('summon').addEventListener('click', () => { sfx.click(); banner('Boss 战开发中', '下一版上线'); });

function useSkill() {
  if (!running || paused || S.skillCd > 0) return;
  S.skillT = skill.duration + S.skillDurAdd;
  S.skillCd = skill.cooldown * S.skillCdMul;
  S.squash = 1;
  sfx.swell();
}

let bannerTimer = 0;
function banner(text, sub = '', dur = 1.8) {
  const b = $('banner');
  b.innerHTML = text + (sub ? `<span class="sub">${sub}</span>` : '');
  b.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => b.classList.remove('show'), dur * 1000);
}

// ---------- 飘字 ----------
const floats = $('floats');
const _v = new THREE.Vector3();
function floatText(text, x, y, z, big = false) {
  _v.set(x, y, z).project(camera);
  if (_v.z > 1) return;
  if (floats.childElementCount > 14) floats.firstChild.remove();
  const el = document.createElement('div');
  el.className = 'float stroke' + (big ? ' big' : '');
  el.textContent = text;
  el.style.left = ((_v.x + 1) / 2 * innerWidth) + 'px';
  el.style.top = ((1 - _v.y) / 2 * innerHeight) + 'px';
  floats.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

// ---------- 吞噬 ----------
const inside = []; // {obj, t, from, off, scale0, spin}
function eat(it) {
  items.remove(it);
  const obj = items.makeLoose(it);
  scene.add(obj);
  const r = trueR();
  const s = it.def.size;
  const fit = Math.min(1, (0.75 * r) / s);
  const a = Math.random() * Math.PI * 2, d = Math.random() * 0.45;
  inside.push({ obj, t: 0, from: new THREE.Vector3(it.x, 0, it.z), off: new THREE.Vector3(Math.cos(a) * d, -0.35 + Math.random() * 0.4, Math.sin(a) * d), sx: obj.scale.x * fit, sy: obj.scale.y * fit, spin: (Math.random() - 0.5) * 4, dur: S.dissolveTime * (0.7 + 0.6 * Math.min(1, s / r)) });
  if (inside.length > 70) { const o = inside.shift(); scene.remove(o.obj); }
  S.mass += s ** 3 * it.def.gain;
  const rel = Math.min(1, s / r);
  sfx.pop(rel);
  S.squash = Math.max(S.squash, 0.25 + rel * 0.6);
  if (rel > 0.45) floatText(BIG_ONOMATOPOEIA[(Math.random() * BIG_ONOMATOPOEIA.length) | 0] + ' ' + it.def.name, it.x, s, it.z, true);
  else if (Math.random() < 0.35) floatText(ONOMATOPOEIA[(Math.random() * ONOMATOPOEIA.length) | 0], it.x, s + r * 0.5, it.z);
}

function updateInside(dt) {
  const r = slime.root.scale.x;
  for (let i = inside.length - 1; i >= 0; i--) {
    const o = inside[i];
    o.t += dt;
    const target = _v.set(S.x + o.off.x * r, r * 0.82 + o.off.y * r - o.sy * 0.4, S.z + o.off.z * r);
    if (o.t < 0.18) {
      o.obj.position.lerpVectors(o.from, target, o.t / 0.18);
    } else {
      o.obj.position.copy(target);
      const k = Math.max(0, 1 - (o.t - 0.18) / o.dur);
      o.obj.scale.set(o.sx * k, o.sy * k, o.sx * k);
      o.obj.rotation.y += o.spin * dt;
      o.obj.rotation.x += o.spin * 0.5 * dt;
      if (k <= 0) { scene.remove(o.obj); inside.splice(i, 1); }
    }
  }
}

// ---------- 档位与强化卡 ----------
function checkTier() {
  const t = tierOf(trueR());
  if (t > S.tier) {
    S.tier = t;
    sfx.tier();
    banner('进化！', '现在能吞：' + TIERS[t].items.join('、'), 2.2);
    setTimeout(showCards, 1300);
  }
}
let cardTimer = null;
function showCards() {
  paused = true;
  const pool = [...CARDS].sort(() => Math.random() - 0.5).slice(0, 3);
  const list = $('cardlist');
  list.innerHTML = '';
  const choose = c => {
    clearInterval(cardTimer);
    c.apply(S);
    sfx.click();
    $('cards').classList.remove('show');
    paused = false;
    banner(c.icon + ' ' + c.name, c.desc, 1.4);
  };
  for (const c of pool) {
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `<div class="ic">${c.icon}</div><div><b>${c.name}</b><small>${c.desc}</small></div>`;
    el.addEventListener('click', () => choose(c));
    list.appendChild(el);
  }
  $('cards').classList.add('show');
  let left = 5;
  const bar = $('cardtimer').firstChild;
  bar.style.transition = 'none'; bar.style.width = '100%';
  requestAnimationFrame(() => { bar.style.transition = 'width 5s linear'; bar.style.width = '0%'; });
  cardTimer = setInterval(() => { if (--left <= 0) choose(pool[(Math.random() * 3) | 0]); }, 1000);
}

// ---------- 补刷 ----------
let respawnCd = 0;
function maybeRespawn(dt) {
  respawnCd -= dt;
  if (respawnCd > 0 || items.aliveCount() > items.initialCount * MAP.respawnBelow) return;
  respawnCd = 20;
  const maxTier = Math.min(2, Math.max(1, S.tier));
  const types = Object.keys(ITEM_TYPES).filter(t => ITEM_TYPES[t].tier <= maxTier);
  const n = Math.floor(items.initialCount * 0.2);
  let made = 0;
  for (let i = 0; i < n * 4 && made < n; i++) {
    const type = types[(Math.random() * types.length) | 0];
    const edge = MAP.bound - 4 - Math.random() * 30;
    const along = (Math.random() * 2 - 1) * (MAP.bound - 4);
    const side = (Math.random() * 4) | 0;
    const x = side === 0 ? edge : side === 1 ? -edge : along;
    const z = side === 2 ? edge : side === 3 ? -edge : along;
    if (Math.hypot(x - S.x, z - S.z) < trueR() * 3 + 10) continue;
    let ok = true;
    for (const it of items.items) if (it.alive && Math.hypot(it.x - x, it.z - z) < it.def.size + ITEM_TYPES[type].size) { ok = false; break; }
    if (!ok) continue;
    items.spawn(type, x, z, { color: type === 'car' ? [0xe8323c, 0x2f80ed, 0xf2c94c, 0x27ae60][made % 4] : null });
    made++;
  }
  banner('文明重建中…', '城市边缘出现了新的物件');
}

// ---------- 主循环 ----------
const camPos = new THREE.Vector3(START.x, 12, START.z + 12), camLook = new THREE.Vector3();
const dir3 = new THREE.Vector3();
let shadowSize = 0;
function step(dt) {
  const dir = input.read();
  const rT = trueR(), rE = effR();
  const speed = (SLIME.speedBase + SLIME.speedScale * Math.pow(rT, 0.85)) * S.speedMul;
  const acc = Math.min(1, dt * 8);
  S.vx += (dir.x * speed - S.vx) * acc;
  S.vz += (dir.z * speed - S.vz) * acc;
  S.x = THREE.MathUtils.clamp(S.x + S.vx * dt, -MAP.bound, MAP.bound);
  S.z = THREE.MathUtils.clamp(S.z + S.vz * dt, -MAP.bound, MAP.bound);
  S.skillT = Math.max(0, S.skillT - dt);
  S.skillCd = Math.max(0, S.skillCd - dt);
  S.bounceCd -= dt;

  // 吞噬 / 碰撞
  const effTier = tierOf(rE);
  const reach = rE * (1 + S.attract);
  for (const it of items.items) {
    if (!it.alive) continue;
    const s = it.def.size;
    const dx = it.x - S.x, dz = it.z - S.z;
    const lim = reach + s;
    if (dx > lim || dx < -lim || dz > lim || dz < -lim) continue;
    const d = Math.hypot(dx, dz);
    if (it.def.tier <= effTier) {
      if (d < reach + s * 0.3) eat(it);
    } else if (d < rE * 0.9 + s * 0.75) {
      const nx = dx / (d || 1), nz = dz / (d || 1);
      const push = rE * 0.9 + s * 0.75 - d;
      S.x -= nx * push; S.z -= nz * push;
      const vn = S.vx * nx + S.vz * nz;
      if (vn > 0) { S.vx -= 1.6 * vn * nx; S.vz -= 1.6 * vn * nz; }
      if (S.bounceCd <= 0 && vn > speed * 0.4) { sfx.boing(); S.bounceCd = 0.4; S.squash = 0.5; if (Math.random() < 0.5) floatText('咚！', S.x + nx * rE, rE * 1.5, S.z + nz * rE); }
    }
  }
  checkTier();
  maybeRespawn(dt);

  // 史莱姆显示：半径平滑趋近
  S.r += (rE - S.r) * Math.min(1, dt * 6);
  S.squash = Math.max(0, S.squash - dt * 2.5);
  slime.root.position.x = S.x; slime.root.position.z = S.z;
  dir3.set(S.vx, 0, S.vz);
  slime.update(dt, time, S.r, dir3, Math.min(1, Math.hypot(S.vx, S.vz) / speed), S.squash);
  updateInside(dt);

  // 祭坛面板
  const nearAltar = Math.hypot(S.x, S.z) < 5 + S.r * 0.5;
  $('altar').classList.toggle('show', nearAltar && !paused);
  if (nearAltar) {
    const bossKg = BOSS.size ** 3 * KG_PER_UNIT * 2, youKg = S.mass * KG_PER_UNIT;
    const ratio = youKg / bossKg;
    $('altarvs').textContent = `${BOSS.name} ${fmt(bossKg)} kg  vs  你 ${fmt(youKg)} kg`;
    const v = $('altarverdict');
    v.textContent = ratio < 0.5 ? '🔴 你还太小了' : ratio < 0.9 ? '🟡 有机会，拼一把？' : '🟢 稳赢！';
    v.style.color = ratio < 0.5 ? '#ff8a8a' : ratio < 0.9 ? '#ffe27a' : '#8affb0';
  }
}

function fmt(n) { return Math.round(n).toLocaleString('en-US'); }

function updateCamera(dt) {
  const r = S.r;
  const portrait = innerHeight > innerWidth;
  const dist = (5 + r * 7.5) * (portrait ? 1.45 : 1);
  const tgt = _v.set(S.x, r * 0.6, S.z);
  camLook.lerp(tgt, Math.min(1, dt * 6));
  const want = new THREE.Vector3(S.x, r * 0.6 + dist * 0.82, S.z + dist * 0.62);
  camPos.lerp(want, Math.min(1, dt * 4));
  camera.position.copy(camPos);
  camera.lookAt(camLook);
  // 阴影跟随
  const sz = Math.max(25, r * 9);
  if (Math.abs(sz - shadowSize) > shadowSize * 0.15) {
    shadowSize = sz;
    const c = env.sun.shadow.camera;
    c.left = -sz; c.right = sz; c.top = sz; c.bottom = -sz; c.near = 1; c.far = sz * 6;
    c.updateProjectionMatrix();
  }
  env.sun.target.position.set(S.x, 0, S.z);
  env.sun.position.set(S.x - sz * 1.2, sz * 2.2, S.z + sz * 0.8);
}

function updateHud() {
  $('remain').textContent = '剩余 ' + items.aliveCount();
  const m = Math.floor(elapsed / 60), s = Math.floor(elapsed % 60);
  $('timer').textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  $('kgnum').textContent = fmt(S.mass * KG_PER_UNIT);
  const t = S.tier, next = tierSize[t + 1];
  if (next) {
    const r0 = (tierSize[t] / S.eatFactor), r1 = next / S.eatFactor;
    const p = THREE.MathUtils.clamp((trueR() - (t === 0 ? SLIME.startRadius : r0)) / (r1 - (t === 0 ? SLIME.startRadius : r0)), 0, 1);
    $('tierbar').firstChild.style.width = (p * 100).toFixed(1) + '%';
    $('nexttier').textContent = '下一档：' + TIERS[t + 1].items.join('、');
  } else {
    $('tierbar').firstChild.style.width = '100%';
    $('nexttier').textContent = '已是最大档 · 去中央祭坛召唤 Boss！';
  }
  const sk = $('skill');
  const total = skill.cooldown * S.skillCdMul;
  sk.style.setProperty('--cd', S.skillCd > 0 ? (S.skillCd / total * 100).toFixed(1) + '%' : '0%');
  sk.classList.toggle('active', S.skillT > 0);
}

let last = performance.now(), hudT = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  time += dt;
  env.ring.rotation.z += dt * 0.8;
  ghost.rotation.y += dt * 0.6;
  ghost.position.y = 1.4 + Math.sin(time * 2) * 0.3;
  if (running && !paused) { elapsed += dt; step(dt); }
  else slime.update(dt, time, S.r, dir3.set(0, 0, 0), 0, S.squash);
  updateCamera(dt);
  hudT -= dt;
  if (hudT <= 0) { updateHud(); hudT = 0.1; }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
updateHud();
requestAnimationFrame(frame);

if (DEBUG) {
  addEventListener('keydown', e => { if (e.code === 'KeyG') S.mass *= 2; });
  window.__game = { S, items, scene, camera };
}
