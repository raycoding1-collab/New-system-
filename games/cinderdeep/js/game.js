'use strict';
// Main loop, rooms, combat, camera, lighting, HUD and menus.

const SAVE_KEY = 'cinderdeep.save.v1';
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
const lightC = makeCanvas(2, 2), lctx = lightC.getContext('2d');
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');

const G = {
  state: 'boot', time: 0, freeze: 0, slow: 1, slowT: 0,
  room: null, player: null, enemies: [], projs: [], pickups: [], props: [], slashes: [], lights: [], nLights: 0,
  boss: null, arena: null, shrine: null,
  hp: 5, maxHp: 5, tallow: 0, embers: 0, hasDash: false, tempered: false,
  cam: { x: 0, y: 0, look: 0, lookY: 0, trauma: 0, sx: 0, sy: 0, still: 0 },
  fade: 1, fadeTo: 0, fadeSpeed: 3, fadeCb: null,
  flash: 0, flashCol: '255,244,220',
  hudPulse: 0, emberPulse: 0, hurtPulse: 0,
  view: { w: 640, h: 360, scale: 1 }, pr: 1, px: 1, cssW: 1, cssH: 1, safe: { l: 0, r: 0, t: 0, b: 0 },
  quality: 2, layers: null, layerBiome: '', chunkScale: 1,
  save: null, stats: { time: 0, deaths: 0 }, over: false, busy: false,
  bossBar: { on: false, trail: 1 },
  motes: [], fps: 60,
};

function freshSave() {
  return { v: 1, spawn: null, hasDash: false, maxHp: 5, embers: 0, tempered: false, heart: false, bossDead: false, broken: {}, visited: {}, remnant: null, stats: { time: 0, deaths: 0 }, done: false };
}

G.saveGame = function () {
  const s = G.save;
  s.hasDash = G.hasDash; s.maxHp = G.maxHp; s.embers = G.embers; s.tempered = G.tempered; s.stats = G.stats;
  Store.set(SAVE_KEY, s);
};

// =====================================================================================
// Resize and quality
// =====================================================================================
const safeEl = document.getElementById('safe');
function readSafe() {
  const cs = getComputedStyle(safeEl);
  return { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
}

function resize() {
  const cssW = Math.max(1, innerWidth), cssH = Math.max(1, innerHeight);
  const maxPr = [1, 1.5, 2][G.quality];
  const pr = Math.min(window.devicePixelRatio || 1, maxPr);
  G.cssW = cssW; G.cssH = cssH; G.pr = pr;
  canvas.width = Math.round(cssW * pr); canvas.height = Math.round(cssH * pr);
  const viewH = clamp(cssH * 0.85, 320, 440);
  let scale = cssH / viewH;
  if (cssW / scale < 420) scale = cssW / 420;
  G.view.scale = scale; G.view.w = cssW / scale; G.view.h = cssH / scale;
  G.px = scale * pr;
  G.chunkScale = Math.min(G.px, 2.6);
  lightC.width = Math.ceil(canvas.width / 4); lightC.height = Math.ceil(canvas.height / 4);
  G.vignette = Art.vignette(Math.ceil(canvas.width / 2), Math.ceil(canvas.height / 2));
  G.safe = readSafe();
  Input.layout(cssW, cssH, G.safe);
  G.layerBiome = '';
  if (G.room) { buildRoomVisuals(); G.room.prewarm(G.chunkScale); }
  ctx.imageSmoothingEnabled = true;
}

let resizeTimer = 0;
addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 120); });
if (window.visualViewport) visualViewport.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 120); });

function applyQuality() {
  Particles.setLimit([180, 300, 420][G.quality]);
  const n = [14, 26, 40][G.quality];
  G.motes.length = 0;
  for (let i = 0; i < n; i++) G.motes.push({ x: Math.random(), y: Math.random(), z: rr(0.5, 1.3), s: rr(1, 2.6), ph: rr(0, TAU), v: rr(6, 18) });
}

function buildRoomVisuals() {
  const B = G.room.B;
  if (G.layerBiome !== G.room.biome) {
    G.layers = Art.buildLayers(G.room.biome, G.view.w, G.view.h, Math.min(G.px * 0.55, 1.4));
    G.layerBiome = G.room.biome;
    G.ray = Art.raySprite(B.ray);
  }
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, B.sky[0]); sky.addColorStop(0.55, B.sky[1]); sky.addColorStop(1, B.sky[2]);
  G.skyGrad = sky;
  const fog = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.4);
  fog.addColorStop(0, hexA(B.fog, 0)); fog.addColorStop(0.5, hexA(B.fog, 0.16)); fog.addColorStop(1, hexA(B.fog, 0));
  G.fogGrad = fog;
  const m = ctx.createLinearGradient(0, 0, 0, T);
  m.addColorStop(0, '#ffb04a'); m.addColorStop(0.25, '#e2561d'); m.addColorStop(1, '#3a0d06');
  G.moltenGrad = m;
}

// =====================================================================================
// Rooms
// =====================================================================================
function tileFoot(x, y) { return { x: x * T + T / 2, y: (y + 1) * T }; }

function enterRoom(id, place, quiet) {
  const def = ROOMS[id];
  const room = new Room(def, G.save);
  G.room = room;
  G.enemies.length = 0; G.projs.length = 0; G.pickups.length = 0; G.props.length = 0; G.slashes.length = 0;
  G.boss = null; G.arena = null; G.shrine = null;
  Particles.clear();
  let start = null;
  for (const s of room.spawns) {
    const f = tileFoot(s.x, s.y);
    switch (s.c) {
      case '@': start = f; break;
      case 'S': G.shrine = new Shrine(f.x, f.y); G.props.push(G.shrine); break;
      case 'D': if (!G.hasDash) G.props.push(new Relic(f.x, f.y)); break;
      case 'H': if (!G.save.heart) G.props.push(new Heart(f.x, f.y)); break;
      case 'E': G.props.push(new Door(f.x, f.y)); break;
      case 'u': { const u = new Urn(f.x, f.y); u.id = id + ':u' + s.x + ',' + s.y; if (!G.save.broken[u.id]) G.props.push(u); break; }
      case 'X': if (!G.save.bossDead) { G.boss = new Chandler(f.x, f.y); G.enemies.push(G.boss); } break;
      default: spawnEnemy(s, f, room);
    }
  }
  if (def.boss) {
    G.arena = { x0: 2 * T, x1: 38 * T, ceil: 2 * T, floor: 18 * T };
    const [entry, exit] = room.gates.sort((a, b) => a.x - b.x);
    entry.closed = false; entry.open = 1;
    exit.closed = !G.save.bossDead; exit.open = exit.closed ? 0 : 1;
  }
  const rem = G.save.remnant;
  if (rem && rem.room === id) G.props.push(new Remnant(rem.x, rem.y, rem.embers));

  if (!G.player) G.player = new Player(0, 0);
  if (place) place(room, start);
  G.player.dropping = 0;
  buildRoomVisuals();
  const t0 = performance.now();
  room.prewarm(G.chunkScale);
  G.prewarmMs = performance.now() - t0;
  if (!(def.boss && G.boss && G.boss.state !== 'dormant')) Sound.music(def.music);
  const first = !G.save.visited[id];
  G.save.visited[id] = 1;
  if (first && !quiet) showAreaCard(def.name, '');
  updateCamera(0, true);
}

function spawnEnemy(s, f, room) {
  if (s.c === 'c') G.enemies.push(new Wickling(f.x, f.y));
  else if (s.c === 'w') G.enemies.push(new SootMoth(f.x, f.y));
  else if (s.c === 'k') G.enemies.push(new Sentinel(f.x, f.y));
  else if (s.c === 't') G.enemies.push(new Spitter(f.x, f.y, room, s.x, s.y));
}

function respawnEnemies() {
  G.enemies = G.enemies.filter((e) => e === G.boss && !e.dead);
  for (const s of G.room.spawns) if ('cwkt'.includes(s.c)) spawnEnemy(s, tileFoot(s.x, s.y), G.room);
}

function roomAtTile(wx, wy) {
  for (const id of ROOM_ORDER) {
    const r = ROOMS[id];
    if (wx >= r.wx && wx < r.wx + r.w && wy >= r.wy && wy < r.wy + r.h) return r;
  }
  return null;
}

function checkExit() {
  const p = G.player, r = G.room;
  if (G.busy || p.state === 'dead') return;
  let dx = 0, dy = 0;
  if (p.cx < 0) dx = -1; else if (p.cx > r.w * T) dx = 1;
  else if (p.y < -2 && p.vy < 0) dy = -1; else if (p.cy > r.h * T) dy = 1;
  if (!dx && !dy) return;
  const wx = r.def.wx * T + p.cx + dx * T * 0.6, wy = r.def.wy * T + p.cy + dy * T;
  const to = roomAtTile(Math.floor(wx / T), Math.floor(wy / T));
  if (!to) { p.x = clamp(p.x, 0, r.w * T - p.w); return; }
  const lx = r.def.wx * T + p.x - to.wx * T, ly = r.def.wy * T + p.y - to.wy * T;
  const vx = p.vx, vy = p.vy;
  // Award any embers still in the room.
  for (const e of G.pickups) if (!e.dead) G.embers += e.value;
  G.busy = true;
  fade(1, 7, () => {
    enterRoom(to.id, (room) => {
      p.x = lx; p.y = ly;
      if (dx < 0) p.x = room.w * T - p.w - 3;
      if (dx > 0) p.x = 3;
      if (dy < 0) { p.y = room.h * T - p.h - 2; p.vy = Math.min(vy, -780); }
      if (dy > 0) { p.y = 2; }
      p.vx = vx;
      p.lastSafe.x = p.x; p.lastSafe.y = p.y;
      for (const q of p.scarf) { q.x = p.cx; q.y = p.y + 11; }
    });
    G.busy = false;
    fade(0, 5);
  });
}

