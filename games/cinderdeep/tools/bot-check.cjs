// Plays the whole game with the autopilot, headless and without drawing, once per seed, and reports
// how each run went. Run from the repository root:
//   node games/cinderdeep/tools/bot-check.cjs            (seeds 1-10)
//   node games/cinderdeep/tools/bot-check.cjs 1 50       (seeds 1-50)
//   node games/cinderdeep/tools/bot-check.cjs 3 3 room=hall&dash=1   (one seed, starting in a room)
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

(async () => {
  const from = parseInt(process.argv[2] || '1', 10), to = parseInt(process.argv[3] || String(from + 9), 10);
  const extra = process.argv[4] ? '&' + process.argv[4] : '';
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Fonts come from Google; offline they are skipped and the game falls back to serif text.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const runs = [];
  for (let seed = from; seed <= to; seed++) {
    await page.goto(`http://127.0.0.1:${port}/index.html?bot&sim&seed=${seed}${extra}`);
    await page.waitForFunction(() => window.__botResult, null, { timeout: 600000, polling: 250 });
    const r = await page.evaluate(() => window.__botResult);
    runs.push({ seed, ...r });
    const status = r.ok ? (r.hits ? `finished, ${r.hits} hit(s)` : 'finished, no hits') : `stuck in ${r.room} at "${r.goal}"`;
    console.log(`seed ${String(seed).padStart(3)}  ${status.padEnd(34)} game time ${r.time}s  deaths ${r.deaths}  replans ${r.restarts}`);
    for (const h of r.hitLog || []) console.log('            hit: ' + h);
    if (!r.ok || r.restarts) for (const l of (r.log || []).slice(-6)) console.log('            log: ' + l);
  }
  const ok = runs.filter((r) => r.ok), clean = ok.filter((r) => !r.hits);
  console.log(`\n${ok.length}/${runs.length} finished, ${clean.length}/${runs.length} without a single hit.`);
  if (errors.length) console.log('page errors:\n' + [...new Set(errors)].join('\n'));
  await browser.close();
  server.close();
  process.exit(clean.length === runs.length ? 0 : 1);
})();
