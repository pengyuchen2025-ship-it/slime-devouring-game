// 现代地图：地面、道路、灯光、祭坛，以及物件摆放。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MAP, ITEM_TYPES } from './config.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[(Math.random() * arr.length) | 0];
const CAR_COLORS = [0xe8323c, 0x2f80ed, 0xf2c94c, 0xffffff, 0x27ae60, 0xff7ab6, 0x9b51e0, 0x56ccf2];
const BUILDING_COLORS = [0xffb3a7, 0xffe0a3, 0xa8e6cf, 0xa7c7ff, 0xf6c1ff, 0xfff1c1, 0xc9f2ff, 0xffd1dc];

export function buildEnvironment(scene, renderer) {
  scene.background = new THREE.Color(0xffb08a);
  scene.fog = new THREE.Fog(0xffb08a, 120, 330);

  // 黄昏光照
  const hemi = new THREE.HemisphereLight(0xfff0e0, 0xb7a8ff, 1.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffc48a, 1.9);
  sun.position.set(-60, 70, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.05;
  scene.add(sun, sun.target);

  // 天空渐变球
  const skyGeo = new THREE.SphereGeometry(400, 24, 12);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x6a7bd8) }, mid: { value: new THREE.Color(0xff9e7a) }, bot: { value: new THREE.Color(0xffd29a) } },
    vertexShader: 'varying vec3 vp; void main(){ vp = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vp; void main(){ float h = normalize(vp).y; vec3 c = h > 0.05 ? mix(mid, top, smoothstep(0.05, 0.6, h)) : mix(bot, mid, smoothstep(-0.2, 0.05, h)); gl_FragColor = vec4(c,1.0); }',
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  // 地面
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.MeshLambertMaterial({ color: 0x9ee08a }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // 道路 + 人行道
  const roads = [], walks = [], lines = [];
  const ext = MAP.half + 15;
  for (let c = -MAP.half + 0; c <= MAP.half; c += MAP.block) {
    const p = c; // 道路中心线
    roads.push(strip(p, 0, MAP.road, ext * 2, true), strip(0, p, ext * 2, MAP.road, true));
    walks.push(strip(p, 0, MAP.road + 3, ext * 2, true, 0.005), strip(0, p, ext * 2, MAP.road + 3, true, 0.005));
    for (let t = -ext; t < ext; t += 6) { lines.push(strip(p, t, 0.3, 2.5, true, 0.02), strip(t, p, 2.5, 0.3, true, 0.02)); }
  }
  addMerged(scene, walks, 0xf0e6da);
  addMerged(scene, roads, 0x8a8798, 0.01);
  addMerged(scene, lines, 0xfff3c4);

  // 中央广场 + 祭坛
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(11, 40), new THREE.MeshLambertMaterial({ color: 0xe8dccb }));
  plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.03; plaza.receiveShadow = true;
  scene.add(plaza);
  const altar = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.8, 0.6, 6), new THREE.MeshLambertMaterial({ color: 0x7a6a8a, flatShading: true }));
  base.position.y = 0.3; base.receiveShadow = true; base.castShadow = true;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.18, 6, 36), new THREE.MeshBasicMaterial({ color: 0xff4fd8 }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.65;
  altar.add(base, ring);
  scene.add(altar);

  return { sun, altar, ring };
}

function strip(x, z, w, d, flat, y = 0) {
  const g = new THREE.PlaneGeometry(w, d);
  g.rotateX(-Math.PI / 2);
  g.translate(x, 0.02 + y, z);
  return g;
}
function addMerged(scene, geos, color, y = 0) {
  const m = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshLambertMaterial({ color }));
  m.position.y = y; m.receiveShadow = true;
  scene.add(m);
}

