'use strict';
// The Chandler: a hulking keeper of wax who swings a candelabra.

class Chandler extends Enemy {
  constructor(x, footY) {
    super(x, footY, 60, 92, 64);
    this.state = 'dormant'; this.st = 0; this.face = -1; this.phase = 1;
    this.crouch = 1; this.theta = 0.2; this.handY = 0; this.lit = 0; this.contact = false;
    this.last = ''; this.walkT = 0; this.pending = 0; this.dripTimer = 0; this.drips = 0; this.thrown = 0;
    this.real = true; this.drop = 0; this.meltT = 0; this.breath = 0; this.hitWall = false;
  }
  onHit() {}
  takeHit(G, dmg) {
    if (this.state === 'dormant' || this.state === 'wake' || this.state === 'dying') return false;
    this.hp -= dmg; this.flash = 0.09;
    if (this.phase === 1 && this.hp <= this.maxHp / 2 && this.onGround) { this.phase = 2; this.go('roar', 1.5); Sound.play('roar'); G.shake(0.6); }
    if (this.hp <= 0) { this.hp = 0; this.go('dying', 3.2); G.bossDying(this); }
    return true;
  }
  go(s, t) { this.state = s; this.st = t; }
  wake() { if (this.state === 'dormant') this.go('wake', 2.8); }
  k(t) { return this.phase === 2 ? t * 0.78 : t; }

