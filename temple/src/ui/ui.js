// Interface: segmented controls for time and season, viewpoint chips, toggles, building
// markers projected from 3D and the info card. Motion follows the project's rules: short
// ease-out transitions on opacity/transform only, nothing animates under reduced motion.
import * as THREE from 'three';

export const PLACES = {
  sanmon: { jp: '山門', name: 'Sanmon', en: 'Mountain gate', text: 'A two-storey gate of vermilion lacquer. Walking through its three openings, symbolically, is to pass through the three gates of liberation. A great red chōchin lantern bearing the temple crest hangs in the passage.', facts: ['Rōmon, two storeys', 'Mitesaki brackets above', 'Plaque: 霧峰山, the mountain name'] },
  hondo: { jp: '本堂', name: 'Hondō', en: 'Main hall', text: 'Seven bays by five under a sweeping hip-and-gable roof crowned with gilt shibi. The central bays stand open on the honzon, a gilt seated Buddha on a lotus throne before a flame-edged mandorla.', facts: ['Irimoya roof with gilt shibi', 'Karahafu canopy over the stair', 'Shōji glow after dark'] },
  pagoda: { jp: '五重塔', name: 'Gojū-no-tō', en: 'Five-storey pagoda', text: 'Five roofs, often read as earth, water, fire, wind and void, stepping in toward a bronze spire of nine rings and a water-flame. Each tier rests on three-stepped bracket sets under deep, upswept eaves.', facts: ['About 38 m to the jewel', 'Twenty wind bells', 'Chains and bells on the spire'] },
  shoro: { jp: '鐘楼', name: 'Shōrō', en: 'Bell tower', text: 'An open pavilion under a copper roof gone green, sheltering a bronze bonshō. On New Year’s Eve such bells are struck 108 times, once for each earthly desire. Click the bell to strike it.', facts: ['Bell: 2.35 m tall', 'Log striker on hemp ropes', 'Click to ring'] },
  temizuya: { jp: '手水舎', name: 'Temizuya', en: 'Purification pavilion', text: 'Before approaching the hall, visitors rinse the left hand, then the right, then the mouth, using bamboo ladles at the granite basin.', facts: ['Copper roof', 'Bamboo spout (kakei)'] },
  garden: { jp: '枯山水', name: 'Karesansui', en: 'Dry landscape garden', text: 'Raked white gravel stands for water: ripples ring each group of stones, then straighten into currents. The rake lines here are computed from the stones themselves.', facts: ['Four stone groupings', 'Moss islands', 'Yotsume-gaki bamboo fence'] },
  pond: { jp: '太鼓橋', name: 'Taiko-bashi', en: 'Drum bridge & koi pond', text: 'A steep vermilion drum bridge crosses the waist of the pond. Koi turn slow circles beneath a surface that mirrors the sky; a snow-viewing lantern stands on the island.', facts: ['Kohaku, sanke, ogon and showa koi', 'Yukimi-dōrō on the island'] },
  unkai: { jp: '雲海', name: 'Unkai', en: 'Sea of clouds', text: 'The temple stands above a sea of clouds. A long stone stair falls away from the gate and disappears into it, lit by lanterns after dark.', facts: ['Stair: ~250 steps', 'Volcano on the horizon'] },
};

