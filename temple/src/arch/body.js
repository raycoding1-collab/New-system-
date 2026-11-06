// One storey of a timber-frame building: the ring of columns, its tie beams and
// nageshi bands, wall infill bay by bay, bracket sets on every column head, struts
// between them, white kokabe panels behind the brackets and the continuous outer beams
// that carry the rafters.
import * as THREE from 'three';
import { mat } from '../lib/util.js';
import { column, bracket, bracketHeight, strut, kaerumata, plasterPanel, studdedDoor, renjiWindow, shoji } from './parts.js';

const ROT = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

export function storey(B, o) {
  o = Object.assign({
    cx: 0, cz: 0, r: 0.25, colKey: 'shu', beamKey: 'shu', steps: 2, s: 1, nageshi: 2.4, gilt: false,
    bracketKeys: {}, strutKind: 'kentozuka', bays: () => 'plaster', base: true, kokabe: true, baseKey: 'stone',
  }, o);
  const { xs, zs, y0, h, s } = o;
  const X0 = xs[0], X1 = xs[xs.length - 1], Z0 = zs[0], Z1 = zs[zs.length - 1];
  const colTop = y0 + h;
  const bh = bracketHeight(o.steps, s);

  // perimeter columns
  const cols = [];
  for (const x of xs) { cols.push([x, Z0]); cols.push([x, Z1]); }
  for (const z of zs.slice(1, -1)) { cols.push([X0, z]); cols.push([X1, z]); }
  for (const [x, z] of cols) column(B, o.colKey, o.cx + x, y0, o.cz + z, h, o.r, { gilt: o.gilt, base: o.base, baseKey: o.baseKey });
  if (o.inner) for (const [x, z] of o.inner) column(B, o.colKey, o.cx + x, y0, o.cz + z, h + bh * 0.6, o.r, { base: o.base });

  // sides: [axis positions, fixed coordinate, rotation]
  const sides = [
    { list: xs, fixed: Z1, along: 'x' },
    { list: zs.slice().reverse(), fixed: X1, along: 'z' },
    { list: xs.slice().reverse(), fixed: Z0, along: 'x' },
    { list: zs, fixed: X0, along: 'z' },
  ];
  const at = (side, a, off = 0) => {
    const sd = sides[side];
    return sd.along === 'x'
      ? new THREE.Vector3(o.cx + a, 0, o.cz + sd.fixed + (side === 0 ? off : -off))
      : new THREE.Vector3(o.cx + sd.fixed + (side === 1 ? off : -off), 0, o.cz + a);
  };

  const beam = (side, y, w, hh, off, key = o.beamKey, ext = 0.2) => {
    const sd = sides[side];
    const a0 = sd.list[0], a1 = sd.list[sd.list.length - 1];
    const len = Math.abs(a1 - a0) + ext * 2;
    const mid = at(side, (a0 + a1) / 2, off);
    if (sd.along === 'x') B.box(key, len, hh, w, mid.x, y, mid.z);
    else B.box(key, w, hh, len, mid.x, y, mid.z);
  };

  for (let side = 0; side < 4; side++) {
    const sd = sides[side];
    // head tie beam (kashiranuki), top beam, nageshi bands
    beam(side, colTop - 0.2 * s, 0.24 * s, 0.32 * s, 0);
    beam(side, colTop + 0.04 * s, 0.3 * s, 0.1 * s, 0, o.beamKey, 0.3);
    beam(side, y0 + o.nageshi + 0.12, 0.12, 0.24, o.r * 0.9, o.beamKey, 0.05);
    beam(side, y0 + 0.14, 0.12, 0.22, o.r * 0.9, o.beamKey, 0.05);
    // wall infill, bay by bay
    for (let b = 0; b < sd.list.length - 1; b++) {
      const a0 = sd.list[b], a1 = sd.list[b + 1];
      const w = Math.abs(a1 - a0) - o.r * 2 + 0.02;
      const c = at(side, (a0 + a1) / 2, 0);
      const kind = o.bays(side, b, sd.list.length - 1);
      B.with(mat(c.x, y0, c.z, ROT[side]), () => {
        const dh = o.nageshi;
        switch (kind) {
          case 'door': studdedDoor(B, w, dh); break;
          case 'renji': plasterPanel(B, w, 0.7); B.with(mat(0, 0.75, 0), () => renjiWindow(B, w * 0.8, dh - 0.9, o.renjiKeys || {})); B.with(mat(0, 0, -0.01), () => plasterPanel(B, w, dh)); break;
          case 'shoji': shoji(B, w, dh); break;
          case 'lattice': B.box('lattice', w, dh, 0.05, 0, dh / 2, 0.02); B.box('shadowVoid', w, dh, 0.02, 0, dh / 2, -0.3); B.box(o.beamKey, w, 0.12, 0.12, 0, 0.06, 0.02); break;
          case 'latticeShu': B.box('latticeShu', w, dh, 0.05, 0, dh / 2, 0.02); B.box('shadowVoid', w, dh, 0.02, 0, dh / 2, -0.4); break;
          case 'open': case 'none': break;
          default: plasterPanel(B, w, dh);
        }
        // above the nageshi: plaster up to the head beam
        const topH = h - o.nageshi - 0.35 * s;
        if (topH > 0.05 && kind !== 'none') B.with(mat(0, o.nageshi + 0.24, 0), () => plasterPanel(B, w, topH));
      });
      // struts between column heads
      const mid = at(side, (a0 + a1) / 2, 0);
      if (Math.abs(a1 - a0) > 1.6) {
        const sh = bh * 0.55;
        if (o.strutKind === 'kaerumata') kaerumata(B, o.beamKey, mid.x, colTop + 0.09 * s, mid.z, ROT[side], Math.min(1.4, Math.abs(a1 - a0) * 0.45), sh);
        else strut(B, o.beamKey, mid.x, colTop + 0.09 * s, mid.z, ROT[side], sh, s);
      }
    }
    // white kokabe band behind the brackets
    if (o.kokabe) {
      const a0 = sd.list[0], a1 = sd.list[sd.list.length - 1];
      const mid = at(side, (a0 + a1) / 2, -0.06);
      const len = Math.abs(a1 - a0);
      if (sd.along === 'x') B.box('plaster', len, bh, 0.08, mid.x, colTop + bh / 2, mid.z);
      else B.box('plaster', 0.08, bh, len, mid.x, colTop + bh / 2, mid.z);
    }
    // through-hijiki on the first tier, and the outer beams (gangyo) at each step
    beam(side, colTop + 0.32 * s + 0.11 * s, 0.18 * s, 0.2 * s, 0, o.beamKey, 0.4);
    for (let st = 1; st <= o.steps; st++) {
      const off = st * 0.5 * s;
      const y = colTop + 0.32 * s + st * 0.37 * s + 0.11 * s;
      beam(side, y, 0.18 * s, 0.22 * s, off, o.beamKey, off + 0.2);
    }
  }

  // bracket sets on every perimeter column head
  for (let side = 0; side < 4; side++) {
    const sd = sides[side];
    for (let i = 0; i < sd.list.length; i++) {
      const p = at(side, sd.list[i], 0);
      const corner = i === 0 || i === sd.list.length - 1;
      bracket(B, mat(p.x, colTop + 0.09 * s, p.z, ROT[side]), o.steps, s, o.bracketKeys);
      if (corner && i === 0) {
        // diagonal corner set, pointing out along the hip
        const diag = ROT[side] - Math.PI / 4;
        bracket(B, mat(p.x, colTop + 0.09 * s, p.z, diag), o.steps, s * 1.08, o.bracketKeys);
      }
    }
  }
  const top = colTop + 0.09 * s + bh;
  const outer = o.steps * 0.5 * s + 0.2 * s;
  return {
    colTop, bh, soffit: top, X0, X1, Z0, Z1, outer,
    // roof anchor: the soffit must sit on the outermost bracket tier
    anchor: (ov) => [Math.max(0.05, ov - outer), top + 0.02],
    // white band from the bracket tops up to the soffit at the wall line
    fill: (yTop) => {
      const hh = yTop - top + 0.05;
      if (hh <= 0.02) return;
      for (let side = 0; side < 4; side++) {
        const sd = sides[side];
        const a0 = sd.list[0], a1 = sd.list[sd.list.length - 1];
        const mid = at(side, (a0 + a1) / 2, -0.06);
        const len = Math.abs(a1 - a0) + 0.4;
        if (sd.along === 'x') B.box('plaster', len, hh, 0.08, mid.x, top + hh / 2 - 0.02, mid.z);
        else B.box('plaster', 0.08, hh, len, mid.x, top + hh / 2 - 0.02, mid.z);
      }
    },
  };
}
