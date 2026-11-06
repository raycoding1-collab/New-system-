// Procedural textures, painted once at start-up on canvases. No image files are loaded:
// every grain line, granite fleck, roof tile and raked gravel ripple is computed here.
import * as THREE from 'three';
import { fbm2, vnoise2, Rng, clamp, smoothstep, fract, TAU } from './util.js';

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function toTexture(c, { srgb = true, repeat = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = aniso;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.needsUpdate = true;
  return t;
}

// Fill a canvas from a per-pixel function returning [r,g,b] (0..1) or [r,g,b,a].
function paint(w, h, fn) {
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;
  let k = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = fn(x / w, y / h, x, y);
      d[k++] = clamp(v[0], 0, 1) * 255;
      d[k++] = clamp(v[1], 0, 1) * 255;
      d[k++] = clamp(v[2], 0, 1) * 255;
      d[k++] = v.length > 3 ? clamp(v[3], 0, 1) * 255 : 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// Height field (Float32Array, wraps) -> tangent-space normal map canvas.
function normalCanvas(H, w, h, strength) {
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    const ym = (y - 1 + h) % h, yp = (y + 1) % h;
    for (let x = 0; x < w; x++) {
      const xm = (x - 1 + w) % w, xp = (x + 1) % w;
      const du = (H[y * w + xp] - H[y * w + xm]) * 0.5 * strength;
      // canvas rows run downwards, texture v runs upwards (flipY)
      const dv = -(H[yp * w + x] - H[ym * w + x]) * 0.5 * strength;
      let nx = -du, ny = -dv, nz = 1;
      const l = Math.hypot(nx, ny, nz);
      nx /= l; ny /= l; nz /= l;
      const k = (y * w + x) * 4;
      d[k] = (nx * 0.5 + 0.5) * 255; d[k + 1] = (ny * 0.5 + 0.5) * 255; d[k + 2] = (nz * 0.5 + 0.5) * 255; d[k + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function heightField(w, h, fn) {
  const H = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) H[y * w + x] = fn(x / w, y / h, x, y);
  return H;
}

// ------------------------------------------------------------------ wood
// Grain runs along u. Grey-scale; the material colour tints it, so the same map serves
// vermilion lacquer, dark lacquer and bare weathered timber.
export function woodTextures(size = 512, contrast = 1) {
  const fn = (u, v) => {
    const warp = fbm2(u * 3, v * 3, 3, 11, 3, 3) * 2.2;
    const rings = Math.sin((v * 34 + warp * 3.5 + fbm2(u * 2, v * 40, 3, 5, 2, 40) * 2.5) * Math.PI);
    const streak = fbm2(u * 2, v * 64, 4, 7, 2, 64);
    const g = 0.82 + (rings * 0.09 + (streak - 0.5) * 0.32 - 0.1) * contrast;
    return [g, g * 0.98, g * 0.95];
  };
  const map = toTexture(paint(size, size, fn));
  const H = heightField(size, size, (u, v) => fbm2(u * 2, v * 64, 4, 7, 2, 64) * 0.6 + Math.sin(v * 34 * Math.PI) * 0.1);
  const normal = toTexture(normalCanvas(H, size, size, 3.5), { srgb: false });
  return { map, normal };
}

// Lacquer wear: mostly white with darker scuffs, used as a roughness/AO breakup.
export function grungeTexture(size = 512) {
  return toTexture(paint(size, size, (u, v) => {
    const n = fbm2(u * 6, v * 6, 5, 21, 6, 6);
    const s = fbm2(u * 24, v * 24, 3, 33, 24, 24);
    const g = 0.78 + (n - 0.5) * 0.45 + (s - 0.5) * 0.18;
    return [g, g, g];
  }), { srgb: false });
}

// ------------------------------------------------------------------ plaster
export function plasterTexture(size = 256) {
  const r = new Rng(9);
  const c = paint(size, size, (u, v) => {
    const n = fbm2(u * 8, v * 8, 5, 41, 8, 8);
    const g = 0.93 + (n - 0.5) * 0.12;
    return [g, g * 0.985, g * 0.96];
  });
  const ctx = c.getContext('2d');
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(90,80,60,${r.range(0.03, 0.09)})`;
    ctx.beginPath(); ctx.arc(r.f() * size, r.f() * size, r.range(0.4, 1.4), 0, TAU); ctx.fill();
  }
  return toTexture(c);
}

// ------------------------------------------------------------------ granite
export function stoneTextures(size = 512, seed = 3) {
  const r = new Rng(seed);
  const c = paint(size, size, (u, v) => {
    const n = fbm2(u * 6, v * 6, 6, seed, 6, 6);
    const m = fbm2(u * 2, v * 2, 3, seed + 9, 2, 2);
    const g = 0.66 + (n - 0.5) * 0.35 + (m - 0.5) * 0.2;
    return [g * 1.0, g * 0.985, g * 0.95];
  });
  const ctx = c.getContext('2d');
  for (let i = 0; i < 5200; i++) {
    const dark = r.f() < 0.6;
    ctx.fillStyle = dark ? `rgba(30,30,32,${r.range(0.15, 0.5)})` : `rgba(250,248,240,${r.range(0.1, 0.35)})`;
    ctx.fillRect(r.f() * size, r.f() * size, r.range(0.6, 2.2), r.range(0.6, 2.2));
  }
  // lichen blotches
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(${r.int(120, 160)},${r.int(130, 150)},${r.int(90, 110)},${r.range(0.05, 0.14)})`;
    ctx.beginPath(); ctx.arc(r.f() * size, r.f() * size, r.range(4, 22), 0, TAU); ctx.fill();
  }
  const map = toTexture(c);
  const H = heightField(size, size, (u, v) => fbm2(u * 8, v * 8, 6, seed + 2, 8, 8));
  const normal = toTexture(normalCanvas(H, size, size, 6), { srgb: false });
  return { map, normal };
}

// ------------------------------------------------------------------ roof tiles
// One texture repeat = 2 tile columns (u) x 4 tile courses (v). The flat tiles (hira-gawara)
// dip into a channel between the round-tile lines, which are real geometry. Each course
// steps down where it overlaps the next, so the roof reads as stacked clay, not a grey sheet.
export function tileTextures(w = 256, h = 512) {
  const rng = new Rng(77);
  const shade = [];
  for (let i = 0; i < 64; i++) shade.push(rng.range(-0.06, 0.06));
  const H = heightField(w, h, (u, v) => {
    const cu = fract(u * 2), cv = fract(v * 4);
    const channel = -Math.cos(cu * TAU) * 0.5; // high near the round tiles (cu=.5)
    const course = Math.pow(cv, 0.8) * 1.1;        // each course rises then drops to the next
    const lip = smoothstep(0.0, 0.05, cv);
    return channel * 0.6 + course * lip;
  });
  const color = paint(w, h, (u, v, x, y) => {
    const col = Math.floor(u * 2), row = Math.floor(v * 4);
    const s = shade[(col * 7 + row * 13) % 64];
    const cv = fract(v * 4);
    const edge = smoothstep(0.0, 0.08, cv) * 0.25 + 0.75; // shadowed lip under each course
    const n = (fbm2(u * 8, v * 16, 3, 5, 8, 16) - 0.5) * 0.12;
    const g = (0.52 + s + n) * edge;
    return [g * 0.97, g, g * 1.04];
  });
  return {
    map: toTexture(color),
    normal: toTexture(normalCanvas(H, w, h, 9), { srgb: false }),
  };
}

// Copper (dōban) roof: standing seams + patina blotches.
export function copperTextures(size = 512) {
  const color = paint(size, size, (u, v) => {
    const n = fbm2(u * 5, v * 5, 5, 61, 5, 5);
    const streak = fbm2(u * 32, v * 2, 3, 63, 32, 2);
    const seam = smoothstep(0.46, 0.5, Math.abs(fract(u * 4) - 0.5)) * 0.25;
    const t = clamp(n * 1.2 + streak * 0.3 - 0.25, 0, 1);
    const pat = [0.38, 0.62, 0.53], dark = [0.24, 0.36, 0.3];
    return [dark[0] + (pat[0] - dark[0]) * t - seam, dark[1] + (pat[1] - dark[1]) * t - seam, dark[2] + (pat[2] - dark[2]) * t - seam];
  });
  const H = heightField(size, size, (u, v) => smoothstep(0.42, 0.5, Math.abs(fract(u * 4) - 0.5)) + fbm2(u * 20, v * 20, 3, 4, 20, 20) * 0.1);
  return { map: toTexture(color), normal: toTexture(normalCanvas(H, size, size, 5), { srgb: false }) };
}

// ------------------------------------------------------------------ ground
export function groundDetailTextures(size = 512) {
  const r = new Rng(5);
  const c = paint(size, size, (u, v) => {
    const n = fbm2(u * 16, v * 16, 5, 91, 16, 16);
    const g = 0.82 + (n - 0.5) * 0.4;
    return [g, g, g];
  });
  const ctx = c.getContext('2d');
  for (let i = 0; i < 9000; i++) {
    const l = r.f() < 0.5 ? r.int(140, 200) : r.int(225, 255);
    ctx.fillStyle = `rgba(${l},${l},${l},${r.range(0.15, 0.5)})`;
    ctx.beginPath(); ctx.arc(r.f() * size, r.f() * size, r.range(0.5, 1.8), 0, TAU); ctx.fill();
  }
  const map = toTexture(c);
  const H = heightField(size, size, (u, v) => fbm2(u * 32, v * 32, 4, 93, 32, 32));
  const normal = toTexture(normalCanvas(H, size, size, 4), { srgb: false });
  return { map, normal };
}

// ------------------------------------------------------------------ raked gravel
// The dry garden's raking is computed from the rock positions: ripples ring each rock
// group, and straight furrows fill the rest, the way a monk's rake would run.
export function gravelTextures(widthM, depthM, rocks, pxPerM = 64) {
  const w = Math.min(2048, Math.round(widthM * pxPerM));
  const h = Math.min(2048, Math.round(depthM * pxPerM));
  const spacing = 0.16; // metres between rake tines
  const H = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = (x / w) * widthM, pz = (y / h) * depthM;
      let best = 1e9, bi = -1;
      for (let i = 0; i < rocks.length; i++) {
        const rk = rocks[i];
        const dx = (px - rk.x) / rk.rx, dz = (pz - rk.z) / rk.rz;
        const e = (Math.sqrt(dx * dx + dz * dz) - 1) * Math.min(rk.rx, rk.rz);
        if (e < best) { best = e; bi = i; }
      }
      let phase;
      const ringW = bi >= 0 ? rocks[bi].rings * spacing : 0;
      if (best < ringW) phase = Math.max(best, 0) / spacing;
      else phase = pz / spacing;
      const ridge = Math.pow(0.5 + 0.5 * Math.cos(phase * TAU), 0.7);
      const grain = vnoise2(x * 0.9, y * 0.9, 3) * 0.25;
      H[y * w + x] = best < 0 ? 0 : ridge + grain;
    }
  }
  const r = new Rng(12);
  const color = paint(w, h, (u, v, x, y) => {
    const hh = H[y * w + x];
    const g = 0.8 + hh * 0.07 + (vnoise2(x * 0.7, y * 0.7, 8) - 0.5) * 0.18;
    return [g * 0.99, g * 0.975, g * 0.94];
  });
  const ctx = color.getContext('2d');
  for (let i = 0; i < w * h * 0.004; i++) {
    const l = r.int(110, 175);
    ctx.fillStyle = `rgba(${l},${l - 4},${l - 10},0.5)`;
    ctx.fillRect(r.f() * w, r.f() * h, 1.3, 1.3);
  }
  return {
    map: toTexture(color, { repeat: false }),
    normal: toTexture(normalCanvas(H, w, h, 2.2), { srgb: false, repeat: false }),
  };
}

// ------------------------------------------------------------------ stone wall (ishigaki)
// Kirikomi-hagi coursing: rows of squared stones of varying width, slightly irregular
// courses, bevelled joints. Encodes per-stone tint in the colour map.
export function ishigakiTextures(size = 1024) {
  const rng = new Rng(31);
  const rows = 8;
  const rowsH = [];
  let acc = 0;
  for (let i = 0; i < rows; i++) { const hh = rng.range(0.8, 1.2); rowsH.push(hh); acc += hh; }
  const rowEdges = [0];
  for (let i = 0; i < rows; i++) rowEdges.push(rowEdges[i] + rowsH[i] / acc);
  const rowStones = rowEdges.slice(0, -1).map(() => {
    const cuts = [0];
    let x = rng.range(0, 0.1);
    while (x < 1) { cuts.push(x); x += rng.range(0.08, 0.2); }
    cuts.push(1);
    return { cuts: [...new Set(cuts)].sort((a, b) => a - b), tints: cuts.map(() => rng.range(-0.1, 0.1)), bulge: cuts.map(() => rng.range(0.6, 1)) };
  });
  const bevel = 0.012;
  const info = (u, v) => {
    let ri = 0;
    while (ri < rows - 1 && v > rowEdges[ri + 1]) ri++;
    const rs = rowStones[ri];
    let si = 0;
    while (si < rs.cuts.length - 2 && u > rs.cuts[si + 1]) si++;
    const du = Math.min(u - rs.cuts[si], rs.cuts[si + 1] - u);
    const dv = Math.min(v - rowEdges[ri], rowEdges[ri + 1] - v);
    return { d: Math.min(du, dv * 1.0), tint: rs.tints[si], bulge: rs.bulge[si], ri, si };
  };
  const H = heightField(size, size, (u, v) => {
    const s = info(u, v);
    const edge = smoothstep(0, bevel, s.d);
    return edge * (0.6 + s.bulge * 0.4) + fbm2(u * 16, v * 16, 4, 17, 16, 16) * 0.25 * edge;
  });
  const color = paint(size, size, (u, v, x, y) => {
    const s = info(u, v);
    const edge = smoothstep(0, bevel * 0.7, s.d);
    const n = fbm2(u * 12, v * 12, 5, 19, 12, 12);
    const moss = smoothstep(0.55, 0.75, fbm2(u * 4, v * 4, 4, 23, 4, 4)) * (1 - edge * 0.5);
    let g = (0.6 + s.tint + (n - 0.5) * 0.3) * (0.25 + edge * 0.75);
    return [g * (1 - moss * 0.45), g * (1 + moss * 0.05), g * (0.95 - moss * 0.5)];
  });
  return { map: toTexture(color), normal: toTexture(normalCanvas(H, size, size, 14), { srgb: false }) };
}

// ------------------------------------------------------------------ foliage cards
// White shapes on transparent canvases; vertex colours give them their season.
function leafCanvas(size, draw) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  draw(ctx, size);
  return c;
}

