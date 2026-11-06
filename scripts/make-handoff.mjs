// Builds dist/Shardfall_Gemini_Handoff.md: the brief in docs/GEMINI_HANDOFF.md followed by the current source,
// so the copy handed to Gemini always matches the code. Usage: npm run handoff
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(join(root, f), 'utf8');

const files = [
  ['package.json', 'json'],
  ['capacitor.config.json', 'json'],
  ['electron/main.js', 'js'],
  ['android/app/src/main/java/com/truckkun69/shardfall/MainActivity.java', 'java'],
  ['android/app/src/main/AndroidManifest.xml', 'xml'],
  ['android/app/build.gradle', 'groovy'],
  ['android/variables.gradle', 'groovy'],
  ['.github/workflows/build.yml', 'yaml'],
  ['scripts/vendor.mjs', 'js'],
  ['web/vendor/fonts.css', 'css'],
  ['web/index.html', 'html'],
];

let commit = 'unknown';
try {
  commit = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim();
  if (execSync('git status --porcelain', { cwd: root }).toString().trim()) commit += ' + uncommitted changes';
} catch {}

let out = read('docs/GEMINI_HANDOFF.md')
  .replace(/^<!--.*?-->\n/s, '')
  .replace('{{COMMIT}}', commit)
  .replace('{{DATE}}', new Date().toISOString().slice(0, 10));

out += '\n---\n\n# Appendix: source files\n';
for (const [f, lang] of files) {
  out += `\n## \`${f}\`\n\n\`\`\`\`${lang}\n${read(f).trimEnd()}\n\`\`\`\`\n`;
}
out += '\n*(Not included: `web/vendor/three.min.js`, which is unmodified three.js r128, plus binary fonts and icons, and the stock Capacitor Gradle files.)*\n';

mkdirSync(join(root, 'dist'), { recursive: true });
const dest = join(root, 'dist', 'Shardfall_Gemini_Handoff.md');
writeFileSync(dest, out);
console.log(`handoff: ${dest} (${Math.round(out.length / 1024)} KB, commit ${commit})`);
