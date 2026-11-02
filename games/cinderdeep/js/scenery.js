'use strict';
// Painted scenery. Each area gets three parallax layers (far, mid, near) and every room gets a back wall
// built from its own ledges and ceilings. All of it is drawn once into canvases; a frame only copies them.

const GLOW = { wicks: '255,205,140', drip: '150,240,215', hall: '255,170,105' };
const MOSS = { wicks: '#2b3858', drip: '#2a6656', hall: '#5c3828' };
const CRYSTAL = { wicks: '#a9c4ff', drip: '#9ff0d8', hall: '#ffc27a' };

function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
  const gg = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
  const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
  return '#' + ((1 << 24) | (r << 16) | (gg << 8) | bl).toString(16).slice(1);
}

function archPath(g, cx, base, w, h) {
  const r = w / 2;
  g.moveTo(cx - r, base);
  g.lineTo(cx - r, base - h + r * 1.05);
  g.quadraticCurveTo(cx - r, base - h + r * 0.12, cx, base - h);
  g.quadraticCurveTo(cx + r, base - h + r * 0.12, cx + r, base - h + r * 1.05);
  g.lineTo(cx + r, base);
  g.closePath();
}

function radial(g, x, y, r, rgb, a) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${rgb},${a})`);
  gr.addColorStop(0.4, `rgba(${rgb},${a * 0.35})`);
  gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}

// A hooded figure holding up a candle: the statues that line the city's arcades.
function statue(g, x, base, s, col, rgb) {
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(x - 14 * s, base);
  g.quadraticCurveTo(x - 15 * s, base - 40 * s, x - 9 * s, base - 62 * s);
  g.quadraticCurveTo(x - 10 * s, base - 82 * s, x, base - 86 * s);
  g.quadraticCurveTo(x + 10 * s, base - 82 * s, x + 9 * s, base - 62 * s);
  g.quadraticCurveTo(x + 15 * s, base - 40 * s, x + 14 * s, base);
  g.closePath(); g.fill();
  g.fillRect(x - 18 * s, base - 6 * s, 36 * s, 8 * s);
  g.fillRect(x + 8 * s, base - 70 * s, 4 * s, 22 * s);
  radial(g, x + 10 * s, base - 76 * s, 26 * s, rgb, 0.55);
  g.fillStyle = `rgba(${rgb},0.95)`;
  g.beginPath(); g.ellipse(x + 10 * s, base - 76 * s, 1.8 * s, 3.2 * s, 0, 0, TAU); g.fill();
}

function chain(g, x, y0, y1, col, w = 1.6) {
  g.strokeStyle = col; g.lineWidth = w;
  for (let y = y0; y < y1; y += 9) {
    g.beginPath();
    if (((y - y0) / 9) % 2 === 0) g.ellipse(x, y + 4.5, 2.2, 5, 0, 0, TAU); else { g.moveTo(x, y); g.lineTo(x, y + 9); }
    g.stroke();
  }
}

function cage(g, x, y, col, rgb, lit) {
  g.strokeStyle = col; g.lineWidth = 1.6;
  g.beginPath(); g.ellipse(x, y + 22, 11, 20, 0, 0, TAU); g.stroke();
  for (const dx of [-5, 0, 5]) { g.beginPath(); g.moveTo(x + dx, y + 3); g.lineTo(x + dx * 1.4, y + 42); g.stroke(); }
  g.fillStyle = col; g.fillRect(x - 13, y + 40, 26, 4);
  if (lit) { radial(g, x, y + 26, 40, rgb, 0.5); g.fillStyle = `rgba(${rgb},0.9)`; g.beginPath(); g.ellipse(x, y + 28, 2, 3.5, 0, 0, TAU); g.fill(); }
}

function stalactite(g, x, top, w, len, col, tip) {
  const gr = g.createLinearGradient(0, top, 0, top + len);
  gr.addColorStop(0, col); gr.addColorStop(0.75, col); gr.addColorStop(1, tip || col);
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(x - w / 2, top);
  g.quadraticCurveTo(x - w * 0.18, top + len * 0.6, x, top + len);
  g.quadraticCurveTo(x + w * 0.18, top + len * 0.6, x + w / 2, top); g.closePath(); g.fill();
}

function stalagmite(g, x, base, w, ht, col) {
  g.fillStyle = col;
  g.beginPath(); g.moveTo(x - w / 2, base);
  g.quadraticCurveTo(x - w * 0.15, base - ht * 0.7, x, base - ht);
  g.quadraticCurveTo(x + w * 0.15, base - ht * 0.7, x + w / 2, base); g.closePath(); g.fill();
}

const Scenery = {
  // --------------------------------------------------------------- parallax layers
  // Each layer tiles horizontally and is tall enough to cover the tallest room of its area, so it can be
  // anchored to the camera vertically instead of repeating. `gy` is the layer's ground line.
  layers(biomeId, viewW, viewH, px, roomH) {
    const B = BIOMES[biomeId], rgb = GLOW[biomeId];
    const rnd = mulberry32(strHash(biomeId) % 99991 + 7);
    const mk = (f, w, groundK) => {
      const travel = Math.max(0, (roomH - viewH) / 2) * f;
      const h = Math.ceil(viewH + travel * 2 + 120);
      const c = makeCanvas(w * px, h * px), g = c.getContext('2d');
      g.scale(px, px);
      return { c, g, w, h, f, gy: h / 2 + viewH * groundK };
    };
    const wrap = (L, x, span, fn) => { fn(x); if (x - span < 0) fn(x + L.w); if (x + span > L.w) fn(x - L.w); };
    const fogBand = (L, y0, y1, a) => {
      const gr = L.g.createLinearGradient(0, y0, 0, y1);
      gr.addColorStop(0, hexA(B.fog, 0)); gr.addColorStop(1, hexA(B.fog, a));
      L.g.fillStyle = gr; L.g.fillRect(0, y0, L.w, y1 - y0);
      L.g.fillStyle = hexA(B.fog, a); L.g.fillRect(0, y1, L.w, L.h - y1);
    };

    const far = mk(0.08, 1800, 0.28), mid = mk(0.26, 1400, 0.34), near = mk(0.5, 1200, 0.46);
    const farCol = mixHex(B.far, B.fog, 0.32), farRim = mixHex(farCol, B.top, 0.18);
    const midCol = B.mid, midRim = mixHex(B.mid, B.top, 0.2);
    const nearCol = B.near, nearRim = mixHex(B.near, B.top, 0.14);

    // ---------------- FAR ----------------
    {
      const L = far, g = L.g, gy = L.gy;
      for (let i = 0; i < 4; i++) radial(g, rnd() * L.w, gy - 120 - rnd() * 120, 240 + rnd() * 160, rgb, 0.07 + rnd() * 0.05);
      if (B.spire === 'gothic') {
        for (let i = 0; i < 26; i++) {
          const x = rnd() * L.w, bw = 26 + rnd() * 70, top = gy - 90 - rnd() * 260;
          wrap(L, x, bw, (xx) => {
            const gr = g.createLinearGradient(0, top - bw, 0, gy);
            gr.addColorStop(0, farRim); gr.addColorStop(0.5, farCol); gr.addColorStop(1, farCol);
            g.fillStyle = gr;
            g.beginPath();
            g.moveTo(xx - bw / 2, L.h); g.lineTo(xx - bw / 2, top + bw * 0.7);
            g.lineTo(xx - bw * 0.2, top + bw * 0.35); g.lineTo(xx, top - bw * 1.1);
            g.lineTo(xx + bw * 0.2, top + bw * 0.35); g.lineTo(xx + bw / 2, top + bw * 0.7); g.lineTo(xx + bw / 2, L.h);
            g.closePath(); g.fill();
            g.fillRect(xx - bw / 2 - 4, top + bw * 0.7 - bw * 0.55, 5, bw * 0.55);
            g.fillRect(xx + bw / 2 - 1, top + bw * 0.7 - bw * 0.55, 5, bw * 0.55);
            const nw = 1 + ((bw / 30) | 0);
            for (let k = 0; k < nw; k++) {
              if (rnd() < 0.35) continue;
              const wx = xx - bw / 2 + (k + 0.5) * (bw / nw), wy = top + bw * 0.9 + rnd() * 60;
              g.fillStyle = `rgba(${rgb},${0.25 + rnd() * 0.4})`;
              g.beginPath(); archPath(g, wx, wy + 14, 4, 14); g.fill();
            }
          });
        }
        for (let i = 0; i < 4; i++) {
          const x = rnd() * L.w, r = 50 + rnd() * 50, y = 30 + rnd() * 60;
          wrap(L, x, r, (xx) => {
            g.strokeStyle = hexA(farCol, 0.8); g.lineWidth = 2;
            g.beginPath(); g.moveTo(xx, -L.h); g.lineTo(xx, y); g.stroke();
            g.beginPath(); g.ellipse(xx, y, r, r * 0.2, 0, 0, TAU); g.stroke();
            for (let k = -3; k <= 3; k++) { g.fillStyle = `rgba(${rgb},0.35)`; g.fillRect(xx + k * r / 3.4 - 1, y - 9, 2, 5); }
          });
        }
      } else if (B.spire === 'stalactite') {
        for (let i = 0; i < 30; i++) {
          const x = rnd() * L.w, w = 24 + rnd() * 80, len = 60 + rnd() * (gy * 0.45);
          wrap(L, x, w, (xx) => stalactite(g, xx, -40, w, len + 40, farCol, farRim));
        }
        for (let i = 0; i < 22; i++) {
          const x = rnd() * L.w, w = 40 + rnd() * 120, ht = 40 + rnd() * 160;
          wrap(L, x, w, (xx) => stalagmite(g, xx, gy + 30, w, ht, farCol));
        }
        // a slow fall of molten wax in the distance
        for (let i = 0; i < 2; i++) {
          const x = rnd() * L.w;
          wrap(L, x, 30, (xx) => {
            const gr = g.createLinearGradient(xx - 10, 0, xx + 10, 0);
            gr.addColorStop(0, 'rgba(255,170,90,0)'); gr.addColorStop(0.5, 'rgba(255,170,90,0.22)'); gr.addColorStop(1, 'rgba(255,170,90,0)');
            g.fillStyle = gr; g.fillRect(xx - 10, 0, 20, gy);
            radial(g, xx, gy, 70, '255,150,70', 0.25);
          });
        }
        for (let i = 0; i < 6; i++) radial(g, rnd() * L.w, gy + 10, 60 + rnd() * 60, rgb, 0.18);
      } else {
        // Hall: tall windows between colossal pillars
        const bays = 6, bw = L.w / bays;
        for (let i = 0; i < bays; i++) {
          const cx = (i + 0.5) * bw, ww = 70 + rnd() * 30, wh = 260 + rnd() * 140;
          const wgr = g.createLinearGradient(0, gy - wh, 0, gy);
          wgr.addColorStop(0, `rgba(${rgb},0.38)`); wgr.addColorStop(1, `rgba(${rgb},0.12)`);
          g.fillStyle = wgr; g.beginPath(); archPath(g, cx, gy - 40, ww, wh); g.fill();
          g.strokeStyle = farCol; g.lineWidth = 4;
          g.beginPath(); g.moveTo(cx, gy - 40); g.lineTo(cx, gy - 40 - wh + 10);
          for (let k = 1; k < 4; k++) { const yy = gy - 40 - (wh * k) / 4; g.moveTo(cx - ww / 2, yy); g.lineTo(cx + ww / 2, yy); }
          g.stroke();
          radial(g, cx, gy - 40 - wh * 0.5, wh * 0.6, rgb, 0.08);
          const px2 = i * bw;
          const gr = g.createLinearGradient(px2 - 40, 0, px2 + 40, 0);
          gr.addColorStop(0, farCol); gr.addColorStop(0.35, farRim); gr.addColorStop(1, farCol);
          g.fillStyle = gr; g.fillRect(px2 - 40, 0, 80, L.h);
          if (i === 0) { g.fillStyle = gr; g.fillRect(L.w - 40, 0, 40, L.h); }
        }
        g.fillStyle = farCol; g.fillRect(0, gy - 40, L.w, L.h);
      }
      fogBand(L, gy - 160, gy + 40, 0.75);
    }

    // ---------------- MID ----------------
    {
      const L = mid, g = L.g, gy = L.gy;
      if (B.spire === 'gothic' || B.spire === 'pillars') {
        const hall = B.spire === 'pillars';
        const P = 140, pw = 24, ah = hall ? 250 : 200, top = gy - (hall ? 420 : 360);
        const wallGr = g.createLinearGradient(0, top, 0, gy);
        wallGr.addColorStop(0, midRim); wallGr.addColorStop(0.25, midCol); wallGr.addColorStop(1, midCol);
        g.fillStyle = wallGr; g.fillRect(0, top, L.w, L.h - top);
        // ragged, broken top edge
        g.globalCompositeOperation = 'destination-out';
        g.fillStyle = '#000';
        g.beginPath(); g.moveTo(0, top - 1);
        for (let x = 0; x <= L.w; x += 20) g.lineTo(x, top + (x % 140 === 0 ? 0 : rnd() * 18) + (rnd() < 0.08 ? rnd() * 70 : 0));
        g.lineTo(L.w, top - 1); g.closePath(); g.fill();
        // arcade openings and an upper tier of windows
        for (let x = P / 2; x < L.w; x += P) {
          g.beginPath(); archPath(g, x, gy, P - pw, ah); g.fill();
          g.beginPath(); archPath(g, x, gy - ah - 50, 36, 80); g.fill();
        }
        // ruined bays
        for (let i = 0; i < 2; i++) {
          const x = (((rnd() * L.w / P) | 0) + 0.5) * P;
          g.beginPath(); g.moveTo(x - P * 0.6, gy - ah + 40);
          for (let k = 0; k <= 8; k++) g.lineTo(x - P * 0.6 + (k / 8) * P * 1.2, top - 10 + rnd() * 60);
          g.lineTo(x + P * 0.6, gy - ah + 40); g.closePath(); g.fill();
        }
        g.globalCompositeOperation = 'source-over';
        // stone rim light and mouldings
        g.strokeStyle = hexA(midRim, 0.55); g.lineWidth = 2;
        for (let x = P / 2; x < L.w; x += P) {
          g.beginPath(); archPath(g, x, gy, P - pw, ah); g.stroke();
          g.fillStyle = midRim; g.fillRect(x - P / 2 - pw / 2 - 3, gy - 24, pw + 6, 6);
        }
        g.fillStyle = hexA(midRim, 0.6); g.fillRect(0, gy - ah - 6, L.w, 4);
        // what stands inside the arches
        for (let x = P / 2; x < L.w; x += P) {
          const r = rnd();
          if (r < 0.3) statue(g, x, gy, hall ? 1.25 : 1.05, mixHex(midCol, B.fog, 0.25), rgb);
          else if (hall && r < 0.6) {
            // a hanging banner
            const bw = 40, bt = gy - ah + 30, bh = 120 + rnd() * 40;
            g.fillStyle = '#5a1a14';
            g.beginPath(); g.moveTo(x - bw / 2, bt); g.lineTo(x + bw / 2, bt); g.lineTo(x + bw / 2, bt + bh);
            g.lineTo(x, bt + bh - 18); g.lineTo(x - bw / 2, bt + bh); g.closePath(); g.fill();
            g.strokeStyle = 'rgba(230,170,90,0.55)'; g.lineWidth = 2;
            g.beginPath(); g.moveTo(x - bw / 2 + 5, bt + 6); g.lineTo(x - bw / 2 + 5, bt + bh - 6); g.moveTo(x + bw / 2 - 5, bt + 6); g.lineTo(x + bw / 2 - 5, bt + bh - 6); g.stroke();
            g.beginPath(); g.arc(x, bt + 45, 9, 0, TAU); g.stroke();
          } else if (r < 0.55) chain(g, x, gy - ah + 6, gy - ah + 60 + rnd() * 50, hexA(midRim, 0.6));
        }
        g.fillStyle = midCol; g.fillRect(0, gy, L.w, L.h - gy);
      } else {
        // Drip: natural rock columns joined by arches, roots with glowing bulbs
        g.fillStyle = midCol;
        g.fillRect(0, 0, L.w, 40);
        for (let i = 0; i < 7; i++) {
          const x = (i + 0.3 + rnd() * 0.4) * (L.w / 7), w = 50 + rnd() * 60;
          wrap(L, x, w * 2, (xx) => {
            const gr = g.createLinearGradient(xx - w, 0, xx + w, 0);
            gr.addColorStop(0, midCol); gr.addColorStop(0.35, midRim); gr.addColorStop(0.6, midCol); gr.addColorStop(1, midCol);
            g.fillStyle = gr;
            g.beginPath(); g.moveTo(xx - w * 1.4, 0);
            g.quadraticCurveTo(xx - w * 0.3, gy * 0.45, xx - w * 0.4, gy * 0.6);
            g.quadraticCurveTo(xx - w * 0.6, gy * 0.85, xx - w * 1.2, gy + 10);
            g.lineTo(xx + w * 1.2, gy + 10);
            g.quadraticCurveTo(xx + w * 0.6, gy * 0.85, xx + w * 0.4, gy * 0.6);
            g.quadraticCurveTo(xx + w * 0.3, gy * 0.45, xx + w * 1.4, 0);
            g.closePath(); g.fill();
          });
        }
        for (let i = 0; i < 16; i++) {
          const x = rnd() * L.w, len = 60 + rnd() * 200, amp = 4 + rnd() * 8;
          wrap(L, x, 20, (xx) => {
            g.strokeStyle = midCol; g.lineWidth = 3;
            g.beginPath(); g.moveTo(xx, 0);
            for (let y = 0; y <= len; y += 10) g.lineTo(xx + Math.sin(y * 0.05 + i) * amp, y);
            g.stroke();
            radial(g, xx + Math.sin(len * 0.05 + i) * amp, len + 4, 16, rgb, 0.6);
          });
        }
        for (let i = 0; i < 14; i++) {
          const x = rnd() * L.w, w = 30 + rnd() * 70, ht = 30 + rnd() * 110;
          wrap(L, x, w, (xx) => stalagmite(g, xx, gy + 20, w, ht, midCol));
        }
        g.fillStyle = midCol; g.fillRect(0, gy, L.w, L.h - gy);
        for (let i = 0; i < 10; i++) radial(g, rnd() * L.w, gy - 4, 20 + rnd() * 30, rgb, 0.3);
      }
      fogBand(L, gy - 90, gy + 60, 0.5);
    }

    // ---------------- NEAR ----------------
    {
      const L = near, g = L.g, gy = L.gy;
      if (B.spire === 'stalactite') {
        for (let i = 0; i < 6; i++) {
          const x = rnd() * L.w, w = 60 + rnd() * 90, len = 120 + rnd() * 200;
          wrap(L, x, w, (xx) => stalactite(g, xx, -60, w, len + 60, nearCol, nearRim));
        }
        for (let i = 0; i < 8; i++) {
          const x = rnd() * L.w;
          wrap(L, x, 20, (xx) => {
            g.strokeStyle = nearCol; g.lineWidth = 5;
            g.beginPath(); g.moveTo(xx, -10);
            for (let y = 0; y < 160 + i * 20; y += 12) g.lineTo(xx + Math.sin(y * 0.04 + i) * 10, y);
            g.stroke();
          });
        }
      } else {
        for (let i = 0; i < 3; i++) {
          const x = (i + 0.2 + rnd() * 0.6) * (L.w / 3), w = 70 + rnd() * 50;
          wrap(L, x, w, (xx) => {
            const gr = g.createLinearGradient(xx - w / 2, 0, xx + w / 2, 0);
            gr.addColorStop(0, nearCol); gr.addColorStop(0.22, nearRim); gr.addColorStop(0.5, nearCol); gr.addColorStop(1, mixHex(nearCol, '#000000', 0.4));
            g.fillStyle = gr;
            g.fillRect(xx - w / 2, -10, w, gy + 10);
            const cap = gy - 300 - rnd() * 80;
            g.fillRect(xx - w / 2 - 14, cap, w + 28, 22);
            g.fillRect(xx - w / 2 - 8, cap + 22, w + 16, 10);
            g.fillRect(xx - w / 2 - 12, gy - 26, w + 24, 26);
            // wax running down from the capital
            g.fillStyle = hexA(B.wax, 0.28);
            for (let k = 0; k < 4; k++) {
              const dx = xx - w / 2 + 8 + rnd() * (w - 16), len = 30 + rnd() * 120;
              g.beginPath(); g.moveTo(dx - 3, cap + 32); g.lineTo(dx - 2, cap + 32 + len); g.arc(dx, cap + 32 + len, 2.5, Math.PI, 0, true); g.lineTo(dx + 3, cap + 32); g.closePath(); g.fill();
            }
          });
        }
        for (let i = 0; i < 3; i++) {
          const x = rnd() * L.w, y1 = 60 + rnd() * 140;
          wrap(L, x, 20, (xx) => { chain(g, xx, -20, y1, nearCol, 3); cage(g, xx, y1, nearCol, rgb, rnd() < 0.5); });
        }
      }
      // rubble along the ground
      g.fillStyle = nearCol;
      g.beginPath(); g.moveTo(0, L.h);
      for (let x = 0; x <= L.w; x += 30) g.lineTo(x, gy - 6 - Math.abs(Math.sin(x * 0.013 + 1.3)) * 30 - rnd() * 10);
      g.lineTo(L.w, gy - 6 - Math.abs(Math.sin(L.w * 0.013 + 1.3)) * 30); g.lineTo(L.w, L.h); g.closePath(); g.fill();
      fogBand(L, gy - 40, gy + 90, 0.35);
    }

    for (const L of [far, mid, near]) delete L.g;
    return { l1: far, l2: mid, l3: near };
  },

  // --------------------------------------------------------------- per-room back wall
  // Drawn at 0.9 parallax behind the playfield. Features are placed from the room's own floors and
  // ceilings, mapped so they sit behind the ledges they belong to when the camera is nearby.
  backdrop(room, viewW, viewH, px) {
    const B = room.B, rgb = GLOW[room.biome];
    const W = room.w * T, H = room.h * T, s = Math.min(px * 0.6, 1.1);
    const c = makeCanvas(W * s, H * s), g = c.getContext('2d');
    g.scale(s, s);
    const rnd = mulberry32(room.seed + 4242);
    const lx = (wx) => 0.9 * wx + 0.05 * viewW, ly = (wy) => 0.9 * wy + 0.05 * viewH;
    const col = mixHex(B.mid, B.near, 0.45), rim = mixHex(col, B.top, 0.16), deep = mixHex(B.near, '#000000', 0.35);
    const air = (x, y) => room.inside(x, y) && !room.solid(x, y) && room.ch(x, y) !== '-';
    const gothic = room.biome !== 'drip';

    // Floors: back arches, alcoves and statues (city areas) or rock pillars and crystals (caverns)
    for (let y = 2; y < room.h; y++) {
      let x = 1;
      while (x < room.w - 1) {
        if (!(room.rock(x, y) && air(x, y - 1))) { x++; continue; }
        let x1 = x;
        while (x1 + 1 < room.w - 1 && room.rock(x1 + 1, y) && air(x1 + 1, y - 1)) x1++;
        for (let fx = x + 1 + ((rnd() * 3) | 0); fx + 2 <= x1; fx += 6 + ((rnd() * 4) | 0)) {
          let head = 0;
          while (head < 9 && air(fx, y - 1 - head) && air(fx + 1, y - 1 - head)) head++;
          if (head < 4) continue;
          const bx = lx((fx + 1) * T), by = ly(y * T) + 30, hh = Math.min(head - 0.5, 6) * T * 0.9;
          if (gothic) {
            const aw = 64 + rnd() * 40;
            g.fillStyle = col;
            g.fillRect(bx - aw / 2 - 14, by - hh - 20, aw + 28, hh + 20);
            g.fillStyle = deep;
            g.beginPath(); archPath(g, bx, by, aw, hh - 10); g.fill();
            g.strokeStyle = hexA(rim, 0.6); g.lineWidth = 1.6;
            g.beginPath(); archPath(g, bx, by, aw, hh - 10); g.stroke();
            g.fillStyle = rim; g.fillRect(bx - aw / 2 - 16, by - hh - 22, aw + 32, 3);
            const r = rnd();
            if (r < 0.4) statue(g, bx, by - 30, 0.75, mixHex(col, B.fog, 0.2), rgb);
            else if (r < 0.7) {
              const wgr = g.createLinearGradient(0, by - hh, 0, by - 30);
              wgr.addColorStop(0, `rgba(${rgb},0.3)`); wgr.addColorStop(1, `rgba(${rgb},0.05)`);
              g.fillStyle = wgr; g.beginPath(); archPath(g, bx, by - 30, 14, hh - 50); g.fill();
            }
          } else {
            const w = 40 + rnd() * 40;
            const gr = g.createLinearGradient(bx - w, 0, bx + w, 0);
            gr.addColorStop(0, col); gr.addColorStop(0.35, rim); gr.addColorStop(1, deep);
            g.fillStyle = gr;
            stalagmite(g, bx, by, w, hh * (0.6 + rnd() * 0.4), gr);
            if (rnd() < 0.6) {
              // faint and slender, lifted off the floor line, so they read as background and never as thorns
              for (let k = 0; k < 4; k++) {
                const cx2 = bx + (k - 1.5) * 8, ch = 18 + rnd() * 26;
                g.fillStyle = hexA(CRYSTAL[room.biome], 0.2);
                g.beginPath(); g.moveTo(cx2 - 2.2, by - 46); g.lineTo(cx2 + (k - 1.5) * 3, by - 46 - ch); g.lineTo(cx2 + 2.2, by - 46); g.closePath(); g.fill();
              }
              radial(g, bx, by - 34, 46, rgb, 0.25);
            }
          }
        }
        x = x1 + 1;
      }
    }
    // Ceilings: chains with cages and lanterns, or roots with glowing bulbs
    for (let y = 1; y < room.h - 3; y++) {
      for (let x = 2; x < room.w - 2; x++) {
        if (!(room.rock(x, y) && air(x, y + 1) && air(x, y + 2) && air(x, y + 3) && air(x, y + 4))) continue;
        if (hash2(x, y, room.seed + 77) > 0.09) continue;
        const cx2 = lx(x * T + T / 2), cy2 = ly((y + 1) * T) - 20, len = 40 + rnd() * 80;
        if (gothic) { chain(g, cx2, cy2, cy2 + len, hexA(col, 0.95)); cage(g, cx2, cy2 + len, col, rgb, rnd() < 0.55); }
        else {
          g.strokeStyle = col; g.lineWidth = 2.5;
          g.beginPath(); g.moveTo(cx2, cy2);
          for (let yy = 0; yy <= len; yy += 8) g.lineTo(cx2 + Math.sin(yy * 0.08 + x) * 5, cy2 + yy);
          g.stroke();
          radial(g, cx2 + Math.sin(len * 0.08 + x) * 5, cy2 + len + 4, 18, rgb, 0.7);
        }
      }
    }
    return { c, s, f: 0.9 };
  },

  // --------------------------------------------------------------- drifting fog
  fog(color, seed) {
    const c = makeCanvas(400, 170), g = c.getContext('2d');
    const rnd = mulberry32(seed);
    for (let i = 0; i < 34; i++) {
      const a = rnd() * TAU, d = Math.sqrt(rnd());
      const x = 200 + Math.cos(a) * d * 150, y = 85 + Math.sin(a) * d * 45, r = 30 + rnd() * 45;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color; g.fillRect(0, 0, 400, 170);
    return c;
  },
};
