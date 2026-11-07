// Japanese roof generator.
//
// A roof is a family of nested rectangular "rings" climbing from the eave (inset 0) to
// the ridge. Each ring is lifted by a concave profile (gentle at the eave, steep at the
// ridge: the teri curve) and, near the corners, by the nokizori sweep that makes the
// eaves curl upward and outward. From that one surface function we derive everything
// else so it all lines up: the tile surface, the round-tile rows, the two-layer soffit,
// both rafter layers with their painted ends, the hip rafters, ridges, gables,
// bargeboards and the wind bells hanging at each corner.
//
// Supported: 'hip' (yosemune), 'irimoya' (hip-and-gable), 'pyramid' (hōgyō; pagoda tiers,
// with an optional top inset where the next storey begins).
import * as THREE from 'three';
import { boxGeo, cylGeo, latheGeo, polyBeamGeo, polyTubeGeo, mat, clamp, TAU } from '../lib/util.js';

// side 0: +z, 1: +x, 2: -z, 3: -x.  n = outward normal (x,z), e = along-edge tangent
const SIDES = [
  { n: [0, 1], e: [1, 0] },
  { n: [1, 0], e: [0, -1] },
  { n: [0, -1], e: [-1, 0] },
  { n: [-1, 0], e: [0, 1] },
];

export class Roof {
  constructor(o) {
    this.o = o = Object.assign({
      cx: 0, cz: 0, type: 'hip', gableT: 0.55, pow: 1.55, lift: 0.6, liftReachK: 0.5, liftFadeK: 0.5,
      sweep: 0.35, thick: 0.3, hFly: 0.14, scale: 1, tileSpacing: 0.3, course: 0.27, tileR: 0.075,
      keys: {}, ridgeEnd: 'oni', chimes: true, setback: 0.7, ceiling: null,
    }, o);
    const { hx, hz } = o;
    this.iR = Math.min(hx, hz);
    this.ig = o.type === 'irimoya' ? o.gableT * this.iR : this.iR;
    this.iTop = o.topInset !== undefined ? o.topInset : this.iR;
    this.ov = o.overhang;
    this.R = o.liftReach !== undefined ? o.liftReach : o.liftReachK * this.iR * 1.6;
    this.iL = Math.min(o.liftFadeK * this.iR, o.type === 'irimoya' ? this.ig * 0.95 : 1e9);
    // derive eave height from the soffit height wanted at the wall line
    if (o.soffitAtWall !== undefined) {
      o.y0 = o.soffitAtWall + o.thick + o.hFly - o.rise * Math.pow(this.ov / this.iR, o.pow);
    }
    // or: the soffit must clear a given height at a given inset (the outermost bracket tier)
    if (o.soffitAnchor) {
      const [ins, yy] = o.soffitAnchor;
      const layer = ins < this.ov * 0.45 ? o.thick : o.thick + o.hFly;
      o.y0 = yy + layer - o.rise * Math.pow(ins / this.iR, o.pow);
    }
    this.keys = Object.assign({
      tile: 'tile', round: 'tileRound', ridge: 'ridge', soffit: 'shu', fascia: 'shu', rafter: 'shu',
      rafterEnd: 'ochre', gable: 'plaster', gableFrame: 'shu', barge: 'shu', gold: 'gold', chime: 'bronzeDark', hip: 'shu',
      ornament: 'ridge',
    }, o.keys);
  }

  // ------------------------------------------------------------ surface function
  iMax(side) {
    if (this.o.type === 'irimoya') return side % 2 === 0 ? this.iR : this.ig + this.o.setback + 0.05;
    return Math.min(this.iTop, this.iR);
  }
  L0(side) { return side % 2 === 0 ? this.o.hx : this.o.hz; }
  halfLen(side, i) {
    if (this.o.type === 'irimoya' && side % 2 === 0 && i > this.ig) return this.o.hx - this.ig;
    return Math.max(0, this.L0(side) - i);
  }
  halfDepth(side, i) { return (side % 2 === 0 ? this.o.hz : this.o.hx) - i; }
  baseY(i) { return this.o.y0 + this.o.rise * Math.pow(Math.max(0, i) / this.iR, this.o.pow); }

