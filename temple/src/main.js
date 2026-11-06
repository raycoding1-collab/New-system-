// Unkai-ji: a procedurally built Japanese mountain temple above a sea of clouds.
// Everything is generated at load time from code; no models or images are fetched.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { Builder, nextFrame, lerp, clamp, smoothstep } from './lib/util.js';
import { createPalette, setLampLevel } from './lib/materials.js';
import { G, patchMaterial } from './lib/patch.js';
import { groundDetailTextures } from './lib/textures.js';
import { LAYOUT } from './layout.js';
import { buildPagoda } from './build/pagoda.js';
import { buildHondo } from './build/hondo.js';
import { buildSanmon } from './build/sanmon.js';
import { buildShoro } from './build/shoro.js';
import { kasugaLantern, incenseBurner, temizuya } from './build/props.js';
import { buildTerrain, heightAt, stairLanternSpots } from './nature/terrain.js';
import { buildGarden, rockMaterial } from './nature/garden.js';
import { buildPond } from './nature/pond.js';
import { plantTrees, applySeason } from './nature/trees.js';
import { createSky } from './env/sky.js';
import { createClouds } from './env/clouds.js';
import { createWeather, createFireflies, createSmoke } from './env/particles.js';
import { TIMES, SEASONS, mixPreset, clonePreset } from './env/presets.js';
import { createPost } from './fx/post.js';
import { BellVoice } from './fx/bell.js';
import { createUI } from './ui/ui.js';
import { saveFile, hostDownloads, inManagedHost } from './lib/save.js';

const params = new URLSearchParams(location.search);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches || params.has('still');
const coarse = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 600;
// Everyone gets the full scene by default, the same one the gallery pictures were rendered
// from; medium and low exist only for people who ask for them in the URL.
const QUALITY = {
  high: { dpr: 2, start: 1.5, shadow: 4096, ao: true, msaa: 4, midTrees: 950, clouds: 12 },
  medium: { dpr: 1.5, start: 1.25, shadow: 2048, ao: false, msaa: 4, midTrees: 800, clouds: 10 },
  low: { dpr: 1.25, start: 1, shadow: 2048, ao: false, msaa: 2, midTrees: 520, clouds: 7 },
};
const qName = params.get('quality') || 'high';
void coarse;
const quality = QUALITY[qName] || QUALITY.high;

// ------------------------------------------------------------------ renderer
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: params.has('capture') });
renderer.setPixelRatio(Math.min(devicePixelRatio, quality.start));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.0001); // switches on the fog chunks; our patch does the real work
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.3, 20000);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxPolarAngle = Math.PI * 0.62; // allow looking up at the pagoda; the ground clamp keeps us above the terrain
controls.minDistance = 2.5;
controls.maxDistance = 520;
controls.zoomSpeed = 0.9;
controls.rotateSpeed = 0.55;
controls.panSpeed = 0.7;
controls.screenSpacePanning = false;

const VIEWS = {
  overview: { pos: [94, 74, -84], target: [-8, -2, 24], label: 'Overview' },
  front: { pos: [52, 30, 138], target: [-6, 9, 4], label: 'Front' },
  approach: { pos: [3, -17.5, 104], target: [0, 6, 40], label: 'The stair' },
  gate: { pos: [10, 3.5, 66], target: [0, 8, 40], label: 'Gate' },
  pagoda: { pos: [-37, 1.9, 35], target: [-29, 17, 8], fov: 60, label: 'Pagoda' },
  hondo: { pos: [8, 4.2, 15], target: [0, 6.5, -16], label: 'Main hall' },
  garden: { pos: [-15.2, 3.8, -21.5], target: [-34, -1, -31], label: 'Garden' },
  pond: { pos: [21.5, 2.6, 5.5], target: [35, 1.2, -13], label: 'Pond' },
  shoro: { pos: [17, 4.5, 34], target: [26, 4.2, 24], label: 'Bell' },
  temizuya: { pos: [-5, 3, 37], target: [-11, 1.5, 30], label: 'Temizuya' },
  unkai: { pos: [-60, 22, 120], target: [40, -20, -120], label: 'Clouds' },
};