function fade(to, speed, cb) { G.fadeTo = to; G.fadeSpeed = speed; G.fadeCb = cb || null; }

// =====================================================================================
// Hooks used by entities
// =====================================================================================
G.addLight = function (x, y, r, i, glow, ga = 0, gr = 0) {
  const v = G.view, c = G.cam;
  if (x + r < c.x || x - r > c.x + v.w || y + r < c.y || y - r > c.y + v.h) return;
  let L = G.lights[G.nLights];
  if (!L) { L = {}; G.lights[G.nLights] = L; }
  L.x = x; L.y = y; L.r = r; L.i = i; L.glow = glow; L.ga = ga; L.gr = gr || r * 0.4;
  G.nLights++;
};
function buzz(ms) {
  // Android only; browsers refuse vibration until the player has touched the page.
  if (!navigator.vibrate || !Input.touchMode || !(navigator.userActivation && navigator.userActivation.hasBeenActive)) return;
  try { navigator.vibrate(ms); } catch (err) { /* ignore */ }
}
G.shake = function (a) { G.cam.trauma = Math.min(1, G.cam.trauma + a * (REDUCED.matches ? 0.3 : 1)); };
G.dropEmbers = function (x, y, n) {
  let left = n;
  while (left > 0) { const v = left >= 5 && Math.random() < 0.4 ? 5 : 1; G.pickups.push(new EmberPickup(x + rr(-6, 6), y, v)); left -= v; }
};
G.spawnProjectile = function (p) { G.projs.push(p); };
G.spawnShot = function (p) {
  G.projs.push(new Cinder(p.cx + p.face * 14, p.cy - 2, p.face));
  FX.sparks(p.cx + p.face * 14, p.cy, 10, p.face > 0 ? 0 : Math.PI, 0.9, 380);
  G.shake(0.2);
};
G.addSlash = function (p) { G.slashes.push({ p, dir: p.attackDir, face: p.face, t: 0, life: 0.15 }); };
G.markBroken = function (id) { G.save.broken[id] = 1; };

G.resolveAttack = function (p, box) {
  const dmg = G.tempered ? 3 : 2;
  const dirx = p.attackDir === 'side' ? p.face : 0, diry = p.attackDir === 'up' ? -1 : p.attackDir === 'down' ? 1 : 0;
  let pogo = false, hitEnemy = false;
  for (const e of G.enemies) {
    if (e.dead || p.hits.has(e) || !overlap(box, e)) continue;
    p.hits.add(e);
    const ex = clamp(p.cx + dirx * 30, e.x, e.x + e.w), ey = clamp(p.cy + diry * 30, e.y, e.y + e.h);
    const real = e.takeHit(G, dmg, dirx || Math.sign(e.cx - p.cx) || 1, diry);
    if (real === false && e === G.boss) continue;
    if (real) { G.tallow = Math.min(99, G.tallow + 11); if (G.tallow >= 33 && G.tallow - 11 < 33) Sound.play('tallow'); }
    hitEnemy = true;
    FX.sparks(ex, ey, 9, Math.atan2(diry, dirx || (e.cx > p.cx ? 1 : -1)), 1.4, 460);
    FX.wax(ex, ey, 4, 180);
    Sound.play('hit');
    G.freeze = Math.max(G.freeze, 0.05); G.shake(0.16);
    buzz(8);
    if (p.attackDir === 'down') pogo = true;
  }
  for (const pr of G.props) {
    if (pr instanceof Urn && !pr.dead && !p.hits.has(pr) && overlap(box, pr)) { p.hits.add(pr); pr.takeHit(G); if (p.attackDir === 'down') pogo = true; }
  }
  for (const w of G.room.walls.slice()) {
    if (p.hits.has(w)) continue;
    for (const [tx, ty] of w.tiles) {
      if (overlap(box, { x: tx * T, y: ty * T, w: T, h: T })) {
        p.hits.add(w); w.hp--; w.shake = 0.25; G.shake(0.2);
        FX.chunks(tx * T + T / 2, p.cy, 6, '#2b2f40', 220); FX.dust(tx * T + T / 2, p.cy + 10, 4);
        if (w.hp <= 0) {
          G.room.breakWall(w, G.save); Sound.play('break'); G.shake(0.5);
          for (const [bx, by] of w.tiles) { FX.chunks(bx * T + 16, by * T + 16, 10, '#262a3a', 320); FX.smoke(bx * T + 16, by * T + 16, 3, 14); }
          G.room.chunks.clear(); G.saveGame();
        } else Sound.play('crack');
        break;
      }
    }
  }
  for (const q of G.projs) {
    if (q.dead || !q.slashable || !q.hostile || !overlap(box, q)) continue;
    q.dead = true; q.burst(G); Sound.play('clink'); G.freeze = Math.max(G.freeze, 0.03);
    if (p.attackDir === 'down') pogo = true;
  }
  if (p.attackDir === 'down' && !pogo) {
    const x0 = Math.floor(box.x / T), x1 = Math.floor((box.x + box.w) / T), y0 = Math.floor(box.y / T), y1 = Math.floor((box.y + box.h) / T);
    outer: for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (G.room.ch(tx, ty) === '^') {
        pogo = true; Sound.play('clink');
        FX.sparks(clamp(p.cx, tx * T, tx * T + T), ty * T + 14, 8, -Math.PI / 2, 1.5, 380);
        break outer;
      }
    }
  }
  if (pogo && p.pogoSwing !== p.swing) { p.pogoSwing = p.swing; p.pogo(); }
  if (hitEnemy && p.attackDir === 'side') p.vx = -p.face * (p.onGround ? 190 : 120);
};

G.hazardHit = function (kind) {
  const p = G.player;
  if (G.busy || p.state === 'dead') return;
  G.hp -= 1;
  Sound.play('hurt'); G.shake(0.45); G.flash = 0.5; G.flashCol = '255,120,80'; G.hurtPulse = 1;
  FX.sparks(p.cx, p.y + p.h, 12, -Math.PI / 2, 1.6, 360);
  if (kind === '~') FX.embers(p.cx, p.y + p.h, 14, 120);
  if (G.hp <= 0) { p.die(G); return; }
  p.state = 'cutscene'; G.busy = true; G.freeze = 0.12;
  fade(1, 5, () => {
    p.x = p.lastSafe.x; p.y = p.lastSafe.y; p.vx = 0; p.vy = 0; p.state = 'normal'; p.invuln = 1.1;
    for (const q of p.scarf) { q.x = p.cx; q.y = p.y + 11; }
    updateCamera(0, true);
    G.busy = false; fade(0, 4);
  });
};

G.onPlayerHurt = function (p) {
  Sound.play('hurt');
  G.freeze = Math.max(G.freeze, 0.13); G.shake(0.5);
  G.flash = 0.28; G.flashCol = '255,90,60'; G.hurtPulse = 1;
  FX.sparks(p.cx, p.cy, 14, 0, TAU, 380); FX.smoke(p.cx, p.cy, 4, 9);
  buzz(30);
};

G.onPlayerDeath = function (p) {
  Sound.play('die'); Sound.music('none');
  G.slow = 0.4; G.slowT = 1.1; G.shake(0.6);
  FX.smoke(p.cx, p.y + 4, 14, 14, -50); FX.embers(p.cx, p.y + 4, 20, 100);
  G.stats.deaths++;
  setTimeout(() => {
    fade(1, 1.6, () => {
      if (G.embers > 0) G.save.remnant = { room: G.room.id, x: p.lastSafe.x + p.w / 2, y: p.lastSafe.y + p.h, embers: G.embers };
      G.embers = 0;
      G.hp = G.maxHp; G.tallow = 0;
      G.saveGame();
      respawnAtShrine();
      fade(0, 1.2);
    });
  }, 1400);
};

function respawnAtShrine() {
  const sp = G.save.spawn;
  G.player = new Player(0, 0);
  if (sp) {
    enterRoom(sp.room, (room) => { placeAtShrineTile(room); });
  } else {
    enterRoom('wakefall', (room, start) => { G.player.x = start.x - 9; G.player.y = start.y - 30; });
  }
  G.player.state = 'wake'; G.player.wakeT = 0.6;
  updateCamera(0, true);
}

function placeAtShrineTile(room) {
  const s = room.spawns.find((q) => q.c === 'S');
  const f = tileFoot(s.x, s.y);
  G.player.x = f.x - 9 - 26; G.player.y = f.y - 30; G.player.face = 1;
  G.player.lastSafe.x = G.player.x; G.player.lastSafe.y = G.player.y;
}

