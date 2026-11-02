'use strict';
// Enemies, projectiles, pickups and props.

class Enemy {
  constructor(x, footY, w, h, hp) {
    this.w = w; this.h = h; this.x = x - w / 2; this.y = footY - h;
    this.vx = 0; this.vy = 0; this.hp = hp; this.maxHp = hp;
    this.face = Math.random() < 0.5 ? -1 : 1;
    this.flash = 0; this.stun = 0; this.dead = false; this.t = Math.random() * 10;
    this.contact = true; this.onGround = false; this.state = 'idle'; this.st = 0;
    this.drop = 4; this.real = true;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  takeHit(G, dmg, dirx, diry) {
    this.hp -= dmg; this.flash = 0.1;
    this.onHit(G, dirx, diry);
    if (this.hp <= 0) { this.dead = true; this.onDeath(G); }
    return this.real;
  }
  onHit(G, dirx) { this.vx = dirx * 240; this.stun = 0.16; }
  onDeath(G) {
    Sound.play('kill');
    FX.wax(this.cx, this.cy, 18, 300); FX.smoke(this.cx, this.cy, 6, 12); FX.embers(this.cx, this.cy, 8, 90);
    G.dropEmbers(this.cx, this.cy, this.drop);
    G.freeze = Math.max(G.freeze, 0.07); G.shake(0.25);
  }
  gravity(dt, G) {
    this.vy = Math.min(this.vy + 2000 * dt, 800);
    moveX(G.room, this, this.vx * dt) && (this.hitWall = true);
    const r = moveY(G.room, this, this.vy * dt);
    this.onGround = r === 1;
    if (r) this.vy = 0;
  }
  update() {}
  draw() {}
  drawEmissive() {}
  light() {}
}

// ---------- Wickling: a waxen crawler with a lit wick ----------
class Wickling extends Enemy {
  constructor(x, y) { super(x, y, 26, 18, 5); this.speed = 46; this.drop = 4; }
  update(dt, G) {
    this.t += dt; if (this.flash > 0) this.flash -= dt;
    if (this.stun > 0) { this.stun -= dt; this.vx = damp(this.vx, 0, 8, dt); }
    else {
      this.vx = this.face * this.speed;
      const aheadX = this.face > 0 ? this.x + this.w + 2 : this.x - 2;
      if (this.onGround && !groundAt(G.room, aheadX, this.y + this.h + 4)) this.face *= -1;
    }
    this.hitWall = false;
    this.gravity(dt, G);
    if (this.hitWall && this.stun <= 0) this.face *= -1;
  }
  draw(ctx, G) {
    const B = G.room.B;
    const x = this.cx, y = this.y + this.h, f = this.face;
    const step = Math.sin(this.t * 12);
    if (this.onGround) contactShadow(ctx, x, y, 14);
    ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
    ctx.strokeStyle = '#0c0b10'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const lx = -8 + i * 7, o = Math.sin(this.t * 12 + i * 2) * 2.5;
      ctx.beginPath(); ctx.moveTo(lx, -4); ctx.lineTo(lx + o, 0); ctx.stroke();
    }
    ctx.fillStyle = this.flash > 0 ? '#ffffff' : B.wax;
    ctx.beginPath();
    ctx.moveTo(-14, -3);
    ctx.bezierCurveTo(-14, -17 - step * 0.5, 10, -19, 13, -6);
    ctx.lineTo(13, -3);
    ctx.lineTo(9, -1.5); ctx.lineTo(6, -3.5); ctx.lineTo(2, -1); ctx.lineTo(-2, -3.5); ctx.lineTo(-6, -1); ctx.lineTo(-10, -3.5);
    ctx.closePath(); ctx.fill();
    if (this.flash <= 0) {
      ctx.strokeStyle = '#1d1510'; ctx.lineWidth = 1.1; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,250,236,0.55)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-6, -13.5); ctx.bezierCurveTo(-1, -16.5, 6, -15, 10, -9); ctx.stroke();
    }
    if (this.flash <= 0) {
      ctx.fillStyle = 'rgba(60,45,30,0.35)';
      ctx.beginPath(); ctx.moveTo(-14, -3); ctx.bezierCurveTo(-13, -10, -6, -14, 0, -14); ctx.bezierCurveTo(-7, -11, -10, -7, -10, -3.5); ctx.fill();
      ctx.fillStyle = '#1a1316';
      ctx.beginPath(); ctx.ellipse(8.5, -9, 3.2, 2.6, 0.3, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = '#1a1416'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(1, -15.5); ctx.lineTo(2.5, -19); ctx.stroke();
    ctx.restore();
  }
  drawEmissive(ctx, G) {
    const x = this.cx + this.face * 2, y = this.y + this.h - 19;
    drawFlame(ctx, x, y, 6, 1.8, G.time + this.t, -this.face * 0.8, false);
    ctx.fillStyle = '#ffb347';
    ctx.beginPath(); ctx.arc(this.cx + this.face * 9.2, this.y + this.h - 9, 1.2, 0, TAU); ctx.fill();
  }
  light(G) { G.addLight(this.cx, this.y, 70, 0.6, 'warm', 0.25, 26); }
}

