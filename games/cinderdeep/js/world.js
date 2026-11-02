'use strict';
// A live room: mutable tiles, collision queries, static light sources and the cached terrain chunks.

function strHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

class Room {
  constructor(def, save) {
    this.def = def; this.id = def.id; this.w = def.w; this.h = def.h; this.biome = def.biome;
    this.B = BIOMES[def.biome];
    this.seed = strHash(def.id) % 100000;
    this.t = def.map.map((r) => r.split(''));
    this.spawns = [];
    this.candles = [];
    this.molten = [];
    this.walls = [];
    this.gates = [];
    this.flames = [];
    this.chunks = new Map();
    this.chunkScale = 0;

    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const c = this.t[y][x];
      if ('@SDHEckwtuiX'.includes(c)) {
        this.t[y][x] = '.';
        if (c === 'i') this.addCandle(x, y, true);
        else this.spawns.push({ c, x, y });
      }
    }
    // Breakable walls, grouped by column runs.
    const seen = new Set();
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const key = x + ',' + y;
      if (this.t[y][x] !== 'B' || seen.has(key)) continue;
      const wall = { tiles: [], hp: 3, shake: 0, id: def.id + ':' + key };
      let yy = y;
      while (yy < this.h && this.t[yy][x] === 'B') { wall.tiles.push([x, yy]); seen.add(x + ',' + yy); yy++; }
      if (save && save.broken && save.broken[wall.id]) { for (const [tx, ty] of wall.tiles) this.t[ty][tx] = '.'; }
      else this.walls.push(wall);
    }
    // Gates
    const gseen = new Set();
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.t[y][x] !== 'G' || gseen.has(x + ',' + y)) continue;
      const gate = { x, y0: y, y1: y, closed: false, open: 1 };
      while (gate.y1 + 1 < this.h && this.t[gate.y1 + 1][x] === 'G') gate.y1++;
      for (let k = gate.y0; k <= gate.y1; k++) gseen.add(x + ',' + k);
      this.gates.push(gate);
    }
    // Molten pools and their glow
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.t[y][x] === '~') this.molten.push([x, y]);
    // Contiguous runs, so a pool draws as one surface with no seams between tiles.
    this.moltenSpans = [];
    for (const [x, y] of this.molten) {
      const last = this.moltenSpans[this.moltenSpans.length - 1];
      if (last && last[2] === y && last[1] === x - 1) last[1] = x; else this.moltenSpans.push([x, x, y]);
    }
    // Scatter a few extra candles on open ledges so every room has warm pockets of light.
    let extra = 0;
    for (let y = 1; y < this.h; y++) for (let x = 1; x < this.w - 1; x++) {
      if (extra >= Math.ceil(this.w / 14)) break;
      if (this.t[y][x] === '#' && this.t[y - 1][x] === '.' && this.t[y - 1][x - 1] === '.' && this.t[y - 1][x + 1] === '.' &&
          this.t[y][x - 1] === '#' && this.t[y][x + 1] === '#' && hash2(x, y, this.seed + 7) < 0.045 &&
          !this.spawns.some((s) => Math.abs(s.x - x) < 3 && Math.abs(s.y - (y - 1)) < 2)) {
        this.addCandle(x, y - 1, false); extra++;
      }
    }
    this.buildFG();
  }

  addCandle(x, y, big) {
    const n = big ? 2 + ((hash2(x, y, this.seed) * 2) | 0) : 1 + ((hash2(x, y, this.seed) * 2) | 0);
    const cd = { x: x * T + T / 2, y: (y + 1) * T, sticks: [], spread: 6 + n * 2 };
    for (let k = 0; k < n; k++) {
      const s = { dx: (k - (n - 1) / 2) * 6 + (hash2(x, k, this.seed + 3) - 0.5) * 2, w: 4 + hash2(x, k, this.seed + 4) * 2, h: 7 + hash2(x, k, this.seed + 5) * (big ? 14 : 9) };
      cd.sticks.push(s);
      this.flames.push({ x: cd.x + s.dx, y: cd.y - s.h - 3, ph: hash2(x, k, this.seed + 6) * 10, size: 1 });
    }
    this.candles.push(cd);
  }

  buildFG() {
    // Foreground silhouettes that drift faster than the world, framing the screen edges.
    this.fg = [];
    const rnd = mulberry32(this.seed + 99);
    let x = 120 + rnd() * 200;
    const W = this.w * T;
    while (x < W + 200) {
      const top = rnd() < 0.55;
      this.fg.push({ x, top, kind: top ? (rnd() < 0.6 ? 'roots' : 'chain') : 'mound', size: 0.7 + rnd() * 0.6, seed: (rnd() * 1e6) | 0 });
      x += 420 + rnd() * 520;
    }
  }

  inside(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  ch(x, y) {
    x = x < 0 ? 0 : x >= this.w ? this.w - 1 : x;
    y = y < 0 ? 0 : y >= this.h ? this.h - 1 : y;
    return this.t[y][x];
  }
  rock(x, y) { return this.ch(x, y) === '#'; }
  solid(x, y) {
    const c = this.ch(x, y);
    if (c === '#' || c === 'B') return true;
    if (c === 'G') { const g = this.gateAt(x); return g ? g.closed : true; }
    return false;
  }
  gateAt(x) { for (const g of this.gates) if (g.x === x) return g; return null; }
  solidPx(px, py) { return this.solid(Math.floor(px / T), Math.floor(py / T)); }

  wallAt(tx, ty) {
    for (const w of this.walls) for (const [x, y] of w.tiles) if (x === tx && y === ty) return w;
    return null;
  }

  breakWall(w, save) {
    for (const [x, y] of w.tiles) this.t[y][x] = '.';
    this.walls.splice(this.walls.indexOf(w), 1);
    if (save) { save.broken = save.broken || {}; save.broken[w.id] = 1; }
  }

  // Is there a straight, unobstructed line between two points?
  clearLine(x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 12);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (this.solidPx(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
    }
    return true;
  }

  // Terrain chunk cache, rebuilt when the render scale changes.
  chunk(cx, cy, scale) {
    if (scale !== this.chunkScale) { this.chunks.clear(); this.chunkScale = scale; }
    const key = cx + ',' + cy;
    let c = this.chunks.get(key);
    if (!c) { c = Art.renderChunk(this, cx, cy, CHUNK, scale); this.chunks.set(key, c); }
    return c;
  }
  prewarm(scale) {
    for (let cy = 0; cy * CHUNK < this.h * T; cy++) for (let cx = 0; cx * CHUNK < this.w * T; cx++) this.chunk(cx, cy, scale);
  }
}
const CHUNK = 512;