// ---------- 物件摆放 ----------
export function populate(items, startPos) {
  const placed = [];
  const free = (x, z, r) => {
    if (Math.hypot(x, z) < 12 + r) return false;                 // 广场
    if (Math.abs(x) > MAP.bound - 2 || Math.abs(z) > MAP.bound - 2) return false;
    for (const p of placed) if (Math.hypot(p.x - x, p.z - z) < p.r + r) return false;
    return true;
  };
  const put = (type, x, z, opts = {}) => {
    const r = ITEM_TYPES[type].size * 0.9;
    if (!free(x, z, r)) return null;
    placed.push({ x, z, r });
    return items.add(type, x, z, opts);
  };
  const B = MAP.block, inner = B - MAP.road - 3; // 街区内部宽度
  const roadsC = []; for (let c = -MAP.half; c <= MAP.half; c += B) roadsC.push(c);
  const blocksC = roadsC.slice(0, -1).map(c => c + B / 2);

  // 街区
  for (const bx of blocksC) for (const bz of blocksC) {
    if (Math.abs(bx) < 1 && Math.abs(bz) < 1) continue;           // 中心街区 = 广场
    const r = Math.random();
    if (r < 0.55) {
      // 楼房街区：2x2 格，放 1~3 栋
      const cells = [[-1, -1], [1, -1], [-1, 1], [1, 1]].sort(() => Math.random() - 0.5);
      const n = 1 + ((Math.random() * 3) | 0);
      for (let i = 0; i < 4; i++) {
        const [cx, cz] = cells[i];
        const x = bx + cx * inner / 4, z = bz + cz * inner / 4;
        if (i < n) put('building', x, z, { ry: pick([0, Math.PI / 2]), sy: rand(0.9, 1.9), color: pick(BUILDING_COLORS) });
        else put('tree', x + rand(-1, 1), z + rand(-1, 1));
      }
    } else if (r < 0.8) {
      // 公园：树、长椅、路灯
      for (let i = 0; i < 6; i++) put('tree', bx + rand(-inner / 2, inner / 2), bz + rand(-inner / 2, inner / 2));
      for (let i = 0; i < 3; i++) put('bench', bx + rand(-inner / 2.5, inner / 2.5), bz + rand(-inner / 2.5, inner / 2.5));
      for (let i = 0; i < 2; i++) put('lamp', bx + rand(-inner / 2.5, inner / 2.5), bz + rand(-inner / 2.5, inner / 2.5));
      for (let i = 0; i < 3; i++) put('trashcan', bx + rand(-inner / 2, inner / 2), bz + rand(-inner / 2, inner / 2));
    } else {
      // 街市：报刊亭、自行车、长椅
      for (let i = 0; i < 2; i++) put('kiosk', bx + rand(-inner / 3, inner / 3), bz + rand(-inner / 3, inner / 3), { ry: pick([0, Math.PI / 2, Math.PI]) });
      for (let i = 0; i < 5; i++) put('bike', bx + rand(-inner / 2, inner / 2), bz + rand(-inner / 2, inner / 2));
      for (let i = 0; i < 2; i++) put('bench', bx + rand(-inner / 2, inner / 2), bz + rand(-inner / 2, inner / 2));
    }
  }
  // 道路上的车
  for (let i = 0; i < 140 && countType(items, 'car') < 45; i++) {
    const c = pick(roadsC), t = rand(-MAP.half, MAP.half), lane = pick([-2, 2]);
    if (Math.random() < 0.5) put('car', c + lane, t, { ry: Math.PI / 2 + (lane > 0 ? 0 : Math.PI), color: pick(CAR_COLORS) });
    else put('car', t, c + lane, { ry: lane > 0 ? 0 : Math.PI, color: pick(CAR_COLORS) });
  }
  for (let i = 0; i < 60 && countType(items, 'bus') < 12; i++) {
    const c = pick(roadsC), t = rand(-MAP.half, MAP.half);
    if (Math.random() < 0.5) put('bus', c + 1.8, t, { ry: Math.PI / 2 }); else put('bus', t, c + 1.8, { ry: 0 });
  }
  // 人行道：消防栓、垃圾桶、路灯
  for (let i = 0; i < 700; i++) {
    const c = pick(roadsC) + pick([-1, 1]) * (MAP.road / 2 + 0.9), t = rand(-MAP.half, MAP.half);
    const type = pick(['hydrant', 'trashcan', 'lamp', 'trashcan', 'hydrant']);
    if (Math.random() < 0.5) put(type, c, t); else put(type, t, c);
  }
  // 小垃圾：全图散布 + 出生点附近加密
  const filler = ['can', 'cone', 'box'];
  for (let i = 0; i < 600; i++) put(pick(filler), rand(-MAP.bound, MAP.bound), rand(-MAP.bound, MAP.bound));
  for (let i = 0; i < 160; i++) { const a = rand(0, 6.28), d = rand(2, 22); put(pick(filler), startPos.x + Math.cos(a) * d, startPos.z + Math.sin(a) * d); }
  for (let i = 0; i < 18; i++) { const a = rand(0, 6.28), d = rand(4, 24); put(pick(['trashcan', 'hydrant']), startPos.x + Math.cos(a) * d, startPos.z + Math.sin(a) * d); }
  return { free, put };
}
function countType(items, t) { let n = 0; for (const i of items.items) if (i.type === t) n++; return n; }
