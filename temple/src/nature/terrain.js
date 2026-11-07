// The site: a levelled terrace cut into a forested mountain, held by ishigaki stone
// walls, with a long stair falling away south into the sea of clouds. Beyond: valleys
// drowned in cloud, ridges in receding blue, and a snow-capped volcano on the horizon.
import * as THREE from 'three';
import { fbm2, ridged2, smoothstep, lerp, clamp, vnoise2, mat, polyBeamGeo, Rng } from '../lib/util.js';
import { groundDetailTextures } from '../lib/textures.js';
import { patchMaterial } from '../lib/patch.js';
import { LAYOUT } from '../layout.js';

const T = LAYOUT.terrace;
const TC = { x: (T.x0 + T.x1) / 2, z: (T.z0 + T.z1) / 2, hx: (T.x1 - T.x0) / 2, hz: (T.z1 - T.z0) / 2 };

export function terraceSDF(x, z) {
  const qx = Math.abs(x - TC.x) - (TC.hx - T.r), qz = Math.abs(z - TC.z) - (TC.hz - T.r);
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - T.r;
}

// Two overlapping lobes joined in a waist, where the drum bridge crosses.
const LOBES = [
  { x: 26.5, z: -5.5, rx: 8.5, rz: 7.2 },
  { x: 37.6, z: -15.2, rx: 8.2, rz: 7.0 },
];
function lobe(L, x, z) {
  const dx = (x - L.x) / L.rx, dz = (z - L.z) / L.rz;
  return (Math.hypot(dx, dz) - 1) * Math.min(L.rx, L.rz);
}
export function pondSDF(x, z) {
  const a = lobe(LOBES[0], x, z), b = lobe(LOBES[1], x, z);
  const k = 4.0;
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25 + (vnoise2(x * 0.22, z * 0.22, 7) - 0.5) * 1.6;
}

export function islandSDF(x, z) {
  const I = LAYOUT.island;
  return Math.hypot((x - I.x) / 1.2, z - I.z) - 2.0;
}

export const WATER_Y = -0.32;

// ---------------------------------------------------------------- the approach stair
const S = LAYOUT.stair;
const stairSteps = (() => {
  const steps = [];
  let z = S.z0, y = 0, i = 0;
  while (y > S.bottom) {
    if (i > 0 && i % 44 === 0) { steps.push({ z, y, run: 2.4, landing: true }); z += 2.4; }
    const run = 0.16 / S.slope;
    steps.push({ z, y, run, landing: false });
    z += run; y -= 0.16; i++;
  }
  return steps;
})();

export function stairY(z) {
  if (z <= S.z0) return 0;
  for (const s of stairSteps) if (z >= s.z && z < s.z + s.run) return s.y;
  return S.bottom;
}
function stairYSmooth(z) {
  if (z <= S.z0) return 0;
  let lo = 0, hi = stairSteps.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (stairSteps[m].z <= z) lo = m; else hi = m - 1; }
  const s = stairSteps[lo];
  return s.landing ? s.y : s.y - 0.16 * ((z - s.z) / s.run);
}

// ---------------------------------------------------------------- height field
function wallHeightAt(x, z) {
  const north = smoothstep(-30, -58, z);
  return lerp(3.2, 7.6, smoothstep(10, 50, z)) * (1 - north);
}

function farField(x, z) {
  const r = Math.hypot(x, z);
  // ranges rising out of the cloud valleys
  const rid = ridged2(x * 0.0011 + 7, z * 0.0011 - 3, 6, 5);
  const amp = smoothstep(220, 1400, r) * 820;
  let h = -150 + rid * amp + fbm2(x * 0.004, z * 0.004, 4, 9) * 60 * smoothstep(150, 600, r);
  // the mountain the temple sits against
  const bx = x * 0.9, bz = z + 330;
  const back = 470 * Math.exp(-(bx * bx) / (2 * 260 * 260) - (bz * bz) / (2 * 230 * 230));
  h = Math.max(h, back - 120 + ridged2(x * 0.006, z * 0.006, 5, 11) * 70);
  // the distant volcano
  const vx = x + 2300, vz = z - 3100;
  const vd = Math.hypot(vx, vz);
  const cone = 1250 * Math.pow(Math.max(0, 1 - vd / 1900), 1.55) - 140 + fbm2(vx * 0.004, vz * 0.004, 4, 21) * 40 * smoothstep(400, 1200, vd);
  h = Math.max(h, cone);
  return h;
}

