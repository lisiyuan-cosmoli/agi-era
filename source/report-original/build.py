#!/usr/bin/env python3
"""Build a fully offline research report. Python standard library only."""
import json, html, re
from pathlib import Path
from visuals import EXTRA_FIGURES, FIGURE_SUMMARIES
ROOT=Path(__file__).resolve().parent
r=json.loads((ROOT/'content.json').read_text())
esc=html.escape

def levels():
    items=[('任务','一个结果能被生成','还要验收、修改和处理异常'),('服务','完整交付能被接管','客户是否真的愿意自行完成'),('企业','组织价值可能改变','是否仍需要资产与责任承担'),('生活','旧收入可能中断','新收入与保障能否及时接续'),('社会','规则与权力重新安排','谁分享收益，谁参与决定')]
    return '<ol class="level-flow">'+''.join(f'<li><span class="level-name">{a}</span><strong>{b}</strong><p>{c}</p></li>' for a,b,c in items)+'</ol>'

def cascade():
    nodes=[(360,20,230,72,'技术与预期变化','能力、成本、未来收入','all'),(20,160,240,80,'企业收入承压','订单与售价下降','firm'),(350,160,240,80,'缩编与组织退出','旧成本来不及下降','firm'),(680,160,240,80,'家庭收入减少','生活与旧债继续到期','home'),(20,375,240,80,'信贷与债务压力','融资收紧、违约与重整','firm'),(350,375,240,80,'跨行业需求走弱','减少消费、推迟支出','home'),(680,375,240,80,'公共制度承压','保障需求增加、税基变化','public')]
    wires=[('M380 92C300 110 160 95 140 154','firm'),('M260 200H344','firm'),('M590 200H674','home'),('M800 240C800 300 550 300 510 368','home'),('M470 375V246','home'),('M375 240C350 315 160 290 140 369','firm'),('M260 415C295 415 300 225 344 215','firm'),('M810 240V369','public'),('M745 375C635 315 650 250 720 246','public')]
    out='<div class="figure-tools" role="group" aria-label="突出查看传导路径"><button data-path="all" aria-pressed="true">全部关系</button><button data-path="firm" aria-pressed="false">企业与信贷</button><button data-path="home" aria-pressed="false">家庭与需求</button><button data-path="public" aria-pressed="false">公共制度</button></div>'
    out+='<div class="diagram-scroll" tabindex="0" role="region" aria-label="冲击反馈图，可横向滚动"><svg class="cascade" viewBox="0 0 950 490" role="img" aria-labelledby="cascade-title cascade-desc"><title id="cascade-title">AI 冲击的三条反馈路径</title><desc id="cascade-desc">企业收入减少引发缩编，家庭减少消费后反过来影响企业；信贷和公共制度可能进一步传导压力。</desc><defs><marker id="arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 1L9 5L0 9" fill="none" stroke="#65718b" stroke-width="1.5"/></marker></defs>'
    for d,g in wires:out+=f'<path class="relation" data-group="{g}" d="{d}" marker-end="url(#arrowhead)"/>'
    out+='<text x="485" y="318" class="edge-note">消费回落</text><text x="49" y="321" class="edge-note">损失传导</text><text x="273" y="330" class="edge-note">信贷收紧</text><text x="824" y="317" class="edge-note">支出需求</text><text x="654" y="313" class="edge-note">缓冲不足时</text>'
    for x,y,w,ht,title,sub,g in nodes:
        out+=f'<g class="diagram-node" data-group="{g}"><rect x="{x}" y="{y}" width="{w}" height="{ht}" rx="8"/><text x="{x+w/2}" y="{y+32}" text-anchor="middle" class="node-title">{title}</text><text x="{x+w/2}" y="{y+58}" text-anchor="middle" class="node-sub">{sub}</text></g>'
    return out+'</svg></div><p class="path-explanation" id="path-explanation" aria-live="polite">连线均为条件关系。新需求、降价和收入安排，也可能缓冲这些压力。</p>'

def futures():
    return '''<div class="branch-root">生产能力持续增强</div><div class="branch-question">人类是否仍能有效约束关键行动？</div><div class="future-branches"><div class="economic-branch"><div class="branch-label">控制前提仍然成立</div><div class="future-cards"><div><span class="future-sign shared">A</span><h4>广泛分享</h4><p>收益与保障及时接续</p><strong>更少工作，更多生活余地</strong></div><div><span class="future-sign dependent">B</span><h4>集中依赖</h4><p>关键资产与入口集中</p><strong>产出增加，退出选择减少</strong></div><div><span class="future-sign delayed">C</span><h4>反复震荡</h4><p>制度调整持续落后</p><strong>每轮变化都带来过渡压力</strong></div></div></div><div class="control-branch"><div class="branch-label">关键行动失去有效约束</div><span class="future-sign uncontrolled">D</span><h4>控制前提失效</h4><p>常规分配政策可能无法执行。</p><strong>先面对社会能否作出并执行选择的问题。</strong></div></div>'''

