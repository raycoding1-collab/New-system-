// Trees, grown procedurally: Japanese maples (momiji), weeping-wide cherries (sakura),
// cloud-pruned pines (niwaki matsu), towering cedars (sugi), a bamboo grove, and an
// instanced forest on the slopes. Foliage is built from alpha-cut leaf cards whose
// normals point out from each cluster's centre, so crowns shade as soft volumes. Every
// card remembers a random seed and its height in the crown, which lets the seasons
// recolour all of them in place.
import * as THREE from 'three';
import { Rng, cylGeo, mat, clamp, smoothstep, lerp, Builder, TAU } from '../lib/util.js';
import * as TX from '../lib/textures.js';
import { patchMaterial } from '../lib/patch.js';
import { LAYOUT } from '../layout.js';

const inClearing = (x, z) => LAYOUT.clearings.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r);

const UP = new THREE.Vector3(0, 1, 0);

// ------------------------------------------------------------------ foliage buffers
class Foliage {
  constructor(name, material) {
    this.name = name; this.material = material;
    this.pos = []; this.nor = []; this.uv = []; this.meta = []; this.idx = [];
  }
  cluster(c, rx, ry, rz, n, size, rng, h01, flat = 0) {
    const p = new THREE.Vector3(), out = new THREE.Vector3(), fn = new THREE.Vector3(), t = new THREE.Vector3(), b = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      // points biased toward the shell of the ellipsoid
      const u = rng.f() * 2 - 1, th = rng.f() * TAU, rr = Math.pow(rng.f(), 0.35);
      const s = Math.sqrt(1 - u * u);
      p.set(Math.cos(th) * s * rr * rx, u * rr * ry, Math.sin(th) * s * rr * rz);
      out.copy(p).divide(new THREE.Vector3(rx, ry, rz)).normalize();
      out.y += 0.35; out.normalize();
      p.add(c);
      fn.set(rng.f() - 0.5, rng.f() - 0.5, rng.f() - 0.5).multiplyScalar(1.6).add(out);
      if (flat) fn.lerp(UP, flat);
      fn.normalize();
      t.crossVectors(fn, Math.abs(fn.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : UP).normalize();
      t.applyAxisAngle(fn, rng.f() * TAU);
      b.crossVectors(fn, t);
      const sz = size * rng.range(0.75, 1.25);
      const base = this.pos.length / 3;
      const nn = out.clone().lerp(fn, 0.25).normalize();
      const edge = rr;
      const rnd = rng.f();
      for (const [cu, cv] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
        const ox = (cu - 0.5) * sz, oy = (cv - 0.5) * sz;
        this.pos.push(p.x + t.x * ox + b.x * oy, p.y + t.y * ox + b.y * oy, p.z + t.z * ox + b.z * oy);
        this.nor.push(nn.x, nn.y, nn.z);
        this.uv.push(cu, cv);
        this.meta.push(rnd, h01, edge);
      }
      this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  mesh() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(this.pos.length), 3));
    g.setIndex(this.pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, this.material);
    m.name = `foliage:${this.name}`;
    m.castShadow = true; m.receiveShadow = true;
    m.userData.noAO = true;
    m.foliageMeta = new Float32Array(this.meta); // kept off userData so it is not exported as glTF extras
    this.meshObj = m;
    return m;
  }
  recolor(fn) {
    const g = this.meshObj.geometry, col = g.attributes.color, meta = this.meshObj.foliageMeta;
    const c = new THREE.Color();
    for (let i = 0; i < col.count; i++) {
      fn(meta[i * 3], meta[i * 3 + 1], meta[i * 3 + 2], c);
      col.setXYZ(i, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
  }
}

// Canopies of one species, split into 60 m cells: each cell is its own mesh with tight
// bounds, so trees outside the view are skipped by frustum culling.
class FoliageSet {
  constructor(name, material, cell = 60) { this.name = name; this.material = material; this.cell = cell; this.cells = new Map(); }
  at(x, z) {
    const key = `${Math.floor(x / this.cell)}:${Math.floor(z / this.cell)}`;
    if (!this.cells.has(key)) this.cells.set(key, new Foliage(this.name, this.material));
    return this.cells.get(key);
  }
  list() { return [...this.cells.values()]; }
}

// ------------------------------------------------------------------ branches
function limb(B, key, a, b, r0, r1, seg = 7) {
  const dir = b.clone().sub(a);
  const len = dir.length();
  const g = cylGeo(r1, r0, len, seg, true);
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize());
  const m = new THREE.Matrix4().compose(a.clone().lerp(b, 0.5), q, new THREE.Vector3(1, 1, 1));
  B.push(key, g, m);
}

