// Architectural parts shared by all buildings: columns on stone bases, tie beams,
// kumimono bracket sets, kōran railings with giboshi finials, stairs, stone platforms,
// studded doors, renji windows, shōji, plaster panels.
import * as THREE from 'three';
import { boxGeo, cylGeo, latheGeo, mat, TAU } from '../lib/util.js';

// ------------------------------------------------------------ column
export function column(B, key, x, y, z, h, r, o = {}) {
  B.push(key, cylGeo(r * 0.97, r, h, 18), mat(x, y + h / 2, z));
  // soseki: base stone
  if (o.base !== false) {
    B.push(o.baseKey || 'stone', cylGeo(r * 1.45, r * 1.7, 0.22, 16), mat(x, y - 0.06, z));
  }
  // gilt nemaki band at the foot and at the head
  if (o.gilt) {
    B.push('gold', cylGeo(r * 1.04, r * 1.04, 0.12, 18), mat(x, y + 0.08, z));
    B.push('gold', cylGeo(r * 1.04, r * 1.04, 0.06, 18), mat(x, y + h - 0.32, z));
  }
}

// ------------------------------------------------------------ bracket set (kumimono)
// Local frame: origin at the column head, +z points away from the wall, +x along it.
// `steps` = how many tiers the set projects outward (0 flat ... 3 = mitesaki, as on pagodas).
export function bracketHeight(steps, s = 1) { return (0.32 + 0.37 * (1 + steps)) * s; }

export function bracket(B, m, steps, s = 1, keys = {}) {
  const K = Object.assign({ wood: 'shu', end: 'ochre' }, keys);
  B.with(m, () => {
    // daito (large bearing block), tapered
    B.box(K.wood, 0.5 * s, 0.2 * s, 0.5 * s, 0, 0.22 * s, 0);
    B.box(K.wood, 0.4 * s, 0.12 * s, 0.4 * s, 0, 0.06 * s, 0);
    let y = 0.32 * s;
    const armH = 0.22 * s, masuH = 0.15 * s;
    for (let lv = 0; lv <= steps; lv++) {
      const zc = lv * 0.5 * s;
      // hijiki parallel to the wall at this tier
      const len = (lv === 0 ? 1.5 : 1.7) * s;
      B.box(K.wood, len, armH, 0.2 * s, 0, y + armH / 2, zc);
      // arm-end caps
      for (const sx of [-1, 1]) B.box(K.end, 0.02, armH * 0.98, 0.2 * s * 0.98, sx * (len / 2 + 0.005), y + armH / 2, zc);
      // masu blocks
      for (const mx of [-0.6, 0, 0.6]) B.box(K.wood, 0.28 * s, masuH, 0.28 * s, mx * s * (len / (1.5 * s)), y + armH + masuH / 2, zc);
      // outward arm (projecting tier)
      if (lv < steps) {
        const zl = (lv + 1) * 0.5 * s + 0.2 * s;
        B.box(K.wood, 0.2 * s, armH, zl, 0, y + armH / 2, zl / 2 - 0.1 * s);
        B.box(K.end, 0.2 * s * 0.98, armH * 0.98, 0.02, 0, y + armH / 2, zl - 0.1 * s + 0.01);
        B.box(K.wood, 0.28 * s, masuH, 0.28 * s, 0, y + armH + masuH / 2, (lv + 1) * 0.5 * s);
      }
      y += armH + masuH;
    }
    // odaruki: the sloping tail rafter that carries the outermost tier
    if (steps >= 2) {
      const len = steps * 0.5 * s + 0.6 * s;
      B.box(K.wood, 0.22 * s, 0.24 * s, len, 0, y - 0.1 * s, len / 2 - 0.35 * s, 0, -0.12);
    }
  });
}

// Kentozuka: short post standing on the head beam between bracket sets.
export function strut(B, key, x, y, z, ry, h, s = 1) {
  B.with(mat(x, y, z, ry), () => {
    B.box(key, 0.2 * s, h - 0.15 * s, 0.2 * s, 0, (h - 0.15 * s) / 2, 0);
    B.box(key, 0.28 * s, 0.15 * s, 0.28 * s, 0, h - 0.075 * s, 0);
  });
}

// Kaerumata: the "frog-leg" ornamental strut, cut from a plank.
export function kaerumata(B, key, x, y, z, ry, w, h) {
  const sh = new THREE.Shape();
  sh.moveTo(-w / 2, 0);
  sh.bezierCurveTo(-w * 0.45, h * 0.55, -w * 0.15, h * 0.7, -w * 0.08, h);
  sh.lineTo(w * 0.08, h);
  sh.bezierCurveTo(w * 0.15, h * 0.7, w * 0.45, h * 0.55, w / 2, 0);
  sh.lineTo(w * 0.36, 0);
  sh.bezierCurveTo(w * 0.3, h * 0.42, w * 0.1, h * 0.5, 0, h * 0.5);
  sh.bezierCurveTo(-w * 0.1, h * 0.5, -w * 0.3, h * 0.42, -w * 0.36, 0);
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.14, bevelEnabled: false, curveSegments: 8 });
  g.translate(0, 0, -0.07);
  B.push(key, g, mat(x, y, z, ry));
}

