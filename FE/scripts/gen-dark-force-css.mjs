import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.join(__dirname, '..', 'src');

const WHITE_BG = /background(-color)?:\s*(#ffffff|#fff\b|white)\b/i;
const inputLike =
  /search|input|select|textarea|dropdown__trigger|filter|toolbar__pill|tab(?!le)|chip|toggle__thumb|switch__thumb|ghost|btn--secondary|btn-secondary|secondary|outline|reset|pill|search|field|modal__field/i;
const skipLike =
  /btn-primary|submit|cta|gradient|hero-cta|notif-switch|pill-btn|dash-btn--primary|announce-submit|--primary\b|orange|danger-btn|success-btn/i;

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory() && ent.name !== 'node_modules') walk(p, acc);
    else if (ent.name.endsWith('.css') && !p.includes('dark-theme-force')) acc.push(p);
  }
  return acc;
}

function isSafeSelector(s) {
  if (!s || s.includes('@') || s.includes('html') || s.includes('*') || s.includes(':root')) {
    return false;
  }
  if (/app-select/i.test(s)) return false;
  if (skipLike.test(s)) return false;
  if (!s.includes('.') && !s.includes('#')) return false;
  if (/^button$/i.test(s)) return false;
  return true;
}

const sel = new Set();
for (const file of walk(srcRoot)) {
  const css = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const block of css.split('}')) {
    if (!WHITE_BG.test(block)) continue;
    const m = block.match(/([^{]+)\{/);
    if (!m) continue;
    m[1].split(',').forEach((raw) => {
      const s = raw.trim();
      if (isSafeSelector(s)) sel.add(s);
    });
  }
}

const inputSels = [...sel].filter((s) => inputLike.test(s));
const cardSels = [...sel].filter((s) => !inputLike.test(s));

const prefix = (s) =>
  s
    .split(',')
    .map((p) => `html.dark ${p.trim()}`)
    .join(', ');

const mk = (sels, prop, val) =>
  sels.map((s) => `${prefix(s)} {\n  ${prop}: ${val} !important;\n}`).join('\n\n');

let out = '/* AUTO-GENERATED dark mode surface overrides — no white backgrounds */\n\n';
out += 'html.dark ::-webkit-scrollbar-thumb {\n  background: var(--surface-border) !important;\n}\n\n';
out += 'html.dark ::-webkit-scrollbar-thumb:hover {\n  background: var(--text-muted) !important;\n}\n\n';
out += mk(cardSels, 'background', 'var(--bg-card)');
out += '\n\n';
out += mk(inputSels, 'background', 'var(--surface-muted)');

fs.writeFileSync(path.join(srcRoot, 'styles', 'dark-theme-force.css'), out);
console.log('card', cardSels.length, 'input', inputSels.length, 'total', sel.size);