function bend(dir, rng, spread, upBias) {
  const axis = new THREE.Vector3(rng.f() - 0.5, rng.f() - 0.5, rng.f() - 0.5).cross(dir).normalize();
  const d = dir.clone().applyAxisAngle(axis, spread * rng.range(0.6, 1.2));
  d.y += upBias;
  return d.normalize();
}

function deciduous(B, fol, key, base, rng, sp) {
  const clusters = [];
  const H = sp.height;
  const grow = (start, dir, len, rad, depth) => {
    // two sub-segments so limbs curve
    const mid = start.clone().addScaledVector(dir, len * 0.5);
    const d2 = dir.clone(); d2.y += sp.droop * (sp.depth - depth) * 0.08; d2.normalize();
    const end = mid.clone().addScaledVector(d2, len * 0.5);
    limb(B, key, start, mid, rad, rad * 0.85, depth > 2 ? 8 : 5);
    limb(B, key, mid, end, rad * 0.85, rad * sp.taper, depth > 2 ? 8 : 5);
    if (depth <= 1) clusters.push(end.clone());
    if (depth === 0) return;
    const kids = depth === sp.depth ? sp.firstKids : rng.int(2, 3);
    for (let k = 0; k < kids; k++) {
      const nd = bend(d2, rng, sp.spread, sp.upBias * (depth / sp.depth));
      grow(end, nd, len * sp.lenRatio * rng.range(0.8, 1.15), rad * sp.radRatio, depth - 1);
    }
  };
  const lean = new THREE.Vector3(rng.range(-0.15, 0.15), 1, rng.range(-0.15, 0.15)).normalize();
  grow(base.clone(), lean, sp.trunk, sp.radius, sp.depth);
  let ymin = Infinity, ymax = -Infinity;
  for (const c of clusters) { ymin = Math.min(ymin, c.y); ymax = Math.max(ymax, c.y); }
  for (const c of clusters) {
    const h01 = (c.y - ymin) / Math.max(1, ymax - ymin);
    fol.cluster(c, sp.cr * rng.range(0.8, 1.2), sp.cr * 0.5, sp.cr * rng.range(0.8, 1.2), sp.cards, sp.card, rng, h01, 0.25);
  }
  void H;
}

function pine(B, fol, base, rng, s = 1) {
  // S-curved trunk with horizontal limbs, each ending in a flat cloud of needles
  const pts = [base.clone()];
  const lean = new THREE.Vector3(rng.range(-1, 1), 0, rng.range(-1, 1)).normalize();
  let p = base.clone();
  const H = rng.range(5, 7) * s;
  for (let i = 1; i <= 6; i++) {
    const t = i / 6;
    p = base.clone().addScaledVector(lean, Math.sin(t * 2.6) * 1.4 * s).add(new THREE.Vector3(0, t * H, 0));
    pts.push(p);
  }
  for (let i = 0; i < pts.length - 1; i++) limb(B, 'barkPine', pts[i], pts[i + 1], 0.32 * s * (1 - i * 0.12), 0.32 * s * (1 - (i + 1) * 0.12), 9);
  const pads = [];
  for (let i = 2; i < pts.length; i++) {
    const n = i === pts.length - 1 ? 1 : rng.int(1, 2);
    for (let k = 0; k < n; k++) {
      const a = rng.f() * TAU;
      const dir = new THREE.Vector3(Math.cos(a), rng.range(0.05, 0.3), Math.sin(a)).normalize();
      const len = (i === pts.length - 1 ? 0.3 : rng.range(1.3, 2.6)) * s;
      const end = pts[i].clone().addScaledVector(dir, len);
      limb(B, 'barkPine', pts[i], end, 0.12 * s, 0.05 * s, 6);
      pads.push(end.add(new THREE.Vector3(0, 0.25 * s, 0)));
    }
  }
  for (const c of pads) {
    const r = rng.range(1.0, 1.5) * s;
    fol.cluster(c, r, 0.36 * s, r * 0.85, Math.round(95 * s * s), 0.42 * s, rng, 0.5, 0.55);
  }
}