G.collectRelic = function (r) {
  G.hasDash = true; Input.hasDash = true;
  Sound.play('relic'); G.flash = 0.8; G.flashCol = '255,236,200'; G.freeze = 0.25; G.shake(0.4);
  FX.embers(r.x, r.y, 40, 160);
  G.player.state = 'relic';
  G.saveGame();
  setTimeout(() => showBanner('Flicker', 'A burst of flame carries you through the air.', Input.touchMode ? 'Tap the double arrow to flicker, on the ground or in mid-air.' : 'Press C or Shift to flicker, on the ground or in mid-air.'), 900);
};

G.collectHeart = function (h) {
  G.save.heart = true; G.maxHp += 1; G.hp = G.maxHp;
  Sound.play('relic'); G.flash = 0.7; G.flashCol = '255,180,150'; G.freeze = 0.2;
  FX.embers(h.x, h.y, 30, 140); G.hudPulse = 1;
  G.player.state = 'relic';
  G.saveGame();
  setTimeout(() => showBanner('Wax Heart', 'A hidden vessel of wax. Your flame burns longer.', 'Your health has grown by one.'), 700);
};

G.collectRemnant = function (r) {
  G.embers += r.embers; G.save.remnant = null;
  Sound.play('mend'); G.emberPulse = 1; FX.embers(r.x, r.y - 6, 26, 120);
  G.saveGame();
};

G.startBoss = function () {
  const b = G.boss;
  const entry = G.room.gates[0];
  entry.closed = true; Sound.play('gate'); G.shake(0.3);
  Sound.music('none');
  G.player.state = 'cutscene';
  setTimeout(() => { b.wake(); }, 700);
  setTimeout(() => showAreaCard('The Chandler', 'Keeper of the last wick', true), 1900);
};
G.bossAwake = function () {
  if (G.player.state === 'cutscene') G.player.state = 'normal';
  G.bossBar.on = true; G.bossBar.trail = 1;
  Sound.music('boss');
};
G.bossDying = function (b) {
  G.slow = 0.3; G.slowT = 1.6; G.flash = 1; G.flashCol = '255,240,210'; G.freeze = 0.35; G.shake(1);
  Sound.music('none'); Sound.play('bossDie');
  for (const q of G.projs) if (q.hostile) { q.dead = true; q.burst(G); }
};
G.bossDefeated = function (b) {
  G.save.bossDead = true; G.bossBar.on = false;
  for (const g of G.room.gates) g.closed = false;
  Sound.play('gate');
  G.dropEmbers(b.cx, b.y + 40, 40);
  FX.embers(b.cx, b.y + 60, 50, 200);
  G.saveGame();
  setTimeout(() => { showAreaCard('The hall falls silent', 'The way below is open'); Sound.music('shrine'); }, 1200);
};

G.endDemo = function () {
  if (G.over) return;
  G.over = true; G.save.done = true; G.saveGame();
  Sound.play('door');
  G.player.state = 'cutscene';
  fade(1, 0.7, () => { showEnding(); });
};

// Shrine rest
function rest() {
  const p = G.player, s = G.shrine;
  p.state = 'sit'; p.sitT = 0; p.vx = 0;
  p.x = s.x - p.w / 2 - 26; p.face = 1;
  G.hp = G.maxHp;
  G.save.spawn = { room: G.room.id };
  G.saveGame();
  respawnEnemies();
  Sound.play('rest'); FX.embers(s.x, s.y - 80, 24, 100); G.hudPulse = 1;
  setTimeout(() => { if (p.state === 'sit') openRest(); }, 650);
}
function rise() {
  closeScreen('rest');
  G.player.state = 'normal';
  G.state = 'play';
}

// =====================================================================================
// Update
// =====================================================================================
function updateTitle(dt) {
  G.time += dt;
  G.player.update(dt, G);
  for (const e of G.enemies) e.update(dt, G);
  for (const pr of G.props) if (pr.update) pr.update(dt, G);
  Particles.update(dt);
  const c = G.cam, v = G.view, r = G.room;
  c.x = damp(c.x, clamp(260 + Math.sin(G.time * 0.07) * 260, 0, Math.max(0, r.w * T - v.w)), 0.8, dt);
  c.y = clamp(r.h * T - v.h, 0, Math.max(0, r.h * T - v.h));
  c.sx = c.sy = 0;
}

function update(dt) {
  G.time += dt;
  G.stats.time += dt;
  const p = G.player, room = G.room;

  p.update(dt, G);

  // Shrine prompt
  const nearShrine = G.shrine && p.state === 'normal' && p.onGround && G.shrine.near(p);
  Input.showInteract = !!nearShrine && Input.touchMode;
  if (nearShrine && (Input.pressed.up || Input.pressed.interact)) rest();
  G.nearShrine = nearShrine;
  if (p.state === 'sit' && G.state === 'play' && (Input.pressed.jump || Input.held.left || Input.held.right || Input.pressed.attack)) rise();

  // Boss trigger
  if (G.boss && G.boss.state === 'dormant' && p.cx > 9 * T && p.state === 'normal') G.startBoss();

  for (const e of G.enemies) {
    if (e.dead) continue;
    e.update(dt, G);
    if (e.contact && !e.dead && p.state !== 'dead' && overlap(p.hurtbox, e)) p.hurt(G, e.cx);
    if (e.swipeBox && overlap(p.hurtbox, e.swipeBox)) p.hurt(G, e.cx);
  }
  G.enemies = G.enemies.filter((e) => !e.dead);
  if (G.boss && G.boss.dead) G.boss = null;

  for (const q of G.projs) {
    if (q.dead) continue;
    q.update(dt, G);
    if (q.dead) continue;
    if (q.hostile) {
      if (p.state !== 'dead' && overlap(p.hurtbox, q)) { if (p.hurt(G, q.cx)) { if (!(q instanceof Wave)) { q.dead = true; q.burst(G); } } }
    } else if (q instanceof Cinder) {
      for (const e of G.enemies) {
        if (e.dead || q.hit.has(e) || !overlap(q, e)) continue;
        q.hit.add(e);
        if (e.takeHit(G, q.dmg, q.face, 0) !== false) { Sound.play('hit'); FX.sparks(e.cx, q.cy, 12, q.face > 0 ? 0 : Math.PI, 1.2, 480); G.freeze = Math.max(G.freeze, 0.04); }
      }
      for (const w of room.walls) for (const [tx, ty] of w.tiles) if (overlap(q, { x: tx * T, y: ty * T, w: T, h: T })) { q.dead = true; q.burst(G); }
    }
  }
  G.projs = G.projs.filter((q) => !q.dead);

  for (const k of G.pickups) k.update(dt, G);
  G.pickups = G.pickups.filter((k) => !k.dead);
  for (const pr of G.props) if (pr.update) pr.update(dt, G);
  G.props = G.props.filter((pr) => !pr.dead);
  for (const s of G.slashes) s.t += dt;
  G.slashes = G.slashes.filter((s) => s.t < s.life);

  // Gates and walls
  for (const g of room.gates) g.open = damp(g.open, g.closed ? 0 : 1, 7, dt);
  for (const w of room.walls) if (w.shake > 0) w.shake -= dt;

  // Molten bubbles
  if (room.molten.length && Math.random() < dt * 8) {
    const [mx, my] = pick(room.molten);
    Particles.spawn(P_EMBER, mx * T + rr(0, T), my * T + 6, rr(-10, 10), rr(-70, -30), rr(0.6, 1.2), rr(1.5, 3), -10, 0.5);
  }

  Particles.update(dt);
  checkExit();
  updateCamera(dt, false);

  if (G.hudPulse > 0) G.hudPulse -= dt * 2;
  if (G.emberPulse > 0) G.emberPulse -= dt * 3;
  if (G.hurtPulse > 0) G.hurtPulse -= dt * 1.5;
  const bb = G.bossBar;
  if (G.boss && bb.on) bb.trail = damp(bb.trail, G.boss.hp / G.boss.maxHp, 2.5, dt);
}

function updateCamera(dt, snap) {
  const p = G.player, v = G.view, r = G.room, c = G.cam;
  const still = p.onGround && Math.abs(p.vx) < 5 && p.state === 'normal';
  if (still && (Input.held.up || Input.held.down) && !G.nearShrine) c.still += dt; else c.still = 0;
  const lookY = c.still > 0.55 ? (Input.held.up ? -110 : 110) : 0;
  c.lookY = snap ? lookY : damp(c.lookY, lookY, 4, dt);
  const lookX = p.face * (Math.abs(p.vx) > 40 ? 70 : 45);
  c.look = snap ? lookX : damp(c.look, lookX, 2.2, dt);
  let tx = p.cx + c.look - v.w / 2, ty = p.cy - 24 - v.h / 2 + c.lookY;
  const rw = r.w * T, rh = r.h * T;
  tx = rw <= v.w ? (rw - v.w) / 2 : clamp(tx, 0, rw - v.w);
  ty = rh <= v.h ? (rh - v.h) / 2 : clamp(ty, 0, rh - v.h);
  if (snap) { c.x = tx; c.y = ty; }
  else {
    c.x = damp(c.x, tx, 7, dt);
    c.y = damp(c.y, ty, p.vy > 450 ? 11 : 6, dt);
  }
  c.trauma = Math.max(0, c.trauma - dt * 1.7);
  const s = c.trauma * c.trauma * 13;
  c.sx = s * (Math.sin(G.time * 63) + Math.sin(G.time * 37) * 0.5) * 0.67;
  c.sy = s * (Math.cos(G.time * 57) + Math.sin(G.time * 29) * 0.5) * 0.67;
}

