// Times of day and seasons. Each time preset is a full lighting recipe (sun or moon,
// sky gradient, fog, cloud colours, exposure, how brightly the lanterns burn). Switching
// eases every value over ~2.4 s instead of cutting, then re-captures the environment map.
import * as THREE from 'three';

const v = (x, y, z) => new THREE.Vector3(x, y, z).normalize();
const c = (h) => new THREE.Color(h);

export const TIMES = {
  dawn: {
    label: 'Dawn', sunDir: v(0.8, 0.2, 0.45), sunColor: c('#ffc08e'), sunI: 3.0,
    hemiSky: c('#a9b6d8'), hemiGround: c('#5c4c44'), hemiI: 0.9,
    zenith: c('#4f6fa8'), horizon: c('#e9c0a8'), glow: c('#ff9d6a'), skySun: c('#ffc49a'),
    fog: c('#a9adc4'), fogSun: c('#ffc69c'), fogDensity: 0.0027, fogFalloff: 0.06, haze: 0.00022,
    cloudLit: c('#ffe2d0'), cloudShade: c('#878aa6'), cloudCover: 0.04,
    exposure: 1.05, lamps: 0.3, stars: 0.08, moon: 0, bloom: 0.55, floor: c('#d8c8c8'), disc: 1,
  },
  day: {
    label: 'Day', sunDir: v(0.45, 0.82, 0.45), sunColor: c('#fff3e2'), sunI: 3.1,
    hemiSky: c('#c4d8f2'), hemiGround: c('#7a6c58'), hemiI: 1.05,
    zenith: c('#3a6fbf'), horizon: c('#c9dcec'), glow: c('#e9eff4'), skySun: c('#fff6e8'),
    fog: c('#b9cadb'), fogSun: c('#f4f1e8'), fogDensity: 0.0020, fogFalloff: 0.06, haze: 0.00018,
    cloudLit: c('#ffffff'), cloudShade: c('#b4bfcf'), cloudCover: 0,
    exposure: 0.85, lamps: 0, stars: 0, moon: 0, bloom: 0.35, floor: c('#e4e9ef'), disc: 1,
  },
  dusk: {
    label: 'Dusk', sunDir: v(-0.55, 0.19, 0.82), sunColor: c('#ff9d55'), sunI: 3.4,
    hemiSky: c('#9a9cc8'), hemiGround: c('#57443a'), hemiI: 0.85,
    zenith: c('#2b4585'), horizon: c('#f2a06e'), glow: c('#ff7339'), skySun: c('#ffae6a'),
    fog: c('#8d89a6'), fogSun: c('#ffb27a'), fogDensity: 0.0027, fogFalloff: 0.06, haze: 0.00024,
    cloudLit: c('#ffc6a1'), cloudShade: c('#76688a'), cloudCover: 0.05,
    exposure: 1.12, lamps: 0.55, stars: 0.04, moon: 0, bloom: 0.65, floor: c('#c7a6a0'), disc: 1,
  },
  night: {
    label: 'Night', sunDir: v(-0.35, 0.62, 0.55), sunColor: c('#a9bfff'), sunI: 0.95,
    hemiSky: c('#34477a'), hemiGround: c('#12141c'), hemiI: 0.55,
    zenith: c('#060c1e'), horizon: c('#22304f'), glow: c('#2d4068'), skySun: c('#4a5c88'),
    fog: c('#161f33'), fogSun: c('#2b3b5e'), fogDensity: 0.0027, fogFalloff: 0.06, haze: 0.0002,
    cloudLit: c('#7083ab'), cloudShade: c('#212a44'), cloudCover: 0.02,
    exposure: 1.45, lamps: 1, stars: 1, moon: 1, bloom: 0.9, floor: c('#2f3c5c'), disc: 0,
  },
};

export const SEASONS = {
  spring: { label: 'Spring', weather: 'petals', snow: 0, fireflies: 0, wind: 0.9 },
  summer: { label: 'Summer', weather: 'none', snow: 0, fireflies: 1, wind: 0.7 },
  autumn: { label: 'Autumn', weather: 'leaves', snow: 0, fireflies: 0, wind: 1.1 },
  winter: { label: 'Winter', weather: 'snow', snow: 1, fireflies: 0, wind: 0.5 },
};

// Interpolates a flat state object between two presets.
export function mixPreset(a, b, t, out) {
  for (const k of Object.keys(b)) {
    const va = a[k], vb = b[k];
    if (vb && vb.isColor) { out[k] = out[k] || new THREE.Color(); out[k].copy(va).lerp(vb, t); }
    else if (vb && vb.isVector3) { out[k] = out[k] || new THREE.Vector3(); out[k].copy(va).lerp(vb, t).normalize(); }
    else if (typeof vb === 'number') out[k] = va + (vb - va) * t;
    else out[k] = vb;
  }
  return out;
}

export function clonePreset(p) {
  const o = {};
  for (const [k, val] of Object.entries(p)) o[k] = val && val.clone ? val.clone() : val;
  return o;
}
