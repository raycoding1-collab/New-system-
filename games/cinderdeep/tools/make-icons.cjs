// Draws the app icons (the Wick's candle head on soot) and writes them to games/cinderdeep/icons/.
// Uses the Chromium that Playwright drives. Run: node games/cinderdeep/tools/make-icons.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'icons');
const SIZES = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true],
  ['apple-touch-icon.png', 180, true],
];

function draw(size, maskable) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const s = size / 512;
  // Soot background with a warm glow behind the flame
  g.fillStyle = '#06070c';
  g.fillRect(0, 0, size, size);
  const glow = g.createRadialGradient(256 * s, 190 * s, 0, 256 * s, 190 * s, 300 * s);
  glow.addColorStop(0, 'rgba(255,170,80,0.55)');
  glow.addColorStop(0.35, 'rgba(255,120,50,0.18)');
  glow.addColorStop(1, 'rgba(255,90,30,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, size, size);
  // Maskable icons keep everything inside the central 80% safe zone.
  const k = maskable ? 0.78 : 0.86;
  g.translate(256 * s, 270 * s);
  g.scale(s * k, s * k);
  // Cloak shoulders
  g.fillStyle = '#151a2c';
  g.beginPath();
  g.moveTo(-150, 230); g.quadraticCurveTo(-150, 90, -70, 60); g.lineTo(70, 60); g.quadraticCurveTo(150, 90, 150, 230); g.closePath();
  g.fill();
  // Scarf
  g.strokeStyle = '#b5432a'; g.lineWidth = 26; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-60, 70); g.quadraticCurveTo(-140, 90, -190, 150); g.stroke();
  // Candle head
  const r = 34;
  g.fillStyle = '#eadcbf';
  g.beginPath();
  g.moveTo(-90 + r, -110); g.arcTo(90, -110, 90, 70, r); g.arcTo(90, 70, -90, 70, r); g.arcTo(-90, 70, -90, -110, r); g.arcTo(-90, -110, 90, -110, r);
  g.fill();
  g.fillStyle = '#c4b28b';
  g.fillRect(-90, -80, 26, 140);
  g.fillStyle = '#f7eedb';
  g.beginPath(); g.ellipse(4, -104, 84, 18, 0, 0, Math.PI * 2); g.fill();
  // Wax drip
  g.fillStyle = '#eadcbf';
  g.beginPath(); g.moveTo(90, -40); g.quadraticCurveTo(100, 20, 86, 40); g.quadraticCurveTo(76, 10, 74, -40); g.fill();
  // Eyes
  g.fillStyle = '#17121b';
  g.beginPath(); g.ellipse(-22, -20, 15, 30, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(32, -20, 14, 28, 0, 0, Math.PI * 2); g.fill();
  // Wick and flame
  g.strokeStyle = '#1b1416'; g.lineWidth = 9;
  g.beginPath(); g.moveTo(2, -118); g.lineTo(8, -150); g.stroke();
  g.fillStyle = '#ff8a2a';
  g.beginPath(); g.moveTo(-34, -150); g.bezierCurveTo(-34, -205, 0, -230, 18, -290); g.bezierCurveTo(38, -230, 48, -205, 48, -150); g.arc(7, -150, 41, 0, Math.PI); g.fill();
  g.fillStyle = '#fff1c2';
  g.beginPath(); g.moveTo(-14, -150); g.quadraticCurveTo(8, -215, 16, -228); g.quadraticCurveTo(30, -190, 28, -150); g.arc(7, -150, 21, 0, Math.PI); g.fill();
  return c.toDataURL('image/png');
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  for (const [name, size, maskable] of SIZES) {
    const url = await page.evaluate(`(${draw.toString()})(${size}, ${maskable})`);
    fs.writeFileSync(path.join(OUT, name), Buffer.from(url.split(',')[1], 'base64'));
    console.log('wrote icons/' + name);
  }
  await browser.close();
})();