def governance():
    items=[('研发','能力与风险一起研究'),('独立评估','检查整套系统的权限'),('限定部署','限制范围与故障影响'),('持续观察','看事故，也看生活变化'),('扩量或撤回','依据结果调整行动')]
    return '<ol class="governance-flow">'+''.join(f'<li><span>{i+1:02d}</span><strong>{title}</strong><p>{sub}</p></li>' for i,(title,sub) in enumerate(items))+'</ol><div class="return-path">↶ 发现问题，回到评估与设计；控制依据不足时暂停相关活动。</div>'
figures={'levels':levels,'cascade':cascade,'futures':futures,'governance':governance}
figures.update(EXTRA_FIGURES)
figure_number=0

def block(b):
    t=b['type']
    if t=='p':return f'<p>{esc(b["text"])}</p>'
    if t=='h3':return f'<h3>{esc(b["text"])}</h3>'
    if t=='callout':return f'<aside class="callout"><p class="callout-title">{esc(b["title"])}</p><p>{esc(b["text"])}</p></aside>'
    if t=='figure':
        global figure_number
        figure_number+=1
        caption=re.sub(r'^图\s*\d+｜','',b['caption'])
        return f'<figure class="report-figure figure-{b["key"]}" id="figure-{b["key"]}">{figures[b["key"]]()}<figcaption><b>图 {figure_number:02d}</b>{esc(caption)}</figcaption></figure>'
    if t=='table':
        return '<div class="table-wrap" tabindex="0" role="region" aria-label="研究对照表，可横向滚动"><table><thead><tr>'+''.join('<th scope="col">'+esc(c)+'</th>' for c in b['headers'])+'</tr></thead><tbody>'+''.join('<tr>'+''.join(('<th scope="row">' if i==0 else '<td>')+esc(v)+('</th>' if i==0 else '</td>') for i,v in enumerate(row))+'</tr>' for row in b['rows'])+'</tbody></table></div>'
    if t=='sources':
        return '<div class="sources">'+''.join(f'<article class="source"><span class="source-label">{esc(s["org"])} · {esc(s["date"])}</span><a href="{esc(s["url"])}" target="_blank" rel="noopener noreferrer">{esc(s["name"])} ↗</a><p>{esc(s["scope"])}</p><p>{esc(s["support"])}</p></article>' for s in b['items'])+'</div>'
    if t=='details':return '<details class="glossary"><summary>'+esc(b['title'])+'<span aria-hidden="true">＋</span></summary><dl>'+''.join(f'<dt>{esc(a)}</dt><dd>{esc(c)}</dd>' for a,c in b['items'])+'</dl></details>'
    raise ValueError(t)
