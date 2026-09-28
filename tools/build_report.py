#!/usr/bin/env python3
"""Build the research report pages from the Markdown sources. Standard library only.

report/report.zh.md → report/index.html      (中文网站)
report/report.en.md → en/report/index.html   (English site)

Each page is a single self-contained file that works offline. The Markdown
subset is small on purpose: #, ## and ### headings, paragraphs, "- " and
"1. " lists, "> " quotes, tables, **bold**, *italic*, [text](url) links and
[n] citations that point to the numbered reference list.
"""
from html import escape
from pathlib import Path
import re

from build_story import REPO_URL, site_url

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'source' / 'report'
OUT = ROOT / 'report'
ICON = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E"
        "%3Ccircle cx='15' cy='20' r='11' fill='none' stroke='%23f0a02e' stroke-width='3'/%3E"
        "%3Ccircle cx='26' cy='20' r='11' fill='none' stroke='%233657ff' stroke-width='3'/%3E%3C/svg%3E")

UI = {
    'zh': {
        'md': 'report.zh.md', 'out': 'report/index.html', 'url': 'report/', 'share': 'assets/share.png', 'html_lang': 'zh-CN',
        'other_url': '../en/report/index.html', 'other_label': 'English version →', 'other_lang': 'en', 'repo_label': 'GitHub 仓库 ↗',
        'split': ('，', True),
        'site_name': '共同未来', 'title': '研究报告 · {t}',
        'desc': '《AGI 时代下，人类如何生活？》的研究报告：每一章的结论、证据、还不知道的事，以及会让我们改判断的信号。',
        'skip': '跳到正文', 'back': '← 互动页面', 'toc': '目录',
        'minutes': '约 {n} 分钟读完', 'refs_count': '{n} 条参考资料',
        'refs': '参考资料', 'cite': '参考资料 {n}', 'up': '回到正文', 'fut_head': '未来',
        'parts': {'证据': 'ev', '还不知道': 'unk', '什么信号会让我们改判断': 'sig'},
        'tip_label': '出处', 'tip_close': '关闭', 'tip_more': '在参考资料中查看 ↓',
        'end_title': '去楼里看看',
        'end_text': '互动页面用一栋住着 12 户人家的楼，把这份报告里的问题演一遍，大约 10 分钟。',
        'end_btn': '打开互动页面 →',
        'footer': '共同未来 · 文字和图像采用 CC BY 4.0 许可，代码采用 MIT 许可。',
    },
    'en': {
        'md': 'report.en.md', 'out': 'en/report/index.html', 'url': 'en/report/', 'share': 'en/assets/share.png', 'html_lang': 'en',
        'other_url': '../../report/index.html', 'other_label': '中文版 →', 'other_lang': 'zh-CN', 'repo_label': 'GitHub repository ↗',
        'split': (' in the ', False),
        'site_name': 'Futures We Share', 'title': 'Research report · {t}',
        'desc': 'The research report behind “How Will Humans Live in the Age of AGI?”: for each chapter, the bottom line, the evidence, what we don’t know yet, and the signals that would change our minds.',
        'skip': 'Skip to content', 'back': '← Interactive page', 'toc': 'Contents',
        'minutes': 'About {n} min read', 'refs_count': '{n} references',
        'refs': 'References', 'cite': 'Reference {n}', 'up': 'Back to text', 'fut_head': 'Future',
        'parts': {'Evidence': 'ev', 'What we don’t know yet': 'unk', 'Signals that would change our minds': 'sig'},
        'tip_label': 'Source', 'tip_close': 'Close', 'tip_more': 'See in references ↓',
        'end_title': 'See it in the building',
        'end_text': 'The interactive page acts out the questions in this report in a building with 12 households. It takes about 10 minutes.',
        'end_btn': 'Open the interactive page →',
        'footer': 'Futures We Share · Text and images under CC BY 4.0; code under MIT.',
    },
}

