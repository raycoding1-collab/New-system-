// Small shared toolkit: seeded randomness, tileable noise, math helpers and the
// geometry Builder that every building writes into. The Builder merges all parts
// that share a material into one mesh, so the whole compound draws in a few dozen calls.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ---------------------------------------------------------------- randomness
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  constructor(seed = 1) { this.next = mulberry32(seed); }
  f() { return this.next(); }
  range(a, b) { return a + (b - a) * this.next(); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  sign() { return this.next() < 0.5 ? -1 : 1; }
  gauss() { return (this.next() + this.next() + this.next() - 1.5) / 1.5; }
}

// ---------------------------------------------------------------- math
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const fract = (v) => v - Math.floor(v);
export const TAU = Math.PI * 2;

// ---------------------------------------------------------------- noise
// Hash-based value noise; `period` makes it tile (used for textures). Without a period it
// is effectively infinite (used for terrain).
function hash2(ix, iy, seed) {
  let h = (ix * 374761393 + iy * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);

export function vnoise2(x, y, seed = 0, px = 0, py = 0) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = fade(x - x0), fy = fade(y - y0);
  let ax = x0, bx = x0 + 1, ay = y0, by = y0 + 1;
  if (px) { ax = ((ax % px) + px) % px; bx = ((bx % px) + px) % px; }
  if (py) { ay = ((ay % py) + py) % py; by = ((by % py) + py) % py; }
  const a = hash2(ax, ay, seed), b = hash2(bx, ay, seed);
  const c = hash2(ax, by, seed), d = hash2(bx, by, seed);
  return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
}

export function fbm2(x, y, oct = 5, seed = 0, px = 0, py = 0, gain = 0.5) {
  let sum = 0, amp = 0.5, norm = 0;
  for (let o = 0; o < oct; o++) {
    sum += amp * vnoise2(x, y, seed + o * 17, px, py);
    norm += amp; amp *= gain; x *= 2; y *= 2; px *= 2; py *= 2;
  }
  return sum / norm;
}

// Ridged fbm for mountain silhouettes.
export function ridged2(x, y, oct = 6, seed = 0) {
  let sum = 0, amp = 0.5, norm = 0;
  for (let o = 0; o < oct; o++) {
    const n = 1 - Math.abs(vnoise2(x, y, seed + o * 31) * 2 - 1);
    sum += amp * n * n; norm += amp; amp *= 0.5; x *= 2.03; y *= 2.03;
  }
  return sum / norm;
}

// ---------------------------------------------------------------- geometry helpers
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();

export function mat(x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  _e.set(rx, ry, rz, 'YXZ');
  _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
}

// Box with UVs in metres. The texture's u axis follows the box's longest side, so wood
// grain runs along every beam, post and board whatever its orientation.
export function boxGeo(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
  const dims = [w, h, d];
  for (let i = 0; i < pos.count; i++) {
    const n = [Math.abs(nor.getX(i)), Math.abs(nor.getY(i)), Math.abs(nor.getZ(i))];
    const axis = n[0] > 0.5 ? 0 : n[1] > 0.5 ? 1 : 2;
    const others = [0, 1, 2].filter((k) => k !== axis);
    const [ua, va] = dims[others[0]] >= dims[others[1]] ? others : [others[1], others[0]];
    const c = [pos.getX(i), pos.getY(i), pos.getZ(i)];
    uv.setXY(i, c[ua] + 7.31 * axis, c[va]);
  }
  return g;
}

export function cylGeo(rt, rb, h, seg = 16, open = false) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
  const uv = g.attributes.uv;
  const circ = Math.PI * (rt + rb);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i) * h, uv.getX(i) * circ);
  return g;
}

export function latheGeo(points, seg = 24) {
  const g = new THREE.LatheGeometry(points.map((p) => new THREE.Vector2(p[0], p[1])), seg);
  const uv = g.attributes.uv;
  let maxR = 0; for (const p of points) maxR = Math.max(maxR, p[0]);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * maxR * TAU, uv.getY(i) * 2);
  return g;
}