  point(side, a, i, under = 0, out = new THREE.Vector3()) {
    const S = SIDES[side];
    const hl = this.halfLen(side, i);
    const d = Math.max(0, hl - Math.abs(a));
    const c = Math.max(0, 1 - d / this.R);
    const f = i < this.iL ? Math.pow(1 - i / this.iL, 2) : 0;
    const lf = this.o.lift * c * c * f;
    const sw = this.o.sweep * lf;
    const along = a + Math.sign(a) * sw * c;
    const outv = this.halfDepth(side, i) + sw;
    out.set(
      this.o.cx + S.n[0] * outv + S.e[0] * along,
      this.baseY(i) + lf - under,
      this.o.cz + S.n[1] * outv + S.e[1] * along);
    return out;
  }

  // soffit height straight above the wall line, mid-side
  soffitY(i = this.ov) { return this.baseY(i) - this.o.thick - this.o.hFly; }
  topY(i) { return this.baseY(i); }

  // arc length of the profile from the eave up to inset i (for tile v coordinates)
  arcLen(i) {
    const n = 24; let s = 0, py = this.baseY(0);
    for (let k = 1; k <= n; k++) {
      const ii = (i * k) / n, y = this.baseY(ii);
      s += Math.hypot(i / n, y - py); py = y;
    }
    return s;
  }

  // ------------------------------------------------------------ build everything
  build(B) {
    const k = this.keys;
    for (let s = 0; s < 4; s++) {
      B.push(k.tile, this.surface(s, 0, this.iMax(s), 0, true));
      // outer soffit (under flying rafters) and inner soffit (under base rafters)
      const iS = Math.min(this.ov + 0.35, this.iMax(s));
      B.push(k.soffit, this.surface(s, 0, Math.min(this.ov * 0.5, iS), this.o.thick, false));
      B.push(k.soffit, this.surface(s, this.ov * 0.4, iS, this.o.thick + this.o.hFly, false));
      B.push(k.fascia, this.edgeBand(s));
      this.tileLines(B, s);
      this.rafters(B, s);
      this.hipRafter(B, s);
    }
    this.ridges(B);
    if (this.o.type === 'irimoya') this.gables(B);
    if (this.o.ceiling) {
      const wx = this.o.hx - this.ov, wz = this.o.hz - this.ov;
      B.box(this.o.ceiling, wx * 2 + 0.2, 0.1, wz * 2 + 0.2, this.o.cx, this.soffitY() + 0.02, this.o.cz);
    }
    return this;
  }

