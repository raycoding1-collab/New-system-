// Unkai, the sea of clouds: a stack of translucent noise layers filling the valleys below
// the terrace. Lower layers are denser and shadowed, upper ones thin and sunlit, so the
// stack reads as volume. Drifting mist wisps cling to the slopes above it.
import * as THREE from 'three';
import { G, FOG_GLSL } from '../lib/patch.js';
import { cloudNoiseTexture, smokeTexture } from '../lib/textures.js';
import { Rng } from '../lib/util.js';

export function createClouds() {
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
  const N = 12;
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
        uLayer: { value: layer },
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
        uniform float uLayer, uCover, uAlpha, uTime;
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
          vec3 V = normalize(vWPos - cameraPosition);
          float lit = clamp(uLayer * 0.75 + (dens - thr) * 1.6, 0.0, 1.0);
          vec3 col = mix(uShade, uLit, lit);
          col += uFogSunColor * pow(max(dot(V, uSunDir), 0.0), 6.0) * 0.55 * (0.4 + uLayer);
          // distant haze, but clouds are lighter than the terrain fog
          float haze = 1.0 - exp(-dist * 0.00022);
          col = mix(col, mix(uFogColor, uFogSunColor, pow(max(dot(V, uSunDir), 0.0), 5.0)), haze * 0.7);
          gl_FragColor = vec4(col, a * mix(0.55, 0.32, uLayer) * uAlpha);
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

  // mist wisps on the slopes
  const smoke = smokeTexture(128);
  const rng = new Rng(77);
  const wisps = [];
  const wispMat = new THREE.SpriteMaterial({ map: smoke, transparent: true, depthWrite: false, opacity: 0.22, color: 0xffffff, fog: false });
  for (let i = 0; i < 26; i++) {
    const a = rng.range(-0.2, Math.PI + 0.2);
    const r = rng.range(70, 150);
    const s = new THREE.Sprite(wispMat.clone());
    s.position.set(Math.cos(a) * r, rng.range(-22, -6), Math.sin(a) * r * 0.9 + 20);
    s.scale.set(rng.range(40, 80), rng.range(14, 26), 1);
    s.userData = { base: s.position.clone(), sp: rng.range(0.4, 1.2), ph: rng.f() * 10, noAO: true, noExport: true };
    s.material.rotation = rng.range(-0.2, 0.2);
    group.add(s);
    wisps.push(s);
  }
  const update = (t) => {
    for (const s of wisps) {
      s.position.x = s.userData.base.x + Math.sin(t * 0.02 * s.userData.sp + s.userData.ph) * 18;
      s.position.y = s.userData.base.y + Math.sin(t * 0.05 + s.userData.ph) * 1.5;
    }
  };
  return { group, shared, wisps, wispMat, update };
}
