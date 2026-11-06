// Karesansui (dry landscape garden) beside the main hall: raked white gravel, three rock
// groupings set on moss islands, granite kerbs and a bamboo yotsume-gaki fence. Also the
// shared rock generator used for the pond banks and the island.
import * as THREE from 'three';
import { Rng, fbm2, vnoise2, mat, cylGeo, smoothstep, clamp } from '../lib/util.js';
import { gravelTextures } from '../lib/textures.js';
import { patchMaterial } from '../lib/patch.js';
import { LAYOUT } from '../layout.js';

// A weathered boulder: noisy icosphere, flattened and leaned, moss on its shoulders.
export function rockGeo(rng, rx, ry, rz, moss = 0.6) {
  const g = new THREE.IcosahedronGeometry(1, 3);
  const p = g.attributes.position;
  const seed = rng.int(1, 9999);
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = fbm2(v.x * 1.6 + seed, v.z * 1.6 + v.y * 0.7, 4, seed) - 0.5;
    const facet = Math.round(vnoise2(v.x * 2.2 + seed, v.y * 2.2 - v.z, seed) * 3) / 3 - 0.5;
    const k = 1 + n * 0.55 + facet * 0.18;
    v.multiplyScalar(k);
    if (v.y < -0.2) v.y = -0.2 + (v.y + 0.2) * 0.3;
    p.setXYZ(i, v.x * rx, v.y * ry, v.z * rz);
  }
  g.computeVertexNormals();
  const col = new Float32Array(p.count * 3);
  const nor = g.attributes.normal;
  const stone = new THREE.Color('#8f8a80'), dark = new THREE.Color('#5d5952'), mossC = new THREE.Color('#58702c');
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const up = nor.getY(i);
    const n = fbm2(p.getX(i) * 2 + seed, p.getZ(i) * 2, 3, seed + 1);
    c.copy(stone).lerp(dark, clamp(n * 1.2 - 0.2, 0, 1));
    c.lerp(mossC, smoothstep(0.35, 0.8, up + n * 0.5 - 0.2) * moss);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  // planar uv in metres for the stone detail map
  const uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) + p.getZ(i) * 0.5, p.getY(i));
  return g;
}

export function rockMaterial(P) {
  return patchMaterial(new THREE.MeshStandardMaterial({
    name: 'rock', vertexColors: true, map: P.stone.map, normalMap: P.stone.normalMap, normalScale: new THREE.Vector2(1.2, 1.2), roughness: 0.9,
  }), { snow: 1 });
}

export function buildGarden(B) {
  const G = LAYOUT.garden;
  const rng = new Rng(808);
  // rock groups in garden-local metres
  const groups = [
    { x: 6.5, z: 8.5, rx: 2.6, rz: 2.0, rings: 7, rocks: [[0, 0, 1.0, 1.55, 0.85, 0.2], [1.25, 0.5, 0.7, 0.85, 0.6, -0.2], [-1.15, 0.6, 0.6, 0.55, 0.55, 0.1]] },
    { x: 15.5, z: 11.5, rx: 2.0, rz: 1.5, rings: 6, rocks: [[0, 0, 0.9, 0.8, 0.7, 0.3], [1.1, -0.3, 0.55, 0.45, 0.5, 0]] },
    { x: 22.5, z: 5.0, rx: 1.4, rz: 1.2, rings: 6, rocks: [[0, 0, 0.75, 1.05, 0.6, -0.15]] },
    { x: 12.5, z: 3.2, rx: 1.3, rz: 0.8, rings: 5, rocks: [[0, 0, 1.0, 0.32, 0.6, 0]] },
  ];
  const tex = gravelTextures(G.w, G.d, groups.map((g) => ({ x: g.x, z: g.z, rx: g.rx, rz: g.rz, rings: g.rings })), 60);
  const gravelMat = patchMaterial(new THREE.MeshStandardMaterial({ name: 'raked-gravel', map: tex.map, normalMap: tex.normal, normalScale: new THREE.Vector2(1.4, 1.4), roughness: 0.96 }), { snow: 1.2 });
  const plane = new THREE.PlaneGeometry(G.w, G.d);
  plane.rotateX(-Math.PI / 2);
  const gravel = new THREE.Mesh(plane, gravelMat);
  gravel.position.set(G.x0 + G.w / 2, 0.05, G.z0 + G.d / 2);
  gravel.receiveShadow = true;
  gravel.name = 'karesansui';

  for (const g of groups) {
    // moss island under each group
    const mg = new THREE.SphereGeometry(1, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    const p = mg.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const a = Math.atan2(z, x);
      const wob = 1 + 0.12 * Math.sin(a * 3 + g.x) + 0.08 * Math.sin(a * 5 + g.z);
      p.setXYZ(i, x * g.rx * 0.82 * wob, p.getY(i) * 0.22, z * g.rz * 0.82 * wob);
    }
    mg.computeVertexNormals();
    B.push('moss', mg, mat(G.x0 + g.x, 0.03, G.z0 + g.z));
    for (const [ox, oz, rx, ry, rz, lean] of g.rocks) {
      B.push('rock', rockGeo(rng, rx, ry, rz, 0.45), mat(G.x0 + g.x + ox, ry * 0.25, G.z0 + g.z + oz, rng.f() * 6, lean * 0.5, lean));
    }
  }
  // granite kerbs around the gravel
  const k = 0.32;
  B.box('stoneDark', G.w + k * 2, 0.22, k, G.x0 + G.w / 2, 0.08, G.z0 - k / 2);
  B.box('stoneDark', G.w + k * 2, 0.22, k, G.x0 + G.w / 2, 0.08, G.z0 + G.d + k / 2);
  B.box('stoneDark', k, 0.22, G.d, G.x0 - k / 2, 0.08, G.z0 + G.d / 2);
  B.box('stoneDark', k, 0.22, G.d, G.x0 + G.w + k / 2, 0.08, G.z0 + G.d / 2);
  // bamboo yotsume-gaki along the north and west sides
  const fence = (ax, az, bx, bz) => {
    const len = Math.hypot(bx - ax, bz - az);
    const ry = Math.atan2(-(bz - az), bx - ax);
    const n = Math.round(len / 1.8);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      B.push('bambooDry', cylGeo(0.055, 0.06, 1.35, 8), mat(ax + (bx - ax) * t, 0.67, az + (bz - az) * t));
    }
    for (const y of [0.35, 0.75, 1.15]) {
      B.push('bambooDry', cylGeo(0.025, 0.025, len, 6), mat((ax + bx) / 2, y, (az + bz) / 2, ry, 0, Math.PI / 2));
    }
    const m = Math.round(len / 0.32);
    for (let i = 0; i < m; i++) {
      const t = (i + 0.5) / m;
      B.push('bambooDry', cylGeo(0.018, 0.018, 1.2, 5), mat(ax + (bx - ax) * t, 0.62, az + (bz - az) * t + 0.04));
    }
  };
  fence(G.x0 - 0.8, G.z0 - 0.8, G.x0 + G.w + 0.8, G.z0 - 0.8);
  fence(G.x0 - 0.8, G.z0 - 0.8, G.x0 - 0.8, G.z0 + G.d + 0.8);
  return { gravel };
}