// ------------------------------------------------------------ giboshi finial
export function giboshiGeo(s = 1) {
  return latheGeo([
    [0.001, 0], [0.09, 0], [0.09, 0.05], [0.07, 0.07], [0.07, 0.12], [0.1, 0.14], [0.1, 0.17],
    [0.06, 0.2], [0.11, 0.26], [0.14, 0.33], [0.13, 0.4], [0.08, 0.47], [0.03, 0.53], [0.012, 0.6], [0.001, 0.62],
  ].map(([x, y]) => [x * s, y * s]), 16);
}

// ------------------------------------------------------------ railing (kōran)
// pts: array of Vector3 at deck level. Posts at the given points and in between.
export function railing(B, pts, h = 0.85, o = {}) {
  const K = Object.assign({ wood: 'shu', top: 'shu', gib: 'gold' }, o.keys || {});
  const closed = !!o.closed;
  const n = pts.length;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const len = a.distanceTo(b);
    const dir = b.clone().sub(a).normalize();
    const cnt = Math.max(1, Math.round(len / 1.3));
    // rails
    const up = (y) => [a.clone().setY(a.y + y), b.clone().setY(b.y + y)];
    const [t0, t1] = up(h);
    railTube(B, K.top, t0, t1, 0.045);
    const [m0, m1] = up(h * 0.55);
    B.span(K.wood, m0, m1, 0.08, 0.06);
    const [b0, b1] = up(0.1);
    B.span(K.wood, b0, b1, 0.1, 0.1);
    // posts
    for (let k = 0; k <= cnt; k++) {
      if (k === cnt && (closed || i < segs - 1)) continue;
      const p = a.clone().addScaledVector(dir, (len * k) / cnt);
      const main = k === 0 || k === cnt;
      const ph = main && o.giboshi ? h + 0.08 : h * 0.98;
      B.box(K.wood, main ? 0.13 : 0.09, ph, main ? 0.13 : 0.09, p.x, p.y + ph / 2, p.z);
      if (main && o.giboshi) B.push(K.gib, giboshiGeo(o.gibScale || 0.9), mat(p.x, p.y + ph, p.z));
    }
    // small struts between the middle and top rail (tsuka)
    for (let k = 0; k < cnt; k++) {
      const p = a.clone().addScaledVector(dir, (len * (k + 0.5)) / cnt);
      B.box(K.wood, 0.05, h * 0.42, 0.05, p.x, p.y + h * 0.77, p.z);
    }
  }
}

function railTube(B, key, a, b, r) {
  const g = cylGeo(r, r, a.distanceTo(b), 8);
  const m = new THREE.Matrix4();
  const dir = b.clone().sub(a).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  m.compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1));
  B.push(key, g, m);
}

// ------------------------------------------------------------ stairs
// Straight flight rising toward -z in local space; origin at the bottom front centre.
export function stairs(B, m, w, rise, run, o = {}) {
  const K = Object.assign({ tread: 'stone', side: 'stone' }, o.keys || {});
  const n = o.steps || Math.max(2, Math.round(rise / 0.17));
  const sr = rise / n, sd = run / n;
  B.with(m, () => {
    for (let i = 0; i < n; i++) {
      const depth = sd * (n - i);
      B.box(K.tread, w, sr, depth + (o.nose || 0.03), 0, sr * (i + 0.5), -(sd * i + depth / 2) + 0.02);
    }
    if (o.cheeks) {
      // stringers / side walls (sode-ishi)
      const ch = o.cheekW || 0.3;
      for (const sx of [-1, 1]) {
        const sh = new THREE.Shape();
        sh.moveTo(0, 0); sh.lineTo(-run, 0); sh.lineTo(-run, rise + 0.25); sh.lineTo(-run + 0.3, rise + 0.25); sh.lineTo(0.2, 0.3); sh.lineTo(0.2, 0); sh.closePath();
        const g = new THREE.ExtrudeGeometry(sh, { depth: ch, bevelEnabled: false });
        g.rotateY(-Math.PI / 2);
        g.translate(sx * (w / 2 + (sx > 0 ? ch : 0)), 0, 0);
        B.push(K.side, g);
      }
    }
  });
  return { n, sr, sd };
}

