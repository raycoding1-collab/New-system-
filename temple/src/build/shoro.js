// Shōrō: the open bell pavilion. Four columns on a tall granite base, a copper
// hip-and-gable roof gone green, and the great bonshō, a bronze bell with its rows of
// nipples, crossing bands, lotus striking seats and dragon loop. The log striker hangs
// from ropes beside it and can be swung (the viewer animates it and synthesises the sound).
import * as THREE from 'three';
import { mat, cylGeo, latheGeo, polyTubeGeo, TAU } from '../lib/util.js';
import { Roof } from '../arch/roof.js';
import { storey } from '../arch/body.js';
import { kidan, stairs } from '../arch/parts.js';

export function buildShoro(B, cx, cz, P) {
  const info = { lights: [], anchors: {} };
  const kH = 1.5;
  kidan(B, cx, 0, cz, 3.7, 3.7, kH);
  stairs(B, mat(cx, 0, cz + 5.6, 0), 2.2, kH, 1.9, { cheeks: true, cheekW: 0.3 });
  B.box('stone', 7.0, 0.04, 7.0, cx, kH + 0.02, cz);
  const w = 2.6;
  const body = storey(B, {
    cx, cz, xs: [-w, w], zs: [-w, w], y0: kH, h: 4.4, r: 0.27, steps: 1, s: 0.9, nageshi: 3.0,
    strutKind: 'kaerumata', bays: () => 'none', kokabe: false, gilt: true,
  });
  // low tie beams near the floor on three sides, leave the front open
  for (const [x0, z0, x1, z1] of [[-w, -w, w, -w], [-w, -w, -w, w], [w, -w, w, w]]) {
    B.span('shu', new THREE.Vector3(cx + x0, kH + 0.55, cz + z0), new THREE.Vector3(cx + x1, kH + 0.55, cz + z1), 0.16, 0.24);
  }
  // bell beam (along z) and the striker beam (along x)
  const beamY = body.colTop - 0.25;
  B.box('shu', 0.42, 0.5, w * 2 + 0.6, cx, beamY, cz);
  B.box('shu', w + 0.2, 0.3, 0.3, cx + w / 2, beamY - 0.4, cz);
  B.push('iron', cylGeo(0.06, 0.06, 0.4, 8), mat(cx, beamY - 0.42, cz));

  const ov = 2.1;
  const roof = new Roof({
    cx, cz, hx: w + ov, hz: w + ov, overhang: ov, type: 'irimoya', rise: 4.2, gableT: 0.46, pow: 1.45,
    soffitAnchor: body.anchor(ov), lift: 0.55, liftReachK: 0.6, liftFadeK: 0.5, sweep: 0.3, thick: 0.26, hFly: 0.12,
    scale: 0.85, tileSpacing: 0.42, course: 0.6, tileR: 0.032, ridgeScale: 0.75, setback: 0.55,
    keys: { tile: 'copper', round: 'copperTrim', ridge: 'copperTrim', ornament: 'copperTrim' },
  });
  roof.build(B);
  // seal the roof void above the open frame
  B.box('lacquer', w * 2 + 0.4, 0.08, w * 2 + 0.4, cx, roof.soffitY(ov) + 0.06, cz);
  body.fill(roof.soffitY(ov));
  info.anchors.shoro = new THREE.Vector3(cx, roof.topY(roof.iR) + 1, cz);

  // ------------------------------------------------ the bell (animated, kept separate)
  const g = new THREE.Group();
  g.name = 'bonsho';
  const bellH = 2.35;
  const bell = new THREE.Group();
  bell.position.set(cx, beamY - 0.62 - bellH, cz);
  g.add(bell);
  const bronze = P.bronze.clone();
  bronze.side = THREE.DoubleSide;
  bronze.onBeforeCompile = P.bronze.onBeforeCompile;
  bronze.customProgramCacheKey = P.bronze.customProgramCacheKey;
  const add = (geo, m, material = bronze) => { const mesh = new THREE.Mesh(geo, material); if (m) mesh.applyMatrix4(m); mesh.castShadow = true; mesh.receiveShadow = true; bell.add(mesh); return mesh; };
  add(latheGeo([
    [0.001, 2.35], [0.4, 2.33], [0.56, 2.26], [0.63, 2.1], [0.65, 1.8], [0.66, 1.3], [0.68, 0.8], [0.72, 0.4], [0.77, 0.14], [0.8, 0.03], [0.79, 0],
    [0.7, 0], [0.64, 0.35], [0.6, 1.0], [0.57, 1.8], [0.45, 2.15], [0.001, 2.2],
  ], 48));
  // horizontal bands
  for (const [y, r] of [[1.62, 0.665], [1.55, 0.667], [0.82, 0.684], [0.74, 0.688], [0.2, 0.765], [2.08, 0.635]]) {
    add(new THREE.TorusGeometry(r, 0.022, 6, 48), mat(0, y, 0, 0, Math.PI / 2));
  }
  // vertical bands (kesa-dasuki) and nipples (chi) in four panels
  for (let q = 0; q < 4; q++) {
    const a = (q / 4) * TAU + Math.PI / 4;
    add(new THREE.BoxGeometry(0.05, 1.32, 0.04), mat(Math.cos(a) * 0.67, 1.42, Math.sin(a) * 0.67, -a));
    add(new THREE.BoxGeometry(0.05, 0.62, 0.04), mat(Math.cos(a) * 0.7, 0.48, Math.sin(a) * 0.7, -a));
    for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) {
      const aa = (q / 4) * TAU + Math.PI / 4 + 0.32 + col * 0.31;
      const yy = 1.72 + row * 0.11;
      const rr = 0.655 - row * 0.008;
      add(new THREE.SphereGeometry(0.03, 8, 6), mat(Math.cos(aa) * rr, yy, Math.sin(aa) * rr));
    }
  }
  // striking seats: lotus medallions facing the striker
  for (const sx of [-1, 1]) {
    add(cylGeo(0.13, 0.13, 0.04, 20), mat(sx * 0.73, 0.5, 0, 0, 0, Math.PI / 2));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      add(new THREE.SphereGeometry(0.04, 6, 4), mat(sx * 0.74, 0.5 + Math.sin(a) * 0.12, Math.cos(a) * 0.12));
    }
  }
  // ryūzu: the dragon loop on the crown
  add(new THREE.TorusGeometry(0.2, 0.06, 10, 24, Math.PI), mat(0, 2.33, 0));
  for (const sx of [-1, 1]) add(new THREE.SphereGeometry(0.11, 10, 8), mat(sx * 0.2, 2.38, 0, 0, 0, 0, 1.2, 0.8, 1));
  add(new THREE.SphereGeometry(0.09, 10, 8), mat(0, 2.62, 0));

  // the striker (shumoku): pivot at the beam, log hanging on two ropes
  const pivot = new THREE.Group();
  pivot.position.set(cx + 2.0, beamY - 0.55, cz);
  g.add(pivot);
  const strikeY = bell.position.y + 0.5 - pivot.position.y;
  const logMat = P.hinoki;
  const log = new THREE.Mesh(cylGeo(0.17, 0.17, 2.3, 16), logMat);
  log.rotation.z = Math.PI / 2;
  log.position.set(-0.05, strikeY, 0);
  log.castShadow = true;
  pivot.add(log);
  const cap = new THREE.Mesh(cylGeo(0.175, 0.175, 0.08, 16), P.iron);
  cap.rotation.z = Math.PI / 2; cap.position.set(-1.2, strikeY, 0);
  pivot.add(cap);
  for (const x of [-0.7, 0.7]) {
    const rope = new THREE.Mesh(polyTubeGeo([new THREE.Vector3(x, 0, 0), new THREE.Vector3(x, strikeY + 0.17, 0)], 0.025, 5), P.rope);
    pivot.add(rope);
    const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.03, 6, 16), P.rope);
    wrap.position.set(x, strikeY, 0); wrap.rotation.y = Math.PI / 2;
    pivot.add(wrap);
  }
  // pull rope with a tassel
  const pull = [];
  for (let i = 0; i <= 10; i++) pull.push(new THREE.Vector3(0.9 + i * 0.02, strikeY - i * 0.16, Math.sin(i) * 0.02));
  pivot.add(new THREE.Mesh(polyTubeGeo(pull, 0.025, 5), P.rope));
  const tassel = new THREE.Mesh(latheGeo([[0.001, 0], [0.06, -0.05], [0.09, -0.3], [0.001, -0.32]], 8), P.ropeRed);
  tassel.position.copy(pull[pull.length - 1]);
  pivot.add(tassel);

  info.extra = g;
  info.bell = { group: g, bell, pivot, center: new THREE.Vector3(cx, bell.position.y + 1.2, cz) };
  return info;
}