  update(dt, G) {
    this.t += dt; this.st -= dt; if (this.flash > 0) this.flash -= dt;
    this.breath += dt;
    const p = G.player, dx = p.cx - this.cx, ad = Math.abs(dx);
    const faceP = () => { this.face = dx < 0 ? -1 : 1; };
    let tTheta = 0.2, tCrouch = 0, tHand = 0;
    this.contact = !['dormant', 'wake', 'dying'].includes(this.state);
    this.swipeBox = null;

    switch (this.state) {
      case 'dormant':
        tCrouch = 1; tTheta = 0.9; this.lit = 0;
        break;
      case 'wake': {
        const e = 2.8 - this.st;
        tCrouch = e < 0.8 ? 1 : 0; tTheta = e < 1 ? 0.9 : 0.2;
        this.lit = clamp((e - 0.9) / 0.9, 0, 1);
        if (e > 2.0 && !this.roared) { this.roared = true; Sound.play('roar'); G.shake(0.5); FX.embers(this.cx, this.y + 10, 30, 160); }
        if (this.st <= 0) { this.go('idle', 0.5); G.bossAwake(this); }
        break;
      }
      case 'idle':
        faceP(); this.vx = damp(this.vx, 0, 8, dt);
        if (this.st <= 0) this.choose(G, ad);
        break;
      case 'walk':
        faceP(); this.vx = this.face * (this.phase === 2 ? 140 : 100); this.walkT += dt;
        if (ad < 120) { this.go('swipePrep', this.k(0.38)); this.vx = 0; Sound.play('scrape'); }
        else if (this.st <= 0) this.go('idle', this.k(0.25));
        break;
      case 'swipePrep':
        this.vx = damp(this.vx, 0, 10, dt); tTheta = -1.0; tCrouch = 0.15;
        if (this.st <= 0) { this.go('swipe', 0.2); Sound.play('swipe'); }
        break;
      case 'swipe':
        tTheta = 2.0; this.vx = this.face * 90;
        this.swipeBox = this.face > 0 ? { x: this.x + this.w - 10, y: this.y + 8, w: 120, h: 84 } : { x: this.x - 110, y: this.y + 8, w: 120, h: 84 };
        if (this.st <= 0) { this.go('recover', this.k(0.5)); G.shake(0.15); }
        break;
      case 'recover':
        tTheta = 1.6; this.vx = damp(this.vx, 0, 8, dt);
        if (this.st <= 0) this.go('idle', this.k(0.35));
        break;
      case 'leapPrep':
        faceP(); tCrouch = 1; tTheta = 0.7; this.vx = 0;
        if (this.st <= 0) {
          const tx = clamp(p.cx, G.arena.x0 + 40, G.arena.x1 - 40);
          this.vy = -900; this.vx = clamp((tx - this.cx) / 0.82, -520, 520);
          this.go('leap', 2); this.onGround = false; Sound.play('jump'); FX.dust(this.cx, this.y + this.h, 14);
        }
        break;
      case 'leap':
        tTheta = -0.3; tCrouch = -0.1;
        if (this.onGround && this.vy >= 0) {
          this.go('slam', this.k(0.6)); this.vx = 0;
          Sound.play('slam'); G.shake(0.7); G.freeze = Math.max(G.freeze, 0.06);
          FX.dust(this.cx, this.y + this.h, 24); FX.sparks(this.cx, this.y + this.h, 18, -Math.PI / 2, Math.PI, 500);
          const fy = this.y + this.h;
          G.spawnProjectile(new Wave(this.cx - 30, fy, -1, this.phase === 2 ? 430 : 380));
          G.spawnProjectile(new Wave(this.cx + 30, fy, 1, this.phase === 2 ? 430 : 380));
          if (this.phase === 2) {
            G.spawnProjectile(new Wave(this.cx - 30, fy, -1, 240));
            G.spawnProjectile(new Wave(this.cx + 30, fy, 1, 240));
          }
        }
        break;
      case 'slam':
        tTheta = 1.7; tCrouch = 0.5 * Math.max(0, this.st / 0.6);
        if (this.st <= 0) this.go('idle', this.k(0.45));
        break;
      case 'chargePrep':
        faceP(); this.vx = damp(this.vx, -this.face * 30, 8, dt); tTheta = 1.45; tCrouch = 0.35;
        if (Math.random() < 0.5) FX.sparks(this.cx + this.face * 70, this.y + this.h - 2, 1, -Math.PI / 2 - this.face * 0.5, 1, 260);
        if (this.st <= 0) { this.go('charge', 2.2); Sound.play('dash'); }
        break;
      case 'charge':
        tTheta = 1.5; tCrouch = 0.2; this.vx = this.face * (this.phase === 2 ? 640 : 560);
        if (Math.random() < 0.7) FX.dust(this.cx - this.face * 20, this.y + this.h, 1, -this.face);
        if (this.hitWall || this.st <= 0) {
          this.go('stun', this.k(1.3)); this.vx = -this.face * 140; this.vy = -260; this.onGround = false;
          Sound.play('slam'); G.shake(0.8); FX.sparks(this.cx + this.face * 36, this.cy - 20, 22, this.face > 0 ? Math.PI : 0, 1.8, 520);
          FX.chunks(this.cx + this.face * 36, this.y, 10, '#3a2a22', 280);
          // Shake loose some wax from the ceiling
          for (let i = 0; i < (this.phase === 2 ? 4 : 2); i++) G.spawnProjectile(new Drip(rr(G.arena.x0 + 40, G.arena.x1 - 40), G.arena.ceil, rr(0.5, 0.9)));
        }
        break;
      case 'stun':
        tTheta = 2.3; tCrouch = 0.6; this.vx = damp(this.vx, 0, 4, dt);
        if (this.st <= 0) this.go('idle', this.k(0.3));
        break;
      case 'rainPrep':
        faceP(); tTheta = -0.15; tHand = 1; this.vx = damp(this.vx, 0, 8, dt);
        if (this.st <= 0) { this.go('rain', this.k(1.6)); this.drips = this.phase === 2 ? 11 : 7; this.dripTimer = 0; Sound.play('roar'); }
        break;
      case 'rain':
        tTheta = -0.15; tHand = 1;
        this.dripTimer -= dt;
        if (this.dripTimer <= 0 && this.drips > 0) {
          this.drips--; this.dripTimer = this.phase === 2 ? 0.1 : 0.16;
          // Aim some drips at the player, scatter the rest.
          const x = this.drips % 3 === 0 ? clamp(p.cx + rr(-30, 30), G.arena.x0 + 20, G.arena.x1 - 20) : rr(G.arena.x0 + 20, G.arena.x1 - 20);
          G.spawnProjectile(new Drip(x, G.arena.ceil, this.phase === 2 ? 0.55 : 0.7));
        }
        if (this.st <= 0) this.go('idle', this.k(0.5));
        break;
      case 'volley':
        faceP(); tTheta = -0.5; tHand = 0.6;
        if (this.st < 0.5 && this.thrown < 3) {
          this.thrown++;
          const tip = this.headPos();
          const tx = p.cx + (this.thrown - 2) * 90, tt = 0.9;
          const vx = (tx - tip.x) / tt, vy = (p.cy - tip.y - 0.5 * 900 * tt * tt) / tt;
          G.spawnProjectile(new Orb(tip.x, tip.y, vx, vy));
          Sound.play('spit');
          this.st = this.thrown < 3 ? 0.62 : 0.4;
        }
        if (this.st <= 0) { this.go('idle', this.k(0.6)); }
        break;
      case 'roar':
        tTheta = -0.4; tHand = 0.7; this.vx = 0;
        if (Math.random() < 0.6) FX.embers(this.cx, this.y + 10, 2, 200);
        if (this.st <= 0) this.go('idle', 0.3);
        break;
      case 'dying':
        this.vx = 0; tCrouch = 1; tTheta = 1.2; this.contact = false;
        this.meltT += dt;
        if (Math.random() < 0.8) FX.wax(this.cx + rr(-30, 30), this.y + rr(10, 80), 2, 160);
        if (Math.random() < 0.4) FX.smoke(this.cx + rr(-30, 30), this.y + rr(0, 60), 1, 16);
        if (Math.random() < 0.5) FX.embers(this.cx + rr(-20, 20), this.y + 40, 2, 120);
        if (this.st <= 0 && !this.dead) { this.dead = true; G.bossDefeated(this); }
        break;
    }
    this.theta = damp(this.theta, tTheta, this.state === 'swipe' ? 30 : 9, dt);
    this.crouch = damp(this.crouch, tCrouch, 10, dt);
    this.handY = damp(this.handY, tHand, 8, dt);

    // physics
    if (this.state !== 'dormant') {
      this.vy = Math.min(this.vy + 2200 * dt, 1000);
      this.hitWall = !!moveX(G.room, this, this.vx * dt);
      const r = moveY(G.room, this, this.vy * dt, false);
      if (r === 1) { this.onGround = true; this.vy = 0; } else if (r === -1) this.vy = 0; else this.onGround = false;
    }
    if (this.state === 'walk' && Math.floor((this.walkT - dt) * 3) !== Math.floor(this.walkT * 3)) { G.shake(0.06); FX.dust(this.cx, this.y + this.h, 3); }
  }