export function mapleLeafTexture() {
  const c = leafCanvas(256, (ctx, s) => {
    const r = new Rng(4);
    // A cluster of 5 palmate leaves per card reads denser at a distance.
    const leaves = [[0.5, 0.5, 0.36, 0], [0.24, 0.3, 0.2, -0.8], [0.76, 0.28, 0.2, 0.9], [0.27, 0.74, 0.2, -2.4], [0.74, 0.74, 0.2, 2.3]];
    for (const [cx, cy, rad, rot] of leaves) {
      ctx.save();
      ctx.translate(cx * s, cy * s); ctx.rotate(rot + r.range(-0.3, 0.3));
      const R = rad * s;
      ctx.beginPath();
      const lobes = 7;
      for (let i = 0; i <= lobes * 2; i++) {
        const a = -Math.PI / 2 + (i / (lobes * 2)) * TAU * 0.86 - TAU * 0.43 + Math.PI / 2;
        const tip = i % 2 === 0;
        const lobeScale = 1 - Math.abs(i - lobes) / lobes * 0.45;
        const rr = tip ? R * lobeScale : R * 0.38;
        const x = Math.cos(a - Math.PI / 2) * rr, y = Math.sin(a - Math.PI / 2) * rr;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
      g.addColorStop(0, 'rgba(235,235,235,1)'); g.addColorStop(1, 'rgba(255,255,255,1)');
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(150,150,150,0.55)'; ctx.lineWidth = 1.2;
      for (let i = 0; i < lobes; i++) {
        const a = (i / (lobes - 1)) * TAU * 0.86 - TAU * 0.43;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(a) * R * 0.85, -Math.cos(a) * R * 0.85); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(120,120,120,0.9)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, R * 0.55); ctx.stroke();
      ctx.restore();
    }
  });
  return toTexture(c, { repeat: false });
}

