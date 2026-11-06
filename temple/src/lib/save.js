// Saving a generated file (the .glb export).
//
// In an ordinary browser tab this is a normal download. Inside a sandboxed host frame such
// as a Claude artifact, pages may not start downloads themselves; the host's `downloads`
// capability offers the file to the viewer instead. That capability accepts .zip but not
// .glb, so there the model travels inside a zip (deflated when the browser can).

const framed = (() => { try { return window.self !== window.top; } catch { return true; } })();
let hostPromise = null;

// Resolves the host's downloads namespace, or null when there is no such host (or it says no).
export function hostDownloads() {
  if (hostPromise) return hostPromise;
  hostPromise = new Promise((resolve) => {
    if (!framed) { resolve(null); return; }
    const t0 = performance.now();
    const tick = () => {
      const c = window.claude;
      if (c && typeof c.use === 'function') {
        Promise.resolve(c.use('downloads')).then((ns) => resolve(ns || null), () => resolve(null));
        return;
      }
      if (performance.now() - t0 > 10000) { resolve(null); return; }
      setTimeout(tick, 250);
    };
    tick();
  });
  return hostPromise;
}

// True when we are inside a host that manages downloads (so a null namespace means "not here").
export const inManagedHost = () => !!(window.claude && typeof window.claude.use === 'function');

export async function saveFile(blob, filename) {
  const dl = await hostDownloads();
  if (dl) {
    const zip = await zipOne(filename, blob);
    const zipName = filename.replace(/\.[^.]+$/, '') + '.zip';
    const res = await dl.save({ filename: zipName, data: zip });
    return { name: zipName, size: zip.size, status: res && res.status };
  }
  if (inManagedHost()) throw Object.assign(new Error('Downloads are not available in this view'), { code: 'unavailable' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return { name: filename, size: blob.size, status: 'saved' };
}

// ------------------------------------------------------------------ a one-file zip
let CRC_TABLE = null;
function crc32(bytes) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export async function zipOne(name, blob) {
  const data = new Uint8Array(await blob.arrayBuffer());
  const crc = crc32(data);
  let body = data, method = 0;
  if (typeof CompressionStream === 'function') {
    try {
      const stream = new Blob([data]).stream().pipeThrough(new CompressionStream('deflate-raw'));
      const packed = new Uint8Array(await new Response(stream).arrayBuffer());
      if (packed.length < data.length) { body = packed; method = 8; }
    } catch { /* store uncompressed */ }
  }
  const fname = new TextEncoder().encode(name);
  const d = new Date();
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const local = new DataView(new ArrayBuffer(30));
  local.setUint32(0, 0x04034b50, true);
  local.setUint16(4, 20, true);
  local.setUint16(6, 0x0800, true); // UTF-8 names
  local.setUint16(8, method, true);
  local.setUint16(10, time, true);
  local.setUint16(12, date, true);
  local.setUint32(14, crc, true);
  local.setUint32(18, body.length, true);
  local.setUint32(22, data.length, true);
  local.setUint16(26, fname.length, true);
  local.setUint16(28, 0, true);
  const central = new DataView(new ArrayBuffer(46));
  central.setUint32(0, 0x02014b50, true);
  central.setUint16(4, 20, true);
  central.setUint16(6, 20, true);
  central.setUint16(8, 0x0800, true);
  central.setUint16(10, method, true);
  central.setUint16(12, time, true);
  central.setUint16(14, date, true);
  central.setUint32(16, crc, true);
  central.setUint32(20, body.length, true);
  central.setUint32(24, data.length, true);
  central.setUint16(28, fname.length, true);
  // extra, comment, disk, attributes and local-header offset are all zero
  const cdOffset = 30 + fname.length + body.length;
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, 1, true);
  end.setUint16(10, 1, true);
  end.setUint32(12, 46 + fname.length, true);
  end.setUint32(16, cdOffset, true);
  return new Blob([local, fname, body, central, fname, end], { type: 'application/zip' });
}
