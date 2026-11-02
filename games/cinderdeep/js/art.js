'use strict';
// Procedural art. Everything static is drawn once into offscreen canvases (sprites, parallax layers,
// terrain chunks) so a frame on a phone is mostly cheap drawImage calls.

const FONT_DISPLAY = "'IM Fell English SC', 'Iowan Old Style', 'Palatino Linotype', Georgia, serif";
const FONT_BODY = "'Cormorant Garamond', 'Iowan Old Style', 'Palatino Linotype', Georgia, serif";

const Art = {
  glow: {},
  init() {
    const R = (size, stops) => {
      const c = makeCanvas(size, size), g = c.getContext('2d');
      const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      for (const [o, col] of stops) gr.addColorStop(o, col);
      g.fillStyle = gr; g.fillRect(0, 0, size, size);
      return c;
    };
    // Light mask: punched out of the darkness layer.
    this.light = R(128, [[0, 'rgba(255,255,255,1)'], [0.28, 'rgba(255,255,255,0.88)'], [0.62, 'rgba(255,255,255,0.32)'], [1, 'rgba(255,255,255,0)']]);
    // Additive glows.
    this.glow.warm = R(128, [[0, 'rgba(255,196,120,0.85)'], [0.22, 'rgba(255,146,60,0.42)'], [0.6, 'rgba(255,104,36,0.1)'], [1, 'rgba(255,90,30,0)']]);
    this.glow.hot = R(64, [[0, 'rgba(255,250,228,1)'], [0.3, 'rgba(255,222,150,0.6)'], [1, 'rgba(255,170,80,0)']]);
    this.glow.red = R(128, [[0, 'rgba(255,120,80,0.8)'], [0.3, 'rgba(230,60,30,0.35)'], [1, 'rgba(200,30,20,0)']]);
    this.glow.cold = R(128, [[0, 'rgba(200,225,255,0.8)'], [0.3, 'rgba(130,170,255,0.3)'], [1, 'rgba(90,120,255,0)']]);
    this.glow.molten = R(128, [[0, 'rgba(255,170,70,0.75)'], [0.35, 'rgba(255,100,30,0.28)'], [1, 'rgba(255,60,20,0)']]);
    this.glow.teal = R(128, [[0, 'rgba(190,255,230,0.7)'], [0.35, 'rgba(120,230,200,0.25)'], [1, 'rgba(80,200,170,0)']]);
    this.smoke = R(32, [[0, 'rgba(16,15,22,0.85)'], [0.6, 'rgba(16,15,22,0.35)'], [1, 'rgba(16,15,22,0)']]);
    this.dust = R(32, [[0, 'rgba(200,190,178,0.6)'], [1, 'rgba(200,190,178,0)']]);
    this.ember = R(16, [[0, 'rgba(255,244,210,1)'], [0.35, 'rgba(255,165,72,0.85)'], [1, 'rgba(255,100,30,0)']]);
    this.wax = R(16, [[0, 'rgba(240,228,205,1)'], [0.6, 'rgba(220,205,175,0.7)'], [1, 'rgba(200,185,150,0)']]);
  },

  vignette(w, h) {
    const c = makeCanvas(w, h), g = c.getContext('2d');
    const gr = g.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.25, w / 2, h / 2, Math.hypot(w, h) * 0.6);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(0.6, 'rgba(0,0,0,0.25)');
    gr.addColorStop(1, 'rgba(0,0,0,0.78)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    return c;
  },

  raySprite(color) {
    const c = makeCanvas(64, 512), g = c.getContext('2d');
    const h = g.createLinearGradient(0, 0, 64, 0);
    h.addColorStop(0, 'rgba(255,255,255,0)'); h.addColorStop(0.5, 'rgba(255,255,255,1)'); h.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = h; g.fillRect(0, 0, 64, 512);
    g.globalCompositeOperation = 'destination-in';
    const v = g.createLinearGradient(0, 0, 0, 512);
    v.addColorStop(0, 'rgba(0,0,0,1)'); v.addColorStop(0.55, 'rgba(0,0,0,0.45)'); v.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = v; g.fillRect(0, 0, 64, 512);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color; g.fillRect(0, 0, 64, 512);
    return c;
  },

  // ---------------- Terrain chunks ----------------
  renderChunk(room, cx, cy, size, s) {
    const B = BIOMES[room.biome];
    const c = makeCanvas(size * s, size * s), g = c.getContext('2d');
    g.setTransform(s, 0, 0, s, -cx * size * s, -cy * size * s);
    const tx0 = Math.floor((cx * size) / T) - 2, tx1 = Math.ceil(((cx + 1) * size) / T) + 2;
    const ty0 = Math.floor((cy * size) / T) - 2, ty1 = Math.ceil(((cy + 1) * size) / T) + 2;
    const seed = room.seed;
    const S = (x, y) => room.rock(x, y);

    // 1. Solid body
    g.fillStyle = B.fill[2];
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
      if (x < 0 || y < 0 || x >= room.w || y >= room.h) continue;
      if (S(x, y)) g.fillRect(x * T - 0.5, y * T - 0.5, T + 1, T + 1);
    }
    // 2. Inner glow along exposed faces, giving the rock a lit rim and a dark core
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
      if (x < 0 || y < 0 || x >= room.w || y >= room.h || !S(x, y)) continue;
      const X = x * T, Y = y * T, d = 18;
      const band = (gx0, gy0, gx1, gy1, rx, ry, rw, rh, a) => {
        const gr = g.createLinearGradient(gx0, gy0, gx1, gy1);
        gr.addColorStop(0, hexA(B.fill[0], a)); gr.addColorStop(1, hexA(B.fill[0], 0));
        g.fillStyle = gr; g.fillRect(rx, ry, rw, rh);
      };
      if (!S(x, y - 1)) band(0, Y, 0, Y + d, X, Y, T, d, 1);
      if (!S(x, y + 1)) band(0, Y + T, 0, Y + T - d, X, Y + T - d, T, d, 0.7);
      if (!S(x - 1, y)) band(X, 0, X + d, 0, X, Y, d, T, 0.85);
      if (!S(x + 1, y)) band(X + T, 0, X + T - d, 0, X + T - d, Y, d, T, 0.85);
    }
    // 3. Texture: stones and hairline cracks
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
      if (x < 0 || y < 0 || x >= room.w || y >= room.h || !S(x, y)) continue;
      const h = hash2(x, y, seed);
      if (h < 0.55) {
        g.fillStyle = hexA(B.fill[1], 0.9);
        const sx = x * T + 4 + hash2(x, y, seed + 1) * 20, sy = y * T + 4 + hash2(x, y, seed + 2) * 20;
        const r = 3 + hash2(x, y, seed + 3) * 6;
        g.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * TAU, rr2 = r * (0.7 + hash2(x + k, y, seed + 4) * 0.5);
          const px2 = sx + Math.cos(a) * rr2, py2 = sy + Math.sin(a) * rr2 * 0.75;
          if (k === 0) g.moveTo(px2, py2); else g.lineTo(px2, py2);
        }
        g.closePath(); g.fill();
      }
      if (h > 0.8) {
        g.strokeStyle = hexA(B.fill[0], 0.9); g.lineWidth = 1;
        g.beginPath();
        let px2 = x * T + hash2(x, y, seed + 5) * T, py2 = y * T + hash2(x, y, seed + 6) * T;
        g.moveTo(px2, py2);
        for (let k = 0; k < 3; k++) { px2 += (hash2(x, y, seed + 7 + k) - 0.5) * 16; py2 += 4 + hash2(x, y, seed + 9 + k) * 6; g.lineTo(px2, py2); }
        g.stroke();
      }
    }
    // 3b. Strata: faint layered bands whose curve depends only on world position, so they run on across
    //     neighbouring tiles and chunks.
    g.lineWidth = 1;
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
      if (x < 0 || y < 0 || x >= room.w || y >= room.h || !S(x, y)) continue;
      if (hash2(x >> 1, y, seed + 15) < 0.35) continue;
      const X = x * T, Y = y * T;
      for (let k = 0; k < 3; k++) {
        const base = Y + 5 + k * 11;
        g.strokeStyle = hexA(k === 1 ? B.fill[0] : B.fill[1], 0.8);
        g.beginPath();
        for (let i = 0; i <= 4; i++) { const px2 = X + i * 8; const py2 = base + Math.sin(px2 * 0.045 + y * 1.7) * 2.2; i ? g.lineTo(px2, py2) : g.moveTo(px2, py2); }
        g.stroke();
      }
    }
    // 4. Organic edges with a rim light. Jitter is hashed on world vertex positions so neighbouring
    //    tiles (and neighbouring chunks) agree on shared points.
    const J = (px2, py2, k) => hash2(px2 | 0, py2 | 0, seed + k);
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
      if (x < 0 || y < 0 || x >= room.w || y >= room.h || !S(x, y)) continue;
      const X = x * T, Y = y * T;
      if (!S(x, y - 1)) {
        const pts = [];
        for (let i = 0; i <= 4; i++) { const px2 = X + i * 8; pts.push([px2, Y - J(px2, Y, 11) * 4]); }
        g.fillStyle = B.fill[0];
        g.beginPath(); g.moveTo(X, Y + 3); for (const p of pts) g.lineTo(p[0], p[1]); g.lineTo(X + T, Y + 3); g.closePath(); g.fill();
        g.strokeStyle = hexA(B.top, 0.85); g.lineWidth = 1.6;
        g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
        g.strokeStyle = hexA(B.edge, 0.35); g.lineWidth = 3;
        g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1] + 2.5) : g.moveTo(p[0], p[1] + 2.5))); g.stroke();
      }
      if (!S(x, y + 1)) {
        g.fillStyle = B.fill[0];
        g.beginPath(); g.moveTo(X, Y + T - 2);
        for (let i = 0; i <= 4; i++) { const px2 = X + i * 8; g.lineTo(px2, Y + T + J(px2, Y + T, 12) * 3); }
        g.lineTo(X + T, Y + T - 2); g.closePath(); g.fill();
        g.strokeStyle = hexA(B.edge, 0.3); g.lineWidth = 1;
        g.beginPath();
        for (let i = 0; i <= 4; i++) { const px2 = X + i * 8, py2 = Y + T + J(px2, Y + T, 12) * 3; i ? g.lineTo(px2, py2) : g.moveTo(px2, py2); }
        g.stroke();
      }
      for (const side of [-1, 1]) {
        if (S(x + side, y)) continue;
        const ex = side < 0 ? X : X + T;
        g.fillStyle = B.fill[0];
        g.beginPath(); g.moveTo(ex - side * 3, Y);
        for (let i = 0; i <= 4; i++) { const py2 = Y + i * 8; g.lineTo(ex + side * J(ex, py2, 13) * 3.5, py2); }
        g.lineTo(ex - side * 3, Y + T); g.closePath(); g.fill();
        g.strokeStyle = hexA(B.edge, 0.55); g.lineWidth = 1.2;
        g.beginPath();
        for (let i = 0; i <= 4; i++) { const py2 = Y + i * 8, px2 = ex + side * J(ex, py2, 13) * 3.5; i ? g.lineTo(px2, py2) : g.moveTo(px2, py2); }
        g.stroke();
      }
    }
    // 5. Decorations: pale wick-grass and wax lumps on tops, drips and roots under ceilings
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
      if (x < 0 || y < 0 || x >= room.w || y >= room.h || !S(x, y)) continue;
      const X = x * T, Y = y * T;
      const up = y > 0 && room.ch(x, y - 1);
      if (!S(x, y - 1) && up !== '^' && up !== '~') {
        const n = (hash2(x, y, seed + 20) * 5) | 0;
        g.strokeStyle = hexA(B.top, 0.45); g.lineWidth = 1;
        for (let k = 0; k < n; k++) {
          const gx = X + 2 + hash2(x, y, seed + 21 + k) * (T - 4), gh = 3 + hash2(x, y, seed + 30 + k) * 7;
          const lean = (hash2(x, y, seed + 40 + k) - 0.5) * 6;
          g.beginPath(); g.moveTo(gx, Y - 1); g.quadraticCurveTo(gx + lean * 0.3, Y - gh * 0.6, gx + lean, Y - gh); g.stroke();
        }
        if (hash2(x, y, seed + 50) > 0.86) {
          g.fillStyle = hexA(B.wax, 0.55);
          const lx = X + 6 + hash2(x, y, seed + 51) * 18;
          g.beginPath(); g.ellipse(lx, Y - 2, 4 + hash2(x, y, seed + 52) * 4, 3, 0, Math.PI, 0); g.fill();
        }
      }
      if (!S(x, y + 1) && y + 1 < room.h) {
        const h = hash2(x, y, seed + 60);
        if (h > 0.55) {
          const n = 1 + ((h * 10) | 0) % 2;
          for (let k = 0; k < n; k++) {
            const dx = X + 4 + hash2(x, y, seed + 61 + k) * (T - 8), len = 5 + hash2(x, y, seed + 63 + k) * 16, w = 2 + hash2(x, y, seed + 65 + k) * 3;
            g.fillStyle = B.fill[0];
            g.beginPath(); g.moveTo(dx - w, Y + T);
            g.quadraticCurveTo(dx - w * 0.4, Y + T + len * 0.7, dx, Y + T + len);
            g.quadraticCurveTo(dx + w * 0.4, Y + T + len * 0.7, dx + w, Y + T); g.fill();
            g.fillStyle = hexA(B.wax, 0.28);
            g.beginPath(); g.arc(dx, Y + T + len - 1.5, 1.4, 0, TAU); g.fill();
          }
        }
        if (h < 0.05) {
          // Hanging chain
          const len = 40 + hash2(x, y, seed + 70) * 70, cxp = X + T / 2;
          g.strokeStyle = hexA(B.edge, 0.4); g.lineWidth = 1.6;
          for (let k = 0; k < len; k += 9) {
            g.beginPath();
            if ((k / 9) % 2 === 0) g.ellipse(cxp, Y + T + k + 4.5, 2, 5, 0, 0, TAU); else { g.moveTo(cxp, Y + T + k); g.lineTo(cxp, Y + T + k + 9); }
            g.stroke();
          }
        }
      }
    }
    // 5b. Moss and fungus on ledges, crystals on walls, long wax stalactites and roots under ceilings
    const moss = MOSS[room.biome], crystal = CRYSTAL[room.biome], glow = GLOW[room.biome];
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
      if (x < 0 || y < 0 || x >= room.w || y >= room.h || !S(x, y)) continue;
      const X = x * T, Y = y * T;
      const above = room.ch(x, y - 1);
      if (y > 0 && !S(x, y - 1) && above !== '^' && above !== '~' && above !== '-') {
        const h = hash2(x, y, seed + 100);
        if (h < 0.42) {
          const n = 2 + ((h * 10) | 0) % 3;
          for (let k = 0; k < n; k++) {
            const mx = X + 3 + hash2(x, y + k, seed + 101) * (T - 6), mr = 3 + hash2(x + k, y, seed + 102) * 5;
            g.fillStyle = moss; g.beginPath(); g.ellipse(mx, Y - 1, mr, mr * 0.7, 0, Math.PI, 0); g.fill();
            g.fillStyle = hexA(B.top, 0.35); g.beginPath(); g.ellipse(mx - mr * 0.2, Y - mr * 0.45, mr * 0.45, mr * 0.18, 0, 0, TAU); g.fill();
          }
        }
        if (h > 0.9) {
          // a small mushroom; in the caverns its cap glows
          const mx = X + 6 + hash2(x, y, seed + 103) * 20, mh = 6 + hash2(x, y, seed + 104) * 7;
          g.strokeStyle = hexA(B.wax, 0.7); g.lineWidth = 1.6;
          g.beginPath(); g.moveTo(mx, Y); g.quadraticCurveTo(mx + 1, Y - mh * 0.5, mx, Y - mh); g.stroke();
          if (room.biome === 'drip') { const gr = g.createRadialGradient(mx, Y - mh, 0, mx, Y - mh, 14); gr.addColorStop(0, `rgba(${glow},0.55)`); gr.addColorStop(1, `rgba(${glow},0)`); g.fillStyle = gr; g.fillRect(mx - 14, Y - mh - 14, 28, 28); }
          g.fillStyle = room.biome === 'drip' ? `rgb(${glow})` : hexA(B.wax, 0.85);
          g.beginPath(); g.ellipse(mx, Y - mh, 4.5, 2.6, 0, Math.PI, 0); g.fill();
        }
      }
      for (const side of [-1, 1]) {
        if (S(x + side, y) || hash2(x * side, y, seed + 110) > 0.035) continue;
        const ex = side < 0 ? X : X + T, cy2 = Y + 8 + hash2(x, y, seed + 111) * 16;
        for (let k = 0; k < 3; k++) {
          // short, upward-leaning shards in the area's tint, so they never read as thorns
          const len = 5 + hash2(x, y + k, seed + 112) * 5, a = -0.9 + (k - 1) * 0.35;
          const tx2 = ex + side * Math.cos(a) * len, ty2 = cy2 + Math.sin(a) * len - 3;
          g.fillStyle = hexA(crystal, 0.4);
          g.beginPath(); g.moveTo(ex, cy2 - 3 + k * 2); g.lineTo(tx2, ty2); g.lineTo(ex, cy2 + 2 + k * 2); g.closePath(); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.18)';
          g.beginPath(); g.moveTo(ex, cy2 - 3 + k * 2); g.lineTo(tx2, ty2); g.lineTo(ex, cy2 - 1 + k * 2); g.closePath(); g.fill();
        }
      }
      if (y + 1 < room.h && !S(x, y + 1) && room.ch(x, y + 1) !== '-') {
        const h = hash2(x, y, seed + 120);
        if (h < 0.1) {
          const sx = X + 6 + hash2(x, y, seed + 121) * 20, len = 26 + hash2(x, y, seed + 122) * 40, w = 8 + hash2(x, y, seed + 123) * 8;
          const gr = g.createLinearGradient(0, Y + T, 0, Y + T + len);
          gr.addColorStop(0, B.fill[0]); gr.addColorStop(0.7, B.fill[1]); gr.addColorStop(1, hexA(B.wax, 0.6));
          g.fillStyle = gr;
          g.beginPath(); g.moveTo(sx - w / 2, Y + T - 1); g.quadraticCurveTo(sx - w * 0.15, Y + T + len * 0.6, sx, Y + T + len);
          g.quadraticCurveTo(sx + w * 0.15, Y + T + len * 0.6, sx + w / 2, Y + T - 1); g.closePath(); g.fill();
          g.strokeStyle = hexA(B.edge, 0.35); g.lineWidth = 1;
          g.beginPath(); g.moveTo(sx - w / 2 + 1, Y + T); g.quadraticCurveTo(sx - w * 0.15, Y + T + len * 0.6, sx, Y + T + len); g.stroke();
        } else if (room.biome === 'drip' && h > 0.86) {
          const rx = X + 8 + hash2(x, y, seed + 124) * 16, len = 20 + hash2(x, y, seed + 125) * 50;
          g.strokeStyle = B.fill[0]; g.lineWidth = 2.2;
          g.beginPath(); g.moveTo(rx, Y + T);
          for (let k = 0; k <= len; k += 6) g.lineTo(rx + Math.sin(k * 0.12 + x) * 3, Y + T + k);
          g.stroke();
        }
      }
    }
    // 6. Thorns, ledges and candles
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
      if (x < 0 || y < 0 || x >= room.w || y >= room.h) continue;
      const ch = room.ch(x, y), X = x * T, Y = y * T;
      if (ch === '^') {
        const n = 4;
        for (let k = 0; k < n; k++) {
          const bx = X + (k + 0.5) * (T / n) + (hash2(x, k, seed + 80) - 0.5) * 3;
          const ht = 12 + hash2(x, k, seed + 81) * 10, bw = 5 + hash2(x, k, seed + 82) * 3;
          const lean = (hash2(x, k, seed + 83) - 0.5) * 5;
          const gr = g.createLinearGradient(0, Y + T, 0, Y + T - ht);
          gr.addColorStop(0, B.fill[2]); gr.addColorStop(0.55, hexA(B.wax, 0.55)); gr.addColorStop(1, B.wax);
          g.fillStyle = gr;
          g.beginPath(); g.moveTo(bx - bw, Y + T + 1); g.quadraticCurveTo(bx - bw * 0.2, Y + T - ht * 0.5, bx + lean, Y + T - ht);
          g.quadraticCurveTo(bx + bw * 0.2, Y + T - ht * 0.5, bx + bw, Y + T + 1); g.fill();
        }
      } else if (ch === '-') {
        const l = room.ch(x - 1, y) !== '-', r = room.ch(x + 1, y) !== '-';
        g.fillStyle = B.fill[0];
        g.fillRect(X - (l ? 2 : 0), Y, T + (l ? 2 : 0) + (r ? 2 : 0), 8);
        g.fillStyle = hexA(B.top, 0.7); g.fillRect(X - (l ? 2 : 0), Y, T + (l ? 2 : 0) + (r ? 2 : 0), 1.5);
        g.fillStyle = hexA(B.edge, 0.4); g.fillRect(X, Y + 7, T, 1);
        // rivets
        g.fillStyle = hexA(B.edge, 0.6);
        g.fillRect(X + 6, Y + 3, 2, 2); g.fillRect(X + T - 8, Y + 3, 2, 2);
        g.fillStyle = B.fill[0];
        if (l) { g.beginPath(); g.moveTo(X + 2, Y + 8); g.lineTo(X + 10, Y + 8); g.lineTo(X + 4, Y + 20); g.closePath(); g.fill(); }
        if (r) { g.beginPath(); g.moveTo(X + T - 2, Y + 8); g.lineTo(X + T - 10, Y + 8); g.lineTo(X + T - 4, Y + 20); g.closePath(); g.fill(); }
        if (hash2(x, y, seed + 90) > 0.6) {
          const dx = X + 8 + hash2(x, y, seed + 91) * 16;
          g.fillStyle = hexA(B.wax, 0.4);
          g.beginPath(); g.moveTo(dx - 2, Y + 8); g.quadraticCurveTo(dx, Y + 18, dx, Y + 16); g.quadraticCurveTo(dx + 1, Y + 12, dx + 2, Y + 8); g.fill();
        }
      }
    }
    for (const cd of room.candles) {
      if (cd.x < tx0 * T - T || cd.x > tx1 * T + T || cd.y < ty0 * T - T || cd.y > ty1 * T + T) continue;
      drawCandleBody(g, cd, B);
    }
    return c;
  },
};

