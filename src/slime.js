// 代码生成的果冻史莱姆：半透明、晃动、菲涅尔边光、会眨眼的眼睛。
import * as THREE from 'three';

export function createSlime(scene, color, rimColor) {
  const uniforms = { uTime: { value: 0 }, uRim: { value: new THREE.Color(rimColor) }, uWobble: { value: 0.05 } };
  const mat = new THREE.MeshPhysicalMaterial({
    color, roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.1,
    transparent: true, opacity: 0.62, depthWrite: false, emissive: new THREE.Color(color).multiplyScalar(0.35),
  });
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime; uniform float uWobble;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float w = sin(uTime*3.1 + position.y*4.0 + position.x*3.0)*0.6 + sin(uTime*4.7 + position.z*5.0)*0.4;
        transformed += normal * w * uWobble;
        if (transformed.y < -0.55) transformed.y = mix(transformed.y, -0.55, 0.7);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRim;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float rim = 1.0 - abs(dot(normal, normalize(vViewPosition)));
        totalEmissiveRadiance += uRim * pow(rim, 2.2) * 1.4;
        diffuseColor.a = mix(diffuseColor.a, 0.95, pow(rim, 2.5));`);
  };
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), mat);
  body.renderOrder = 10;

  // 眼睛
  const face = new THREE.Group();
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const black = new THREE.MeshBasicMaterial({ color: 0x111122 });
  const eyes = [];
  for (const sx of [-1, 1]) {
    const e = new THREE.Group();
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), white);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 8), black);
    p.position.z = 0.11;
    e.add(w, p);
    e.position.set(sx * 0.3, 0.2, 0.86);
    face.add(e); eyes.push(e);
  }
  face.renderOrder = 11;

  // 地面阴影圆
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;

  const root = new THREE.Group();
  root.add(body, face);
  scene.add(root, shadow);

  let blinkT = 2;
  return {
    root, body, face, shadow, uniforms, mat,
    update(dt, t, r, dir, speed01, squash) {
      uniforms.uTime.value = t;
      uniforms.uWobble.value = 0.04 + speed01 * 0.05 + squash * 0.2;
      // 移动时前后拉伸、上下压扁
      const stretch = 1 + speed01 * 0.12 + squash * 0.15;
      root.scale.set(r * (1 - squash * 0.08), r * (0.86 - speed01 * 0.06 - squash * 0.1), r * stretch);
      root.position.y = r * 0.82;
      if (dir.lengthSq() > 1e-4) {
        const target = Math.atan2(dir.x, dir.z);
        let d = target - root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
        root.rotation.y += d * Math.min(1, dt * 10);
      }
      blinkT -= dt;
      const blink = blinkT < 0.12 ? 0.1 : 1;
      if (blinkT < 0) blinkT = 2 + Math.random() * 3;
      for (const e of eyes) e.scale.y = blink;
      shadow.position.set(root.position.x, 0.05, root.position.z);
      shadow.scale.setScalar(r * 1.15);
    },
  };
}