visual_index='<section class="visual-index" aria-label="图解索引"><div class="visual-index-heading"><span>先看图，再读论证</span><small>机制示意 · 不代表测量值或发生概率</small></div><div>'+''.join(f'<a href="#figure-{key}"><span>{i+1:02d}</span>{name}<i aria-hidden="true">↗</i></a>' for i,(key,name) in enumerate([('levels','从任务到社会'),('dividend','增长与收入的两条路'),('tempo','社会适应的时间缺口'),('cascade','压力怎样反馈'),('power','企业价值流向哪里'),('contract','职业之外怎样接续'),('futures','未来为什么分岔'),('levers','应对措施的作用点'),('governance','发展怎样保留纠错')]))+'</div></section>'
nav=''.join(f'<a href="#{s["id"]}"><span>{i+1:02d}</span>{esc(s["deck"])}</a>' for i,s in enumerate(r['sections']))
body=''.join(f'<section id="{s["id"]}" class="report-section" aria-labelledby="{s["id"]}-title"><div class="section-kicker">{esc(s["deck"])}</div><h2 id="{s["id"]}-title">{esc(s["title"])}</h2>'+''.join(block(b) for b in s['blocks'])+'</section>' for s in r['sections'])
page='''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="description" content="AI 持续发展对行业、企业、家庭与公共制度的影响：一份机制推演与应对框架研究。"><title>'''+esc(r['title'])+'''</title><link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='8' fill='%232b4ec4'/%3E%3Cpath d='M12 10h16v21H12z' fill='none' stroke='white' stroke-width='2'/%3E%3Cpath d='M17 16h6M17 21h6M17 26h4' stroke='white' stroke-width='2'/%3E%3C/svg%3E"><link rel="stylesheet" href="assets/report.css"><link rel="stylesheet" href="assets/visuals.css"></head><body><a class="skip" href="#report">跳到报告正文</a><div class="read-progress" aria-hidden="true"><i id="read-progress"></i></div><header class="toolbar"><a class="report-brand" href="#top"><span class="brand-mark" aria-hidden="true">R</span><span>社会结构与 AI<small>前瞻研究 · 讨论稿</small></span></a><div class="tools"><button id="toc-toggle" aria-expanded="false" aria-controls="sidebar">目录</button><button id="font-toggle" aria-pressed="false" title="切换较大字号">大字阅读</button><button id="focus-toggle" aria-pressed="false">专注阅读</button><button id="print" class="print-button">打印 / PDF</button></div></header><div class="page-layout"><aside class="sidebar" id="sidebar"><div class="toc-heading">本报告内容</div><nav aria-label="报告目录">'''+nav+'''</nav><div class="sidebar-note"><strong>研究前提</strong><p>AI 能力不预设上限。<br>未来结果按条件推演。</p><a href="报告正文.md" download>下载文字版 ↓</a></div></aside><main id="report"><article><header class="cover" id="top"><div class="cover-meta"><span>前瞻研究 / 社会转型</span><span>'''+esc(r['date'])+'''</span></div><h1>AI 不设上限以后，<br>社会如何完成过渡？</h1><p class="subtitle">'''+esc(r['subtitle'])+'''</p><p class="opening">'''+esc(r['intro'])+'''</p><div class="abstract"><span class="abstract-label">研究摘要</span><p>'''+esc(r['abstract'])+'''</p></div><div class="cover-foot"><span>'''+esc(r['scope'])+'''</span><span>机制推演 · 非确定性预报</span></div></header>'''+visual_index+body+'''<footer class="report-footer"><p>研究到这里，留下的是可以继续检查、讨论和修正的判断。</p><div><a href="#top">回到开头 ↑</a><a href="报告正文.md" download>报告文字版 ↓</a></div></footer></article></main></div><script src="assets/report.js"></script></body></html>'''
(ROOT/'index.html').write_text(page)
md_figure_number=0
md=['# '+r['title'],'',r['subtitle'],'',r['date']+' · '+r['scope'],'',r['intro'],'','## 研究摘要','',r['abstract'],'']
for s in r['sections']:
    md += ['## '+s['title'],'']
    for b in s['blocks']:
        t=b['type']
        if t=='p':md += [b['text'],'']
        elif t=='h3':md += ['### '+b['text'],'']
        elif t=='callout':md += ['> **'+b['title']+'**','>','> '+b['text'],'']
        elif t=='figure':
            md_figure_number+=1
            caption=re.sub(r'^图\s*\d+｜','',b['caption'])
            md += [f'*图 {md_figure_number:02d}｜'+caption+'*','']
            if b['key'] in FIGURE_SUMMARIES:md += [FIGURE_SUMMARIES[b['key']],'']
            if b['key']=='levels':md+=['任务 → 服务 → 企业 → 生活 → 社会。每一步都需要检查成立条件。','']
            if b['key']=='cascade':md+=['企业收入承压 → 缩编或退出 → 家庭收入减少 → 消费回落 → 企业继续承压。信贷收紧与公共保障不足，可能加重传导；新需求与收入安排可能缓冲。','']
            if b['key']=='legacy-futures':md+=['控制前提成立时，按分配和调整条件推演广泛分享、集中依赖或反复震荡；关键行动失去约束时，进入控制前提失效的分支。','']
            if b['key']=='governance':md+=['研发 → 独立评估 → 限定部署 → 持续观察 → 扩量或撤回；发现问题后回到评估与设计。','']
        elif t=='table':md+=['| '+' | '.join(b['headers'])+' |','| '+' | '.join('---' for _ in b['headers'])+' |']+['| '+' | '.join(row)+' |' for row in b['rows']]+['']
        elif t=='sources':
            for a in b['items']:md+=['- ['+a['name']+']('+a['url']+')。'+a['org']+'，'+a['date']+'。'+a['scope']+'。'+a['support'],'']
        elif t=='details':
            md+=['### '+b['title'],'']
            for a,c in b['items']:md+=['**'+a+'**：'+c,'']
(ROOT/'报告正文.md').write_text('\n'.join(md))
print('Built index.html and 报告正文.md')
