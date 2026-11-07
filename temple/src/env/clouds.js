// Unkai, the sea of clouds: a stack of translucent noise layers filling the valleys below
// the terrace. Lower layers are denser and shadowed, upper ones thin and sunlit, so the
// stack reads as volume. Drifting mist wisps cling to the slopes above it.
import * as THREE from 'three';
import { G, FOG_GLSL } from '../lib/patch.js';
import { cloudNoiseTexture, smokeTexture } from '../lib/textures.js';
import { Rng } from '../lib/util.js';
import { createBillboards } from './billboards.js';

export function createClouds({ layers = 12 } = {}) {
  const noise = cloudNoiseTexture(256);
  const shared = {
    uNoise: { value: noise },
    uLit: { value: new THREE.Color('#ffffff') },
    uShade: { value: new THREE.Color('#9aa3b5') },
    uCover: { value: 0 },
    uAlpha: { value: 1 },
  };
  const group = new THREE.Group();
  group.name = 'cloud-sea';
  const N = layers;
  const y0 = -40, y1 = -21;
  const geo = new THREE.PlaneGeometry(14000, 14000);
  geo.rotateX(-Math.PI / 2);
  for (let i = 0; i < N; i++) {
    const layer = i / (N - 1);
    const material = new THREE.ShaderMaterial({
      name: `cloud-layer-${i}`,
      transparent: true,
      depthWrite: false,
      uniforms: {
        ...shared,
        uLayer: { value: layer }, uDensity: { value: Math.sqrt(12 / N) },
        uTime: G.uTime, uSunDir: G.uSunDir, uFogColor: G.uFogColor, uFogSunColor: G.uFogSunColor,
        uFogDensity: G.uFogDensity, uFogFalloff: G.uFogFalloff, uFogBase: G.uFogBase, uHaze: G.uHaze, uFogMax: G.uFogMax,
      },
      vertexShader: /* glsl */`
        varying vec3 vWPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: /* glsl */`
        uniform sampler2D uNoise;
        uniform vec3 uLit, uShade;
        uniform float uLayer, uCover, uAlpha, uTime, uDensity;
        varying vec3 vWPos;
        ${FOG_GLSL}
        void main() {
          vec2 p = vWPos.xz;
          float w = uTime * 0.6;
          float a1 = texture2D(uNoise, p * 0.0009 + vec2(w * 0.0021, w * 0.0013)).r;
          float a2 = texture2D(uNoise, p * 0.0037 + vec2(-w * 0.004, w * 0.0026) + uLayer * 0.13).g;
          float a3 = texture2D(uNoise, p * 0.013 + vec2(w * 0.008, -w * 0.005) + uLayer * 0.31).b;
          float dens = a1 * 0.62 + a2 * 0.3 + a3 * 0.16;
          float thr = mix(0.2, 0.6, uLayer) - uCover;
          float a = smoothstep(thr, thr + 0.2, dens);
          float dist = length(vWPos - cameraPosition);
          a *= smoothstep(4.0, 40.0, dist) * (1.0 - smoothstep(4500.0, 6800.0, dist));
          if (a < 0.003) discard; // nothing to blend
          vec3 V = normalize(vWPos - cameraPosition);
          float lit = clamp(uLayer * 0.75 + (dens - thr) * 1.6, 0.0, 1.0);
          vec3 col = mix(uShade, uLit, lit);
          col += uFogSunColor * pow(max(dot(V, uSunDir), 0.0), 6.0) * 0.55 * (0.4 + uLayer);
          // distant haze, but clouds are lighter than the terrain fog
          float haze = 1.0 - exp(-dist * 0.00022);
          col = mix(col, mix(uFogColor, uFogSunColor, pow(max(dot(V, uSunDir), 0.0), 5.0)), haze * 0.7);
          gl_FragColor = vec4(col, a * mix(0.55, 0.32, uLayer) * uAlpha * uDensity);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    const m = new THREE.Mesh(geo, material);
    m.position.y = y0 + (y1 - y0) * layer;
    m.renderOrder = 1 + i * 0.01;
    m.frustumCulled = false;
    m.userData.noAO = true;
    m.userData.noExport = true;
    group.add(m);
  }

  // mist wisps on the slopes, all in one draw call
  const smoke = smokeTexture(128);
  const rng = new Rng(77);
  const W = 26;
  const wisps = createBillboards(W, smoke, 0xffffff, 'mist-wisps');
  const wispData = [];
  for (let i = 0; i < W; i++) {
    const a = rng.range(-0.2, Math.PI + 0.2);
    const r = rng.range(70, 150);
    const base = new THREE.Vector3(Math.cos(a) * r, rng.range(-22, -6), Math.sin(a) * r * 0.9 + 20);
    const sx = rng.range(40, 80), sy = rng.range(14, 26);
    const d = { base, sx, sy, sp: rng.range(0.4, 1.2), ph: rng.f() * 10 };
    d.rot = rng.range(-0.2, 0.2);
    wispData.push(d);
  }
  group.add(wisps.mesh);
  const update = (t) => {
    wispData.forEach((d, i) => {
      wisps.set(i,
        d.base.x + Math.sin(t * 0.02 * d.sp + d.ph) * 18,
        d.base.y + Math.sin(t * 0.05 + d.ph) * 1.5,
        d.base.z, d.sx, d.sy, d.rot, 0.22);
    });
    wisps.commit();
  };
  update(0);
  return { group, shared, wispColor: wisps.color, update };
}