// ------------------------------------------------------------------ loader
const loaderText = document.getElementById('loader-step');
const loaderBar = document.getElementById('loader-bar');
let stepN = 0;
const STEPS = 13;
async function step(msg) {
  stepN++;
  loaderText.textContent = msg;
  loaderBar.style.transform = `scaleX(${(stepN / STEPS).toFixed(3)})`;
  await nextFrame(); await nextFrame();
}

// ------------------------------------------------------------------ world
const world = {};

async function build() {
  await step('Mixing lacquer, plaster and bronze');
  const P = createPalette();
  P.rock = rockMaterial(P);
  const det = groundDetailTextures(256);
  P.moss = patchMaterial(new THREE.MeshStandardMaterial({ name: 'moss', color: '#5d7c2f', map: det.map, roughness: 1 }), { snow: 1.2 });
  world.P = P;
  const B = new Builder();

  await step('Raising the five-storey pagoda');
  const pagoda = buildPagoda(B, ...LAYOUT.pagoda);
  await step('Framing the main hall');
  const hondo = buildHondo(B, ...LAYOUT.hondo);
  await step('Lacquering the mountain gate');
  const sanmon = buildSanmon(B, ...LAYOUT.sanmon);
  await step('Hanging the bronze bell');
  const shoro = buildShoro(B, ...LAYOUT.shoro, P);
  const tz = temizuya(B, LAYOUT.temizuya[0], 0, LAYOUT.temizuya[1], 0);
  const incense = incenseBurner(B, LAYOUT.incense[0], 0.06, LAYOUT.incense[1]);

  // lanterns: pairs along the approach, at the hall, the pagoda and the bell tower
  const lanternSpots = [];
  for (const z of [33, 26, 19, 12]) for (const sx of [-1, 1]) lanternSpots.push([sx * 4.4, z, 0]);
  for (const sx of [-1, 1]) lanternSpots.push([sx * 6.5, -3, 0], [sx * 5.2, 50.5, 0]);
  lanternSpots.push([-20.2, 4.6, Math.PI / 2], [-20.2, 11.4, Math.PI / 2], [23.4, 31.5, 0], [-15, -14, 0]);
  for (const [x, z, r] of lanternSpots) kasugaLantern(B, x, 0.05, z, r, 1, Math.abs(z) > 45 || x < -14 ? 'stoneMoss' : 'stone');
  for (const p of stairLanternSpots()) kasugaLantern(B, p.x, p.y, p.z, 0, 0.72, 'stoneMoss');

  await step('Cutting the terrace and the stair into the clouds');
  const terrain = buildTerrain(B);
  scene.add(terrain.group);
  await step('Raking the dry garden');
  const garden = buildGarden(B);
  scene.add(garden.gravel);
  await step('Filling the koi pond');
  const pond = buildPond(B, P, renderer);
  scene.add(pond.group);

  await step('Merging timber, tile and stone');
  const built = B.build(P, { name: 'temple' });
  scene.add(built);
  scene.add(shoro.extra);

  await step('Growing maples, pines, cedars and bamboo');
  const trees = plantTrees(heightAt, P, { midCount: quality.midTrees });
  scene.add(trees.group);

  await step('Painting the sky and the sea of clouds');
  const sky = createSky();
  scene.add(sky.mesh);
  const clouds = createClouds({ layers: quality.clouds });
  scene.add(clouds.group);
  const weather = createWeather();
  scene.add(weather.mesh);
  const fireflies = createFireflies();
  scene.add(fireflies.points);
  const smoke = createSmoke(incense);
  scene.add(smoke.group);

  // lights
  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality.shadow, quality.shadow);
  Object.assign(sun.shadow.camera, { left: -88, right: 88, top: 88, bottom: -88, near: 1, far: 420 });
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.045;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  scene.add(hemi);
  const lamps = [];
  const addLamp = (pos, color, intensity, distance) => {
    const l = new THREE.PointLight(color, 0, distance, 2);
    l.position.copy(pos);
    l.userData.base = intensity;
    scene.add(l);
    lamps.push(l);
  };
  const interior = hondo.lights.find((l) => l.kind === 'interior');
  addLamp(interior.pos, '#ffb062', 70, 22);
  addLamp(sanmon.lights[0].pos, '#ff7a3c', 26, 14);
  for (const l of hondo.lights.filter((l) => l.kind === 'lantern').filter((_, i) => i === 1 || i === 2)) addLamp(l.pos, '#ffb565', 14, 11);
  addLamp(new THREE.Vector3(0, 2.2, 22.5), '#ffb565', 18, 16);
  addLamp(new THREE.Vector3(0, 2.2, 8), '#ffb565', 16, 14);
  addLamp(pond.lights[0].pos, '#ffb565', 10, 10);
  addLamp(new THREE.Vector3(0, -2, 60), '#ffb565', 24, 22);

  Object.assign(world, { pagoda, hondo, sanmon, shoro, tz, terrain, garden, pond, built, trees, sky, clouds, weather, fireflies, smoke, sun, hemi, lamps, incense });

  // The pond mirror re-renders the scene: give it only what can show up in the water.
  const REFLECT = 1;
  const skipInMirror = new Set(['cedars-mid', 'cedar-trunks-mid', 'forest', 'ground-far', 'weather', 'fireflies', 'incense-smoke', 'koi', 'karesansui', 'water']);
  const markReflect = (o) => {
    if (skipInMirror.has(o.name) || o.isSprite) return;
    o.layers.enable(REFLECT);
    for (const c of o.children) markReflect(c);
  };
  markReflect(scene);
  pond.water.getReflectionCamera(camera).layers.set(REFLECT);

  await step('Letting the snow know where the roofs are');
  renderSnowMap();
  // objects that must not darken the ambient occlusion
  const hide = [];
  scene.traverse((o) => { if (o.userData.noAO) hide.push(o); });
  world.noAO = hide;
}

