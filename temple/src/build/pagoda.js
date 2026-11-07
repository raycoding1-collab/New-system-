// Gojū-no-tō: five-storey pagoda. Each storey narrows (the top storey is about two
// thirds the width of the first), every roof carries three-stepped mitesaki brackets and
// the deep eaves of the type, and the bronze sōrin spire rises from the top: dew basin,
// inverted bowl, lotus, nine rings, water-flame, dragon car and jewel, with chains and
// bells running down to the corners of the top roof.
import * as THREE from 'three';
import { mat, cylGeo, latheGeo, boxGeo, polyTubeGeo, TAU } from '../lib/util.js';
import { Roof, chime } from '../arch/roof.js';
import { storey } from '../arch/body.js';
import { kidan, stairs, railing } from '../arch/parts.js';

export function buildPagoda(B, cx, cz) {
  const info = { anchors: {} };
  const baseH = 1.3;
  kidan(B, cx, 0, cz, 5.8, 5.8, baseH);
  for (let side = 0; side < 4; side++) {
    const ry = [0, Math.PI / 2, Math.PI, -Math.PI / 2][side];
    const d = 5.8 + 1.9;
    const px = cx + Math.sin(ry) * d, pz = cz + Math.cos(ry) * d;
    stairs(B, mat(px, 0, pz, ry), 2.6, baseH, 1.9, { cheeks: true, cheekW: 0.35 });
  }
  let y = baseH;
  const N = 5;
  let topRoof = null;
  for (let k = 0; k < N; k++) {
    const w = 3.3 - 0.27 * k;
    const third = w / 3;
    const xs = [-w, -third, third, w];
    const s = 0.8 - 0.03 * k;
    const h = k === 0 ? 3.4 : 2.15;
    const body = storey(B, {
      cx, cz, xs, zs: xs, y0: y, h, r: 0.24 - 0.012 * k, steps: 3, s, nageshi: k === 0 ? 2.5 : 1.6,
      base: k === 0, gilt: k === 0, strutKind: 'kentozuka',
      bays: (side, b) => (b === 1 ? 'door' : k === 0 ? 'renji' : 'plaster'),
    });
    // floor deck of the storey
    B.box('hinoki', w * 2 + 0.6, 0.12, w * 2 + 0.6, cx, y + 0.02, cz);
    // central pillar visible through gaps (shinbashira) is hidden; interior is closed
    B.box('interior', w * 2 - 0.3, h - 0.2, w * 2 - 0.3, cx, y + h / 2, cz);

    const ov = 2.95 - 0.09 * k;
    const E = w + ov;
    const nextW = 3.3 - 0.27 * (k + 1);
    const balcony = nextW + 0.5;
    const roof = new Roof({
      cx, cz, hx: E, hz: E, overhang: ov, type: 'pyramid', rise: E * 0.6, pow: 1.6,
      soffitAnchor: body.anchor(ov), topInset: k < N - 1 ? E - balcony + 0.05 : undefined,
      lift: 0.62 - 0.03 * k, liftReachK: 0.45, liftFadeK: 0.55, sweep: 0.4, thick: 0.26, hFly: 0.12,
      scale: s, tileSpacing: 0.27, course: 0.24, tileR: 0.062, ridgeScale: 0.62,
    });
    roof.build(B);
    body.fill(roof.soffitY(ov));
    if (k < N - 1) {
      // koshigumi: the bracketed skirt carrying the next storey's balcony
      const iTop = E - balcony + 0.05;
      const ry = roof.topY(iTop);
      const deckY = ry + 0.42;
      B.box('shu', balcony * 2 - 0.2, deckY - ry + 0.15, balcony * 2 - 0.2, cx, (ry + deckY) / 2 - 0.05, cz);
      // ochre-tipped bracket ends peeking out under the balcony
      for (const a of [-1, -0.33, 0.33, 1]) {
        for (const sd of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const px = sd[0] !== 0 ? sd[0] * (balcony - 0.08) : a * (balcony - 0.3);
          const pz = sd[1] !== 0 ? sd[1] * (balcony - 0.08) : a * (balcony - 0.3);
          B.box('ochre', 0.14, 0.14, 0.14, cx + px, deckY - 0.18, cz + pz);
        }
      }
      B.box('hinoki', balcony * 2 + 0.1, 0.09, balcony * 2 + 0.1, cx, deckY, cz);
      B.box('shu', balcony * 2 + 0.16, 0.12, balcony * 2 + 0.16, cx, deckY - 0.08, cz);
      const r = balcony - 0.05;
      railing(B, [
        new THREE.Vector3(cx - r, deckY + 0.04, cz - r), new THREE.Vector3(cx + r, deckY + 0.04, cz - r),
        new THREE.Vector3(cx + r, deckY + 0.04, cz + r), new THREE.Vector3(cx - r, deckY + 0.04, cz + r),
      ], 0.62, { closed: true, giboshi: true, gibScale: 0.75 });
      y = deckY + 0.05;
    } else {
      topRoof = roof;
    }
  }

  // ------------------------------------------------ sōrin (spire)
  const apexY = topRoof.topY(topRoof.iR);
  const top = new THREE.Vector3(cx, apexY, cz);
  info.height = sorin(B, top);
  info.anchors.pagoda = new THREE.Vector3(cx, apexY * 0.55, cz);
  info.top = top;
  // chains from the water-flame down to the top roof's corners, with little bells
  const chainTop = new THREE.Vector3(cx, apexY + 6.4, cz);
  for (let i = 0; i < 4; i++) {
    const corner = topRoof.point(i, topRoof.halfLen(i, 0.6), 0.6, -0.15);
    const pts = [];
    for (let k = 0; k <= 24; k++) {
      const t = k / 24;
      const p = chainTop.clone().lerp(corner, t);
      p.y -= Math.sin(t * Math.PI) * 1.1; // catenary sag
      pts.push(p);
    }
    B.push('bronzeDark', polyTubeGeo(pts, 0.03, 4));
    for (let k = 1; k <= 3; k++) {
      const p = pts[k * 6];
      chime(B, p.clone(), 0.55, { chime: 'gold' });
    }
  }
  return info;
}

