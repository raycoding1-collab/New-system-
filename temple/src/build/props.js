// Smaller pieces of the precinct: kasuga and yukimi stone lanterns, the bronze incense
// burner with its canopy, the temizuya purification pavilion, and the vermilion
// taiko-bashi drum bridge over the pond.
import * as THREE from 'three';
import { mat, cylGeo, latheGeo, polyTubeGeo, polyBeamGeo, TAU } from '../lib/util.js';
import { Roof } from '../arch/roof.js';
import { column, railing, giboshiGeo } from '../arch/parts.js';

// Kasuga-dōrō, about 2.4 m. `key` lets weathered ones use mossy stone.
export function kasugaLantern(B, x, y, z, ry = 0, s = 1, key = 'stone') {
  B.with(mat(x, y, z, ry, 0, 0, s, s, s), () => {
    B.push(key, cylGeo(0.5, 0.56, 0.22, 6), mat(0, 0.11, 0));
    B.push(key, latheGeo([[0.5, 0], [0.42, 0.06], [0.28, 0.16], [0.2, 0.2], [0.001, 0.2]], 6), mat(0, 0.22, 0));
    B.push(key, cylGeo(0.13, 0.15, 1.0, 16), mat(0, 0.92, 0));
    B.push(key, cylGeo(0.16, 0.16, 0.07, 16), mat(0, 0.92, 0));
    B.push(key, cylGeo(0.42, 0.26, 0.22, 6), mat(0, 1.52, 0));
    // fire box: six posts around a glowing core
    B.push('glow', cylGeo(0.2, 0.2, 0.36, 6), mat(0, 1.83, 0));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      B.box(key, 0.09, 0.4, 0.09, Math.cos(a) * 0.27, 1.83, Math.sin(a) * 0.27, -a);
    }
    B.push(key, cylGeo(0.33, 0.33, 0.06, 6), mat(0, 1.66, 0));
    // roof (kasa) with curled corners (warabide)
    B.push(key, cylGeo(0.12, 0.6, 0.3, 6), mat(0, 2.18, 0));
    B.push(key, cylGeo(0.6, 0.6, 0.05, 6), mat(0, 2.04, 0));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      B.push(key, new THREE.SphereGeometry(0.06, 6, 5), mat(Math.cos(a) * 0.6, 2.1, Math.sin(a) * 0.6));
    }
    B.push(key, latheGeo([[0.001, 0], [0.1, 0.02], [0.12, 0.08], [0.06, 0.12], [0.13, 0.18], [0.1, 0.3], [0.04, 0.36], [0.001, 0.4]], 10), mat(0, 2.3, 0));
  });
}

// Yukimi-dōrō: the low snow-viewing lantern on curved legs, set by water.
export function yukimiLantern(B, x, y, z, ry = 0, s = 1) {
  B.with(mat(x, y, z, ry, 0, 0, s, s, s), () => {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU;
      const pts = [];
      for (let k = 0; k <= 8; k++) {
        const t = k / 8;
        const r = 0.65 - 0.4 * Math.sin(t * Math.PI / 2);
        pts.push(new THREE.Vector3(Math.cos(a) * r, t * 0.6, Math.sin(a) * r));
      }
      B.push('stoneMoss', polyTubeGeo(pts, (t) => 0.09 - t * 0.02, 8));
    }
    B.push('stoneMoss', cylGeo(0.35, 0.3, 0.12, 6), mat(0, 0.62, 0));
    B.push('glow', cylGeo(0.18, 0.18, 0.28, 6), mat(0, 0.82, 0));
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; B.box('stoneMoss', 0.08, 0.3, 0.08, Math.cos(a) * 0.24, 0.82, Math.sin(a) * 0.24, -a); }
    B.push('stoneMoss', latheGeo([[1.0, 0], [0.95, 0.08], [0.6, 0.2], [0.22, 0.32], [0.001, 0.34]], 6), mat(0, 0.96, 0));
    B.push('stoneMoss', latheGeo([[0.001, 0], [0.09, 0.03], [0.1, 0.1], [0.04, 0.16], [0.001, 0.2]], 10), mat(0, 1.3, 0));
  });
  return new THREE.Vector3(x, y + 0.82 * s, z);
}

