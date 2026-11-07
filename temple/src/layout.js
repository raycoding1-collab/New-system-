// Site plan of Unkai-ji (metres; +z faces south, toward the approach stair and the sea of
// clouds; the mountain rises to the north behind the main hall).
export const LAYOUT = {
  terrace: { x0: -54, x1: 54, z0: -50, z1: 54, r: 10 },
  sanmon: [0, 42],
  hondo: [0, -20],
  pagoda: [-29, 8],
  shoro: [26, 24],
  temizuya: [-11, 30],
  incense: [0, 2],
  pond: { cx: 32, cz: -10, w: 30, d: 28 },
  bridge: { cx: 32.2, cz: -10.6, L: 13, ry: -0.86 },
  island: { x: 40.5, z: -17.5 },
  garden: { x0: -47, z0: -41, w: 27, d: 17.5 },
  path: { w: 3.8, z0: 53.6, z1: -5.8 },
  stair: { z0: 54, slope: 0.56, w: 5.2, bottom: -40 },
  // kept free of trees so the preset viewpoints look over the canopy, not through it: [x, z, radius]
  clearings: [[94, -84, 48], [52, 138, 30], [-60, 120, 20]],
};