export function blossomTexture() {
  const c = leafCanvas(256, (ctx, s) => {
    const r = new Rng(8);
    for (let k = 0; k < 9; k++) {
      const cx = r.range(0.2, 0.8) * s, cy = r.range(0.2, 0.8) * s, R = r.range(0.09, 0.15) * s;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(r.f() * TAU);
      for (let p = 0; p < 5; p++) {
        ctx.rotate(TAU / 5);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(R * 0.6, -R * 0.2, R * 0.75, -R * 0.9, R * 0.18, -R * 1.05);
        ctx.lineTo(0, -R * 0.88);
        ctx.lineTo(-R * 0.18, -R * 1.05);
        ctx.bezierCurveTo(-R * 0.75, -R * 0.9, -R * 0.6, -R * 0.2, 0, 0);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
        g.addColorStop(0, 'rgba(225,205,210,1)'); g.addColorStop(0.35, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(250,250,250,1)');
        ctx.fillStyle = g; ctx.fill();
      }
      ctx.fillStyle = 'rgba(150,90,100,1)';
      for (let i = 0; i < 7; i++) { const a = r.f() * TAU; ctx.beginPath(); ctx.arc(Math.cos(a) * R * 0.22, Math.sin(a) * R * 0.22, 1.5, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
  });
  return toTexture(c, { repeat: false });
}

export function needleTexture() {
  const c = leafCanvas(256, (ctx, s) => {
    const r = new Rng(15);
    ctx.lineCap = 'round';
    for (let k = 0; k < 16; k++) {
      const cx = r.range(0.2, 0.8) * s, cy = r.range(0.25, 0.8) * s;
      for (let i = 0; i < 26; i++) {
        const a = -Math.PI / 2 + r.range(-1.3, 1.3);
        const L = r.range(0.1, 0.2) * s;
        const l = r.int(200, 255);
        ctx.strokeStyle = `rgba(${l},${l},${l},1)`;
        ctx.lineWidth = r.range(1.2, 2.2);
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * L, cy + Math.sin(a) * L); ctx.stroke();
      }
    }
  });
  return toTexture(c, { repeat: false });
}

export function cedarTexture() {
  const c = leafCanvas(256, (ctx, s) => {
    const r = new Rng(19);
    ctx.lineCap = 'round';
    const spray = (x, y, a, L, wdt, depth) => {
      const x2 = x + Math.cos(a) * L, y2 = y + Math.sin(a) * L;
      const l = r.int(200, 255);
      ctx.strokeStyle = `rgba(${l},${l},${l},1)`; ctx.lineWidth = wdt;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
      if (depth > 0) {
        for (let i = 1; i <= 4; i++) {
          const t = i / 5;
          const px = x + (x2 - x) * t, py = y + (y2 - y) * t;
          spray(px, py, a - 0.75, L * 0.42, wdt * 0.7, depth - 1);
          spray(px, py, a + 0.75, L * 0.42, wdt * 0.7, depth - 1);
        }
      }
    };
    for (let k = 0; k < 4; k++) spray(s * r.range(0.3, 0.7), s * 0.95, -Math.PI / 2 + r.range(-0.45, 0.45), s * 0.72, 5, 2);
  });
  return toTexture(c, { repeat: false });
}

export function bambooLeafTexture() {
  const c = leafCanvas(256, (ctx, s) => {
    const r = new Rng(23);
    for (let k = 0; k < 7; k++) {
      const cx = r.range(0.3, 0.7) * s, cy = r.range(0.3, 0.75) * s;
      const n = r.int(4, 6);
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + r.range(-1.4, 1.4);
        const L = r.range(0.22, 0.34) * s, W = L * 0.12;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(L * 0.4, -W, L, 0); ctx.quadraticCurveTo(L * 0.4, W, 0, 0);
        const l = r.int(215, 255); ctx.fillStyle = `rgb(${l},${l},${l})`; ctx.fill();
        ctx.restore();
      }
    }
  });
  return toTexture(c, { repeat: false });
}

// Soft round sprite for smoke, mist and glows.
export function softSpriteTexture(size = 128) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  return toTexture(c, { repeat: false, srgb: false });
}

export function smokeTexture(size = 128) {
  return toTexture(paint(size, size, (u, v) => {
    const d = Math.hypot(u - 0.5, v - 0.5) * 2;
    const n = fbm2(u * 4, v * 4, 4, 51, 4, 4);
    const a = smoothstep(1, 0.2, d) * smoothstep(0.25, 0.75, n + (1 - d) * 0.35);
    return [1, 1, 1, a];
  }), { repeat: false, srgb: false });
}

// Tileable fbm used by the cloud-sea shader.
export function cloudNoiseTexture(size = 256) {
  const c = paint(size, size, (u, v) => {
    const a = fbm2(u * 4, v * 4, 6, 71, 4, 4);
    const b = fbm2(u * 8 + 3.1, v * 8 + 1.7, 5, 73, 8, 8);
    const r = 1 - Math.abs(fbm2(u * 6, v * 6, 4, 75, 6, 6) * 2 - 1);
    return [a, b, r];
  });
  const t = toTexture(c, { srgb: false });
  return t;
}

// ------------------------------------------------------------------ panels
// Shōji: paper with a kumiko grid. The map's alpha is opaque; `emissive` lights the paper
// from behind at night while the wooden bars stay dark.
export function shojiTextures() {
  const s = 256;
  const c = canvas(s), e = canvas(s);
  const ctx = c.getContext('2d'), ex = e.getContext('2d');
  ctx.fillStyle = '#ece6d6'; ctx.fillRect(0, 0, s, s);
  const r = new Rng(3);
  for (let i = 0; i < 400; i++) { ctx.fillStyle = `rgba(160,140,110,${r.range(0.02, 0.06)})`; ctx.fillRect(r.f() * s, r.f() * s, r.range(1, 6), r.range(1, 6)); }
  ex.fillStyle = '#ffffff'; ex.fillRect(0, 0, s, s);
  const bar = 7;
  for (const g of [ctx, ex]) {
    g.fillStyle = g === ctx ? '#3a2a1d' : '#000000';
    for (let i = 0; i <= 3; i++) g.fillRect((i / 3) * s - bar / 2, 0, bar, s);
    for (let i = 0; i <= 6; i++) g.fillRect(0, (i / 6) * s - bar / 2, s, bar);
  }
  return { map: toTexture(c), emissive: toTexture(e) };
}

// Kōshi lattice (fine square grid), alpha cut-out.
export function latticeTexture(cells = 8) {
  const s = 256;
  const c = canvas(s);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, s, s);
  ctx.fillStyle = '#ffffff';
  const bar = s / cells * 0.26;
  for (let i = 0; i <= cells; i++) {
    ctx.fillRect((i / cells) * s - bar / 2, 0, bar, s);
    ctx.fillRect(0, (i / cells) * s - bar / 2, s, bar);
  }
  return toTexture(c, { srgb: true });
}