// A top-down height capture: snow only settles where nothing stands above.
function renderSnowMap() {
  const size = 1024, half = 80;
  const rt = new THREE.WebGLRenderTarget(size, size, { type: THREE.HalfFloatType, depthBuffer: true });
  const cam = new THREE.OrthographicCamera(-half, half, half, -half, 1, 600);
  cam.position.set(0, 300, 0);
  cam.up.set(0, 0, -1);
  cam.lookAt(0, 0, 0);
  const mat = new THREE.ShaderMaterial({
    vertexShader: 'varying float vY; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vY = w.y; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: 'varying float vY; void main(){ gl_FragColor = vec4(vY + 100.0, 0.0, 0.0, 1.0); }', // offset keeps half-float precision and lets 0 mean empty
    side: THREE.DoubleSide,
  });
  const hidden = [];
  scene.traverse((o) => { if ((o.isInstancedMesh || o.isSprite || o.isPoints || o.userData.noExport || o.userData.noAO || o.name.startsWith('foliage:') || o.name === 'ground-far') && o.visible) { hidden.push(o); o.visible = false; } });
  const prevFog = scene.fog;
  scene.fog = null;
  scene.overrideMaterial = mat;
  renderer.setRenderTarget(rt);
  renderer.setClearColor(0x000000, 1);
  renderer.clear();
  renderer.render(scene, cam);
  renderer.setRenderTarget(null);
  scene.overrideMaterial = null;
  scene.fog = prevFog;
  for (const o of hidden) o.visible = true;
  G.uSnowMap.value = rt.texture;
  // camera up = -z: texture v runs from +z (bottom) to -z (top)
  G.uSnowBounds.value.set(-half, half, half * 2, -half * 2);
}

