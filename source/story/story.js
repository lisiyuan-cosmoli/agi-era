(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 私密模式等情况下忽略 */ } }
};
/* 页面上的文字都在文字表里（source/story/strings.*.json），构建时按语言注入 */
const T = /*@@T@@*/{};
const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
function seeded(s) { return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function onScreen(el, fn, threshold = .1) {
  if (!('IntersectionObserver' in window)) { fn(true); return; }
  new IntersectionObserver(es => es.forEach(e => fn(e.isIntersecting)), { threshold }).observe(el);
}
/* 大半个元素（或大半屏）进入视野时算“看到了”，长元素也适用 */
function onMostlySeen(el, fn) {
  if (!('IntersectionObserver' in window)) { fn(true); return; }
  new IntersectionObserver(es => es.forEach(e => {
    const need = Math.min(e.boundingClientRect.height, innerHeight) * .6;
    fn(e.isIntersecting && e.intersectionRect.height >= need);
  }), { threshold: [0, .2, .4, .6, .8, 1] }).observe(el);
}
function fitCanvas(c) {
  const r = c.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1);
  c.width = Math.max(1, Math.round(r.width * d)); c.height = Math.max(1, Math.round(r.height * d));
  const x = c.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0);
  return { ctx: x, w: r.width, h: r.height };
}
const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}
let agiYear = null;