// =====================================================================================
// Render
// =====================================================================================
function collectLights() {
  G.nLights = 0;
  const p = G.player, room = G.room, t = G.time;
  if (p.visible && p.state !== 'dead') {
    const tip = p.flameTip(), k = clamp(G.hp / G.maxHp, 0.3, 1);
    const flick = 1 + Math.sin(t * 13) * 0.03 + Math.sin(t * 31) * 0.02;
    G.addLight(tip.x, tip.y - 4, (190 + 70 * k) * flick * (p.state === 'mend' ? 1.2 : 1), 1, 'warm', 0.32, 60);
  }
  for (const f of room.flames) {
    const flick = 1 + Math.sin(t * 11 + f.ph) * 0.06 + Math.sin(t * 23 + f.ph * 2) * 0.04;
    G.addLight(f.x, f.y - 3, 105 * flick, 0.85, 'warm', 0.34, 24);
  }
  for (let i = 0; i < room.molten.length; i += 2) {
    const [x, y] = room.molten[i];
    G.addLight(x * T + T, y * T + 8, 120, 0.8, 'molten', 0.35, 60);
  }
  for (const e of G.enemies) e.light(G);
  for (const q of G.projs) q.light(G);
  for (const pr of G.props) if (pr.light) pr.light(G);
}

function drawTiled(L, camX, camY, offY) {
  const v = G.view, px = G.px;
  const lw = L.w, lh = L.h;
  const ox = -((camX * L.f) % lw + lw) % lw;
  if (offY === null) {
    // tile both ways
    const oy = -((camY * L.f) % lh + lh) % lh;
    for (let y = oy; y < v.h; y += lh) for (let x = ox; x < v.w; x += lw) ctx.drawImage(L.c, x * px, y * px, lw * px, lh * px);
  } else {
    for (let x = ox; x < v.w; x += lw) ctx.drawImage(L.c, x * px, offY * px, lw * px, lh * px);
  }
}