// Studded plank door: planks, iron bands, rows of gilt studs (in a separate mask so the
// studs can be metallic).
export function doorTextures() {
  const s = 512;
  const c = canvas(s);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, s, s);
  for (let i = 1; i < 4; i++) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect((i / 4) * s - 1.5, 0, 3, s); }
  const studs = canvas(s);
  const sx = studs.getContext('2d');
  sx.fillStyle = '#000'; sx.fillRect(0, 0, s, s);
  const rowsY = [0.12, 0.3, 0.7, 0.88];
  for (const ry of rowsY) {
    for (let i = 0; i < 9; i++) {
      const x = (i + 0.5) / 9 * s, y = ry * s;
      const g = sx.createRadialGradient(x - 3, y - 3, 1, x, y, 11);
      g.addColorStop(0, '#fff'); g.addColorStop(1, '#888');
      sx.fillStyle = g; sx.beginPath(); sx.arc(x, y, 10, 0, TAU); sx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(x + 2, y + 3, 11, 0, TAU); ctx.fill();
    }
  }
  return { map: toTexture(c), studs: toTexture(studs, { srgb: false }) };
}

// The red chōchin lantern: horizontal bamboo ribs, black bands, a white cloud crest.
export function chochinTextures() {
  const w = 1024, h = 512;
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#7a1610'); g.addColorStop(0.5, '#b4231a'); g.addColorStop(1, '#7a1610');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  for (let i = 0; i < 34; i++) ctx.fillRect(0, (i / 34) * h, w, 2);
  ctx.fillStyle = '#121010';
  ctx.fillRect(0, h * 0.06, w, h * 0.05); ctx.fillRect(0, h * 0.89, w, h * 0.05);
  // two crests, front and back
  for (const cx of [w * 0.25, w * 0.75]) crest(ctx, cx, h * 0.5, h * 0.27, '#f3eadb');
  return toTexture(c, { repeat: false });
}