function sorin(B, base) {
  const { x, z } = base;
  let y = base.y - 0.25;
  // roban: dew basin
  B.box('bronzeDark', 1.7, 0.35, 1.7, x, y + 0.175, z); y += 0.35;
  B.box('bronzeDark', 1.45, 0.42, 1.45, x, y + 0.21, z); y += 0.42;
  B.box('gold', 1.55, 0.06, 1.55, x, y, z);
  // fukubachi: inverted bowl
  B.push('bronzeDark', latheGeo([[0.001, 0.62], [0.3, 0.6], [0.52, 0.45], [0.66, 0.2], [0.7, 0], [0.001, 0]], 24), mat(x, y, z)); y += 0.62;
  // ukebana: lotus flower bowl
  const petals = 12;
  B.push('gold', cylGeo(0.2, 0.25, 0.2, 12), mat(x, y + 0.1, z)); y += 0.18;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * TAU;
    const g = latheGeo([[0.001, 0], [0.1, 0.05], [0.13, 0.25], [0.08, 0.42], [0.001, 0.5]], 6);
    g.scale(1, 1, 0.4);
    B.push('gold', g, mat(x + Math.cos(a) * 0.32, y, z + Math.sin(a) * 0.32, -a + Math.PI / 2, 0, 0.55));
  }
  y += 0.35;
  // the mast (shinbashira top) and nine rings (kurin)
  const ringsStart = y;
  B.push('bronzeDark', cylGeo(0.1, 0.13, 7.6, 12), mat(x, y + 3.8, z));
  for (let i = 0; i < 9; i++) {
    const ry = ringsStart + 0.35 + i * 0.47;
    const R = 0.62 - i * 0.022;
    B.push('gold', cylGeo(R, R, 0.1, 28), mat(x, ry, z));
    B.push('gold', cylGeo(R * 0.92, R * 0.95, 0.16, 28), mat(x, ry - 0.11, z));
    // tiny bells on alternate rings
    if (i % 2 === 0) for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + Math.PI / 4;
      B.push('gold', latheGeo([[0.001, 0], [0.03, -0.01], [0.05, -0.08], [0.001, -0.09]], 6), mat(x + Math.cos(a) * R, ry - 0.06, z + Math.sin(a) * R));
    }
  }
  y = ringsStart + 0.35 + 9 * 0.47;
  // suien: four openwork water-flame plates
  const flame = new THREE.Shape();
  flame.moveTo(0, 0);
  flame.bezierCurveTo(0.55, 0.15, 0.62, 0.55, 0.4, 0.85);
  flame.bezierCurveTo(0.62, 0.95, 0.5, 1.25, 0.2, 1.45);
  flame.bezierCurveTo(0.35, 1.25, 0.18, 1.1, 0.05, 1.25);
  flame.bezierCurveTo(0.05, 1.45, 0, 1.6, 0, 1.75);
  flame.lineTo(0, 0);
  const holes = [[0.25, 0.4, 0.09], [0.32, 0.8, 0.07], [0.2, 1.15, 0.05]];
  for (const [hx, hy, hr] of holes) { const p = new THREE.Path(); p.absellipse(hx, hy, hr, hr * 1.4, 0, TAU); flame.holes.push(p); }
  const fg = new THREE.ExtrudeGeometry(flame, { depth: 0.04, bevelEnabled: false, curveSegments: 8 });
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    B.push('gold', fg.clone(), mat(x, y, z, a));
    const f2 = fg.clone(); f2.scale(-1, 1, 1);
    B.push('gold', f2, mat(x, y, z, a));
  }
  y += 1.75;
  // ryūsha and hōju: dragon car and the sacred jewel
  B.push('gold', latheGeo([[0.001, 0], [0.12, 0.02], [0.2, 0.14], [0.12, 0.27], [0.06, 0.3], [0.001, 0.3]], 16), mat(x, y - 0.1, z));
  y += 0.2;
  B.push('gold', latheGeo([[0.001, 0], [0.12, 0.03], [0.2, 0.15], [0.19, 0.28], [0.1, 0.42], [0.03, 0.52], [0.001, 0.56]], 16), mat(x, y, z));
  y += 0.56;
  void boxGeo;
  return y;
}