// A beam that follows a polyline: rectangular cross-section `w` x `h`, `up` gives the
// orientation of the section. `offY` moves the section along its up axis (e.g. -h/2 to hang).
export function polyBeamGeo(points, w, h, up = new THREE.Vector3(0, 1, 0), offY = 0, caps = true) {
  const n = points.length;
  const pos = [], nor = [], uvs = [], idx = [];
  const T = new THREE.Vector3(), S = new THREE.Vector3(), U = new THREE.Vector3();
  const corners = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]];
  const faceN = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  let len = 0;
  const frames = [];
  for (let i = 0; i < n; i++) {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(n - 1, i + 1)];
    T.subVectors(b, a).normalize();
    S.crossVectors(T, up).normalize();
    if (S.lengthSq() < 1e-6) S.set(1, 0, 0);
    U.crossVectors(S, T).normalize();
    if (i > 0) len += points[i].distanceTo(points[i - 1]);
    frames.push({ S: S.clone(), U: U.clone(), len });
  }
  // 4 faces, each with its own vertices so the edges stay sharp
  for (let f = 0; f < 4; f++) {
    const c0 = corners[f], c1 = corners[(f + 1) % 4];
    const base = pos.length / 3;
    for (let i = 0; i < n; i++) {
      const { S: s, U: u, len: l } = frames[i];
      const p = points[i];
      for (const c of [c0, c1]) {
        pos.push(
          p.x + s.x * c[0] * w + u.x * (c[1] * h + offY),
          p.y + s.y * c[0] * w + u.y * (c[1] * h + offY),
          p.z + s.z * c[0] * w + u.z * (c[1] * h + offY));
        const fn = faceN[f];
        nor.push(s.x * fn[0] + u.x * fn[1], s.y * fn[0] + u.y * fn[1], s.z * fn[0] + u.z * fn[1]);
        uvs.push(l, (c === c0 ? 0 : 1) * (f % 2 ? h : w));
      }
    }
    for (let i = 0; i < n - 1; i++) {
      const a = base + i * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, c, b, b, c, d);
    }
  }
  if (caps) {
    for (const end of [0, n - 1]) {
      const { S: s, U: u } = frames[end];
      const p = points[end];
      const base = pos.length / 3;
      const dir = new THREE.Vector3().crossVectors(u, s).multiplyScalar(end === 0 ? 1 : -1);
      for (const c of corners) {
        pos.push(
          p.x + s.x * c[0] * w + u.x * (c[1] * h + offY),
          p.y + s.y * c[0] * w + u.y * (c[1] * h + offY),
          p.z + s.z * c[0] * w + u.z * (c[1] * h + offY));
        nor.push(dir.x, dir.y, dir.z);
        uvs.push(c[0] * w, c[1] * h);
      }
      if (end === 0) idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      else idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  fixWinding(g);
  return g;
}

// Round tube along a polyline (ropes, chains, rails, ridge caps). `arc` < 1 makes a half tube.
export function polyTubeGeo(points, r, radial = 8, arc = 1, upHint = new THREE.Vector3(0, 1, 0)) {
  const n = points.length;
  const pos = [], nor = [], uvs = [], idx = [];
  const T = new THREE.Vector3(), S = new THREE.Vector3(), U = new THREE.Vector3();
  let len = 0;
  const ring = arc < 1 ? radial + 1 : radial + 1;
  for (let i = 0; i < n; i++) {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(n - 1, i + 1)];
    T.subVectors(b, a).normalize();
    const up = Array.isArray(upHint) ? upHint[i] : upHint;
    S.crossVectors(T, up).normalize();
    if (S.lengthSq() < 1e-6) S.set(1, 0, 0);
    U.crossVectors(S, T).normalize();
    if (i > 0) len += points[i].distanceTo(points[i - 1]);
    const rr = typeof r === 'function' ? r(i / (n - 1)) : r;
    for (let k = 0; k < ring; k++) {
      const th = arc < 1 ? Math.PI * (k / radial) : (k / radial) * TAU;
      const cx = Math.cos(th), cy = Math.sin(th);
      const nx = S.x * cx + U.x * cy, ny = S.y * cx + U.y * cy, nz = S.z * cx + U.z * cy;
      pos.push(points[i].x + nx * rr, points[i].y + ny * rr, points[i].z + nz * rr);
      nor.push(nx, ny, nz);
      uvs.push(len, (k / radial) * TAU * rr);
    }
  }
  for (let i = 0; i < n - 1; i++) {
    for (let k = 0; k < ring - 1; k++) {
      const a = i * ring + k, b = a + 1, c = a + ring, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  fixWinding(g);
  return g;
}

// Makes sure the triangle winding agrees with the stored normals (so single-sided
// materials show the right face). Checks the first few triangles and flips all if needed.
export function fixWinding(g) {
  const idx = g.index.array, pos = g.attributes.position, nor = g.attributes.normal;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const fn = new THREE.Vector3(), vn = new THREE.Vector3();
  let vote = 0;
  const step = Math.max(3, Math.floor(idx.length / 3 / 40) * 3);
  for (let t = 0; t < idx.length; t += step) {
    a.fromBufferAttribute(pos, idx[t]); b.fromBufferAttribute(pos, idx[t + 1]); c.fromBufferAttribute(pos, idx[t + 2]);
    fn.subVectors(b, a).cross(c.sub(a));
    if (fn.lengthSq() < 1e-12) continue;
    vn.fromBufferAttribute(nor, idx[t]);
    vote += fn.dot(vn) >= 0 ? 1 : -1;
  }
  if (vote < 0) {
    for (let t = 0; t < idx.length; t += 3) { const tmp = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = tmp; }
  }
  return g;
}

// Generic grid surface from a function f(u, v) -> Vector3, u,v in [0,1].
export function gridGeo(nu, nv, f, uvf) {
  const pos = [], uvs = [], idx = [];
  const p = new THREE.Vector3();
  for (let j = 0; j <= nv; j++) {
    for (let i = 0; i <= nu; i++) {
      f(i / nu, j / nv, p);
      pos.push(p.x, p.y, p.z);
      if (uvf) { const t = uvf(i / nu, j / nv, p); uvs.push(t[0], t[1]); } else uvs.push(i / nu, j / nv);
    }
  }
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- Builder
// Collects geometry per material key, then merges. Each key maps to a material in the
// palette. `B.push(key, geometry, matrix)` is the only call buildings need.
export class Builder {
  constructor() { this.parts = new Map(); this.matrix = null; this.stack = []; }

  // Nested transforms: B.with(mat(...), () => { ... }) places everything inside.
  with(m, fn) {
    this.stack.push(this.matrix);
    this.matrix = this.matrix ? this.matrix.clone().multiply(m) : m.clone();
    try { fn(); } finally { this.matrix = this.stack.pop(); }
  }

  push(key, geo, m) {
    if (!key) return;
    let g = geo;
    if (m) g.applyMatrix4(m);
    if (this.matrix) g.applyMatrix4(this.matrix);
    if (!this.parts.has(key)) this.parts.set(key, []);
    this.parts.get(key).push(g);
  }

  box(key, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0) {
    this.push(key, boxGeo(w, h, d), mat(x, y, z, ry, rx, rz));
  }

  cyl(key, rt, rb, h, x, y, z, seg = 16, rx = 0, rz = 0, ry = 0) {
    this.push(key, cylGeo(rt, rb, h, seg), mat(x, y, z, ry, rx, rz));
  }

  // A box spanning from point a to point b (centre line), section w x h.
  span(key, a, b, w, h, roll = 0) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const g = boxGeo(w, h, len);
    const m = new THREE.Matrix4();
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const look = new THREE.Matrix4().lookAt(a, b, Math.abs(dir.y / len) > 0.99 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0));
    m.makeRotationZ(roll).premultiply(look).setPosition(mid);
    this.push(key, g, m);
  }

  merge(other) {
    for (const [k, list] of other.parts) {
      if (!this.parts.has(k)) this.parts.set(k, []);
      for (const g of list) this.parts.get(k).push(this.matrix ? g.applyMatrix4(this.matrix) : g);
    }
  }

  build(palette, opts = {}) {
    const group = new THREE.Group();
    group.name = opts.name || 'built';
    for (const [key, list] of this.parts) {
      const material = palette[key];
      if (!material) { console.warn('missing material', key); continue; }
      const wantColor = !!material.vertexColors;
      const norm = list.map((g) => normalizeGeo(g, wantColor));
      // chunk large merges so no single buffer gets huge
      const chunks = [];
      let cur = [], count = 0;
      for (const g of norm) {
        cur.push(g); count += g.attributes.position.count;
        if (count > 400000) { chunks.push(cur); cur = []; count = 0; }
      }
      if (cur.length) chunks.push(cur);
      for (const c of chunks) {
        const merged = mergeGeometries(c, false);
        if (!merged) { console.warn('merge failed', key); continue; }
        merged.computeBoundingSphere();
        const mesh = new THREE.Mesh(merged, material);
        mesh.name = `${group.name}:${key}`;
        const sh = material.userData.shadow || 'both';
        mesh.castShadow = sh === 'both' || sh === 'cast';
        mesh.receiveShadow = sh === 'both' || sh === 'receive';
        if (material.userData.noAO) mesh.userData.noAO = true;
        group.add(mesh);
      }
    }
    return group;
  }
}

// Bring a geometry to the common attribute layout (indexed, position/normal/uv[/color]).
function normalizeGeo(g, wantColor) {
  if (!g.index) {
    const n = g.attributes.position.count;
    const ia = new (n > 65535 ? Uint32Array : Uint16Array)(n);
    for (let i = 0; i < n; i++) ia[i] = i;
    g.setIndex(new THREE.BufferAttribute(ia, 1));
  }
  if (!g.attributes.normal) g.computeVertexNormals();
  // degenerate triangles leave zero normals, which normalise to NaN in the shader
  const nrm = g.attributes.normal;
  for (let i = 0; i < nrm.count; i++) {
    if (Math.abs(nrm.getX(i)) + Math.abs(nrm.getY(i)) + Math.abs(nrm.getZ(i)) < 1e-6) nrm.setXYZ(i, 0, 1, 0);
  }
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  for (const name of Object.keys(g.attributes)) {
    if (!['position', 'normal', 'uv', 'color'].includes(name)) g.deleteAttribute(name);
  }
  if (wantColor && !g.attributes.color) {
    const c = new Float32Array(g.attributes.position.count * 3).fill(1);
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  }
  if (!wantColor && g.attributes.color) g.deleteAttribute('color');
  // every index buffer becomes 32-bit so merges never overflow
  if (!(g.index.array instanceof Uint32Array)) g.setIndex(new THREE.BufferAttribute(Uint32Array.from(g.index.array), 1));
  g.morphAttributes = {};
  return g;
}

export const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