// "Mist over three peaks" crest drawn with arcs — the temple's own mon.
export function crest(ctx, cx, cy, R, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineWidth = R * 0.09;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-R * 0.7, R * 0.15); ctx.lineTo(-R * 0.3, -R * 0.45); ctx.lineTo(0, -R * 0.1);
  ctx.lineTo(R * 0.25, -R * 0.62); ctx.lineTo(R * 0.72, R * 0.15); ctx.closePath(); ctx.fill();
  ctx.lineWidth = R * 0.08; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const y = R * (0.32 + i * 0.17);
    const half = R * (0.62 - i * 0.12);
    ctx.beginPath(); ctx.moveTo(-half, y);
    ctx.bezierCurveTo(-half * 0.4, y - R * 0.08, half * 0.1, y + R * 0.08, half, y); ctx.stroke();
  }
  ctx.restore();
}

// Name plaque (gaku): gold frame, lacquer field, carved gilt characters. Characters fall
// back to the crest if the platform has no Japanese font (tofu would be worse than none).
export function plaqueTexture(text, vertical = false) {
  const w = vertical ? 256 : 768, h = vertical ? 768 : 256;
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1a1512'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 18; ctx.strokeRect(14, 14, w - 28, h - 28);
  ctx.strokeStyle = '#7d5f22'; ctx.lineWidth = 3; ctx.strokeRect(34, 34, w - 68, h - 68);
  const fonts = '"Hiragino Mincho ProN","Yu Mincho","YuMincho","Noto Serif JP","Noto Serif CJK JP","Source Han Serif JP","IPAMincho","IPAexMincho","MS Mincho","Noto Sans CJK JP","IPAGothic","WenQuanYi Zen Hei",serif';
  ctx.font = `600 ${vertical ? 170 : 160}px ${fonts}`;
  const hasGlyph = ctx.measureText('雲').width > 0 && ctx.measureText('雲').width !== ctx.measureText('\u{10FFFF}').width;
  ctx.fillStyle = '#d9b45c';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
  if (hasGlyph) {
    const chars = [...text];
    chars.forEach((ch, i) => {
      if (vertical) ctx.fillText(ch, w / 2, h * ((i + 0.5) / chars.length) * 0.82 + h * 0.09);
      else ctx.fillText(ch, w * ((chars.length - i - 0.5) / chars.length) * 0.82 + w * 0.09, h / 2 + 6); // read right-to-left, as old plaques do
    });
  } else {
    crest(ctx, w / 2, h / 2, Math.min(w, h) * 0.3, '#d9b45c');
  }
  return toTexture(c, { repeat: false });
}