function render() {
  const W = canvas.width, H = canvas.height, px = G.px, v = G.view, c = G.cam, room = G.room, B = room.B;
  const camX = c.x + c.sx, camY = c.y + c.sy;
  const t = G.time;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = G.skyGrad; ctx.fillRect(0, 0, W, H);

  // Parallax
  const L = G.layers;
  const midY = (room.h * T - v.h) / 2;
  drawTiled(L.l1, camX, camY, (v.h - L.l1.h) / 2 - (camY - midY) * L.l1.f);
  drawTiled(L.l2, camX, camY, null);
  ctx.fillStyle = G.fogGrad;
  ctx.save(); ctx.translate(0, H * 0.45 + Math.sin(t * 0.2) * 10); ctx.fillRect(0, 0, W, H * 0.4); ctx.restore();
  drawTiled(L.l3, camX, camY, null);

  // God rays
  if (G.quality > 0 && room.def.rays) {
    ctx.globalCompositeOperation = 'lighter';
    for (const [rx, ra, rw] of room.def.rays) {
      const x = (rx * T - camX * 0.9) * px, y = (-camY * 0.9) * px;
      if (x < -400 * px || x > (v.w + 400) * px) continue;
      ctx.save(); ctx.translate(x, y); ctx.rotate(ra);
      ctx.globalAlpha = 0.09 + Math.sin(t * 0.6 + rx) * 0.025;
      ctx.drawImage(G.ray, -rw * px / 2, 0, rw * px, Math.max(v.h, room.h * T) * px * 1.1);
      ctx.restore();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  // World
  const ox = -Math.round(camX * px), oy = -Math.round(camY * px);
  ctx.setTransform(px, 0, 0, px, ox, oy);
  const rw = room.w * T, rh = room.h * T;
  ctx.fillStyle = B.fill[2];
  if (camX < 0) ctx.fillRect(camX - 10, camY - 10, -camX + 10, v.h + 20);
  if (camX + v.w > rw) ctx.fillRect(rw, camY - 10, camX + v.w - rw + 10, v.h + 20);
  if (camY < 0) ctx.fillRect(camX - 10, camY - 10, v.w + 20, -camY + 10);
  if (camY + v.h > rh) ctx.fillRect(camX - 10, rh, v.w + 20, camY + v.h - rh + 10);

  const view = { x: camX, y: camY, w: v.w, h: v.h };
  for (const pr of G.props) if (pr.draw && !(pr instanceof Urn)) pr.draw(ctx, G);

  const cx0 = Math.max(0, Math.floor(camX / CHUNK)), cx1 = Math.floor((camX + v.w) / CHUNK);
  const cy0 = Math.max(0, Math.floor(camY / CHUNK)), cy1 = Math.floor((camY + v.h) / CHUNK);
  for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
    if (cx * CHUNK >= rw || cy * CHUNK >= rh) continue;
    ctx.drawImage(room.chunk(cx, cy, G.chunkScale), cx * CHUNK, cy * CHUNK, CHUNK, CHUNK);
  }
  drawDynamicTiles(view);
  for (const pr of G.props) if (pr instanceof Urn) pr.draw(ctx, G);
  for (const e of G.enemies) e.draw(ctx, G);
  G.player.draw(ctx, G);
  for (const q of G.projs) q.draw(ctx, G);
  Particles.draw(ctx, 0, view);

  // Lighting
  collectLights();
  const lw = lightC.width, lh = lightC.height, ls = lw / W;
  const dark = room.def.dark !== undefined ? room.def.dark : B.dark;
  lctx.globalCompositeOperation = 'source-over'; lctx.globalAlpha = 1;
  lctx.fillStyle = `rgba(${B.amb[0]},${B.amb[1]},${B.amb[2]},${dark})`;
  lctx.clearRect(0, 0, lw, lh); lctx.fillRect(0, 0, lw, lh);
  lctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < G.nLights; i++) {
    const Lt = G.lights[i];
    const sx = ((Lt.x - camX) * px) * ls, sy = ((Lt.y - camY) * px) * ls, r = Lt.r * px * ls;
    lctx.globalAlpha = Lt.i;
    lctx.drawImage(Art.light, sx - r, sy - r, r * 2, r * 2);
  }
  lctx.globalAlpha = 1; lctx.globalCompositeOperation = 'source-over';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(lightC, 0, 0, W, H);

  // Emissive pass. Hints come first so the darkness never swallows them on a small screen.
  ctx.setTransform(px, 0, 0, px, ox, oy);
  drawHints(view);
  for (const f of room.flames) {
    if (f.x < camX - 20 || f.x > camX + v.w + 20 || f.y < camY - 20 || f.y > camY + v.h + 20) continue;
    drawFlame(ctx, f.x, f.y, 6.5, 1.9, t * 1.1 + f.ph, Math.sin(t * 0.7 + f.ph) * 0.6, false);
  }
  drawMoltenGlow(view);
  for (const pr of G.props) if (pr.drawEmissive) pr.drawEmissive(ctx, G);
  for (const e of G.enemies) e.drawEmissive(ctx, G);
  G.player.drawEmissive(ctx, G);
  for (const q of G.projs) q.drawEmissive(ctx, G);
  for (const k of G.pickups) k.drawEmissive(ctx, G);
  drawSlashes();
  ctx.globalCompositeOperation = 'lighter';
  Particles.draw(ctx, 1, view);
  // Soft additive glow around every light
  for (let i = 0; i < G.nLights; i++) {
    const Lt = G.lights[i];
    if (!Lt.glow || !Lt.ga) continue;
    ctx.globalAlpha = Lt.ga;
    const r = Lt.gr;
    ctx.drawImage(Art.glow[Lt.glow], Lt.x - r, Lt.y - r, r * 2, r * 2);
  }
  // Drifting motes
  ctx.fillStyle = B.mote;
  for (const m of G.motes) {
    const W1 = v.w * 1.2, H1 = v.h * 1.2;
    const mx = camX + ((m.x * W1 - camX * m.z) % W1 + W1) % W1 - v.w * 0.1;
    const my = camY + ((m.y * H1 - t * m.v - camY * m.z) % H1 + H1) % H1 - v.h * 0.1;
    ctx.globalAlpha = (0.25 + Math.sin(t * 1.5 + m.ph) * 0.2) * m.z;
    const s = m.s * m.z;
    ctx.drawImage(Art.ember, mx + Math.sin(t * 0.8 + m.ph) * 8 - s * 2, my - s * 2, s * 4, s * 4);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

  // Shrine prompt for keyboard players
  if (G.nearShrine && !Input.touchMode && G.state === 'play') {
    ctx.font = `15px ${FONT_DISPLAY}`; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,230,190,' + (0.7 + Math.sin(t * 4) * 0.2) + ')';
    ctx.fillText('↑  Rest', G.shrine.x, G.shrine.y - 130);
  }

  // Foreground silhouettes
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawForeground(camX, camY);

  ctx.drawImage(G.vignette, 0, 0, W, H);
  if (G.hurtPulse > 0) {
    ctx.globalAlpha = G.hurtPulse * 0.5;
    ctx.drawImage(G.vignette, 0, 0, W, H);
    ctx.globalAlpha = 1;
  }
  if (G.flash > 0.01) {
    ctx.fillStyle = `rgba(${G.flashCol},${Math.min(0.6, G.flash * 0.6)})`;
    ctx.fillRect(0, 0, W, H);
  }

  if (G.state !== 'title') drawHUD();
  if (G.state === 'map') drawMap();

  if (G.fade > 0.001) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = `rgba(3,3,6,${G.fade})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (DEBUG) drawDebug(camX, camY);
}

function drawDynamicTiles(view) {
  const room = G.room, B = room.B, t = G.time;
  // Molten wax, one path per pool
  for (const [x0, x1, y] of room.moltenSpans) {
    const X0 = x0 * T, X1 = (x1 + 1) * T, Y = y * T;
    if (X0 > view.x + view.w || X1 < view.x || Y > view.y + view.h || Y + T < view.y) continue;
    ctx.save(); ctx.translate(0, Y);
    ctx.fillStyle = G.moltenGrad;
    ctx.beginPath(); ctx.moveTo(X0, T + 1);
    for (let wx = X0; wx <= X1; wx += 8) ctx.lineTo(wx, 7 + Math.sin(wx * 0.13 + t * 2.2) * 1.6 + Math.sin(wx * 0.05 - t * 1.4) * 1.4);
    ctx.lineTo(X1, T + 1); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // Cracked walls
  for (const w of room.walls) {
    const sh = w.shake > 0 ? Math.sin(t * 90) * 2 * w.shake / 0.25 : 0;
    for (const [x, y] of w.tiles) {
      const X = x * T + sh, Y = y * T;
      ctx.fillStyle = B.fill[1]; ctx.fillRect(X, Y, T, T);
      ctx.fillStyle = B.fill[0]; ctx.fillRect(X + 2, Y + 2, T - 4, T - 4);
      ctx.strokeStyle = hexA(B.edge, 0.45); ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(X + 6, Y + 2); ctx.lineTo(X + 12, Y + 12); ctx.lineTo(X + 9, Y + 22); ctx.lineTo(X + 15, Y + 30);
      ctx.moveTo(X + 12, Y + 12); ctx.lineTo(X + 22, Y + 15);
      if (w.hp < 3) { ctx.moveTo(X + 22, Y + 15); ctx.lineTo(X + 28, Y + 6); ctx.moveTo(X + 9, Y + 22); ctx.lineTo(X + 2, Y + 26); }
      if (w.hp < 2) { ctx.moveTo(X + 22, Y + 15); ctx.lineTo(X + 26, Y + 28); ctx.moveTo(X + 4, Y + 8); ctx.lineTo(X + 12, Y + 12); }
      ctx.stroke();
    }
  }
  // Gates
  for (const g of room.gates) {
    const top = g.y0 * T - T * 3, bottom = (g.y1 + 1) * T, h = bottom - top;
    const drop = h * (1 - g.open);
    if (drop < 1) continue;
    const yb = top + drop;
    ctx.fillStyle = '#211d26';
    for (let i = 0; i < 4; i++) {
      const bx = g.x * T + 3 + i * 8;
      ctx.fillRect(bx, top, 3.4, drop);
      ctx.beginPath(); ctx.moveTo(bx - 1.5, yb); ctx.lineTo(bx + 1.7, yb + 7); ctx.lineTo(bx + 4.9, yb); ctx.fill();
    }
    for (let yy = yb - 14; yy > top; yy -= 34) ctx.fillRect(g.x * T + 1, yy, T - 2, 4);
    ctx.fillStyle = 'rgba(160,150,190,0.25)';
    for (let i = 0; i < 4; i++) ctx.fillRect(g.x * T + 3 + i * 8, top, 1, drop);
  }
}

function drawMoltenGlow(view) {
  const room = G.room, t = G.time;
  if (!room.molten.length) return;
  ctx.strokeStyle = '#ffd88a'; ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (const [x0, x1, y] of room.moltenSpans) {
    const X0 = x0 * T, X1 = (x1 + 1) * T, Y = y * T;
    if (X0 > view.x + view.w || X1 < view.x) continue;
    for (let wx = X0; wx <= X1; wx += 8) {
      const wy = Y + 7 + Math.sin(wx * 0.13 + t * 2.2) * 1.6 + Math.sin(wx * 0.05 - t * 1.4) * 1.4;
      if (wx === X0) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);
    }
  }
  ctx.stroke();
}

const hintCache = new Map();
function drawHints(view) {
  const room = G.room, B = room.B, p = G.player;
  if (!room.def.hints.length) return;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = `italic 600 14px ${FONT_BODY}`;
  for (const h of room.def.hints) {
    const def = HINTS[h.k];
    if (def.needs === 'dash' && !G.hasDash) continue;
    if (def.unless === 'dash' && G.hasDash) continue;
    const x = h.x * T, y = h.y * T;
    const d = Math.hypot(p.cx - x, p.cy - y);
    const a = clamp(1 - (d - 140) / 220, 0, 1);
    if (a <= 0.01) continue;
    const text = Input.touchMode ? def.touch : def.keys;
    const key = text;
    let lines = hintCache.get(key);
    if (!lines) {
      lines = []; let cur = '';
      for (const word of text.split(' ')) {
        const test = cur ? cur + ' ' + word : word;
        if (ctx.measureText(test).width > 220 && cur) { lines.push(cur); cur = word; } else cur = test;
      }
      lines.push(cur); hintCache.set(key, lines);
    }
    lines.forEach((ln, i) => {
      const ly = y + i * 17;
      ctx.fillStyle = `rgba(0,0,0,${0.6 * a})`; ctx.fillText(ln, x, ly + 1.2);
      ctx.fillStyle = hexA(B.top, 0.72 * a); ctx.fillText(ln, x, ly);
    });
  }
}

function drawSlashes() {
  for (const s of G.slashes) {
    const p = s.p, k = s.t / s.life;
    let base, ox = 0, oy = 0;
    if (s.dir === 'up') { base = -Math.PI / 2; oy = -10; }
    else if (s.dir === 'down') { base = Math.PI / 2; oy = 12; }
    else { base = s.face > 0 ? 0 : Math.PI; ox = s.face * 10; }
    const cx = p.cx + ox, cy = p.cy - 2 + oy;
    const sweep = 2.3, dirSign = s.dir === 'side' ? s.face : (s.dir === 'up' ? -s.face : s.face);
    const a0 = base - (sweep / 2) * dirSign;
    const reveal = Math.min(1, k * 4);
    const a1 = a0 + sweep * reveal * dirSign;
    const R = 42, r = 28;
    const alpha = 1 - easeOut(k);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * 0.55;
    const gx = Math.cos(base) * 26, gy = Math.sin(base) * 26;
    ctx.drawImage(Art.glow.warm, gx - 46, gy - 46, 92, 92);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#fff4dc';
    ctx.beginPath();
    ctx.arc(0, 0, R, a0, a1, dirSign < 0);
    const mid = (a0 + a1) / 2;
    ctx.quadraticCurveTo(Math.cos(mid) * r * 0.95, Math.sin(mid) * r * 0.95, Math.cos(a0) * R * 0.92, Math.sin(a0) * R * 0.92);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,170,90,' + alpha + ')'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, R + 2, a0, a1, dirSign < 0); ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawForeground(camX, camY) {
  const room = G.room, px = G.px, v = G.view, t = G.time;
  ctx.fillStyle = '#020204'; ctx.strokeStyle = '#020204';
  for (const f of room.fg) {
    const sx = (f.x - camX * 1.25 - v.w * 0.1) * px;
    if (sx < -260 * px || sx > (v.w + 260) * px) continue;
    const s = f.size * px, rnd = mulberry32(f.seed);
    ctx.save();
    if (f.top) {
      ctx.translate(sx, -camY * 0.08 * px - 10 * px);
      if (f.kind === 'roots') {
        for (let i = 0; i < 4; i++) {
          const x = (rnd() - 0.5) * 70 * s, len = (36 + rnd() * 70) * s, w = (3 + rnd() * 5) * s;
          const sway = Math.sin(t * 0.7 + i + f.seed) * 6 * s;
          ctx.beginPath(); ctx.moveTo(x - w, 0);
          ctx.quadraticCurveTo(x - w * 0.3 + sway * 0.5, len * 0.6, x + sway, len);
          ctx.quadraticCurveTo(x + w * 0.3 + sway * 0.5, len * 0.6, x + w, 0); ctx.fill();
        }
        ctx.beginPath(); ctx.ellipse(0, 0, 80 * s, 26 * s, 0, 0, TAU); ctx.fill();
      } else {
        const len = (60 + rnd() * 80) * s, sway = Math.sin(t * 0.9 + f.seed) * 0.04;
        ctx.rotate(sway); ctx.lineWidth = 3 * s;
        for (let y = 0; y < len; y += 14 * s) { ctx.beginPath(); ctx.ellipse(0, y + 7 * s, 3.5 * s, 7 * s, 0, 0, TAU); ctx.stroke(); }
        ctx.fillRect(-9 * s, len, 18 * s, 22 * s);
        ctx.beginPath(); ctx.moveTo(-12 * s, len); ctx.lineTo(0, len - 10 * s); ctx.lineTo(12 * s, len); ctx.fill();
      }
    } else {
      ctx.translate(sx, v.h * px + 14 * px);
      const w = (80 + rnd() * 90) * s, h = (20 + rnd() * 24) * s;
      ctx.beginPath(); ctx.moveTo(-w, 0); ctx.quadraticCurveTo(-w * 0.4, -h * 1.3, 0, -h); ctx.quadraticCurveTo(w * 0.5, -h * 0.9, w, 0); ctx.fill();
      ctx.lineWidth = 2 * s; ctx.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        const gx = (rnd() - 0.5) * w * 1.4, gh = (8 + rnd() * 16) * s, base = -h * (1 - Math.pow(gx / w, 2)) * 0.9;
        ctx.beginPath(); ctx.moveTo(gx, base + 4 * s); ctx.quadraticCurveTo(gx + 3 * s, base - gh * 0.6, gx + (rnd() - 0.5) * 12 * s + Math.sin(t + i) * 2 * s, base - gh); ctx.stroke();
      }
    }
    ctx.restore();
  }
}

// =====================================================================================
// HUD
// =====================================================================================
function drawHUD() {
  const pr = G.pr, S = G.safe, t = G.time;
  ctx.setTransform(pr, 0, 0, pr, 0, 0);
  const s = clamp(Math.min(G.cssW, G.cssH) / 390, 0.85, 1.35);
  const x0 = S.l + 18 * s, y0 = S.t + 14 * s;

  // Tallow vessel
  const vx = x0 + 24 * s, vy = y0 + 25 * s, vr = 21 * s;
  const lvl = G.tallow / 99;
  const ready = G.tallow >= 33;
  if (ready) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.35 + Math.sin(t * 3) * 0.12;
    ctx.drawImage(Art.glow.warm, vx - vr * 2.2, vy - vr * 2.2, vr * 4.4, vr * 4.4);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  ctx.fillStyle = 'rgba(8,8,14,0.82)';
  ctx.beginPath(); ctx.arc(vx, vy, vr, 0, TAU); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.arc(vx, vy, vr - 2.5 * s, 0, TAU); ctx.clip();
  const top = vy + vr - lvl * vr * 2;
  const mg = ctx.createLinearGradient(0, top, 0, vy + vr);
  mg.addColorStop(0, '#ffd27a'); mg.addColorStop(0.3, '#ff8a2e'); mg.addColorStop(1, '#7a2208');
  ctx.fillStyle = mg;
  ctx.beginPath(); ctx.moveTo(vx - vr, vy + vr);
  for (let i = 0; i <= 10; i++) { const xx = vx - vr + (i / 10) * vr * 2; ctx.lineTo(xx, top + Math.sin(t * 3 + i * 0.9) * 1.6 * s); }
  ctx.lineTo(vx + vr, vy + vr); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = ready ? '#f3dfb8' : 'rgba(225,212,186,0.75)'; ctx.lineWidth = 2.4 * s;
  ctx.beginPath(); ctx.arc(vx, vy, vr, 0, TAU); ctx.stroke();
  ctx.strokeStyle = 'rgba(225,212,186,0.5)'; ctx.lineWidth = 1.2 * s;
  for (const k of [1 / 3, 2 / 3]) {
    const yy = vy + vr - k * vr * 2, hw = Math.sqrt(Math.max(0, vr * vr - (yy - vy) * (yy - vy)));
    ctx.beginPath(); ctx.moveTo(vx + hw - 5 * s, yy); ctx.lineTo(vx + hw, yy); ctx.stroke();
  }
  // Wick-shaped health
  const hx = x0 + 58 * s, hy = y0 + 20 * s;
  for (let i = 0; i < G.maxHp; i++) {
    const cx = hx + i * 17 * s, lit = i < G.hp;
    const pulse = G.hudPulse > 0 && lit ? 1 + G.hudPulse * 0.25 : 1;
    ctx.fillStyle = lit ? '#efe2c6' : 'rgba(150,140,125,0.45)';
    roundRect(ctx, cx - 4 * s, hy - 2 * s, 8 * s, 15 * s, 2 * s); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(cx - 4 * s, hy - 2 * s, 2.5 * s, 15 * s);
    ctx.strokeStyle = '#1b1416'; ctx.lineWidth = 1.2 * s;
    ctx.beginPath(); ctx.moveTo(cx, hy - 2 * s); ctx.lineTo(cx, hy - 5 * s); ctx.stroke();
    if (lit) {
      drawFlame(ctx, cx, hy - 5 * s, 9 * s * pulse, 2.3 * s, t + i * 1.7, 0, false);
    } else {
      ctx.fillStyle = 'rgba(120,115,130,0.4)';
      ctx.beginPath(); ctx.arc(cx + Math.sin(t * 2 + i) * 1.5 * s, hy - 9 * s - ((t * 6 + i * 3) % 6) * s, 1.5 * s, 0, TAU); ctx.fill();
    }
  }
  // Embers
  const ex = hx - 4 * s, ey = hy + 30 * s, ep = 1 + Math.max(0, G.emberPulse) * 0.3;
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(Art.ember, ex - 8 * s * ep, ey - 8 * s * ep, 16 * s * ep, 16 * s * ep);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#fff1d2';
  ctx.beginPath(); ctx.moveTo(ex, ey - 5 * s); ctx.lineTo(ex + 3 * s, ey); ctx.lineTo(ex, ey + 5 * s); ctx.lineTo(ex - 3 * s, ey); ctx.closePath(); ctx.fill();
  ctx.font = `${Math.round(17 * s)}px ${FONT_DISPLAY}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText(String(G.embers), ex + 10 * s, ey + 2);
  ctx.fillStyle = '#f2e6cf'; ctx.fillText(String(G.embers), ex + 10 * s, ey + 1);

  // Boss bar
  if (G.bossBar.on && G.boss) {
    const bw = Math.min(460, G.cssW * 0.52), bx = (G.cssW - bw) / 2, by = G.cssH - S.b - (Input.touchMode ? 150 : 42) * s;
    const k = G.boss.hp / G.boss.maxHp;
    ctx.font = `${Math.round(15 * s)}px ${FONT_DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText('The Chandler', G.cssW / 2, by - 8 * s + 1);
    ctx.fillStyle = '#f2e3c6'; ctx.fillText('The Chandler', G.cssW / 2, by - 8 * s);
    ctx.fillStyle = 'rgba(10,8,10,0.75)'; ctx.fillRect(bx - 2, by - 2, bw + 4, 8 * s + 4);
    ctx.fillStyle = '#fff0cc'; ctx.fillRect(bx, by, bw * G.bossBar.trail, 8 * s);
    const bg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    bg.addColorStop(0, '#ff7a2a'); bg.addColorStop(1, G.boss.phase === 2 ? '#9fd4ff' : '#ffc46a');
    ctx.fillStyle = bg; ctx.fillRect(bx, by, bw * k, 8 * s);
  }

  if (Input.touchMode && (G.state === 'play')) {
    Input.hasDash = G.hasDash;
    Input.draw(ctx, { tallow: G.tallow });
  } else if (G.state === 'play') {
    // Small key reminder in the corner for keyboard players
    ctx.font = `${Math.round(12 * s)}px ${FONT_BODY}`; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(230,220,200,0.32)';
    ctx.fillText('Esc pause  ·  M map', G.cssW - S.r - 16, S.t + 14);
  }
}

// =====================================================================================
// Map
// =====================================================================================
let mapCanvas = null, mapKey = '';
function drawMap() {
  const pr = G.pr;
  ctx.setTransform(pr, 0, 0, pr, 0, 0);
  ctx.fillStyle = 'rgba(4,4,8,0.88)'; ctx.fillRect(0, 0, G.cssW, G.cssH);
  // Frame the rooms explored so far, so the map grows as you do.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const id of ROOM_ORDER) {
    if (!G.save.visited[id] && id !== G.room.id) continue;
    const r = ROOMS[id]; minX = Math.min(minX, r.wx); minY = Math.min(minY, r.wy); maxX = Math.max(maxX, r.wx + r.w); maxY = Math.max(maxY, r.wy + r.h);
  }
  minX -= 6; minY -= 4; maxX += 6; maxY += 4;
  const S = G.safe;
  const aw = G.cssW - S.l - S.r - 48, ah = G.cssH - S.t - S.b - 120;
  const sc = Math.min(aw / (maxX - minX), ah / (maxY - minY), 7);
  const ox = S.l + 24 + (aw - (maxX - minX) * sc) / 2, oy = S.t + 64 + (ah - (maxY - minY) * sc) / 2;
  const key = Object.keys(G.save.visited).join() + sc + Object.keys(G.save.broken).length;
  if (key !== mapKey) {
    mapKey = key;
    mapCanvas = makeCanvas(G.cssW * pr, G.cssH * pr);
    const g = mapCanvas.getContext('2d'); g.scale(pr, pr);
    for (const id of ROOM_ORDER) {
      if (!G.save.visited[id]) continue;
      const r = ROOMS[id];
      g.fillStyle = 'rgba(214,200,166,0.16)';
      for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
        const c = r.map[y][x];
        if (c !== '#' && c !== 'B') g.fillRect(ox + (r.wx + x - minX) * sc, oy + (r.wy + y - minY) * sc, sc + 0.3, sc + 0.3);
      }
      g.strokeStyle = 'rgba(214,200,166,0.5)'; g.lineWidth = 1;
      g.strokeRect(ox + (r.wx - minX) * sc + 0.5, oy + (r.wy - minY) * sc + 0.5, r.w * sc, r.h * sc);
      g.font = `${Math.max(10, Math.round(sc * 3.2))}px ${FONT_BODY}`; g.fillStyle = 'rgba(230,218,192,0.75)'; g.textAlign = 'center'; g.textBaseline = 'bottom';
      g.fillText(r.name, ox + (r.wx + r.w / 2 - minX) * sc, oy + (r.wy - minY) * sc - 3);
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(mapCanvas, 0, 0);
  ctx.setTransform(pr, 0, 0, pr, 0, 0);
  const cur = G.room.def;
  ctx.strokeStyle = '#ffb46a'; ctx.lineWidth = 1.5;
  ctx.strokeRect(ox + (cur.wx - minX) * sc, oy + (cur.wy - minY) * sc, cur.w * sc, cur.h * sc);
  const mark = (wx, wy, col, r) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(ox + (wx - minX) * sc, oy + (wy - minY) * sc, r, 0, TAU); ctx.fill(); };
  for (const id of ROOM_ORDER) {
    if (!G.save.visited[id]) continue;
    const r = ROOMS[id];
    r.map.forEach((row, y) => { const x = row.indexOf('S'); if (x >= 0) mark(r.wx + x + 0.5, r.wy + y + 0.5, '#ffd9a0', 3.5); });
  }
  const rem = G.save.remnant;
  if (rem) { const r = ROOMS[rem.room]; mark(r.wx + rem.x / T, r.wy + rem.y / T - 0.5, '#ff6a2b', 3); }
  const p = G.player;
  if (Math.sin(G.time * 6) > -0.3) mark(cur.wx + p.cx / T, cur.wy + p.cy / T, '#fff6e0', 3.2);
  ctx.font = `${Math.round(22)}px ${FONT_DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#efe2c8'; ctx.fillText('Cinderdeep', G.cssW / 2, S.t + 18);
  ctx.font = `14px ${FONT_BODY}`; ctx.fillStyle = 'rgba(230,218,192,0.75)'; ctx.textBaseline = 'bottom';
  ctx.fillText('White: you   ·   Pale: lantern shrine   ·   Red: your dropped embers', G.cssW / 2, G.cssH - S.b - 34);
  ctx.fillText(Input.touchMode ? 'Tap anywhere to close' : 'Press M or Esc to close', G.cssW / 2, G.cssH - S.b - 14);
}

function drawDebug(camX, camY) {
  ctx.setTransform(G.px, 0, 0, G.px, -camX * G.px, -camY * G.px);
  ctx.strokeStyle = 'lime'; ctx.lineWidth = 1 / G.px;
  const p = G.player; ctx.strokeRect(p.x, p.y, p.w, p.h);
  for (const e of G.enemies) ctx.strokeRect(e.x, e.y, e.w, e.h);
  ctx.setTransform(G.pr, 0, 0, G.pr, 0, 0);
  ctx.fillStyle = '#0f0'; ctx.font = '12px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(`${G.fps.toFixed(0)} fps  cpu ${(G.cpu || 0).toFixed(1)}ms  q${G.quality}  px ${G.px.toFixed(2)}  ${G.room.id} ${(p.x / T).toFixed(1)},${(p.y / T).toFixed(1)}`, 8, G.cssH - 18);
}

// =====================================================================================
// DOM screens
// =====================================================================================
const $ = (id) => document.getElementById(id);
function openScreen(id) { $(id).hidden = false; Input.enabled = false; Input.releaseAllTouch(); const f = $(id).querySelector('button:not([disabled])'); if (f && !Input.touchMode) f.focus({ preventScroll: true }); }
function closeScreen(id) { $(id).hidden = true; if (!document.querySelector('.screen:not([hidden]), .panel:not([hidden])')) Input.enabled = true; }

let cardTimer = 0;
function showAreaCard(title, sub, boss) {
  const el = $('areacard');
  el.querySelector('h2').textContent = title;
  el.querySelector('p').textContent = sub || '';
  el.classList.toggle('boss', !!boss);
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(cardTimer); cardTimer = setTimeout(() => el.classList.remove('show'), boss ? 3200 : 2600);
}

let bannerReady = 0;
function showBanner(title, body, how) {
  $('banner-title').textContent = title; $('banner-body').textContent = body; $('banner-how').textContent = how;
  openScreen('banner'); G.state = 'banner'; bannerReady = performance.now() + 700;
}
function dismissBanner() {
  if (performance.now() < bannerReady) return;
  closeScreen('banner'); G.state = 'play';
  if (G.player.state === 'relic') G.player.state = 'normal';
}

function openRest() {
  const btn = $('btn-temper');
  const cost = 80;
  if (G.tempered) { btn.disabled = true; btn.querySelector('span').textContent = 'Snuffer tempered'; btn.querySelector('small').textContent = 'Your strikes already land harder'; }
  else {
    btn.disabled = G.embers < cost;
    btn.querySelector('span').textContent = 'Temper the snuffer';
    btn.querySelector('small').textContent = G.embers < cost ? `Needs ${cost} embers. You have ${G.embers}` : `Spend ${cost} embers. Strikes deal half again as much`;
  }
  G.state = 'rest'; openScreen('rest');
}

function openPause() {
  if (G.state !== 'play') return;
  G.state = 'pause'; openScreen('pause'); Sound.play('ui');
  $('btn-sound2').textContent = Sound.muted ? 'Sound: off' : 'Sound: on';
}
function resume() { closeScreen('pause'); G.state = 'play'; }

function openMap() { if (G.state !== 'play' && G.state !== 'pause') return; if (G.state === 'pause') closeScreen('pause'); G.state = 'map'; Input.enabled = false; Input.releaseAllTouch(); $('mapclose').hidden = false; Sound.play('ui'); }
function closeMap() { G.state = 'play'; $('mapclose').hidden = true; Input.enabled = true; }

function fmtTime(s) { const m = Math.floor(s / 60), r = Math.floor(s % 60); return `${m}:${String(r).padStart(2, '0')}`; }
function showEnding() {
  $('end-time').textContent = fmtTime(G.stats.time);
  $('end-deaths').textContent = String(G.stats.deaths);
  $('end-embers').textContent = String(G.embers);
  $('end-secret').textContent = G.save.heart ? 'Found' : 'Not found';
  G.state = 'ending'; openScreen('ending');
  Sound.music('shrine');
}

function startGame(cont) {
  Sound.init();
  closeScreen('title');
  G.over = false;
  const saved = Store.get(SAVE_KEY);
  const resume = cont && saved && saved.spawn && !saved.done;
  G.save = resume ? Object.assign(freshSave(), saved) : freshSave();
  cont = resume;
  G.stats = G.save.stats || { time: 0, deaths: 0 };
  G.hasDash = !!G.save.hasDash; Input.hasDash = G.hasDash;
  G.maxHp = G.save.maxHp || 5; G.hp = G.maxHp; G.embers = G.save.embers || 0; G.tempered = !!G.save.tempered; G.tallow = 0;
  G.player = new Player(0, 0);
  if (cont && G.save.spawn) {
    enterRoom(G.save.spawn.room, (room) => placeAtShrineTile(room));
    G.player.state = 'wake'; G.player.wakeT = 0.6;
  } else {
    G.save.visited = {};
    enterRoom('wakefall', (room, start) => { G.player.x = start.x - 9; G.player.y = start.y - 30; G.player.lastSafe.x = G.player.x; G.player.lastSafe.y = G.player.y; });
    G.player.state = 'wake'; G.player.wakeT = 0;
  }
  G.state = 'play';
  fade(0, 1.5);
  requestWake();
  if (Input.touchMode && !isStandalone()) tryFullscreen();
}

function goTitle() {
  closeScreen('pause'); closeScreen('ending');
  G.state = 'title';
  setupTitleScene();
  openScreen('title');
  refreshTitle();
}

// Installing as an app: Android and desktop Chrome offer a native prompt, iPhone uses Add to Home Screen.
let installPrompt = null;
const isStandalone = () => matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isHostedApp = () => !!document.querySelector('link[rel="manifest"]') && /^https?:$/.test(location.protocol) && window.top === window;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; refreshTitle(); });
addEventListener('appinstalled', () => { installPrompt = null; refreshTitle(); });