/* ---------- 自动演示：滑到哪一幕，就自动演一遍；想自己玩，随时接手 ---------- */
function scene(root, script, onHands) {
  let token = 0, done = false;
  const replay = root.querySelector('[data-replay]'), tryBtn = root.querySelector('[data-try]');
  const alive = my => my === token;
  const kit = my => ({
    wait: ms => new Promise((res, rej) => setTimeout(() => (alive(my) ? res() : rej(0)), reduce ? 0 : ms)),
    tween: (a, b, ms, fn) => new Promise((res, rej) => {
      if (reduce) { fn(b); res(); return; }
      const t0 = performance.now();
      const step = t => {
        if (!alive(my)) { rej(0); return; }
        const k = clamp((t - t0) / ms, 0, 1);
        fn(a + (b - a) * ease(k));
        if (k < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    })
  });
  async function play() {
    const my = ++token;
    root.classList.add('playing');
    try { await script(kit(my)); done = true; } catch (e) { /* 被打断 */ }
    if (alive(my)) root.classList.remove('playing');
  }
  function stop() { token++; root.classList.remove('playing'); }
  function hands() {
    stop(); done = true;
    root.classList.add('hands-on');
    if (tryBtn) tryBtn.setAttribute('aria-expanded', 'true');
    if (onHands) onHands();
  }
  if (replay) replay.addEventListener('click', () => {
    root.classList.remove('hands-on');
    if (tryBtn) tryBtn.setAttribute('aria-expanded', 'false');
    play();
  });
  if (tryBtn) tryBtn.addEventListener('click', () => {
    if (root.classList.contains('hands-on')) { root.classList.remove('hands-on'); tryBtn.setAttribute('aria-expanded', 'false'); }
    else hands();
  });
  if (!reduce) onMostlySeen(root, seen => {
    const playing = root.classList.contains('playing');
    if (seen && !done && !playing) play();
    else if (!seen && playing) stop();
  });
  return { hands, stop };
}

/* ---------- 顶部进度 ---------- */
const chs = $$('.ch');
const track = $('#track'), fill = $('#trackFill'), now = $('#trackNow');
const marks = chs.map((s, i) => {
  const a = document.createElement('a');
  a.className = 'track-stop';
  a.href = '#' + s.id;
  a.style.left = ((i + .5) / chs.length * 100) + '%';
  a.setAttribute('aria-label', fmt(T.track.stop, { n: i + 1, name: s.dataset.name }));
  track.appendChild(a);
  return a;
});
let tops = [];
function measure() { tops = chs.map(s => s.getBoundingClientRect().top + scrollY - innerHeight * .45); }
function progress() {
  const y = scrollY, n = chs.length, pos = i => (i + .5) / n;
  let f, cur = -1;
  if (y < tops[0]) f = pos(0) * clamp(y / Math.max(1, tops[0]), 0, 1);
  else {
    cur = n - 1;
    for (let i = 0; i < n - 1; i++) if (y < tops[i + 1]) { cur = i; break; }
    if (cur < n - 1) f = pos(cur) + (pos(cur + 1) - pos(cur)) * (y - tops[cur]) / (tops[cur + 1] - tops[cur]);
    else {
      const end = document.documentElement.scrollHeight - innerHeight;
      f = pos(cur) + (1 - pos(cur)) * clamp((y - tops[cur]) / Math.max(1, end - tops[cur]), 0, 1);
    }
  }
  fill.style.width = (clamp(f, 0, 1) * 100) + '%';
  marks.forEach((m, i) => {
    m.classList.toggle('passed', i < cur);
    m.classList.toggle('current', i === cur);
    if (i === cur) m.setAttribute('aria-current', 'step'); else m.removeAttribute('aria-current');
  });
  now.textContent = cur < 0 ? T.track.open : `${cur + 1} · ${chs[cur].dataset.name}`;
}
let ticking = false;
addEventListener('scroll', () => {
  if (!ticking) { ticking = true; requestAnimationFrame(() => { progress(); ticking = false; }); }
}, { passive: true });
addEventListener('load', () => { measure(); progress(); });
addEventListener('resize', () => { measure(); progress(); });
measure(); progress();

/* ---------- 楼里的 12 户人家（t：这件活大约什么时候能交给 AI；0=2022，40=今天，70=更强的 AI，100=AGI；K=可能一直留给人） ---------- */
const K = 999;
const PEOPLE = [
  [6, [25, 30, 38, 65, K]], [6, [20, 25, 85, 90, K]], [5, [8, 15, 45, 55, 80]], [5, [10, 55, 70, 80, 90]],
  [4, [15, 25, 30, 35, 72]], [4, [20, 30, 45, 85, K]], [3, [10, 25, 30, 50, 75]], [3, [5, 10, 50, 75, 88]],
  [2, [20, 30, 40, 60, 92]], [2, [10, 30, 45, 60, 85]], [1, [20, 35, 50, 68, K]], [1, [30, 50, 92, 95, K]]
].map(([floor, th], i) => [T.people[i][0], T.people[i][1], floor, th.map((v, k) => [T.people[i][2][k], v])]);
const aiCount = (p, lv) => p[3].filter(t => t[1] <= lv).length;

/* ---------- 画一栋楼（viewBox 360×430） ---------- */
function drawBuilding(svg, labels) {
  const g = el('g', { class: 'b-body' }, svg), fx = {};
  const fxG = (name, parent = g) => (fx[name] = el('g', { class: 'fx fx-' + name }, parent));
  const garden = fxG('garden');
  [[66, 22], [100, 18], [260, 20], [294, 24]].forEach(([x, y]) => {
    el('rect', { x: x - 2, y: y + 6, width: 4, height: 44 - y - 6, class: 'fx-garden-ink' }, garden);
    el('circle', { cx: x, cy: y, r: 10, class: 'fx-garden-tree' }, garden);
  });
  [[160, 36], [182, 34], [202, 37]].forEach(([x, y]) => {
    el('circle', { cx: x, cy: y - 7, r: 3.5, class: 'fx-garden-ink' }, garden);
    el('rect', { x: x - 3.5, y: y - 3, width: 7, height: 10, rx: 3, class: 'fx-garden-ink' }, garden);
  });
  const plat = fxG('platform');
  el('rect', { x: 100, y: 4, width: 160, height: 30, rx: 8 }, plat);
  el('text', { x: 180, y: 24, 'text-anchor': 'middle', class: 'fx-text', style: 'font-size:13.5px' }, plat).textContent = T.b.platform;
  el('rect', { x: 172, y: 34, width: 16, height: 10 }, plat);
  const pent = fxG('crack');
  el('rect', { x: 120, y: 6, width: 120, height: 38, rx: 6, style: 'fill:#ffc94d' }, pent);
  el('text', { x: 180, y: 30, 'text-anchor': 'middle', class: 'fx-text', style: 'fill:#3a2a00;font-size:12.5px' }, pent).textContent = T.b.top;
  el('rect', { x: 16, y: 44, width: 328, height: 8, rx: 3, class: 'b-roof' }, g);
  el('rect', { x: 24, y: 52, width: 312, height: 312, class: 'b-facade' }, g);
  for (let f = 1; f < 6; f++) el('line', { x1: 24, x2: 336, y1: 52 + f * 52, y2: 52 + f * 52, class: 'b-line' }, g);
  const units = PEOPLE.map((p, i) => {
    const x = i % 2 === 0 ? 36 : 184, y = 52 + (6 - p[2]) * 52 + 6;
    const u = el('g', { class: 'unit' }, g);
    el('rect', { x, y, width: 140, height: 40, rx: 6, class: 'u-win' }, u);
    const pips = [];
    if (labels) {
      u.setAttribute('tabindex', '0');
      u.setAttribute('role', 'button');
      u.setAttribute('aria-label', fmt(T.b.unit, { name: p[0], job: p[1], floor: p[2] }));
      const tx = el('text', { x: x + 10, y: y + 16 }, u);
      el('tspan', { class: 'u-name' }, tx).textContent = p[0];
      el('tspan', { class: 'u-job', dx: 5 }, tx).textContent = p[1];
      p[3].forEach((t, k) => pips.push(el('circle', { cx: x + 15 + k * 14, cy: y + 29, r: 4.3, class: 'pip' + (t[1] === K ? ' keep' : '') }, u)));
      const me = el('g', { class: 'u-me' }, u);
      el('rect', { x: x + 110, y: y + 5, width: 24, height: 15, rx: 7.5 }, me);
      el('text', { x: x + 122, y: y + 16, 'text-anchor': 'middle' }, me).textContent = T.b.me;
    } else {
      el('circle', { cx: x + 70, cy: y + 14, r: 6, class: 'av' }, u);
      el('rect', { x: x + 62, y: y + 22, width: 16, height: 18, rx: 7, class: 'av' }, u);
    }
    return { u, pips, p, i };
  });
  el('rect', { x: 24, y: 364, width: 312, height: 52, class: 'b-facade-2' }, g);
  const shop = el('g', { class: 'shop' }, g);
  el('rect', { x: 38, y: 380, width: 204, height: 32, rx: 4, class: 'shop-body' }, shop);
  for (let k = 0; k < 8; k++) el('path', { d: `M${34 + k * 27} 366 h27 v10 q-13.5 7 -27 0 z`, class: k % 2 ? 'awning-2' : 'awning' }, shop);
  el('text', { x: 140, y: 401, 'text-anchor': 'middle', class: 'shop-text' }, shop).textContent = labels ? T.b.shop : '';
  el('rect', { x: 262, y: 376, width: 44, height: 40, rx: 3, class: 'b-facade' }, g);
  const closed = fxG('closed');
  el('rect', { x: 84, y: 386, width: 112, height: 20, rx: 4 }, closed);
  el('text', { x: 140, y: 400.5, 'text-anchor': 'middle', class: 'fx-text', style: 'font-size:12px' }, closed).textContent = T.b.closed;
  el('rect', { x: 8, y: 416, width: 344, height: 8, rx: 2, class: 'b-ground' }, g);
  const sc = fxG('scaffold');
  [30, 330].forEach(x => el('line', { x1: x, x2: x, y1: 100, y2: 340 }, sc));
  [104, 156, 208, 260, 312].forEach(y => el('line', { x1: 22, x2: 338, y1: y, y2: y }, sc));
  const sign = el('g', { class: 'fx-sign' }, sc);
  el('rect', { x: 128, y: 170, width: 104, height: 24, rx: 6 }, sign);
  el('text', { x: 180, y: 186.5, 'text-anchor': 'middle', class: 'fx-text', style: 'font-size:12px' }, sign).textContent = T.b.patch;
  const crackG = el('g', { class: 'fx fx-crack' }, g);
  el('path', { d: 'M180 52 L172 100 L186 150 L174 200 L188 250 L176 300 L186 340 L180 364' }, crackG);
  const wires = el('g', { class: 'fx fx-platform' }, g);
  [80, 132, 184, 236, 288].forEach((y, k) => el('line', { x1: 180, y1: 44, x2: k % 2 ? 254 : 106, y2: y }, wires));
  const alarm = el('g', { class: 'fx fx-alarm' }, svg);
  el('circle', { cx: 180, cy: 30, r: 11 }, alarm);
  el('text', { x: 212, y: 35, class: 'fx-text', style: 'fill:var(--risk);font-size:13px' }, alarm).textContent = T.b.alarm;
  return { svg, units, shop, fx };
}
function paintLevel(b, lv) {
  let total = 0;
  b.units.forEach(({ u, pips, p }) => {
    const n = aiCount(p, lv);
    total += n;
    pips.forEach((c, k) => c.classList.toggle('on', p[3][k][1] <= lv));
    u.classList.toggle('ai', n >= 3);
  });
  return total;
}
const levelOfYear = y => (y <= 2022 ? (y - 2012) / 10 * 5 : 5 + (y - 2022) / 4 * 35);

/* ---------- 开场：夜里的楼，窗户一扇扇变蓝 ---------- */
const heroB = drawBuilding($('#heroBldg'), false), heroYear = $('#heroYear');
function heroAt(y) { paintLevel(heroB, levelOfYear(y)); heroYear.textContent = Math.floor(y); }
heroAt(2026);
if (!reduce) {
  const t0 = performance.now(), dur = 4200;
  const step = t => {
    const k = clamp((t - t0) / dur, 0, 1);
    heroAt(2012 + 14 * ease(k));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------- 1 时间轨道：站点等距，圆点按真实间隔移动，越走越快 ---------- */
const EVENTS = [2012, 2016, 2020, 2022, 2024, 2025, 2026].map((y, i) => [y, T.events[i][0], T.events[i][1]]);
const rail = $('#rail'), railFill = $('#railFill'), railCard = $('#railCard');
const railPos = i => (i / (EVENTS.length - 1)) * 100;
const railStops = EVENTS.map((e, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'rail-stop';
  b.style.left = railPos(i) + '%';
  b.setAttribute('aria-label', fmt(T.rail.stop, { year: e[0], title: e[1] }));
  b.innerHTML = `<span>${e[0]}</span>`;
  rail.appendChild(b);
  if (i > 0) {
    const gp = document.createElement('span');
    gp.className = 'rail-gap';
    gp.style.left = ((railPos(i - 1) + railPos(i)) / 2) + '%';
    const gap = e[0] - EVENTS[i - 1][0];
    gp.textContent = gap === 1 && T.rail.gap1 ? T.rail.gap1 : fmt(T.rail.gap, { n: gap });
    rail.appendChild(gp);
  }
  return b;
});
function railShow(i, fillTo) {
  const e = EVENTS[i], here = i === EVENTS.length - 1;
  railStops.forEach((b, k) => { b.classList.toggle('passed', k < i); b.classList.toggle('cur', k === i); });
  railFill.style.width = (fillTo === undefined ? railPos(i) : fillTo) + '%';
  railCard.innerHTML = `<span class="rail-year">${e[0]}</span><b>${here ? `<span class="here-tag">${T.rail.here}</span>` : ''}${e[1]}</b><p>${e[2]}</p>`;
}
railShow(EVENTS.length - 1);
const railScene = scene($('#railScene'), async ({ wait, tween }) => {
  railShow(0); await wait(1300);
  for (let i = 1; i < EVENTS.length; i++) {
    const years = EVENTS[i][0] - EVENTS[i - 1][0];
    await tween(railPos(i - 1), railPos(i), 380 * years, v => { railFill.style.width = v + '%'; });
    railShow(i);
    await wait(i === EVENTS.length - 1 ? 0 : 1100);
  }
});
railStops.forEach((b, i) => b.addEventListener('click', () => { railScene.hands(); railShow(i); }));

/* ---------- 你猜 AGI 哪年来 ---------- */
const agiBtns = $$('.agi-btn'), agiReply = $('#agiReply');
const agiTickText = y => (!y ? T.agi.tick : y > 2030 ? T.agi.tickLate : fmt(T.agi.tickYear, { y }));
function setAgi(y, speak) {
  agiYear = y;
  agiBtns.forEach(b => b.setAttribute('aria-pressed', String(y !== null && +b.dataset.year === y)));
  $$('[data-agi-tick]').forEach(n => { n.textContent = agiTickText(y); });
  timeSet(+timeRange.value);
  if (!speak) return;
  if (y === 0) agiReply.textContent = T.agi.never;
  else if (y > 2030) agiReply.textContent = T.agi.late;
  else agiReply.textContent = fmt(T.agi.year, { y });
}
agiBtns.forEach(b => b.addEventListener('click', () => {
  const y = +b.dataset.year;
  setAgi(y, true);
  store.set('fws-agi-year', String(y));
}));

/* ---------- 2 AI 敲门 ---------- */
const mainB = drawBuilding($('#mainBldg'), true);
const timeRange = $('#timeRange'), timeWhen = $('#timeWhen'), timeCount = $('#timeCount');
const resPanel = $('#resPanel'), bCap = $('#bCap');
const TOTAL = PEOPLE.length * 5;
let selected = 2, meIdx = null;
function whenText(v) {
  if (v < 12) return T.when[0];
  if (v < 30) return T.when[1];
  if (v <= 45) return T.when[2];
  if (v < 88) return T.when[3];
  return agiTickText(agiYear);
}
function sayLine(p, n) {
  const hasKeep = p[3].some(t => t[1] === K);
  let s = T.say.lines[n <= 1 ? 0 : n === 2 ? 1 : n === 3 ? 2 : 3];
  if (hasKeep && n >= 3) s += T.say.keep;
  return fmt(T.say.quote, { name: p[0], s });
}
function renderRes() {
  const lv = +timeRange.value;
  mainB.units.forEach(x => x.u.classList.toggle('sel', x.i === selected));
  if (selected === null) { resPanel.innerHTML = `<p class="res-say">${T.res.pick}</p>`; return; }
  const p = PEOPLE[selected], n = aiCount(p, lv), isMe = meIdx === selected;
  const items = p[3].map(t => {
    const st = t[1] === K ? ['keep', T.res.keep] : t[1] <= lv ? ['on', T.res.on] : ['', T.res.human];
    return `<li class="${st[0]}">${t[0]}<span>${st[1]}</span></li>`;
  }).join('');
  resPanel.innerHTML = `<h3>${p[0]}<small>${fmt(T.res.meta, { job: p[1], floor: p[2], n })}</small></h3>
    <ul class="res-tasks">${items}</ul><p class="res-say">${sayLine(p, n)}</p>
    <div class="row"><button type="button" class="btn ${isMe ? '' : 'line'}" id="isMe" aria-pressed="${isMe}">${isMe ? T.res.isMeOn : T.res.isMe}</button></div>`;
  $('#isMe').addEventListener('click', () => {
    meIdx = isMe ? null : selected;
    mainB.units.forEach(x => x.u.classList.toggle('me', x.i === meIdx));
    store.set('fws-me', meIdx === null ? '' : String(meIdx));
    renderRes();
    $('#q1More').textContent = meIdx === null ? T.res.q1 : fmt(T.res.q1Me, { job: PEOPLE[meIdx][1], name: PEOPLE[meIdx][0] });
  });
}
function timeSet(v) {
  const n = paintLevel(mainB, v);
  timeWhen.textContent = whenText(v);
  timeCount.innerHTML = fmt(T.time.count, { total: TOTAL, n });
  timeRange.value = v;
  timeRange.style.setProperty('--p', v + '%');
  timeRange.setAttribute('aria-valuetext', fmt(T.time.aria, { when: whenText(v), n }));
  renderRes();
}
const bScene = scene($('#bScene'), async ({ wait, tween }) => {
  const say = t => { bCap.innerHTML = t; };
  const lv = v => timeSet(Math.round(v));
  selected = null; timeSet(0);
  say(T.bScene[0]); await wait(1600);
  await tween(0, 40, 2600, lv);
  selected = 4; renderRes();
  say(T.bScene[1]); await wait(3600);
  await tween(40, 70, 2000, lv);
  selected = 3; renderRes();
  say(T.bScene[2]); await wait(3600);
  await tween(70, 100, 2000, lv);
  selected = 1; renderRes();
  say(T.bScene[3]); await wait(3800);
  await tween(100, 40, 1200, lv);
  selected = null; renderRes();
  say(T.bScene[4]);
});
timeRange.addEventListener('input', () => { bScene.hands(); timeSet(+timeRange.value); });
mainB.units.forEach(x => {
  const pick = () => { bScene.hands(); selected = x.i; renderRes(); bCap.textContent = sayLine(x.p, aiCount(x.p, +timeRange.value)); };
  x.u.addEventListener('click', pick);
  x.u.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
});
timeSet(40);

/* ---------- 3 多米诺 ---------- */
const doms = $$('.dom'), domPush = $('#domPush'), domReset = $('#domReset');
const domMsg = $('#domMsg'), barriers = $$('.barrier');
const guard = new Set();
let domRunning = false, domTimers = [], domDone = null;
const domLabel = i => doms[i].querySelector('.dom-label').textContent;
function domStand() {
  domTimers.forEach(clearTimeout); domTimers = [];
  domRunning = false;
  doms.forEach(d => d.classList.remove('fallen', 'lean', 'saved', 'shake'));
  domPush.disabled = false;
}
function guardSet(list) {
  guard.clear(); list.forEach(i => guard.add(i));
  barriers.forEach(b => b.setAttribute('aria-pressed', String(guard.has(+b.dataset.before))));
  doms.forEach((d, i) => d.classList.toggle('guarded', guard.has(i)));
}
function domFinish(blockedAt) {
  domRunning = false;
  domPush.disabled = false;
  domPush.textContent = T.dom.again;
  if (blockedAt < 0) domMsg.innerHTML = T.dom.all;
  else domMsg.innerHTML = fmt(T.dom.blocked, { label: domLabel(blockedAt), n: doms.length - blockedAt });
  if (domDone) { const f = domDone; domDone = null; f(); }
}
function domRun() {
  return new Promise(res => {
    domStand();
    domDone = res;
    domRunning = true;
    domPush.disabled = true;
    domMsg.textContent = T.dom.falling;
    const gap = reduce ? 0 : 360;
    let i = 0;
    const next = () => {
      doms[i].classList.add('fallen');
      if (guard.has(i + 1)) {
        doms[i].classList.add('lean');
        doms[i + 1].classList.add('shake');
        for (let k = i + 1; k < doms.length; k++) doms[k].classList.add('saved');
        domTimers.push(setTimeout(() => domFinish(i + 1), gap));
        return;
      }
      i++;
      if (i >= doms.length) { domTimers.push(setTimeout(() => domFinish(-1), gap)); return; }
      domTimers.push(setTimeout(next, gap));
    };
    if (gap) domTimers.push(setTimeout(next, 60)); else next();
  });
}
const domScene = scene($('#domScene'), async ({ wait }) => {
  guardSet([]); domStand();
  domMsg.textContent = T.dom.intro; await wait(1500);
  await domRun(); await wait(2800);
  domStand(); guardSet([3]);
  domMsg.innerHTML = T.dom.round2; await wait(2600);
  await domRun(); await wait(2400);
  domMsg.innerHTML = T.dom.end;
});
domPush.addEventListener('click', () => { domScene.hands(); domRun(); });
domReset.addEventListener('click', () => {
  domScene.hands(); domStand();
  domPush.textContent = T.dom.push;
  domMsg.textContent = T.dom.reset;
});
barriers.forEach(b => b.addEventListener('click', () => {
  domScene.hands();
  if (domRunning) { domMsg.innerHTML = T.dom.late; return; }
  const at = +b.dataset.before, list = [...guard];
  guardSet(guard.has(at) ? list.filter(x => x !== at) : list.concat(at));
  domStand();
  domPush.textContent = T.dom.push;
  domMsg.textContent = guard.size ? (guard.size === 1 && T.dom.placed1 ? T.dom.placed1 : fmt(T.dom.placed, { n: guard.size })) : T.dom.none;
}));

/* ---------- 4 楼里的钱怎么转 ---------- */
function makeFlow(svg, paths, kinds, layer) {
  const coins = [], per = 7;
  let vals = {}, on = false, last = 0;
  Object.keys(paths).forEach(k => {
    const len = paths[k].getTotalLength();
    for (let i = 0; i < per; i++) {
      const c = el('circle', { r: 4, class: 'coin ' + kinds[k] }, layer);
      c.style.opacity = 0;
      coins.push({ k, i, c, len, t: i / per });
    }
  });
  function tick(ts) {
    if (!on) return;
    const dt = last ? Math.min(50, ts - last) : 16;
    last = ts;
    coins.forEach(o => {
      const v = clamp(vals[o.k] || 0, 0, 1);
      if (o.i >= Math.round(v * per)) { o.c.style.opacity = 0; return; }
      o.t = (o.t + dt * (.00015 + .00018 * v)) % 1;
      const p = paths[o.k].getPointAtLength(o.t * o.len);
      o.c.setAttribute('cx', p.x.toFixed(1));
      o.c.setAttribute('cy', p.y.toFixed(1));
      o.c.style.opacity = 1;
    });
    requestAnimationFrame(tick);
  }
  if (!reduce) onScreen(svg, vis => {
    if (vis && !on) { on = true; last = 0; requestAnimationFrame(tick); } else if (!vis) on = false;
  });
  return v => {
    vals = v;
    Object.keys(paths).forEach(k => {
      const x = clamp(v[k] || 0, 0, 1);
      paths[k].style.strokeWidth = x <= .001 ? 0 : 1.5 + 11 * x;
      paths[k].style.opacity = x <= .001 ? 0 : .85;
    });
  };
}
function meter(m, top, max, v) {
  const h = clamp(v, 0, 1) * max;
  m.setAttribute('y', (top + max - h).toFixed(1));
  m.setAttribute('height', Math.max(2, h).toFixed(1));
}
const amount = a => T.flow.amount[a < .15 ? 0 : a < .4 ? 1 : a < .7 ? 2 : 3];
const flowRange = $('#flowRange'), flowPct = $('#flowPct'), flowMsg = $('#flowMsg'), socTogs = $$('#flowScene .tog');
const soc = { a: 0, share: false, public: false };
const socDraw = makeFlow($('#flowSvg'),
  { wage: $('#pWage'), spend: $('#pSpend'), ai: $('#pAI'), own: $('#pOwn'), tax: $('#pTax'), share: $('#pShare'), public: $('#pPublic') },
  { wage: 'c-wage', spend: 'c-spend', ai: 'c-ai', own: 'c-spend', tax: 'c-share', share: 'c-share', public: 'c-public' },
  $('#coins'));
function socText() {
  const { a, share, public: pub } = soc;
  if (a < .25 && !share && !pub) return T.flow.today;
  if (!share && !pub) return a < .6 ? T.flow.thin : T.flow.thinner;
  if (share && pub) return T.flow.both;
  if (share) return T.flow.share;
  return T.flow.public;
}
function socSet() {
  const a = soc.a, wage = 1 - .8 * a, ai = .08 + .9 * a, own = .3 * ai;
  const share = soc.share ? .55 * ai : 0, pub = soc.public ? .22 + .2 * a : 0;
  const spend = .9 * (wage + share) + .5 * pub;
  socDraw({ wage, spend, ai, own: own * 1.6, tax: share, share, public: pub });
  $('#tagOwn').style.opacity = own > .05 ? 1 : 0;
  $('#tagShare').style.opacity = $('#tagTax').style.opacity = share > 0 ? 1 : 0;
  $('#tagPublic').style.opacity = pub > 0 ? 1 : 0;
  $('#ownerG').style.opacity = .35 + .65 * clamp(a * 2.5, 0, 1);
  $('#govG').style.opacity = (soc.share || soc.public) ? 1 : .3;
  meter($('#mFirm'), 36, 64, spend + own);
  meter($('#mHome'), 286, 40, (wage + share + pub) / 1.2);
  meter($('#mOwn'), 178, 40, Math.max(0, ai - own - share));
  flowRange.value = Math.round(a * 100);
  flowPct.textContent = amount(a);
  flowRange.setAttribute('aria-valuetext', amount(a));
  flowRange.style.setProperty('--p', flowRange.value + '%');
  socTogs.forEach(b => b.setAttribute('aria-pressed', String(soc[b.dataset.k])));
  const t = socText();
  if (flowMsg.textContent !== t) flowMsg.textContent = t;
}
const flowScene = scene($('#flowScene'), async ({ wait, tween }) => {
  Object.assign(soc, { a: 0, share: false, public: false }); socSet(); await wait(2800);
  await tween(0, 1, 3800, v => { soc.a = v; socSet(); }); await wait(3200);
  soc.share = true; socSet(); await wait(3400);
  soc.public = true; socSet(); await wait(3400);
});
flowRange.addEventListener('input', () => { flowScene.hands(); soc.a = +flowRange.value / 100; socSet(); });
socTogs.forEach(b => b.addEventListener('click', () => { flowScene.hands(); soc[b.dataset.k] = !soc[b.dataset.k]; socSet(); }));
socSet();

/* ---------- 5 这栋楼的四种未来 ---------- */
const futB = drawBuilding($('#futBldg'), true);
futB.units.forEach(x => { x.u.removeAttribute('tabindex'); x.u.removeAttribute('role'); x.u.removeAttribute('aria-label'); x.u.style.cursor = 'default'; });
const fork = { dist: null, prep: null, ctrl: true };
const futOut = $('#futOut'), ctrlToggle = $('#ctrlToggle');
const FUT = T.fut;
const FLICK = [2, 5, 6, 9], DARK_D = [0, 2, 3, 4, 5, 6, 7, 8, 9, 11];
function futKey() {
  if (!fork.dist || !fork.prep) return null;
  return fork.dist === 'all' ? (fork.prep === 'early' ? 'A' : 'B') : (fork.prep === 'early' ? 'C' : 'D');
}
function futSet(endText) {
  const e = fork.ctrl ? futKey() : null, svg = futB.svg;
  ['A', 'B', 'C', 'D'].forEach(k => svg.classList.toggle('future-' + k, k === e));
  svg.classList.toggle('off', !fork.ctrl);
  futB.units.forEach(x => {
    x.u.classList.toggle('flick', e === 'B' && FLICK.includes(x.i));
    x.u.classList.toggle('dark', e === 'D' && DARK_D.includes(x.i));
    x.u.classList.toggle('ai', e !== 'D' && aiCount(x.p, 40) >= 3);
  });
  paintLevel(futB, 40);
  if (e === 'D') futB.units.forEach(x => x.u.classList.remove('ai'));
  futB.shop.classList.toggle('dark', e === 'D');
  $$('.switch').forEach(g => $$('.opt', g).forEach(o => {
    o.setAttribute('aria-pressed', String(fork[g.dataset.k] === o.dataset.v));
    o.disabled = !fork.ctrl;
  }));
  ctrlToggle.setAttribute('aria-pressed', String(fork.ctrl));
  futOut.classList.toggle('risk', !fork.ctrl);
  let tag, title, text;
  if (!fork.ctrl) [tag, title, text] = FUT.off;
  else if (e) [tag, title, text] = FUT[e];
  else if (endText) [tag, title, text] = endText;
  else if (fork.dist || fork.prep) [tag, title, text] = [FUT.oneMore[0], FUT.oneMore[1], FUT.oneMore[fork.dist ? 2 : 3]];
  else [tag, title, text] = FUT.none;
  futOut.innerHTML = `<span class="tag">${tag}</span><h3>${title}</h3><p>${text}</p>`;
}
const futScene = scene($('#futScene'), async ({ wait }) => {
  for (const [d, p] of [['all', 'early'], ['all', 'late'], ['few', 'early'], ['few', 'late']]) {
    Object.assign(fork, { dist: d, prep: p, ctrl: true }); futSet(); await wait(4200);
  }
  fork.ctrl = false; futSet(); await wait(3800);
  Object.assign(fork, { dist: null, prep: null, ctrl: true });
  futSet(FUT.end);
});
$$('.switch').forEach(g => $$('.opt', g).forEach(o => o.addEventListener('click', () => {
  futScene.hands(); fork[g.dataset.k] = o.dataset.v; futSet();
})));
ctrlToggle.addEventListener('click', () => { futScene.hands(); fork.ctrl = !fork.ctrl; futSet(); });
futSet();

/* ---------- 6 页签 ---------- */
const tabs = $$('.tab');
function selectTab(t, focus) {
  tabs.forEach(x => {
    const on = x === t;
    x.setAttribute('aria-selected', String(on));
    x.tabIndex = on ? 0 : -1;
    $('#' + x.getAttribute('aria-controls')).hidden = !on;
  });
  if (focus) t.focus();
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => selectTab(t));
  t.addEventListener('keydown', e => {
    let j = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % tabs.length;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i + tabs.length - 1) % tabs.length;
    if (e.key === 'Home') j = 0;
    if (e.key === 'End') j = tabs.length - 1;
    if (j !== null) { e.preventDefault(); selectTab(tabs[j], true); }
  });
});

/* ---------- 7 不同的存在 ---------- */
const far = $('#farCanvas');
const frnd = seeded(7), kinds = ['nat', 'nat', 'nat', 'enh', 'enh', 'ai', 'ai'];
const beings = Array.from({ length: 24 }, (_, i) => ({
  k: kinds[i % kinds.length], x: (i % 6 + .15 + frnd() * .7) / 6, y: (Math.floor(i / 6) + .15 + frnd() * .7) / 4,
  vx: (frnd() - .5) * .00005, vy: (frnd() - .5) * .00005
}));
let farView = fitCanvas(far), farOn = false, farLast = 0;
function farDraw() {
  const { ctx, w, h } = farView;
  if (!w) return;
  ctx.clearRect(0, 0, w, h);
  const pts = beings.map(b => [b.x * w, 14 + b.y * (h - 64)]), reach = Math.min(140, w * .3);
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#a7b1c6';
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    const dd = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
    if (dd < reach) {
      ctx.globalAlpha = .45 * (1 - dd / reach);
      ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[j][0], pts[j][1]); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  beings.forEach((b, i) => {
    const [x, y] = pts[i];
    ctx.beginPath();
    if (b.k === 'nat') { ctx.fillStyle = '#ffb44f'; ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); }
    else if (b.k === 'enh') { ctx.fillStyle = '#16213a'; ctx.strokeStyle = '#ffb44f'; ctx.lineWidth = 2.5; ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.lineWidth = 1; ctx.strokeStyle = '#a7b1c6'; }
    else { ctx.fillStyle = '#8ea2ff'; ctx.moveTo(x, y - 8); ctx.lineTo(x + 7, y); ctx.lineTo(x, y + 8); ctx.lineTo(x - 7, y); ctx.closePath(); ctx.fill(); }
  });
}
function farTick(ts) {
  if (!farOn) return;
  const dt = farLast ? Math.min(50, ts - farLast) : 16;
  farLast = ts;
  beings.forEach(b => {
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x < .03 || b.x > .97) b.vx *= -1;
    if (b.y < .02 || b.y > .98) b.vy *= -1;
  });
  farDraw();
  requestAnimationFrame(farTick);
}
farDraw();
addEventListener('resize', () => { farView = fitCanvas(far); farDraw(); });
if (!reduce) onScreen(far, vis => {
  if (vis && !farOn) { farOn = true; farLast = 0; requestAnimationFrame(farTick); } else if (!vis) farOn = false;
}, .05);