// Jōkōro: bronze incense burner under a small hexagonal canopy.
export function incenseBurner(B, x, y, z) {
  B.push('stone', cylGeo(1.15, 1.25, 0.35, 8), mat(x, y + 0.175, z));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + 0.3;
    B.push('bronzeDark', cylGeo(0.09, 0.12, 0.55, 8), mat(x + Math.cos(a) * 0.55, y + 0.62, z + Math.sin(a) * 0.55, 0, 0.12 * Math.sin(a), -0.12 * Math.cos(a)));
  }
  B.push('bronzeDark', latheGeo([[0.001, 0], [0.45, 0.02], [0.75, 0.22], [0.86, 0.55], [0.82, 0.78], [0.9, 0.82], [0.9, 0.88], [0.72, 0.88], [0.001, 0.8]], 28), mat(x, y + 0.8, z));
  B.push('iron', cylGeo(0.7, 0.7, 0.04, 24), mat(x, y + 1.62, z));
  for (const sx of [-1, 1]) B.push('bronzeDark', new THREE.TorusGeometry(0.16, 0.035, 8, 16), mat(x + sx * 0.95, y + 1.55, z, Math.PI / 2));
  // canopy on six posts
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    B.push('bronzeDark', cylGeo(0.03, 0.03, 1.15, 6), mat(x + Math.cos(a) * 0.82, y + 2.25, z + Math.sin(a) * 0.82));
  }
  B.push('bronzeDark', latheGeo([[1.25, 0], [1.2, 0.06], [0.7, 0.32], [0.25, 0.55], [0.12, 0.7], [0.001, 0.72]], 6), mat(x, y + 2.8, z));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    B.push('bronzeDark', latheGeo([[0.001, 0], [0.05, 0.05], [0.04, 0.16], [0.001, 0.2]], 6), mat(x + Math.cos(a) * 1.22, y + 2.8, z + Math.sin(a) * 1.22, 0, 0, 0));
  }
  B.push('gold', latheGeo([[0.001, 0], [0.12, 0.03], [0.15, 0.14], [0.08, 0.24], [0.001, 0.3]], 12), mat(x, y + 3.5, z));
  return new THREE.Vector3(x, y + 1.7, z);
}

// Temizuya: water basin under a copper-roofed pavilion.
export function temizuya(B, x, y, z, ry = 0) {
  const info = {};
  B.with(mat(x, y, z, ry), () => {
    B.box('stone', 4.0, 0.25, 3.0, 0, 0.125, 0);
    const posts = [[-1.55, -1.05], [1.55, -1.05], [-1.55, 1.05], [1.55, 1.05]];
    for (const [px, pz] of posts) column(B, 'hinoki', px, 0.25, pz, 2.55, 0.13, { baseKey: 'stoneDark' });
    for (const pz of [-1.05, 1.05]) B.box('hinoki', 3.5, 0.22, 0.16, 0, 2.7, pz);
    for (const px of [-1.55, 1.55]) B.box('hinoki', 0.16, 0.22, 2.4, px, 2.7, 0);
    for (const px of [-1.55, 1.55]) B.box('hinoki', 0.14, 0.12, 2.2, px, 0.6, 0);
    const roof = new Roof({
      cx: 0, cz: 0, hx: 2.6, hz: 2.1, overhang: 1.0, type: 'irimoya', rise: 1.95, gableT: 0.42, pow: 1.4,
      soffitAtWall: 2.88, lift: 0.22, liftReachK: 0.6, liftFadeK: 0.5, sweep: 0.3, thick: 0.18, hFly: 0.08,
      scale: 0.55, tileSpacing: 0.36, course: 0.5, tileR: 0.025, ridgeScale: 0.45, setback: 0.32, chimes: false,
      keys: { tile: 'copper', round: 'copperTrim', ridge: 'copperTrim', ornament: 'copperTrim', soffit: 'hinoki', fascia: 'hinoki', rafter: 'hinoki', rafterEnd: 'whiteEnd', hip: 'hinoki', gableFrame: 'hinoki', barge: 'hinoki', gable: 'hinoki' },
    });
    roof.build(B);
    B.box('hinoki', 3.4, 0.06, 2.4, 0, roof.soffitY(1.0) + 0.04, 0);
    // basin (chōzubachi): a carved granite trough brimming with water
    B.box('stone', 2.1, 0.62, 0.9, 0, 0.56, 0);
    B.box('stone', 2.1, 0.12, 0.12, 0, 0.93, 0.39);
    B.box('stone', 2.1, 0.12, 0.12, 0, 0.93, -0.39);
    B.box('stone', 0.12, 0.12, 0.9, 1.0, 0.93, 0);
    B.box('stone', 0.12, 0.12, 0.9, -1.0, 0.93, 0);
    B.box('waterBasin', 1.9, 0.02, 0.68, 0, 0.94, 0);
    // bamboo ladles on a rack
    for (let i = 0; i < 5; i++) {
      const lx = -0.7 + i * 0.35;
      B.push('bambooDry', cylGeo(0.012, 0.012, 0.85, 5), mat(lx, 1.02, 0.12, 0, Math.PI / 2 - 0.1));
      B.push('bambooDry', cylGeo(0.05, 0.045, 0.08, 10, true), mat(lx, 1.02, 0.55));
    }
    B.box('bamboo', 2.0, 0.04, 0.04, 0, 0.99, 0.25);
    // bamboo spout (kakei)
    B.push('bamboo', cylGeo(0.05, 0.05, 1.5, 8), mat(1.25, 0.95, -0.2));
    B.push('bamboo', cylGeo(0.04, 0.04, 0.8, 8), mat(1.0, 1.65, -0.2, 0, 0, Math.PI / 2 - 0.35));
    info.spout = new THREE.Vector3(0.62, 1.52, -0.2);
  });
  return info;
}

