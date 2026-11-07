// Sanmon: the two-storey vermilion gate (rōmon). Three bays wide with the passage in the
// centre, where a great red chōchin lantern hangs. The side bays hide the guardian kings
// behind vermilion lattice. Above: a railed balcony, an upper storey with studded doors
// and the mountain-name plaque, under a hip-and-gable roof.
import * as THREE from 'three';
import { mat, cylGeo, latheGeo } from '../lib/util.js';
import { Roof } from '../arch/roof.js';
import { storey } from '../arch/body.js';
import { kidan, stairs, railing, column } from '../arch/parts.js';

export function buildSanmon(B, cx, cz) {
  const info = { lights: [], anchors: {} };
  const X = [-6.4, -2.4, 2.4, 6.4];
  const Z = [-3.0, 3.0];
  const kH = 0.6;
  kidan(B, cx, 0, cz, 8.6, 4.6, kH);
  for (const dir of [1, -1]) stairs(B, mat(cx, 0, cz + dir * 6.0, dir > 0 ? 0 : Math.PI), 5.4, kH, 1.4, { cheeks: false });

  // lower storey
  const body = storey(B, {
    cx, cz, xs: X, zs: Z, y0: kH, h: 5.6, r: 0.36, steps: 2, s: 1.0, nageshi: 4.2, gilt: true,
    strutKind: 'kentozuka',
    bays: (side, b) => {
      if (side === 0 || side === 2) return b === 1 ? 'open' : 'latticeShu';
      return 'plaster';
    },
  });
  // middle row of columns carrying the doors, plus the inner side walls of the passage
  for (const x of X) column(B, 'shu', cx + x, kH, cz, 5.6, 0.36, { gilt: true });
  for (const sx of [-1, 1]) {
    B.box('plaster', 0.14, 4.2, 5.4, cx + sx * 2.4, kH + 2.1, cz);
    B.box('shu', 0.2, 0.3, 6.2, cx + sx * 2.4, kH + 4.3, cz);
    B.box('shadowVoid', 3.6, 5.2, 5.6, cx + sx * 4.4, kH + 2.6, cz);
    // the two great door leaves, swung open against the passage walls
    for (const sz of [-1, 1]) {
      B.box('door', 0.12, 4.4, 2.3, cx + sx * 2.2, kH + 2.2, cz + sz * 1.2);
    }
  }
  B.box('shu', 4.8, 0.36, 0.3, cx, kH + 5.3, cz);
  B.box('stoneDark', 4.4, 0.18, 0.4, cx, kH + 0.09, cz); // threshold
  // ceiling over the passage
  B.box('lacquer', 12.8, 0.1, 6.0, cx, body.colTop + 0.02, cz);
  for (let x = -6; x <= 6; x += 0.8) B.box('shu', 0.08, 0.1, 6.0, cx + x, body.colTop - 0.04, cz);

  // the great chōchin
  const ly = kH + 2.4;
  B.push('paper', latheGeo([
    [0.82, 0], [0.98, 0.25], [1.08, 0.7], [1.12, 1.25], [1.08, 1.8], [0.98, 2.25], [0.82, 2.5],
  ], 40), mat(cx, ly, cz));
  B.push('lacquer', cylGeo(0.86, 0.86, 0.22, 40), mat(cx, ly - 0.06, cz));
  B.push('lacquer', cylGeo(0.86, 0.86, 0.22, 40), mat(cx, ly + 2.56, cz));
  B.push('gold', cylGeo(0.88, 0.88, 0.04, 40), mat(cx, ly + 0.06, cz));
  B.push('gold', cylGeo(0.88, 0.88, 0.04, 40), mat(cx, ly + 2.44, cz));
  B.push('iron', cylGeo(0.03, 0.03, kH + 5.3 - (ly + 2.67), 6), mat(cx, (ly + 2.67 + kH + 5.3) / 2, cz));
  B.push('lacquer', cylGeo(0.2, 0.32, 0.2, 16), mat(cx, ly - 0.25, cz));
  info.lights.push({ pos: new THREE.Vector3(cx, ly + 1.25, cz), kind: 'chochin' });

  // lower roof: a hipped skirt that stops under the balcony
  const ov = 3.0;
  const upperX = 6.4, upperZ = 3.0, balcony = 0.95;
  const lower = new Roof({
    cx, cz, hx: 6.4 + ov, hz: 3.0 + ov, overhang: ov, type: 'hip', rise: 4.6, pow: 1.5,
    soffitAnchor: body.anchor(ov), topInset: ov - balcony + 0.05, lift: 0.65, liftReachK: 0.6, liftFadeK: 0.6,
    sweep: 0.35, thick: 0.3, hFly: 0.14, scale: 1, tileSpacing: 0.3, course: 0.26, tileR: 0.072, ridgeScale: 0.85,
  });
  lower.build(B);
  body.fill(lower.soffitY(ov));
  const iTop = ov - balcony + 0.05;
  const ry = lower.topY(iTop);
  const deckY = ry + 0.55;
  B.box('shu', (upperX + balcony) * 2 - 0.2, deckY - ry + 0.2, (upperZ + balcony) * 2 - 0.2, cx, (ry + deckY) / 2 - 0.1, cz);
  B.box('hinoki', (upperX + balcony) * 2 + 0.1, 0.1, (upperZ + balcony) * 2 + 0.1, cx, deckY, cz);
  B.box('shu', (upperX + balcony) * 2 + 0.2, 0.14, (upperZ + balcony) * 2 + 0.2, cx, deckY - 0.1, cz);
  const rx = upperX + balcony - 0.06, rz = upperZ + balcony - 0.06;
  railing(B, [
    new THREE.Vector3(cx - rx, deckY + 0.05, cz - rz), new THREE.Vector3(cx + rx, deckY + 0.05, cz - rz),
    new THREE.Vector3(cx + rx, deckY + 0.05, cz + rz), new THREE.Vector3(cx - rx, deckY + 0.05, cz + rz),
  ], 0.75, { closed: true, giboshi: true });

  // upper storey
  const up = storey(B, {
    cx, cz, xs: X, zs: Z, y0: deckY + 0.05, h: 3.8, r: 0.32, steps: 3, s: 0.95, nageshi: 2.7, base: false,
    strutKind: 'kentozuka',
    bays: (side, b) => {
      if (side === 0 || side === 2) return b === 1 ? 'door' : 'renji';
      return 'plaster';
    },
  });
  // plaque: the mountain name, read top to bottom
  B.box('lacquer', 1.25, 2.3, 0.16, cx, up.colTop - 0.4, cz + 3.0 + 0.5, 0, -0.08);
  B.push('plaqueSanmon', new THREE.PlaneGeometry(1.15, 2.2), mat(cx, up.colTop - 0.4, cz + 3.0 + 0.59, 0, -0.08));
  B.push('plaqueSanmon', new THREE.PlaneGeometry(1.15, 2.2), mat(cx, up.colTop - 0.4, cz - 3.0 - 0.59, Math.PI, -0.08));
  B.box('lacquer', 1.25, 2.3, 0.16, cx, up.colTop - 0.4, cz - 3.0 - 0.5, Math.PI, -0.08);

  const ov2 = 3.2;
  const roof = new Roof({
    cx, cz, hx: 6.4 + ov2, hz: 3.0 + ov2, overhang: ov2, type: 'irimoya', rise: 5.6, gableT: 0.4, pow: 1.5,
    soffitAnchor: up.anchor(ov2), lift: 0.8, liftReachK: 0.55, liftFadeK: 0.5, sweep: 0.35, thick: 0.34, hFly: 0.15,
    scale: 1.0, tileSpacing: 0.31, course: 0.27, tileR: 0.075, ridgeScale: 1.1, setback: 0.7, ceiling: 'lacquer',
  });
  roof.build(B);
  up.fill(roof.soffitY(ov2));
  info.anchors.sanmon = new THREE.Vector3(cx, roof.topY(roof.iR) + 1.2, cz);
  info.height = roof.topY(roof.iR);
  return info;
}
