// Sky dome: an art-directed gradient with a sun-side glow band along the horizon, a Mie
// halo and sun disc, procedural twinkling stars and a moon. The same dome feeds a PMREM
// environment map, so lacquer, gilt and bronze reflect the sky of the current hour.
import * as THREE from 'three';
import { G } from '../lib/patch.js';

export function createSky() {
  const uniforms = {
    uSunDir: G.uSunDir,
    uTime: G.uTime,
    uZenith: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uGlow: { value: new THREE.Color() },
    uSunColor: { value: new THREE.Color() },
    uSunDisc: { value: 1 },
    uStars: { value: 0 },
    uMoon: { value: 0 },
    uMoonDir: { value: new THREE.Vector3(0, 1, 0) },
  };
  const material = new THREE.ShaderMaterial({
    name: 'sky',
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() {
        vDir = position;
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uSunDir, uZenith, uHorizon, uGlow, uSunColor, uMoonDir;
      uniform float uTime, uStars, uMoon, uSunDisc;
      varying vec3 vDir;
      float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        float t = pow(clamp(h, 0.0, 1.0), 0.42);
        vec3 col = mix(uHorizon, uZenith, t);
        float sd = dot(d, uSunDir);
        vec2 dxz = normalize(d.xz + 1e-5), sxz = normalize(uSunDir.xz + 1e-5);
        float az = max(dot(dxz, sxz), 0.0);
        float band = pow(az, 2.5) * pow(1.0 - clamp(h, 0.0, 1.0), 3.0);
        col = mix(col, uGlow, band * 0.9);
        col += uSunColor * (pow(max(sd, 0.0), 10.0) * 0.22 + pow(max(sd, 0.0), 120.0) * 0.7) * step(-0.12, uSunDir.y);
        col += uSunColor * smoothstep(0.99955, 0.9998, sd) * 18.0 * uSunDisc * step(-0.02, uSunDir.y);
        col = mix(col, uHorizon * 0.92, smoothstep(0.0, -0.2, h));
        if (uStars > 0.001) {
          vec3 sp = d * 260.0;
          vec3 cell = floor(sp);
          float r = h3(cell);
          vec3 f = fract(sp) - 0.5;
          float tw = 0.65 + 0.35 * sin(uTime * (1.5 + r * 3.0) + r * 80.0);
          float star = step(0.965, r) * smoothstep(0.12 + (r - 0.965) * 3.0, 0.0, length(f)) * tw;
          float milky = smoothstep(0.35, 0.0, abs(dot(d, normalize(vec3(0.3, 0.55, -0.78))))) * 0.06;
          col += (vec3(star) * mix(vec3(0.8, 0.85, 1.0), vec3(1.0, 0.92, 0.8), r) * 1.8 + vec3(0.5, 0.55, 0.75) * milky) * uStars * smoothstep(-0.02, 0.3, h);
        }
        if (uMoon > 0.001) {
          float md = dot(d, uMoonDir);
          float disc = smoothstep(0.99955, 0.99972, md);
          // a gentle terminator so it reads as a waxing gibbous
          vec3 mt = normalize(cross(uMoonDir, vec3(0.0, 1.0, 0.0)));
          float phase = smoothstep(-0.004, 0.012, dot(d - uMoonDir * md, mt) + 0.006);
          col += vec3(1.0, 0.97, 0.9) * disc * (0.25 + 0.75 * phase) * 6.0 * uMoon;
          col += vec3(0.45, 0.55, 0.8) * (pow(max(md, 0.0), 50.0) * 0.18 + pow(max(md, 0.0), 800.0) * 0.5) * uMoon;
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(9000, 48, 24), material);
  mesh.name = 'sky';
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  mesh.userData.noAO = true;
  mesh.userData.noExport = true;

  // environment capture scene: the same sky plus a bright cloud floor
  const envScene = new THREE.Scene();
  const envSky = new THREE.Mesh(new THREE.SphereGeometry(100, 48, 24), material);
  envScene.add(envSky);
  const floorMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(95, 32), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.y = -12;
  envScene.add(floor);
  return { mesh, uniforms, envScene, floorMat };
}