  choose(G, ad) {
    const opts = [];
    if (ad < 140) opts.push(['swipePrep', 3.2, 0.38]);
    opts.push(['leapPrep', ad > 200 ? 3 : 1.4, 0.5]);
    opts.push(['chargePrep', ad > 170 ? 2.6 : 0.9, 0.6]);
    opts.push(['walk', ad > 240 ? 1.6 : 0.6, rr(0.8, 1.3)]);
    opts.push(['rainPrep', this.phase === 2 ? 1.6 : 1, 0.7]);
    if (this.phase === 2) opts.push(['volley', 1.8, 1.4]);
    let sum = 0;
    for (const o of opts) { if (o[0] === this.last) o[1] *= 0.25; sum += o[1]; }
    let r = Math.random() * sum, sel = opts[0];
    for (const o of opts) { r -= o[1]; if (r <= 0) { sel = o; break; } }
    this.last = sel[0];
    this.thrown = 0;
    this.go(sel[0], sel[0] === 'walk' ? sel[2] : this.k(sel[2]));
    if (sel[0] === 'chargePrep') Sound.play('scrape');
    if (sel[0] === 'swipePrep') Sound.play('scrape');
  }

  // Hand position and candelabra head in world space
  handPos() {
    const f = this.face, c = this.crouch;
    return { x: this.cx + f * 26, y: this.y + this.h - 44 + c * 16 - this.handY * 40 };
  }
  headPos() {
    const h = this.handPos(), f = this.face, a = this.theta;
    return { x: h.x + f * Math.sin(a) * 74, y: h.y - Math.cos(a) * 74 };
  }