export function heightAt(x, z) {
  const d = terraceSDF(x, z);
  let h;
  if (d <= 0) {
    h = 0;
    const pd = pondSDF(x, z);
    if (pd < 1.2) {
      const bank = smoothstep(1.2, 0, pd);
      h = lerp(0, WATER_Y - 0.15, bank) - 1.2 * smoothstep(0, 4, -pd);
      const id = islandSDF(x, z);
      if (id < 1.5) h = lerp(h, 0.45 + Math.max(0, -id) * 0.15, smoothstep(1.5, -0.5, id));
    }
    return h;
  }
  const n = fbm2(x * 0.02, z * 0.02, 5, 3);
  const north = smoothstep(-34, -64, z);
  const wallH = wallHeightAt(x, z);
  const batter = wallH * 0.32 + 0.2;
  let drop;
  if (d < batter) drop = -wallH * smoothstep(0, batter, d);
  else drop = -wallH - (d - batter) * (0.36 + 0.3 * n) - Math.pow(Math.max(0, d - 25), 1.2) * 0.3;
  const rise = 300 * (1 - Math.exp(-d / 380)) * (0.75 + 0.5 * n) + (fbm2(x * 0.05, z * 0.05, 3, 4) - 0.5) * 4;
  h = lerp(drop, rise, north);
  // carve the approach stair
  if (z > S.z0 - 1) {
    const ax = Math.abs(x);
    const w = smoothstep(S.w / 2 + 7, S.w / 2 + 0.8, ax) * smoothstep(S.z0 - 1, S.z0 + 0.5, z);
    if (w > 0) h = lerp(h, stairYSmooth(z) - 0.25, w);
  }
  // fade into the far field
  const r = Math.hypot(x, z);
  const far = farField(x, z);
  const t = smoothstep(120, 320, r);
  h = lerp(h, Math.max(h * 0.3 + far * 0.7, far), t);
  if (north > 0.5) h = Math.max(h, far * smoothstep(80, 300, r));
  return h;
}

// ---------------------------------------------------------------- colours
const C = (hex) => new THREE.Color(hex);
const COL = {
  gravel: C('#c9c2b1'), moss: C('#5b6b39'), mossDark: C('#3c4a27'), earth: C('#5a4632'),
  forest: C('#24331b'), forestLight: C('#3d5228'), rock: C('#6f675c'), snow: C('#e9eef4'), bed: C('#2a2a20'), cloudFloor: C('#55606a'),
};

function surfaceColor(x, z, h, slope, out) {
  const d = terraceSDF(x, z);
  if (d <= 0.3) {
    // precinct ground: raked gravel courtyard, moss beds near the edges and under trees
    const n = fbm2(x * 0.08, z * 0.08, 4, 41);
    const courtyard = (Math.abs(x) < 23 + n * 6 && z > -10 && z < 50) ? 1 : 0;
    const aroundHondo = Math.abs(x) < 17.5 + n * 3 && z > -34 && z < -5 ? 1 : 0;
    const aroundPagoda = Math.hypot(x - LAYOUT.pagoda[0], z - LAYOUT.pagoda[1]) < 10 + n * 3 ? 1 : 0;
    const g = Math.max(courtyard, aroundHondo, aroundPagoda);
    const mossAmt = (1 - g) * smoothstep(0.35, 0.55, n + 0.25) + smoothstep(-6, 2, d) * 0.4;
    out.copy(COL.gravel).lerp(COL.moss, clamp(mossAmt, 0, 1));
    const m2 = fbm2(x * 0.2, z * 0.2, 3, 43);
    out.lerp(COL.mossDark, smoothstep(0.45, 0.8, m2) * mossAmt * 0.75);
    out.lerp(COL.earth, smoothstep(0.62, 0.8, fbm2(x * 0.35, z * 0.35, 3, 45)) * mossAmt * 0.3);
    const pd = pondSDF(x, z);
    if (pd < 1.5) out.lerp(COL.earth, smoothstep(1.5, 0.2, pd)).lerp(COL.bed, smoothstep(0, -2, pd));
    if (islandSDF(x, z) < 0.5) out.copy(COL.moss).lerp(COL.mossDark, 0.3);
    return out;
  }
  const n = fbm2(x * 0.03, z * 0.03, 4, 47);
  out.copy(COL.forest).lerp(COL.forestLight, n * 0.6);
  out.lerp(COL.earth, smoothstep(0.9, 1.5, slope) * 0.35);
  out.lerp(COL.rock, smoothstep(1.7, 2.6, slope + n * 0.4) * smoothstep(40, 160, h));
  const snowLine = 560 + (fbm2(x * 0.006, z * 0.006, 4, 49) - 0.5) * 220;
  out.lerp(COL.snow, smoothstep(snowLine, snowLine + 120, h) * (1 - smoothstep(1.4, 2.2, slope) * 0.5));
  out.lerp(COL.cloudFloor, smoothstep(-40, -90, h));
  return out;
}

