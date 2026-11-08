// 物件管理：每种物件一组 InstancedMesh；Hi3D 模型加载成功后替换占位模型。
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { ITEM_TYPES } from './config.js';
import { placeholderParts } from './placeholders.js';

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

// 把 glTF 场景烘焙成单位空间的 [{geometry, material}]：占地半径 1，底部 y=0，XZ 居中
export function bakeModel(root) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
  const radius = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2 || 1;
  const norm = new THREE.Matrix4().makeScale(1 / radius, 1 / radius, 1 / radius)
    .multiply(new THREE.Matrix4().makeTranslation(-cx, -box.min.y, -cz));
  const parts = [];
  root.traverse(o => {
    if (!o.isMesh) return;
    const g = o.geometry.clone();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(norm, o.matrixWorld));
    g.computeBoundingBox();
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) { if (m.map) m.map.anisotropy = 4; }
    parts.push({ geometry: g, material: o.material });
  });
  return parts;
}

export function loadModel(url) {
  return new Promise((resolve, reject) => loader.load(url, gltf => resolve(bakeModel(gltf.scene)), undefined, reject));
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

export class ItemManager {
  constructor(scene) {
    this.scene = scene;
    this.items = [];            // {type, id, x, z, ry, sy, color, alive, idx}
    this.groups = {};           // type -> {parts, meshes[], capacity, list[]}
    this.initialCount = 0;
  }

  add(type, x, z, opts = {}) {
    const it = { type, def: ITEM_TYPES[type], x, z, ry: opts.ry ?? Math.random() * Math.PI * 2, sy: opts.sy ?? 1, color: opts.color ?? null, alive: true, idx: -1 };
    this.items.push(it);
    return it;
  }

  // 放置完成后建网格
  build() {
    const byType = {};
    for (const it of this.items) (byType[it.type] ||= []).push(it);
    for (const type of Object.keys(ITEM_TYPES)) {
      const list = byType[type] || [];
      this.groups[type] = { parts: placeholderParts(type), meshes: [], list, capacity: Math.max(16, Math.ceil(list.length * 1.6)) };
      this._rebuild(type);
    }
    this.initialCount = this.aliveCount();
    // 后台加载 Hi3D 模型
    for (const [type, def] of Object.entries(ITEM_TYPES)) {
      if (!def.model) continue;
      loadModel(def.model).then(parts => { this.groups[type].parts = parts; this.groups[type].hasModel = true; this._rebuild(type); })
        .catch(() => { /* 没有模型：继续用占位 */ });
    }
  }

  _rebuild(type) {
    const g = this.groups[type];
    for (const m of g.meshes) { this.scene.remove(m); m.dispose(); }
    g.meshes = g.parts.map(p => {
      const im = new THREE.InstancedMesh(p.geometry, p.material, g.capacity);
      im.castShadow = true; im.receiveShadow = true;
      im.count = 0;
      im.frustumCulled = false;
      this.scene.add(im);
      return im;
    });
    g.list.forEach((it, i) => { it.idx = i; this._write(it); });
    for (const im of g.meshes) im.count = g.list.length;
    this._flag(type);
  }

  _write(it) {
    const g = this.groups[it.type];
    const s = it.def.size;
    if (it.alive) {
      _q.setFromAxisAngle(_up, it.ry);
      _s.set(s, s * it.sy, s);
      _p.set(it.x, it.y || 0, it.z);
      _m.compose(_p, _q, _s);
    }
    const col = it.color != null && !g.hasModel ? _col.setHex(it.color) : _col.setHex(0xffffff);
    for (const im of g.meshes) { im.setMatrixAt(it.idx, it.alive ? _m : ZERO); im.setColorAt(it.idx, col); }
  }

  _flag(type) {
    for (const im of this.groups[type].meshes) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }
  }

  update(it) { this._write(it); this._flag(it.type); }

  remove(it) {
    it.alive = false;
    this._write(it); this._flag(it.type);
  }

  // 运行中新增（补刷）
  spawn(type, x, z, opts) {
    const it = this.add(type, x, z, opts);
    const g = this.groups[type];
    g.list.push(it);
    if (g.list.length > g.capacity) { g.capacity = Math.ceil(g.list.length * 1.5); this._rebuild(type); return it; }
    it.idx = g.list.length - 1;
    for (const im of g.meshes) im.count = g.list.length;
    this.update(it);
    return it;
  }

  aliveCount() { let n = 0; for (const it of this.items) if (it.alive) n++; return n; }

  // 被吞时用的独立网格（共享几何与材质）
  makeLoose(it) {
    const grp = new THREE.Group();
    for (const p of this.groups[it.type].parts) {
      const mat = (it.color != null && !this.groups[it.type].hasModel) ? tinted(p.material, it.color) : p.material;
      grp.add(new THREE.Mesh(p.geometry, mat));
    }
    grp.scale.set(it.def.size, it.def.size * it.sy, it.def.size);
    grp.rotation.y = it.ry;
    grp.position.set(it.x, it.y || 0, it.z);
    return grp;
  }
}

const _col = new THREE.Color();
const tintCache = new Map();
function tinted(mat, hex) {
  const key = mat.uuid + hex;
  if (!tintCache.has(key)) { const m = mat.clone(); m.color = new THREE.Color(hex); tintCache.set(key, m); }
  return tintCache.get(key);
}