function refreshTitle() {
  const btn = $('btn-install');
  btn.hidden = isStandalone() || !(installPrompt || (isIOS && isHostedApp()));
  if (btn.hidden) $('install-ios').hidden = true;
  const saved = Store.get(SAVE_KEY);
  const has = saved && saved.spawn && !saved.done;
  $('btn-begin').textContent = has ? 'Continue' : 'Begin';
  $('btn-new').hidden = !has;
  $('btn-sound').textContent = Sound.muted ? 'Sound: off' : 'Sound: on';
  $('controls-keys').hidden = Input.touchMode;
  $('controls-touch').hidden = !Input.touchMode;
}

function setupTitleScene() {
  G.save = freshSave();
  G.hasDash = false; G.hp = G.maxHp = 5;
  G.player = new Player(0, 0);
  enterRoom('wakefall', (room, start) => { G.player.x = start.x - 9; G.player.y = start.y - 30; }, true);
  G.player.state = 'wake'; G.player.wakeT = -1e9;
  G.fade = 1; fade(0, 0.8);
}

let wakeLock = null;
async function requestWake() {
  try { if (navigator.wakeLock && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch (e) { wakeLock = null; }
}
function tryFullscreen() {
  const el = document.documentElement;
  if (document.fullscreenElement || !el.requestFullscreen) return;
  el.requestFullscreen({ navigationUI: 'hide' }).then(() => {
    if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
  }).catch(() => {});
}

function wireUI() {
  $('btn-begin').addEventListener('click', () => { Sound.init(); Sound.play('ui'); startGame(true); });
  $('btn-new').addEventListener('click', () => { Sound.init(); Sound.play('ui'); Store.del(SAVE_KEY); startGame(false); });
  $('btn-sound').addEventListener('click', () => { Sound.init(); Sound.setMuted(!Sound.muted); refreshTitle(); });
  $('btn-install').addEventListener('click', () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.finally(() => { installPrompt = null; refreshTitle(); });
    } else {
      $('install-ios').hidden = !$('install-ios').hidden;
    }
  });
  $('btn-resume').addEventListener('click', resume);
  $('btn-map').addEventListener('click', openMap);
  $('btn-sound2').addEventListener('click', () => { Sound.setMuted(!Sound.muted); $('btn-sound2').textContent = Sound.muted ? 'Sound: off' : 'Sound: on'; });
  $('btn-title').addEventListener('click', () => { G.saveGame(); goTitle(); });
  $('btn-temper').addEventListener('click', () => {
    if (G.tempered || G.embers < 80) return;
    G.embers -= 80; G.tempered = true; G.saveGame(); Sound.play('relic'); G.flash = 0.5; G.flashCol = '255,220,170';
    openRest();
  });
  $('btn-rise').addEventListener('click', rise);
  $('banner').addEventListener('pointerdown', (e) => { e.preventDefault(); dismissBanner(); });
  $('mapclose').addEventListener('pointerdown', (e) => { e.preventDefault(); closeMap(); });
  $('btn-again').addEventListener('click', () => { Store.del(SAVE_KEY); closeScreen('ending'); startGame(false); });
  $('btn-stay').addEventListener('click', () => { closeScreen('ending'); G.state = 'play'; G.player.state = 'normal'; G.over = false; G.player.x -= 70; fade(0, 2); });
  $('btn-rotate').addEventListener('click', () => { $('rotate').hidden = true; G.rotateDismissed = true; });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { Sound.suspend(); if (G.state === 'play') openPause(); }
    else { Sound.resume(); if (G.state !== 'title') requestWake(); }
  });
  Input.onAnyInput = () => { Sound.init(); };
  // Keyboard navigation inside menus
  addEventListener('keydown', (e) => {
    const open = document.querySelector('.screen:not([hidden]), .panel:not([hidden])');
    if (!open || !e.code.startsWith('Arrow')) return;
    const btns = [...open.querySelectorAll('button:not([disabled]):not([hidden])')];
    if (!btns.length) return;
    const i = btns.indexOf(document.activeElement);
    if (e.code === 'ArrowDown' || e.code === 'ArrowRight') { btns[(i + 1) % btns.length].focus(); e.preventDefault(); }
    if (e.code === 'ArrowUp' || e.code === 'ArrowLeft') { btns[(i - 1 + btns.length) % btns.length].focus(); e.preventDefault(); }
  });
}