  draw(ctx, G) {
    const B = G.room.B, f = this.face, x = this.cx, y = this.y + this.h;
    const c = this.crouch, melt = clamp(this.meltT / 3, 0, 1);
    const wax = this.flash > 0 ? '#ffffff' : B.wax;
    const breathe = Math.sin(this.breath * 2.2) * 0.012;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(f * (1 + melt * 0.5), (1 - c * 0.18 + breathe) * (1 - melt * 0.85));

    // legs
    const step = this.state === 'walk' ? Math.sin(this.walkT * 9) : 0;
    ctx.fillStyle = '#170d0e';
    ctx.fillRect(-20 + step * 4, -20, 13, 20);
    ctx.fillRect(6 - step * 4, -20, 13, 20);
    // tattered robe
    ctx.fillStyle = this.flash > 0 ? '#fff' : '#26140f';
    ctx.beginPath();
    ctx.moveTo(-30, -14);
    for (let i = 0; i <= 8; i++) ctx.lineTo(-30 + i * 7.5, -14 + (i % 2 ? 6 : 0) + Math.sin(this.t * 3 + i) * 1.2);
    ctx.lineTo(28, -52); ctx.lineTo(-30, -52); ctx.closePath(); ctx.fill();
    // back arm hanging
    ctx.fillStyle = this.flash > 0 ? '#fff' : '#bfa985';
    ctx.beginPath(); ctx.moveTo(-26, -70); ctx.quadraticCurveTo(-38, -50, -32, -30); ctx.lineTo(-24, -32); ctx.quadraticCurveTo(-28, -52, -18, -66); ctx.fill();
    // torso
    ctx.fillStyle = wax;
    ctx.beginPath();
    ctx.moveTo(-30, -46);
    ctx.bezierCurveTo(-40, -70, -26, -96, -4, -96);
    ctx.bezierCurveTo(18, -96, 32, -84, 32, -66);
    ctx.lineTo(30, -46);
    ctx.lineTo(26, -40); ctx.lineTo(22, -46); ctx.lineTo(17, -34); ctx.lineTo(12, -46); ctx.lineTo(6, -38); ctx.lineTo(0, -46);
    ctx.lineTo(-6, -36); ctx.lineTo(-12, -46); ctx.lineTo(-18, -38); ctx.lineTo(-24, -46);
    ctx.closePath(); ctx.fill();
    if (this.flash <= 0) {
      ctx.fillStyle = 'rgba(80,50,30,0.32)';
      ctx.beginPath(); ctx.moveTo(-30, -46); ctx.bezierCurveTo(-40, -70, -26, -96, -4, -96); ctx.bezierCurveTo(-18, -86, -26, -70, -20, -46); ctx.fill();
      // drips over the shoulder
      ctx.fillStyle = wax;
      for (let i = 0; i < 4; i++) {
        const dx = -18 + i * 12, len = 8 + ((i * 37) % 9) + Math.sin(this.t + i) * 1.5;
        ctx.beginPath(); ctx.moveTo(dx - 3, -46); ctx.quadraticCurveTo(dx, -46 + len, dx + 1, -46 + len); ctx.quadraticCurveTo(dx + 3, -46 + len * 0.5, dx + 3, -46); ctx.fill();
      }
    }
    // hooded head
    ctx.fillStyle = this.flash > 0 ? '#fff' : '#140a0a';
    ctx.beginPath(); ctx.moveTo(4, -76); ctx.bezierCurveTo(2, -100, 30, -102, 30, -80); ctx.quadraticCurveTo(28, -70, 18, -68); ctx.quadraticCurveTo(8, -68, 4, -76); ctx.fill();
    // crown candles
    for (let i = 0; i < 3; i++) {
      const cx2 = -14 + i * 9, h = 11 + i * 2;
      ctx.fillStyle = wax; ctx.fillRect(cx2 - 2.5, -96 - h + (i === 2 ? 4 : 0), 5, h);
    }
    ctx.restore();

    // candelabra and front arm (drawn unscaled by melt for clarity until late)
    if (melt < 0.6) {
      const hp = this.handPos(), hd = this.headPos();
      const bx = hp.x - (hd.x - hp.x) * 0.45, by = hp.y - (hd.y - hp.y) * 0.45;
      ctx.strokeStyle = this.flash > 0 ? '#fff' : '#2c2224'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(hd.x, hd.y); ctx.stroke();
      // three-pronged head
      const ang = Math.atan2(hd.y - hp.y, hd.x - hp.x), px = -Math.sin(ang), py = Math.cos(ang);
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(hd.x + px * 18, hd.y + py * 18); ctx.lineTo(hd.x - px * 18, hd.y - py * 18); ctx.stroke();
      ctx.fillStyle = B.wax;
      for (const k of [-1, 0, 1]) {
        const cx2 = hd.x + px * 18 * k, cy2 = hd.y + py * 18 * k;
        ctx.save(); ctx.translate(cx2, cy2); ctx.rotate(ang + Math.PI / 2); ctx.fillRect(-2.5, -10, 5, 10); ctx.restore();
      }
      // arm
      ctx.strokeStyle = this.flash > 0 ? '#fff' : '#d1bb92'; ctx.lineWidth = 9;
      const sh = { x: this.cx + f * 18, y: this.y + this.h - 70 + c * 14 };
      ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.quadraticCurveTo(sh.x + f * 14, (sh.y + hp.y) / 2 + 6, hp.x, hp.y); ctx.stroke();
      ctx.fillStyle = this.flash > 0 ? '#fff' : '#d1bb92'; ctx.beginPath(); ctx.arc(hp.x, hp.y, 6, 0, TAU); ctx.fill();
    }
  }

