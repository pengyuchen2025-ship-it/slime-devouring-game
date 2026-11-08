// 代码生成的低多边形占位模型。单位空间：地面占地半径约 1，底部 y = 0。
// 有 Hi3D 模型后会被替换；没有模型的物件（易拉罐、树等）一直用这些。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function part(geom, color, x = 0, y = 0, z = 0, ry = 0) {
  let g = geom.index ? geom.toNonIndexed() : geom;
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
  return g;
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, s = 8) => new THREE.CylinderGeometry(rt, rb, h, s);

const builders = {
  can: () => [part(cyl(0.6, 0.6, 1.7, 8), 0xe8323c, 0, 0.85), part(cyl(0.62, 0.62, 0.35, 8), 0xf5f5f5, 0, 1.0)],
  cone: () => [part(new THREE.ConeGeometry(0.75, 1.9, 7), 0xff7a1a, 0, 0.95), part(cyl(0.42, 0.52, 0.3, 7), 0xffffff, 0, 1.0), part(box(1.5, 0.15, 1.5), 0xff7a1a, 0, 0.07)],
  box: () => [part(box(1.4, 1.0, 1.3), 0xc8955a, 0, 0.5), part(box(1.42, 0.12, 0.3), 0xe9d3a6, 0, 1.0)],
  trashcan: () => [part(cyl(0.72, 0.6, 1.9, 8), 0x2fa05a, 0, 0.95), part(cyl(0.8, 0.8, 0.22, 8), 0x1d6e3d, 0, 1.95), part(box(0.5, 0.15, 0.2), 0x1d6e3d, 0, 2.12)],
  hydrant: () => [part(cyl(0.45, 0.5, 1.5, 8), 0xe3262e, 0, 0.75), part(new THREE.SphereGeometry(0.45, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), 0xe3262e, 0, 1.5), part(box(1.5, 0.3, 0.3), 0xc91d24, 0, 1.0), part(cyl(0.6, 0.6, 0.15, 8), 0xa8141a, 0, 0.08)],
  lamp: () => [part(cyl(0.12, 0.18, 6, 6), 0x5b6270, 0, 3), part(box(1.4, 0.18, 0.18), 0x5b6270, 0.6, 6), part(box(0.6, 0.35, 0.5), 0xffe27a, 1.1, 5.8), part(cyl(0.45, 0.5, 0.3, 6), 0x41474f, 0, 0.15)],
  bench: () => [part(box(2, 0.15, 0.7), 0xb5733c, 0, 0.8), part(box(2, 0.6, 0.12), 0xb5733c, 0, 1.25, -0.32), part(box(0.12, 0.8, 0.6), 0x3d3f46, -0.85, 0.4), part(box(0.12, 0.8, 0.6), 0x3d3f46, 0.85, 0.4)],
  bike: () => [
    part(new THREE.TorusGeometry(0.42, 0.07, 4, 10), 0x2b2b2b, -0.6, 0.45), part(new THREE.TorusGeometry(0.42, 0.07, 4, 10), 0x2b2b2b, 0.6, 0.45),
    part(box(1.2, 0.1, 0.1), 0x1fb6ff, 0, 0.75), part(box(0.1, 0.6, 0.1), 0x1fb6ff, -0.15, 0.75), part(box(0.4, 0.1, 0.25), 0x222222, -0.2, 1.08), part(box(0.1, 0.1, 0.6), 0x666666, 0.5, 1.1)],
  tree: () => [part(cyl(0.18, 0.25, 1.6, 6), 0x7a4b2a, 0, 0.8), part(new THREE.IcosahedronGeometry(0.95, 0), 0x46b04a, 0, 2.2), part(new THREE.IcosahedronGeometry(0.7, 0), 0x5cc95f, 0.2, 2.9)],
  kiosk: () => [part(box(1.6, 1.9, 1.2), 0x2f80ed, 0, 0.95), part(box(1.95, 0.25, 1.6), 0xe8323c, 0, 2.0), part(box(1.2, 0.7, 0.05), 0xfff2c4, 0, 1.2, 0.61), part(box(1.3, 0.4, 0.4), 0xf2c94c, 0, 0.6, 0.7)],
  car: () => [part(box(2, 0.6, 0.95), 0xffffff, 0, 0.55), part(box(1.1, 0.5, 0.85), 0xffffff, -0.1, 1.05), part(box(1.12, 0.32, 0.87), 0x2a3550, -0.1, 1.08),
    ...[[-0.65, 0.48], [0.65, 0.48], [-0.65, -0.48], [0.65, -0.48]].map(([x, z]) => part(cyl(0.25, 0.25, 0.2, 8).rotateX(Math.PI / 2), 0x222222, x, 0.25, z))],
  bus: () => [part(box(2, 0.85, 0.62), 0xffd23f, 0, 0.6), part(box(2.02, 0.22, 0.64), 0x2a3550, 0, 0.82), part(box(2.04, 0.08, 0.66), 0xff6b3d, 0, 0.45),
    ...[[-0.65, 0.3], [0.65, 0.3], [-0.65, -0.3], [0.65, -0.3]].map(([x, z]) => part(cyl(0.16, 0.16, 0.12, 8).rotateX(Math.PI / 2), 0x222222, x, 0.16, z))],
  building: () => {
    const ps = [part(box(1.4, 3.6, 1.4), 0xffffff, 0, 1.8), part(box(1.5, 0.15, 1.5), 0xdddddd, 0, 3.65), part(box(0.5, 0.4, 0.5), 0x9aa3ad, 0.3, 3.9)];
    for (let y = 0.5; y < 3.4; y += 0.55) ps.push(part(box(1.42, 0.2, 1.42), 0x334466, 0, y + 0.25));
    return ps;
  },
  garbage_truck: () => [part(box(1.3, 1.0, 0.95), 0x2fa05a, -0.3, 0.75), part(box(0.6, 0.75, 0.9), 0xffffff, 0.75, 0.65), part(box(0.62, 0.3, 0.92), 0x2a3550, 0.78, 0.85),
    part(box(0.2, 0.15, 0.2), 0xfff176, 1.06, 0.55, 0.3), part(box(0.2, 0.15, 0.2), 0xfff176, 1.06, 0.55, -0.3),
    ...[[-0.6, 0.48], [0.1, 0.48], [0.75, 0.48], [-0.6, -0.48], [0.1, -0.48], [0.75, -0.48]].map(([x, z]) => part(cyl(0.22, 0.22, 0.15, 8).rotateX(Math.PI / 2), 0x222222, x, 0.22, z))],
};

const cache = {};
// 返回 [{geometry, material}]，所有占位共用一个顶点色材质
const sharedMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
export function placeholderParts(id) {
  if (!cache[id]) {
    const b = builders[id] || (() => [part(box(1.4, 1.4, 1.4), 0xff00ff, 0, 0.7)]);
    const g = mergeGeometries(b());
    g.computeVertexNormals();
    g.computeBoundingBox();
    cache[id] = [{ geometry: g, material: sharedMat }];
  }
  return cache[id];
}