// Taiko-bashi: a steep semicircular drum bridge, lacquered vermilion.
export function drumBridge(B, cx, cy, cz, L = 13, W = 2.6, rise = 2.5) {
  const R = (L * L / 4 + rise * rise) / (2 * rise);
  const arcY = (x) => Math.sqrt(Math.max(0, R * R - x * x)) - (R - rise);
  const n = 44;
  // planks
  for (let i = 0; i < n; i++) {
    const x0 = -L / 2 + (L * i) / n, x1 = -L / 2 + (L * (i + 1)) / n;
    const xm = (x0 + x1) / 2;
    const a = Math.atan2(arcY(x1) - arcY(x0), x1 - x0);
    B.box('hinoki', (x1 - x0) * 1.02 / Math.cos(a), 0.09, W, cx + xm, cy + arcY(xm), cz, 0, 0, a);
  }
  // girders and fascia
  for (const sz of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 30; i++) { const x = -L / 2 + (L * i) / 30; pts.push(new THREE.Vector3(cx + x, cy + arcY(x) - 0.14, cz + sz * (W / 2 - 0.02))); }
    B.push('shu', polyBeamGeo(pts, 0.16, 0.36, new THREE.Vector3(0, 1, 0)));
  }
  // piers
  for (const px of [-L * 0.3, L * 0.3, -L * 0.1, L * 0.1]) {
    const top = cy + arcY(px) - 0.3;
    for (const sz of [-1, 1]) B.push('shu', cylGeo(0.12, 0.13, top - cy + 1.4, 12), mat(cx + px, (top + cy - 1.4) / 2, cz + sz * (W / 2 - 0.25)));
    B.box('shu', 0.2, 0.22, W - 0.2, cx + px, top - 0.05, cz);
    B.box('shu', 0.14, 0.14, W - 0.3, cx + px, cy + 0.2, cz);
  }
  // railings along the arc, giboshi on the end posts
  for (const sz of [-1, 1]) {
    const pts = [];
    const m = 9;
    for (let i = 0; i <= m; i++) { const x = -L / 2 + 0.15 + ((L - 0.3) * i) / m; pts.push(new THREE.Vector3(cx + x, cy + arcY(x) + 0.05, cz + sz * (W / 2 - 0.08))); }
    railing(B, pts, 0.85, {});
    for (const p of [pts[0], pts[pts.length - 1], pts[Math.floor(m / 2)], pts[Math.ceil(m / 2)]]) {
      B.box('shu', 0.16, 0.95, 0.16, p.x, p.y + 0.475, p.z);
      B.push('gold', giboshiGeo(1.05), mat(p.x, p.y + 0.95, p.z));
    }
  }
  // stone abutments
  for (const sx of [-1, 1]) {
    B.box('stone', 1.2, 0.6, W + 0.6, cx + sx * (L / 2 + 0.4), cy - 0.2, cz);
    B.box('stoneDark', 1.5, 0.3, W + 0.9, cx + sx * (L / 2 + 0.55), cy - 0.6, cz);
  }
  return { arcY, L };
}
