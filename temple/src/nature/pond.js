// The koi pond: a mirror of the sky and the vermilion bridge, rippling slightly, clear
// enough near your feet to see the koi beneath, with granite boulders along the banks,
// an island with a pine and a snow-viewing lantern.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { Rng, mat, latheGeo } from '../lib/util.js';
import { G, NOISE_GLSL, FOG_GLSL } from '../lib/patch.js';
import { koiTexture } from '../lib/textures.js';
import { pondSDF, islandSDF, WATER_Y } from './terrain.js';
import { rockGeo } from './garden.js';
import { drumBridge, yukimiLantern } from '../build/props.js';
import { LAYOUT } from '../layout.js';

const WaterShader = {
  name: 'TempleWater',
  uniforms: {
    color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null },
    uDeep: { value: new THREE.Color('#132a2c') }, uOpacity: { value: 0.62 },
  },
  vertexShader: /* glsl */`
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    varying vec3 vWPos;
    void main() {
      vUv = textureMatrix * vec4(position, 1.0);
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWPos = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform vec3 color;
    uniform vec3 uDeep;
    uniform float uOpacity;
    uniform float uTime;
    varying vec4 vUv;
    varying vec3 vWPos;
    ${NOISE_GLSL}
    ${FOG_GLSL}
    void main() {
      vec2 p = vWPos.xz;
      float n1 = tNoise(p * 1.4 + vec2(uTime * 0.22, uTime * 0.15));
      float n2 = tNoise(p * 3.1 - vec2(uTime * 0.27, -uTime * 0.2));
      float n3 = tNoise(p * 0.35 + uTime * 0.05);
      vec2 d = (vec2(n1 + n3 * 0.5, n2 + n3 * 0.5) - 0.75) * 0.022;
      vec4 uv = vUv; uv.xy += d * uv.w;
      vec3 refl = texture2DProj(tDiffuse, uv).rgb;
      vec3 V = normalize(cameraPosition - vWPos);
      float fres = 0.06 + 0.94 * pow(1.0 - clamp(V.y, 0.0, 1.0), 4.0);
      vec3 col = mix(uDeep * (0.85 + n1 * 0.3), refl * color, clamp(fres + 0.5, 0.0, 1.0));
      // sun glints
      vec3 H = normalize(V + uSunDir);
      vec3 N = normalize(vec3(d.x * 6.0, 1.0, d.y * 6.0));
      col += uFogSunColor * pow(max(dot(N, H), 0.0), 420.0) * 3.0 * step(0.0, uSunDir.y);
      float a = mix(uOpacity, 1.0, fres);
      gl_FragColor = vec4(tApplyFog(col, vWPos), a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};

export function buildPond(B, P, renderer) {
  const PL = LAYOUT.pond;
  const group = new THREE.Group();
  group.name = 'pond';
  const pr = Math.min(renderer.getPixelRatio(), 1.5);
  const water = new Reflector(new THREE.PlaneGeometry(PL.w, PL.d), {
    shader: WaterShader, textureWidth: Math.round(innerWidth * pr * 0.5), textureHeight: Math.round(innerHeight * pr * 0.5),
    color: 0xc8d6d8, clipBias: 0.003, multisample: 2,
  });
  water.rotation.x = -Math.PI / 2;
  water.position.set(PL.cx, WATER_Y, PL.cz);
  const u = water.material.uniforms;
  for (const k of ['uTime', 'uSunDir', 'uFogColor', 'uFogSunColor', 'uFogDensity', 'uFogFalloff', 'uFogBase', 'uHaze', 'uFogMax']) u[k] = G[k];
  water.material.transparent = true;
  water.material.depthWrite = false;
  water.renderOrder = 2;
  water.name = 'water';
  water.userData.noAO = true;
  water.userData.noExport = true;
  // render the reflection at most once per frame, even with several passes
  const orig = water.onBeforeRender;
  let last = -1;
  water.onBeforeRender = function (r, s, c, ...rest) {
    if (water.userData.frame === last || water.userData.skip) return;
    last = water.userData.frame;
    orig.call(this, r, s, c, ...rest);
  };
  group.add(water);

  // bank boulders: walk the shoreline and seat rocks along it
  const rng = new Rng(55);
  const bank = [];
  for (let x = PL.cx - PL.w / 2; x < PL.cx + PL.w / 2; x += 0.5) {
    for (let z = PL.cz - PL.d / 2; z < PL.cz + PL.d / 2; z += 0.5) {
      const d = pondSDF(x, z);
      if (Math.abs(d) < 0.25 && rng.f() < 0.11) bank.push([x, z]);
      const id = islandSDF(x, z);
      if (Math.abs(id) < 0.2 && rng.f() < 0.2) bank.push([x, z]);
    }
  }
  const bridge = LAYOUT.bridge;
  for (const [x, z] of bank) {
    // keep the bridge footings clear
    const lx = (x - bridge.cx) * Math.cos(bridge.ry) - (z - bridge.cz) * Math.sin(bridge.ry);
    const lz = (x - bridge.cx) * Math.sin(bridge.ry) + (z - bridge.cz) * Math.cos(bridge.ry);
    if (Math.abs(lz) < 2.2 && Math.abs(lx) < bridge.L / 2 + 1.5) continue;
    const s = rng.range(0.35, 0.95);
    B.push('rock', rockGeo(rng, s * rng.range(0.9, 1.4), s * rng.range(0.45, 0.8), s, 0.5), mat(x, WATER_Y + s * 0.15, z, rng.f() * 6));
  }
  // the drum bridge across the waist
  B.with(mat(bridge.cx, 0, bridge.cz, bridge.ry), () => drumBridge(B, 0, 0.05, 0, bridge.L, 2.6, 2.45));
  // the island's lantern
  const I = LAYOUT.island;
  const glow = yukimiLantern(B, I.x - 0.9, 0.45, I.z + 0.6, 0.4, 1.1);

  // koi
  const koi = makeKoi(P, rng);
  group.add(koi.group);
  return { group, water, koi, lights: [{ pos: glow, kind: 'yukimi' }] };
}

function makeKoi(P, rng) {
  const group = new THREE.Group();
  group.name = 'koi';
  const tex = koiTexture();
  const fish = [];
  const body = (variety) => {
    const g = latheGeo([[0.001, 0], [0.035, 0.02], [0.07, 0.07], [0.09, 0.16], [0.085, 0.26], [0.065, 0.36], [0.04, 0.44], [0.022, 0.5], [0.001, 0.52]], 14);
    g.rotateZ(-Math.PI / 2); // axis along +x; head at +x
    g.translate(-0.26, 0, 0);
    g.scale(1, 0.85, 0.72);
    const uv = g.attributes.uv;
    const qx = (variety % 2) * 0.5, qy = Math.floor(variety / 2) * 0.5;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, qx + (uv.getX(i) % 1) * 0.5, qy + uv.getY(i) * 0.25 + 0.12);
    // tail fin
    const tail = new THREE.Shape();
    tail.moveTo(0, 0); tail.bezierCurveTo(-0.12, 0.1, -0.2, 0.12, -0.22, 0.09); tail.lineTo(-0.15, 0); tail.lineTo(-0.22, -0.09); tail.bezierCurveTo(-0.2, -0.12, -0.12, -0.1, 0, 0);
    const tg = new THREE.ShapeGeometry(tail);
    tg.rotateX(Math.PI / 2); // lay the fin flat so it reads from above
    tg.translate(-0.25, 0, 0);
    const tuv = tg.attributes.uv;
    for (let i = 0; i < tuv.count; i++) tuv.setXY(i, qx + 0.1, qy + 0.1);
    return [g, tg];
  };
  for (let i = 0; i < 11; i++) {
    const variety = i % 4;
    const material = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35, side: THREE.DoubleSide });
    const uniforms = { uTime: G.uTime, uPhase: { value: rng.f() * 10 } };
    material.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uniforms);
      sh.vertexShader = 'uniform float uTime; uniform float uPhase;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        float tailW = smoothstep(0.15, -0.45, transformed.x);
        transformed.z += sin(uTime * 5.0 + uPhase - transformed.x * 7.0) * 0.07 * tailW;`);
    };
    material.customProgramCacheKey = () => 'koi';
    const [bg, tg] = body(variety);
    const m = new THREE.Group();
    const s = rng.range(0.9, 1.5);
    m.scale.setScalar(s);
    m.add(new THREE.Mesh(bg, material), new THREE.Mesh(tg, material));
    group.add(m);
    const lobe = i % 2 ? { x: 37, z: -13 } : { x: 26.5, z: -5.5 };
    fish.push({ m, cx: lobe.x + rng.range(-1.5, 1.5), cz: lobe.z + rng.range(-1.5, 1.5), r: rng.range(2.2, 4.5), w: rng.range(0.12, 0.3) * (rng.f() < 0.5 ? -1 : 1), ph: rng.f() * 6.28, depth: rng.range(0.25, 0.55) });
  }
  const update = (t) => {
    for (const f of fish) {
      const a = f.ph + t * f.w;
      const wob = Math.sin(t * 0.7 + f.ph) * 0.6;
      const x = f.cx + Math.cos(a) * (f.r + wob), z = f.cz + Math.sin(a) * (f.r * 0.8 + wob);
      const nx = f.cx + Math.cos(a + 0.05 * Math.sign(f.w)) * (f.r + wob), nz = f.cz + Math.sin(a + 0.05 * Math.sign(f.w)) * (f.r * 0.8 + wob);
      f.m.position.set(x, WATER_Y - f.depth, z);
      f.m.rotation.y = Math.atan2(-(nz - z), nx - x);
    }
  };
  return { group, update };
}