// ------------------------------------------------------------------ atmosphere state
const state = { time: params.get('time') || 'dusk', season: params.get('season') || 'autumn' };
if (!TIMES[state.time]) state.time = 'dusk';
if (!SEASONS[state.season]) state.season = 'autumn';
let cur = clonePreset(TIMES[state.time]);
let from = null, to = null, mixT = 1;
const mixed = {};
let pmrem, envRT = null;

function applyAtmosphere(a, updateEnv) {
  const { sky, clouds, sun, hemi, lamps, P } = world;
  G.uSunDir.value.copy(a.sunDir);
  const su = sky.uniforms;
  su.uZenith.value.copy(a.zenith); su.uHorizon.value.copy(a.horizon); su.uGlow.value.copy(a.glow);
  su.uSunColor.value.copy(a.skySun); su.uStars.value = a.stars; su.uMoon.value = a.moon; su.uSunDisc.value = a.disc;
  su.uMoonDir.value.copy(a.sunDir);
  G.uFogColor.value.copy(a.fog); G.uFogSunColor.value.copy(a.fogSun);
  G.uFogDensity.value = a.fogDensity; G.uFogFalloff.value = a.fogFalloff; G.uHaze.value = a.haze; G.uFogBase.value = -18;
  clouds.shared.uLit.value.copy(a.cloudLit); clouds.shared.uShade.value.copy(a.cloudShade); clouds.shared.uCover.value = a.cloudCover;
  clouds.wispMat.color.copy(a.cloudLit);
  for (const w of clouds.wisps) w.material.color.copy(a.cloudLit).lerp(a.fog, 0.4);
  sun.color.copy(a.sunColor);
  sun.intensity = a.sunI * smoothstep(-0.02, 0.08, a.sunDir.y);
  sun.position.copy(a.sunDir).multiplyScalar(220);
  sun.target.position.set(0, 0, 0);
  hemi.color.copy(a.hemiSky); hemi.groundColor.copy(a.hemiGround); hemi.intensity = a.hemiI * 0.6;
  renderer.toneMappingExposure = a.exposure * (1 - 0.18 * G.uSnow.value);
  setLampLevel(P, a.lamps);
  for (const l of lamps) l.intensity = l.userData.base * a.lamps;
  if (post) post.bloom.strength = a.bloom;
  sky.floorMat.color.copy(a.floor);
  const wu = world.weather.uniforms;
  wu.uLight.value.copy(a.sunColor).multiplyScalar(a.sunI * 0.32);
  wu.uAmbient.value.copy(a.hemiSky).multiplyScalar(a.hemiI * 0.45);
  world.fireflies.uniforms.uAmount.value = SEASONS[state.season].fireflies * a.lamps;
  renderer.shadowMap.needsUpdate = true;
  if (updateEnv) {
    if (envRT) envRT.dispose();
    envRT = pmrem.fromScene(sky.envScene, 0.03);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.55 + a.hemiI * 0.35;
  }
}

function setTime(name, instant = false) {
  if (!TIMES[name]) return;
  state.time = name;
  if (instant || reducedMotion) { cur = clonePreset(TIMES[name]); applyAtmosphere(cur, true); mixT = 1; return; }
  from = clonePreset(cur); to = TIMES[name]; mixT = 0; envMid = false;
}
let envMid = false;

function setSeason(name) {
  if (!SEASONS[name]) return;
  state.season = name;
  const S = SEASONS[name];
  applySeason(world.trees, name);
  world.weather.setMode(S.weather, reducedMotion);
  G.uSnow.value = S.snow;
  G.uWind.value = S.wind;
  renderer.toneMappingExposure = cur.exposure * (1 - 0.18 * S.snow);
  world.fireflies.uniforms.uAmount.value = S.fireflies * cur.lamps;
  renderer.shadowMap.needsUpdate = true;
}

