'use strict';
// Keyboard, gamepad and touch, merged into one set of held / pressed / released actions.
// Presses are latched so a tap shorter than a frame still registers.

const Input = (() => {
  const ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'attack', 'dash', 'ember', 'pause', 'map', 'interact', 'confirm'];
  const held = {}, prev = {}, pressed = {}, released = {};
  const latchP = {}, latchR = {};
  const keyHeld = {}, touchHeld = {}, padHeld = {};
  for (const a of ACTIONS) { held[a] = prev[a] = pressed[a] = released[a] = false; keyHeld[a] = touchHeld[a] = padHeld[a] = 0; }

  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    Space: 'jump', KeyZ: 'jump', KeyK: 'jump',
    KeyX: 'attack', KeyJ: 'attack',
    KeyC: 'dash', KeyL: 'dash', ShiftLeft: 'dash', ShiftRight: 'dash',
    KeyF: 'ember', KeyV: 'ember',
    Escape: 'pause', KeyP: 'pause', KeyM: 'map', Tab: 'map',
  };

  const api = {
    held, pressed, released,
    touchMode: matchMedia('(pointer: coarse)').matches,
    stick: { active: false, id: -1, ox: 0, oy: 0, x: 0, y: 0, dx: 0, dy: 0 },
    buttons: {},
    enabled: true,       // touch layer active (false while a menu covers the canvas)
    showInteract: false, // contextual "Rest" pill
    interactLabel: 'Rest',
    onAnyInput: null,
  };

  // ---------- keyboard ----------
  addEventListener('keydown', (e) => {
    const a = KEYMAP[e.code];
    if (api.onAnyInput) api.onAnyInput();
    if (a) {
      if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) {
        // Let menus keep native keyboard focus handling; the game reads these too.
        if (!document.querySelector('.screen:not([hidden]), .panel:not([hidden])') || e.code === 'Tab') e.preventDefault();
      }
      if (!e.repeat) { keyHeld[a] = 1; latchP[a] = true; }
      api.touchMode = false; api.padMenu = false;
    }
  });
  addEventListener('keyup', (e) => {
    const a = KEYMAP[e.code];
    if (a) { keyHeld[a] = 0; latchR[a] = true; }
  });
  addEventListener('blur', () => { for (const a of ACTIONS) { keyHeld[a] = 0; touchHeld[a] = 0; } pointers.clear(); api.stick.active = false; });

  // ---------- touch ----------
  const pointers = new Map(); // id -> { kind: 'stick' | 'btn', btn }
  let cssW = 1, cssH = 1, safe = { l: 0, r: 0, t: 0, b: 0 }, uiScale = 1;

  function layout(w, h, insets) {
    cssW = w; cssH = h; safe = insets;
    const s = uiScale = clamp(Math.min(w, h) / 390, 0.82, 1.3);
    const B = api.buttons;
    const jx = w - safe.r - 76 * s, jy = h - safe.b - 72 * s;
    B.jump = { action: 'jump', x: jx, y: jy, r: 40 * s };
    B.attack = { action: 'attack', x: jx - 100 * s, y: h - safe.b - 54 * s, r: 34 * s };
    B.dash = { action: 'dash', x: jx + 6 * s, y: jy - 96 * s, r: 30 * s };
    B.ember = { action: 'ember', x: jx - 96 * s, y: jy - 92 * s, r: 30 * s };
    B.pause = { action: 'pause', x: w - safe.r - 34, y: safe.t + 32, r: 22, top: true };
    B.map = { action: 'map', x: w - safe.r - 84, y: safe.t + 32, r: 22, top: true };
    B.interact = { action: 'interact', x: w * 0.5, y: h - safe.b - 46 * s, r: 30 * s, pill: true };
    api.stickHome = { x: safe.l + 104 * s, y: h - safe.b - 92 * s, r: 56 * s };
  }

  function buttonVisible(b) {
    if (b.action === 'dash') return !!api.hasDash;
    if (b.action === 'interact') return api.showInteract;
    return true;
  }

  function hitButton(x, y, slack) {
    let best = null, bd = Infinity;
    for (const k in api.buttons) {
      const b = api.buttons[k];
      if (!buttonVisible(b)) continue;
      const rx = b.pill ? b.r * 2.2 : b.r;
      const dx = (x - b.x) / (rx / b.r), dy = y - b.y;
      const d = Math.hypot(dx, dy);
      const lim = b.r * (b.top ? 1.5 : slack);
      if (d < lim && d < bd) { bd = d; best = b; }
    }
    return best;
  }

  function recomputeTouch() {
    for (const a of ACTIONS) touchHeld[a] = 0;
    for (const p of pointers.values()) if (p.kind === 'btn' && p.btn) touchHeld[p.btn.action] = 1;
    const s = api.stick;
    if (s.active) {
      if (s.dx < -0.32) touchHeld.left = 1;
      if (s.dx > 0.32) touchHeld.right = 1;
      if (s.dy < -0.58) touchHeld.up = 1;
      if (s.dy > 0.58) touchHeld.down = 1;
    }
  }

  function pos(e, el) {
    const r = el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function attach(el) {
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && !api.touchMode) return; // desktop mouse clicks do nothing in play
      e.preventDefault();
      if (api.onAnyInput) api.onAnyInput();
      api.touchMode = true;
      if (!api.enabled) return;
      const { x, y } = pos(e, el);
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
      const b = hitButton(x, y, x > cssW * 0.5 ? 1.6 : 1.25);
      if (b && (x > cssW * 0.42 || b.top || b.pill)) {
        pointers.set(e.pointerId, { kind: 'btn', btn: b });
        latchP[b.action] = true;
      } else if (x < cssW * 0.5) {
        const s = api.stick, h = api.stickHome;
        s.active = true; s.id = e.pointerId;
        s.ox = clamp(x, safe.l + h.r * 0.8, cssW * 0.5 - h.r);
        s.oy = clamp(y, safe.t + h.r + 40, cssH - safe.b - h.r * 0.6);
        s.x = x; s.y = y; s.dx = 0; s.dy = 0;
        updateStick(x, y);
        pointers.set(e.pointerId, { kind: 'stick' });
      } else {
        const near = hitButton(x, y, 2.6);
        pointers.set(e.pointerId, { kind: 'btn', btn: near });
        if (near) latchP[near.action] = true;
      }
      recomputeTouch();
    }, { passive: false });

    el.addEventListener('pointermove', (e) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      e.preventDefault();
      const { x, y } = pos(e, el);
      if (p.kind === 'stick') updateStick(x, y);
      else if (p.btn && !p.btn.top && !p.btn.pill) {
        // Slide between action buttons without lifting the thumb.
        const nb = hitButton(x, y, 1.05);
        if (nb && nb !== p.btn && !nb.top && !nb.pill) {
          latchR[p.btn.action] = true;
          p.btn = nb; latchP[nb.action] = true;
        }
      }
      recomputeTouch();
    }, { passive: false });

    const end = (e) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      if (p.kind === 'stick') { api.stick.active = false; api.stick.dx = api.stick.dy = 0; }
      else if (p.btn) latchR[p.btn.action] = true;
      pointers.delete(e.pointerId);
      recomputeTouch();
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);
    // iOS: stop the double-tap zoom, the magnifier and text selection on long press.
    el.addEventListener('touchstart', (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  function updateStick(x, y) {
    const s = api.stick, R = api.stickHome.r;
    let dx = x - s.ox, dy = y - s.oy;
    const d = Math.hypot(dx, dy);
    if (d > R) {
      // The base follows a thumb that drifts too far, so direction changes stay quick.
      const k = (d - R) / d;
      s.ox += dx * k; s.oy += dy * k;
      dx = x - s.ox; dy = y - s.oy;
    }
    s.x = x; s.y = y;
    s.dx = dx / R; s.dy = dy / R;
  }

  function releaseAllTouch() {
    for (const p of pointers.values()) if (p.kind === 'btn' && p.btn) latchR[p.btn.action] = true;
    pointers.clear(); api.stick.active = false; api.stick.dx = api.stick.dy = 0;
    recomputeTouch();
  }

  // ---------- gamepad ----------
  let padIndex = -1;
  addEventListener('gamepadconnected', (e) => { padIndex = e.gamepad.index; api.touchMode = false; });
  addEventListener('gamepaddisconnected', () => { padIndex = -1; });
  const PADMAP = { 0: 'jump', 2: 'attack', 1: 'ember', 3: 'ember', 5: 'dash', 7: 'dash', 4: 'dash', 6: 'ember', 9: 'pause', 8: 'map', 12: 'up', 13: 'down', 14: 'left', 15: 'right' };
  function pollPad() {
    for (const a of ACTIONS) padHeld[a] = 0;
    if (padIndex < 0 || !navigator.getGamepads) return;
    const gp = navigator.getGamepads()[padIndex];
    if (!gp) return;
    for (const i in PADMAP) if (gp.buttons[i] && gp.buttons[i].pressed) padHeld[PADMAP[i]] = 1;
    if (gp.buttons[0] && gp.buttons[0].pressed) padHeld.confirm = 1;
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    if (ax < -0.4) padHeld.left = 1;
    if (ax > 0.4) padHeld.right = 1;
    if (ay < -0.6) padHeld.up = 1;
    if (ay > 0.6) padHeld.down = 1;
    let any = false; for (const a of ACTIONS) if (padHeld[a]) any = true;
    if (any) { api.touchMode = false; api.padMenu = true; if (api.onAnyInput) api.onAnyInput(); }
  }

  function poll() {
    pollPad();
    for (const a of ACTIONS) {
      const h = !!(keyHeld[a] || touchHeld[a] || padHeld[a]);
      pressed[a] = !!latchP[a] || (h && !prev[a]);
      released[a] = !!latchR[a] || (!h && prev[a]);
      held[a] = h;
      prev[a] = h;
      latchP[a] = latchR[a] = false;
    }
  }

  function consume() { for (const a of ACTIONS) { pressed[a] = false; released[a] = false; } }

  // ---------- drawing (CSS pixel space) ----------
  function draw(ctx, o) {
    const B = api.buttons;
    const active = new Set();
    for (const p of pointers.values()) if (p.kind === 'btn' && p.btn) active.add(p.btn);

    // Stick
    const s = api.stick, h = api.stickHome;
    const cx = s.active ? s.ox : h.x, cy = s.active ? s.oy : h.y;
    ctx.lineWidth = 2;
    ctx.strokeStyle = s.active ? 'rgba(255,214,160,0.45)' : 'rgba(225,215,195,0.2)';
    ctx.fillStyle = s.active ? 'rgba(255,190,120,0.08)' : 'rgba(225,215,195,0.04)';
    ctx.beginPath(); ctx.arc(cx, cy, h.r, 0, TAU); ctx.fill(); ctx.stroke();
    const kx = s.active ? cx + clamp(s.dx, -1, 1) * h.r * 0.6 : cx, ky = s.active ? cy + clamp(s.dy, -1, 1) * h.r * 0.6 : cy;
    ctx.fillStyle = s.active ? 'rgba(255,214,160,0.42)' : 'rgba(225,215,195,0.16)';
    ctx.beginPath(); ctx.arc(kx, ky, h.r * 0.42, 0, TAU); ctx.fill();

    for (const k in B) {
      const b = B[k];
      if (!buttonVisible(b)) continue;
      const on = active.has(b) || held[b.action] && b.action !== 'up';
      const r = b.r * (on ? 0.93 : 1);
      if (b.pill) {
        const w = r * 3.6, hh = r * 1.35;
        ctx.fillStyle = on ? 'rgba(255,190,120,0.35)' : 'rgba(18,16,24,0.55)';
        ctx.strokeStyle = 'rgba(255,214,160,0.7)';
        roundRect(ctx, b.x - w / 2, b.y - hh / 2, w, hh, hh / 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,236,205,0.95)';
        ctx.font = `${Math.round(17 * uiScale)}px ${FONT_DISPLAY}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('▲ ' + api.interactLabel, b.x, b.y + 1);
        continue;
      }
      let dim = false;
      if (b.action === 'ember') dim = o.tallow < 33;
      ctx.fillStyle = on ? 'rgba(255,190,120,0.3)' : 'rgba(225,215,195,' + (b.top ? 0.08 : 0.07) + ')';
      ctx.strokeStyle = on ? 'rgba(255,220,170,0.85)' : 'rgba(225,215,195,' + (dim ? 0.16 : 0.32) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, TAU); ctx.fill(); ctx.stroke();
      if (b.action === 'ember') {
        ctx.strokeStyle = o.tallow >= 33 ? 'rgba(255,170,80,0.9)' : 'rgba(255,170,80,0.35)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(b.x, b.y, r + 4, -Math.PI / 2, -Math.PI / 2 + TAU * (o.tallow / 99)); ctx.stroke();
      }
      ctx.save();
      ctx.translate(b.x, b.y);
      const ic = r * 0.42;
      ctx.strokeStyle = ctx.fillStyle = on ? 'rgba(255,240,215,1)' : 'rgba(235,225,205,' + (dim ? 0.35 : 0.8) + ')';
      ctx.lineWidth = Math.max(2, r * 0.09); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      icon(ctx, b.action, ic);
      ctx.restore();
    }
  }

  function icon(ctx, a, s) {
    ctx.beginPath();
    if (a === 'jump') { ctx.moveTo(-s, s * 0.45); ctx.lineTo(0, -s * 0.55); ctx.lineTo(s, s * 0.45); ctx.stroke(); }
    else if (a === 'attack') {
      ctx.arc(-s * 0.5, s * 0.4, s * 1.25, -1.35, 0.25); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.9, s * 0.9); ctx.lineTo(s * 0.35, -s * 0.35); ctx.stroke();
    } else if (a === 'dash') {
      ctx.moveTo(-s, -s * 0.7); ctx.lineTo(-s * 0.15, 0); ctx.lineTo(-s, s * 0.7);
      ctx.moveTo(-s * 0.05, -s * 0.7); ctx.lineTo(s * 0.8, 0); ctx.lineTo(-s * 0.05, s * 0.7); ctx.stroke();
    } else if (a === 'ember') {
      // A flame: a curled tip and a round base
      ctx.moveTo(s * 0.15, -s * 1.2);
      ctx.bezierCurveTo(s * 1.05, -s * 0.35, s * 0.95, s * 0.95, 0, s * 0.95);
      ctx.bezierCurveTo(-s * 0.95, s * 0.95, -s * 0.95, -s * 0.1, -s * 0.35, -s * 0.45);
      ctx.bezierCurveTo(-s * 0.3, -s * 0.05, -s * 0.05, s * 0.1, s * 0.05, -s * 0.2);
      ctx.bezierCurveTo(s * 0.2, -s * 0.6, s * 0.05, -s * 0.9, s * 0.15, -s * 1.2);
      ctx.stroke();
    } else if (a === 'pause') {
      ctx.moveTo(-s * 0.4, -s * 0.7); ctx.lineTo(-s * 0.4, s * 0.7); ctx.moveTo(s * 0.4, -s * 0.7); ctx.lineTo(s * 0.4, s * 0.7); ctx.stroke();
    } else if (a === 'map') {
      ctx.moveTo(-s, -s * 0.6); ctx.lineTo(-s * 0.33, -s * 0.85); ctx.lineTo(s * 0.33, -s * 0.6); ctx.lineTo(s, -s * 0.85);
      ctx.lineTo(s, s * 0.6); ctx.lineTo(s * 0.33, s * 0.85); ctx.lineTo(-s * 0.33, s * 0.6); ctx.lineTo(-s, s * 0.85); ctx.closePath();
      ctx.moveTo(-s * 0.33, -s * 0.85); ctx.lineTo(-s * 0.33, s * 0.6); ctx.moveTo(s * 0.33, -s * 0.6); ctx.lineTo(s * 0.33, s * 0.85);
      ctx.stroke();
    }
  }

  Object.assign(api, { attach, layout, poll, consume, draw, releaseAllTouch, keymapAction: (code) => KEYMAP[code] });
  return api;
})();

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
