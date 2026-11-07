// The palette. Colours follow Japanese temple practice: shu-nuri vermilion lacquer on
// timber, white shikkui plaster, rokushō green window slats, ochre-tipped rafter ends,
// smoked-silver ibushi roof tiles, gilt fittings, and granite for every stone part.
import * as THREE from 'three';
import * as T from './textures.js';
import { patchMaterial } from './patch.js';

function rep(tex, r) { const t = tex.clone(); t.repeat.set(r, r); t.needsUpdate = true; return t; }

export function createPalette() {
  const wood = T.woodTextures(512);
  const lac = T.woodTextures(256, 0.28);
  const timber = T.woodTextures(512, 0.55);
  const grunge = T.grungeTexture(512);
  const plaster = T.plasterTexture(256);
  const stone = T.stoneTextures(512, 3);
  const tile = T.tileTextures();
  const copper = T.copperTextures();
  const door = T.doorTextures();
  const shoji = T.shojiTextures();
  const ishi = T.ishigakiTextures(1024);
  const bronze = T.bronzeTexture();

  const std = (o, patch = {}) => {
    const shadow = o.shadow; delete o.shadow;
    const noAO = o.noAO; delete o.noAO;
    const m = new THREE.MeshStandardMaterial(o);
    if (shadow) m.userData.shadow = shadow;
    if (noAO) m.userData.noAO = true;
    return patchMaterial(m, patch);
  };

  const P = {};
  // lacquered timber
  P.shu = std({ name: 'shu-vermilion', color: '#c8432a', map: rep(lac.map, 0.5), roughness: 0.58, roughnessMap: rep(grunge, 0.25), normalMap: rep(wood.normal, 0.5), normalScale: new THREE.Vector2(0.12, 0.12) });
  P.shuDim = std({ name: 'shu-shadow', color: '#9a3522', map: rep(lac.map, 0.5), roughness: 0.7 });
  P.lacquer = std({ name: 'black-lacquer', color: '#2a221d', map: rep(lac.map, 0.5), roughness: 0.4, roughnessMap: rep(grunge, 0.3) });
  P.wood = std({ name: 'weathered-keyaki', color: '#8a6a52', map: rep(timber.map, 0.45), roughness: 0.82, normalMap: rep(timber.normal, 0.45), normalScale: new THREE.Vector2(0.6, 0.6) });
  P.woodDark = std({ name: 'dark-timber', color: '#5a4434', map: rep(timber.map, 0.45), roughness: 0.85, normalMap: rep(timber.normal, 0.45), normalScale: new THREE.Vector2(0.5, 0.5) });
  P.hinoki = std({ name: 'hinoki', color: '#d8b48a', map: rep(timber.map, 0.6), roughness: 0.7, normalMap: rep(timber.normal, 0.6), normalScale: new THREE.Vector2(0.4, 0.4) });
  P.interior = std({ name: 'hall-interior', color: '#3a2a1f', map: rep(wood.map, 0.5), roughness: 0.75 }, { snow: 0 });
  P.green = std({ name: 'rokusho-green', color: '#3f8a6a', map: rep(lac.map, 0.8), roughness: 0.6 });
  P.ochre = std({ name: 'ochre-ends', color: '#f0c45a', roughness: 0.6, roughnessMap: rep(grunge, 1) });
  P.whiteEnd = std({ name: 'gofun-white', color: '#f4efe3', roughness: 0.65 });
  P.plaster = std({ name: 'shikkui-plaster', color: '#fbf6ec', map: rep(plaster, 0.5), roughness: 0.92 });
  P.door = std({ name: 'studded-door', color: '#cf462b', map: door.map, roughness: 0.6 });
  P.doorStuds = std({ name: 'door-studs', color: '#e6bd62', metalness: 1, roughness: 0.3, alphaMap: door.studs, alphaTest: 0.5, shadow: 'receive' });

  // roofs
  P.tile = std({ name: 'ibushi-tile', color: '#9aa1aa', map: rep(tile.map, 1), normalMap: rep(tile.normal, 1), normalScale: new THREE.Vector2(1.1, 1.1), roughness: 0.42, metalness: 0.25, roughnessMap: rep(grunge, 0.15) }, { snow: 1.25, roof: true });
  P.tileRound = std({ name: 'round-tile', color: '#5c636d', roughness: 0.36, metalness: 0.3, roughnessMap: rep(grunge, 0.4) }, { snow: 1.1, roof: true });
  P.ridge = std({ name: 'ridge-tile', color: '#4f555e', roughness: 0.4, metalness: 0.3, roughnessMap: rep(grunge, 0.4) }, { roof: true });
  P.copper = std({ name: 'doban-copper', color: '#ffffff', map: rep(copper.map, 0.4), normalMap: rep(copper.normal, 0.4), roughness: 0.62, metalness: 0.35 }, { snow: 1.25, roof: true });
  P.copperTrim = std({ name: 'copper-trim', color: '#6fa894', roughness: 0.6, metalness: 0.4 });

  // metals
  P.gold = std({ name: 'gilt', color: '#f2c463', metalness: 1, roughness: 0.28, roughnessMap: rep(grunge, 1) });
  P.giltStatue = std({ name: 'gilt-statue', color: '#e8b452', metalness: 1, roughness: 0.34, roughnessMap: rep(grunge, 0.6), emissive: '#3a2406', emissiveIntensity: 0 }, { snow: 0 });
  P.bronze = std({ name: 'bell-bronze', color: '#ffffff', map: rep(bronze, 0.6), metalness: 0.85, roughness: 0.42, roughnessMap: rep(grunge, 0.5) });
  P.bronzeDark = std({ name: 'lantern-bronze', color: '#6b5a44', metalness: 0.85, roughness: 0.45, roughnessMap: rep(grunge, 0.6) });
  P.iron = std({ name: 'iron', color: '#2b2a29', metalness: 0.7, roughness: 0.55 });

  // stone
  P.stone = std({ name: 'granite', color: '#d4cfc4', map: rep(stone.map, 0.35), normalMap: rep(stone.normal, 0.35), normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.88 });
  P.stoneDark = std({ name: 'granite-weathered', color: '#a7a196', map: rep(stone.map, 0.5), normalMap: rep(stone.normal, 0.5), roughness: 0.92 });
  P.stoneMoss = std({ name: 'mossy-stone', color: '#9aa085', map: rep(stone.map, 0.45), normalMap: rep(stone.normal, 0.45), roughness: 0.95 });
  P.ishigaki = std({ name: 'ishigaki-wall', color: '#c9c4b8', map: rep(ishi.map, 0.11), normalMap: rep(ishi.normal, 0.11), normalScale: new THREE.Vector2(1.2, 1.2), roughness: 0.93 });

  // light-emitting parts
  P.shoji = std({ name: 'shoji-paper', color: '#ffffff', map: rep(shoji.map, 0.55), emissive: '#ffb469', emissiveMap: rep(shoji.emissive, 0.55), emissiveIntensity: 0, roughness: 0.9, shadow: 'receive' }, { snow: 0 });
  P.glow = std({ name: 'lantern-fire', color: '#fff1d6', emissive: '#ffa64d', emissiveIntensity: 0.3, roughness: 0.8, shadow: 'receive', noAO: true }, { snow: 0 });
  P.paper = std({ name: 'chochin-paper', color: '#ffffff', map: T.chochinTextures(), emissive: '#ff7a3d', emissiveMap: T.chochinTextures(), emissiveIntensity: 0, roughness: 0.75, side: THREE.DoubleSide }, { snow: 0 });
  P.candle = std({ name: 'candle', color: '#fff8ea', emissive: '#ffcf8a', emissiveIntensity: 2, roughness: 0.6, shadow: 'none', noAO: true }, { snow: 0 });

  // textiles, cut-outs, plants used by buildings
  P.lattice = std({ name: 'koshi-lattice', color: '#2a211b', map: T.latticeTexture(8), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 }, { snow: 0 });
  P.latticeShu = std({ name: 'koshi-vermilion', color: '#c8452b', map: T.latticeTexture(6), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 }, { snow: 0 });
  P.rope = std({ name: 'hemp-rope', color: '#d9c899', roughness: 0.95, map: rep(grunge, 2) });
  P.ropeRed = std({ name: 'red-cord', color: '#c33a2c', roughness: 0.85 });
  P.bamboo = std({ name: 'bamboo', color: '#b8b06a', roughness: 0.5, map: rep(wood.map, 0.8) });
  P.bambooDry = std({ name: 'dry-bamboo', color: '#cdb985', roughness: 0.6, map: rep(wood.map, 0.8) });
  P.black = std({ name: 'black', color: '#151413', roughness: 0.8 });
  P.shadowVoid = std({ name: 'interior-dark', color: '#0d0a08', roughness: 1 }, { snow: 0 });
  P.waterBasin = std({ name: 'basin-water', color: '#20343a', roughness: 0.05, metalness: 0.1, shadow: 'receive' }, { snow: 0 });

  P.plaqueSanmon = std({ name: 'plaque-sanmon', color: '#ffffff', map: T.plaqueTexture('霧峰山'), roughness: 0.45, metalness: 0.1 }, { snow: 0 });
  P.plaqueHondo = std({ name: 'plaque-hondo', color: '#ffffff', map: T.plaqueTexture('雲海寺'), roughness: 0.45, metalness: 0.1 }, { snow: 0 });

  P.textures = { wood, grunge, stone, ishi };
  return P;
}

// Materials whose glow follows the time of day.
export function setLampLevel(P, k) {
  P.shoji.emissiveIntensity = 1.6 * k;
  P.glow.emissiveIntensity = 0.25 + 6 * k;
  P.paper.emissiveIntensity = 0.05 + 2.2 * k;
  P.candle.emissiveIntensity = 1.5 + 3 * k;
  P.giltStatue.emissiveIntensity = 0.2 + 1.2 * k;
}
