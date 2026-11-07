// Hondō: the main hall. Seven bays by five, raised on a granite platform with a
// timber floor and a railed veranda. The hip-and-gable roof carries gilt shibi on its
// ridge. A karahafu step-canopy shelters the front stair. The three central bays stand
// open on the dim interior: a gilt seated Buddha on a lotus throne with a flame halo,
// a hanging canopy, candles, and lotus vases.
import * as THREE from 'three';
import { mat, cylGeo, latheGeo, boxGeo, polyBeamGeo, polyTubeGeo, smoothstep, TAU } from '../lib/util.js';
import { Roof, gegyo } from '../arch/roof.js';
import { storey } from '../arch/body.js';
import { kidan, stairs, railing, hangingLantern, kaerumata, column } from '../arch/parts.js';

export function buildHondo(B, cx, cz) {
  const info = { lights: [], anchors: {} };
  const X = [-10.8, -7.8, -4.8, -1.8, 1.8, 4.8, 7.8, 10.8];
  const Z = [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5];
  const kH = 0.9, floorY = 2.0;

  kidan(B, cx, 0, cz, 15, 12, kH);
  // stone steps up to the platform
  stairs(B, mat(cx, 0, cz + 14.3, 0), 6.2, kH, 2.3, { cheeks: true, cheekW: 0.4 });

  // under-floor posts and the dark crawl space
  B.box('shadowVoid', 21, floorY - kH - 0.1, 14.6, cx, (kH + floorY) / 2 - 0.05, cz);
  for (const x of [-12.4, ...X, 12.4]) for (const z of [-9.1, ...Z, 9.1]) {
    if (Math.abs(x) < 12 && Math.abs(z) < 9 && !(Math.abs(x) > 10 || Math.abs(z) > 7)) continue;
    B.push('woodDark', cylGeo(0.17, 0.17, floorY - kH, 10), mat(cx + x, (kH + floorY) / 2, cz + z));
    B.push('stoneDark', cylGeo(0.26, 0.3, 0.12, 10), mat(cx + x, kH + 0.06, cz + z));
  }
  // floor + veranda (engawa), edge beams
  B.box('hinoki', 25.2, 0.16, 18.6, cx, floorY - 0.08, cz);
  B.box('woodDark', 25.4, 0.26, 0.2, cx, floorY - 0.25, cz + 9.3);
  B.box('woodDark', 25.4, 0.26, 0.2, cx, floorY - 0.25, cz - 9.3);
  B.box('woodDark', 0.2, 0.26, 18.8, cx + 12.6, floorY - 0.25, cz);
  B.box('woodDark', 0.2, 0.26, 18.8, cx - 12.6, floorY - 0.25, cz);
  const rail = (pts) => railing(B, pts.map(([x, z]) => new THREE.Vector3(cx + x, floorY, cz + z)), 0.82, { giboshi: true, keys: { wood: 'woodDark', top: 'woodDark', gib: 'gold' } });
  rail([[-2.5, 9.1], [-12.4, 9.1], [-12.4, -9.1], [12.4, -9.1], [12.4, 9.1], [2.5, 9.1]]);

  // front wooden stair, with its own handrails
  stairs(B, mat(cx, kH, cz + 11.5, 0), 4.6, floorY - kH, 2.2, { keys: { tread: 'hinoki', side: 'woodDark' }, cheeks: true, cheekW: 0.16 });
  for (const sx of [-1, 1]) {
    railing(B, [new THREE.Vector3(cx + sx * 2.42, kH + 0.15, cz + 11.5), new THREE.Vector3(cx + sx * 2.42, floorY, cz + 9.3)], 0.82,
      { giboshi: true, keys: { wood: 'woodDark', top: 'woodDark', gib: 'gold' } });
  }

  // ------------------------------------------------ the hall body
  const body = storey(B, {
    cx, cz, xs: X, zs: Z, y0: floorY, h: 5.0, r: 0.34, colKey: 'woodDark', beamKey: 'woodDark',
    steps: 2, s: 1.1, nageshi: 3.1, strutKind: 'kaerumata', base: false,
    bracketKeys: { wood: 'woodDark', end: 'whiteEnd' }, renjiKeys: { frame: 'woodDark', slat: 'green' },
    inner: [[-4.8, -1.5], [4.8, -1.5], [-4.8, -4.5], [4.8, -4.5]],
    bays: (side, b) => {
      if (side === 0) return b >= 2 && b <= 4 ? 'open' : b === 1 || b === 5 ? 'lattice' : 'renji';
      if (side === 2) return b === 3 ? 'lattice' : 'plaster';
      return b >= 1 && b <= 3 ? 'shoji' : 'plaster';
    },
  });

  // gilt fittings on the column heads of the front
  for (const x of X) B.box('gold', 0.74, 0.08, 0.74, cx + x, body.colTop - 0.38, cz + 7.5);

  // ------------------------------------------------ roof
  const ov = 3.5;
  const roof = new Roof({
    cx, cz, hx: 10.8 + ov, hz: 7.5 + ov, overhang: ov, type: 'irimoya', rise: 8.8, gableT: 0.42, pow: 1.5,
    soffitAnchor: body.anchor(ov), lift: 0.95, liftReachK: 0.42, liftFadeK: 0.45, sweep: 0.35,
    thick: 0.42, hFly: 0.18, scale: 1.2, tileSpacing: 0.34, course: 0.3, tileR: 0.085, ridgeScale: 1.45,
    ridgeEnd: 'shibi', setback: 0.9, ceiling: 'interior',
    keys: { soffit: 'woodDark', fascia: 'woodDark', rafter: 'woodDark', rafterEnd: 'whiteEnd', hip: 'woodDark', gableFrame: 'woodDark', barge: 'woodDark', gable: 'plaster' },
  });
  roof.build(B);
  body.fill(roof.soffitY(ov));
  info.roof = roof;
  info.anchors.hondo = new THREE.Vector3(cx, roof.topY(roof.iR) + 1, cz);

  // ------------------------------------------------ interior
  const iz = cz - 3.6;
  B.box('interior', 21.4, 0.05, 14.8, cx, floorY + 0.03, cz);
  // coffered ceiling grid under the roof ceiling
  for (let x = -10; x <= 10; x += 1.25) B.box('woodDark', 0.08, 0.12, 14.8, cx + x, body.soffit - 0.06, cz);
  for (let z = -7; z <= 7; z += 1.25) B.box('woodDark', 21.4, 0.12, 0.08, cx, body.soffit - 0.06, cz + z);
  B.box('lacquer', 21.4, 0.06, 14.8, cx, body.soffit + 0.02, cz);
  // shumidan dais
  B.box('lacquer', 7.2, 0.25, 4.2, cx, floorY + 0.12, iz);
  B.box('lacquer', 6.6, 0.75, 3.6, cx, floorY + 0.62, iz);
  B.box('gold', 6.7, 0.07, 3.7, cx, floorY + 0.33, iz);
  B.box('gold', 7.0, 0.08, 4.0, cx, floorY + 1.02, iz);
  B.box('lacquer', 6.9, 0.12, 3.9, cx, floorY + 1.1, iz);
  const dy = floorY + 1.16;
  buddha(B, cx, dy, iz);
  // tengai canopy
  const cy = body.colTop + 0.4;
  B.push('gold', cylGeo(1.9, 1.9, 0.18, 6), mat(cx, cy, iz + 0.2));
  B.push('gold', cylGeo(1.6, 1.9, 0.35, 6, true), mat(cx, cy - 0.25, iz + 0.2));
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * TAU;
    B.push('gold', cylGeo(0.018, 0.018, 1.1, 4), mat(cx + Math.cos(a) * 1.75, cy - 0.85, iz + 0.2 + Math.sin(a) * 1.75));
    B.push('gold', latheGeo([[0.001, 0], [0.05, -0.04], [0.001, -0.12]], 6), mat(cx + Math.cos(a) * 1.75, cy - 1.4, iz + 0.2 + Math.sin(a) * 1.75));
  }
  // candle stands and gilt lotus vases on the dais front
  for (const sx of [-1, 1]) {
    const x = cx + sx * 2.6, z = iz + 1.5;
    B.push('bronzeDark', latheGeo([[0.001, 0], [0.22, 0], [0.22, 0.05], [0.05, 0.1], [0.04, 1.0], [0.16, 1.02], [0.16, 1.06], [0.001, 1.06]], 12), mat(x, dy, z));
    B.push('candle', cylGeo(0.04, 0.04, 0.3, 8), mat(x, dy + 1.21, z));
    B.push('candle', latheGeo([[0.001, 0], [0.025, 0.03], [0.001, 0.1]], 8), mat(x, dy + 1.37, z));
    lotusVase(B, cx + sx * 1.6, dy, iz + 1.55);
    info.lights.push({ pos: new THREE.Vector3(x, dy + 1.5, z), kind: 'candle' });
  }
  info.lights.push({ pos: new THREE.Vector3(cx, floorY + 3.2, cz + 2.5), kind: 'interior' });

  // ------------------------------------------------ front details
  // plaque (gaku) under the eave
  B.box('lacquer', 3.6, 1.25, 0.16, cx, body.colTop + 0.85, cz + 7.5 + 0.45, 0, -0.14);
  const pg = new THREE.PlaneGeometry(3.4, 1.12);
  B.push('plaqueHondo', pg, mat(cx, body.colTop + 0.85, cz + 7.5 + 0.54 + 0.012, 0, -0.14));
  // hanging bronze lanterns
  for (const x of [-9.3, -6.3, 6.3, 9.3]) {
    B.with(mat(cx + x, body.colTop - 0.1, cz + 8.7), () => hangingLantern(B, 1.05));
    info.lights.push({ pos: new THREE.Vector3(cx + x, body.colTop - 1.2, cz + 8.7), kind: 'lantern' });
  }
  // waniguchi gong with its striking rope
  B.push('bronzeDark', latheGeo([[0.001, 0.12], [0.45, 0.1], [0.62, 0.02], [0.62, -0.02], [0.45, -0.1], [0.001, -0.12]], 24), mat(cx, body.colTop - 0.9, cz + 8.95, 0, Math.PI / 2));
  B.push('iron', cylGeo(0.02, 0.02, 0.8, 4), mat(cx, body.colTop - 0.25, cz + 8.95));
  const ropePts = [];
  for (let i = 0; i <= 12; i++) ropePts.push(new THREE.Vector3(cx + Math.sin(i * 0.5) * 0.02, body.colTop - 0.95 - i * 0.28, cz + 9.12));
  B.push('ropeRed', polyTubeGeo(ropePts, 0.05, 6));
  B.push('rope', polyTubeGeo(ropePts.map((p) => p.clone().add(new THREE.Vector3(0.06, 0, 0))), 0.035, 5));
  // offering box (saisen-bako)
  B.box('woodDark', 2.6, 0.85, 0.9, cx, floorY + 0.43, cz + 8.3);
  for (let i = 0; i < 11; i++) B.box('woodDark', 0.07, 0.07, 0.86, cx - 1.2 + i * 0.24, floorY + 0.9, cz + 8.3, 0, 0, Math.PI / 4);
  B.box('gold', 2.62, 0.08, 0.92, cx, floorY + 0.12, cz + 8.3);
  B.box('gold', 0.5, 0.5, 0.02, cx, floorY + 0.45, cz + 8.76);

  // ------------------------------------------------ karahafu step canopy (kōhai)
  karahafu(B, { cx, z0: cz + 8.5, z1: cz + 12.4, W: 3.7, yBase: 6.45, H: 1.3, F: 0.28, colX: 2.75, colZ: cz + 11.3, colY: kH });
  return info;
}