  flameCol() { return this.phase === 2 ? ['#9fd4ff', '#f2fbff'] : ['#ff8a2a', '#fff1c2']; }

  drawEmissive(ctx, G) {
    if (this.meltT > 2) return;
    const f = this.face, c = this.crouch, sy = 1 - c * 0.18;
    const [outer, inner] = this.flameCol();
    // eyes
    if (this.lit > 0.3) {
      ctx.fillStyle = this.phase === 2 ? '#d6f0ff' : '#ffb347';
      const ex = this.cx + f * 20, ey = this.y + this.h - 82 * sy;
      ctx.fillRect(ex - 4, ey, 3, 2.2); ctx.fillRect(ex + 2 * f + (f > 0 ? 1 : -4), ey + 0.3, 3, 2);
    }
    // crown flames
    for (let i = 0; i < 3; i++) {
      if (this.lit < (i + 1) / 3.2) continue;
      const lx = this.cx + f * (-14 + i * 9), h = 11 + i * 2;
      const ly = this.y + this.h - (96 + h - (i === 2 ? 4 : 0)) * sy;
      flameColored(ctx, lx, ly, 7, 2, G.time + i, -this.vx * 0.01, outer, inner);
    }
    if (this.lit > 0.9 && this.meltT < 1.4) {
      const hp = this.handPos(), hd = this.headPos();
      const ang = Math.atan2(hd.y - hp.y, hd.x - hp.x), px = -Math.sin(ang), py = Math.cos(ang);
      for (const k of [-1, 0, 1]) {
        const cx2 = hd.x + px * 18 * k + Math.cos(ang) * 10, cy2 = hd.y + py * 18 * k + Math.sin(ang) * 10;
        flameColored(ctx, cx2, cy2, 9, 2.4, G.time * 1.3 + k, -this.vx * 0.01, outer, inner);
      }
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6;
      ctx.drawImage(this.phase === 2 ? Art.glow.cold : Art.glow.warm, hd.x - 60, hd.y - 60, 120, 120);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  }
  light(G) {
    if (this.lit < 0.2 || this.meltT > 2) return;
    const hd = this.headPos();
    G.addLight(hd.x, hd.y, 230 * this.lit, 0.95, null);
    G.addLight(this.cx, this.y - 6, 130 * this.lit, 0.7, this.phase === 2 ? 'cold' : 'warm', 0.25, 70);
  }
}

function flameColored(ctx, x, y, h, w, t, lean, outer, inner) {
  const fl = 1 + Math.sin(t * 17) * 0.1 + Math.sin(t * 29) * 0.05, hh = h * fl, tip = lean + Math.sin(t * 9) * w * 0.3;
  ctx.fillStyle = outer;
  ctx.beginPath(); ctx.moveTo(x - w, y);
  ctx.bezierCurveTo(x - w, y - hh * 0.5, x + tip * 0.5 - w * 0.3, y - hh * 0.7, x + tip, y - hh);
  ctx.bezierCurveTo(x + tip * 0.5 + w * 0.3, y - hh * 0.7, x + w, y - hh * 0.5, x + w, y);
  ctx.arc(x, y, w, 0, Math.PI); ctx.fill();
  ctx.fillStyle = inner;
  ctx.beginPath(); ctx.ellipse(x + tip * 0.2, y - hh * 0.3, w * 0.5, hh * 0.32, 0, 0, TAU); ctx.fill();
}

// ---- Boss projectiles ----
class Wave extends Projectile {
  constructor(x, floorY, dir, speed) { super(x, floorY - 15, dir * speed, 0, 26, 30); this.dir = dir; this.life = 3; }
  update(dt, G) {
    this.t += dt; this.life -= dt; if (this.life <= 0) { this.dead = true; return; }
    this.x += this.vx * dt;
    if (G.room.solidPx(this.cx + this.dir * 14, this.cy)) { this.dead = true; this.burst(G); return; }
    if (Math.random() < 0.8) Particles.spawn(P_SPARK, this.cx - this.dir * 8, this.y + this.h, -this.dir * rr(60, 200), rr(-260, -90), 0.3, 1.6, 900, 1, '#ffd08a');
  }
  drawEmissive(ctx, G) {
    const x = this.cx, b = this.y + this.h, d = this.dir;
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(Art.glow.molten, x - 40, b - 50, 80, 70);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ff8a2e';
    ctx.beginPath(); ctx.moveTo(x - d * 16, b);
    ctx.quadraticCurveTo(x - d * 6, b - 30 - Math.sin(this.t * 30) * 3, x + d * 12, b - 22);
    ctx.quadraticCurveTo(x + d * 4, b - 12, x + d * 14, b); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffe6a8';
    ctx.beginPath(); ctx.moveTo(x - d * 8, b); ctx.quadraticCurveTo(x - d * 2, b - 18, x + d * 8, b - 16); ctx.quadraticCurveTo(x + d * 2, b - 8, x + d * 8, b); ctx.fill();
  }
  light(G) { G.addLight(this.cx, this.cy, 100, 0.8, null); }
}

class Drip extends Projectile {
  constructor(x, ceilY, delay) { super(x, ceilY + 6, 0, 0, 12, 16); this.delay = delay; this.hostileNow = false; this.life = 4; this.hostile = false; }
  update(dt, G) {
    this.t += dt; this.life -= dt;
    if (this.t < this.delay) return;
    if (!this.hostile) { this.hostile = true; Sound.play('drip'); }
    this.vy = Math.min(this.vy + 1500 * dt, 900);
    this.y += this.vy * dt;
    if (G.room.solidPx(this.cx, this.y + this.h)) {
      this.dead = true; Sound.play('splash');
      FX.wax(this.cx, this.y + this.h, 10, 200); FX.sparks(this.cx, this.y + this.h, 5, -Math.PI / 2, 1.6, 260);
    }
    if (this.life <= 0) this.dead = true;
  }
  draw(ctx, G) {
    const B = G.room.B;
    if (this.t < this.delay) {
      const k = this.t / this.delay;
      ctx.fillStyle = B.wax;
      ctx.beginPath(); ctx.ellipse(this.cx, this.y - 4, 3 + k * 4, 2 + k * 8, 0, 0, TAU); ctx.fill();
      return;
    }
    ctx.fillStyle = B.wax;
    ctx.beginPath(); ctx.moveTo(this.cx, this.y - 10); ctx.quadraticCurveTo(this.cx + 7, this.y + 8, this.cx, this.y + this.h); ctx.quadraticCurveTo(this.cx - 7, this.y + 8, this.cx, this.y - 10); ctx.fill();
  }
  drawEmissive(ctx, G) {
    if (this.t < this.delay) {
      // a hot point of light marks where it will fall
      const k = this.t / this.delay;
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.3 + k * 0.6;
      ctx.drawImage(Art.glow.warm, this.cx - 18, this.y - 18, 36, 36);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  }
}

class Orb extends Projectile {
  constructor(x, y, vx, vy) { super(x, y, vx, vy, 16, 16); this.grav = 900; this.slashable = true; this.life = 3; }
  update(dt, G) { super.update(dt, G); if (Math.random() < 0.7) Particles.spawn(P_EMBER, this.cx, this.cy, rr(-30, 30), rr(-30, 30), 0.35, 2.5); }
  burst(G) { FX.sparks(this.cx, this.cy, 14, -Math.PI / 2, TAU, 340); FX.smoke(this.cx, this.cy, 3, 10); Sound.play('burst'); }
  drawEmissive(ctx, G) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(Art.glow.cold, this.cx - 30, this.cy - 30, 60, 60);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#bfe3ff'; ctx.beginPath(); ctx.arc(this.cx, this.cy, 7, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(this.cx, this.cy, 3.5, 0, TAU); ctx.fill();
  }
  light(G) { G.addLight(this.cx, this.cy, 90, 0.8, null); }
}
