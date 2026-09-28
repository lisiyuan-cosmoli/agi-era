(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 私密模式等情况下忽略 */ } }
};
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
  a.setAttribute('aria-label', `第 ${i + 1} 章：${s.dataset.name}`);
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
  now.textContent = cur < 0 ? '开场' : `${cur + 1} · ${chs[cur].dataset.name}`;
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
  ['陈工', '程序员', 6, [['写代码', 25], ['写测试', 30], ['查 bug', 38], ['设计整个系统', 65], ['出了事故负责', K]]],
  ['王姐', '护工', 6, [['记录体征', 20], ['提醒吃药', 25], ['应对突发情况', 85], ['翻身、护理', 90], ['陪老人聊天', K]]],
  ['小周', '客服', 5, [['回答常见问题', 8], ['查订单', 15], ['处理投诉', 45], ['安抚情绪', 55], ['特殊情况拍板', 80]]],
  ['大海', '货车司机', 5, [['规划路线', 10], ['高速上开车', 55], ['城市里开车', 70], ['装卸货', 80], ['处理路上的意外', 90]]],
  ['林然', '剪辑师', 4, [['加字幕、配乐', 15], ['挑素材', 25], ['粗剪', 30], ['调色、特效', 35], ['读懂客户要什么', 72]]],
  ['苏老师', '中学老师', 4, [['出题、批改', 20], ['备课', 30], ['答疑', 45], ['管好一个班', 85], ['关心每个学生', K]]],
  ['阿敏', '会计', 3, [['记账', 10], ['报税', 25], ['做报表', 30], ['审核', 50], ['给老板出主意', 75]]],
  ['张哥', '外卖骑手', 3, [['接单、派单', 5], ['规划路线', 10], ['处理差评', 50], ['送餐', 75], ['上楼交到手里', 88]]],
  ['小吴', '研究员', 2, [['查文献', 20], ['分析数据', 30], ['写论文初稿', 40], ['设计实验', 60], ['决定研究什么', 92]]],
  ['小芳', '仓库分拣员', 2, [['扫码登记', 10], ['盘点', 30], ['分拣', 45], ['搬运', 60], ['处理破损件', 85]]],
  ['刘医生', '医生', 1, [['写病历', 20], ['看影像片子', 35], ['辅助诊断', 50], ['定治疗方案', 68], ['陪病人、签字负责', K]]],
  ['老马', '维修师傅', 1, [['报价', 30], ['判断故障', 50], ['上门修理', 92], ['爬高下低', 95], ['和住户沟通', K]]]
];
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
  el('text', { x: 180, y: 24, 'text-anchor': 'middle', class: 'fx-text', style: 'font-size:13.5px' }, plat).textContent = '大平台 · 规则由我定';
  el('rect', { x: 172, y: 34, width: 16, height: 10 }, plat);
  const pent = fxG('crack');
  el('rect', { x: 120, y: 6, width: 120, height: 38, rx: 6, style: 'fill:#ffc94d' }, pent);
  el('text', { x: 180, y: 30, 'text-anchor': 'middle', class: 'fx-text', style: 'fill:#3a2a00;font-size:12.5px' }, pent).textContent = '少数人的顶层';
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
      u.setAttribute('aria-label', `${p[0]}，${p[1]}，${p[2]} 楼`);
      el('text', { x: x + 10, y: y + 16, class: 'u-name' }, u).textContent = p[0];
      el('text', { x: x + 10 + p[0].length * 12 + 5, y: y + 16, class: 'u-job' }, u).textContent = p[1];
      p[3].forEach((t, k) => pips.push(el('circle', { cx: x + 15 + k * 14, cy: y + 29, r: 4.3, class: 'pip' + (t[1] === K ? ' keep' : '') }, u)));
      const me = el('g', { class: 'u-me' }, u);
      el('rect', { x: x + 110, y: y + 5, width: 24, height: 15, rx: 7.5 }, me);
      el('text', { x: x + 122, y: y + 16, 'text-anchor': 'middle' }, me).textContent = '你';
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
  el('text', { x: 140, y: 401, 'text-anchor': 'middle', class: 'shop-text' }, shop).textContent = labels ? '楼下小馆 · 营业中' : '';
  el('rect', { x: 262, y: 376, width: 44, height: 40, rx: 3, class: 'b-facade' }, g);
  const closed = fxG('closed');
  el('rect', { x: 84, y: 386, width: 112, height: 20, rx: 4 }, closed);
  el('text', { x: 140, y: 400.5, 'text-anchor': 'middle', class: 'fx-text', style: 'font-size:12px' }, closed).textContent = '暂停营业';
  el('rect', { x: 8, y: 416, width: 344, height: 8, rx: 2, class: 'b-ground' }, g);
  const sc = fxG('scaffold');
  [30, 330].forEach(x => el('line', { x1: x, x2: x, y1: 100, y2: 340 }, sc));
  [104, 156, 208, 260, 312].forEach(y => el('line', { x1: 22, x2: 338, y1: y, y2: y }, sc));
  const sign = el('g', { class: 'fx-sign' }, sc);
  el('rect', { x: 128, y: 170, width: 104, height: 24, rx: 6 }, sign);
  el('text', { x: 180, y: 186.5, 'text-anchor': 'middle', class: 'fx-text', style: 'font-size:12px' }, sign).textContent = '修修补补中';
  const crackG = el('g', { class: 'fx fx-crack' }, g);
  el('path', { d: 'M180 52 L172 100 L186 150 L174 200 L188 250 L176 300 L186 340 L180 364' }, crackG);
  const wires = el('g', { class: 'fx fx-platform' }, g);
  [80, 132, 184, 236, 288].forEach((y, k) => el('line', { x1: 180, y1: 44, x2: k % 2 ? 254 : 106, y2: y }, wires));
  const alarm = el('g', { class: 'fx fx-alarm' }, svg);
  el('circle', { cx: 180, cy: 30, r: 11 }, alarm);
  el('text', { x: 212, y: 35, class: 'fx-text', style: 'fill:var(--risk);font-size:13px' }, alarm).textContent = '系统失灵';
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
const EVENTS = [
  [2012, 'AI 学会“看图”', '能从照片里认出猫和狗。'],
  [2016, '下围棋赢了世界冠军', '靠“感觉”的事，AI 也能赢过人。'],
  [2020, '写出像人写的文章', '给它开个头，它就能接着往下写。'],
  [2022, '会聊天的 AI 来了', '很快就有上亿人用上了它。'],
  [2024, '一句话生成视频', '光影和镜头，像真的拍出来的。'],
  [2025, '数学奥赛拿到金牌水平', '也开始自己写代码、操作电脑。'],
  [2026, 'AI 独立解开 80 年前的数学难题', '它自己找到了埃尔德什 1946 年一个猜想的反例。']
];
const rail = $('#rail'), railFill = $('#railFill'), railCard = $('#railCard');
const railPos = i => (i / (EVENTS.length - 1)) * 100;
const railStops = EVENTS.map((e, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'rail-stop';
  b.style.left = railPos(i) + '%';
  b.setAttribute('aria-label', `${e[0]} 年：${e[1]}`);
  b.innerHTML = `<span>${e[0]}</span>`;
  rail.appendChild(b);
  if (i > 0) {
    const gp = document.createElement('span');
    gp.className = 'rail-gap';
    gp.style.left = ((railPos(i - 1) + railPos(i)) / 2) + '%';
    gp.textContent = (e[0] - EVENTS[i - 1][0]) + ' 年';
    rail.appendChild(gp);
  }
  return b;
});
function railShow(i, fillTo) {
  const e = EVENTS[i], here = i === EVENTS.length - 1;
  railStops.forEach((b, k) => { b.classList.toggle('passed', k < i); b.classList.toggle('cur', k === i); });
  railFill.style.width = (fillTo === undefined ? railPos(i) : fillTo) + '%';
  railCard.innerHTML = `<span class="rail-year">${e[0]}</span><b>${here ? '<span class="here-tag">你在这里</span>' : ''}${e[1]}</b><p>${e[2]}</p>`;
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
const agiTickText = y => (!y ? 'AGI' : y > 2030 ? 'AGI（2030 后？）' : `AGI（${y}？）`);
function setAgi(y, speak) {
  agiYear = y;
  agiBtns.forEach(b => b.setAttribute('aria-pressed', String(y !== null && +b.dataset.year === y)));
  $$('[data-agi-tick]').forEach(n => { n.textContent = agiTickText(y); });
  timeSet(+timeRange.value);
  if (!speak) return;
  if (y === 0) agiReply.textContent = '也有可能。不过就算没有 AGI，今天的 AI 已经足够改变很多行业。';
  else if (y > 2030) agiReply.textContent = '好，就当它来得晚一些。就算晚几年，要提前准备的事情一样多。';
  else agiReply.textContent = `好，就按 ${y} 年。往下看，到那时这栋楼会是什么样子。`;
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
  if (v < 12) return '2022 年';
  if (v < 30) return '2024 年';
  if (v <= 45) return '今天（2026）';
  if (v < 88) return '更强的 AI';
  return agiTickText(agiYear);
}
function sayLine(p, n) {
  const hasKeep = p[3].some(t => t[1] === K);
  let s = n <= 1 ? '我的活，大部分还得我自己来。'
    : n === 2 ? '有两件活 AI 已经能做了，确实省了不少事。'
    : n === 3 ? '一大半的活 AI 都能干了。老板开始问我：你还能做点什么别的？'
    : '几乎所有活 AI 都能做了。剩下那一点，撑得起我的工资吗？';
  if (hasKeep && n >= 3) s += '好在有些事，大家还是希望由人来做。';
  return `${p[0]}：“${s}”`;
}
function renderRes() {
  const lv = +timeRange.value;
  mainB.units.forEach(x => x.u.classList.toggle('sel', x.i === selected));
  if (selected === null) { resPanel.innerHTML = '<p class="res-say">点楼里任意一户，看看这家人的活。</p>'; return; }
  const p = PEOPLE[selected], n = aiCount(p, lv), isMe = meIdx === selected;
  const items = p[3].map(t => {
    const st = t[1] === K ? ['keep', '可能一直留给人'] : t[1] <= lv ? ['on', 'AI 已经能做'] : ['', '还得靠人'];
    return `<li class="${st[0]}">${t[0]}<span>${st[1]}</span></li>`;
  }).join('');
  resPanel.innerHTML = `<h3>${p[0]}<small>${p[1]} · 住 ${p[2]} 楼 · AI 能做 ${n}/5 件活</small></h3>
    <ul class="res-tasks">${items}</ul><p class="res-say">${sayLine(p, n)}</p>
    <div class="row"><button type="button" class="btn ${isMe ? '' : 'line'}" id="isMe" aria-pressed="${isMe}">${isMe ? '✓ 这一户最像我' : '这一户最像我'}</button></div>`;
  $('#isMe').addEventListener('click', () => {
    meIdx = isMe ? null : selected;
    mainB.units.forEach(x => x.u.classList.toggle('me', x.i === meIdx));
    store.set('fws-me', meIdx === null ? '' : String(meIdx));
    renderRes();
    $('#q1More').textContent = meIdx === null ? '你的活里，哪一件最难交给 AI？只剩这一件时，它撑得起你的收入吗？'
      : `你选了${PEOPLE[meIdx][1]}${PEOPLE[meIdx][0]}那一户。你的活里，哪一件最难交给 AI？只剩这一件时，它撑得起你的收入吗？`;
  });
}
function timeSet(v) {
  const n = paintLevel(mainB, v);
  timeWhen.textContent = whenText(v);
  timeCount.innerHTML = `楼里 ${TOTAL} 件活，AI 能做 <b>${n}</b> 件`;
  timeRange.value = v;
  timeRange.style.setProperty('--p', v + '%');
  timeRange.setAttribute('aria-valuetext', `${whenText(v)}，AI 能做 ${n} 件活`);
  renderRes();
}
const bScene = scene($('#bScene'), async ({ wait, tween }) => {
  const say = t => { bCap.innerHTML = t; };
  const lv = v => timeSet(Math.round(v));
  selected = null; timeSet(0);
  say('2022 年：楼里的活，几乎都还是人在做。'); await wait(1600);
  await tween(0, 40, 2600, lv);
  selected = 4; renderRes();
  say('<b>到了今天</b>，左边一列坐在电脑前的人家，窗户先变蓝了。剪辑师林然的 5 件活，AI 已经能做 4 件。'); await wait(3600);
  await tween(40, 70, 2000, lv);
  selected = 3; renderRes();
  say('<b>更强的 AI</b>：司机大海开车的活，也能交给 AI 了。要到现场的活，开始变了。'); await wait(3600);
  await tween(70, 100, 2000, lv);
  selected = 1; renderRes();
  say('<b>到了 AGI</b>：剩下的多半是照顾、信任和承担责任，比如护工王姐陪老人聊天。'); await wait(3800);
  await tween(100, 40, 1200, lv);
  selected = null; renderRes();
  say('回到今天。点任意一户，看看这家人的活。');
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
  domPush.textContent = '再推一次';
  if (blockedAt < 0) domMsg.innerHTML = '<b>全倒了。</b>两户人家的变化，一路传到了楼下的小馆、银行，连电梯都修不起了。';
  else domMsg.innerHTML = `<b>挡住了！</b>压力停在了“${domLabel(blockedAt)}”前面，后面 ${doms.length - blockedAt} 块都还立着。`;
  if (domDone) { const f = domDone; domDone = null; f(); }
}
function domRun() {
  return new Promise(res => {
    domStand();
    domDone = res;
    domRunning = true;
    domPush.disabled = true;
    domMsg.textContent = '倒下去了……';
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
  domMsg.textContent = '八块多米诺已经立好。第一块是 AI。推！'; await wait(1500);
  await domRun(); await wait(2800);
  domStand(); guardSet([3]);
  domMsg.innerHTML = '再来一次。这次提前放一块<b>挡板</b>：失业以后，收入不断档。'; await wait(2600);
  await domRun(); await wait(2400);
  domMsg.innerHTML = '挡板要在倒下之前就放好。点“自己试试”，放几块挡板推推看。';
});
domPush.addEventListener('click', () => { domScene.hands(); domRun(); });
domReset.addEventListener('click', () => {
  domScene.hands(); domStand();
  domPush.textContent = '推倒第一块';
  domMsg.textContent = '都扶起来了。可以换几块挡板试试。';
});
barriers.forEach(b => b.addEventListener('click', () => {
  domScene.hands();
  if (domRunning) { domMsg.innerHTML = '<b>来不及了。</b>多米诺已经在倒了。挡板要在倒下之前放好。'; return; }
  const at = +b.dataset.before, list = [...guard];
  guardSet(guard.has(at) ? list.filter(x => x !== at) : list.concat(at));
  domStand();
  domPush.textContent = '推倒第一块';
  domMsg.textContent = guard.size ? `放好了 ${guard.size} 块挡板。现在推一次试试。` : '挡板都拿走了。';
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
const amount = a => (a < .15 ? '很少' : a < .4 ? '一些' : a < .7 ? '很多' : '大部分');
const flowRange = $('#flowRange'), flowPct = $('#flowPct'), flowMsg = $('#flowMsg'), socTogs = $$('#flowScene .tog');
const soc = { a: 0, share: false, public: false };
const socDraw = makeFlow($('#flowSvg'),
  { wage: $('#pWage'), spend: $('#pSpend'), ai: $('#pAI'), own: $('#pOwn'), tax: $('#pTax'), share: $('#pShare'), public: $('#pPublic') },
  { wage: 'c-wage', spend: 'c-spend', ai: 'c-ai', own: 'c-spend', tax: 'c-share', share: 'c-share', public: 'c-public' },
  $('#coins'));
function socText() {
  const { a, share, public: pub } = soc;
  if (a < .25 && !share && !pub) return '今天：工资是大多数住户最主要的收入。公司发工资，住户拿去消费，钱又回到公司。';
  if (!share && !pub) return a < .6
    ? 'AI 接手的活越来越多，工资这条管道开始变细，更多的钱流向了 AI 公司和平台。'
    : '工资这条管道细得快断了。钱并没有消失，它流向了 AI 公司和平台。住户手里没钱，东西再便宜也买不了多少，公司的客人也少了。';
  if (share && pub) return '两条新管道都接上了。住户的日子稳住了，公司也重新有了客人。修管道，就是让 AI 带来的好处流到每户人家。';
  if (share) return '接上一条新管道：AI 带来的收益通过税和公共基金变成分红，回到住户手里。钱从哪来、谁来管，都要认真设计。';
  return '公共服务让住房、看病、养老更便宜，住户的压力小了一些。可收入的缺口还在，只靠这一条管道还不够。';
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
const FUT = {
  A: ['分给大家 · 提前准备', '软着陆', '楼顶多了一个小花园。大家一周工作三四天，AI 带来的收益变成分红和更好的公共服务，回到每户人家。楼下小馆天天有人来。'],
  B: ['分给大家 · 出了事再补', '反复阵痛', '楼里总在修修补补。每来一轮新技术，就有几户人家先断了收入，过一两年才被接住。大家都不太敢做长远打算。'],
  C: ['少数人拿走 · 提前准备', '被照顾，但说不上话', '每户人家都有基本保障，灯都亮着。可楼顶挂着大平台的招牌：接什么活、拿多少钱、用什么工具，都由它说了算。'],
  D: ['少数人拿走 · 出了事再补', '撕裂', '楼顶越来越亮，楼里越来越暗。小馆关了门，楼道里的争吵越来越多，大家越来越难坐下来一起商量。']
};
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
  if (!fork.ctrl) [tag, title, text] = ['前提失效', '失控', '如果最关键的 AI 行动已经没人能叫停，这两个开关可能都扳不动了。所以“管得住”是其他一切选择的前提。'];
  else if (e) [tag, title, text] = FUT[e];
  else if (endText) [tag, title, text] = endText;
  else if (fork.dist || fork.prep) [tag, title, text] = ['还差一个开关', '再扳另一个开关', fork.dist ? '财富怎么分已经选了。社会什么时候开始准备？' : '准备的时机已经选了。AI 带来的财富，怎么分？'];
  else [tag, title, text] = ['还没选', '扳动两个开关', '这栋楼会变成什么样子，取决于你的选择。'];
  futOut.innerHTML = `<span class="tag">${tag}</span><h3>${title}</h3><p>${text}</p>`;
}
const futScene = scene($('#futScene'), async ({ wait }) => {
  for (const [d, p] of [['all', 'early'], ['all', 'late'], ['few', 'early'], ['few', 'late']]) {
    Object.assign(fork, { dist: d, prep: p, ctrl: true }); futSet(); await wait(4200);
  }
  fork.ctrl = false; futSet(); await wait(3800);
  Object.assign(fork, { dist: null, prep: null, ctrl: true });
  futSet(['轮到你', '你想让这栋楼变成哪一种？', '点“自己试试”，扳一扳这两个开关。']);
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
  $('#q1More').textContent = `你选了${PEOPLE[meIdx][1]}${PEOPLE[meIdx][0]}那一户。你的活里，哪一件最难交给 AI？只剩这一件时，它撑得起你的收入吗？`;
  renderRes();
}
})();
