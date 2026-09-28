#!/usr/bin/env python3
"""Build complete offline Chinese and English editions from one reviewed report."""
import json,re,shutil
from html import escape
from html.parser import HTMLParser
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
SOURCE=ROOT/'source/report-original'
TARGET=ROOT/'report'
ZH=json.loads((SOURCE/'content.json').read_text())
EN=json.loads((ROOT/'source/report.en.json').read_text())
M=json.loads((ROOT/'source/report-ui.en.json').read_text())
def align(a,b):
    if isinstance(a,dict):
        for k in a:align(a[k],b[k])
    elif isinstance(a,list):
        for x,y in zip(a,b):align(x,y)
    elif isinstance(a,str) and re.search('[\u3400-\u9fff]',a):M[a]=b
align(ZH,EN)
for z,en in zip(ZH['sections'],EN['sections']):
    for a,b in zip(z['blocks'],en['blocks']):
        if a['type']=='figure':M[re.sub(r'^图\s*\d+｜','',a['caption'])]=re.sub(r'^Figure\s*\d+\s*[|｜:]\s*','',b['caption'],flags=re.I)
M.update({'中 / EN':'ZH / EN','AI 不设上限以后，':'AI without an assumed ceiling:','社会如何完成过渡？':'how can society navigate the transition?','机制推演 · 非确定性预报':'Mechanism analysis · Not a definitive forecast'})
def tr(s):
    stripped=s.strip()
    return s.replace(stripped,M[stripped]) if stripped in M else s
class Translate(HTMLParser):
    def __init__(self):super().__init__(convert_charrefs=False);self.out=[]
    def handle_decl(self,d):self.out.append('<!'+d+'>')
    def handle_starttag(self,t,attrs):
        a=[]
        for k,v in attrs:
            if k in ('aria-label','title','alt','content'):v=tr(v)
            if t=='html' and k=='lang':v='en'
            a.append(k if v is None else f'{k}="{escape(v,quote=True)}"')
        self.out.append('<'+t+(' '+' '.join(a) if a else '')+'>')
    def handle_startendtag(self,t,a):
        self.handle_starttag(t,a)
        self.out[-1]=self.out[-1][:-1]+'/>'
    def handle_endtag(self,t):self.out.append('</'+t+'>')
    def handle_data(self,d):self.out.append(escape(tr(d),quote=False))
    def handle_entityref(self,n):self.out.append('&'+n+';')
    def handle_charref(self,n):self.out.append('&#'+n+';')
    def handle_comment(self,d):self.out.append('<!--'+d+'-->')

def md(r):
    out=['# '+r['title'],'',r['subtitle'],'',r['date']+' · '+r['scope'],'',r['intro'],'','## Abstract','',r['abstract'],'']
    count=0
    for s in r['sections']:
        out+=['## '+s['title'],'']
        for b in s['blocks']:
            t=b['type']
            if t=='p':out += [b['text'],'']
            elif t=='h3':out += ['### '+b['text'],'']
            elif t=='callout':out += ['> **'+b['title']+'**','> '+b['text'],'']
            elif t=='table':out+=['| '+' | '.join(b['headers'])+' |','| '+' | '.join('---' for _ in b['headers'])+' |']+['| '+' | '.join(x)+' |' for x in b['rows']]+['']
            elif t=='figure':
                count+=1;out += [f'*Figure {count:02d}. '+re.sub(r'^Figure\s*\d+\s*[|｜:]\s*','',b['caption'],flags=re.I)+'*','']
            elif t=='sources':
                for a in b['items']:out += [f'- [{a["name"]}]({a["url"]}). {a["org"]}, {a["date"]}. {a["scope"]}. {a["support"]}','']
            elif t=='details':
                out+=['### '+b['title'],'']
                for a,c in b['items']:out += ['**'+a+'**: '+c,'']
    return '\n'.join(out)

TARGET.mkdir(parents=True,exist_ok=True)
shutil.copytree(SOURCE/'assets',TARGET/'assets',dirs_exist_ok=True)
original=(SOURCE/'index.html').read_text()
translated=Translate();translated.feed(original);en=''.join(translated.out)
for lang,markup,filename in [('zh',original,'index.html'),('en',en,'en.html')]:
    is_en=lang=='en'
    markup=markup.replace('<html lang="en">','<html lang="en" class="report-english">')
    back='../index.html'
    brand='Futures We Share' if is_en else '共同未来'
    sub='In-depth research · Back to home' if is_en else '深读研究 · 返回首页'
    markup=re.sub(r'<a class="report-brand".*?</a>',f'<a class="report-brand" href="{back}"><span class="brand-mark" aria-hidden="true">↖</span><span>{brand}<small>{sub}</small></span></a>',markup,count=1)
    switch='<div class="report-language" aria-label="Language"><a href="index.html" '+('data-language-link="index.html"' if is_en else 'class="selected" aria-current="page"')+'>中</a><span>/</span><a href="en.html" '+('class="selected" aria-current="page"' if is_en else 'data-language-link="en.html"')+'>EN</a></div>'
    markup=markup.replace('<div class="tools">','<div class="tools">'+switch,1)
    markup=markup.replace('</head>','<link rel="stylesheet" href="assets/report-bilingual.css"><link rel="alternate" hreflang="zh-CN" href="index.html"><link rel="alternate" hreflang="en" href="en.html"></head>')
    markup=markup.replace('</body>','<script src="assets/report-language.js"></script></body>')
    if is_en:
        markup=markup.replace('assets/report.js','assets/report.en.js').replace('assets/report.css','assets/report.en.css').replace('assets/visuals.css','assets/visuals.en.css')
        markup=markup.replace('href="报告正文.md"','href="report.en.md"')
    (TARGET/filename).write_text(markup)
for name in ['report.js','report.css','visuals.css']:
    text=(SOURCE/'assets'/name).read_text()
    for a,b in sorted(M.items(),key=lambda x:len(x[0]),reverse=True):
        if re.search('[\u3400-\u9fff]',a):text=text.replace(a,b.replace("'","\\'") if name.endswith('.js') else b)
    outname=name.replace('.js','.en.js').replace('.css','.en.css')
    (TARGET/'assets'/outname).write_text(text)
(TARGET/'报告正文.md').write_text((SOURCE/'报告正文.md').read_text())
(TARGET/'report.en.md').write_text(md(EN))
for asset in ['report-bilingual.css','report-language.js']:shutil.copy2(ROOT/'tools'/asset,TARGET/'assets'/asset)
remaining=[]
p=Translate();p.feed((TARGET/'en.html').read_text())
class Audit(HTMLParser):
    def handle_data(self,d):
        if re.search('[\u3400-\u9fff]',d) and d.strip()!='中':remaining.append(d)
    def handle_starttag(self,t,a):
        for k,v in a:
            if k in ['aria-label','title','alt','content'] and v and re.search('[\u3400-\u9fff]',v):remaining.append(k+': '+v)
Audit().feed((TARGET/'en.html').read_text())
print('Built full bilingual report. Untranslated strings:',json.dumps(remaining,ensure_ascii=False))

if remaining: raise SystemExit("English edition contains untranslated strings. Update source/report-ui.en.json.")