function cedar(B, fol, base, rng, H) {
  const top = base.clone().add(new THREE.Vector3(rng.range(-0.3, 0.3), H, rng.range(-0.3, 0.3)));
  limb(B, 'barkCedar', base, base.clone().lerp(top, 0.5), 0.5 * H / 28, 0.3 * H / 28, 10);
  limb(B, 'barkCedar', base.clone().lerp(top, 0.5), top, 0.3 * H / 28, 0.04, 8);
  const start = 0.2 + rng.f() * 0.08;
  for (let h = start; h < 1; h += 0.9 / H) {
    const c = base.clone().lerp(top, h);
    const R = (1 - h) * 3.0 * (H / 28) + 0.5;
    const n = h > 0.9 ? 1 : rng.int(2, 4);
    for (let k = 0; k < n; k++) {
      const a = rng.f() * TAU;
      const p = c.clone().add(new THREE.Vector3(Math.cos(a) * R * 0.7, 0, Math.sin(a) * R * 0.7));
      if (h < 0.85) limb(B, 'barkCedar', c, p, 0.06, 0.03, 4);
      fol.cluster(p, R * 0.55 + 0.4, 0.55, R * 0.55 + 0.4, 14, 1.0, rng, h, 0.2);
    }
  }
}

function bambooCulm(B, fol, base, rng) {
  const H = rng.range(9, 13);
  const lean = new THREE.Vector3(rng.range(-0.12, 0.12), 1, rng.range(-0.12, 0.12)).normalize();
  const r = rng.range(0.045, 0.07);
  let prev = base.clone();
  const n = 10;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const p = base.clone().addScaledVector(lean, H * t);
    p.x += Math.sin(t * 2) * 0.3 * lean.x * 4; p.z += Math.sin(t * 2) * 0.3 * lean.z * 4;
    limb(B, 'bamboo', prev, p, r * (1 - t * 0.4), r * (1 - t * 0.45), 6);
    B.push('bambooDry', cylGeo(r * 1.12, r * 1.12, 0.03, 6), mat(p.x, p.y, p.z));
    if (t > 0.5) fol.cluster(p.clone().add(new THREE.Vector3(rng.range(-0.4, 0.4), 0, rng.range(-0.4, 0.4))), 0.9, 0.7, 0.9, 7, 0.75, rng, t, 0);
    prev = p;
  }
}