// ------------------------------------------------------------------ camera moves
let fly = null;
function flyTo(key, dur = 3.2) {
  const v = VIEWS[key];
  if (!v) return;
  const p1 = new THREE.Vector3(...v.pos), t1 = new THREE.Vector3(...v.target);
  if (reducedMotion) { camera.position.copy(p1); controls.target.copy(t1); camera.fov = v.fov || 38; camera.updateProjectionMatrix(); controls.update(); return; }
  const p0 = camera.position.clone(), t0 = controls.target.clone();
  const lift = Math.min(40, p0.distanceTo(p1) * 0.25);
  const mid = p0.clone().lerp(p1, 0.5); mid.y += lift;
  fly = { p0, p1, t0, t1, mid, t: 0, dur, f0: camera.fov, f1: v.fov || 38 };
}
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function updateFly(dt) {
  if (!fly) return;
  fly.t = Math.min(1, fly.t + dt / fly.dur);
  const e = ease(fly.t);
  const a = fly.p0.clone().lerp(fly.mid, e), b = fly.mid.clone().lerp(fly.p1, e);
  camera.position.copy(a.lerp(b, e));
  controls.target.copy(fly.t0).lerp(fly.t1, e);
  camera.fov = fly.f0 + (fly.f1 - fly.f0) * e;
  camera.updateProjectionMatrix();
  if (fly.t >= 1) fly = null;
}

let tour = null;
const TOUR = ['overview', 'front', 'gate', 'pagoda', 'hondo', 'garden', 'pond', 'shoro', 'approach'];
function startTour(on) {
  if (!on) { tour = null; return; }
  tour = { i: 0, t: 0 };
  flyTo(TOUR[0], 3.5);
}
function updateTour(dt) {
  if (!tour) return;
  tour.t += dt;
  if (!fly) controls.autoRotate = true; else controls.autoRotate = false;
  if (tour.t > 10) {
    tour.t = 0; tour.i = (tour.i + 1) % TOUR.length;
    flyTo(TOUR[tour.i], 4.2);
  }
}

// ------------------------------------------------------------------ the bell
const voice = new BellVoice();
let strike = null;
function ringBell() {
  if (strike && strike.t < 2.2) return;
  strike = { t: 0, hit: false };
}
function updateBell(dt) {
  const b = world.shoro.bell;
  if (!strike) return;
  strike.t += dt;
  const t = strike.t;
  let th;
  if (t < 0.7) th = 0.42 * (1 - Math.pow(1 - t / 0.7, 3));
  else if (t < 0.98) { const k = (t - 0.7) / 0.28; th = 0.42 - 0.47 * k * k; }
  else {
    if (!strike.hit) { strike.hit = true; voice.strike(1); strike.hitAt = t; }
    const k = t - 0.98;
    th = -0.05 + 0.2 * Math.exp(-k * 1.6) * Math.sin(k * 3.4);
  }
  b.pivot.rotation.z = th;
  if (strike.hit) {
    const k = t - strike.hitAt;
    b.bell.rotation.z = 0.014 * Math.exp(-k * 0.7) * Math.sin(k * 4.2);
    b.bell.rotation.x = 0.004 * Math.exp(-k * 0.7) * Math.sin(k * 3.1);
  }
  if (t > 9) { strike = null; b.pivot.rotation.z = 0; b.bell.rotation.set(0, 0, 0); }
}