// ------------------------------------------------------------ stone platform (kidan)
export function kidan(B, x, y, z, hx, hz, h, o = {}) {
  const K = Object.assign({ body: 'stone', cap: 'stone', base: 'stoneDark' }, o.keys || {});
  B.box(K.base, hx * 2 + 0.3, 0.2, hz * 2 + 0.3, x, y + 0.1, z);
  B.box(K.body, hx * 2, h - 0.38, hz * 2, x, y + 0.2 + (h - 0.38) / 2, z);
  B.box(K.cap, hx * 2 + 0.16, 0.18, hz * 2 + 0.16, x, y + h - 0.09, z);
  // panel joints (dimension-stone look): thin recessed strips
  if (o.panels !== false) {
    const step = 1.8;
    for (const sz of [-1, 1]) for (let px = -hx + step; px < hx - 0.3; px += step) B.box(K.base, 0.04, h - 0.42, 0.02, x + px, y + 0.2 + (h - 0.4) / 2, z + sz * (hz + 0.005));
    for (const sx of [-1, 1]) for (let pz = -hz + step; pz < hz - 0.3; pz += step) B.box(K.base, 0.02, h - 0.42, 0.04, x + sx * (hx + 0.005), y + 0.2 + (h - 0.4) / 2, z + pz);
  }
}

// ------------------------------------------------------------ wall infill
// All in the local frame of a bay: centred at x=0, face toward +z, bottom at y=0.
export function plasterPanel(B, w, h, t = 0.12) {
  B.box('plaster', w, h, t, 0, h / 2, 0);
}

export function studdedDoor(B, w, h, o = {}) {
  const leaves = o.leaves || 2;
  const lw = w / leaves;
  for (let i = 0; i < leaves; i++) {
    const cx = -w / 2 + lw * (i + 0.5);
    B.push('door', boxGeo(lw - 0.02, h, 0.1), mat(cx, h / 2, 0));
    const g = new THREE.PlaneGeometry(lw - 0.06, h - 0.04);
    const uv = g.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k), uv.getY(k));
    B.push('doorStuds', g, mat(cx, h / 2, 0.056));
  }
  // frame
  B.box('shu', w + 0.24, 0.16, 0.16, 0, h + 0.08, 0.02);
  B.box('shu', w + 0.24, 0.12, 0.16, 0, 0.06, 0.02);
}

export function renjiWindow(B, w, h, o = {}) {
  const fk = o.frame || 'shu', sk = o.slat || 'green';
  B.box(fk, w, 0.14, 0.16, 0, 0.07, 0.02);
  B.box(fk, w, 0.14, 0.16, 0, h - 0.07, 0.02);
  B.box(fk, 0.14, h, 0.16, -w / 2 + 0.07, h / 2, 0.02);
  B.box(fk, 0.14, h, 0.16, w / 2 - 0.07, h / 2, 0.02);
  const n = Math.max(3, Math.round((w - 0.28) / 0.13));
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.14 + ((w - 0.28) * (i + 0.5)) / n;
    B.box(sk, 0.065, h - 0.26, 0.065, x, h / 2, 0.02, Math.PI / 4);
  }
  B.box('shadowVoid', w - 0.2, h - 0.2, 0.02, 0, h / 2, -0.06);
}

export function shoji(B, w, h) {
  B.box('shoji', w, h, 0.05, 0, h / 2, 0);
  B.box('woodDark', w + 0.06, 0.07, 0.08, 0, 0.035, 0);
  B.box('woodDark', w + 0.06, 0.07, 0.08, 0, h - 0.035, 0);
}

// Hexagonal hanging lantern (tsuri-dōrō), local origin at the hook.
export function hangingLantern(B, s = 1) {
  B.push('bronzeDark', cylGeo(0.015, 0.015, 0.6 * s, 4), mat(0, -0.3 * s, 0));
  B.push('bronzeDark', latheGeo([[0.001, 0], [0.06, -0.02], [0.32, -0.22], [0.34, -0.26], [0.001, -0.26]].map(([x, y]) => [x * s, y * s]), 6), mat(0, -0.6 * s, 0));
  B.push('gold', latheGeo([[0.001, 0.12], [0.03, 0.08], [0.05, 0.02], [0.001, 0]].map(([x, y]) => [x * s, y * s]), 8), mat(0, -0.6 * s, 0));
  B.push('glow', cylGeo(0.19 * s, 0.19 * s, 0.42 * s, 6), mat(0, -1.07 * s, 0));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + Math.PI / 6;
    B.box('bronzeDark', 0.04 * s, 0.46 * s, 0.04 * s, Math.cos(a) * 0.22 * s, -1.07 * s, Math.sin(a) * 0.22 * s);
  }
  B.push('bronzeDark', cylGeo(0.24 * s, 0.2 * s, 0.08 * s, 6), mat(0, -1.32 * s, 0));
  B.push('bronzeDark', cylGeo(0.12 * s, 0.06 * s, 0.14 * s, 6), mat(0, -1.43 * s, 0));
}
