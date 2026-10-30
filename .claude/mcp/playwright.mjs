#!/usr/bin/env node
// Starts Playwright MCP (https://github.com/microsoft/playwright-mcp).
// On your own machine this is the upstream default: a visible Chrome window.
// In a Claude Code cloud session there is no display and no Chrome, so it runs
// the container's pre-installed Chromium headless instead (as root, so without
// Chromium's sandbox).
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const VERSION = '0.0.83';
const CLOUD_CHROMIUM = '/opt/pw-browsers/chromium';

const env = { ...process.env };
const args = ['-y', `@playwright/mcp@${VERSION}`];
if (env.CLAUDE_CODE_REMOTE === 'true') {
  args.push('--headless', '--no-sandbox');
  if (!env.PLAYWRIGHT_MCP_EXECUTABLE_PATH && existsSync(CLOUD_CHROMIUM)) {
    env.PLAYWRIGHT_MCP_EXECUTABLE_PATH = CLOUD_CHROMIUM;
  }
}

const win = process.platform === 'win32';
const child = spawn(win ? 'npx.cmd' : 'npx', [...args, ...process.argv.slice(2)], {
  env,
  stdio: 'inherit',
  shell: win,
});
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