  // top (tiles) or underside surface patch of one side, insets [i0, i1]
  surface(side, i0, i1, under, top, aRange = null) {
    const L0 = this.L0(side);
    const nk = Math.max(8, Math.ceil((2 * L0) / 0.35));
    const nj = Math.max(4, Math.ceil((i1 - i0) / 0.3));
    const pos = [], uv = [], idx = [];
    const p = new THREE.Vector3();
    const sp = this.o.tileSpacing, course = this.o.course;
    const nLines = Math.max(2, Math.round((2 * L0) / sp));
    const spAdj = (2 * L0) / nLines;
    for (let j = 0; j <= nj; j++) {
      const t = j / nj;
      const i = i0 + (i1 - i0) * Math.pow(t, top ? 1.15 : 1);
      const hl = this.halfLen(side, i);
      const v = this.arcLen(i);
      for (let q = 0; q <= nk; q++) {
        const s = -1 + (2 * q) / nk;
        let a;
        if (aRange) a = aRange[0] + (aRange[1] - aRange[0]) * (q / nk);
        else a = s * hl;
        this.point(side, a, i, under, p);
        pos.push(p.x, p.y, p.z);
        if (top) uv.push((a + L0) / (2 * spAdj), v / (4 * course));
        else uv.push(a, v);
      }
    }
    for (let j = 0; j < nj; j++) for (let q = 0; q < nk; q++) {
      const a = j * (nk + 1) + q, b = a + 1, c = a + nk + 1, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
    return finishSurface(pos, uv, idx, top ? 1 : -1);
  }

  // vertical band closing the eave edge between tiles and soffit
  edgeBand(side) {
    const L0 = this.L0(side);
    const nk = Math.max(8, Math.ceil((2 * L0) / 0.3));
    const pos = [], uv = [], idx = [];
    const p = new THREE.Vector3();
    for (let r = 0; r < 2; r++) {
      for (let q = 0; q <= nk; q++) {
        const a = (-1 + (2 * q) / nk) * L0;
        this.point(side, a, 0, r === 0 ? -0.02 : this.o.thick, p);
        pos.push(p.x, p.y, p.z); uv.push(a, r * this.o.thick);
      }
    }
    for (let q = 0; q < nk; q++) { const a = q, b = q + 1, c = q + nk + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    const g = finishSurface(pos, uv, idx, 0);
    // orient outward
    const S = SIDES[side];
    orientTo(g, new THREE.Vector3(S.n[0], 0, S.n[1]));
    return g;
  }

  // the round-tile rows (maru-gawara), real geometry so they catch light and snow
  tileLines(B, side) {
    const k = this.keys;
    const L0 = this.L0(side);
    const n = Math.max(2, Math.round((2 * L0) / this.o.tileSpacing));
    const sp = (2 * L0) / n;
    const r = this.o.tileR;
    const iMaxS = this.iMax(side);
    const P = new THREE.Vector3(), Pa = new THREE.Vector3(), Pb = new THREE.Vector3(), Pc = new THREE.Vector3(), Pd = new THREE.Vector3();
    const discs = [];
    for (let q = 0; q < n; q++) {
      const a = -L0 + (q + 0.5) * sp;
      let iEnd;
      if (this.o.type === 'irimoya' && side % 2 === 0) iEnd = Math.abs(a) <= this.o.hx - this.ig ? iMaxS : L0 - Math.abs(a);
      else iEnd = Math.min(iMaxS, L0 - Math.abs(a));
      iEnd -= 0.08;
      if (iEnd < 0.3) continue;
      const m = Math.max(3, Math.ceil(iEnd / 0.45) + 2);
      const pts = [], ups = [];
      for (let j = 0; j <= m; j++) {
        const i = iEnd * Math.pow(j / m, 1.15) + 0.01;
        this.point(side, a, i, 0, P);
        this.point(side, a + 0.05, i, 0, Pa); this.point(side, a - 0.05, i, 0, Pb);
        this.point(side, a, i + 0.05, 0, Pc); this.point(side, a, Math.max(0, i - 0.05), 0, Pd);
        const ta = Pa.sub(Pb), ti = Pc.sub(Pd);
        const N = new THREE.Vector3().crossVectors(ti, ta).normalize();
        if (N.y < 0) N.negate();
        pts.push(P.clone().addScaledVector(N, r * 0.25));
        ups.push(N);
      }
      B.push(k.round, polyTubeGeo(pts, r, 4, 0.5, ups));
      discs.push({ p: pts[0], t: pts[1].clone().sub(pts[0]).normalize(), up: ups[0] });
    }
    // eave-end discs (nokigawara)
    for (const d of discs) {
      const g = cylGeo(r * 1.15, r * 1.15, 0.05, 10);
      const m = new THREE.Matrix4();
      const z = d.t.clone().negate();
      const x = new THREE.Vector3().crossVectors(d.up, z).normalize();
      const y = new THREE.Vector3().crossVectors(z, x);
      m.makeBasis(x, z, y.negate()); // cylinder axis (y) -> outward
      m.setPosition(d.p.clone().addScaledVector(z, 0.02).addScaledVector(d.up, -r * 0.2));
      B.push(k.round, g, m);
    }
  }

  // jidaruki (base rafters) and hiendaruki (flying rafters), both with painted ends
  rafters(B, side) {
    const k = this.keys;
    const sc = this.o.scale;
    const L0 = this.L0(side);
    const spacing = 0.42 * sc;
    const n = Math.floor((2 * L0) / spacing);
    const w = 0.13 * sc, h = 0.15 * sc;
    const ov = this.ov;
    const p0 = new THREE.Vector3(), p1 = new THREE.Vector3();
    const S = SIDES[side];
    const outward = new THREE.Vector3(S.n[0], 0, S.n[1]);
    for (let q = 1; q < n; q++) {
      const a = -L0 + q * spacing;
      const hipLimit = L0 - Math.abs(a) - 0.12;
      // flying rafters
      const fEnd = Math.min(ov * 0.52, hipLimit);
      if (fEnd > 0.2) {
        this.point(side, a, 0.03, this.o.thick + h / 2, p0);
        this.point(side, a, fEnd, this.o.thick + h / 2, p1);
        B.span(k.rafter, p0, p1, w, h);
        B.push(k.rafterEnd, boxGeo(w * 1.02, h * 1.02, 0.025), endMatrix(p0, p1, -0.012));
      }
      // base rafters
      const bStart = ov * 0.36, bEnd = Math.min(ov + 0.3, hipLimit);
      if (bEnd - bStart > 0.2) {
        this.point(side, a, bStart, this.o.thick + this.o.hFly + h / 2, p0);
        this.point(side, a, bEnd, this.o.thick + this.o.hFly + h / 2, p1);
        B.span(k.rafter, p0, p1, w, h);
        B.push(k.rafterEnd, boxGeo(w * 1.02, h * 1.02, 0.025), endMatrix(p0, p1, -0.012));
      }
    }
    // the cross beam where base rafters end under the flying rafters (koshiura-ita)
    const pts = [];
    const L = this.halfLen(side, ov * 0.4) - 0.05;
    for (let q = 0; q <= 24; q++) {
      const a = (-1 + q / 12) * L;
      pts.push(this.point(side, a, ov * 0.4, this.o.thick + 0.02));
    }
    B.push(k.rafter, polyBeamGeo(pts, 0.16 * sc, 0.12 * sc, new THREE.Vector3(0, 1, 0), -0.06 * sc));
    void outward;
  }

  // diagonal hip rafter (sumigi) with a gilt end cap and a hanging wind bell (fūtaku)
  hipRafter(B, side) {
    const k = this.keys;
    const sc = this.o.scale;
    const pts = [];
    const iS = Math.min(this.ov + 0.4, this.iMax(side));
    for (let j = 0; j <= 10; j++) {
      const i = 0.02 + (iS - 0.02) * (j / 10);
      pts.push(this.point(side, this.halfLen(side, i), i, this.o.thick));
    }
    const w = 0.24 * sc, h = 0.3 * sc;
    B.push(k.hip, polyBeamGeo(pts, w, h, new THREE.Vector3(0, 1, 0), -h / 2));
    // gilt cap on the tip
    const tip = pts[0], dir = pts[1].clone().sub(pts[0]).normalize();
    const m = new THREE.Matrix4().lookAt(tip, pts[1], new THREE.Vector3(0, 1, 0));
    m.setPosition(tip.clone().addScaledVector(dir, 0.05).add(new THREE.Vector3(0, -h / 2, 0)));
    B.push(k.gold, boxGeo(w * 1.12, h * 1.12, 0.14 * sc), m);
    if (this.o.chimes) chime(B, tip.clone().add(new THREE.Vector3(0, -h - 0.02, 0)).addScaledVector(dir, 0.12), sc, k);
  }

  ridges(B) {
    const k = this.keys;
    const sc = this.o.scale;
    const rs = this.o.ridgeScale || sc;
    const type = this.o.type;
    // main ridge (ōmune)
    if (type === 'hip' || type === 'irimoya') {
      const hl = this.halfLen(0, this.iR) + 0.25;
      const y = this.baseY(this.iR);
      const pts = [];
      for (let q = 0; q <= 8; q++) pts.push(new THREE.Vector3(this.o.cx - hl + (2 * hl * q) / 8, y, this.o.cz));
      const w = 0.62 * rs, h = 0.95 * rs;
      B.push(k.ridge, polyBeamGeo(pts, w, h, new THREE.Vector3(0, 1, 0), h / 2 - 0.25 * rs));
      B.push(k.ridge, polyBeamGeo(pts, w * 1.35, 0.12 * rs, new THREE.Vector3(0, 1, 0), 0.05));
      B.push(k.ridge, polyBeamGeo(pts, w * 1.2, 0.1 * rs, new THREE.Vector3(0, 1, 0), 0.3 * rs));
      B.push(k.round, polyTubeGeo(pts.map((p) => p.clone().add(new THREE.Vector3(0, h - 0.25 * rs, 0))), w * 0.5, 10, 0.5));
      for (const sgn of [-1, 1]) {
        const end = new THREE.Vector3(this.o.cx + sgn * hl, y + h - 0.3 * rs, this.o.cz);
        if (this.o.ridgeEnd === 'shibi') shibi(B, k.gold, end, sgn, rs * 0.95);
        else oni(B, k.ornament, end, new THREE.Vector3(sgn, 0, 0), rs * 1.1);
      }
    }
    // hip ridges (sumimune / kudarimune on pyramids)
    const iEnd = type === 'irimoya' ? this.ig + this.o.setback * 0.6 : Math.min(this.iTop, this.iR) - 0.05;
    for (let s = 0; s < 4; s++) {
      const pts = [];
      const i0 = 0.15;
      for (let j = 0; j <= 14; j++) {
        const i = i0 + (iEnd - i0) * (j / 14);
        pts.push(this.point(s, this.halfLen(s, i), i, -0.02));
      }
      const w = 0.42 * rs, h = 0.5 * rs;
      B.push(k.ridge, polyBeamGeo(pts, w, h, new THREE.Vector3(0, 1, 0), h / 2 - 0.12 * rs));
      B.push(k.round, polyTubeGeo(pts.map((p) => p.clone().add(new THREE.Vector3(0, h - 0.14 * rs, 0))), w * 0.48, 8, 0.5));
      const dir = pts[0].clone().sub(pts[1]).setY(0).normalize();
      oni(B, k.ornament, pts[0].clone().add(new THREE.Vector3(0, h * 0.55, 0)), dir, rs * 0.62);
    }
    // descending ridges along the gable edges (irimoya)
    if (type === 'irimoya') {
      const hl = this.o.hx - this.ig - 0.4 * rs;
      for (const side of [0, 2]) for (const sgn of [-1, 1]) {
        const pts = [];
        for (let j = 0; j <= 12; j++) {
          const i = this.iR - (this.iR - this.ig - 0.2) * (j / 12);
          pts.push(this.point(side, sgn * hl, i, -0.02));
        }
        const w = 0.42 * rs, h = 0.55 * rs;
        B.push(k.ridge, polyBeamGeo(pts, w, h, new THREE.Vector3(0, 1, 0), h / 2 - 0.12 * rs));
        B.push(k.round, polyTubeGeo(pts.map((p) => p.clone().add(new THREE.Vector3(0, h - 0.14 * rs, 0))), w * 0.48, 8, 0.5));
        const last = pts[pts.length - 1], prev = pts[pts.length - 2];
        oni(B, k.ornament, last.clone().add(new THREE.Vector3(0, h * 0.5, 0)), last.clone().sub(prev).setY(0).normalize(), rs * 0.65);
      }
    }
  }

  // irimoya gable: plaster triangle in a vermilion frame, bargeboards, gilt gegyo
  gables(B) {
    const k = this.keys;
    const sc = this.o.scale;
    const ig = this.ig, iR = this.iR;
    const aw = this.o.hx - ig - this.o.setback;   // gable wall position along the ridge
    const aEdge = this.o.hx - ig;                 // roof edge (bargeboard)
    for (const sgn of [-1, 1]) {
      const X = this.o.cx + sgn * aw;
      // outline in (z, y)
      const shape = new THREE.Shape();
      const yb = this.baseY(ig + this.o.setback) + 0.02;
      const curve = [];
      for (let j = 0; j <= 16; j++) {
        const i = ig + this.o.setback + (iR - ig - this.o.setback) * (j / 16);
        const p = this.point(0, sgn * aw, i, this.o.thick + 0.08);
        curve.push([p.z - this.o.cz, p.y]);
      }
      shape.moveTo(curve[0][0], yb);
      for (const c of curve) shape.lineTo(c[0], c[1]);
      for (let j = curve.length - 2; j >= 0; j--) shape.lineTo(-curve[j][0], curve[j][1]);
      shape.lineTo(-curve[0][0], yb);
      shape.closePath();
      const g = new THREE.ShapeGeometry(shape);
      // ShapeGeometry lies in XY; map (x=z, y=y) onto the gable plane
      const pos = g.attributes.position;
      const uv = g.attributes.uv;
      for (let q = 0; q < pos.count; q++) {
        const zz = pos.getX(q), yy = pos.getY(q);
        pos.setXYZ(q, X, yy, this.o.cz + zz);
        uv.setXY(q, zz, yy);
      }
      g.computeVertexNormals();
      orientTo(g, new THREE.Vector3(sgn, 0, 0));
      B.push(k.gable, g);
      // frame: bottom beam, raking beams, posts (tsuka) and a lattice
      const zH = curve[0][0];
      B.box(k.gableFrame, 0.22 * sc, 0.32 * sc, zH * 2, X + sgn * 0.06, yb + 0.16 * sc, this.o.cz);
      const rake = curve.map(([z, y]) => new THREE.Vector3(X + sgn * 0.06, y - 0.1, this.o.cz + z));
      const rakeB = curve.map(([z, y]) => new THREE.Vector3(X + sgn * 0.06, y - 0.1, this.o.cz - z));
      B.push(k.gableFrame, polyBeamGeo(rake, 0.2 * sc, 0.24 * sc, new THREE.Vector3(1, 0, 0)));
      B.push(k.gableFrame, polyBeamGeo(rakeB, 0.2 * sc, 0.24 * sc, new THREE.Vector3(1, 0, 0)));
      const apexY = curve[curve.length - 1][1];
      for (const f of [-0.5, 0, 0.5]) {
        const z = f * zH;
        // height of the raking line at |z|
        let top = apexY;
        for (let j = 0; j < curve.length - 1; j++) {
          if (Math.abs(z) <= curve[j][0] && Math.abs(z) >= curve[j + 1][0]) {
            const t = (curve[j][0] - Math.abs(z)) / (curve[j][0] - curve[j + 1][0]);
            top = curve[j][1] + (curve[j + 1][1] - curve[j][1]) * t; break;
          }
        }
        const h = top - yb - 0.4;
        if (h > 0.3) B.box(k.gableFrame, 0.18 * sc, h, 0.2 * sc, X + sgn * 0.07, yb + 0.3 + h / 2, this.o.cz + z);
      }
      // bargeboard: continuous over the apex
      const barge = [];
      for (let j = 0; j <= 18; j++) barge.push(this.point(0, sgn * aEdge, ig + (iR - ig) * (j / 18), this.o.thick * 0.5));
      const bargeB = [];
      for (let j = 18; j >= 0; j--) bargeB.push(this.point(2, -sgn * aEdge, ig + (iR - ig) * (j / 18), this.o.thick * 0.5));
      const full = [...barge, ...bargeB.slice(1)];
      B.push(k.barge, polyBeamGeo(full, 0.16 * sc, 0.62 * sc, new THREE.Vector3(0, 1, 0), -0.2 * sc));
      // gilt edge strip along the bargeboard
      B.push(k.gold, polyBeamGeo(full.map((p) => p.clone().add(new THREE.Vector3(sgn * 0.09 * sc, 0, 0))), 0.03, 0.08 * sc, new THREE.Vector3(0, 1, 0), -0.48 * sc));
      // underside of the overhang between gable wall and bargeboard
      for (const side of [0, 2]) {
        const range = side === 0 ? (sgn > 0 ? [aw - 0.1, aEdge] : [-aEdge, -aw + 0.1]) : (sgn > 0 ? [-aEdge, -aw + 0.1] : [aw - 0.1, aEdge]);
        B.push(k.soffit, this.surface(side, ig, iR, this.o.thick, false, range));
      }
      // gegyo: hanging ornament under the apex
      const apex = this.point(0, sgn * aEdge, iR, this.o.thick * 0.5);
      gegyo(B, k.gold, k.barge, new THREE.Vector3(apex.x + sgn * 0.12 * sc, apex.y - 0.55 * sc, this.o.cz), sgn, sc);
    }
  }
}

// ------------------------------------------------------------ helpers
function finishSurface(pos, uv, idx, wantY) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  if (wantY !== 0) {
    const n = g.attributes.normal;
    let sum = 0;
    for (let i = 0; i < n.count; i++) sum += n.getY(i);
    if (sum * wantY < 0) flip(g);
  }
  return g;
}

function flip(g) {
  const ix = g.index.array;
  for (let t = 0; t < ix.length; t += 3) { const tmp = ix[t + 1]; ix[t + 1] = ix[t + 2]; ix[t + 2] = tmp; }
  g.index.needsUpdate = true;
  g.computeVertexNormals();
}

function orientTo(g, dir) {
  const n = g.attributes.normal;
  let sum = 0;
  for (let i = 0; i < n.count; i++) sum += n.getX(i) * dir.x + n.getY(i) * dir.y + n.getZ(i) * dir.z;
  if (sum < 0) flip(g);
}

function endMatrix(p0, p1, off) {
  const dir = p1.clone().sub(p0).normalize();
  const m = new THREE.Matrix4().lookAt(p0, p1, new THREE.Vector3(0, 1, 0));
  m.setPosition(p0.clone().addScaledVector(dir, off));
  return m;
}

// Onigawara: ridge-end tile with horns, facing `dir`.
export function oni(B, key, pos, dir, s = 1) {
  const sh = new THREE.Shape();
  sh.moveTo(-0.42, 0);
  sh.lineTo(-0.42, 0.55);
  sh.quadraticCurveTo(-0.6, 0.92, -0.36, 1.12);
  sh.quadraticCurveTo(-0.3, 0.88, 0, 0.9);
  sh.quadraticCurveTo(0.3, 0.88, 0.36, 1.12);
  sh.quadraticCurveTo(0.6, 0.92, 0.42, 0.55);
  sh.lineTo(0.42, 0);
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2, curveSegments: 6 });
  g.translate(0, -0.45, -0.1);
  const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), dir.clone().negate(), new THREE.Vector3(0, 1, 0));
  m.scale(new THREE.Vector3(s, s, s)).setPosition(pos);
  B.push(key, g, m);
  // tomoe boss on the face
  const boss = cylGeo(0.17, 0.2, 0.08, 14);
  const mb = m.clone().multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)).multiply(new THREE.Matrix4().makeTranslation(0, -0.16, -0.05));
  B.push(key, boss, mb);
}