// ------------------------------------------------------------------ the whole planting
export function plantTrees(heightAt, P, opts = {}) {
  const rng = new Rng(2024);
  const tex = {
    maple: TX.mapleLeafTexture(), blossom: TX.blossomTexture(), needle: TX.needleTexture(), cedar: TX.cedarTexture(), bamboo: TX.bambooLeafTexture(),
  };
  const leafMat = (name, map, wind, alphaTest = 0.42) => patchMaterial(new THREE.MeshStandardMaterial({
    name, map, alphaTest, side: THREE.DoubleSide, vertexColors: true, roughness: 0.78, metalness: 0,
  }), { wind, snow: 0.6 });
  const mats = {
    maple: leafMat('leaf-maple', tex.maple, 0.06),
    cherry: leafMat('leaf-cherry', tex.blossom, 0.05),
    pine: leafMat('leaf-pine', tex.needle, 0.025, 0.38),
    cedar: leafMat('leaf-cedar', tex.cedar, 0.03),
    bamboo: leafMat('leaf-bamboo', tex.bamboo, 0.09),
  };
  const fol = {
    maple: new FoliageSet('maple', mats.maple), cherry: new FoliageSet('cherry', mats.cherry), pine: new FoliageSet('pine', mats.pine),
    cedar: new FoliageSet('cedar', mats.cedar), bamboo: new FoliageSet('bamboo', mats.bamboo),
  };
  const B = new Builder();
  const at = (x, z) => new THREE.Vector3(x, heightAt(x, z), z);

  const mapleSp = { trunk: 1.8, radius: 0.2, depth: 4, firstKids: 3, spread: 0.85, lenRatio: 0.78, radRatio: 0.62, taper: 0.7, upBias: 0.25, droop: -0.3, cr: 1.3, cards: 30, card: 0.55, height: 7 };
  const cherrySp = { trunk: 1.5, radius: 0.26, depth: 4, firstKids: 4, spread: 0.95, lenRatio: 0.78, radRatio: 0.6, taper: 0.7, upBias: 0.1, droop: -0.35, cr: 1.3, cards: 50, card: 0.7, height: 6 };
  const maples = [[20.5, 4], [45, -1], [46, -19], [23, -25], [40, -27], [15, 31], [36, 31.5], [-16, 38], [14, 50], [-44, 28], [-18, -38], [18, -39], [6, 53], [48, 14]];
  for (const [x, z] of maples) deciduous(B, fol.maple.at(x, z), 'barkMaple', at(x, z), rng, { ...mapleSp, trunk: mapleSp.trunk * rng.range(0.85, 1.2) });
  const cherries = [[-40, 1], [-20, 20], [-41, 18], [-12, 17], [-12, 49], [20, 46], [-36, -14]];
  for (const [x, z] of cherries) deciduous(B, fol.cherry.at(x, z), 'barkCherry', at(x, z), rng, cherrySp);
  const pines = [[-18, -4, 1], [18.2, -3, 0.9], [40.5, -17.5, 0.55], [-23, -39, 0.9], [-45, -25, 0.85], [-9, 51, 0.8], [9, 51, 0.8], [-17, -27, 0.75]];
  for (const [x, z, s] of pines) pine(B, fol.pine.at(x, z), at(x, z), rng, s);
  // hero cedars behind the hall and along the flanks
  const cedars = [];
  for (let x = -56; x <= 56; x += rng.range(5.5, 8.5)) cedars.push([x + rng.range(-1.5, 1.5), -55 - rng.range(0, 9)]);
  for (let x = -60; x <= 60; x += rng.range(7, 11)) cedars.push([x, -68 - rng.range(0, 8)]);
  for (let z = -36; z <= 12; z += rng.range(8, 12)) cedars.push([-58 - rng.range(0, 4), z]);
  for (let z = -40; z <= 40; z += rng.range(9, 13)) cedars.push([59 + rng.range(0, 4), z]);
  for (const [x, z] of cedars.filter(([x, z]) => !inClearing(x, z))) cedar(B, fol.cedar.at(x, z), at(x, z).add(new THREE.Vector3(0, -0.3, 0)), rng, rng.range(22, 32));
  // bamboo grove on the west flank
  for (let i = 0; i < 80; i++) {
    const x = rng.range(-53, -45), z = rng.range(-14, 24);
    if (Math.hypot(x + 41, z - 18) < 4) continue;
    bambooCulm(B, fol.bamboo.at(x, z), at(x, z), rng);
  }

  const barkMat = (name, color, rough = 0.9) => patchMaterial(new THREE.MeshStandardMaterial({ name, color, map: P.textures.wood.map, normalMap: P.textures.wood.normal, roughness: rough }), {});
  const palette = {
    barkMaple: barkMat('bark-maple', '#6d6258'), barkCherry: barkMat('bark-cherry', '#3c2c26', 0.7), barkPine: barkMat('bark-pine', '#6a5243'),
    barkCedar: barkMat('bark-cedar', '#4d3529'), bamboo: P.bamboo, bambooDry: P.bambooDry,
  };
  const group = B.build(palette, { name: 'trees' });
  for (const set of Object.values(fol)) for (const f of set.list()) group.add(f.mesh());
  const mid = midForest(heightAt, rng, mats.cedar, palette.barkCedar, opts.midCount || 950);
  group.add(mid.foliage, mid.trunks);
  fol.cedarMid = mid.fol;
  const forest = slopeForest(heightAt, rng);
  group.add(forest);
  return { group, fol, mats, tex, forest };
}

