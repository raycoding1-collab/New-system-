// New System: the hero's live controls, the gate readout, and the small behaviours around them.
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

// --- Entrances: each part reveals once as it enters. The hidden state only exists once this runs. ---
if ('IntersectionObserver' in window) {
  document.documentElement.classList.add('motion');
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
  document.querySelectorAll('[data-reveal], [data-wipe], [data-fill]').forEach((el) => io.observe(el));
}

// --- The live thing: stretch and space the headline, and watch the two-line rule judge it. ---
const title = document.getElementById('hero-title');
const stretch = document.getElementById('stretch');
const tracking = document.getElementById('tracking');
const stretchOut = document.getElementById('stretch-out');
const trackingOut = document.getElementById('tracking-out');
const gate = document.querySelector('.hero__chip--gate');
const gateOut = document.getElementById('gate-out');
const verdict = document.getElementById('gate-verdict');
const reset = document.getElementById('reset');

function countLines() {
  const lineHeight = parseFloat(getComputedStyle(title).fontSize) * 0.86;
  let lines = 0;
  for (const el of title.querySelectorAll('[data-line]')) {
    lines += Math.max(1, Math.round(el.getBoundingClientRect().height / lineHeight));
  }
  return lines;
}

function judge() {
  const lines = countLines();
  const pass = lines <= 2;
  gate.dataset.state = pass ? 'pass' : 'fail';
  gateOut.textContent = `${lines} lines`;
  verdict.textContent = pass ? 'Pass' : 'Fail';
}

function applyType() {
  const s = Number(stretch.value);
  const t = Number(tracking.value);
  title.style.fontStretch = `${s}%`;
  title.style.letterSpacing = `${t}em`;
  stretchOut.textContent = `${s}%`;
  trackingOut.textContent = `${t < 0 ? '−' : ''}${Math.abs(t).toFixed(2)}em`;
  reset.hidden = stretch.value === stretch.defaultValue && tracking.value === tracking.defaultValue;
  judge();
}

if (title && stretch && tracking) {
  stretch.addEventListener('input', applyType);
  tracking.addEventListener('input', applyType);
  reset.addEventListener('click', () => {
    stretch.value = stretch.defaultValue;
    tracking.value = tracking.defaultValue;
    applyType();
    stretch.focus();
  });
  window.addEventListener('resize', judge, { passive: true });
  document.fonts?.ready.then(judge);
}

// --- Names: one lit at a time, slowly enough to read along. ---
const names = [...document.querySelectorAll('.names__list .name')];
if (names.length) {
  let n = 0;
  names[0].classList.add('is-lit');
  if (!reduce.matches) {
    setInterval(() => {
      names[n].classList.remove('is-lit');
      n = (n + 1) % names.length;
      names[n].classList.add('is-lit');
    }, 3000);
  }
}

// --- Copy buttons: the label blurs through "Copied" and back instead of showing two words at once. ---
function swapLabel(button, text) {
  const label = button.querySelector('.btn__text');
  button.classList.add('is-swapping');
  setTimeout(() => {
    label.textContent = text;
    button.classList.remove('is-swapping');
  }, 100);
}

async function copy(text, button) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    return false;
  }
  swapLabel(button, 'Copied');
  clearTimeout(button._timer);
  button._timer = setTimeout(() => swapLabel(button, 'Copy'), 2000);
  return true;
}

for (const button of document.querySelectorAll('[data-copy]')) {
  button.addEventListener('click', async () => {
    const source = document.getElementById(button.dataset.copy);
    if (!(await copy(source.textContent, button))) {
      window.getSelection()?.selectAllChildren(source);
    }
  });
}

// --- The closing sentence: compose the command and copy it. ---
const form = document.getElementById('brief-form');
const input = document.getElementById('brief-input');
const note = document.getElementById('brief-note');
const noteDefault = note?.innerHTML;
let noteTimer;

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const words = input.value.trim().replace(/^a site for\s+/i, '');
  if (!words) { input.focus(); return; }
  const command = `/build-website a site for ${words}`;
  const copied = await copy(command, form.querySelector('.brief__go'));
  note.textContent = copied ? `Copied: ${command}` : `Copy this into Claude Code: ${command}`;
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => { note.innerHTML = noteDefault; }, 6000);
});

// --- The browser-check clip plays only while it is on screen, and never for reduced motion. ---
const clip = document.querySelector('.row__pic video');
if (clip && 'IntersectionObserver' in window && !reduce.matches) {
  new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) clip.play().catch(() => {});
      else clip.pause();
    }
  }, { threshold: 0.4 }).observe(clip);
}
