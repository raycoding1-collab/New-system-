'use strict';
// The Wick: a candle-headed wanderer with an iron snuffer.

const PL = {
  RUN: 250, ACC_G: 2800, DEC_G: 3400, ACC_A: 2100, DEC_A: 1300,
  GRAV: 2000, GRAV_FALL: 2350, MAXFALL: 820, JUMP_V: 700, JUMP_CUT: 0.42,
  COYOTE: 0.1, BUFFER: 0.13,
  DASH_V: 770, DASH_T: 0.155, DASH_CD: 0.36,
  ATK_T: 0.26, ATK_CD: 0.29, ATK_ACTIVE: 0.11,
  POGO_V: 560, MEND_T: 0.82, TAP_T: 0.2,
};

class Player {
  constructor(x, footY) {
    this.w = 18; this.h = 30;
    this.x = x - this.w / 2; this.y = footY - this.h;
    this.vx = 0; this.vy = 0; this.face = 1;
    this.onGround = false; this.coyote = 0; this.jumpBuf = 0; this.jumping = false; this.dropping = 0;
    this.state = 'normal';
    this.dashT = 0; this.dashCD = 0; this.dashDir = 1; this.airDash = true; this.ghostT = 0;
    this.attackT = 0; this.attackCD = 0; this.attackDir = 'side'; this.atkBuf = 0; this.swing = 0; this.hits = new Set();
    this.invuln = 0; this.hurtT = 0;
    this.emberDown = false; this.emberHold = 0; this.mendT = 0;
    this.sqx = 1; this.sqy = 1; this.lean = 0; this.runPhase = 0; this.blink = 0; this.blinkT = 2;
    this.ghosts = [];
    this.scarf = [];
    for (let i = 0; i < 6; i++) this.scarf.push({ x: this.x, y: this.y + 11 });
    this.lastSafe = { x: this.x, y: this.y };
    this.deadT = 0; this.sitT = 0; this.wakeT = 0;
    this.visible = true;
    this.fallSpeed = 0;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  get hurtbox() { return { x: this.x + 3, y: this.y + 4, w: this.w - 6, h: this.h - 6 }; }

  attackBox() {
    const d = this.attackDir;
    if (d === 'up') return { x: this.cx - 22, y: this.y - 50, w: 44, h: 54 };
    if (d === 'down') return { x: this.cx - 21, y: this.y + this.h - 6, w: 42, h: 50 };
    return this.face > 0 ? { x: this.x + this.w - 4, y: this.y - 8, w: 50, h: this.h + 14 } : { x: this.x - 46, y: this.y - 8, w: 50, h: this.h + 14 };
  }

  update(dt, G) {
    const I = Input, room = G.room;
    const tick = (k) => { if (this[k] > 0) this[k] -= dt; };
    tick('coyote'); tick('jumpBuf'); tick('floatT'); tick('dashCD'); tick('attackCD'); tick('invuln'); tick('hurtT'); tick('atkBuf'); tick('dropping');
    this.sqx = damp(this.sqx, 1, 14, dt); this.sqy = damp(this.sqy, 1, 14, dt);
    this.blinkT -= dt; if (this.blinkT < 0) { this.blink = 0.12; this.blinkT = rr(2, 5); } if (this.blink > 0) this.blink -= dt;
    for (let i = this.ghosts.length - 1; i >= 0; i--) { this.ghosts[i].life -= dt; if (this.ghosts[i].life <= 0) this.ghosts.splice(i, 1); }

    if (this.state === 'dead') { this.deadT += dt; this.vx = damp(this.vx, 0, 5, dt); this.physics(dt, G, true); this.updateScarf(dt, G); return; }
    if (this.state === 'wake') {
      this.wakeT += dt;
      if (this.wakeT > 2.4) this.state = 'normal';
      this.physics(dt, G, true); this.updateScarf(dt, G); return;
    }
    if (this.state === 'sit') {
      this.sitT += dt;
      this.vx = 0; this.physics(dt, G, false); this.updateScarf(dt, G);
      return;
    }
    if (this.state === 'cutscene' || this.state === 'relic') {
      this.vx = damp(this.vx, 0, 10, dt); this.physics(dt, G, true); this.updateScarf(dt, G); return;
    }

    const control = this.hurtT <= 0;
    const mx = control ? (I.held.right ? 1 : 0) - (I.held.left ? 1 : 0) : 0;

    // ---- Ember button: tap hurls a cinder, hold mends a flame ----
    if (I.pressed.ember) { this.emberDown = true; this.emberHold = 0; }
    if (this.emberDown) {
      if (I.held.ember) this.emberHold += dt;
      if (this.state === 'normal' && this.emberHold > PL.TAP_T && this.onGround && this.attackT <= 0 && G.tallow >= 33 && G.hp < G.maxHp) {
        this.state = 'mend'; this.mendT = 0; Sound.play('mendStart');
      }
      if (I.released.ember || !I.held.ember) {
        if (this.emberHold < PL.TAP_T && this.state === 'normal') this.cast(G);
        this.emberDown = false;
        if (this.state === 'mend') this.state = 'normal';
      }
    }

    if (this.state === 'mend') {
      this.vx = approach(this.vx, 0, PL.DEC_G * dt);
      this.mendT += dt;
      if (Math.random() < dt * 40) {
        const a = rr(0, TAU), r = rr(40, 70);
        const p = Particles.spawn(P_GLINT, this.cx + Math.cos(a) * r, this.cy + Math.sin(a) * r, -Math.cos(a) * r * 2.2, -Math.sin(a) * r * 2.2, 0.42, rr(2, 3.5));
        if (p) p.drag = 0;
      }
      if (this.mendT >= PL.MEND_T) {
        G.hp = Math.min(G.maxHp, G.hp + 1); G.tallow -= 33; this.mendT = 0;
        Sound.play('mend'); FX.embers(this.cx, this.y + 4, 14, 80);
        this.sqx = 1.15; this.sqy = 0.9; G.hudPulse = 1;
        if (!(I.held.ember && G.tallow >= 33 && G.hp < G.maxHp)) { this.state = 'normal'; this.emberDown = false; }
        else Sound.play('mendStart');
      }
      if (!this.onGround) this.state = 'normal';
    }

    // ---- Dash ----
    if (G.hasDash && I.pressed.dash && this.dashCD <= 0 && (this.onGround || this.airDash) && (this.state === 'normal') && control) {
      this.state = 'dash'; this.dashT = PL.DASH_T;
      this.dashDir = mx !== 0 ? mx : this.face; this.face = this.dashDir;
      if (!this.onGround) this.airDash = false;
      this.vy = 0; this.attackT = 0; this.ghostT = 0;
      this.sqx = 1.35; this.sqy = 0.78;
      Sound.play('dash'); FX.dust(this.cx - this.dashDir * 8, this.y + this.h, 6, -this.dashDir);
      G.shake(0.12);
    }
    if (this.state === 'dash') {
      this.dashT -= dt;
      this.vx = this.dashDir * PL.DASH_V; this.vy = 0;
      this.ghostT -= dt;
      if (this.ghostT <= 0) { this.ghosts.push({ x: this.cx, y: this.y + this.h, face: this.face, life: 0.24 }); this.ghostT = 0.022; }
      if (Math.random() < 0.6) Particles.spawn(P_EMBER, this.cx - this.dashDir * 10, this.cy + rr(-8, 8), -this.dashDir * rr(60, 160), rr(-40, 20), rr(0.2, 0.45), rr(1.5, 3));
      if (this.dashT <= 0) { this.state = 'normal'; this.dashCD = PL.DASH_CD; this.vx = this.dashDir * PL.RUN; this.floatT = 0.1; }
    }

    // ---- Run ----
    if (this.state === 'normal') {
      const target = mx * PL.RUN;
      let acc;
      if (this.onGround) acc = mx ? (Math.sign(this.vx) !== mx && this.vx !== 0 ? PL.DEC_G * 1.3 : PL.ACC_G) : PL.DEC_G;
      else acc = mx ? PL.ACC_A : PL.DEC_A;
      this.vx = approach(this.vx, target, acc * dt);
      if (mx && !(this.attackT > PL.ATK_T - PL.ATK_ACTIVE)) this.face = mx;
    }

    // ---- Jump ----
    if (I.pressed.jump) this.jumpBuf = PL.BUFFER;
    if (this.onGround) { this.coyote = PL.COYOTE; this.airDash = true; }
    if (this.state === 'normal' && control && this.jumpBuf > 0) {
      if (I.held.down && this.onGround && onOneWay(room, this)) {
        this.dropping = 0.22; this.y += 2; this.jumpBuf = 0; this.onGround = false; this.coyote = 0;
      } else if (this.coyote > 0) {
        this.vy = -PL.JUMP_V; this.jumping = true; this.coyote = 0; this.jumpBuf = 0; this.onGround = false;
        this.sqx = 0.78; this.sqy = 1.22;
        Sound.play('jump'); FX.dust(this.cx, this.y + this.h, 5);
      }
    }
    if (this.jumping && this.vy < 0 && !I.held.jump) { this.vy *= PL.JUMP_CUT; this.jumping = false; }
    if (this.vy >= 0) this.jumping = false;

    // ---- Strike ----
    if (I.pressed.attack) this.atkBuf = 0.12;
    if (this.atkBuf > 0 && this.attackCD <= 0 && this.state === 'normal' && control) {
      this.attackDir = I.held.up ? 'up' : I.held.down && !this.onGround ? 'down' : 'side';
      this.attackT = PL.ATK_T; this.attackCD = PL.ATK_CD; this.swing++; this.hits.clear(); this.atkBuf = 0;
      G.addSlash(this);
      Sound.play('slash');
    }
    if (this.attackT > 0) {
      this.attackT -= dt;
      if (this.attackT > PL.ATK_T - PL.ATK_ACTIVE) G.resolveAttack(this, this.attackBox());
    }

    this.physics(dt, G, this.state !== 'dash');
    this.updateScarf(dt, G);

    // Running animation
    if (this.onGround && Math.abs(this.vx) > 20) {
      const before = this.runPhase;
      this.runPhase += dt * Math.abs(this.vx) * 0.055;
      if (Math.floor(before / Math.PI) !== Math.floor(this.runPhase / Math.PI) && Math.random() < 0.5) FX.dust(this.cx - this.face * 4, this.y + this.h, 1, -this.face);
    }
    this.lean = damp(this.lean, this.state === 'dash' ? 0.12 : this.onGround ? clamp(this.vx / PL.RUN, -1, 1) * 0.09 * this.face : clamp(this.vy / 900, -0.2, 0.2) * -0.4, 12, dt);

    // Hazards: thorns and molten wax send you back to the last safe ledge.
    const hz = hazardAt(room, this);
    if (hz && this.state !== 'dead') G.hazardHit(hz);
    else if (this.onGround && !this.dropping) {
      const by = Math.floor((this.y + this.h + 2) / T);
      const l = room.ch(Math.floor((this.x - 10) / T), by), r = room.ch(Math.floor((this.x + this.w + 10) / T), by);
      const safeL = l !== '^' && l !== '~' && l !== '.', safeR = r !== '^' && r !== '~' && r !== '.';
      if (safeL && safeR) { this.lastSafe.x = this.x; this.lastSafe.y = this.y; }
    }
  }

  physics(dt, G, gravity) {
    const room = G.room;
    if (gravity) {
      let g = this.vy < 0 ? PL.GRAV : PL.GRAV_FALL;
      if (Math.abs(this.vy) < 90 && Input.held.jump && this.state === 'normal') g *= 0.55;
      if (this.floatT > 0) g *= 0.2; // a brief float as a flicker ends
      this.vy = Math.min(this.vy + g * dt, PL.MAXFALL);
    }
    const wx = moveX(room, this, this.vx * dt);
    if (wx) { if (this.state === 'dash') { this.dashT = 0; } this.vx = 0; }
    const vyBefore = this.vy;
    const wy = moveY(room, this, this.vy * dt);
    const was = this.onGround;
    if (wy === 1) {
      this.onGround = true; this.vy = 0;
      if (!was) {
        const hard = clamp(vyBefore / PL.MAXFALL, 0, 1);
        if (hard > 0.3) {
          this.sqx = 1 + hard * 0.3; this.sqy = 1 - hard * 0.25;
          Sound.play('land'); FX.dust(this.cx, this.y + this.h, 3 + ((hard * 6) | 0));
        }
      }
    } else if (wy === -1) {
      this.vy = 0; this.jumping = false;
    } else if (this.vy * dt !== 0 || !gravity) {
      this.onGround = this.vy >= 0 && probeGround(room, this);
    }
  }

  updateScarf(dt, G) {
    const s = this.scarf, t = G.time;
    const ax = this.cx - this.face * 3 * this.sqx, ay = this.y + this.h - 20 * this.sqy;
    s[0].x = ax; s[0].y = ay;
    for (let i = 1; i < s.length; i++) {
      const q = s[i], p = s[i - 1];
      q.x += (-this.face * 30 + Math.sin(t * 7 + i * 0.9) * 14) * dt;
      q.y += (36 + Math.cos(t * 6 + i) * 10) * dt;
      const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1, L = 4.2;
      q.x = p.x + (dx / d) * L; q.y = p.y + (dy / d) * L;
    }
  }

  cast(G) {
    if (G.tallow < 33) { Sound.play('clink'); FX.smoke(this.cx + this.face * 10, this.cy - 4, 3, 5); return; }
    G.tallow -= 33;
    G.spawnShot(this);
    this.vx -= this.face * 140;
    this.sqx = 0.86; this.sqy = 1.1;
    Sound.play('shot');
  }

  pogo() {
    this.vy = -PL.POGO_V; this.jumping = false; this.airDash = true; this.onGround = false;
    this.sqx = 0.85; this.sqy = 1.15;
  }

  hurt(G, fromX, dmg = 1) {
    if (this.invuln > 0 || this.state === 'dead' || G.over) return false;
    G.hp -= dmg;
    this.invuln = 1.3; this.hurtT = 0.2;
    const dir = this.cx < fromX ? -1 : 1;
    this.vx = dir * 330; this.vy = -360; this.onGround = false;
    if (this.state !== 'normal') this.state = 'normal';
    this.attackT = 0; this.mendT = 0; this.emberDown = false;
    G.onPlayerHurt(this);
    if (G.hp <= 0) this.die(G);
    return true;
  }

  die(G) {
    this.state = 'dead'; this.deadT = 0; this.vy = -200;
    G.onPlayerDeath(this);
  }

  // -------- Drawing --------
  silhouette(ctx, fx, fy, face) {
    ctx.save(); ctx.translate(fx, fy); ctx.scale(face, 1);
    ctx.beginPath();
    ctx.moveTo(-5, -21); ctx.quadraticCurveTo(-10, -12, -10, -2); ctx.lineTo(8, -2); ctx.quadraticCurveTo(8.5, -12, 5, -21); ctx.closePath();
    ctx.fill();
    roundRect(ctx, -6, -32, 12, 12, 3); ctx.fill();
    ctx.restore();
  }

  draw(ctx, G) {
    if (!this.visible) return;
    const t = G.time;
    for (const g of this.ghosts) {
      ctx.globalAlpha = (g.life / 0.24) * 0.38;
      ctx.fillStyle = '#ff9f55';
      this.silhouette(ctx, g.x, g.y, g.face);
    }
    ctx.globalAlpha = 1;
    const flick = this.invuln > 0 && this.state !== 'dead' && ((this.invuln * 16) | 0) % 2 === 0;
    if (flick) ctx.globalAlpha = 0.4;

    // Scarf
    const s = this.scarf;
    ctx.strokeStyle = '#b5432a'; ctx.lineCap = 'round';
    for (let i = 1; i < s.length; i++) {
      ctx.lineWidth = 3.4 * (1 - i / s.length) + 0.9;
      ctx.beginPath(); ctx.moveTo(s[i - 1].x, s[i - 1].y); ctx.lineTo(s[i].x, s[i].y); ctx.stroke();
    }

    const fx = this.cx, fy = this.y + this.h;
    if (this.onGround && this.state !== 'dead') contactShadow(ctx, fx, fy, 10);
    ctx.save();
    ctx.translate(fx, fy);
    if (this.state === 'dead') { ctx.rotate(-this.face * Math.min(1.45, this.deadT * 4)); ctx.translate(0, Math.min(5, this.deadT * 12)); }
    let sitY = 1;
    if (this.state === 'sit') sitY = 0.84;
    if (this.state === 'wake') { const k = clamp((this.wakeT - 0.6) / 1.2, 0, 1); ctx.rotate(-this.face * (1 - easeOut(k)) * 1.45); }
    if (this.state === 'mend') sitY = 0.9 + Math.sin(t * 20) * 0.01;
    ctx.scale(this.face * this.sqx, this.sqy * sitY);
    ctx.rotate(this.lean);

    const moving = this.onGround && Math.abs(this.vx) > 20 && this.state === 'normal';
    const bob = moving ? -Math.abs(Math.sin(this.runPhase)) * 1.6 : this.state === 'normal' && this.onGround ? Math.sin(t * 2.4) * 0.4 : 0;
    ctx.translate(0, bob);

    // Legs
    ctx.strokeStyle = '#0a0c15'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    if (this.state === 'sit') {
      ctx.beginPath(); ctx.moveTo(-1, -4); ctx.lineTo(6, -1); ctx.moveTo(2, -4); ctx.lineTo(9, -1); ctx.stroke();
    } else if (moving) {
      const a = Math.sin(this.runPhase) * 4.5, b = Math.sin(this.runPhase + Math.PI) * 4.5;
      ctx.beginPath(); ctx.moveTo(-1.5, -6); ctx.lineTo(-1.5 + a, -0.5 + Math.max(0, -a) * 0.3);
      ctx.moveTo(2, -6); ctx.lineTo(2 + b, -0.5 + Math.max(0, -b) * 0.3); ctx.stroke();
    } else if (!this.onGround && this.state !== 'dead') {
      ctx.beginPath(); ctx.moveTo(-1.5, -6); ctx.lineTo(-3, -2.5); ctx.moveTo(2, -6); ctx.lineTo(3.5, -3.5); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(-2, -6); ctx.lineTo(-2.5, -0.5); ctx.moveTo(2.5, -6); ctx.lineTo(3, -0.5); ctx.stroke();
    }

    // Snuffer, carried across the back when not striking
    if (this.attackT <= 0 || this.state !== 'normal') {
      ctx.strokeStyle = '#3b3746'; ctx.lineWidth = 1.7;
      ctx.beginPath(); ctx.moveTo(-1, -12); ctx.lineTo(-12, -30); ctx.stroke();
      ctx.fillStyle = '#4a4556';
      ctx.beginPath(); ctx.moveTo(-12.5, -31.5); ctx.lineTo(-15.5, -27.5); ctx.lineTo(-10, -28.8); ctx.closePath(); ctx.fill();
    }

    // Cloak
    const air = !this.onGround && this.state !== 'dead';
    const lift = air ? clamp(this.vy / 400, -1, 1) * -3 : 0;
    const flap = Math.sin(t * 11) * (moving || air ? 1.2 : 0.3);
    const cloak = ctx.createLinearGradient(0, -22, 0, 0);
    cloak.addColorStop(0, '#262e4c'); cloak.addColorStop(0.55, '#171c32'); cloak.addColorStop(1, '#0f1224');
    ctx.fillStyle = cloak;
    ctx.beginPath();
    ctx.moveTo(-5, -21);
    ctx.quadraticCurveTo(-9.5, -12, -11 + flap - (moving ? 1.5 : 0), -3 + lift);
    ctx.lineTo(-7.5, -0.5 + lift * 0.5); ctx.lineTo(-5, -3.6 + lift * 0.4); ctx.lineTo(-2.2, -0.2 + lift * 0.3);
    ctx.lineTo(0.6, -3.4); ctx.lineTo(3.2, -0.4); ctx.lineTo(5.6, -3); ctx.lineTo(8.2, -1.2);
    ctx.quadraticCurveTo(8.8, -12, 5, -21);
    ctx.quadraticCurveTo(0, -23.2, -5, -21);
    ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.15; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.strokeStyle = '#323c62'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(5, -20.5); ctx.quadraticCurveTo(8.4, -12, 8, -1.8); ctx.stroke();
    // collar shadow
    ctx.fillStyle = '#0d1020';
    ctx.beginPath(); ctx.ellipse(0, -20.5, 6, 2, 0, 0, TAU); ctx.fill();

    // Head: a stub of pale wax
    ctx.fillStyle = '#eadcbf';
    roundRect(ctx, -6, -32.5, 12, 13, 3.2); ctx.fill();
    ctx.fillStyle = '#c4b28b';
    roundRect(ctx, -6, -32.5, 3.6, 13, 2); ctx.fill();
    ctx.fillStyle = '#f7eedb';
    ctx.beginPath(); ctx.ellipse(0.4, -32, 5.6, 1.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#eadcbf';
    ctx.beginPath(); ctx.moveTo(4.2, -27); ctx.quadraticCurveTo(5.6, -22, 4.8, -21); ctx.quadraticCurveTo(3.8, -22, 3.6, -27); ctx.fill();
    // ink outline and a lit edge on the wax
    roundRect(ctx, -6, -32.5, 12, 13, 3.2);
    ctx.strokeStyle = '#2f2318'; ctx.lineWidth = 0.95; ctx.stroke();
    ctx.fillStyle = 'rgba(255,251,240,0.6)';
    roundRect(ctx, 3.3, -30.6, 1.5, 7.5, 0.75); ctx.fill();
    // Eyes
    const bl = this.blink > 0 || this.state === 'sit' || this.state === 'dead' ? 0.2 : 1;
    ctx.fillStyle = '#17121b';
    ctx.beginPath(); ctx.ellipse(1.4, -26, 1.15, 2.2 * bl, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4.3, -26, 1.0, 2.0 * bl, 0, 0, TAU); ctx.fill();
    // Wick
    ctx.strokeStyle = '#1b1416'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(0.3, -33); ctx.lineTo(0.8, -35.5); ctx.stroke();

    // Snuffer swung during a strike
    if (this.attackT > 0 && this.state === 'normal') {
      const k = 1 - (this.attackT / PL.ATK_T);
      let a0, a1;
      if (this.attackDir === 'up') { a0 = -0.4; a1 = -2.6; }
      else if (this.attackDir === 'down') { a0 = 2.6; a1 = 0.6; }
      else { a0 = -1.8; a1 = 0.7; }
      const a = lerp(a0, a1, easeOut(Math.min(1, k * 2.6)));
      ctx.save(); ctx.translate(1, -15); ctx.rotate(a);
      ctx.strokeStyle = '#4b4658'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(19, 0); ctx.stroke();
      ctx.fillStyle = '#5a5468';
      ctx.beginPath(); ctx.moveTo(19, -3); ctx.lineTo(24, 0); ctx.lineTo(19, 3); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  flameTip() {
    const fx = this.cx, fy = this.y + this.h;
    return { x: fx + this.face * 0.8 * this.sqx, y: fy - 35.5 * this.sqy * (this.state === 'sit' ? 0.84 : 1) };
  }

  drawEmissive(ctx, G) {
    if (!this.visible || this.state === 'dead') return;
    const tip = this.flameTip();
    const hpk = clamp(G.hp / G.maxHp, 0.15, 1);
    const big = this.state === 'mend' ? 1.35 : this.state === 'sit' ? 1.15 : 1;
    const h = (5.5 + 6 * hpk) * big;
    if (this.state === 'wake' && this.wakeT < 1.2) return;
    drawFlame(ctx, tip.x, tip.y, h, 2.6 * big, G.time * 1.1, -this.vx * 0.012 - this.face * 0.5, false);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5 + hpk * 0.3;
    const r = 18 * big;
    ctx.drawImage(Art.glow.hot, tip.x - r, tip.y - h * 0.5 - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}

function probeGround(room, e) {
  const ty = Math.floor((e.y + e.h + 0.5) / T);
  if (Math.abs(ty * T - (e.y + e.h)) > 0.6) return false;
  const x0 = Math.floor(e.x / T), x1 = Math.floor((e.x + e.w - 0.01) / T);
  for (let tx = x0; tx <= x1; tx++) if (room.solid(tx, ty) || (!e.dropping && room.ch(tx, ty) === '-')) return true;
  return false;
}
