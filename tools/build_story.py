#!/usr/bin/env python3
"""Build the interactive pages. Standard library only.

source/story/story.html    + strings.zh.json → index.html      (中文网站)
source/story/story.en.html + strings.en.json → en/index.html   (English site)

Both pages share story.css and story.js. Each page is a single self-contained
file, so it can be opened offline or sent as one file.
"""
from pathlib import Path
import json
import os
import re

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'source' / 'story'
DEFAULT_SITE_URL = 'https://lisiyuan-cosmoli.github.io/agi-era/'
PAGES = [('story.html', 'strings.zh.json', 'index.html'), ('story.en.html', 'strings.en.json', 'en/index.html')]


def site_url():
    """分享卡片需要绝对地址。默认用 GitHub Pages 的网址；换域名时用 SITE_URL=https://新网址/ 重新构建。"""
    site = os.environ.get('SITE_URL', DEFAULT_SITE_URL).strip()
    if site and not site.endswith('/'):
        site += '/'
    return site


def shape(value):
    """文字表的结构（键和列表长度），用来检查中英两份是否一一对应。"""
    if isinstance(value, dict):
        return {k: shape(v) for k, v in value.items()}
    if isinstance(value, list):
        return [shape(v) for v in value]
    return 'text'


def build(template, strings):
    html = (SRC / template).read_text(encoding='utf-8')
    css = (SRC / 'story.css').read_text(encoding='utf-8')
    js = (SRC / 'story.js').read_text(encoding='utf-8')
    for marker, name in [('/*@@CSS@@*/', 'CSS'), ('/*@@JS@@*/', 'JS')]:
        if html.count(marker) != 1:
            raise SystemExit(f'{template} must contain exactly one {name} placeholder')
    if js.count('/*@@T@@*/{}') != 1:
        raise SystemExit('story.js must contain exactly one /*@@T@@*/{} placeholder')
    text = json.loads((SRC / strings).read_text(encoding='utf-8'))
    js = js.replace('/*@@T@@*/{}', json.dumps(text, ensure_ascii=False))
    page = html.replace('/*@@CSS@@*/', css).replace('/*@@JS@@*/', js)
    site = site_url()
    if not site:
        page = re.sub(r'\n<meta property="og:url" content="@@SITE@@[^"]*">', '', page)
    return page.replace('@@SITE@@', site)


def check_pair():
    """两个页面的结构要一致：同样的元素 id，同样结构的文字表。"""
    ids = [set(re.findall(r'\sid="([^"]+)"', (SRC / t).read_text(encoding='utf-8'))) for t, _, _ in PAGES]
    if ids[0] != ids[1]:
        raise SystemExit(f'story.html and story.en.html differ in element ids: {sorted(ids[0] ^ ids[1])}')
    zh, en = [shape(json.loads((SRC / s).read_text(encoding='utf-8'))) for _, s, _ in PAGES]
    for key in set(zh) | set(en):
        # 英文可以多出单数形式（比如 gap1、placed1），其余必须一致
        a, b = zh.get(key), en.get(key)
        if isinstance(a, dict) and isinstance(b, dict):
            if set(a) - set(b):
                raise SystemExit(f'strings.en.json is missing {key}.{sorted(set(a) - set(b))}')
            if any(a[k] != b[k] for k in a):
                raise SystemExit(f'strings.en.json has a different shape under "{key}"')
        elif a != b:
            raise SystemExit(f'strings.en.json has a different shape under "{key}"')


if __name__ == '__main__':
    check_pair()
    for template, strings, out in PAGES:
        target = ROOT / out
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(build(template, strings), encoding='utf-8')
    print('Built interactive pages (中文 + English).')
