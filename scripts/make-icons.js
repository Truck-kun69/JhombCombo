// Renders the app icon, Android launcher icons and splash screens with headless Chromium.
// Usage: node scripts/make-icons.js   (needs the `playwright` package and a Chromium build)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const res = path.join(root, 'android/app/src/main/res');

// Gold shard crystal; `scale` is the fraction of the canvas the art fills, `bg` toggles the dark tile.
const page_html = `<!doctype html><body style="margin:0"><canvas id=c></canvas><script>
window.draw = function (w, h, scale, bg, round, title) {
  const c = document.getElementById('c'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.clearRect(0, 0, w, h);
  if (bg) {
    const grd = g.createRadialGradient(w/2, h*0.45, 0, w/2, h/2, Math.max(w, h)*0.7);
    grd.addColorStop(0, '#2a3156'); grd.addColorStop(1, '#0d1019');
    g.fillStyle = grd;
    if (round) { g.beginPath(); g.arc(w/2, h/2, w/2, 0, Math.PI*2); g.fill(); g.save(); g.clip(); } else g.fillRect(0, 0, w, h);
  }
  const s = Math.min(w, h) * scale, cx = w/2, cy = title ? h*0.44 : h/2;
  const P = (x, y) => [cx + x*s/2, cy + y*s/2];
  const poly = (pts, fill) => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(...P(...p)) : g.moveTo(...P(...p))); g.closePath(); g.fillStyle = fill; g.fill(); };
  // glow
  const gl = g.createRadialGradient(cx, cy, 0, cx, cy, s*0.6); gl.addColorStop(0, 'rgba(244,192,78,0.35)'); gl.addColorStop(1, 'rgba(244,192,78,0)');
  g.fillStyle = gl; g.fillRect(cx - s, cy - s, s*2, s*2);
  // main crystal facets
  poly([[0,-0.95],[0.42,-0.2],[0,0.95]], '#f4c04e');
  poly([[0,-0.95],[-0.42,-0.2],[0,0.95]], '#ffe39a');
  poly([[0,-0.95],[0.42,-0.2],[0.12,-0.1]], '#c98f1f');
  poly([[-0.42,-0.2],[0,0.95],[-0.12,0.1]], '#f8cf6a');
  // side shards
  poly([[-0.6,-0.35],[-0.42,0.15],[-0.72,0.55],[-0.84,0.05]], '#52cdf5');
  poly([[-0.6,-0.35],[-0.84,0.05],[-0.72,0.55]], '#2a8fb6');
  poly([[0.62,-0.1],[0.84,0.25],[0.66,0.7],[0.48,0.3]], '#52cdf5');
  poly([[0.62,-0.1],[0.48,0.3],[0.66,0.7]], '#9be4fb');
  if (bg && round) g.restore();
  if (title) {
    g.fillStyle = '#ece8dd'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '700 ' + Math.round(Math.min(w, h)*0.075) + 'px "Arial Black", Impact, sans-serif';
    g.fillText('SHARDFALL SURVIVORS', cx, h*0.44 + s*0.72);
  }
  return c.toDataURL('image/png');
};
</script>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(page_html);
  const save = async (file, ...args) => {
    const url = await page.evaluate((a) => window.draw(...a), args);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
  };

  await save(path.join(root, 'resources/icon.png'), 1024, 1024, 0.78, true, false);
  await save(path.join(root, 'web/icon.png'), 512, 512, 0.78, true, false);

  const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [d, k] of Object.entries(dens)) {
    const dir = path.join(res, 'mipmap-' + d);
    await save(path.join(dir, 'ic_launcher.png'), 48*k, 48*k, 0.78, true, false);
    await save(path.join(dir, 'ic_launcher_round.png'), 48*k, 48*k, 0.72, true, true);
    // adaptive foreground: 108dp canvas, art kept inside the 66dp safe zone
    await save(path.join(dir, 'ic_launcher_foreground.png'), 108*k, 108*k, 0.55, false, false);
  }

  for (const dir of fs.readdirSync(res).filter((n) => n.startsWith('drawable'))) {
    const f = path.join(res, dir, 'splash.png');
    if (!fs.existsSync(f)) continue;
    const b = fs.readFileSync(f); const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
    await save(f, w, h, 0.38, true, false, true);
  }
  await browser.close();
  console.log('icons + splash written');
})();
