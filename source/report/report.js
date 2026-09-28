/* 共同未来 · 研究报告：阅读进度、目录跟随、点引用编号就地看出处 */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;

  /* 阅读进度和目录高亮 */
  const bar = $('.progress');
  const links = $$('.toc a[href^="#"]');
  const secs = [...new Set(links.map(a => a.getAttribute('href').slice(1)))]
    .map(id => document.getElementById(id)).filter(Boolean);
  let queued = false;
  function update() {
    queued = false;
    const max = root.scrollHeight - innerHeight;
    if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
    let cur = '';
    for (const s of secs) if (s.getBoundingClientRect().top < innerHeight * 0.35) cur = s.id;
    links.forEach(a => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + cur)));
  }
  const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  update();

  /* 手机上点了目录里的章节，就把目录收起来 */
  $$('.toc-mob a').forEach(a => a.addEventListener('click', () => { a.closest('details').open = false; }));

  /* 点引用编号：就地弹出出处，不用跳到文末 */
  const tip = $('#tip');
  if (!tip) return;
  const tipNo = $('.tip-no', tip), tipBody = $('.tip-body', tip), tipMore = $('.tip-more', tip);
  let openA = null;
  $$('.cite a').forEach(a => a.setAttribute('aria-expanded', 'false'));

  function hide(focusBack) {
    if (!openA) return;
    tip.hidden = true;
    openA.setAttribute('aria-expanded', 'false');
    if (focusBack) openA.focus();
    openA = null;
  }
  function show(a) {
    const id = a.getAttribute('href').slice(1);
    const ref = document.getElementById(id);
    const text = ref && $('.ref-text', ref);
    if (!text) return false;
    const again = openA === a;
    hide();
    if (again) return true;
    tipNo.textContent = a.getAttribute('aria-label') || a.textContent;
    tipBody.innerHTML = text.innerHTML;
    tipMore.setAttribute('href', '#' + id);
    tip.hidden = false;
    if (innerWidth > 600) {
      const r = a.getBoundingClientRect();
      const w = tip.offsetWidth, h = tip.offsetHeight;
      const left = Math.max(16, Math.min(r.left + r.width / 2 - w / 2, root.clientWidth - w - 16));
      const below = r.bottom + 10 + h < innerHeight || r.top < h + 20;
      tip.style.left = left + scrollX + 'px';
      tip.style.top = (below ? r.bottom + 10 : r.top - h - 10) + scrollY + 'px';
    } else {
      tip.style.left = '';
      tip.style.top = '';
    }
    a.setAttribute('aria-expanded', 'true');
    openA = a;
    tip.focus({ preventScroll: true });
    return true;
  }

  document.addEventListener('click', e => {
    const a = e.target.closest('.cite a');
    if (a) {
      if (show(a)) e.preventDefault();
      return;
    }
    if (openA && !e.target.closest('#tip')) hide();
  });
  $('.tip-x', tip).addEventListener('click', () => hide(true));
  tipMore.addEventListener('click', () => hide());
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hide(true); });
  addEventListener('resize', () => hide());
})();
