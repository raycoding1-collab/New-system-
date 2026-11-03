'use strict';
// Autopilot. It plays with the same buttons a player has (left, right, up, down, jump, strike, flicker,
// ember, pause) and reads only what a player can see on screen: positions, enemy poses and projectiles.
// It never moves the Wick directly or changes health. Every simulation step it decides which buttons
// to hold; Input.poll() picks them up exactly as if they came from a gamepad.
//
// Layers, highest priority first:
//   1. menus     dismiss banners, rise from shrines
//   2. defend    strike moths, globs and orbs out of the air, jump over charges and shockwaves
//   3. boss      a dedicated brain for the Chandler
//   4. route     a per-room list of moves (walk, jump onto a ledge, flicker across, drop through)

const Bot = (() => {
  const ACT = ['left', 'right', 'up', 'down', 'jump', 'attack', 'dash', 'ember', 'pause', 'confirm'];
  const S = {
    active: false, sim: false, speed: 1, step: 0,
    hold: {}, prev: {}, pulses: {}, sticky: {},
    room: null, plan: null, idx: 0, restarts: 0, goal: '',
    hits: 0, hitLog: [], deaths: 0, finished: false, result: null, log: [],
  };
  const P = () => G.player;
  const X = (tiles) => tiles * T;

  // ------------------------------------------------------------------ output
  function holdA(a) { S.hold[a] = true; }
  // Press a button for n steps. If it is already down, release it for one step first so the press registers.
  function tap(a, n = 2) { if (S.pulses[a]) return; S.pulses[a] = S.prev[a] ? -n : n; }
  // Keep a direction held for a few steps so an aimed strike still aims after a one-step release.
  function aim(a, n = 3) { S.sticky[a] = Math.max(S.sticky[a] || 0, n); }
  function compose() {
    const out = {};
    for (const a of ACT) out[a] = !!S.hold[a];
    for (const a in S.sticky) { if (S.sticky[a] > 0) { out[a] = true; S.sticky[a]--; } }
    for (const a in S.pulses) {
      const v = S.pulses[a];
      if (v < 0) { out[a] = false; S.pulses[a] = -v; } else { out[a] = true; S.pulses[a] = v - 1; if (!S.pulses[a]) delete S.pulses[a]; }
    }
    if (out.left && out.right) out.left = false;
    S.prev = out;
    Input.botHeld = out;
  }

  // ------------------------------------------------------------------ perception
  const feet = () => P().y + P().h;
  function on(x0, x1, row) {
    const p = P();
    return p.onGround && Math.abs(feet() - row * T) < 1.5 && p.cx >= X(x0) - 4 && p.cx <= X(x1 + 1) + 4;
  }
  function gapTo(e) { // horizontal space between the Wick's box and e's box (negative when overlapping)
    const p = P();
    return e.cx > p.cx ? e.x - (p.x + p.w) : p.x - (e.x + e.w);
  }
  const sameLevel = (e, tol = 24) => Math.abs((e.y + e.h) - feet()) < tol;
  // Is it safe to keep walking this way? A short drop onto solid ground is fine; a pit or a hazard is not.
  function groundAhead(dir, dist = 14, maxDrop = 4) {
    const p = P(), x = dir > 0 ? p.x + p.w + dist : p.x - dist;
    const tx = Math.floor(x / T), ty0 = Math.floor((feet() + 2) / T);
    for (let ty = ty0; ty <= ty0 + maxDrop; ty++) {
      const c = G.room.ch(tx, ty);
      if (c === '^' || c === '~') return false;
      if (G.room.solid(tx, ty) || c === '-') return true;
    }
    return false;
  }
  function face(x) { const d = Math.sign(x - P().cx); if (d && d !== P().face) holdA(d > 0 ? 'right' : 'left'); }
  function atkBox(dir, fc) {
    const p = P();
    if (dir === 'up') return { x: p.cx - 22, y: p.y - 50, w: 44, h: 54 };
    if (dir === 'down') return { x: p.cx - 21, y: p.y + p.h - 6, w: 42, h: 50 };
    return fc > 0 ? { x: p.x + p.w - 4, y: p.y - 8, w: 50, h: p.h + 14 } : { x: p.x - 46, y: p.y - 8, w: 50, h: p.h + 14 };
  }
  const shift = (b, dx, dy) => ({ x: b.x + dx, y: b.y + dy, w: b.w, h: b.h });
  const canStrike = () => P().attackCD <= 0 && P().attackT <= 0 && P().state === 'normal';
  // Something strikable will reach the Wick within `within` seconds: keep the blade ready for it.
  function threatSoon(within = 0.45) {
    const p = P();
    const list = [];
    for (const e of G.enemies) if (e instanceof SootMoth && !e.dead && (e.state === 'wind' || e.state === 'swoop')) list.push(e);
    for (const q of G.projs) if (q.hostile && q.slashable && !q.dead) list.push(q);
    for (const e of list) {
      const at = predictor(e);
      if (!at) continue;
      for (let k = 0; k <= within * 120; k += 3) {
        const t = k / 120, grow = { x: p.x - 30, y: p.y - 30, w: p.w + 60, h: p.h + 60 };
        if (overlap(shift(grow, p.vx * t, 0), at(t))) return true;
      }
    }
    return false;
  }

  // Walk (or steer in the air) toward an x position; true once there and nearly still.
  function moveToward(tx, tol = 3) {
    const p = P(), dx = tx - p.cx;
    const dec = p.onGround ? PL.DEC_G : PL.DEC_A;
    const stop = (p.vx * p.vx) / (2 * dec);
    if (Math.abs(dx) <= tol && Math.abs(p.vx) < 45) return true;
    if (Math.sign(dx) === Math.sign(p.vx) && Math.abs(dx) <= stop + tol) return false; // coast to a stop
    if (Math.abs(dx) > tol) holdA(dx > 0 ? 'right' : 'left');
    return false;
  }

  // ------------------------------------------------------------------ threat prediction
  // Where a moving hazard will be t seconds from now (null when it is not a strikable threat).
  function predictor(e) {
    if (e instanceof SootMoth && !e.dead) {
      const p = P();
      if (e.state === 'swoop') return (t) => shift(e, e.vx * t, e.vy * t);
      if (e.state === 'wind') {
        const dx = p.cx - e.cx, dy = p.cy - e.cy, d = Math.hypot(dx, dy) || 1, k = 380 / d;
        return (t) => (t < e.st ? e : shift(e, dx * k * (t - e.st), dy * k * (t - e.st)));
      }
      return (t) => shift(e, e.vx * t, e.vy * t);
    }
    if ((e instanceof Glob || e instanceof Orb) && !e.dead) {
      const g = e.grav || 0;
      return (t) => shift(e, e.vx * t, e.vy * t + 0.5 * g * t * t);
    }
    return null;
  }

  // Strike something out of the air if, struck now, it will run into the blade before it reaches the Wick.
  function counterStrike() {
    const p = P();
    if (!canStrike()) return false;
    const list = [];
    for (const e of G.enemies) if (e instanceof SootMoth && !e.dead) list.push(e);
    for (const q of G.projs) if (q.hostile && q.slashable && !q.dead) list.push(q);
    for (const e of list) {
      const at = predictor(e);
      if (!at) continue;
      const c0 = at(0);
      if (Math.hypot(c0.x - p.x, c0.y - p.y) > 260) continue;
      const fc = Math.sign(c0.x + c0.w / 2 - p.cx) || p.face;
      const dirs = ['side', 'up'];
      if (!p.onGround) dirs.push('down');
      for (const d of dirs) {
        let hit = -1, hurt = false;
        for (let k = 0; k <= 12; k++) {
          const t = k / 120, tb = at(t);
          const dy = p.onGround ? 0 : p.vy * t;
          if (overlap(shift(atkBox(d, fc), p.vx * t, dy), tb)) { hit = k; break; }
          if (overlap(shift(p.hurtbox, p.vx * t, dy), tb)) { hurt = true; break; }
        }
        if (hit >= 0 && !hurt && hit <= 5) {
          if (d === 'side') holdA(fc > 0 ? 'right' : 'left');
          else aim(d, 4);
          tap('attack', 2);
          return true;
        }
      }
    }
    return false;
  }

  // Something strikable is about to hit and the blade is still recovering: flicker (or hop) out of its way,
  // but only toward ground that is solid and free of thorns and molten wax.
  function emergencyDodge() {
    const p = P();
    if (canStrike()) return false;
    const list = [];
    for (const e of G.enemies) if (e instanceof SootMoth && !e.dead && e.state === 'swoop') list.push(e);
    for (const q of G.projs) if (q.hostile && q.slashable && !q.dead) list.push(q);
    for (const e of list) {
      const at = predictor(e);
      let hitT = -1;
      for (let k = 0; k <= 16; k++) { const t = k / 120; if (overlap(shift(p.hurtbox, p.vx * t, p.onGround ? 0 : p.vy * t), at(t))) { hitT = t; break; } }
      if (hitT < 0) continue;
      // A swing already under way will meet it first: let it.
      let met = false;
      for (let k = 0; k <= hitT * 120; k++) {
        const t = k / 120;
        if (p.attackT - t <= PL.ATK_T - PL.ATK_ACTIVE) break;
        if (overlap(shift(p.attackBox(), p.vx * t, p.onGround ? 0 : p.vy * t), at(t))) { met = true; break; }
      }
      if (met) continue;
      // The blade will be ready in time to meet it: wait for the counter-strike instead.
      if (Math.max(p.attackCD, p.attackT) + 0.06 < hitT) continue;
      const m = safeMove(0, 0);
      if (m.dash) { holdA(m.u > 0 ? 'right' : 'left'); tap('dash', 2); return true; }
      if (m.u) holdA(m.u > 0 ? 'right' : 'left');
      if (m.hold && p.onGround) tap('jump', m.hold);
      return true;
    }
    return false;
  }

  // A sentinel winding up or charging at us: the look-ahead picks the dodge (stay, step aside, jump) and
  // steers the landing; if it ends up right underneath, bounce off its head.
  function dodgeSentinels() {
    const p = P();
    for (const e of G.enemies) {
      if (!(e instanceof Sentinel) || e.dead) continue;
      if (!p.onGround && canStrike() && e.cy > p.cy && overlap(atkBox('down', p.face), e)) { aim('down', 4); tap('attack', 2); }
      const toward = Math.sign(p.cx - e.cx) === e.face;
      if (!toward || (e.state !== 'wind' && e.state !== 'charge')) continue;
      if (Math.abs(e.y + e.h - feet()) > 70 || gapTo(e) > 260) continue;
      const away = Math.sign(p.cx - e.cx) || 1;
      actSafely(e.state === 'wind' && gapTo(e) < 140 && groundAhead(away, 20) ? away : 0, 0);
      return true;
    }
    return false;
  }

  function defend() {
    const p = P();
    if (p.state !== 'normal') return false;
    if (counterStrike()) return true;
    if (emergencyDodge()) return true;
    if (dodgeSentinels()) return true;
    // Falling onto something that bites: strike down and bounce off it.
    if (!p.onGround && p.vy > -100 && canStrike()) {
      for (const e of G.enemies) {
        if (e.dead || e === G.boss || !e.contact) continue;
        if (overlap(shift(atkBox('down', p.face), 0, p.vy * 0.04), e) && e.cy > p.cy) { aim('down', 4); tap('attack', 2); return true; }
      }
    }
    // Coming down next to something that bites: drift away from it.
    if (!p.onGround && p.vy > 60) {
      for (const e of G.enemies) {
        if (e.dead || !(e instanceof Wickling || e instanceof Sentinel)) continue;
        const below = e.y > p.y + p.h - 4 && e.y - (p.y + p.h) < 70;
        const px = p.cx + p.vx * 0.12, ex = e.cx + e.vx * 0.12;
        if (below && Math.abs(px - ex) < e.w / 2 + 9 + 14) {
          const away = Math.sign(px - ex) || -e.face || 1;
          if (groundAhead(away, 24, 6)) { holdA(away > 0 ? 'right' : 'left'); return true; }
        }
      }
    }
    // A crawler right in front of us: strike it rather than walk into it.
    for (const e of G.enemies) {
      if (e.dead || !(e instanceof Wickling) || !sameLevel(e) || !p.onGround) continue;
      const gap = gapTo(e), dir = Math.sign(e.cx - p.cx) || p.face;
      if (gap > 34) continue;
      if (gap <= 30 && canStrike()) { face(e.cx); if (p.face === dir) tap('attack', 2); return true; }
      if (gap < 12) { holdA(dir > 0 ? 'left' : 'right'); return true; }
    }
    // A moth winding up or swooping: stand still and face it so the counter-strike can meet it.
    for (const e of G.enemies) {
      if (!(e instanceof SootMoth) || e.dead) continue;
      if ((e.state === 'wind' || e.state === 'swoop') && Math.hypot(e.cx - p.cx, e.cy - p.cy) < 340 && p.onGround) {
        face(e.cx);
        return true;
      }
    }
    // Spitter about to fire nearby: keep the blade ready rather than walking into the glob.
    return false;
  }

  // ------------------------------------------------------------------ fighting ordinary enemies
  function engage(e) {
    const p = P();
    const gap = gapTo(e), dir = Math.sign(e.cx - p.cx) || p.face;
    const inReach = (d) => overlap(atkBox(d, dir), e);
    const ready = canStrike() && !threatSoon();
    let u = 0, act = null, stop;
    if (e instanceof SootMoth) {
      const dy = e.cy - p.cy;
      if (e.state === 'recover' && ready && inReach('side')) act = 'side';
      else if (e.state === 'recover' && ready && dy < -20 && inReach('up')) act = 'up';
      else face(e.cx);
    } else if (e instanceof Spitter) {
      stop = e.cx - dir * (e.w / 2 + 9 + 16);
      // About to fire: wait a little way off with the blade ready, so the glob flies into the strike.
      if (e.charge > 0 && gap < 70) { u = gap < 50 && groundAhead(-dir, 10) ? -dir : 0; if (!u) face(e.cx); }
      else if (gap > 24) u = dir; else if (gap < 6) u = -dir;
      else if (e.charge <= 0 && ready && inReach('side')) act = 'side';
    } else if (e instanceof Sentinel) {
      const exposed = e.state === 'recover' || (e.state !== 'charge' && e.state !== 'wind' && e.face !== -dir);
      if (G.tallow >= 33 && p.onGround && sameLevel(e, 30) && gap > 70 && e.state !== 'charge') { if (p.face !== dir) u = dir; else act = 'cast'; }
      else if (exposed) { stop = e.cx - dir * (e.w / 2 + 9 + 16); if (gap > 26) u = dir; else if (gap < 6) u = -dir; else if (ready && inReach('side')) act = 'side'; }
      else if (gap < 160) u = -dir;
      else if (gap > 240) { u = dir; stop = e.cx - dir * (e.w / 2 + 9 + 200); }
    } else {
      if (!p.onGround) return;
      if (!sameLevel(e)) {
        const landX = p.cx + dir * 48;
        if (Math.abs(e.cx - landX) >= 80) { u = dir; stop = e.cx - dir * (e.w / 2 + 9 + 36); }
      } else if (ready && inReach('side') && gap >= -2) act = 'side';
      else if (gap < 10) u = -dir;
      else if (gap > 40) { u = dir; stop = e.cx - dir * (e.w / 2 + 9 + 24); }
    }
    if (u && !groundAhead(u, 10)) u = 0;
    if (act === 'side') { face(e.cx); if (p.face === dir) tap('attack', 2); actSafely(0, 0, e); return; }
    if (act === 'up') { aim('up', 4); tap('attack', 2); actSafely(0, 0, e); return; }
    if (act === 'cast') { if (p.attackT <= 0) tap('ember', 2); actSafely(0, 0); return; }
    actSafely(u, 0, undefined, u === dir ? stop : undefined);
  }

  // ------------------------------------------------------------------ tasks
  const task = (name, run, opts = {}) => Object.assign({ name, run, t: 0, begun: false, timeout: 25 }, opts);
  const waitFor = (name, fn, opts) => task(name, () => (fn() ? 'done' : undefined), opts);
  const walk = (x, opts = {}) => task(opts.name || `walk to ${x}`, () => (moveToward(X(x), opts.tol || 3) ? 'done' : undefined), opts);

  // Hold the take-off while a moth is mid-attack nearby or a crawler stands where we would land.
  function holdTakeoff(k, land, steer) {
    const p = P();
    k.waited = (k.waited || 0) + STEP;
    if (k.waited > 5) return false;
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (e instanceof SootMoth && e.state !== 'idle' && Math.hypot(e.cx - p.cx, e.cy - p.cy) < 400) return true;
      const onLand = land[2] >= 99 ? e.y + e.h > feet() + 8 : Math.abs(e.y + e.h - land[2] * T) < 4;
      if ((e instanceof Wickling || e instanceof Sentinel) && onLand && Math.abs(e.cx - X(steer)) < 90 && k.waited < 4) return true;
    }
    return false;
  }

  // Jump onto a platform. `from` is the take-off point (tiles); with `run` the Wick runs up and jumps
  // as it passes `from`. In the air it steers toward `steer`, and optionally flickers after `dash` seconds.
  function jumpTo(o) {
    const land = o.land, steer = o.steer !== undefined ? o.steer : (land[0] + land[1] + 1) / 2;
    return task(o.name || `jump to row ${land[2]}`, (k) => {
      const p = P();
      k.ph = k.ph || 'align';
      if (k.ph === 'align') {
        const start = o.run ? o.from - o.dir * o.run : o.from;
        if (!p.onGround) return;
        if (moveToward(X(start), 3) && !holdTakeoff(k, land, steer)) k.ph = o.run ? 'run' : 'jump';
        return;
      }
      if (k.ph === 'run') {
        holdA(o.dir > 0 ? 'right' : 'left');
        if ((o.dir > 0 && p.cx >= X(o.from)) || (o.dir < 0 && p.cx <= X(o.from))) k.ph = 'jump';
        return;
      }
      if (k.ph === 'jump') {
        if (o.dir) holdA(o.dir > 0 ? 'right' : 'left');
        tap('jump', o.hold || 50);
        k.ph = 'air'; k.air = 0; k.left = false;
        if (o.dash) S.timed.push({ at: S.step + Math.round(o.dash * 120), a: 'dash' });
        return;
      }
      if (k.ph === 'air') {
        k.air += STEP;
        if (!p.onGround) k.left = true;
        if (k.air < (o.steerAfter || 0)) { if (o.dir) holdA(o.dir > 0 ? 'right' : 'left'); }
        else { moveToward(X(steer), 3); S.steerTo = X(steer); }
        if (k.left && p.onGround) return on(land[0], land[1], land[2]) || (o.rows || []).some((r) => on(land[0], land[1], r)) ? 'done' : 'fail';
        if (k.air > 3) return 'fail';
      }
    }, { skip: o.skip, timeout: o.timeout || 12 });
  }

  // Walk off an edge and steer onto a platform below.
  function walkOff(o) {
    const steer = o.steer !== undefined ? o.steer : (o.land[0] + o.land[1] + 1) / 2;
    return task(o.name || 'walk off', (k) => {
      const p = P();
      if (!k.left) {
        if (p.onGround && holdTakeoff(k, o.land, steer)) return;
        holdA(o.dir > 0 ? 'right' : 'left'); if (!p.onGround) k.left = true; return;
      }
      moveToward(X(steer), 3);
      if (p.onGround) return on(o.land[0], o.land[1], o.land[2]) || (o.rows || []).some((r) => on(o.land[0], o.land[1], r)) ? 'done' : 'fail';
    }, { skip: o.skip, timeout: 8 });
  }

  // Drop through a ledge you are standing on.
  function dropAt(o) {
    return task(o.name || 'drop through', (k) => {
      const p = P();
      if (!k.dropped) {
        if (!p.onGround) return;
        if (!moveToward(X(o.at), 3)) return;
        if (holdTakeoff(k, o.land, o.at)) return;
        holdA('down'); tap('jump', 2); k.dropped = true; k.w = 0;
        return;
      }
      holdA('down');
      k.w += STEP;
      if (!p.onGround) k.left = true;
      if (k.left) { moveToward(X(o.at), 4); if (p.onGround) return on(o.land[0], o.land[1], o.land[2]) ? 'done' : 'fail'; }
      if (!k.left && k.w > 0.5) { k.dropped = false; }
    }, { skip: o.skip, timeout: 8 });
  }

  // Clear the enemies the filter selects, taking them on one at a time.
  function fight(name, filter, opts = {}) {
    return task(name, () => {
      if (opts.skip && opts.skip()) return 'done';
      const p = P();
      const list = G.enemies.filter((e) => !e.dead && filter(e));
      if (!list.length) return 'done';
      let best = null, bd = Infinity;
      for (const e of list) { const d = Math.abs(e.cx - p.cx) + Math.abs(e.cy - p.cy) * 2; if (d < bd) { bd = d; best = e; } }
      engage(best);
    }, { timeout: opts.timeout || 40, skip: opts.skip, onTimeout: 'next' });
  }

  // Deal with the moths close enough to notice the Wick; done once none are.
  function clearMoths(name, radius = 260, skip) {
    return task(name, () => {
      const p = P();
      const near = G.enemies.filter((e) => e instanceof SootMoth && !e.dead && Math.hypot(e.cx - p.cx, e.cy - p.cy) < radius &&
        (e.state !== 'idle' || G.room.clearLine(e.cx, e.cy, p.cx, p.cy)));
      if (!near.length) return 'done';
      engage(near[0]);
    }, { timeout: 30, skip, onTimeout: 'next' });
  }

  function exit(dir) {
    return task(dir > 0 ? 'exit right' : 'exit left', (k) => {
      const p = P();
      holdA(dir > 0 ? 'right' : 'left');
      k.stall = p.onGround && Math.abs(p.vx) < 5 ? (k.stall || 0) + STEP : 0;
      if (k.stall > 0.3 && onOneWay(G.room, p)) { holdA('down'); tap('jump', 2); k.stall = 0; }
    }, { timeout: 15 });
  }

  function restHere() {
    return task('rest at the shrine', (k) => {
      const p = P(), s = G.shrine;
      if (!s) return 'done';
      // The route pauses while the Wick sits, so finish as soon as this shrine is the save point.
      if (k.asked && p.state === 'normal' && G.save.spawn && G.save.spawn.room === G.room.id) return 'done';
      if (moveToward(s.x - 8, 3) && p.onGround && s.near(p)) { tap('up', 2); k.asked = true; }
    }, { timeout: 20 });
  }

  // ------------------------------------------------------------------ the Chandler
  // Every step: pick an intent (close in, strike, throw a cinder, keep distance), then look 0.8 s ahead.
  // For each candidate move the Wick's path is simulated with the game's movement rules and checked
  // against the predicted paths of every drip, shockwave, orb, the swipe and the boss's own body.
  // The move closest to the intent that collides with nothing is the one that gets pressed.
  const HORIZON = 96; // steps (0.8 s)
  // How far a charging sentinel can go before it runs out of floor or meets a wall.
  function chargeRoom(e) {
    const room = G.room, fy = e.y + e.h + 4;
    // the game also stops walkers at the room's own edges
    const edge = e.face > 0 ? room.w * T - 2 - e.w - e.x : e.x - 2;
    let d = 0;
    for (; d < Math.min(400, edge); d += 8) {
      const fx = e.face > 0 ? e.x + e.w + d : e.x - d;
      if (!groundAt(room, fx, fy) || room.solidPx(fx, e.y + e.h / 2)) break;
    }
    return Math.min(d, Math.max(0, edge));
  }
  function enemyThreat(e) {
    const inflate = (bx, m) => ({ x: bx.x - m, y: bx.y - m, w: bx.w + m * 2, h: bx.h + m * 2 });
    if (e instanceof SootMoth) { const f = predictor(e); return (t) => inflate(f(t), 2); }
    if (e instanceof Wickling) {
      // Knocked back for a moment, then it walks again, turning around where its floor ends.
      const room = G.room, fy = e.y + e.h + 4;
      let edge = 0;
      for (; edge < 120; edge += 4) {
        const fx = e.face > 0 ? e.x + e.w + 2 + edge : e.x - 2 - edge;
        if (!groundAt(room, fx, fy) || room.solidPx(fx, e.y + e.h / 2)) break;
      }
      return (t) => {
        const st = Math.max(0, e.stun), knock = e.vx * Math.min(t, st) * 0.5, walk = 46 * Math.max(0, t - st);
        const fwd = walk <= edge ? walk : edge - (walk - edge);
        return inflate(shift(e, knock + e.face * fwd, 0), 3);
      };
    }
    if (e instanceof Sentinel) {
      const lim = chargeRoom(e);
      if (e.state === 'charge') return (t) => inflate(shift(e, e.face * Math.min(340 * t, lim), 0), 3);
      if (e.state === 'wind') return (t) => inflate(shift(e, e.face * Math.min(340 * Math.max(0, t - e.st), lim), 0), 3);
      return (t) => inflate(shift(e, e.vx * Math.min(t, 0.3), 0), 3);
    }
    return () => inflate(e, 2);
  }
  function bossThreats(skip, moving) {
    const L = [], b = G.boss, A = G.arena || { floor: 1e9, x0: -1e9, x1: 1e9 }, FLOOR = A.floor;
    for (const e of G.enemies) {
      if (e.dead || e === b || e === skip || !e.contact) continue;
      // `moving`: only what is coming at us (used to vet scripted moves)
      if (moving) {
        if (e instanceof Spitter) continue; // it never moves: the route walks around it
        if (e instanceof SootMoth && e.state !== 'wind' && e.state !== 'swoop') continue;
        if (e instanceof Sentinel && e.state !== 'charge' && e.state !== 'wind' && !(sameLevel(e, 30) && gapTo(e) < 90)) continue;
      }
      L.push(enemyThreat(e));
    }
    for (const q of G.projs) {
      if (q.dead) continue;
      if (q instanceof Drip) {
        const wait = Math.max(0, q.delay - q.t), vy0 = wait > 0 ? 0 : q.vy;
        L.push((t) => {
          if (t < wait) return null;
          const tt = t - wait, y = q.y + vy0 * tt + 750 * tt * tt;
          return y + q.h > FLOOR + 4 ? null : { x: q.x - 2, y, w: q.w + 4, h: q.h + 6 };
        });
      } else if (q instanceof Wave) {
        L.push((t) => { const x = q.x + q.vx * t; return x < A.x0 - 4 || x + q.w > A.x1 + 4 ? null : { x: x - 3, y: q.y - 2, w: q.w + 6, h: q.h + 2 }; });
      } else if (q instanceof Orb) {
        L.push((t) => { const y = q.y + q.vy * t + 450 * t * t; return y + q.h > FLOOR + 2 ? null : { x: q.x + q.vx * t - 2, y: y - 2, w: q.w + 4, h: q.h + 4 }; });
      } else if (q.hostile && q !== skip) {
        // A glob the blade will be ready to meet is the counter-strike's job, not worth a dodge.
        if (q.slashable && Math.max(P().attackCD, P().attackT) < 0.12) continue;
        L.push((t) => ({ x: q.x + q.vx * t - 2, y: q.y + q.vy * t - 2, w: q.w + 4, h: q.h + 4 }));
      }
    }
    if (!b || !b.contact || b === skip) return L;
    const sp = b.phase === 2 ? 640 : 560, cx = (x) => clamp(x, A.x0, A.x1 - b.w);
    const box = (x, y) => ({ x: x - 3, y: y - 2, w: b.w + 6, h: b.h + 2 });
    const ballistic = (x0, y0, vx, vy) => (tt) => {
      const tl = (-vy + Math.sqrt(vy * vy + 4400 * Math.max(0, FLOOR - (y0 + b.h)))) / 2200;
      const t2 = Math.min(tt, tl);
      return box(cx(x0 + vx * t2), Math.min(FLOOR - b.h, y0 + vy * t2 + 1100 * t2 * t2));
    };
    switch (b.state) {
      case 'charge': L.push((t) => box(cx(b.x + b.vx * t), b.y)); break;
      case 'chargePrep': L.push((t) => box(cx(b.x + b.face * sp * Math.max(0, t - b.st)), b.y)); break;
      case 'leap': { const f = ballistic(b.x, b.y, b.vx, b.vy); L.push(f); break; }
      case 'leapPrep': {
        const tx = clamp(P().cx, A.x0 + 40, A.x1 - 40), vx = clamp((tx - b.cx) / 0.82, -520, 520);
        const f = ballistic(b.x, b.y, vx, -900);
        L.push((t) => (t < b.st ? box(b.x, b.y) : f(t - b.st)));
        break;
      }
      case 'walk': L.push((t) => box(cx(b.x + b.vx * Math.min(t, b.st)), b.y)); break;
      default: L.push((t) => box(cx(b.x + b.vx * Math.min(t, 0.15)), b.y));
    }
    // Shockwaves a landing will send out, and orbs a volley has yet to throw.
    if (b.state === 'leap' || b.state === 'leapPrep') {
      let tl, lx;
      if (b.state === 'leap') {
        tl = (-b.vy + Math.sqrt(b.vy * b.vy + 4400 * Math.max(0, FLOOR - (b.y + b.h)))) / 2200;
        lx = cx(b.x + b.vx * tl) + b.w / 2;
      } else {
        const tx = clamp(P().cx, A.x0 + 40, A.x1 - 40), vx = clamp((tx - b.cx) / 0.82, -520, 520);
        tl = b.st + 0.82; lx = cx(b.x + vx * 0.82) + b.w / 2;
      }
      for (const spd of b.phase === 2 ? [430, 240] : [380]) for (const d of [-1, 1]) {
        const x0 = lx + d * 30 - 13;
        L.push((t) => {
          if (t < tl) return null;
          const x = x0 + d * spd * (t - tl);
          return x < A.x0 - 4 || x + 26 > A.x1 + 4 ? null : { x: x - 3, y: FLOOR - 32, w: 32, h: 32 };
        });
      }
    }
    if (b.state === 'volley' && b.thrown < 3) {
      const tn = Math.max(0, b.st - 0.5), hp = b.headPos(), tt = 0.9;
      const tx = P().cx + (b.thrown - 1) * 90, vx = (tx - hp.x) / tt, vy = (P().cy - hp.y - 405 * tt * tt) / tt;
      L.push((t) => {
        if (t < tn) return null;
        const s2 = t - tn, y = hp.y - 8 + vy * s2 + 450 * s2 * s2;
        return y + 16 > FLOOR + 2 ? null : { x: hp.x - 10 + vx * s2, y: y - 2, w: 20, h: 20 };
      });
    }
    if (b.state === 'swipePrep' || b.state === 'swipe') {
      const t0 = b.state === 'swipePrep' ? b.st - 0.03 : 0, t1 = (b.state === 'swipePrep' ? b.st + 0.2 : b.st) + 0.03;
      const sw = b.face > 0 ? { x: b.x + b.w - 14, y: b.y + 4, w: 132, h: 90 } : { x: b.x - 118, y: b.y + 4, w: 132, h: 90 };
      L.push((t) => (t >= t0 && t <= t1 ? sw : null));
    }
    return L;
  }

  // The Wick's path for a held direction u, an optional jump (held for `hold` steps) or a flicker, using
  // the game's own movement numbers and tile collision. A step that touches thorns or molten wax is marked.
  // jumpAt > 0 plans the jump for later: on the first grounded step from then on.
  function simPath(u, hold, dash, stopAt, jumpAt = 0) {
    const p = P(), room = G.room, out = [];
    const u0 = u;
    const b = { x: p.x, y: p.y, w: p.w, h: p.h, dropping: 0 };
    let vx = p.vx, vy = p.vy, ground = p.onGround, jumpLeft = 0, dashT = 0, floatT = p.floatT || 0, dashDir = u;
    let later = jumpAt > 0 ? hold : 0;
    if (later) hold = 0;
    // A flicker already under way runs its course first; the jump button does nothing during it.
    if (p.state === 'dash') { dashT = p.dashT; dashDir = p.dashDir; hold = 0; }
    else if (hold && (ground || p.coyote > 0)) { vy = -PL.JUMP_V; ground = false; jumpLeft = hold; }
    if (dash && p.state !== 'dash') { dashT = PL.DASH_T; vy = 0; }
    for (let k = 1; k <= HORIZON; k++) {
      const dt = STEP;
      if (later && k >= jumpAt && ground && dashT <= 0) { vy = -PL.JUMP_V; ground = false; jumpLeft = later; later = 0; }
      if (dashT > 0) { vx = dashDir * PL.DASH_V; vy = 0; dashT -= dt; if (dashT <= 0) { vx = dashDir * PL.RUN; floatT = 0.1; } }
      else {
        if (stopAt !== undefined && u0) {
          // walk to the stop point, then let go
          const cxs = b.x + b.w / 2, brake = (vx * vx) / (2 * (ground ? PL.DEC_G : PL.DEC_A));
          u = (u0 > 0 ? cxs < stopAt - brake : cxs > stopAt + brake) ? u0 : 0;
        }
        const acc = ground ? (u ? PL.ACC_G : PL.DEC_G) : (u ? PL.ACC_A : PL.DEC_A);
        vx = approach(vx, u * PL.RUN, acc * dt);
        if (jumpLeft > 0) { jumpLeft--; if (jumpLeft === 0 && vy < 0) vy *= PL.JUMP_CUT; }
        let g = vy < 0 ? PL.GRAV : PL.GRAV_FALL;
        if (Math.abs(vy) < 90 && jumpLeft > 0) g *= 0.55;
        if (floatT > 0) { g *= 0.2; floatT -= dt; }
        vy = Math.min(vy + g * dt, PL.MAXFALL);
      }
      if (moveX(room, b, vx * dt)) vx = 0;
      const r = moveY(room, b, vy * dt);
      if (r === 1) { ground = true; vy = 0; } else { if (r === -1) vy = 0; ground = false; }
      const hb = { x: b.x + 3, y: b.y + 4, w: b.w - 6, h: b.h - 6 };
      if (hazardAt(room, b)) hb.hazard = true;
      out.push(hb);
    }
    return out;
  }

  function firstHit(path, threats) {
    firstHit.hz = false;
    for (let k = 0; k < path.length; k++) {
      const t = (k + 1) / 120, pb = path[k];
      if (pb.hazard) { firstHit.hz = true; return t; }
      for (const f of threats) { const tb = f(t); if (tb && overlap(pb, tb)) return t; }
    }
    return Infinity;
  }

  function safeMove(intentU, intentHold, skip, stopAt, moving) {
    const p = P(), threats = bossThreats(skip, moving), plans = [];
    const add = (u, hold, dash) => {
      const path = simPath(u, hold, dash, u === intentU && !hold ? stopAt : undefined);
      const end = path[path.length - 1];
      const t = firstHit(path, threats);
      plans.push({ u, hold, dash, t, hz: firstHit.hz, drop: end.y + end.h - (p.y + p.h - 2) > 48 });
    };
    // Most of the time the intended move is already safe: then nothing else needs simulating.
    const h0 = p.onGround && p.state === 'normal' ? intentHold : 0;
    const first = { u: intentU, hold: h0, dash: false, t: firstHit(simPath(intentU, h0, false, h0 ? undefined : stopAt), threats) };
    if (first.t === Infinity) return first;
    const us = [...new Set([intentU, 0, -1, 1])];
    const canJump = p.onGround && p.state === 'normal';
    for (const u of us) {
      add(u, 0, false);
      if (canJump) { add(u, 50, false); add(u, 24, false); }
    }
    if (G.hasDash && p.dashCD <= 0 && p.state === 'normal') { add(-1, 0, true); add(1, 0, true); }
    // Nothing safe right now: a jump timed a little later often is (vaulting a charge, hopping a wave).
    // Keep doing the same thing until then; each step re-plans, so the jump comes when its moment does.
    if (!plans.some((pl) => pl.t === Infinity && !pl.hz) && p.state !== 'dash') {
      const ds = p.onGround ? [10, 18, 28, 40, 56, 72] : [1, 10, 18, 28, 40];
      for (const u of new Set([intentU, 0])) {
        for (const d of ds) {
          const path = simPath(u, 50, false, undefined, d);
          if (firstHit(path, threats) === Infinity && !firstHit.hz) { plans.push({ u, hold: 0, dash: false, t: Infinity, hz: false, later: d }); break; }
        }
      }
    }
    let best = null, bs = Infinity;
    for (const pl of plans) {
      let score = pl.t === Infinity ? 0 : 1000 - pl.t * 100;
      if (pl.hz) score += 500; // thorns and molten wax are worse than anything the blade can answer
      if (pl.u !== intentU) score += 3;
      if ((pl.hold > 0) !== (intentHold > 0)) score += 2;
      if (pl.later) score += 1;
      if (pl.hold === 24) score += 0.5;
      if (pl.dash) score += 6;
      if (pl.drop) score += 4; // falling off the ledge we stand on undoes the route
      if (score < bs) { bs = score; best = pl; }
    }
    return best;
  }

  // Press the safest buttons that stay close to what we meant to do.
  function actSafely(u, hold, skip, stopAt) {
    const p = P(), m = safeMove(u, hold, skip, stopAt);
    if (m.dash) { holdA(m.u > 0 ? 'right' : 'left'); tap('dash', 2); return m; }
    if (m.u) holdA(m.u > 0 ? 'right' : 'left');
    if (m.hold && p.onGround) tap('jump', m.hold);
    return m;
  }

  function bossBrain() {
    const p = P(), b = G.boss, A = G.arena;
    if (!b) return G.save.bossDead ? 'done' : undefined;
    if (b.state === 'dormant') { moveToward(X(11), 4); return; }
    if (b.state === 'wake' || p.state !== 'normal') return;
    const side = Math.sign(p.cx - b.cx) || 1, dirB = -side, gap = gapTo(b);
    const wallBehind = side > 0 ? A.x1 - (p.x + p.w) : p.x - A.x0;
    if (counterStrike()) return; // orbs out of the air

    // ---- intent
    let u = 0, hold = 0, act = null, stop;
    const open = ['stun', 'recover', 'roar', 'slam', 'rain', 'rainPrep', 'volley', 'idle'].includes(b.state);
    const closeOk = open && b.state !== 'dying' && (b.state !== 'idle' || b.st > 0.2) && !(b.state === 'stun' && b.st < 0.2);
    if (b.state === 'dying') u = gap < 80 ? side : 0;
    else if (!p.onGround && canStrike() && overlap(atkBox('down', p.face), b)) act = 'pogo';
    else if (G.tallow >= 33 && p.onGround && b.onGround && gap > 60) { if (p.face !== dirB) u = dirB; else act = 'cast'; }
    else if (closeOk) {
      if (gap > 22) { u = dirB; stop = b.cx - dirB * (b.w / 2 + 9 + 14); } else if (gap < 6) u = side;
      else if (p.face !== dirB) u = dirB; else act = 'strike';
    } else if (b.state === 'chargePrep' || b.state === 'charge') {
      // Cornered: hop onto the side ledge by the wall and let the charge pass underneath.
      const onLedge = p.onGround && feet() <= 15 * T + 1 && (p.x < 7 * T || p.x + p.w > 33 * T);
      // In the open there is no outrunning it: hold still and let the look-ahead time a vault over it.
      if (onLedge) u = 0;
      else if (wallBehind < 170) { u = side; if (p.onGround && wallBehind < 120) hold = 50; }
    } else if (['leapPrep', 'swipePrep', 'swipe', 'walk'].includes(b.state)) {
      if (wallBehind > 90) u = side;
    } else {
      if (gap < 140 && wallBehind > 70) u = side;
      else if (gap > 260 || (wallBehind < 50 && gap > 150)) { u = dirB; stop = b.cx - dirB * (b.w / 2 + 9 + 180); }
    }

    // ---- safety
    const m = actSafely(u, hold, undefined, u === dirB ? stop : undefined);
    if (m.dash) return;
    if (act === 'pogo') { aim('down', 4); tap('attack', 2); }
    else if (act === 'strike' && m.u !== side && canStrike() && p.face === dirB) tap('attack', 2);
    else if (act === 'cast' && !m.hold && m.u === 0 && p.attackT <= 0 && p.face === dirB) tap('ember', 2);
  }

  // ------------------------------------------------------------------ routes
  function planFor(id) {
    const hasDash = G.hasDash;
    const above = (row) => () => P().onGround && feet() <= row * T + 1;
    const past = (x) => P().cx > X(x);
    switch (id) {
      case 'wakefall': return [
        waitFor('wake up', () => P().state === 'normal'),
        walk(13.4, { skip: () => P().cx > X(15) }),
        jumpTo({ name: 'onto the step', from: 13.4, dir: 1, land: [15, 17, 10], steer: 16.2, skip: () => P().cx > X(15) }),
        // Only the stretch before the thorns: a crawler knocked into the pit is harmless and out of reach.
        fight('the first wickling', (e) => e instanceof Wickling && e.cx < X(24.8) && e.y + e.h <= 12 * T + 1),
        walk(24.2, { skip: () => P().cx > X(26) }),
        jumpTo({ name: 'over the thorns', from: 24.25, dir: 1, run: 2, land: [27, 35, 12], steer: 29, skip: () => P().cx > X(26) }),
        walk(34.9, { skip: () => P().cx > X(36) }),
        jumpTo({ name: 'onto the block', from: 34.9, dir: 1, land: [36, 40, 9], steer: 38, skip: () => P().cx > X(36) }),
        walk(41.5),
        fight('the second wickling', (e) => e instanceof Wickling && e.cx > X(40.5)),
        exit(1),
      ];
      case 'shaft': return hasDash ? [
        waitFor('land', () => P().onGround, { timeout: 4 }),
        walkOff({ name: 'down onto the next ledge', dir: 1, land: [13, 18, 7], steer: 15.5, skip: () => feet() > 7 * T + 2 }),
        dropAt({ name: 'drop to the stone block', at: 17, land: [16, 21, 13], skip: () => feet() > 13 * T + 2 }),
        walkOff({ name: 'off the block', dir: -1, land: [12, 17, 25], steer: 15.3, skip: () => feet() > 25 * T + 2 }),
        dropAt({ name: 'drop to the floor', at: 14.5, land: [0, 27, 34], skip: () => feet() > 34 * T - 2 }),
        fight('the wickling below', (e) => e instanceof Wickling && e.y + e.h > 33 * T),
        exit(1),
      ] : [
        fight('the wickling', (e) => e instanceof Wickling && e.y + e.h > 33 * T, { skip: above(31) }),
        walk(17, { skip: above(31) }),
        jumpTo({ from: 17, dir: 0, land: [16, 21, 31], steer: 18, skip: above(31) }),
        jumpTo({ from: 19.6, dir: 1, land: [21, 26, 28], steer: 23.5, skip: above(28) }),
        jumpTo({ from: 21.2, dir: -1, run: 3.5, land: [12, 17, 25], steer: 15, skip: above(25) }),
        jumpTo({ from: 12.3, dir: -1, run: 3, land: [4, 9, 22], steer: 7, skip: above(22) }),
        jumpTo({ from: 5.6, dir: -1, land: [1, 4, 19], steer: 2.5, skip: above(19) }),
        clearMoths('the low moth'),
        jumpTo({ from: 4.3, dir: 1, run: 2.5, land: [8, 13, 16], steer: 10.5, skip: above(16) }),
        clearMoths('the moths'),
        jumpTo({ from: 13.4, dir: 1, run: 2, land: [16, 21, 13], steer: 18, skip: above(13) }),
        clearMoths('the high moth'),
        jumpTo({ from: 20.6, dir: 1, land: [22, 26, 10], steer: 24, skip: above(10) }),
        jumpTo({ from: 22.2, dir: -1, run: 3, land: [13, 18, 7], steer: 16, skip: above(7) }),
        jumpTo({ from: 13.5, dir: 0, land: [9, 14, 4], steer: 13.5, skip: above(4) }),
        walk(13.6),
        task('jump up out of the shaft', (k) => { if (!k.j) { tap('jump', 60); k.j = true; } }, { timeout: 6 }),
      ];
      case 'shrine': return [
        walk(24.3, { skip: () => G.hasDash }),
        jumpTo({ name: 'onto the altar', from: 24.3, dir: 1, land: [25, 31, 11], steer: 28.5, skip: () => G.hasDash }),
        waitFor('take the relic', () => G.hasDash && P().state === 'normal', { timeout: 10 }),
        walk(8.1),
        restHere(),
        walk(15.5),
        dropAt({ name: 'back down the shaft', at: 15.5, land: [0, 40, 99] }),
      ];
      case 'longdrip': return [
        walk(2.5, { skip: () => P().cx > X(6) }),
        jumpTo({ name: 'flicker over the first channel', from: 5.55, dir: 1, run: 3, dash: 0.2, land: [13, 24, 12], steer: 16, skip: () => P().cx > X(6) }),
        fight('the first sentinel', (e) => e instanceof Sentinel && e.cx < X(25), { timeout: 60, skip: () => past(30) }),
        walk(23.9, { skip: () => (feet() <= 9 * T + 1 && P().cx > X(24.5)) || past(31) }),
        jumpTo({ name: 'onto the pillar', from: 23.9, dir: 1, land: [25, 30, 9], steer: 26.2, skip: () => (feet() <= 9 * T + 1 && P().cx > X(24.5)) || past(31) }),
        fight('the spitter on the pillar', (e) => e instanceof Spitter && e.cx < X(32), { skip: () => past(31) }),
        clearMoths('the moth over the channel', 320, () => past(37)),
        jumpTo({ name: 'flicker over the second channel', from: 30.6, dir: 1, run: 4.5, dash: 0.2, land: [38, 43, 9], steer: 40.5, skip: () => P().cx > X(37) }),
        walk(43.35, { skip: () => G.save.heart || past(57.5) }),
        task('break the cracked wall', () => {
          if (!G.room.walls.length) return 'done';
          face(X(45));
          if (canStrike() && P().face > 0) tap('attack', 2);
        }, { skip: () => G.save.heart || past(57.5), timeout: 8 }),
        walk(54.4, { skip: () => G.save.heart || past(57.5) }),
        waitFor('take the wax heart', () => G.save.heart && P().state === 'normal', { skip: () => G.save.heart || past(57.5), timeout: 8 }),
        walk(41.5, { skip: () => feet() <= 5 * T + 1 || past(57.5) }),
        jumpTo({ name: 'onto the iron ledge', from: 41.5, dir: 0, land: [40, 42, 7], steer: 41.5, skip: () => feet() <= 5 * T + 1 || past(57.5) }),
        jumpTo({ name: 'up to the high path', from: 42.3, dir: 1, land: [44, 57, 5], steer: 46, skip: () => (feet() <= 5 * T + 1 && P().cx > X(44)) || past(57.5) }),
        fight('the wickling on the high path', (e) => e instanceof Wickling && e.cy < X(6), { skip: () => past(57.5) }),
        walk(56.2, { skip: () => past(57.5) }),
        walkOff({ name: 'down to the first iron ledge', dir: 1, land: [59, 61, 8], steer: 60.2, skip: () => past(58.3) }),
        jumpTo({ name: 'over the thorns', from: 61.6, dir: 1, run: 1.5, land: [65, 67, 8], steer: 66, skip: () => past(63.5) }),
        task('the spitter on the ceiling', () => {
          // Stand under it on the middle ledge, jump and strike upward; its globs fall into the blade.
          const sp = G.enemies.find((e) => e instanceof Spitter && !e.dead && e.ny > 0);
          if (!sp) return 'done';
          const p = P();
          if (p.onGround) {
            if (!moveToward(sp.cx, 3)) return;
            // A short hop: high enough for the upward strike to reach it, low enough to keep clear of its body.
            if (canStrike() && !threatSoon(0.3)) tap('jump', 14);
            return;
          }
          if (canStrike() && overlap(atkBox('up', p.face), sp)) { aim('up', 4); tap('attack', 2); }
        }, { skip: () => past(68.5) || !on(65, 67, 8), timeout: 20 }),
        jumpTo({ name: 'over the thorns again', from: 67.6, dir: 1, run: 1.5, land: [71, 72, 8], steer: 71.9, skip: () => past(69.5) }),
        walkOff({ name: 'down to the floor', dir: 1, land: [73, 90, 12], rows: [10], steer: 77, skip: () => past(73) && feet() >= 10 * T - 1 }),
        // Only the main floor: a crawler knocked onto the little ledge or into the thorns is out of the way.
        fight('the last crawlers', (e) => (e instanceof Wickling || e instanceof Sentinel) && e.cx > X(73) && e.y + e.h >= 12 * T - 2, { timeout: 60 }),
        exit(1),
      ];
      case 'antechamber': return [
        walk(12.1),
        restHere(),
        exit(1),
      ];
      case 'hall': return [
        task('face the Chandler', bossBrain, { timeout: 400 }),
        exit(1),
      ];
      case 'threshold': return [
        task('walk to the sealed door', () => { holdA('right'); }, { timeout: 15 }),
      ];
    }
    return [exit(1)];
  }

  // A scripted move must not walk into something hostile: check the buttons the route chose against the
  // look-ahead, and swap them for a safe alternative when they would collide.
  function guard() {
    const p = P();
    const near = G.enemies.some((e) => !e.dead && e.contact && Math.hypot(e.cx - p.cx, e.cy - p.cy) < 260) ||
      G.projs.some((q) => q.hostile && !q.dead && Math.hypot(q.cx - p.cx, q.cy - p.cy) < 260);
    if (!near) return;
    const u = S.hold.right ? 1 : S.hold.left ? -1 : 0;
    const hold = S.pulses.jump ? Math.abs(S.pulses.jump) : 0;
    const threats = bossThreats(null, true);
    if (!threats.length) return;
    const t = firstHit(simPath(u, hold && p.onGround ? hold : 0, false), threats);
    if (t > 0.35) return;
    const m = safeMove(u, hold, null, undefined, true);
    if (m.u === u && (m.hold > 0) === (hold > 0) && !m.dash) return;
    S.hold.left = S.hold.right = false;
    if (!m.hold) delete S.pulses.jump;
    if (m.dash) { holdA(m.u > 0 ? 'right' : 'left'); tap('dash', 2); return; }
    if (m.u) holdA(m.u > 0 ? 'right' : 'left');
    if (m.hold && p.onGround) tap('jump', m.hold);
  }

  function resetPlan() { S.plan = planFor(G.room.id); S.idx = 0; }

  function runPlan() {
    if (!S.plan) resetPlan();
    while (S.idx < S.plan.length) {
      const k = S.plan[S.idx];
      if (!k.begun) {
        if (k.skip && k.skip()) { S.idx++; continue; }
        k.begun = true; k.t = 0;
      }
      k.t += STEP;
      S.goal = k.name;
      const r = k.run(k);
      if (r === 'done') { S.idx++; return; }
      if (r !== 'fail' && k.t > k.timeout && k.onTimeout === 'next') {
        note(`${G.room.id}: "${k.name}" timed out; moving on`);
        S.idx++; return;
      }
      if (r === 'fail' || k.t > k.timeout) {
        note(`${G.room.id}: "${k.name}" ${r === 'fail' ? 'missed' : 'timed out'}; replanning`);
        S.restarts++;
        resetPlan();
      }
      return;
    }
  }

  // ------------------------------------------------------------------ main step
  function decide() {
    S.step++;
    S.hold = {};
    if (S.finished) { compose(); return; }
    if (G.state === 'ending') { finish(true); compose(); return; }
    if (G.state === 'banner') { if (S.step % 6 === 0) tap('jump', 2); compose(); return; }
    if (G.state === 'rest') {
      const btn = document.getElementById('btn-temper');
      if (!G.tempered && G.embers >= 80 && btn && !btn.disabled) btn.click();
      else if (S.step % 6 === 0) tap('pause', 2);
      compose(); return;
    }
    if (G.state !== 'play' || !G.room || !G.player) { compose(); return; }
    if (G.room.id !== S.room) { S.room = G.room.id; resetPlan(); S.timed.length = 0; }
    const p = P();
    // Actions a jump scheduled (a flicker at its moment) happen even if the defence layer is busy.
    for (let i = S.timed.length - 1; i >= 0; i--) if (S.step >= S.timed[i].at) { tap(S.timed[i].a, 2); S.timed.splice(i, 1); }
    if (p.onGround) S.steerTo = null;
    if (p.state === 'normal' && !G.busy) {
      if (G.room.id === 'hall' && G.boss) bossBrain();
      else if (!defend()) { runPlan(); guard(); }
      else if (!p.onGround && S.steerTo != null && !S.hold.left && !S.hold.right) moveToward(S.steerTo, 3); // keep steering the jump
    } else if (p.state === 'wake') runPlan();
    if (G.boss && G.room.id === 'hall') S.goal = 'the Chandler';
    compose();
  }

  function note(msg) { S.log.push(`[${G.clock.toFixed(1)}s] ${msg}`); if (S.log.length > 200) S.log.shift(); }

  function finish(ok) {
    if (S.finished) return;
    S.finished = true;
    S.result = { ok, time: +G.stats.time.toFixed(1), hits: S.hits, deaths: S.deaths, restarts: S.restarts, heart: !!G.save.heart, hitLog: S.hitLog, log: S.log };
    note(ok ? 'reached the end' : 'stopped');
  }

  function hookTelemetry() {
    const hurt = G.onPlayerHurt, hz = G.hazardHit, die = G.onPlayerDeath;
    G.onPlayerHurt = function (pl) {
      if (S.active) {
        S.hits++;
        const near = [...G.enemies, ...G.projs].filter((e) => !e.dead).sort((a, b2) => Math.hypot(a.cx - pl.cx, a.cy - pl.cy) - Math.hypot(b2.cx - pl.cx, b2.cy - pl.cy))[0];
        const what = near ? `${near.constructor.name}${near.state ? ':' + near.state : ''}` : '?';
        const b = G.boss;
        const ctx = `${pl.onGround ? 'ground' : 'air'} vx${pl.vx | 0} vy${pl.vy | 0}` + (b ? ` boss:${b.state} gap${gapTo(b) | 0}` : '') +
          (near && near.vx !== undefined ? ` threat at x${(near.cx / T).toFixed(1)} y${(near.cy / T).toFixed(1)} v${near.vx | 0},${near.vy | 0}` : '');
        S.hitLog.push(`${G.room.id} x${(pl.cx / T).toFixed(1)} y${(pl.cy / T).toFixed(1)} by ${what} during "${G.boss ? 'the Chandler' : S.goal}" [${ctx}]`);
      }
      return hurt.apply(this, arguments);
    };
    G.hazardHit = function (kind) {
      if (S.active && !G.busy && G.player.state !== 'dead') { S.hits++; S.hitLog.push(`${G.room.id} x${(G.player.cx / T).toFixed(1)} fell into ${kind === '~' ? 'molten wax' : 'thorns'} during "${S.goal}"`); }
      return hz.apply(this, arguments);
    };
    G.onPlayerDeath = function () { if (S.active) S.deaths++; return die.apply(this, arguments); };
  }
  let hooked = false;

  function start(opts = {}) {
    if (!hooked) { hookTelemetry(); hooked = true; }
    Object.assign(S, { active: true, step: 0, hold: {}, prev: {}, pulses: {}, sticky: {}, timed: [], steerTo: null, room: null, plan: null, idx: 0, restarts: 0, hits: 0, hitLog: [], deaths: 0, finished: false, result: null, log: [] });
    S.speed = opts.speed || 1;
    S.sim = !!opts.sim;
  }
  function stop() { S.active = false; Input.botHeld = null; }

  function drawHUD(ctx, s) {
    const x = G.cssW / 2, y = G.safe.t + 18 * s;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.font = `${Math.round(13 * s)}px ${FONT_DISPLAY}`;
    ctx.fillStyle = 'rgba(255,190,120,0.9)';
    ctx.fillText(`Autopilot${S.speed !== 1 ? ' ×' + S.speed : ''}  ·  hits taken: ${S.hits}`, x, y);
    ctx.font = `italic ${Math.round(14 * s)}px ${FONT_BODY}`;
    ctx.fillStyle = 'rgba(235,225,205,0.75)';
    ctx.fillText(S.goal, x, y + 18 * s);
  }

  return {
    get active() { return S.active; },
    get sim() { return S.sim; },
    get speed() { return S.speed; },
    get finished() { return S.finished; },
    get result() { return S.result; },
    get state() { return S; },
    start, stop, decide, drawHUD, finish,
  };
})();