function menuInput() {
  // Handles the actions that drive menus from keyboard, gamepad and touch.
  const I = Input;
  if (G.state === 'play') {
    if (I.pressed.pause) openPause();
    else if (I.pressed.map) openMap();
  } else if (G.state === 'pause') {
    if (I.pressed.pause) resume();
    else if (I.pressed.map) openMap();
  } else if (G.state === 'map') {
    if (I.pressed.map || I.pressed.pause || I.pressed.jump || I.pressed.confirm) closeMap();
  } else if (G.state === 'banner') {
    if (I.pressed.jump || I.pressed.attack || I.pressed.confirm || I.pressed.pause) dismissBanner();
  } else if (G.state === 'rest') {
    if (I.pressed.pause) rise();
  }
  const open = document.querySelector('.screen:not([hidden]), .panel:not([hidden])');
  if (open && G.state !== 'banner') {
    // Gamepad: the d-pad moves focus, A presses the focused button.
    const btns = [...open.querySelectorAll('button:not([disabled]):not([hidden])')];
    if (btns.length && I.padMenu) {
      const i = btns.indexOf(document.activeElement);
      if (I.pressed.down) btns[(i + 1) % btns.length].focus();
      if (I.pressed.up) btns[(i - 1 + btns.length) % btns.length].focus();
      if (I.pressed.confirm && i >= 0) btns[i].click();
    }
  }
}

