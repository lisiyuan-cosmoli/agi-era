#!/usr/bin/env python3
"""Build the showcase homepage (index.html). Standard library only.

The page is a single self-contained file, so it can be opened offline or sent
as one file.
"""
from pathlib import Path
import os
import re

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'source' / 'story'
DEFAULT_SITE_URL = 'https://lisiyuan-cosmoli.github.io/agi-era/'


def site_url():
    """分享卡片需要绝对地址。默认用 GitHub Pages 的网址；换域名时用 SITE_URL=https://新网址/ 重新构建。"""
    site = os.environ.get('SITE_URL', DEFAULT_SITE_URL).strip()
    if site and not site.endswith('/'):
        site += '/'
    return site


def build():
    html = (SRC / 'story.html').read_text(encoding='utf-8')
    css = (SRC / 'story.css').read_text(encoding='utf-8')
    js = (SRC / 'story.js').read_text(encoding='utf-8')
    for marker, name in [('/*@@CSS@@*/', 'CSS'), ('/*@@JS@@*/', 'JS')]:
        if html.count(marker) != 1:
            raise SystemExit(f'story.html must contain exactly one {name} placeholder')
    page = html.replace('/*@@CSS@@*/', css).replace('/*@@JS@@*/', js)
    site = site_url()
    if not site:
        page = re.sub(r'\n<meta property="og:url" content="@@SITE@@">', '', page)
    return page.replace('@@SITE@@', site)


if __name__ == '__main__':
    page = build()
    (ROOT / 'index.html').write_text(page, encoding='utf-8')
    print('Built showcase homepage.')