function drawCandleBody(g, cd, B) {
  for (const s of cd.sticks) {
    const x = cd.x + s.dx, base = cd.y;
    g.fillStyle = B.wax;
    g.fillRect(x - s.w / 2, base - s.h, s.w, s.h);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(x + s.w / 2 - 1.5, base - s.h, 1.5, s.h);
    g.fillStyle = B.wax;
    g.beginPath(); g.ellipse(x - s.w / 2 + 0.5, base - s.h + 4, 1.4, 3.5, 0, 0, TAU); g.fill();
    g.fillStyle = '#1a1414';
    g.fillRect(x - 0.5, base - s.h - 3, 1, 3);
  }
  // Pooled wax at the base
  g.fillStyle = B.wax;
  g.beginPath(); g.ellipse(cd.x, cd.y - 1, cd.spread, 2.5, 0, Math.PI, 0); g.fill();
}

const INK = '#07060b';
// A soft dark ellipse under a figure standing on the ground, so it sits on the floor instead of floating.
function contactShadow(ctx, x, y, w) {
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath(); ctx.ellipse(x, y - 0.5, w, w * 0.2, 0, 0, TAU); ctx.fill();
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function drawFlame(ctx, x, y, h, w, t, lean, core) {
  const fl = 1 + Math.sin(t * 17) * 0.08 + Math.sin(t * 29) * 0.05;
  const hh = h * fl, tip = lean + Math.sin(t * 9) * w * 0.25;
  ctx.fillStyle = core ? '#ffb24a' : '#ff8a2a';
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.bezierCurveTo(x - w, y - hh * 0.5, x + tip * 0.5 - w * 0.3, y - hh * 0.7, x + tip, y - hh);
  ctx.bezierCurveTo(x + tip * 0.5 + w * 0.3, y - hh * 0.7, x + w, y - hh * 0.5, x + w, y);
  ctx.arc(x, y, w, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = '#fff1c2';
  ctx.beginPath();
  ctx.moveTo(x - w * 0.5, y);
  ctx.quadraticCurveTo(x + tip * 0.3, y - hh * 0.75, x + tip * 0.45, y - hh * 0.62);
  ctx.quadraticCurveTo(x + w * 0.5, y - hh * 0.3, x + w * 0.5, y);
  ctx.arc(x, y, w * 0.5, 0, Math.PI);
  ctx.fill();
}
