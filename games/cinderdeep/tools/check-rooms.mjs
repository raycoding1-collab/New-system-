// Validates the room maps: equal row widths, no overlapping rooms, and every opening on a room's edge
// leads into an open tile of the neighbouring room. Run: node games/cinderdeep/tools/check-rooms.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../js/rooms.js', import.meta.url), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(src + '\n;globalThis.__R = { ROOMS, ROOM_ORDER };', ctx);
const { ROOMS, ROOM_ORDER } = ctx.__R;

let errors = 0;
const fail = (m) => { errors++; console.log('  FAIL ' + m); };
const solid = (c) => c === '#' || c === 'B' || c === 'G';

for (const id of ROOM_ORDER) {
  const r = ROOMS[id];
  r.map.forEach((row, y) => { if (row.length !== r.w) fail(`${id} row ${y} is ${row.length} wide, expected ${r.w}`); });
}

// Overlap check
for (let i = 0; i < ROOM_ORDER.length; i++) for (let j = i + 1; j < ROOM_ORDER.length; j++) {
  const a = ROOMS[ROOM_ORDER[i]], b = ROOMS[ROOM_ORDER[j]];
  if (a.wx < b.wx + b.w && a.wx + a.w > b.wx && a.wy < b.wy + b.h && a.wy + a.h > b.wy) fail(`${a.id} overlaps ${b.id}`);
}

function roomAt(wx, wy) {
  for (const id of ROOM_ORDER) {
    const r = ROOMS[id];
    if (wx >= r.wx && wx < r.wx + r.w && wy >= r.wy && wy < r.wy + r.h) return r;
  }
  return null;
}

const links = new Set();
for (const id of ROOM_ORDER) {
  const r = ROOMS[id];
  const edge = (lx, ly, dx, dy) => {
    const c = r.map[ly][lx];
    if (solid(c)) return;
    const wx = r.wx + lx + dx, wy = r.wy + ly + dy;
    const n = roomAt(wx, wy);
    if (!n) { fail(`${id} (${lx},${ly}) opens onto nothing`); return; }
    const nc = n.map[wy - n.wy][wx - n.wx];
    if (solid(nc)) fail(`${id} (${lx},${ly}) opens onto rock in ${n.id}`);
    links.add(`${id} -> ${n.id}`);
  };
  for (let y = 0; y < r.h; y++) { edge(0, y, -1, 0); edge(r.w - 1, y, 1, 0); }
  for (let x = 0; x < r.w; x++) { edge(x, 0, 0, -1); edge(x, r.h - 1, 0, 1); }
}

console.log([...links].sort().join('\n'));
const starts = ROOM_ORDER.flatMap((id) => ROOMS[id].map.join('').includes('@') ? [id] : []);
if (starts.length !== 1) fail('expected exactly one start (@), found ' + starts.length);
console.log(errors ? `\n${errors} problem(s)` : '\nAll rooms line up.');
process.exit(errors ? 1 : 0);
