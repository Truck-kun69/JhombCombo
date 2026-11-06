// Copies third-party runtime files into web/vendor so the game runs fully offline
// (desktop and Android builds can't rely on CDNs).
import { mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nm = join(root, 'node_modules');
const out = join(root, 'web', 'vendor');
mkdirSync(join(out, 'fonts'), { recursive: true });

copyFileSync(join(nm, 'three/build/three.min.js'), join(out, 'three.min.js'));

const fonts = [
  ['Barlow Condensed', 500, 'barlow-condensed/files/barlow-condensed-latin-500-normal.woff2'],
  ['Barlow Condensed', 600, 'barlow-condensed/files/barlow-condensed-latin-600-normal.woff2'],
  ['Barlow Condensed', 700, 'barlow-condensed/files/barlow-condensed-latin-700-normal.woff2'],
  ['Bungee', 400, 'bungee/files/bungee-latin-400-normal.woff2'],
];
let css = '';
for (const [family, weight, rel] of fonts) {
  const file = rel.split('/').pop();
  copyFileSync(join(nm, '@fontsource', rel), join(out, 'fonts', file));
  css += `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:swap;src:url(fonts/${file}) format('woff2')}\n`;
}
writeFileSync(join(out, 'fonts.css'), css);
console.log('vendor: three.js r128 + fonts copied to web/vendor');