// ---------- Collision ----------
// Entities are axis-aligned boxes: x, y (top-left), w, h, vx, vy.
function moveX(room, e, dx) {
  if (!dx) return 0;
  e.x += dx;
  const y0 = Math.floor(e.y / T), y1 = Math.floor((e.y + e.h - 0.01) / T);
  if (dx > 0) {
    const tx = Math.floor((e.x + e.w - 0.01) / T);
    for (let ty = y0; ty <= y1; ty++) if (room.solid(tx, ty)) { e.x = tx * T - e.w; return 1; }
  } else {
    const tx = Math.floor(e.x / T);
    for (let ty = y0; ty <= y1; ty++) if (room.solid(tx, ty)) { e.x = (tx + 1) * T; return -1; }
  }
  return 0;
}

function moveY(room, e, dy, oneWay = true) {
  if (!dy) return 0;
  const oldBottom = e.y + e.h;
  e.y += dy;
  const x0 = Math.floor(e.x / T), x1 = Math.floor((e.x + e.w - 0.01) / T);
  if (dy > 0) {
    const ty = Math.floor((e.y + e.h - 0.01) / T);
    for (let tx = x0; tx <= x1; tx++) {
      if (room.solid(tx, ty) || (oneWay && !e.dropping && room.ch(tx, ty) === '-' && oldBottom <= ty * T + 0.5)) {
        e.y = ty * T - e.h; return 1;
      }
    }
  } else {
    const ty = Math.floor(e.y / T);
    for (let tx = x0; tx <= x1; tx++) if (room.solid(tx, ty)) { e.y = (ty + 1) * T; return -1; }
  }
  return 0;
}

// Ground directly under a box (for ledge checks).
function groundAt(room, px, py) {
  const tx = Math.floor(px / T), ty = Math.floor(py / T);
  return room.solid(tx, ty) || room.ch(tx, ty) === '-';
}

function onOneWay(room, e) {
  const ty = Math.floor((e.y + e.h + 1) / T);
  const x0 = Math.floor(e.x / T), x1 = Math.floor((e.x + e.w - 0.01) / T);
  let any = false;
  for (let tx = x0; tx <= x1; tx++) {
    if (room.solid(tx, ty)) return false;
    if (room.ch(tx, ty) === '-') any = true;
  }
  return any;
}

// What hazard (if any) is this box touching?
function hazardAt(room, e) {
  const x0 = Math.floor((e.x + 2) / T), x1 = Math.floor((e.x + e.w - 2) / T);
  const y0 = Math.floor(e.y / T), y1 = Math.floor((e.y + e.h - 0.01) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const c = room.ch(tx, ty);
    if (c === '^' && e.y + e.h > ty * T + T * 0.45) return '^';
    if (c === '~' && e.y + e.h > ty * T + 8) return '~';
  }
  return null;
}