// ------------------------------------------------------------------ export
async function exportGLB() {
  const exporter = new GLTFExporter();
  const hidden = [];
  scene.traverse((o) => { if (o.userData.noExport && o.visible) { hidden.push(o); o.visible = false; } });
  // a plain stand-in for the reflective water
  const waterProxy = new THREE.Mesh(new THREE.PlaneGeometry(LAYOUT.pond.w, LAYOUT.pond.d).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ name: 'pond-water', color: '#24474b', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.8 }));
  waterProxy.position.copy(world.pond.water.position);
  const root = new THREE.Group();
  root.name = 'Unkai-ji';
  const parts = [world.built, world.terrain.group, world.garden.gravel, world.trees.group, world.shoro.extra, world.pond.koi.group];
  const parents = parts.map((p) => p.parent);
  for (const p of parts) root.add(p);
  root.add(waterProxy);
  try {
    const glb = await exporter.parseAsync(root, { binary: true, onlyVisible: true, maxTextureSize: 1024 });
    // put the scene back before the (possibly long) save prompt
    parts.forEach((p, i) => parents[i].add(p));
    for (const o of hidden) o.visible = true;
    parts.length = 0; hidden.length = 0;
    const blob = new Blob([glb], { type: 'model/gltf-binary' });
    world.lastExportSize = blob.size;
    const res = await saveFile(blob, 'unkai-ji-temple.glb');
    ui.toast(res.status === 'delivered' ? `Sent ${res.name}` : `Saved ${res.name} (${(res.size / 1048576).toFixed(1)} MB)`);
  } catch (e) {
    const code = e && e.code;
    if (code === 'declined') ui.toast('Download cancelled');
    else if (code === 'rate_limited') ui.toast('A download prompt is already open');
    else if (code === 'extension_not_enabled' || code === 'rejected_extension') ui.toast('This viewer does not allow .zip downloads here');
    else if (code === 'too_large') ui.toast('The model is too large for this destination');
    else if (code) { ui.toast('Downloads are not available in this view'); document.getElementById('b-export').hidden = true; }
    else { console.error(e); ui.toast('Export failed — see console'); }
  } finally {
    parts.forEach((p, i) => parents[i].add(p));
    for (const o of hidden) o.visible = true;
  }
}

// ------------------------------------------------------------------ boot
let post = null, ui = null;
const timer = new THREE.Timer();
let frameId = 0;
const pondProbe = new THREE.Vector3();