// ------------------------------------------------------------------ instanced cedars on the near slopes
// One card-built cedar, instanced ~900 times with per-tree scale, lean and tint.
function midForest(heightAt, rng, material, barkMaterial, count) {
  const f = new Foliage('cedarMid', material);
  const H = 24;
  const base = new THREE.Vector3();
  // ~230 cards per tree: dense enough from the terrace, light enough to instance by the hundred
  for (let h = 0.2; h < 1; h += 0.075) {
    const c = new THREE.Vector3(0, h * H, 0);
    const R = (1 - h) * 3.0 + 0.6;
    const n = h > 0.9 ? 1 : 3;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU + h * 7;
      const p = c.clone().add(new THREE.Vector3(Math.cos(a) * R * 0.6, 0, Math.sin(a) * R * 0.6));
      f.cluster(p, R * 0.6 + 0.5, 0.8, R * 0.6 + 0.5, 7, 1.5, rng, h, 0.2);
    }
  }
  const tmp = f.mesh();
  const spots = [];
  let tries = 0;
  while (spots.length < count && tries < 40000) {
    tries++;
    const a = rng.f() * TAU, r = 60 + Math.pow(rng.f(), 1.2) * 120;
    const x = Math.cos(a) * r, z = Math.sin(a) * r * 1.05 - 6;
    if (Math.abs(x) < 9.5 && z > 50) continue;
    if (x > -61 && x < 61 && z > -57 && z < 59) continue;
    if (inClearing(x, z)) continue;
    const y = heightAt(x, z);
    if (y < -36) continue;
    spots.push([x, y, z]);
  }
  const trunkGeo = cylGeo(0.06, 0.5, H * 0.95, 7, true);
  trunkGeo.translate(0, H * 0.475, 0);
  // compute every instance first (same random sequence as ever), then deal them into
  // sectors around the mountain so the ones behind the camera are culled
  const SECT = 8;
  const buckets = Array.from({ length: SECT }, () => ({ m: [], c: [] }));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  spots.forEach(([x, y, z]) => {
    const s = rng.range(0.7, 1.25);
    q.setFromEuler(new THREE.Euler(rng.range(-0.04, 0.04), rng.f() * TAU, rng.range(-0.04, 0.04)));
    m.compose(new THREE.Vector3(x, y - 0.4, z), q, new THREE.Vector3(s * rng.range(0.85, 1.1), s, s * rng.range(0.85, 1.1)));
    c.setScalar(rng.range(0.78, 1.12));
    const k = Math.min(SECT - 1, Math.floor(((Math.atan2(z, x) + Math.PI) / TAU) * SECT));
    buckets[k].m.push(m.clone()); buckets[k].c.push(c.clone());
  });
  const foliage = new THREE.Group(), trunks = new THREE.Group();
  foliage.name = 'cedars-mid'; trunks.name = 'cedar-trunks-mid';
  foliage.userData.noAO = true;
  foliage.userData.noExport = true; trunks.userData.noExport = true;
  for (const b of buckets) {
    if (!b.m.length) continue;
    const fm = new THREE.InstancedMesh(tmp.geometry, material, b.m.length);
    const tm = new THREE.InstancedMesh(trunkGeo, barkMaterial, b.m.length);
    b.m.forEach((mm, i) => { fm.setMatrixAt(i, mm); tm.setMatrixAt(i, mm); fm.setColorAt(i, b.c[i]); });
    fm.castShadow = tm.castShadow = true;
    fm.receiveShadow = tm.receiveShadow = true;
    fm.name = 'cedars-mid'; tm.name = 'cedar-trunks-mid';
    fm.userData.noAO = true;
    fm.userData.noExport = true; tm.userData.noExport = true;
    fm.computeBoundingSphere(); tm.computeBoundingSphere();
    foliage.add(fm); trunks.add(tm);
  }
  // all sectors share one geometry, so recolouring it recolours every tree
  const first = foliage.children[0];
  first.foliageMeta = tmp.foliageMeta;
  f.meshObj = first;
  void base;
  return { foliage, trunks, fol: f };
}