/* ---------- 90 秒短片：点了才加载 ---------- */
const shortDlg = $('#short'), shortVid = $('#shortVideo');
if (shortDlg && shortVid) {
  const openShort = () => {
    if (!shortVid.getAttribute('src')) { shortVid.poster = shortVid.dataset.poster; shortVid.src = shortVid.dataset.src; }
    if (shortDlg.showModal) { if (!shortDlg.open) shortDlg.showModal(); } else shortDlg.setAttribute('open', '');
    shortVid.play().catch(() => { /* 浏览器不让自动播放时，读者点一下播放键即可 */ });
  };
  const closeShort = () => { shortVid.pause(); if (shortDlg.close) shortDlg.close(); else shortDlg.removeAttribute('open'); };
  $$('[data-short]').forEach(b => b.addEventListener('click', openShort));
  $('.short-x', shortDlg).addEventListener('click', closeShort);
  shortDlg.addEventListener('close', () => shortVid.pause());
  shortDlg.addEventListener('click', e => { if (e.target === shortDlg) closeShort(); });
}

/* ---------- 记住读者的选择 ---------- */
const savedYear = store.get('fws-agi-year');
if (savedYear !== null && savedYear !== '' && !isNaN(+savedYear)) setAgi(+savedYear, true);
const savedMe = store.get('fws-me');
if (savedMe !== null && savedMe !== '' && !isNaN(+savedMe) && PEOPLE[+savedMe]) {
  meIdx = +savedMe;
  mainB.units.forEach(x => x.u.classList.toggle('me', x.i === meIdx));
  $('#q1More').textContent = fmt(T.res.q1Me, { job: PEOPLE[meIdx][1], name: PEOPLE[meIdx][0] });
  renderRes();
}
})();