async function main() {
  pmrem = new THREE.PMREMGenerator(renderer);
  const t0 = performance.now();
  await build();
  console.log(`built in ${Math.round(performance.now() - t0)} ms`);
  await step('Warming up the shaders');
  try {
    if (renderer.extensions.has('KHR_parallel_shader_compile')) await renderer.compileAsync(scene, camera);
    else renderer.compile(scene, camera);
  } catch (e) { /* compiled lazily instead */ }
  post = createPost(renderer, scene, camera, quality);
  post.setHidden(world.noAO);
  applyAtmosphere(cur, true);
  setSeason(state.season);

  const hashView = location.hash.slice(1);
  const start = VIEWS[hashView] ? hashView : params.get('view');
  const v = VIEWS[start] || VIEWS.overview;
  if (!start && !reducedMotion && !params.has('capture')) {
    camera.position.set(...VIEWS.approach.pos);
    controls.target.set(...VIEWS.approach.target);
    controls.update();
    setTimeout(() => flyTo('overview', 7.5), 900);
  } else {
    camera.position.set(...v.pos);
    controls.target.set(...v.target);
    camera.fov = v.fov || 38;
    camera.updateProjectionMatrix();
    controls.update();
  }

  ui = createUI({
    times: Object.entries(TIMES).map(([k, p]) => [k, p.label]), time: state.time,
    seasons: Object.entries(SEASONS).map(([k, p]) => [k, p.label]), season: state.season,
    views: ['overview', 'front', 'approach', 'gate', 'pagoda', 'hondo', 'garden', 'pond', 'shoro'].map((k) => [k, VIEWS[k].label]),
    anchors: [
      ['sanmon', new THREE.Vector3(LAYOUT.sanmon[0], 22, LAYOUT.sanmon[1])],
      ['hondo', new THREE.Vector3(LAYOUT.hondo[0], 24, LAYOUT.hondo[1])],
      ['pagoda', new THREE.Vector3(LAYOUT.pagoda[0], 40, LAYOUT.pagoda[1])],
      ['shoro', new THREE.Vector3(LAYOUT.shoro[0], 13, LAYOUT.shoro[1])],
      ['temizuya', new THREE.Vector3(LAYOUT.temizuya[0], 5.5, LAYOUT.temizuya[1])],
      ['garden', new THREE.Vector3(-33, 3.5, -31)],
      ['pond', new THREE.Vector3(LAYOUT.bridge.cx, 5.5, LAYOUT.bridge.cz)],
      ['unkai', new THREE.Vector3(0, -12, 96)],
    ],
    occluders: [
      { key: 'pagoda', box: new THREE.Box3(new THREE.Vector3(-35.3, 0, 1.7), new THREE.Vector3(-22.7, 24, 14.3)) },
      { key: 'hondo', box: new THREE.Box3(new THREE.Vector3(-14.3, 0, -31), new THREE.Vector3(14.3, 17, -9)) },
      { key: 'sanmon', box: new THREE.Box3(new THREE.Vector3(-9.6, 0, 35.8), new THREE.Vector3(9.6, 17, 48.2)) },
      { key: 'shoro', box: new THREE.Box3(new THREE.Vector3(21.3, 0, 19.3), new THREE.Vector3(30.7, 9, 28.7)) },
    ],
    onTime: (k) => setTime(k), onSeason: (k) => setSeason(k),
    onView: (k) => {
      tour = null; ui.tour.set(false); controls.autoRotate = false;
      const key = k === 'unkai' ? 'approach' : k;
      // viewpoints are linkable: #pagoda, #garden ... (hash only; hosts may drop query strings)
      if (location.hash.slice(1) !== key) location.hash = key; else flyTo(key);
    },
    onTour: (on) => startTour(on), onSound: (on) => { voice.enabled = on; },
    onBell: () => { ringBell(); },
    onExport: exportGLB,
  });

  // click the bell or its striker to ring it
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down = null;
  canvas.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; fly = null; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (ray.intersectObject(world.shoro.extra, true).length) ringBell();
  });
  canvas.addEventListener('pointermove', (e) => {
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    canvas.style.cursor = ray.intersectObject(world.shoro.extra, true).length ? 'pointer' : '';
  });
  controls.addEventListener('start', () => { fly = null; if (tour) { tour = null; ui.tour.set(false); controls.autoRotate = false; } });
  addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input,textarea')) return;
    const keys = Object.keys(TIMES), seasons = Object.keys(SEASONS);
    if (e.key === 't') { const n = keys[(keys.indexOf(state.time) + 1) % keys.length]; setTime(n); ui.time.set(n); }
    if (e.key === 's') { const n = seasons[(seasons.indexOf(state.season) + 1) % seasons.length]; setSeason(n); ui.season.set(n); }
    if (e.key === 'b') ringBell();
  });
  addEventListener('resize', onResize);
  addEventListener('hashchange', () => { const k = location.hash.slice(1); if (VIEWS[k]) { tour = null; ui.tour.set(false); flyTo(k); } });
  // inside a host that manages downloads, hide Export if this view cannot save files
  hostDownloads().then((ns) => { if (!ns && inManagedHost()) document.getElementById('b-export').hidden = true; });

  if (params.has('capture')) document.body.classList.add('capture');
  if (params.has('clean')) document.body.classList.add('clean');
  document.body.classList.add('ready');
  window.DONE = false;
  renderer.setAnimationLoop(frame);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  const s = renderer.getDrawingBufferSize(new THREE.Vector2());
  post.setSize(innerWidth, innerHeight);
  void s;
}