function checkOrientation() {
  const portrait = G.cssH > G.cssW * 1.1;
  $('rotate').hidden = !(portrait && Input.touchMode && !G.rotateDismissed && G.state === 'play');
}

// =====================================================================================
// Loop
// =====================================================================================
let last = performance.now(), acc = 0, perfAcc = 0, perfN = 0, perfSlow = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const c0 = performance.now();
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.1) dt = 0.1;
  if (dt <= 0) return;
  G.fps = damp(G.fps, 1 / dt, 3, dt);

  // Adaptive quality: step down if frames stay slow, never oscillate back up.
  if (G.state === 'play') {
    perfAcc += dt; perfN++;
    if (perfAcc > 2.5) {
      const avg = perfAcc / perfN;
      if (avg > 1 / 45) perfSlow++; else perfSlow = 0;
      if (perfSlow >= 2 && G.quality > 0 && !QS.has('quality')) { G.quality--; applyQuality(); resize(); perfSlow = 0; }
      perfAcc = 0; perfN = 0;
    }
  }

  Input.poll();
  menuInput();

  // Fade
  if (G.fade !== G.fadeTo || G.fadeCb) {
    G.fade = approach(G.fade, G.fadeTo, dt * G.fadeSpeed);
    if (G.fade === G.fadeTo && G.fadeCb) { const cb = G.fadeCb; G.fadeCb = null; cb(); }
  }
  if (G.flash > 0) G.flash = Math.max(0, G.flash - dt * 2.2);

  if (G.state === 'title' && G.room) {
    updateTitle(dt);
    Input.consume();
  } else if (G.state === 'play' && G.room) {
    if (G.slowT > 0) { G.slowT -= dt; if (G.slowT <= 0) G.slow = 1; }
    if (G.freeze > 0) { G.freeze -= dt; }
    else {
      acc += dt * G.slow;
      let steps = 0;
      const busyFade = G.fadeCb && G.fade > 0.6;
      while (acc >= STEP && steps < 10) {
        if (!busyFade) update(STEP); else { G.time += STEP; Particles.update(STEP); }
        if (steps === 0) Input.consume();
        acc -= STEP; steps++;
      }
      if (steps >= 10) acc = 0;
    }
  } else {
    Input.consume();
  }
  if (G.room) render();
  checkOrientation();
  G.cpu = damp(G.cpu || 0, performance.now() - c0, 4, dt);
}

function boot() {
  Art.init();
  const q = parseInt(QS.get('quality'), 10);
  G.quality = Number.isFinite(q) ? clamp(q, 0, 2) : (Math.min(innerWidth, innerHeight) < 500 && (navigator.hardwareConcurrency || 4) <= 4 ? 1 : 2);
  applyQuality();
  resize();
  Input.attach(canvas);
  canvas.addEventListener('pointerdown', () => { if (G.state === 'map') closeMap(); });
  wireUI();
  // Debug entry: ?room=longdrip&dash=1 jumps straight into a room.
  const roomQ = QS.get('room');
  if (roomQ && ROOMS[roomQ]) {
    G.save = freshSave();
    G.hasDash = QS.has('dash'); Input.hasDash = G.hasDash; G.save.hasDash = G.hasDash;
    G.maxHp = 5; G.hp = 5; G.tallow = parseInt(QS.get('tallow') || '0', 10); G.embers = parseInt(QS.get('embers') || '0', 10);
    G.player = new Player(0, 0);
    enterRoom(roomQ, (room, start) => {
      const sx = parseFloat(QS.get('x')), sy = parseFloat(QS.get('y'));
      if (Number.isFinite(sx) && Number.isFinite(sy)) { G.player.x = sx * T; G.player.y = sy * T; return; }
      const s = room.spawns.find((q2) => q2.c === 'S' || q2.c === '@');
      if (s) { const f = tileFoot(s.x, s.y); G.player.x = f.x - 9 - (s.c === 'S' ? 30 : 0); G.player.y = f.y - 30; return; }
      for (let y = room.h - 1; y > 0; y--) if (!room.solid(1, y) && room.solid(1, y + 1)) { G.player.x = T + 4; G.player.y = (y + 1) * T - 30; return; }
    });
    G.state = 'play'; G.fade = 0; G.fadeTo = 0;
    $('title').hidden = true; Input.enabled = true;
  } else {
    G.state = 'title';
    setupTitleScene();
    refreshTitle();
    $('title').hidden = false; Input.enabled = false;
  }
  requestAnimationFrame((t) => { last = t; requestAnimationFrame(frame); });
  window.__G = G;
}

if (document.fonts && document.fonts.ready) {
  let booted = false;
  const go = () => { if (!booted) { booted = true; boot(); } };
  document.fonts.ready.then(go);
  setTimeout(go, 1500);
} else boot();