// Seated Buddha on a lotus throne with a flame-edged mandorla.
function buddha(B, x, y, z) {
  const K = 'giltStatue';
  // octagonal base tiers
  B.push(K, cylGeo(1.15, 1.25, 0.25, 8), mat(x, y + 0.12, z));
  B.push(K, cylGeo(0.95, 1.05, 0.25, 8), mat(x, y + 0.37, z));
  B.push(K, cylGeo(0.7, 0.8, 0.25, 16), mat(x, y + 0.62, z));
  // lotus: three rings of petals
  let ly = y + 0.75;
  for (let ring = 0; ring < 3; ring++) {
    const n = 14 + ring * 2, R = 0.85 + ring * 0.1;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + ring * 0.2;
      const g = latheGeo([[0.001, 0], [0.12, 0.06], [0.16, 0.25], [0.1, 0.4], [0.001, 0.46]], 6);
      g.scale(1, 1, 0.35);
      B.push(K, g, mat(x + Math.cos(a) * R * 0.8, ly + ring * 0.13, z + Math.sin(a) * R * 0.8, -a + Math.PI / 2, 0, 0.75 - ring * 0.12));
    }
  }
  B.push(K, cylGeo(1.05, 0.95, 0.3, 24), mat(x, ly + 0.4, z));
  const sy = ly + 0.55; // seat
  const ell = (rx, ry, rz, px, py, pz) => {
    const g = new THREE.SphereGeometry(1, 24, 16);
    g.scale(rx, ry, rz);
    B.push(K, g, mat(x + px, sy + py, z + pz));
  };
  ell(1.0, 0.32, 0.72, 0, 0.25, 0.1);       // crossed legs
  ell(0.38, 0.2, 0.3, 0, 0.42, 0.45);       // hands in dhyāna mudrā
  ell(0.62, 0.78, 0.45, 0, 1.05, 0);        // torso
  ell(0.75, 0.3, 0.42, 0, 1.5, -0.02);      // shoulders
  ell(0.16, 0.18, 0.16, 0, 1.85, 0);        // neck
  ell(0.34, 0.4, 0.34, 0, 2.18, 0.02);      // head
  ell(0.2, 0.17, 0.2, 0, 2.55, 0);          // ushnisha
  ell(0.06, 0.16, 0.05, -0.33, 2.12, 0);    // long ears
  ell(0.06, 0.16, 0.05, 0.33, 2.12, 0);
  // robe drape over the knees
  ell(1.04, 0.12, 0.6, 0, 0.42, 0.2);
  // mandorla: flame-edged body halo plus head halo
  const sh = new THREE.Shape();
  const N = 64;
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * TAU;
    const flame = 1 + 0.07 * Math.sin(t * 13) + 0.04 * Math.sin(t * 29);
    const px = Math.sin(t) * 1.55 * flame;
    let py = (1 - Math.cos(t)) * 1.75 * flame;
    py = Math.min(py, 3.6 + Math.cos(t) * 0.2);
    if (i === 0) sh.moveTo(px, py); else sh.lineTo(px, py);
  }
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: false });
  B.push(K, g, mat(x, sy - 0.2, z - 0.75));
  B.push(K, cylGeo(0.62, 0.62, 0.05, 40), mat(x, sy + 2.2, z - 0.62, 0, Math.PI / 2));
  B.push('lacquer', cylGeo(0.48, 0.48, 0.05, 40), mat(x, sy + 2.2, z - 0.6, 0, Math.PI / 2));
  void smoothstep;
}