// Dynamic resolution: watch the median frame time and nudge the pixel ratio so the scene
// stays fluid. It only moves between 1x (the density the gallery pictures were rendered at)
// and the screen's full sharpness, and never touches the effects, so the look never changes.
// An explicit ?quality= in the URL pins the setting.
const drs = {
  on: !params.has('quality') && !params.has('capture'),
  dpr: Math.min(devicePixelRatio, quality.start), max: Math.min(devicePixelRatio, quality.dpr), min: Math.min(1, devicePixelRatio),
  samples: [], skip: 90, last: 0, lastDown: -1e9,
};
function setDpr(v) {
  drs.dpr = v;
  renderer.setPixelRatio(v);
  post.composer.setPixelRatio(v);
  onResize();
}
function adapt(dt) {
  if (!drs.on || document.hidden) return;
  if (drs.skip > 0) { drs.skip--; return; }        // shader warm-up and the first frames
  if (mixT < 1) return;                             // environment re-captures during a change of hour
  drs.samples.push(dt);
  if (drs.samples.length < 48) return;
  const sorted = drs.samples.sort((a, b) => a - b);
  const median = sorted[24], slow = sorted[40];
  drs.samples = [];
  const now = performance.now();
  if (now - drs.last < 1200) return;
  if (median > 0.0235 || slow > 0.04) {             // below ~42 fps, or stuttering
    drs.last = drs.lastDown = now;
    if (drs.dpr > drs.min + 0.01) setDpr(Math.max(drs.min, +(drs.dpr * 0.84).toFixed(3)));
  } else if (median < 0.0175 && slow < 0.022 && drs.dpr < drs.max - 0.01 && now - drs.lastDown > 20000) {
    drs.last = now;
    setDpr(Math.min(drs.max, +(drs.dpr * 1.12).toFixed(3)));
  }
}

function frame() {
  timer.update();
  const dt = clockOverride || Math.min(timer.getDelta(), 0.1);
  G.uTime.value += reducedMotion ? dt * 0.25 : dt;
  const time = G.uTime.value;
  adapt(dt);
  // time-of-day transition
  if (mixT < 1) {
    mixT = Math.min(1, mixT + dt / 2.4);
    const e = ease(mixT);
    mixPreset(from, to, e, mixed);
    cur = clonePreset(mixed);
    const needEnv = mixT >= 1 || (!envMid && mixT > 0.5);
    if (mixT > 0.5) envMid = true;
    applyAtmosphere(cur, needEnv);
  }
  updateFly(dt);
  updateTour(dt);
  controls.update();
  // keep the camera above the ground
  const gy = heightAt(camera.position.x, camera.position.z) + 1.0;
  if (camera.position.y < gy) camera.position.y = gy;
  world.pond.koi.update(time);
  world.clouds.update(time);
  world.smoke.update(dt, time, G.uWind.value);
  world.weather.uniforms.uCam.value.copy(camera.position);
  updateBell(dt);
  // a pond that is small on screen refreshes its mirror every other frame
  const pv = pondProbe.copy(world.pond.water.position).project(camera);
  const pondPx = pv.z < 1 ? (LAYOUT.pond.w * 0.5 / Math.max(1, camera.position.distanceTo(world.pond.water.position))) * innerHeight / (2 * Math.tan(camera.fov * Math.PI / 360)) : 0;
  world.pond.water.userData.skip = pondPx < innerHeight * 0.18 && (frameId & 1) === 1;
  world.pond.water.userData.frame = frameId++;
  post.final.uniforms.uTime.value = time;
  post.composer.render(dt);
  ui.updateMarkers(camera, innerWidth, innerHeight);
  if (frameId === 3) window.DONE = true;
  // capture mode (used for automated screenshots): render a few frames, then hold still
  if (params.has('capture') && frameId >= (+params.get('frames') || 3)) renderer.setAnimationLoop(null);
}

// advance the scene by hand (capture mode)
async function renderFrames(n = 3, dtFixed = 1 / 30) {
  for (let i = 0; i < n; i++) { clockOverride = dtFixed; frame(); await nextFrame(); }
  clockOverride = 0;
}
let clockOverride = 0;

main().catch((e) => {
  console.error(e);
  loaderText.textContent = 'Something went wrong while building the temple. See the console for details.';
});

window.TEMPLE = { setTime, setSeason, flyTo, ringBell, VIEWS, world, camera, controls, exportGLB, state, renderFrames, scene, renderer };
void lerp; void clamp;