// ---------- Soot Moth: hovers, winds up, swoops ----------
class SootMoth extends Enemy {
  constructor(x, y) {
    super(x, y - 4, 22, 22, 4);
    this.hx = this.x; this.hy = this.y; this.drop = 4; this.state = 'idle';
  }
  onHit(G, dirx, diry) {
    this.vx = dirx * 300; this.vy = (diry || -0.3) * 200; this.state = 'recover'; this.st = 0.7;
  }
  update(dt, G) {
    this.t += dt; if (this.flash > 0) this.flash -= dt;
    const p = G.player;
    const dx = p.cx - this.cx, dy = p.cy - this.cy, d = Math.hypot(dx, dy);
    this.st -= dt;
    if (this.state === 'idle') {
      const tx = this.hx + Math.sin(this.t * 0.9) * 34, ty = this.hy + Math.sin(this.t * 1.7) * 12;
      this.vx = damp(this.vx, (tx - this.x) * 2.5, 4, dt); this.vy = damp(this.vy, (ty - this.y) * 2.5, 4, dt);
      if (d < 250 && p.state !== 'dead' && G.room.clearLine(this.cx, this.cy, p.cx, p.cy)) { this.state = 'wind'; this.st = 0.5; }
      this.face = dx < 0 ? -1 : 1;
    } else if (this.state === 'wind') {
      this.vx = damp(this.vx, -Math.sign(dx) * 40, 6, dt); this.vy = damp(this.vy, -30, 6, dt);
      if (this.st <= 0) {
        this.state = 'swoop'; this.st = 0.75;
        const k = 380 / (d || 1); this.vx = dx * k; this.vy = dy * k;
        Sound.play('swipe');
      }
    } else if (this.state === 'swoop') {
      if (Math.random() < 0.5) FX.smoke(this.cx, this.cy, 1, 6, 0);
      if (this.st <= 0) { this.state = 'recover'; this.st = 0.9; }
    } else if (this.state === 'recover') {
      this.vx = damp(this.vx, 0, 3, dt); this.vy = damp(this.vy, 0, 3, dt);
      if (this.st <= 0) { this.state = 'idle'; this.hx = clamp(this.x, this.hx - 120, this.hx + 120); this.hy = clamp(this.y, this.hy - 60, this.hy + 60); }
    }
    const hx = moveX(G.room, this, this.vx * dt), hy = moveY(G.room, this, this.vy * dt, false);
    if (hx) { this.vx *= -0.5; if (this.state === 'swoop') { this.state = 'recover'; this.st = 0.8; } }
    if (hy) { this.vy *= -0.5; if (this.state === 'swoop') { this.state = 'recover'; this.st = 0.8; } }
  }
  draw(ctx, G) {
    const x = this.cx, y = this.cy, t = this.t;
    const shake = this.state === 'wind' ? Math.sin(t * 70) * 1.5 : 0;
    ctx.save(); ctx.translate(x + shake, y); ctx.scale(this.face, 1);
    const flap = Math.sin(t * (this.state === 'swoop' ? 34 : 20));
    ctx.fillStyle = this.flash > 0 ? '#fff' : '#211d2a';
    for (const side of [-1, 1]) {
      ctx.save(); ctx.scale(1, 1); ctx.rotate(side * 0.25);
      ctx.beginPath();
      ctx.moveTo(-2, -2);
      ctx.lineTo(-14 - side * 2, -10 - flap * 9 * (side < 0 ? 1 : 0.8));
      ctx.lineTo(-10, -4 - flap * 4); ctx.lineTo(-17, -2 - flap * 5); ctx.lineTo(-6, 2);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = this.flash > 0 ? '#fff' : '#0f0d15';
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * TAU + t * 1.3, r = 3.5 + Math.sin(t * 5 + i) * 1;
      ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 6.5, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  drawEmissive(ctx, G) {
    const glow = this.state === 'wind' ? 1 : 0.75;
    ctx.fillStyle = this.state === 'wind' ? '#fff0c8' : '#ff9a3c';
    const ex = this.cx + this.face * 3, ey = this.cy - 1;
    ctx.globalAlpha = glow;
    ctx.beginPath(); ctx.arc(ex, ey, 1.6, 0, TAU); ctx.arc(ex + this.face * 4.5, ey + 0.5, 1.4, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
  light(G) { if (this.state === 'wind') G.addLight(this.cx, this.cy, 50, 0.4, 'warm', 0.35, 20); }
}

// ---------- Tallow Sentinel: patrols, spots you, charges ----------
class Sentinel extends Enemy {
  constructor(x, y) { super(x, y, 28, 42, 14); this.drop = 10; this.state = 'patrol'; this.st = rr(1.5, 3); }
  onHit(G, dirx) {
    this.vx += dirx * 90;
    if (this.state === 'patrol' || this.state === 'pause') { this.face = -dirx; this.state = 'wind'; this.st = 0.45; }
  }
  update(dt, G) {
    this.t += dt; if (this.flash > 0) this.flash -= dt;
    const p = G.player, room = G.room;
    const dx = p.cx - this.cx, dy = p.cy - this.cy;
    this.st -= dt;
    const aheadX = this.face > 0 ? this.x + this.w + 3 : this.x - 3;
    const edge = this.onGround && !groundAt(room, aheadX, this.y + this.h + 4);
    const sees = p.state !== 'dead' && Math.abs(dy) < 70 && Math.abs(dx) < 300 && (Math.sign(dx) === this.face || Math.abs(dx) < 110) &&
      room.clearLine(this.cx, this.y + 12, p.cx, p.cy);
    if (this.state === 'patrol') {
      this.vx = damp(this.vx, this.face * 38, 8, dt);
      if (edge || this.hitWall) { this.face *= -1; this.vx = 0; }
      if (this.st <= 0) { this.state = 'pause'; this.st = 0.9; }
      if (sees) { this.face = Math.sign(dx) || 1; this.state = 'wind'; this.st = 0.5; Sound.play('scrape'); }
    } else if (this.state === 'pause') {
      this.vx = damp(this.vx, 0, 10, dt);
      if (this.st <= 0) { this.state = 'patrol'; this.st = rr(2, 3.5); if (Math.random() < 0.5) this.face *= -1; }
      if (sees) { this.face = Math.sign(dx) || 1; this.state = 'wind'; this.st = 0.5; Sound.play('scrape'); }
    } else if (this.state === 'wind') {
      this.vx = damp(this.vx, -this.face * 30, 10, dt);
      if (this.st <= 0) { this.state = 'charge'; this.st = 1.05; Sound.play('dash'); }
    } else if (this.state === 'charge') {
      this.vx = this.face * 340;
      if (Math.random() < 0.5) FX.dust(this.cx - this.face * 10, this.y + this.h, 1, -this.face);
      if (edge || this.hitWall || this.st <= 0) {
        if (this.hitWall) { G.shake(0.2); FX.sparks(this.cx + this.face * 16, this.cy, 8, this.face < 0 ? 0 : Math.PI, 1.6); Sound.play('crack'); }
        this.state = 'recover'; this.st = 0.75; this.vx = edge ? 0 : -this.face * 60;
      }
    } else if (this.state === 'recover') {
      this.vx = damp(this.vx, 0, 6, dt);
      if (this.st <= 0) { this.state = 'patrol'; this.st = rr(1.5, 3); }
    }
    this.hitWall = false;
    this.gravity(dt, G);
  }
  draw(ctx, G) {
    const B = G.room.B, x = this.cx, y = this.y + this.h, f = this.face;
    const wax = this.flash > 0 ? '#fff' : B.wax;
    let lean = 0, lanceA = 0.05;
    if (this.state === 'wind') { lean = -0.15; lanceA = -0.55 * clamp(1 - this.st / 0.5, 0, 1); }
    else if (this.state === 'charge') { lean = 0.18; lanceA = 0.1; }
    else if (this.state === 'recover') { lean = 0.05; lanceA = 0.4; }
    const walk = this.state === 'patrol' ? Math.sin(this.t * 7) : 0;
    if (this.onGround) contactShadow(ctx, x, y, 16);
    ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
    // legs
    ctx.strokeStyle = '#0d0b10'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-5, -10); ctx.lineTo(-5 + walk * 3, 0); ctx.moveTo(5, -10); ctx.lineTo(5 - walk * 3, 0); ctx.stroke();
    ctx.rotate(lean);
    // robe
    ctx.fillStyle = this.flash > 0 ? '#fff' : '#26202a';
    ctx.beginPath(); ctx.moveTo(-12, -6); ctx.lineTo(-9, -26); ctx.lineTo(9, -26); ctx.lineTo(13, -6);
    ctx.lineTo(8, -8); ctx.lineTo(4, -4); ctx.lineTo(0, -8); ctx.lineTo(-4, -4); ctx.lineTo(-8, -8); ctx.closePath(); ctx.fill();
    // waxen torso, melted over the shoulders
    ctx.fillStyle = wax;
    ctx.beginPath(); ctx.moveTo(-11, -22); ctx.quadraticCurveTo(-13, -36, -4, -38); ctx.lineTo(7, -38); ctx.quadraticCurveTo(14, -35, 12, -22);
    ctx.lineTo(10, -16); ctx.lineTo(8, -21); ctx.lineTo(4, -13); ctx.lineTo(1, -21); ctx.lineTo(-3, -15); ctx.lineTo(-6, -21); ctx.lineTo(-9, -14); ctx.closePath(); ctx.fill();
    if (this.flash <= 0) {
      ctx.strokeStyle = '#1d1510'; ctx.lineWidth = 1.1; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.fillStyle = 'rgba(70,50,35,0.3)'; ctx.fillRect(-11, -36, 6, 14);
      ctx.strokeStyle = 'rgba(255,250,236,0.5)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(1, -37); ctx.quadraticCurveTo(11, -35, 11.5, -24); ctx.stroke();
    }
    // helm
    ctx.fillStyle = this.flash > 0 ? '#fff' : '#1b1820';
    ctx.beginPath(); ctx.moveTo(-6, -36); ctx.quadraticCurveTo(-7, -50, 2, -50); ctx.quadraticCurveTo(10, -49, 8, -36); ctx.closePath(); ctx.fill();
    if (this.flash <= 0) {
      ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke();
      ctx.strokeStyle = 'rgba(190,200,230,0.35)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(1, -48.5); ctx.quadraticCurveTo(7.5, -48, 7.6, -40); ctx.stroke();
    }
    ctx.fillStyle = '#0a090c'; ctx.fillRect(0, -45, 8, 2.4);
    // lance
    ctx.save(); ctx.translate(8, -26); ctx.rotate(lanceA);
    ctx.strokeStyle = '#3e3946'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(30, 0); ctx.stroke();
    ctx.fillStyle = B.wax; ctx.fillRect(28, -2.5, 6, 5);
    ctx.restore();
    // hand
    ctx.fillStyle = wax; ctx.beginPath(); ctx.arc(8, -26, 3.2, 0, TAU); ctx.fill();
    ctx.restore();
  }
  lanceTip() {
    let lean = 0, lanceA = 0.05;
    if (this.state === 'wind') { lean = -0.15; lanceA = -0.55 * clamp(1 - this.st / 0.5, 0, 1); }
    else if (this.state === 'charge') { lean = 0.18; lanceA = 0.1; }
    else if (this.state === 'recover') { lean = 0.05; lanceA = 0.4; }
    const bx = 8, by = -26, a = lanceA;
    let tx = bx + Math.cos(a) * 34, ty = by + Math.sin(a) * 34 - 3;
    const c = Math.cos(lean), s = Math.sin(lean);
    const rx = tx * c - ty * s, ry = tx * s + ty * c;
    return { x: this.cx + rx * this.face, y: this.y + this.h + ry };
  }
  drawEmissive(ctx, G) {
    const tip = this.lanceTip();
    drawFlame(ctx, tip.x, tip.y, 8, 2.2, G.time + this.t, this.state === 'charge' ? -this.face * 4 : 0, false);
    const lean = this.state === 'charge' ? 0.18 : this.state === 'wind' ? -0.15 : 0;
    const ex = this.cx + this.face * (4 + lean * 40), ey = this.y + this.h - 44 + Math.abs(lean) * 3;
    ctx.fillStyle = this.state === 'wind' || this.state === 'charge' ? '#ffe6a6' : '#ff8a2e';
    ctx.fillRect(ex - 3, ey, 6, 1.6);
  }
  light(G) { const tip = this.lanceTip(); G.addLight(tip.x, tip.y - 4, 90, 0.7, 'warm', 0.3, 30); }
}

// ---------- Spitter Bloom: a rooted wax flower that spits molten globs ----------
class Spitter extends Enemy {
  constructor(x, y, room, tx, ty) {
    super(x, y, 26, 26, 8);
    this.contact = true; this.drop = 6; this.cool = rr(0.8, 1.8); this.charge = 0;
    // Find the surface it grows from.
    if (room.solid(tx, ty + 1)) { this.nx = 0; this.ny = -1; this.y = (ty + 1) * T - this.h; }
    else if (room.solid(tx, ty - 1)) { this.nx = 0; this.ny = 1; this.y = ty * T; }
    else if (room.solid(tx - 1, ty)) { this.nx = 1; this.ny = 0; this.x = tx * T; this.y = ty * T + 3; }
    else { this.nx = -1; this.ny = 0; this.x = (tx + 1) * T - this.w; this.y = ty * T + 3; }
    this.squash = 0;
  }
  onHit() { this.squash = 1; }
  mouth() { return { x: this.cx + this.nx * 10, y: this.cy + this.ny * 10 }; }
  update(dt, G) {
    this.t += dt; if (this.flash > 0) this.flash -= dt; this.squash = damp(this.squash, 0, 8, dt);
    const p = G.player, m = this.mouth();
    const dx = p.cx - m.x, dy = p.cy - m.y, d = Math.hypot(dx, dy);
    if (this.charge > 0) {
      this.charge -= dt;
      if (this.charge <= 0) {
        const k = 240 / (d || 1);
        G.spawnProjectile(new Glob(m.x, m.y, dx * k, dy * k));
        Sound.play('spit'); this.squash = -1; this.cool = rr(2, 2.6);
      }
    } else {
      this.cool -= dt;
      if (this.cool <= 0 && d < 430 && p.state !== 'dead' && (dx * this.nx + dy * this.ny) > -20 && G.room.clearLine(m.x, m.y, p.cx, p.cy)) this.charge = 0.6;
      else if (this.cool <= 0) this.cool = 0.4;
    }
  }
  draw(ctx, G) {
    const B = G.room.B;
    const ang = Math.atan2(this.ny, this.nx) + Math.PI / 2;
    const base = { x: this.cx - this.nx * 12, y: this.cy - this.ny * 12 };
    ctx.save(); ctx.translate(base.x, base.y); ctx.rotate(ang);
    const sq = 1 + this.squash * 0.15 + (this.charge > 0 ? Math.sin(this.t * 40) * 0.05 : 0);
    ctx.scale(1 / sq, sq);
    ctx.fillStyle = this.flash > 0 ? '#fff' : '#17121a';
    for (let i = -2; i <= 2; i++) {
      ctx.save(); ctx.rotate(i * 0.45 + Math.sin(this.t * 2 + i) * 0.05);
      ctx.beginPath(); ctx.moveTo(-4, 0); ctx.quadraticCurveTo(-5, -12, 0, -17); ctx.quadraticCurveTo(5, -12, 4, 0); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = this.flash > 0 ? '#fff' : B.wax;
    ctx.beginPath(); ctx.moveTo(-9, -2); ctx.bezierCurveTo(-12, -16, -6, -24, 0, -24); ctx.bezierCurveTo(6, -24, 12, -16, 9, -2); ctx.closePath(); ctx.fill();
    if (this.flash <= 0) {
      ctx.strokeStyle = '#1d1510'; ctx.lineWidth = 1.1; ctx.stroke();
      ctx.fillStyle = 'rgba(80,55,40,0.3)';
      ctx.beginPath(); ctx.moveTo(-9, -2); ctx.bezierCurveTo(-12, -16, -6, -24, 0, -24); ctx.bezierCurveTo(-5, -18, -6, -8, -4, -2); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#120c0e';
    ctx.beginPath(); ctx.ellipse(0, -19, 4.5, 3 + (this.charge > 0 ? 1.5 : 0), 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  drawEmissive(ctx, G) {
    if (this.charge <= 0) return;
    const m = this.mouth(), k = 1 - this.charge / 0.6;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5 + k * 0.5;
    ctx.drawImage(Art.glow.hot, m.x - 8 - k * 6, m.y - 8 - k * 6, 16 + k * 12, 16 + k * 12);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  light(G) { if (this.charge > 0) { const m = this.mouth(); G.addLight(m.x, m.y, 70, 0.6, 'warm', 0.4, 24); } }
}

// ---------- Projectiles ----------
class Projectile {
  constructor(x, y, vx, vy, w, h) {
    this.x = x - w / 2; this.y = y - h / 2; this.w = w; this.h = h; this.vx = vx; this.vy = vy;
    this.life = 3; this.dead = false; this.hostile = true; this.dmg = 1; this.grav = 0; this.t = 0; this.slashable = false;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  update(dt, G) {
    this.t += dt; this.life -= dt; if (this.life <= 0) { this.dead = true; return; }
    this.vy += this.grav * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (G.room.solidPx(this.cx, this.cy)) this.hitWall(G);
  }
  hitWall(G) { this.dead = true; this.burst(G); }
  burst(G) { FX.sparks(this.cx, this.cy, 8, 0, TAU, 260); FX.smoke(this.cx, this.cy, 2, 7); }
  draw() {}
  drawEmissive() {}
  light() {}
}

class Glob extends Projectile {
  constructor(x, y, vx, vy) { super(x, y, vx, vy, 14, 14); this.slashable = true; this.life = 3.5; }
  update(dt, G) { super.update(dt, G); if (Math.random() < 0.5) Particles.spawn(P_EMBER, this.cx, this.cy, rr(-20, 20), rr(-20, 20), 0.3, 2); }
  drawEmissive(ctx, G) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(Art.glow.warm, this.cx - 22, this.cy - 22, 44, 44);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffcf7a'; ctx.beginPath(); ctx.arc(this.cx, this.cy, 5 + Math.sin(this.t * 30) * 0.6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff6dc'; ctx.beginPath(); ctx.arc(this.cx, this.cy, 2.5, 0, TAU); ctx.fill();
  }
  light(G) { G.addLight(this.cx, this.cy, 80, 0.7, null); }
}

class Cinder extends Projectile {
  constructor(x, y, face) {
    super(x, y, face * 700, 0, 34, 20);
    this.hostile = false; this.dmg = 5; this.life = 1.1; this.face = face; this.hit = new Set();
  }
  update(dt, G) {
    super.update(dt, G);
    for (let i = 0; i < 2; i++) Particles.spawn(P_EMBER, this.cx - this.face * 10, this.cy + rr(-6, 6), -this.face * rr(40, 140), rr(-60, 30), rr(0.25, 0.5), rr(2, 3.5));
    if (Math.random() < 0.4) FX.smoke(this.cx - this.face * 14, this.cy, 1, 7, -10);
  }
  burst(G) { FX.sparks(this.cx, this.cy, 16, this.face > 0 ? Math.PI : 0, Math.PI * 1.4, 420); FX.embers(this.cx, this.cy, 10, 80); G.shake(0.15); Sound.play('burst'); }
  drawEmissive(ctx, G) {
    const x = this.cx, y = this.cy, f = this.face;
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(Art.glow.warm, x - 50, y - 50, 100, 100);
    ctx.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
    ctx.fillStyle = '#ff8f33';
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.quadraticCurveTo(8, -10, -6, -8); ctx.quadraticCurveTo(-20, -6 + Math.sin(this.t * 40) * 2, -30, 0);
    ctx.quadraticCurveTo(-20, 6, -6, 8); ctx.quadraticCurveTo(8, 10, 12, 0); ctx.fill();
    ctx.fillStyle = '#ffe7a8';
    ctx.beginPath(); ctx.ellipse(3, 0, 8, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fffaf0';
    ctx.beginPath(); ctx.ellipse(5, 0, 4, 2.6, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  light(G) { G.addLight(this.cx, this.cy, 150, 0.95, null); }
}

// ---------- Pickups ----------
class EmberPickup {
  constructor(x, y, value) {
    this.x = x; this.y = y; this.vx = rr(-160, 160); this.vy = rr(-380, -180); this.value = value; this.t = 0; this.dead = false;
    this.w = 6; this.h = 6; this.ground = false;
  }
  update(dt, G) {
    this.t += dt;
    const p = G.player;
    const dx = p.cx - this.x, dy = p.cy - this.y, d = Math.hypot(dx, dy);
    if (this.t > 0.35 && d < 120 && p.state !== 'dead') {
      const k = 1800 / (d + 10);
      this.vx = damp(this.vx, dx * k * 0.2 + dx * 4, 8, dt); this.vy = damp(this.vy, dy * k * 0.2 + dy * 4, 8, dt);
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (d < 16) { this.dead = true; G.embers += this.value; G.emberPulse = 1; Sound.play('ember'); Particles.spawn(P_GLINT, this.x, this.y, 0, -30, 0.3, 4); }
      return;
    }
    this.vy = Math.min(this.vy + 1500 * dt, 700);
    this.vx = damp(this.vx, 0, this.ground ? 6 : 0.5, dt);
    const e = { x: this.x - 3, y: this.y - 3, w: 6, h: 6 };
    if (moveX(G.room, e, this.vx * dt)) this.vx *= -0.5;
    const r = moveY(G.room, e, this.vy * dt);
    if (r === 1) { this.vy = Math.abs(this.vy) > 120 ? -this.vy * 0.45 : 0; this.ground = true; } else if (r === -1) this.vy = 0;
    this.x = e.x + 3; this.y = e.y + 3;
  }
  drawEmissive(ctx, G) {
    const s = 2.4 + this.value * 0.5, tw = 0.75 + Math.sin(this.t * 9 + this.x) * 0.25;
    ctx.globalAlpha = tw;
    ctx.drawImage(Art.ember, this.x - s * 2.4, this.y - s * 2.4, s * 4.8, s * 4.8);
    ctx.fillStyle = '#fff3d0';
    ctx.beginPath(); ctx.moveTo(this.x, this.y - s); ctx.lineTo(this.x + s * 0.6, this.y); ctx.lineTo(this.x, this.y + s); ctx.lineTo(this.x - s * 0.6, this.y); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// ---------- Props ----------
class Urn {
  constructor(x, y) { this.x = x - 9; this.y = y - 24; this.w = 18; this.h = 24; this.dead = false; this.shake = 0; this.v = hash2(x | 0, y | 0, 3); }
  takeHit(G) {
    this.dead = true; Sound.play('break');
    FX.chunks(this.x + 9, this.y + 12, 12, '#4a4058', 300); FX.smoke(this.x + 9, this.y + 12, 3, 8);
    G.dropEmbers(this.x + 9, this.y + 8, 5);
    G.markBroken(this.id);
    return false;
  }
  draw(ctx, G) {
    const x = this.x + 9, y = this.y + 24, tall = 0.9 + this.v * 0.25;
    ctx.save(); ctx.translate(x, y); ctx.scale(1, tall);
    ctx.fillStyle = '#2a2433';
    ctx.beginPath(); ctx.moveTo(-5, 0); ctx.bezierCurveTo(-12, -6, -11, -17, -5, -20); ctx.lineTo(-4, -24); ctx.lineTo(4, -24); ctx.lineTo(5, -20); ctx.bezierCurveTo(11, -17, 12, -6, 5, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3d3549'; ctx.fillRect(-6, -25, 12, 2.5);
    ctx.strokeStyle = 'rgba(160,150,190,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(5, -18); ctx.bezierCurveTo(9, -14, 9, -7, 4, -2); ctx.stroke();
    ctx.strokeStyle = 'rgba(214,200,166,0.35)'; ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(8, -10); ctx.stroke();
    ctx.restore();
  }
}

class Shrine {
  constructor(x, y) { this.x = x; this.y = y; this.w = 60; this.lit = 0.6; this.t = 0; }
  near(p) { return Math.abs(p.cx - this.x) < 40 && Math.abs(p.y + p.h - this.y) < 10; }
  update(dt, G) { this.t += dt; this.lit = damp(this.lit, G.player.state === 'sit' ? 1 : 0.65, 3, dt); }
  draw(ctx, G) {
    const B = G.room.B, x = this.x, y = this.y;
    ctx.fillStyle = B.fill[0];
    ctx.fillRect(x - 34, y - 10, 68, 10);
    ctx.fillRect(x - 28, y - 16, 56, 6);
    ctx.fillStyle = hexA(B.top, 0.6); ctx.fillRect(x - 34, y - 10, 68, 1.5); ctx.fillRect(x - 28, y - 16, 56, 1.2);
    // crook post
    ctx.strokeStyle = '#2b2733'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + 22, y - 16); ctx.lineTo(x + 22, y - 92); ctx.quadraticCurveTo(x + 22, y - 104, x + 10, y - 104); ctx.lineTo(x + 2, y - 104); ctx.stroke();
    // chain + lantern
    const sw = Math.sin(this.t * 1.2) * 0.04;
    ctx.save(); ctx.translate(x + 2, y - 104); ctx.rotate(sw);
    ctx.strokeStyle = '#3a3542'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 10); ctx.stroke();
    ctx.fillStyle = '#2b2733';
    ctx.beginPath(); ctx.moveTo(-9, 14); ctx.lineTo(0, 9); ctx.lineTo(9, 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,200,120,' + (0.35 + this.lit * 0.4) + ')';
    ctx.fillRect(-7, 14, 14, 18);
    ctx.strokeStyle = '#2b2733'; ctx.lineWidth = 2;
    ctx.strokeRect(-7, 14, 14, 18); ctx.beginPath(); ctx.moveTo(0, 14); ctx.lineTo(0, 32); ctx.stroke();
    ctx.fillStyle = '#2b2733'; ctx.fillRect(-9, 32, 18, 3);
    ctx.restore();
    // carved sigil on the plinth
    ctx.strokeStyle = hexA(B.top, 0.35); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - 6, y - 4); ctx.lineTo(x, y - 9); ctx.lineTo(x + 6, y - 4); ctx.stroke();
  }
  drawEmissive(ctx, G) {
    const x = this.x + 2 + Math.sin(this.t * 1.2) * 0.04 * 20, y = this.y - 104 + 26;
    drawFlame(ctx, x, y, 8 + this.lit * 4, 2.6, this.t, 0, false);
  }
  light(G) {
    G.addLight(this.x + 2, this.y - 80, 220 + this.lit * 80, 0.95, 'warm', 0.35 + this.lit * 0.25, 90);
  }
}

class Relic {
  constructor(x, y) { this.x = x; this.y = y - 30; this.t = 0; this.dead = false; }
  update(dt, G) {
    this.t += dt;
    if (Math.random() < dt * 14) { const a = rr(0, TAU); Particles.spawn(P_GLINT, this.x + Math.cos(a) * 26, this.y + Math.sin(a) * 26, -Math.cos(a) * 30, -Math.sin(a) * 30 - 20, 0.8, rr(2, 3)); }
    const p = G.player;
    if (Math.abs(p.cx - this.x) < 22 && Math.abs(p.cy - this.y) < 34 && p.state === 'normal') { this.dead = true; G.collectRelic(this); }
  }
  draw(ctx, G) {
    const B = G.room.B, x = this.x, y = this.y + 30;
    ctx.fillStyle = B.fill[0];
    ctx.beginPath(); ctx.moveTo(x - 16, y); ctx.lineTo(x - 11, y - 14); ctx.lineTo(x + 11, y - 14); ctx.lineTo(x + 16, y); ctx.fill();
    ctx.fillStyle = hexA(B.top, 0.6); ctx.fillRect(x - 11, y - 14, 22, 1.5);
  }
  drawEmissive(ctx, G) {
    const x = this.x, y = this.y + Math.sin(this.t * 2) * 4;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.7 + Math.sin(this.t * 3) * 0.2;
    ctx.drawImage(Art.glow.warm, x - 60, y - 60, 120, 120);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#fff1cf'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 9, y - 9); ctx.lineTo(x - 1, y); ctx.lineTo(x - 9, y + 9);
    ctx.moveTo(x + 1, y - 9); ctx.lineTo(x + 9, y); ctx.lineTo(x + 1, y + 9);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,200,130,0.6)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, 16 + Math.sin(this.t * 4) * 1.5, 0, TAU); ctx.stroke();
  }
  light(G) { G.addLight(this.x, this.y, 170, 0.9, null); }
}

class Heart {
  constructor(x, y) { this.x = x; this.y = y - 22; this.t = 0; this.dead = false; }
  update(dt, G) {
    this.t += dt;
    const p = G.player;
    if (Math.abs(p.cx - this.x) < 18 && Math.abs(p.cy - this.y) < 30 && p.state === 'normal') { this.dead = true; G.collectHeart(this); }
    if (Math.random() < dt * 6) Particles.spawn(P_EMBER, this.x + rr(-6, 6), this.y, rr(-10, 10), rr(-40, -20), 0.8, 2);
  }
  drawEmissive(ctx, G) {
    const x = this.x, y = this.y + Math.sin(this.t * 2.2) * 3, s = 1 + Math.sin(this.t * 6) * 0.06;
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(Art.glow.red, x - 40, y - 40, 80, 80);
    ctx.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#ffb38a';
    ctx.beginPath(); ctx.moveTo(0, 8); ctx.bezierCurveTo(-12, -1, -9, -11, 0, -5); ctx.bezierCurveTo(9, -11, 12, -1, 0, 8); ctx.fill();
    ctx.fillStyle = '#fff0dc'; ctx.beginPath(); ctx.ellipse(-3.5, -4, 2, 1.4, -0.5, 0, TAU); ctx.fill();
    ctx.restore();
  }
  light(G) { G.addLight(this.x, this.y, 120, 0.8, null); }
}

class Remnant {
  constructor(x, y, embers) { this.x = x; this.y = y; this.embers = embers; this.t = 0; this.dead = false; }
  update(dt, G) {
    this.t += dt;
    if (Math.random() < dt * 5) FX.smoke(this.x + rr(-6, 6), this.y - 6, 1, 6, -30);
    const p = G.player;
    if (Math.abs(p.cx - this.x) < 22 && Math.abs(p.y + p.h - this.y) < 30 && p.state === 'normal') { this.dead = true; G.collectRemnant(this); }
  }
  draw(ctx) {
    ctx.fillStyle = '#16131a';
    ctx.beginPath(); ctx.ellipse(this.x, this.y - 2, 14, 5, 0, Math.PI, 0); ctx.fill();
  }
  drawEmissive(ctx, G) {
    for (let i = 0; i < 6; i++) {
      const x = this.x + Math.sin(i * 2.3) * 9, y = this.y - 3 - (i % 3) * 2, a = 0.5 + Math.sin(this.t * 4 + i) * 0.4;
      ctx.globalAlpha = a; ctx.drawImage(Art.ember, x - 4, y - 4, 8, 8);
    }
    ctx.globalAlpha = 1;
  }
  light(G) { G.addLight(this.x, this.y - 8, 70, 0.6, 'warm', 0.3, 30); }
}

class Door {
  constructor(x, y) { this.x = x; this.y = y; this.t = 0; this.open = 0; this.triggered = false; }
  update(dt, G) {
    this.t += dt;
    const p = G.player, d = Math.abs(p.cx - this.x);
    this.open = damp(this.open, d < 180 ? 1 : 0.3, 2, dt);
    if (d < 40 && !this.triggered && p.state === 'normal') { this.triggered = true; G.endDemo(); }
  }
  draw(ctx, G) {
    const B = G.room.B, x = this.x, y = this.y;
    ctx.fillStyle = B.fill[0];
    ctx.beginPath(); ctx.moveTo(x - 60, y); ctx.lineTo(x - 60, y - 120); ctx.quadraticCurveTo(x, y - 190, x + 60, y - 120); ctx.lineTo(x + 60, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#0b0606';
    ctx.beginPath(); ctx.moveTo(x - 44, y); ctx.lineTo(x - 44, y - 112); ctx.quadraticCurveTo(x, y - 168, x + 44, y - 112); ctx.lineTo(x + 44, y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = hexA(B.top, 0.5); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - 60, y - 120); ctx.quadraticCurveTo(x, y - 190, x + 60, y - 120); ctx.stroke();
    for (let i = -2; i <= 2; i++) { ctx.fillStyle = hexA(B.edge, 0.5); ctx.fillRect(x + i * 16 - 1, y - 150 + Math.abs(i) * 12, 2, 6); }
  }
  drawEmissive(ctx, G) {
    const x = this.x, y = this.y, k = this.open;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.25 + k * 0.5;
    ctx.fillStyle = '#ffcf8f';
    ctx.fillRect(x - 1.5, y - 140, 3, 140);
    ctx.drawImage(Art.glow.warm, x - 80, y - 150, 160, 160);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  light(G) { G.addLight(this.x, this.y - 70, 160 + this.open * 120, 0.8, null); }
}
