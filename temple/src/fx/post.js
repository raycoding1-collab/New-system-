// Post-processing: multisampled HDR render, ground-truth ambient occlusion (skipping
// foliage, water, sky and particles, which would smear it), bloom for lanterns and the
// sun, filmic output, then a light vignette and film grain.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

class TempleGTAO extends GTAOPass {
  _renderOverride(renderer, overrideMaterial, renderTarget, clearColor, clearAlpha) {
    const hidden = this.hideList || [];
    const was = hidden.map((o) => o.visible);
    for (const o of hidden) o.visible = false;
    super._renderOverride(renderer, overrideMaterial, renderTarget, clearColor, clearAlpha);
    hidden.forEach((o, i) => { o.visible = was[i]; });
  }
}

// Guard: one Inf/NaN pixel would be smeared over the whole frame by the bloom mip chain.
const SanitizeShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      if (any(isnan(c)) || any(isinf(c))) c = vec4(0.0, 0.0, 0.0, 1.0);
      gl_FragColor = min(c, vec4(4000.0));
    }`,
};

const FinalShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVignette: { value: 0.28 }, uGrain: { value: 0.025 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uTime, uVignette, uGrain; varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = (vUv - 0.5) * vec2(1.0, 0.82);
      float v = smoothstep(0.82, 0.18, length(d));
      c.rgb *= mix(1.0 - uVignette, 1.0, v);
      float g = fract(sin(dot(gl_FragCoord.xy + fract(uTime * 7.13) * 91.7, vec2(12.9898, 78.233))) * 43758.5453);
      c.rgb += (g - 0.5) * uGrain;
      gl_FragColor = c;
    }`,
};

export function createPost(renderer, scene, camera, quality) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: quality.msaa });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  let gtao = null;
  if (quality.ao) {
    gtao = new TempleGTAO(scene, camera, size.x, size.y);
    gtao.blendIntensity = 0.85;
    gtao.updateGtaoMaterial({ radius: 0.9, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: 12, distanceFallOff: 1, screenSpaceRadius: false });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
    composer.addPass(gtao);
  }
  composer.addPass(new ShaderPass(SanitizeShader));
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.5, 0.55, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const final = new ShaderPass(FinalShader);
  composer.addPass(final);
  return {
    composer, gtao, bloom, final,
    setHidden(list) { if (gtao) gtao.hideList = list; },
    setSize(w, h) { composer.setSize(w, h); },
  };
}
