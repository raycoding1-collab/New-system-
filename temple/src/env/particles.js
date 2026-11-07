// Weather and small life: tumbling maple leaves, drifting cherry petals or snow, all
// wrapped in a box that follows the camera, so there is always something in the air
// near the viewer and none of it pops. Plus summer-night fireflies and the incense smoke
// rising from the burner.
import * as THREE from 'three';
import { G, FOG_GLSL } from '../lib/patch.js';
import { Rng } from '../lib/util.js';
import { createBillboards } from './billboards.js';
import { mapleLeafTexture, blossomTexture, softSpriteTexture, smokeTexture } from '../lib/textures.js';

function petalTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const ctx = c.getContext('2d');
  ctx.translate(32, 34);
  ctx.beginPath(); ctx.moveTo(0, 26); ctx.bezierCurveTo(22, 10, 18, -20, 5, -26); ctx.lineTo(0, -19); ctx.lineTo(-5, -26); ctx.bezierCurveTo(-18, -20, -22, 10, 0, 26);
  ctx.fillStyle = '#fff'; ctx.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function singleLeafTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const ctx = c.getContext('2d');
  ctx.translate(32, 32);
  ctx.beginPath();
  for (let i = 0; i <= 14; i++) {
    const a = -Math.PI / 2 + (i / 14) * Math.PI * 2;
    const r = i % 2 === 0 ? 28 * (1 - Math.abs(Math.sin(a * 0.5)) * 0.15) : 11;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i / 7) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 24, Math.sin(a) * 24); ctx.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createWeather() {
  const MAX = 9000;
  const rng = new Rng(4242);
  const base = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.setAttribute('position', base.attributes.position);
  geo.setAttribute('uv', base.attributes.uv);
  const off = new Float32Array(MAX * 3), rnd = new Float32Array(MAX * 4);
  for (let i = 0; i < MAX; i++) {
    off[i * 3] = rng.f(); off[i * 3 + 1] = rng.f(); off[i * 3 + 2] = rng.f();
    for (let k = 0; k < 4; k++) rnd[i * 4 + k] = rng.f();
  }
  geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(off, 3));
  geo.setAttribute('aRand', new THREE.InstancedBufferAttribute(rnd, 4));
  geo.instanceCount = 0;
  const textures = { leaf: singleLeafTexture(), petal: petalTexture(), snow: softSpriteTexture(64) };
  void mapleLeafTexture; void blossomTexture;
  const uniforms = {
    uTime: G.uTime, uSunDir: G.uSunDir, uFogColor: G.uFogColor, uFogSunColor: G.uFogSunColor, uFogDensity: G.uFogDensity,
    uFogFalloff: G.uFogFalloff, uFogBase: G.uFogBase, uHaze: G.uHaze, uFogMax: G.uFogMax,
    uMap: { value: textures.leaf }, uCam: { value: new THREE.Vector3() }, uBox: { value: new THREE.Vector3(70, 34, 70) },
    uSize: { value: 0.12 }, uFall: { value: 0.7 }, uSway: { value: 1.2 }, uSpin: { value: 2.0 }, uDrift: { value: new THREE.Vector2(0.35, 0.15) },
    uColA: { value: new THREE.Color('#c22b16') }, uColB: { value: new THREE.Color('#f0a428') },
    uLight: { value: new THREE.Color(1, 1, 1) }, uAmbient: { value: new THREE.Color(0.4, 0.4, 0.45) }, uBillboard: { value: 0 }, uOpacity: { value: 1 },
  };
  const material = new THREE.ShaderMaterial({
    name: 'weather', uniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      attribute vec3 aOffset; attribute vec4 aRand;
      uniform float uTime, uSize, uFall, uSway, uSpin, uBillboard;
      uniform vec3 uCam, uBox; uniform vec2 uDrift;
      varying vec2 vUv; varying vec3 vN; varying float vR; varying vec3 vWPos; varying float vFade;
      mat3 rotX(float a){ float c = cos(a), s = sin(a); return mat3(1.,0.,0., 0.,c,s, 0.,-s,c); }
      mat3 rotY(float a){ float c = cos(a), s = sin(a); return mat3(c,0.,-s, 0.,1.,0., s,0.,c); }
      mat3 rotZ(float a){ float c = cos(a), s = sin(a); return mat3(c,s,0., -s,c,0., 0.,0.,1.); }
      void main() {
        vUv = uv; vR = aRand.x;
        vec3 p = aOffset * uBox;
        p.y -= uTime * uFall * (0.6 + aRand.x * 0.8);
        p.x += sin(uTime * 0.6 * (0.5 + aRand.y) + aRand.z * 6.28) * uSway + uTime * uDrift.x;
        p.z += cos(uTime * 0.5 * (0.5 + aRand.x) + aRand.w * 6.28) * uSway + uTime * uDrift.y;
        vec3 rel = mod(p - uCam + uBox * 0.5, uBox) - uBox * 0.5;
        rel.y += uBox.y * 0.1;
        vec3 edge = abs(rel) / (uBox * 0.5);
        vFade = 1.0 - smoothstep(0.75, 1.0, max(max(edge.x, edge.z), edge.y));
        vec3 world = uCam + rel;
        vFade *= smoothstep(1.2, 4.5, length(rel)); // no giant flakes against the lens
        float s = uSize * (0.6 + aRand.w * 0.8);
        vec3 local;
        if (uBillboard > 0.5) {
          vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
          vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          local = (right * position.x + up * position.y) * s;
          vN = vec3(0.0, 1.0, 0.0);
        } else {
          mat3 R = rotY(uTime * uSpin * (0.4 + aRand.y) + aRand.z * 6.28) * rotX(uTime * uSpin * 0.7 * (0.4 + aRand.w) + aRand.x * 6.28) * rotZ(aRand.y * 6.28);
          local = R * vec3(position.xy * s, 0.0);
          vN = R * vec3(0.0, 0.0, 1.0);
        }
        world += local;
        vWPos = world;
        gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap; uniform vec3 uColA, uColB, uLight, uAmbient; uniform float uOpacity;
      varying vec2 vUv; varying vec3 vN; varying float vR; varying vec3 vWPos; varying float vFade;
      ${FOG_GLSL}
      void main() {
        vec4 t = texture2D(uMap, vUv);
        if (t.a < 0.3) discard;
        vec3 base = mix(uColA, uColB, vR) * t.rgb;
        float diff = abs(dot(normalize(vN), uSunDir));
        vec3 col = base * (uAmbient + uLight * (0.35 + 0.65 * diff));
        gl_FragColor = vec4(tApplyFog(col, vWPos), t.a * vFade * uOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  mesh.name = 'weather';
  mesh.renderOrder = 5;
  mesh.userData.noAO = true;
  mesh.userData.noExport = true;

  const modes = {
    none: { count: 0 },
    petals: { count: 2600, map: textures.petal, size: 0.09, fall: 0.55, sway: 1.6, spin: 1.6, a: '#f6c9d6', b: '#fff1f5', billboard: 0, box: [70, 34, 70] },
    leaves: { count: 1700, map: textures.leaf, size: 0.13, fall: 0.85, sway: 1.3, spin: 2.2, a: '#b8231a', b: '#f2a12c', billboard: 0, box: [70, 34, 70] },
    snow: { count: 9000, map: textures.snow, size: 0.07, fall: 1.1, sway: 0.6, spin: 0, a: '#ffffff', b: '#e8f0ff', billboard: 1, box: [60, 30, 60] },
    seeds: { count: 260, map: textures.snow, size: 0.05, fall: 0.08, sway: 2.0, spin: 0, a: '#fff8e0', b: '#ffffff', billboard: 1, box: [60, 24, 60] },
  };
  const setMode = (name, reduced = false) => {
    const m = modes[name] || modes.none;
    geo.instanceCount = Math.round((m.count || 0) * (reduced ? 0.35 : 1));
    if (!m.count) return;
    uniforms.uMap.value = m.map; uniforms.uSize.value = m.size; uniforms.uFall.value = m.fall * (reduced ? 0.5 : 1);
    uniforms.uSway.value = m.sway; uniforms.uSpin.value = reduced ? 0 : m.spin; uniforms.uBillboard.value = m.billboard;
    uniforms.uColA.value.set(m.a); uniforms.uColB.value.set(m.b);
    uniforms.uBox.value.set(...m.box);
  };
  return { mesh, uniforms, setMode };
}

// Fireflies: soft additive points hovering over the pond and the moss.
export function createFireflies() {
  const rng = new Rng(9);
  const N = 180;
  const pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const zone = rng.f();
    let x, z;
    if (zone < 0.55) { x = rng.range(18, 46); z = rng.range(-24, 3); } else if (zone < 0.8) { x = rng.range(-48, -18); z = rng.range(-42, -20); } else { x = rng.range(-52, -40); z = rng.range(-14, 24); }
    pos[i * 3] = x; pos[i * 3 + 1] = rng.range(0.4, 3.2); pos[i * 3 + 2] = z;
    seed[i] = rng.f() * 100;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const material = new THREE.ShaderMaterial({
    name: 'fireflies', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: G.uTime, uMap: { value: softSpriteTexture(64) }, uAmount: { value: 0 }, uScale: { value: 300 } },
    vertexShader: /* glsl */`
      attribute float aSeed; uniform float uTime, uScale; varying float vA;
      void main() {
        vec3 p = position;
        p.x += sin(uTime * 0.31 + aSeed) * 1.4 + sin(uTime * 0.9 + aSeed * 2.0) * 0.3;
        p.y += sin(uTime * 0.47 + aSeed * 1.7) * 0.5;
        p.z += cos(uTime * 0.27 + aSeed * 0.7) * 1.4;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float blink = smoothstep(0.3, 1.0, sin(uTime * (0.8 + fract(aSeed) * 1.4) + aSeed * 5.0));
        vA = blink;
        gl_PointSize = uScale * (0.1 + 0.08 * fract(aSeed * 7.0)) / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap; uniform float uAmount; varying float vA;
      void main() {
        float a = texture2D(uMap, gl_PointCoord).r;
        gl_FragColor = vec4(vec3(0.75, 1.0, 0.35) * 4.0 * a * vA * uAmount, 1.0);
      }`,
  });
  const points = new THREE.Points(g, material);
  points.frustumCulled = false;
  points.name = 'fireflies';
  points.userData.noAO = true; points.userData.noExport = true;
  return { points, uniforms: material.uniforms };
}

// Incense smoke from the jōkōro: soft sprites rising, curling and fading.
export function createSmoke(origin) {
  const tex = smokeTexture(128);
  const group = new THREE.Group();
  group.name = 'incense-smoke';
  const N = 18;
  const puffs = createBillboards(N, tex, 0xdfe3e6, 'incense-smoke');
  group.add(puffs.mesh);
  const ages = Array.from({ length: N }, (_, i) => (i / N) * 7);
  const update = (dt, t, wind = 1) => {
    for (let i = 0; i < N; i++) {
      ages[i] += dt;
      if (ages[i] > 7) ages[i] -= 7;
      const a = ages[i] / 7;
      const sc = 0.25 + a * 1.6;
      puffs.set(i,
        origin.x + Math.sin(t * 0.7 + a * 5) * 0.25 * a + a * 1.1 * wind,
        origin.y + a * 4.2,
        origin.z + Math.cos(t * 0.6 + a * 4) * 0.25 * a + a * 0.5 * wind,
        sc, sc, a * 2 + t * 0.05, Math.sin(a * Math.PI) * 0.16 * (1 - a * 0.5));
    }
    puffs.commit();
  };
  return { group, update };
}
