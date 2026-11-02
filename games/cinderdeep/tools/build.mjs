// Inlines every script into one self-contained HTML file: games/cinderdeep/dist/cinderdeep.html.
// Open that single file on a phone, AirDrop it, or host it anywhere.
//   node games/cinderdeep/tools/build.mjs            -> dist/cinderdeep.html
//   node games/cinderdeep/tools/build.mjs --fragment <out.html>
//      also writes a body-only variant (no <html>/<head>/<body> wrapper) for hosts that add their own.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let html = readFileSync(join(root, 'index.html'), 'utf8');

html = html.replace(/<script src="(js\/[\w.-]+\.js)"><\/script>/g, (_, src) => {
  const code = readFileSync(join(root, src), 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script>\n/* ${src} */\n${code}\n</script>`;
});
if (/<script src=/.test(html)) throw new Error('an external script was left un-inlined');
// The single file has no manifest, icons or service worker beside it, so drop the app-install hooks.
html = html.replace(/<!-- pwa[^>]*-->[\s\S]*?<!-- \/pwa -->\n?/g, '');
if (/manifest\.webmanifest|sw\.js/.test(html)) throw new Error('install hooks were left in the single-file build');

mkdirSync(join(root, 'dist'), { recursive: true });
const out = join(root, 'dist', 'cinderdeep.html');
writeFileSync(out, html);
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);

const i = process.argv.indexOf('--fragment');
if (i > 0 && process.argv[i + 1]) {
  const frag = html
    .replace(/<!doctype html>\s*/i, '')
    .replace(/<html[^>]*>\s*/i, '')
    .replace(/<\/html>\s*/i, '')
    .replace(/<head>\s*/i, '')
    .replace(/<\/head>\s*/i, '')
    .replace(/<body>\s*/i, '')
    .replace(/<\/body>\s*/i, '')
    .replace(/<meta charset="utf-8">\s*/i, '')
    .replace('<title>Cinderdeep</title>', '<title>Cinderdeep</title>\n<meta name="claude:viewport-fit-sides" content="cover">');
  writeFileSync(process.argv[i + 1], frag);
  console.log(`wrote ${process.argv[i + 1]} (${(frag.length / 1024).toFixed(0)} KB)`);
}
