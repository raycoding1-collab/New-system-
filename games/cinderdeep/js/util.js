'use strict';
// Shared constants and small helpers. Every script is a classic script, so these are globals.

const T = 32;            // tile size in world units
const STEP = 1 / 120;    // fixed simulation step (smooth on 60 Hz and 120 Hz screens)
const TAU = Math.PI * 2;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const approach = (v, target, d) => (v < target ? Math.min(v + d, target) : Math.max(v - d, target));
const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
const rr = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const easeOut = (t) => 1 - (1 - t) * (1 - t) * (1 - t);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Deterministic hash in [0,1) for procedural art that must look the same every time it is drawn.
function hash2(x, y, s) {
  let h = (x * 374761393 + y * 668265263 + (s | 0) * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

// Storage can throw in private windows or sandboxed frames; the game must run without it.
const Store = {
  get(key) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  },
  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* storage unavailable */ }
  },
  del(key) {
    try { localStorage.removeItem(key); } catch (e) { /* storage unavailable */ }
  },
};

const QS = new URLSearchParams(location.search);
const DEBUG = QS.has('debug');
// ?seed=N makes every random choice repeatable, so an autopilot run can be replayed exactly.
if (QS.has('seed')) Math.random = mulberry32(parseInt(QS.get('seed'), 10) || 1);
