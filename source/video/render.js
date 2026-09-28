// 用无头浏览器逐帧渲染 short.html，再用 ffmpeg 合成 MP4。
//   node render.js preview 0 5.5 12 ...          → preview/*.png（看某几秒的画面）
//   node render.js full ../../assets/short.mp4   → 完整视频（带声音）
// 需要 ffmpeg；不在 PATH 里时，用环境变量 FFMPEG 指定路径。
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const ROOT = __dirname;
const FF = process.env.FFMPEG || 'ffmpeg';
const FPS = 30;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.js': 'text/javascript' };

function serve() {
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}

(async () => {
  const [mode, ...rest] = process.argv.slice(2);
  const server = await serve();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${server.address().port}/short.html`);
  await page.evaluate(() => window.ready);
  const dur = await page.evaluate(() => window.DUR);

  if (mode === 'preview') {
    fs.mkdirSync(path.join(ROOT, 'preview'), { recursive: true });
    for (const t of rest.map(Number)) {
      await page.evaluate(t => window.seek(t), t);
      await page.screenshot({ path: path.join(ROOT, 'preview', `t${String(t).padStart(5, '0')}.png`) });
    }
  } else if (mode === 'audio' || mode === 'full') {
    const t0 = Date.now();
    const n = await page.evaluate(() => window.renderAudio());
    const parts = [];
    for (let i = 0; i < n; i++) parts.push(Buffer.from(await page.evaluate(i => window.audioChunk(i), i), 'base64'));
    fs.writeFileSync(path.join(ROOT, 'raw.wav'), Buffer.concat(parts));
    // 两遍响度标准化：先测量，再按测量值线性调整到 -16 LUFS
    const m = spawnSync(FF, ['-hide_banner', '-i', 'raw.wav', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], { cwd: ROOT });
    const js = JSON.parse(String(m.stderr).match(/\{[^{}]*"input_i"[^{}]*\}/)[0]);
    const af = `loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${js.input_i}:measured_TP=${js.input_tp}:measured_LRA=${js.input_lra}:measured_thresh=${js.input_thresh}:offset=${js.target_offset}:linear=true`;
    const r = spawnSync(FF, ['-y', '-v', 'error', '-i', 'raw.wav', '-af', af, '-ar', '48000', 'music.wav'], { cwd: ROOT });
    if (r.status) throw new Error(String(r.stderr));
    console.log('loudness in:', js.input_i, 'LUFS, peak', js.input_tp, 'dBTP');
    console.log(`audio done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    if (mode === 'full') {
      const out = rest[0] || 'short.mp4', frames = Math.round(dur * FPS);
      const ff = spawn(FF, ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-i', 'music.wav',
        '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', '14', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2',
        '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', out], { cwd: ROOT, stdio: ['pipe', 'inherit', 'inherit'] });
      const done = new Promise((res, rej) => ff.on('close', c => (c ? rej(new Error('ffmpeg ' + c)) : res())));
      const t1 = Date.now();
      for (let f = 0; f < frames; f++) {
        await page.evaluate(t => window.seek(t), f / FPS);
        const buf = await page.screenshot({ type: 'png' });
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
        if (f % 150 === 0) console.log(`frame ${f}/${frames}  ${((Date.now() - t1) / 1000).toFixed(0)}s`);
      }
      ff.stdin.end();
      await done;
      console.log(`video done in ${((Date.now() - t1) / 1000).toFixed(0)}s → ${out}`);
    }
  }
  if (errors.length) console.log('page errors:', errors);
  await browser.close();
  server.close();
})().catch(e => { console.error(e); process.exit(1); });