// Shibi: the gilt fish-tail finials of ancient halls. `sgn` = which end of the ridge.
export function shibi(B, key, pos, sgn, s = 1) {
  const sh = new THREE.Shape();
  // side profile: a straight back, a fin of scales on the inner face, the tail curling in
  const pts = [[-0.3, 0], [-0.36, 0.5], [-0.36, 1.0], [-0.3, 1.38], [-0.16, 1.66], [0.06, 1.8], [0.2, 1.74], [0.12, 1.58], [0.1, 1.38], [0.2, 1.12], [0.34, 0.86], [0.5, 0.5], [0.62, 0.2], [0.66, 0]];
  sh.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]);
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 3, curveSegments: 8 });
  g.translate(0, 0, -0.15);
  // local x points inward (toward the roof centre)
  const m = mat(pos.x, pos.y - 0.1 * s, pos.z, sgn > 0 ? Math.PI : 0, 0, 0, s, s, s);
  B.push(key, g, m);
  // ribs on the fin
  for (let r = 0; r < 6; r++) {
    const y = 0.22 + r * 0.22;
    const gr = boxGeo(0.3 - r * 0.025, 0.035, 0.44);
    B.push(key, gr, m.clone().multiply(mat(0.32 - r * 0.045, y, 0, 0, 0, -0.55 + r * 0.06)));
  }
}