// ------------------------------------------------------------------ instanced far forest
function slopeForest(heightAt, rng) {
  // a slim cedar silhouette: drooping tiers with a ragged, star-shaped section
  const parts = [];
  for (let i = 0; i < 6; i++) {
    const g = new THREE.ConeGeometry(0.62 - i * 0.085, 1.05, 10, 2, true);
    const p = g.attributes.position;
    for (let v = 0; v < p.count; v++) {
      const a = Math.atan2(p.getZ(v), p.getX(v));
      const k = 1 + 0.22 * Math.sin(a * 5 + i * 1.7) * (p.getY(v) < 0 ? 1 : 0.3);
      p.setX(v, p.getX(v) * k); p.setZ(v, p.getZ(v) * k);
    }
    g.translate(0, 0.95 + i * 0.52, 0);
    parts.push(g);
  }
  const trunk = new THREE.CylinderGeometry(0.04, 0.07, 1.2, 5);
  trunk.translate(0, 0.6, 0);
  parts.push(trunk);
  const merged = new THREE.BufferGeometry();
  // simple merge
  const pos = [], nor = [], col = [];
  parts.forEach((g, gi) => {
    const ng = g.toNonIndexed();
    ng.computeVertexNormals();
    const p = ng.attributes.position, n = ng.attributes.normal;
    for (let v = 0; v < p.count; v++) {
      pos.push(p.getX(v), p.getY(v), p.getZ(v));
      // tilt normals upward for a softer canopy read, never letting them collapse to zero
      const nx = n.getX(v), ny = n.getY(v) * 0.5 + 0.5, nz = n.getZ(v);
      const l = Math.hypot(nx, ny, nz);
      if (l > 1e-4) nor.push(nx / l, ny / l, nz / l); else nor.push(0, 1, 0);
      const shade = gi === 6 ? 0.35 : 0.5 + (p.getY(v) / 4) * 0.5;
      col.push(shade, shade, shade);
    }
  });
  merged.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  merged.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const material = patchMaterial(new THREE.MeshStandardMaterial({ name: 'forest', vertexColors: true, roughness: 0.95, side: THREE.DoubleSide }), { snow: 0.8 });
  const spots = [];
  let tries = 0;
  while (spots.length < 4200 && tries < 60000) {
    tries++;
    const a = rng.f() * TAU, r = 165 + Math.pow(rng.f(), 0.9) * 300;
    const x = Math.cos(a) * r, z = Math.sin(a) * r * 1.1 - 20;
    if (Math.abs(x) < 9 && z > 50) continue;            // keep the stair clear
    if (x > -62 && x < 62 && z > -58 && z < 60) continue; // terrace + hero trees
    if (inClearing(x, z)) continue;
    const y = heightAt(x, z);
    if (y < -30) continue;
    const dx = heightAt(x + 2, z) - y, dz = heightAt(x, z + 2) - y;
    if (Math.hypot(dx, dz) / 2 > 2.2) continue;
    spots.push([x, y, z]);
  }
  const SECT = 12;
  const buckets = Array.from({ length: SECT }, () => ({ m: [], c: [], ids: [] }));
  const m = new THREE.Matrix4(), c = new THREE.Color();
  const greens = [new THREE.Color('#1f3019'), new THREE.Color('#2a3d1f'), new THREE.Color('#33461f'), new THREE.Color('#263a26')];
  spots.forEach(([x, y, z], i) => {
    const s = rng.range(4.2, 6.8) * (1 + smoothstep(120, 400, Math.hypot(x, z)) * 0.5);
    m.compose(new THREE.Vector3(x, y - 0.5, z), new THREE.Quaternion().setFromAxisAngle(UP, rng.f() * TAU), new THREE.Vector3(s * rng.range(0.8, 1.1), s * rng.range(0.9, 1.3), s * rng.range(0.8, 1.1)));
    c.copy(greens[i % greens.length]).multiplyScalar(rng.range(0.8, 1.2));
    const k = Math.min(SECT - 1, Math.floor(((Math.atan2(z, x) + Math.PI) / TAU) * SECT));
    buckets[k].m.push(m.clone()); buckets[k].c.push(c.clone()); buckets[k].ids.push(i);
  });
  const group = new THREE.Group();
  group.name = 'forest';
  group.userData.noAO = true;
  group.userData.noExport = true;
  for (const b of buckets) {
    if (!b.m.length) continue;
    const mesh = new THREE.InstancedMesh(merged, material, b.m.length);
    b.m.forEach((mm, i) => { mesh.setMatrixAt(i, mm); mesh.setColorAt(i, b.c[i]); });
    mesh.castShadow = false; mesh.receiveShadow = true;
    mesh.name = 'forest';
    mesh.userData.noAO = true;
    mesh.userData.noExport = true;
    mesh.baseColors = mesh.instanceColor.array.slice();
    mesh.instanceIds = b.ids; // original index, so seasonal tints land on the same trees
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  return group;
}

// ------------------------------------------------------------------ seasons
const hex = (h) => new THREE.Color(h);
export const SEASON_LEAVES = {
  spring: {
    maple: [hex('#86b13f'), hex('#b5cd57'), hex('#a3492a')], cherry: [hex('#f3c9d4'), hex('#fbe7ee'), hex('#e8a9bd')],
    pine: [hex('#35522a'), hex('#4c6e2f')], cedar: [hex('#2e4520'), hex('#456128')], bamboo: [hex('#88a447'), hex('#b2c262')],
  },
  summer: {
    maple: [hex('#3d7428'), hex('#5f9437'), hex('#4f8530')], cherry: [hex('#3f6b28'), hex('#58833a'), hex('#4b7a2f')],
    pine: [hex('#2c4722'), hex('#3d5d29')], cedar: [hex('#24391b'), hex('#36502a')], bamboo: [hex('#6f9238'), hex('#9cb455')],
  },
  autumn: {
    maple: [hex('#b3141a'), hex('#e0461c'), hex('#f0a02a')], cherry: [hex('#b9562a'), hex('#d68a36'), hex('#8e3b26')],
    pine: [hex('#30482a'), hex('#46602c')], cedar: [hex('#283c1d'), hex('#3b4f24')], bamboo: [hex('#93a04a'), hex('#c2b66a')],
  },
  winter: {
    maple: null, cherry: null,
    pine: [hex('#26391f'), hex('#334a26')], cedar: [hex('#223219'), hex('#2f4224')], bamboo: [hex('#708a40'), hex('#93a356')],
  },
};

export function applySeason(trees, season) {
  const S = SEASON_LEAVES[season];
  const tmp = new THREE.Color();
  for (const [k, entry] of Object.entries(trees.fol)) for (const f of entry.list ? entry.list() : [entry]) {
    const pal = S[k === 'cedarMid' ? 'cedar' : k];
    f.meshObj.visible = !!pal;
    if (!pal) continue;
    f.recolor((rnd, h, edge, out) => {
      if (k === 'maple' && season === 'autumn') {
        // crowns blush from gold at the inside to crimson at the sunlit top
        const t = clamp(rnd * 0.7 + h * 0.6 - 0.15, 0, 1);
        out.copy(pal[2]).lerp(pal[1], smoothstep(0.0, 0.5, t)).lerp(pal[0], smoothstep(0.45, 0.9, t));
      } else if (k === 'maple' && season === 'spring') {
        out.copy(pal[0]).lerp(pal[1], rnd);
        if (rnd > 0.88) out.copy(pal[2]);
      } else {
        out.copy(pal[0]).lerp(pal[1], rnd);
        if (pal[2] && rnd > 0.8) out.lerp(pal[2], 0.6);
      }
      out.multiplyScalar(0.72 + edge * 0.38);
      void tmp;
    });
  }
  trees.mats.cherry.map = season === 'spring' ? trees.tex.blossom : trees.tex.maple;
  trees.mats.cherry.needsUpdate = true;
  // slope forest: autumn mixes in a few turning broadleaves, winter frosts it
  const autumnTint = [hex('#7a2e16'), hex('#9a5a1c'), hex('#6e6a22')];
  for (const f of trees.forest.children) {
    const base = f.baseColors, arr = f.instanceColor.array, ids = f.instanceIds;
    for (let j = 0; j < f.count; j++) {
      const i = ids[j];
      tmp.setRGB(base[j * 3], base[j * 3 + 1], base[j * 3 + 2]);
      if (season === 'autumn' && (i * 7919) % 100 < 14) tmp.lerp(autumnTint[i % 3], 0.6);
      if (season === 'spring' && (i * 7919) % 100 < 6) tmp.lerp(hex('#c99aa8'), 0.5);
      arr[j * 3] = tmp.r; arr[j * 3 + 1] = tmp.g; arr[j * 3 + 2] = tmp.b;
    }
    f.instanceColor.needsUpdate = true;
  }
  void lerp;
}