export function createUI(api) {
  const $ = (s) => document.querySelector(s);
  const ui = {};

  const segmented = (root, items, current, onPick) => {
    root.innerHTML = '';
    const buttons = {};
    for (const [key, label] of items) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = label; b.dataset.key = key;
      b.setAttribute('aria-pressed', key === current ? 'true' : 'false');
      b.addEventListener('click', () => { set(key); onPick(key); });
      root.appendChild(b); buttons[key] = b;
    }
    const set = (key) => { for (const [k, b] of Object.entries(buttons)) b.setAttribute('aria-pressed', k === key ? 'true' : 'false'); };
    return { set };
  };

  ui.time = segmented($('#seg-time'), api.times, api.time, api.onTime);
  ui.season = segmented($('#seg-season'), api.seasons, api.season, api.onSeason);

  // viewpoints
  const views = $('#views');
  for (const [key, label] of api.views) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = label;
    b.addEventListener('click', () => api.onView(key));
    views.appendChild(b);
  }

  const toggle = (sel, initial, fn) => {
    const b = $(sel);
    b.setAttribute('aria-pressed', initial ? 'true' : 'false');
    b.addEventListener('click', () => {
      const on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      fn(on);
    });
    return { set: (on) => b.setAttribute('aria-pressed', on ? 'true' : 'false') };
  };
  ui.tour = toggle('#t-tour', false, api.onTour);
  ui.labels = toggle('#t-labels', true, (on) => { document.body.classList.toggle('no-labels', !on); });
  ui.sound = toggle('#t-sound', true, api.onSound);
  $('#b-bell').addEventListener('click', api.onBell);
  $('#b-export').addEventListener('click', async (e) => {
    const b = e.currentTarget;
    b.disabled = true;
    const old = b.textContent;
    b.textContent = 'Exporting…';
    try { await api.onExport(); } finally { b.disabled = false; b.textContent = old; }
  });

  // markers
  const layer = $('#markers');
  const markers = [];
  for (const [key, anchor] of api.anchors) {
    const p = PLACES[key];
    if (!p) continue;
    const m = document.createElement('button');
    m.type = 'button';
    m.className = 'marker';
    m.innerHTML = `<span class="dot"></span><span class="mk-label"><span class="jp">${p.jp}</span>${p.name}</span>`;
    m.addEventListener('click', () => { api.onView(key); ui.showInfo(key); });
    layer.appendChild(m);
    markers.push({ el: m, anchor, key });
  }
  const v = new THREE.Vector3();
  const ray = new THREE.Ray(), hit = new THREE.Vector3();
  // hide a marker when one of the big buildings stands between it and the camera
  const occluded = (camera, mk) => {
    const dist = camera.position.distanceTo(mk.anchor);
    ray.origin.copy(camera.position);
    ray.direction.copy(mk.anchor).sub(camera.position).normalize();
    for (const o of api.occluders || []) {
      if (o.key === mk.key) continue;
      if (ray.intersectBox(o.box, hit) && hit.distanceTo(camera.position) < dist - 1) return true;
    }
    return false;
  };
  ui.updateMarkers = (camera, w, h) => {
    // nearest first; a label that would overlap a nearer one gives way
    for (const mk of markers) mk.dist = camera.position.distanceTo(mk.anchor);
    const placed = [];
    for (const mk of [...markers].sort((a, b) => a.dist - b.dist)) {
      v.copy(mk.anchor).project(camera);
      let behind = v.z > 1 || occluded(camera, mk);
      const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
      const lw = mk.el.offsetWidth || 130, lh = 26;
      if (!behind) {
        for (const r of placed) if (x < r.x + r.w && x + lw > r.x && Math.abs(y - r.y) < lh) { behind = true; break; }
        if (!behind) placed.push({ x, y, w: lw });
      }
      const dist = mk.dist;
      const fade = behind ? 0 : Math.max(0, Math.min(1, (260 - dist) / 60)) * Math.max(0, Math.min(1, (dist - 9) / 8));
      mk.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      mk.el.style.opacity = fade.toFixed(2);
      mk.el.style.pointerEvents = fade > 0.3 ? 'auto' : 'none';
    }
  };

  // info card
  const card = $('#info');
  ui.showInfo = (key) => {
    const p = PLACES[key];
    if (!p) return;
    card.querySelector('.jp').textContent = p.jp;
    card.querySelector('h2').textContent = p.name;
    card.querySelector('.en').textContent = p.en;
    card.querySelector('.body').textContent = p.text;
    card.querySelector('ul').innerHTML = p.facts.map((f) => `<li>${f}</li>`).join('');
    card.classList.add('open');
    card.setAttribute('aria-hidden', 'false');
  };
  card.querySelector('.close').addEventListener('click', () => { card.classList.remove('open'); card.setAttribute('aria-hidden', 'true'); });

  ui.toast = (msg) => {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(ui._tt);
    ui._tt = setTimeout(() => t.classList.remove('show'), 2600);
  };
  return ui;
}