// Bronze bell surface: casting texture + verdigris in the recesses.
export function bronzeTexture(size = 512) {
  return toTexture(paint(size, size, (u, v) => {
    const n = fbm2(u * 8, v * 8, 5, 101, 8, 8);
    const p = smoothstep(0.5, 0.8, fbm2(u * 3, v * 6, 5, 103, 3, 6));
    const b = [0.42 + n * 0.12, 0.31 + n * 0.08, 0.2 + n * 0.05];
    const g = [0.33, 0.52, 0.42];
    return [b[0] + (g[0] - b[0]) * p, b[1] + (g[1] - b[1]) * p, b[2] + (g[2] - b[2]) * p];
  }));
}

// Koi skin pattern atlas: 4 varieties in quadrants (kohaku, sanke, ogon, showa).
export function koiTexture() {
  const s = 512;
  const r = new Rng(88);
  const c = canvas(s);
  const ctx = c.getContext('2d');
  const quads = [
    { base: '#f4efe6', spots: ['#d9361c'], n: 5 },
    { base: '#f2ede4', spots: ['#d13a1d', '#141210'], n: 7 },
    { base: '#e8b54a', spots: ['#f6d77c'], n: 3 },
    { base: '#171412', spots: ['#e04a21', '#f1ebe1'], n: 8 },
  ];
  quads.forEach((q, i) => {
    const ox = (i % 2) * s / 2, oy = Math.floor(i / 2) * s / 2;
    ctx.fillStyle = q.base; ctx.fillRect(ox, oy, s / 2, s / 2);
    for (let k = 0; k < q.n; k++) {
      ctx.fillStyle = r.pick(q.spots);
      ctx.beginPath();
      ctx.ellipse(ox + r.range(0.15, 0.85) * s / 2, oy + r.range(0.2, 0.8) * s / 2, r.range(0.06, 0.16) * s / 2, r.range(0.05, 0.12) * s / 2, r.f() * 3, 0, TAU);
      ctx.fill();
    }
  });
  return toTexture(c, { repeat: false });
}
