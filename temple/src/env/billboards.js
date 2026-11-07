// Many camera-facing quads in a single draw call. Renders exactly like three.js sprites
// (same rotation, scale and texture maths) but as one instanced mesh, so a cloud of mist
// wisps or smoke puffs costs one draw instead of one per puff.
import * as THREE from 'three';

export function createBillboards(count, map, color, name) {
  const base = new THREE.PlaneGeometry(1, 1);
  const g = new THREE.InstancedBufferGeometry();
  g.index = base.index;
  g.setAttribute('position', base.attributes.position);
  g.setAttribute('uv', base.attributes.uv);
  const attr = (size) => new THREE.InstancedBufferAttribute(new Float32Array(count * size), size).setUsage(THREE.DynamicDrawUsage);
  const aPos = attr(3), aScale = attr(2), aRot = attr(1), aAlpha = attr(1);
  g.setAttribute('aPos', aPos);
  g.setAttribute('aScale', aScale);
  g.setAttribute('aRot', aRot);
  g.setAttribute('aAlpha', aAlpha);
  g.instanceCount = count;
  const material = new THREE.ShaderMaterial({
    name,
    transparent: true,
    depthWrite: false,
    uniforms: { uMap: { value: map }, uColor: { value: new THREE.Color(color) } },
    vertexShader: /* glsl */`
      attribute vec3 aPos; attribute vec2 aScale; attribute float aRot; attribute float aAlpha;
      varying vec2 vUv; varying float vAlpha;
      void main() {
        vUv = uv; vAlpha = aAlpha;
        vec4 mv = modelViewMatrix * vec4(aPos, 1.0);
        vec2 p = position.xy * aScale;
        float c = cos(aRot), s = sin(aRot);
        mv.xy += vec2(c * p.x - s * p.y, s * p.x + c * p.y);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap; uniform vec3 uColor;
      varying vec2 vUv; varying float vAlpha;
      void main() {
        vec4 t = texture2D(uMap, vUv);
        gl_FragColor = vec4(uColor * t.rgb, t.a * vAlpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(g, material);
  mesh.name = name;
  mesh.frustumCulled = false;
  mesh.userData.noAO = true;
  mesh.userData.noExport = true;
  return {
    mesh,
    color: material.uniforms.uColor.value,
    set(i, x, y, z, sx, sy, rot, alpha) {
      aPos.setXYZ(i, x, y, z);
      aScale.setXY(i, sx, sy);
      aRot.setX(i, rot);
      aAlpha.setX(i, alpha);
    },
    commit() { aPos.needsUpdate = aScale.needsUpdate = aRot.needsUpdate = aAlpha.needsUpdate = true; },
  };
}