export function gegyo(B, gold, wood, pos, sgn, s) {
  const sh = new THREE.Shape();
  sh.moveTo(0, 0.25);
  sh.bezierCurveTo(0.35, 0.45, 0.65, 0.05, 0.42, -0.25);
  sh.bezierCurveTo(0.28, -0.42, 0.08, -0.38, 0, -0.62);
  sh.bezierCurveTo(-0.08, -0.38, -0.28, -0.42, -0.42, -0.25);
  sh.bezierCurveTo(-0.65, 0.05, -0.35, 0.45, 0, 0.25);
  const hole = new THREE.Path();
  hole.moveTo(0, 0.05);
  hole.bezierCurveTo(0.18, 0.15, 0.32, -0.05, 0.2, -0.2);
  hole.bezierCurveTo(0.12, -0.28, 0.04, -0.28, 0, -0.38);
  hole.bezierCurveTo(-0.04, -0.28, -0.12, -0.28, -0.2, -0.2);
  hole.bezierCurveTo(-0.32, -0.05, -0.18, 0.15, 0, 0.05);
  sh.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1 });
  const m = mat(pos.x, pos.y, pos.z, sgn * Math.PI / 2, 0, 0, s * 1.2, s * 1.2, s * 1.2);
  B.push(wood, g, m);
  B.push(gold, boxGeo(0.06, 0.12, 0.5), mat(pos.x + sgn * 0.05, pos.y + 0.18 * s, pos.z, 0, 0, 0, s, s, s));
}

// Fūtaku: bronze wind bell hanging from a hip rafter.
export function chime(B, top, s = 1, k = {}) {
  const key = k.chime || 'bronzeDark';
  B.push(key, cylGeo(0.012, 0.012, 0.32 * s, 4), mat(top.x, top.y - 0.16 * s, top.z));
  const bell = latheGeo([[0.001, 0], [0.05, 0.005], [0.085, 0.06], [0.095, 0.2], [0.11, 0.26], [0.001, 0.27]].map(([x, y]) => [x * s * 1.3, -y * s * 1.3]), 10);
  B.push(key, bell, mat(top.x, top.y - 0.3 * s, top.z));
  B.push(key, boxGeo(0.14 * s, 0.2 * s, 0.01), mat(top.x, top.y - 0.78 * s, top.z, Math.random() * TAU));
  B.push(key, cylGeo(0.006, 0.006, 0.28 * s, 3), mat(top.x, top.y - 0.55 * s, top.z));
  void clamp;
}
