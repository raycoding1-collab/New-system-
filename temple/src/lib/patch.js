// Global shader patches applied to every material in the scene:
//  - exponential height fog, tinted toward the sun (mist pools in the valleys and the
//    cloud sea, while the terrace stays clear)
//  - winter snow that settles on upward-facing surfaces, masked by a top-down height map
//    so nothing collects under the eaves or inside the halls
//  - wind sway for foliage
import * as THREE from 'three';

export const G = {
  uTime: { value: 0 },
  uWind: { value: 1 },
  uSnow: { value: 0 },
  uSnowMap: { value: null },
  uSnowBounds: { value: new THREE.Vector4(-80, -80, 160, 160) },
  uSunDir: { value: new THREE.Vector3(0.5, 0.5, 0.5).normalize() },
  uFogColor: { value: new THREE.Color(0.7, 0.75, 0.8) },
  uFogSunColor: { value: new THREE.Color(1, 0.8, 0.6) },
  uFogDensity: { value: 0.004 },
  uFogFalloff: { value: 0.05 },
  uFogBase: { value: 0 },
  uHaze: { value: 0.0006 },
  uFogMax: { value: 1 },
};

export const NOISE_GLSL = /* glsl */`
float tHash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float tNoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(tHash(i), tHash(i + vec2(1.0, 0.0)), f.x), mix(tHash(i + vec2(0.0, 1.0)), tHash(i + 1.0), f.x), f.y);
}
`;

export const FOG_GLSL = /* glsl */`
uniform vec3 uFogColor;
uniform vec3 uFogSunColor;
uniform vec3 uSunDir;
uniform float uFogDensity;
uniform float uFogFalloff;
uniform float uFogBase;
uniform float uHaze;
uniform float uFogMax;
float tHeightFog(vec3 ro, vec3 rd, float dist){
  float b = uFogFalloff;
  float c = uFogDensity * exp(-b * (ro.y - uFogBase));
  float k = b * rd.y * dist;
  float f = abs(k) > 1e-4 ? (1.0 - exp(-k)) / k : 1.0;
  float h = 1.0 - exp(-c * dist * f);
  float a = 1.0 - exp(-uHaze * dist);
  return clamp(1.0 - (1.0 - h) * (1.0 - a), 0.0, uFogMax);
}
vec3 tApplyFog(vec3 col, vec3 wpos){
  vec3 fv = wpos - cameraPosition;
  float fd = length(fv);
  vec3 dir = fv / max(fd, 1e-4);
  float amt = tHeightFog(cameraPosition, dir, fd);
  float sunAmt = pow(max(dot(dir, uSunDir), 0.0), 5.0);
  vec3 fc = mix(uFogColor, uFogSunColor, sunAmt);
  return mix(col, fc, amt);
}
`;

const VERT_HEAD = /* glsl */`
varying vec3 vWPos;
uniform float uTime;
uniform float uWind;
`;

const FRAG_HEAD = /* glsl */`
varying vec3 vWPos;
uniform float uSnow;
uniform sampler2D uSnowMap;
uniform vec4 uSnowBounds;
${NOISE_GLSL}
${FOG_GLSL}
`;

const SNOW_FRAG = /* glsl */`
{
  vec3 wN = inverseTransformDirection(normal, viewMatrix);
  float up = smoothstep(0.32, 0.78, wN.y);
  vec2 suv = (vWPos.xz - uSnowBounds.xy) / uSnowBounds.zw;
  float cover = 1.0;
  if (suv.x > 0.0 && suv.x < 1.0 && suv.y > 0.0 && suv.y < 1.0) {
    float top = texture2D(uSnowMap, suv).r - 100.0;
    cover = 1.0 - smoothstep(0.15, 0.6, top - vWPos.y);
    #ifdef SNOW_ROOF
    // roofs tucked under a higher roof still catch wind-blown snow
    cover = max(cover, 0.85 * smoothstep(1.2, 2.6, top - vWPos.y));
    #endif
  }
  float n = tNoise(vWPos.xz * 1.7) * 0.45 + tNoise(vWPos.xz * 0.31) * 0.55;
  float s = uSnow * SNOW_BOOST * up * cover * smoothstep(0.3, 0.62, n * 0.85 + uSnow * 0.3);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.8, 0.83, 0.88), clamp(s, 0.0, 1.0));
  roughnessFactor = mix(roughnessFactor, 0.75, s);
  metalnessFactor = mix(metalnessFactor, 0.0, s);
}
`;

// wind: `windAmt` scales the displacement for this material
function windVert(amt) {
  return /* glsl */`
#include <begin_vertex>
{
  vec4 wp0 = modelMatrix * vec4(transformed, 1.0);
  float ph = wp0.x * 0.31 + wp0.z * 0.27;
  float sway = sin(uTime * 1.3 + ph) * 0.6 + sin(uTime * 2.7 + ph * 2.3) * 0.3;
  float flutter = sin(uTime * 7.0 + wp0.x * 3.1 + wp0.y * 2.3 + wp0.z * 1.7) * 0.25;
  transformed.x += (sway + flutter) * ${amt.toFixed(3)} * uWind;
  transformed.z += (sway * 0.6 - flutter) * ${amt.toFixed(3)} * uWind;
  transformed.y += flutter * ${(amt * 0.5).toFixed(3)} * uWind;
}
`;
}

const WPOS_VERT = /* glsl */`
#include <project_vertex>
{
  vec4 tw = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
  tw = instanceMatrix * tw;
  #endif
  vWPos = (modelMatrix * tw).xyz;
}
`;

export function patchMaterial(m, { wind = 0, snow = 1, roof = false } = {}) {
  m.onBeforeCompile = (shader) => {
    for (const k of Object.keys(G)) shader.uniforms[k] = G[k];
    let vs = VERT_HEAD + shader.vertexShader;
    if (wind > 0) vs = vs.replace('#include <begin_vertex>', windVert(wind));
    vs = vs.replace('#include <project_vertex>', WPOS_VERT);
    shader.vertexShader = vs;
    let fs = (roof ? '#define SNOW_ROOF\n' : '') + FRAG_HEAD + shader.fragmentShader;
    if (snow > 0 && fs.includes('#include <normal_fragment_maps>') && fs.includes('#include <roughnessmap_fragment>')) {
      fs = fs.replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + SNOW_FRAG.replace('SNOW_BOOST', snow.toFixed(3)));
    }
    fs = fs.replace('#include <fog_fragment>', '#ifdef USE_FOG\n gl_FragColor.rgb = tApplyFog(gl_FragColor.rgb, vWPos);\n#endif');
    shader.fragmentShader = fs;
  };
  m.customProgramCacheKey = () => `temple-w${wind}-s${snow}-r${roof ? 1 : 0}`;
  return m;
}