REDIRECT = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Research report · How Will Humans Live in the Age of AGI?</title>
<meta http-equiv="refresh" content="0; url=../en/report/index.html">
<link rel="canonical" href="https://lisiyuan-cosmoli.github.io/agi-era/en/report/">
<style>body{margin:0;padding:40px 20px;font:17px/1.6 system-ui,sans-serif;background:#f4f6fa;color:#141a24}a{color:#2a45d8}</style>
</head>
<body>
<p>The English report has moved to <a href="../en/report/index.html">en/report/</a>.</p>
</body>
</html>
'''

BLOCK_START = re.compile(r'(#{1,3} |> |\||- |\d+\. )')


def fail(msg):
    raise SystemExit('build_report: ' + msg)


def blocks(text):
    """Split Markdown into (kind, value) blocks."""
    lines, out, i = text.split('\n'), [], 0
    while i < len(lines):
        line = lines[i].rstrip()
        if not line.strip():
            i += 1
            continue
        m = re.match(r'(#{1,3}) (.+)$', line)
        if m:
            out.append(('h%d' % len(m.group(1)), m.group(2).strip()))
            i += 1
        elif line.startswith('>'):
            buf = []
            while i < len(lines) and lines[i].startswith('>'):
                buf.append(lines[i][1:].strip())
                i += 1
            out.append(('quote', ' '.join(buf)))
        elif line.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].startswith('|'):
                rows.append([c.strip() for c in lines[i].strip().strip('|').split('|')])
                i += 1
            if len(rows) < 3 or not all(re.fullmatch(r':?-{3,}:?', c) for c in rows[1]):
                fail('a table needs a header row, a --- row and at least one body row')
            if any(len(r) != len(rows[0]) for r in rows[2:]):
                fail('table rows have different numbers of cells: ' + ' | '.join(rows[0]))
            out.append(('table', (rows[0], rows[2:])))
        elif line.startswith('- '):
            items = []
            while i < len(lines) and lines[i].startswith('- '):
                items.append(lines[i][2:].strip())
                i += 1
            out.append(('ul', items))
        elif re.match(r'\d+\. ', line):
            items = []
            while i < len(lines) and re.match(r'\d+\. ', lines[i]):
                items.append(tuple(lines[i].rstrip().split('. ', 1)))
                i += 1
            out.append(('ol', items))
        else:
            buf = []
            while i < len(lines) and lines[i].strip() and not BLOCK_START.match(lines[i]):
                buf.append(lines[i].strip())
                i += 1
            out.append(('p', ' '.join(buf)))
    return out


class Inline:
    """Inline Markdown. Counts citations so each one gets its own anchor."""

    def __init__(self, ui):
        self.ui, self.seen = ui, {}

    def __call__(self, text, cites=True):
        s = escape(text, quote=False)
        s = re.sub(r'\[([^\]]+)\]\((https?://[^)\s]+)\)', r'<a href="\2">\1</a>', s)
        if cites:
            s = re.sub(r'(?:\[\d+\])+', self.cite, s)
        elif re.search(r'\[\d+\]', s):
            fail('citation outside the text: ' + text)
        s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
        s = re.sub(r'(?<![*\w])\*(?![\s*])(.+?)(?<![\s*])\*(?![*\w])', r'<em>\1</em>', s)
        if '*' in s or '](' in s:
            fail('unhandled Markdown in: ' + text)
        return s

    def cite(self, m):
        links = []
        for n in map(int, re.findall(r'\d+', m.group(0))):
            k = self.seen[n] = self.seen.get(n, 0) + 1
            cid = f'c{n}' if k == 1 else f'c{n}-{k}'
            label = escape(self.ui['cite'].format(n=n), quote=True)
            links.append(f'<a href="#ref-{n}" id="{cid}" aria-label="{label}">{n}</a>')
        return '<span class="cite">' + ''.join(links) + '</span>'


def reading_minutes(text, lang):
    body = re.sub(r'\[[^\]]*\]\([^)]*\)|\[\d+\]', ' ', text)
    if lang == 'zh':
        units = len(re.findall(r'[一-鿿]', body)) / 400 + len(re.findall(r'[A-Za-z]+', body)) / 220
    else:
        units = len(re.findall(r"[A-Za-z0-9’'-]+", body)) / 220
    return max(1, round(units))


def title_html(title, split):
    mark, keep = split
    i = title.find(mark)
    if i < 0:
        return escape(title)
    head, tail = (title[:i + len(mark)], title[i + len(mark):]) if keep else (title[:i], title[i + 1:])
    return f'{escape(head)}<br><em>{escape(tail)}</em>'


def render(lang):
    ui = UI[lang]
    md = (OUT / ui['md']).read_text(encoding='utf-8')
    bl = blocks(md)
    if not bl or bl[0][0] != 'h1' or sum(k == 'h1' for k, _ in bl) != 1:
        fail(ui['md'] + ' must start with exactly one # title')
    title = bl[0][1]
    first_h2 = next(i for i, (k, _) in enumerate(bl) if k == 'h2')
    intro, rest = bl[1:first_h2], bl[first_h2:]
    if not intro or intro[0][0] != 'p':
        fail('the line under the title must be a short kicker, such as the date')
    kicker, intro = intro[0][1], intro[1:]
    inline = Inline(ui)

    sections = []
    for kind, val in rest:
        if kind == 'h2':
            sections.append({'head': val, 'blocks': []})
        else:
            sections[-1]['blocks'].append((kind, val))

    toc, body, refs = [], [], None
    for k, sec in enumerate(sections):
        m = re.match(r'(\d+) (.+?) · (.+)$', sec['head'])
        if sec['head'] == ui['refs']:
            refs = sec
            continue
        if m:
            no, label, head = m.groups()
            sid = 'ch' + no
            toc.append((sid, no, label))
            top = f'<p class="ch-no"><span>{no}</span>{escape(label)}</p><h2 id="{sid}t">{inline(head)}</h2>'
            cls = 'ch'
        else:
            sid = 'sec' + str(k + 1)
            toc.append((sid, '·', sec['head']))
            top = f'<h2 id="{sid}t">{inline(sec["head"])}</h2>'
            cls = 'ch plain'
        html, part, prev = [], '', ''
        for kind, val in sec['blocks']:
            if kind == 'quote':
                html.append(f'<blockquote class="bottom"><p>{inline(val)}</p></blockquote>')
            elif kind == 'h3':
                part = ui['parts'].get(val, '')
                html.append(f'<h3 class="part {part}">{inline(val)}</h3>' if part else f'<h3 class="sub">{inline(val)}</h3>')
            elif kind == 'p':
                html.append(f'<p class="lead">{inline(val)}</p>' if prev == 'h3' else f'<p>{inline(val)}</p>')
            elif kind == 'ul':
                items = ''.join(f'<li>{inline(x)}</li>' for x in val)
                html.append(f'<ul class="{part}">{items}</ul>' if part else f'<ul>{items}</ul>')
            elif kind == 'ol':
                html.append('<ol class="num">' + ''.join(f'<li>{inline(x)}</li>' for _, x in val) + '</ol>')
            elif kind == 'table':
                head, rows = val
                fut = ' fut' if head[0] == ui['fut_head'] else ''
                th = ''.join(f'<th scope="col">{inline(h)}</th>' for h in head)
                trs = ''.join(
                    f'<tr class="r{i + 1}">' + ''.join(
                        f'<td data-label="{escape(head[j], quote=True)}">{inline(c)}</td>' for j, c in enumerate(r)) + '</tr>'
                    for i, r in enumerate(rows))
                html.append(f'<div class="tbl{fut}"><table><thead><tr>{th}</tr></thead><tbody>{trs}</tbody></table></div>')
            else:
                fail(f'unexpected {kind} block in "{sec["head"]}"')
            prev = kind
        body.append(f'<section class="{cls}" id="{sid}" aria-labelledby="{sid}t">{top}{"".join(html)}</section>')

    if not refs or len(refs['blocks']) != 1 or refs['blocks'][0][0] != 'ol':
        fail(f'"## {ui["refs"]}" must hold one numbered list')
    items = refs['blocks'][0][1]
    numbers = set(range(1, len(items) + 1))
    if [int(n) for n, _ in items] != sorted(numbers):
        fail('references must be numbered 1, 2, 3 …')
    cited = set(inline.seen)
    if cited - numbers:
        fail(f'{ui["md"]}: citations without a reference: {sorted(cited - numbers)}')
    if numbers - cited:
        fail(f'{ui["md"]}: references never cited: {sorted(numbers - cited)}')
    up = escape(ui['up'], quote=True)
    ref_li = ''.join(
        f'<li id="ref-{n}"><span class="ref-text">{inline(x, cites=False)}</span>'
        f'<a class="ref-up" href="#c{n}" aria-label="{up}">↑</a></li>' for n, x in items)
    toc.append(('refs', '·', ui['refs']))
    body.append(f'<section class="ch plain" id="refs" aria-labelledby="refst"><h2 id="refst">{escape(ui["refs"])}</h2>'
                f'<ol class="refs">{ref_li}</ol></section>')

    # 导读：说明文字、四部分的读法、资料时间
    intro_html, lists = [], 0
    for i, (kind, val) in enumerate(intro):
        if kind == 'p':
            last = i == len(intro) - 1
            intro_html.append(f'<p class="fine">{inline(val)}</p>' if last else f'<p>{inline(val)}</p>')
        elif kind == 'ul' and not lists:
            lists += 1
            intro_html.append('<ul class="howto">' + ''.join(f'<li>{inline(x)}</li>' for x in val) + '</ul>')
        else:
            fail('the introduction may hold paragraphs and one list')

    toc_items = ''.join(f'<li><a href="#{sid}"><b>{no}</b><span>{escape(label)}</span></a></li>' for sid, no, label in toc)
    minutes = reading_minutes(md.split('\n## ' + ui['refs'])[0], lang)
    site = site_url()
    page_url = site + ui['url']
    head_title = escape(ui['title'].format(t=title))
    desc = escape(ui['desc'], quote=True)
    og_url = (f'\n<meta property="og:url" content="{page_url}">'
              f'\n<link rel="alternate" hreflang="zh-CN" href="{site}report/">'
              f'\n<link rel="alternate" hreflang="en" href="{site}en/report/">') if site else ''
    css = (SRC / 'report.css').read_text(encoding='utf-8')
    js = (SRC / 'report.js').read_text(encoding='utf-8')

    return f'''<!doctype html>
<html lang="{ui['html_lang']}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{head_title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#0f1729">
<meta property="og:type" content="article">
<meta property="og:site_name" content="{escape(ui['site_name'], quote=True)}">
<meta property="og:title" content="{head_title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{site}{ui['share']}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">{og_url}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{head_title}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="{site}{ui['share']}">
<link rel="icon" type="image/svg+xml" href="{ICON}">
<style>{css}</style>
</head>
<body>
<a class="skip" href="#main">{escape(ui['skip'])}</a>
<header class="topbar">
  <a class="brand" href="../index.html"><span class="brand-mark" aria-hidden="true"></span><span class="brand-text">{escape(ui['site_name'])}</span></a>
  <a class="back" href="../index.html">{escape(ui['back'])}</a>
  <div class="progress" aria-hidden="true"></div>
</header>
<header class="hero">
  <div class="hero-in">
    <div class="hero-rings" aria-hidden="true"></div>
    <p class="kicker">{inline(kicker)}</p>
    <h1>{title_html(title, ui['split'])}</h1>
    <p class="hero-meta"><span>{escape(ui['minutes'].format(n=minutes))}</span><span>{escape(ui['refs_count'].format(n=len(items)))}</span></p>
  </div>
</header>
<div class="doc">
  <nav class="toc toc-side" aria-label="{escape(ui['toc'], quote=True)}"><p class="toc-title">{escape(ui['toc'])}</p><ol>{toc_items}</ol></nav>
  <main id="main">
    <section class="intro">{''.join(intro_html)}</section>
    <details class="toc toc-mob"><summary>{escape(ui['toc'])}</summary><ol>{toc_items}</ol></details>
    {''.join(body)}
    <aside class="end">
      <b>{escape(ui['end_title'])}</b>
      <p>{escape(ui['end_text'])}</p>
      <div class="row"><a class="btn" href="../index.html">{escape(ui['end_btn'])}</a></div>
    </aside>
  </main>
</div>
<footer class="about"><p>{escape(ui['footer'])}</p><p class="foot-links"><a href="{REPO_URL}">{escape(ui['repo_label'])}</a><a href="{ui['other_url']}" lang="{ui['other_lang']}" hreflang="{ui['other_lang']}">{escape(ui['other_label'])}</a></p></footer>
<div class="tip" id="tip" role="dialog" aria-labelledby="tipNo" tabindex="-1" hidden>
  <button type="button" class="tip-x" aria-label="{escape(ui['tip_close'], quote=True)}">×</button>
  <p class="tip-no" id="tipNo">{escape(ui['tip_label'])}</p>
  <p class="tip-body"></p>
  <p class="tip-foot"><a class="tip-more" href="#refs">{escape(ui['tip_more'])}</a></p>
</div>
<script>{js}</script>
</body>
</html>
'''


if __name__ == '__main__':
    counts = {}
    for lang in UI:
        page = render(lang)
        target = ROOT / UI[lang]['out']
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(page, encoding='utf-8')
        counts[lang] = page.count('<li id="ref-')
    if counts['zh'] != counts['en']:
        fail(f'the two editions cite different numbers of references: {counts}')
    # 旧的英文报告地址，跳到英文网站的新地址
    (OUT / 'en.html').write_text(REDIRECT, encoding='utf-8')
    print(f'Built research report (中文 + English, {counts["zh"]} references).')