// ---------------------------------------------------------------- meshes
function heightMesh(nx, nz, map, uvScale, push = null) {
  const pos = new Float32Array((nx + 1) * (nz + 1) * 3);
  const col = new Float32Array((nx + 1) * (nz + 1) * 3);
  const uv = new Float32Array((nx + 1) * (nz + 1) * 2);
  const P = new THREE.Vector2();
  let k = 0;
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    map(i / nx, j / nz, P);
    let h = heightAt(P.x, P.y);
    if (push) h -= push(P.x, P.y);
    pos[k * 3] = P.x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = P.y;
    uv[k * 2] = P.x / uvScale; uv[k * 2 + 1] = P.y / uvScale;
    k++;
  }
  const idx = new Uint32Array(nx * nz * 6);
  let t = 0;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
    idx[t++] = a; idx[t++] = c; idx[t++] = b; idx[t++] = b; idx[t++] = c; idx[t++] = d;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeVertexNormals();
  const nor = g.attributes.normal;
  const c = new THREE.Color();
  for (let v = 0; v < nor.count; v++) {
    const ny = nor.getY(v);
    const slope = Math.sqrt(Math.max(0, 1 - ny * ny)) / Math.max(ny, 0.05);
    surfaceColor(pos[v * 3], pos[v * 3 + 2], pos[v * 3 + 1], slope, c);
    col[v * 3] = c.r; col[v * 3 + 1] = c.g; col[v * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

export function buildTerrain(B, Bstair = B, Bpaths = B) {
  const det = groundDetailTextures(512);
  const mat0 = patchMaterial(new THREE.MeshStandardMaterial({ name: 'ground', vertexColors: true, map: det.map, normalMap: det.normal, normalScale: new THREE.Vector2(0.7, 0.7), roughness: 0.95 }), { snow: 1.1 });
  const matFar = patchMaterial(new THREE.MeshStandardMaterial({ name: 'ground-far', vertexColors: true, roughness: 1 }), { snow: 0.6 });
  const group = new THREE.Group();
  group.name = 'terrain';

  // near: 0.8 m grid around the precinct
  const NX0 = -125, NX1 = 125, NZ0 = -115, NZ1 = 160;
  const near = heightMesh(Math.round((NX1 - NX0) / 0.8), Math.round((NZ1 - NZ0) / 0.8), (u, v, P) => P.set(lerp(NX0, NX1, u), lerp(NZ0, NZ1, v)), 4);
  const nearMesh = new THREE.Mesh(near, mat0);
  nearMesh.name = 'ground-near';
  nearMesh.receiveShadow = true;
  group.add(nearMesh);

  // far: stretched grid out to the horizon, sunk below the near mesh where they overlap
  const R = 6000, N = 300, p = 2.5;
  const far = heightMesh(N, N, (u, v, P) => {
    const a = u * 2 - 1, b = v * 2 - 1;
    P.set(Math.sign(a) * Math.pow(Math.abs(a), p) * R, Math.sign(b) * Math.pow(Math.abs(b), p) * R + 20);
  }, 40, (x, z) => {
    const ix = Math.min(x - NX0, NX1 - x), iz = Math.min(z - NZ0, NZ1 - z);
    return Math.min(ix, iz) > 0 ? 2.5 * smoothstep(0, 12, Math.min(ix, iz)) : 0;
  });
  const farMesh = new THREE.Mesh(far, matFar);
  farMesh.name = 'ground-far';
  farMesh.receiveShadow = true;
  farMesh.userData.noExport = true; // horizon scenery: kept out of the .glb
  group.add(farMesh);

  ishigaki(B);
  approachStair(Bstair);
  paths(Bpaths);
  return { group, materials: [mat0, matFar] };
}

// ---------------------------------------------------------------- ishigaki retaining walls
function contour(step) {
  // walk the rounded rectangle anticlockwise from the south-centre
  const pts = [];
  const { x0, x1, z0, z1, r } = T;
  const segs = [
    ['line', [0, z1], [x1 - r, z1]], ['arc', [x1 - r, z1 - r], 0.5 * Math.PI, 0],
    ['line', [x1, z1 - r], [x1, z0 + r]], ['arc', [x1 - r, z0 + r], 0, -0.5 * Math.PI],
    ['line', [x1 - r, z0], [x0 + r, z0]], ['arc', [x0 + r, z0 + r], -0.5 * Math.PI, -Math.PI],
    ['line', [x0, z0 + r], [x0, z1 - r]], ['arc', [x0 + r, z1 - r], Math.PI, 0.5 * Math.PI],
    ['line', [x0 + r, z1], [0, z1]],
  ];
  for (const s of segs) {
    if (s[0] === 'line') {
      const [a, b] = [s[1], s[2]];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.max(1, Math.round(len / step));
      const nx = (b[1] - a[1]) / len, nz = -(b[0] - a[0]) / len; // outward (anticlockwise walk, +z south)
      for (let i = 0; i < n; i++) pts.push({ x: a[0] + ((b[0] - a[0]) * i) / n, z: a[1] + ((b[1] - a[1]) * i) / n, nx: -nx, nz: -nz });
    } else {
      const [c, a0, a1] = [s[1], s[2], s[3]];
      const n = Math.max(2, Math.round((Math.abs(a1 - a0) * r) / step));
      for (let i = 0; i < n; i++) {
        const a = a0 + ((a1 - a0) * i) / n;
        pts.push({ x: c[0] + Math.cos(a) * r, z: c[1] + Math.sin(a) * r, nx: Math.cos(a), nz: Math.sin(a) });
      }
    }
  }
  return pts;
}

function ishigaki(B) {
  const pts = contour(1.2);
  let run = [];
  const flush = () => {
    if (run.length > 1) wallStrip(B, run);
    run = [];
  };
  for (const p of pts) {
    const wh = wallHeightAt(p.x, p.z);
    const inGap = p.z > T.z1 - 1 && Math.abs(p.x) < S.w / 2 + 0.7;
    if (wh < 0.5 || inGap) { flush(); continue; }
    run.push({ ...p, wh });
  }
  flush();
}

function wallStrip(B, run) {
  const pos = [], uv = [], idx = [];
  let u = 0;
  for (let i = 0; i < run.length; i++) {
    const p = run[i];
    if (i > 0) u += Math.hypot(p.x - run[i - 1].x, p.z - run[i - 1].z);
    const batter = p.wh * 0.32;
    const rows = 6;
    for (let k = 0; k <= rows; k++) {
      const t = k / rows;
      // slight concave batter, like a castle wall (ōgi-kōbai)
      const off = batter * Math.pow(t, 1.4);
      const y = 0.25 - (p.wh + 0.8) * t;
      pos.push(p.x + p.nx * off, y, p.z + p.nz * off);
      uv.push(u, y);
    }
  }
  const rows = 7;
  for (let i = 0; i < run.length - 1; i++) for (let k = 0; k < rows - 1; k++) {
    const a = i * rows + k, b = a + 1, c = a + rows, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // face outward
  const n = g.attributes.normal;
  let dot = 0;
  for (let i = 0; i < Math.min(n.count, 50); i++) dot += n.getX(i) * run[Math.floor(i / rows)].nx + n.getZ(i) * run[Math.floor(i / rows)].nz;
  if (dot < 0) { const ix = g.index.array; for (let t = 0; t < ix.length; t += 3) { const tmp = ix[t + 1]; ix[t + 1] = ix[t + 2]; ix[t + 2] = tmp; } g.computeVertexNormals(); }
  B.push('ishigaki', g);
  // capstones along the top edge
  const cap = run.map((p) => new THREE.Vector3(p.x - p.nx * 0.25, 0.12, p.z - p.nz * 0.25));
  B.push('stone', polyBeamGeo(cap, 0.75, 0.3, new THREE.Vector3(0, 1, 0)));
}

// ---------------------------------------------------------------- stair down into the clouds
function approachStair(B) {
  const w = S.w;
  for (const s of stairSteps) {
    const depth = s.run + 0.04;
    B.box(s.landing ? 'stoneDark' : 'stone', w, 0.6, depth, 0, s.y - 0.3, s.z + s.run / 2);
  }
  // parapet walls following the flight
  for (const sx of [-1, 1]) {
    const pts = [];
    for (let z = S.z0 - 0.4; z < stairSteps[stairSteps.length - 1].z; z += 1.0) pts.push(new THREE.Vector3(sx * (w / 2 + 0.35), stairYSmooth(z) + 0.2, z));
    B.push('stone', polyBeamGeo(pts, 0.6, 1.2, new THREE.Vector3(0, 1, 0)));
    B.push('stoneMoss', polyBeamGeo(pts.map((p) => p.clone().add(new THREE.Vector3(0, 0.62, 0))), 0.66, 0.12, new THREE.Vector3(0, 1, 0)));
  }
}

export function stairLanternSpots() {
  const out = [];
  for (let z = S.z0 + 6; z < S.z0 + 80; z += 9) {
    for (const sx of [-1, 1]) out.push(new THREE.Vector3(sx * (S.w / 2 + 0.35), stairYSmooth(z) + 0.8, z));
  }
  return out;
}

// ---------------------------------------------------------------- paved approach + stepping stones
function paths(B) {
  const rng = new Rng(17);
  const P = LAYOUT.path;
  // ishidatami: running-bond granite slabs down the axis
  let z = P.z0;
  let row = 0;
  while (z > P.z1) {
    const d = rng.range(0.55, 0.8);
    let x = -P.w / 2;
    if (row % 2) x -= 0.35;
    while (x < P.w / 2) {
      const wdt = rng.range(0.6, 1.3);
      const xa = Math.max(x, -P.w / 2), xb = Math.min(x + wdt, P.w / 2);
      if (xb - xa > 0.15) B.box(rng.f() < 0.2 ? 'stoneDark' : 'stone', xb - xa - 0.03, 0.2, d - 0.03, (xa + xb) / 2, 0.02 + rng.range(-0.01, 0.01), z - d / 2);
      x += wdt;
    }
    z -= d; row++;
  }
  // kerb stones
  for (const sx of [-1, 1]) B.box('stoneDark', 0.18, 0.18, P.z0 - P.z1, sx * (P.w / 2 + 0.1), 0.0, (P.z0 + P.z1) / 2);
  // stepping stones (tobi-ishi) to the pagoda, bell tower and temizuya
  const trail = (ax, az, bx, bz) => {
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.floor(len / 0.85);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = lerp(ax, bx, t) + rng.range(-0.18, 0.18), zz = lerp(az, bz, t) + rng.range(-0.18, 0.18);
      const r = rng.range(0.32, 0.45);
      const g = new THREE.CylinderGeometry(r, r * 1.05, 0.18, 7);
      g.scale(1, 1, rng.range(0.75, 1));
      B.push(rng.f() < 0.5 ? 'stone' : 'stoneDark', g, mat(x, 0.04, zz, rng.f() * 6));
    }
  };
  trail(-2.2, 9, -21, 8.5);
  trail(2.2, 24, 21.5, 24.5);
  trail(-2.2, 30, -8, 30);
  trail(2.2, -3, 18, -6);
  trail(-2.2, -3, -18, -10);
  trail(-18, -10, -19, -22);
  void vnoise2;
}