// ---------- Particles (fixed pool, no allocation during play) ----------
const P_SPARK = 0, P_EMBER = 1, P_SMOKE = 2, P_CHUNK = 3, P_DUST = 4, P_WAX = 5, P_GLINT = 6;
const Particles = (() => {
  const N = 420;
  const pool = [];
  for (let i = 0; i < N; i++) pool.push({ on: false, k: 0, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 1, g: 0, drag: 0, col: '#fff', rot: 0, vr: 0 });
  let cursor = 0, limit = N;
  function spawn(k, x, y, vx, vy, life, size, g = 0, drag = 0, col = '#fff') {
    for (let n = 0; n < limit; n++) {
      cursor = (cursor + 1) % limit;
      const p = pool[cursor];
      if (!p.on) {
        p.on = true; p.k = k; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.max = life;
        p.size = size; p.g = g; p.drag = drag; p.col = col; p.rot = Math.random() * TAU; p.vr = rr(-8, 8);
        return p;
      }
    }
    return null;
  }
  function update(dt) {
    for (let i = 0; i < limit; i++) {
      const p = pool[i];
      if (!p.on) continue;
      p.life -= dt;
      if (p.life <= 0) { p.on = false; continue; }
      p.vy += p.g * dt;
      if (p.drag) { const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy *= d; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.k === P_EMBER) p.vx += Math.sin((p.life + i) * 6) * 30 * dt;
    }
  }
  // pass 0 = matte (before lighting), 1 = emissive (after lighting, additive)
  function draw(ctx, pass, view) {
    const x0 = view.x - 40, y0 = view.y - 40, x1 = view.x + view.w + 40, y1 = view.y + view.h + 40;
    for (let i = 0; i < limit; i++) {
      const p = pool[i];
      if (!p.on || p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
      const t = p.life / p.max;
      if (pass === 0) {
        if (p.k === P_SMOKE) {
          const s = p.size * (1.8 - t);
          ctx.globalAlpha = t * 0.8; ctx.drawImage(Art.smoke, p.x - s, p.y - s, s * 2, s * 2);
        } else if (p.k === P_DUST) {
          const s = p.size * (1.6 - t * 0.6);
          ctx.globalAlpha = t * 0.55; ctx.drawImage(Art.dust, p.x - s, p.y - s, s * 2, s * 2);
        } else if (p.k === P_CHUNK) {
          ctx.globalAlpha = Math.min(1, t * 3); ctx.fillStyle = p.col;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7); ctx.restore();
        } else if (p.k === P_WAX) {
          ctx.globalAlpha = Math.min(1, t * 2); ctx.drawImage(Art.wax, p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
        }
      } else {
        if (p.k === P_SPARK) {
          ctx.globalAlpha = Math.min(1, t * 1.6); ctx.strokeStyle = p.col; ctx.lineWidth = p.size;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.025, p.y - p.vy * 0.025); ctx.stroke();
        } else if (p.k === P_EMBER || p.k === P_GLINT) {
          const s = p.size * (p.k === P_GLINT ? 1 : 0.6 + t * 0.6);
          ctx.globalAlpha = p.k === P_GLINT ? Math.sin(t * Math.PI) : Math.min(1, t * 2);
          ctx.drawImage(Art.ember, p.x - s, p.y - s, s * 2, s * 2);
        }
      }
    }
    ctx.globalAlpha = 1;
  }
  function clear() { for (const p of pool) p.on = false; }
  function setLimit(n) { limit = Math.min(N, n); for (let i = limit; i < N; i++) pool[i].on = false; cursor = 0; }
  return { spawn, update, draw, clear, setLimit };
})();

// Convenience bursts
const FX = {
  sparks(x, y, n, dir = 0, spread = Math.PI, speed = 420, col = '#ffe2a8') {
    for (let i = 0; i < n; i++) {
      const a = dir + rr(-spread, spread) * 0.5, s = speed * rr(0.35, 1);
      Particles.spawn(P_SPARK, x, y, Math.cos(a) * s, Math.sin(a) * s, rr(0.12, 0.32), rr(1, 2.2), 600, 3, col);
    }
  },
  embers(x, y, n, spread = 60) {
    for (let i = 0; i < n; i++) Particles.spawn(P_EMBER, x + rr(-spread, spread) * 0.2, y + rr(-8, 8), rr(-spread, spread), rr(-140, -30), rr(0.5, 1.4), rr(2, 4), -40, 1.5);
  },
  smoke(x, y, n, size = 10, up = -30) {
    for (let i = 0; i < n; i++) Particles.spawn(P_SMOKE, x + rr(-6, 6), y + rr(-6, 6), rr(-25, 25), up + rr(-20, 10), rr(0.6, 1.2), size * rr(0.7, 1.3), 0, 1.2);
  },
  dust(x, y, n, dir = 0) {
    for (let i = 0; i < n; i++) Particles.spawn(P_DUST, x + rr(-8, 8), y - rr(0, 4), rr(-80, 80) + dir * 60, rr(-50, -5), rr(0.3, 0.6), rr(4, 8), 60, 4);
  },
  chunks(x, y, n, col, speed = 260) {
    for (let i = 0; i < n; i++) {
      const a = rr(0, TAU), s = rr(0.3, 1) * speed;
      Particles.spawn(P_CHUNK, x, y, Math.cos(a) * s, Math.sin(a) * s - 120, rr(0.6, 1.1), rr(2, 5), 1300, 0.8, col);
    }
  },
  wax(x, y, n, speed = 240) {
    for (let i = 0; i < n; i++) {
      const a = rr(0, TAU), s = rr(0.3, 1) * speed;
      Particles.spawn(P_WAX, x, y, Math.cos(a) * s, Math.sin(a) * s - 100, rr(0.4, 0.9), rr(1.5, 3.5), 1200, 0.5);
    }
  },
};