function lotusVase(B, x, y, z) {
  B.push('bronzeDark', latheGeo([[0.001, 0], [0.18, 0], [0.12, 0.15], [0.2, 0.45], [0.09, 0.6], [0.12, 0.66], [0.001, 0.66]], 12), mat(x, y, z));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    const top = new THREE.Vector3(x + Math.cos(a) * 0.25, y + 1.3 + i * 0.08, z + Math.sin(a) * 0.25);
    B.push('gold', polyTubeGeo([new THREE.Vector3(x, y + 0.6, z), top], 0.015, 4));
    B.push('gold', latheGeo([[0.001, 0], [0.12, 0.05], [0.14, 0.16], [0.06, 0.24], [0.001, 0.2]], 8), mat(top.x, top.y, top.z));
  }
}

// Karahafu: the cusped "Chinese" gable (actually a Japanese invention). Bell-shaped in
// front view: convex at the crown, then concave, flicking up at the ends.
export function karahafu(B, o) {
  const { cx, z0, z1, W, yBase, H, F } = o;
  const thick = 0.32;
  const prof = (t) => {
    const u = Math.abs(t);
    const hump = 0.5 * (1 + Math.cos(Math.PI * Math.min(u / 0.82, 1)));
    const flare = Math.pow(smoothstep(0.6, 1.0, u), 2) * F;
    return yBase + H * hump + flare;
  };
  const nx = 48, nz = 10;
  const make = (under) => {
    const pos = [], uv = [], idx = [];
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
      const t = -1 + (2 * i) / nx;
      const x = cx + t * W, z = z0 + (z1 - z0) * (j / nz);
      pos.push(x, prof(t) - (under ? thick : 0), z);
      uv.push((t * W + W) / 0.68, (z - z0) / 1.2);
    }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    let sy = 0; const n = g.attributes.normal;
    for (let i = 0; i < n.count; i++) sy += n.getY(i);
    if ((sy > 0) === under) { const ix = g.index.array; for (let t = 0; t < ix.length; t += 3) { const tmp = ix[t + 1]; ix[t + 1] = ix[t + 2]; ix[t + 2] = tmp; } g.computeVertexNormals(); }
    return g;
  };
  B.push('tile', make(false));
  B.push('woodDark', make(true));
  // round tiles running down both slopes
  for (let z = z0 + 0.2; z < z1 - 0.1; z += 0.32) {
    for (const side of [-1, 1]) {
      const pts = [], ups = [];
      for (let i = 0; i <= 20; i++) {
        const t = side * (0.04 + 0.96 * (i / 20));
        const y = prof(t);
        const dy = (prof(t + 0.01) - prof(t - 0.01)) / (0.02 * W);
        const n = new THREE.Vector3(-dy, 1, 0).normalize();
        pts.push(new THREE.Vector3(cx + t * W, y, z).addScaledVector(n, 0.03));
        ups.push(n);
      }
      B.push('tileRound', polyTubeGeo(pts, 0.075, 4, 0.5, ups));
    }
  }
  // crest cap along the crown
  B.push('ridge', polyTubeGeo([new THREE.Vector3(cx, prof(0) + 0.08, z0), new THREE.Vector3(cx, prof(0) + 0.08, z1 + 0.05)], 0.16, 10, 0.5));
  // front bargeboard following the curve, gilt strip and fittings
  const front = [];
  for (let i = 0; i <= 60; i++) { const t = -1 + (2 * i) / 60; front.push(new THREE.Vector3(cx + t * W, prof(t) - 0.12, z1 + 0.04)); }
  B.push('woodDark', polyBeamGeo(front, 0.2, 0.62, new THREE.Vector3(0, 0, 1), -0.2));
  B.push('gold', polyBeamGeo(front.map((p) => p.clone().add(new THREE.Vector3(0, 0, 0.11))), 0.025, 0.08, new THREE.Vector3(0, 0, 1), -0.44));
  B.box('gold', 0.42, 0.42, 0.06, cx, prof(0) - 0.32, z1 + 0.16);
  for (const sx of [-1, 1]) B.box('gold', 0.2, 0.4, 0.24, cx + sx * W, prof(sx) - 0.3, z1 + 0.04);
  gegyo(B, 'gold', 'woodDark', new THREE.Vector3(cx, prof(0) - 0.85, z1 + 0.12), 0, 0.62);
  // columns, rainbow beam (kōryō) and a frog-leg strut under the crown
  const colTop = yBase - 0.55;
  for (const sx of [-1, 1]) {
    column(B, 'woodDark', cx + sx * o.colX, o.colY, o.colZ, colTop - o.colY, 0.26, { baseKey: 'stone' });
    // tie back to the hall
    B.box('woodDark', 0.22, 0.34, (o.colZ - z0) + 0.4, cx + sx * o.colX, colTop - 0.2, (o.colZ + z0) / 2);
    B.box('woodDark', 0.62, 0.22, 0.62, cx + sx * o.colX, colTop + 0.11, o.colZ);
  }
  const beamPts = [];
  for (let i = 0; i <= 16; i++) { const t = -1 + i / 8; beamPts.push(new THREE.Vector3(cx + t * (o.colX + 0.5), colTop - 0.25 + 0.12 * (1 - t * t), o.colZ)); }
  B.push('woodDark', polyBeamGeo(beamPts, 0.3, 0.42, new THREE.Vector3(0, 1, 0)));
  kaerumata(B, 'woodDark', cx, colTop + 0.02, o.colZ, 0, 1.6, prof(0) - thick - colTop - 0.05);
  void boxGeo;
}
