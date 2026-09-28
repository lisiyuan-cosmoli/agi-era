"""Qualitative research diagrams. Geometry is illustrative, never measured data."""
from html import escape as e

def heading(kicker,title,desc):
    return f'<div class="visual-heading"><span>{e(kicker)}</span><h4>{e(title)}</h4><p>{e(desc)}</p></div>'

def svg_start(key,w,h,title,desc):
    return f'<div class="visual-scroll" tabindex="0" role="region" aria-label="{e(title)}，窄屏可横向滚动"><svg class="research-svg" viewBox="0 0 {w} {h}" role="img" aria-labelledby="{key}-title {key}-desc"><title id="{key}-title">{e(title)}</title><desc id="{key}-desc">{e(desc)}</desc><defs><marker id="{key}-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M1 1L8 5L1 9" fill="none" stroke="context-stroke" stroke-width="1.6"/></marker></defs>'

def box(x,y,w,h,title,sub='',tone='blue'):
    return f'<g class="v-node {tone}"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="9"/><text class="v-title" x="{x+w/2}" y="{y+29}" text-anchor="middle">{e(title)}</text><text class="v-sub" x="{x+w/2}" y="{y+51}" text-anchor="middle">{e(sub)}</text></g>'

def line(key,d,tone='blue',dash=False):
    return f'<path class="v-edge {tone}{" dashed" if dash else ""}" d="{d}" marker-end="url(#{key}-arrow)"/>'

def label(x,y,t):return f'<text class="v-label" x="{x}" y="{y}" text-anchor="middle">{e(t)}</text>'

def dividend():
    key='dividend'
    out=heading('同一项技术，两条传导路径','产出增长，怎样才能变成生活改善？','绿色路径可能缓冲压力；橙色路径可能放大压力。两条路径可以同时发生。')
    out+=svg_start(key,800,510,'生产红利与收入冲击','AI 成本下降可能通过竞争降低价格、创造新需求；客户内制也可能削弱旧服务收入。家庭的净结果取决于收入与必要支出如何变化。')
    out+=box(282,12,236,69,'AI 能力增强、成本降低','能力如何进入市场仍有条件')
    out+=line(key,'M350 81V109H190V130','green')+line(key,'M450 81V109H610V130','orange')
    out+=box(65,136,250,70,'价格下降、新需求出现','条件：竞争充分、降价能传递','green')
    out+=box(485,136,250,70,'客户内制、旧服务承压','条件：完整交付可替代、客户采用','orange')
    out+=line(key,'M190 206V263','green')+line(key,'M610 206V263','orange')
    out+=label(190,240,'可能增加真实购买力')+label(610,240,'可能先压利润，再压用工')
    out+=box(65,270,250,70,'支出减轻、新收入机会','新机会需要受影响者能够进入','green')
    out+=box(485,270,250,70,'家庭收入与消费下降','必要开支、旧债未必同步下降','orange')
    out+=line(key,'M190 340V379H325V407','green')+line(key,'M610 340V379H475V407','orange')
    out+=box(210,414,380,70,'生活结果取决于两条路径的合力','还要看收益归属、覆盖人群和接续时间','blue')
    out+='</svg></div><div class="visual-takeaway"><strong>不能只看产出。</strong>同样的技术增长，可能让不同家庭经历完全不同的过渡。</div>'
    return out

def tempo():
    out=heading('相对节奏 · 可切换','旧收入消失之后，新的安排何时接上？','横向仅表示先后，不表示月份。条带位置是机制示意，不是预测数据。')
    out+='<div class="figure-tools tempo-tools" role="group" aria-label="切换接续情景"><button data-tempo="late" aria-pressed="true">接续滞后</button><button data-tempo="ready" aria-pressed="false">提前准备</button><button data-tempo="blocked" aria-pressed="false">部署受阻</button></div>'
    out+='<div class="tempo-chart" data-state="late"><div class="tempo-axis"><span>变化开始</span><span>相对时间 →</span></div>'
    for name,cls,text in [('技术能力','capability','能力逐步开放'),('企业部署','deployment','采用、验证与流程调整'),('原有收入','old-income','原收入受到冲击'),('新收入与保障','replacement','安排开始覆盖受影响者')]:
        out+=f'<div class="tempo-row"><strong>{name}</strong><div class="tempo-track"><div class="tempo-band {cls}">{text}</div></div></div>'
    out+='<div class="tempo-gap"><span>过渡缺口</span><strong id="tempo-gap-label">旧收入已减少，接续仍未覆盖</strong></div></div><p class="interactive-note" id="tempo-note" aria-live="polite">接续滞后：生活支出与债务继续到期，损失可能传到消费、企业和信贷。条带不代表所有人同时受到影响。</p>'
    out+='<div class="print-context">另两种情景：提前准备可以缩短缺口，但要核对覆盖范围和资金来源；部署受阻可能延后替代，也可能延后生产红利。</div>'
    return out

def power():
    key='power'
    out=heading('组织变化','公司变小，为什么权力仍可能集中？','制作与协调可以被收回；客户入口、稀缺资源和责任承担，会重新分布。')
    out+=svg_start(key,800,480,'企业价值的迁移','客户通过 AI 接管部分制作协调，旧服务企业仍可能承担责任和线下交付；小团队依赖上游工具及平台，可与平台权力集中同时出现。')
    out+=box(240,12,320,70,'模型、算力与客户入口','少数上游提供者可能成为共同依赖','purple')
    out+=line(key,'M320 82V137H130V168','purple')+line(key,'M480 82V137H670V168','purple')
    out+=label(400,120,'工具变得普及，不等于入口和收益分散')
    out+=box(20,175,220,75,'客户内部流程','生成、修改、基础协调')
    out+=box(290,175,220,75,'原有服务企业','原先出售制作与协调','orange')
    out+=box(560,175,220,75,'个人与小团队','更少人也能完成交付')
    out+=line(key,'M290 210H246','orange')+label(267,194,'收回')
    out+=line(key,'M510 210H553','orange')+label(535,194,'拆分')
    out+=line(key,'M130 250V312H305V344','green')+line(key,'M670 250V312H495V344','green')
    out+=box(240,351,320,76,'仍需要有人承担的部分','验收、资产、线下履约与责任','green')
    out+=label(400,459,'企业数量、组织规模、市场控制力，需要分别观察')+'</svg></div>'
    out+='<div class="paired-insight"><div><span>组织层面</span><strong>小团队可以增加</strong><p>制作与协调的进入成本下降</p></div><div><span>市场层面</span><strong>上游依赖仍可能增强</strong><p>获客、结算与迁移受平台规则影响</p></div></div>'
    return out

def contract():
    out=heading('社会关系','职业这条连接变弱以后，哪些关系需要接续？','收入、生活保障与社会参与并不相同，不能只补上一项就视为问题全部解决。')
    out+='<div class="contract-chain"><span>教育与学习</span><i>→</i><span>职业与工作</span><i class="fragile">⇢<small>联系可能变弱</small></i><span>收入与生活</span><i>→</i><span>稳定预期</span></div>'
    out+='<div class="contract-branches"><div><span class="branch-dot green"></span><h5>生活怎样接续</h5><p>公共服务、可进入的新工作、生产收益分享</p><small>要看实际覆盖与必要支出</small></div><div><span class="branch-dot purple"></span><h5>参与怎样接续</h5><p>组织成员关系、公共讨论、创作与共同活动</p><small>收入补偿不会自动恢复参与感</small></div><div><span class="branch-dot orange"></span><h5>未来怎样安排</h5><p>重新理解教育、家庭承诺与长期债务</p><small>旧承诺调整往往慢于能力变化</small></div></div>'
    out+='<div class="visual-takeaway">这三条路径相互影响，需要分别检查；它们不是已经完成的制度设计。</div>'
    return out

LEVERS=[
 ('income','收入接续','家庭支出与基本服务','收入暂时中断时，维持基本生活和消费能力。','覆盖真正受影响的人，及时到位，并有可持续来源。','需要公共资金；必需品供给紧张时，部分好处可能被涨价吸收。'),
 ('debt','债务调整','违约与信贷传导','让既有偿付安排重新匹配收入，减轻集中违约的传导。','有及时、可审查的重整路径，能够识别和承担损失。','债权人和金融机构需要分担损失，不能使损失凭空消失。'),
 ('supply','必要供给','生活必需支出','改善基础服务与现实供给，让收入支持更能转成实际生活。','资金、建设能力与当地需求相匹配。','存在建设周期和资源成本，无法靠发放工具立即完成。'),
 ('access','迁移与互操作','平台依赖与退出成本','保留客户关系和数据迁移的可能，使组织有更换供应商的选择。','替代供应真实可用，迁移后的关键流程仍能运行。','标准与合规也有成本，设计不当可能保护原有大机构。'),
 ('jobs','学习与转岗','进入新收入来源','帮助受影响的人进入仍需要人类参与的新任务。','存在可以进入、足以维持生活的岗位，学习与迁移成本可承受。','新任务也可能继续自动化，培训不能独自承接长期收入问题。'),
 ('control','限定权限','事故范围与恢复能力','使高影响行动可撤回、异常可隔离，保留调整部署的机会。','约束和恢复措施经过检验，责任与授权清楚。','会增加验证与运营成本；控制措施本身也可能失效。')]

def levers():
    out=heading('作用点 · 可点击','不同措施，分别接在传导链的哪里？','每项措施都有条件与代价。选择一项，查看它能影响什么。')
    out+='<div class="lever-layout"><div class="lever-map" role="group" aria-label="选择应对措施">'
    for i,(key,name,target,mechanism,condition,cost) in enumerate(LEVERS):
        out+=f'<button data-lever="{key}" aria-pressed="{str(i==0).lower()}" aria-controls="lever-detail"><span>{name}</span><i aria-hidden="true">→</i><strong>{target}</strong></button>'
    out+='</div><div id="lever-detail" class="lever-detail" aria-live="polite">'
    for i,(key,name,target,mechanism,condition,cost) in enumerate(LEVERS):
        out+=f'<div data-lever-panel="{key}"'+(' hidden' if i else '')+f'><h5>{name}</h5><dl><dt>怎样起作用</dt><dd>{mechanism}</dd><dt>依赖什么条件</dt><dd>{condition}</dd><dt>需要承担的代价</dt><dd>{cost}</dd></dl></div>'
    return out+'</div></div>'

def futures():
    out=heading('二维情景 · 非概率分布','社会过渡的结果，需要分别看两件事','收益是否及时覆盖受到冲击的人；关键行动是否仍能被有效约束。图中区域没有概率或面积含义。')
    out+='<div class="scenario-map"><div class="scenario-y">关键行动能否有效约束</div><div class="scenario-grid"><div class="scenario-axis-top">约束仍有效</div><div class="scenario-cell concentrated"><span>接续不足</span><h5>集中依赖，或生活受压</h5><p>能力增长，但受影响者未必分享收益。平台依赖还需另外检查。</p></div><div class="scenario-cell shared"><span>接续较充分</span><h5>广泛分享的条件更好</h5><p>生活与收入得到接续，但仍要看资产和公共决定的归属。</p></div><div class="scenario-uncontrolled"><span>关键约束失效</span><h5>社会选择能否执行，成为前提问题</h5><p>此时不能仅凭分配政策承诺平稳过渡，也不能直接推定某种贫富结果。</p></div><div class="scenario-axis-bottom"><span>不足 / 滞后</span><strong>收益与保障的覆盖、接续程度 →</strong><span>较充分 / 及时</span></div></div></div>'
    out+='<div class="oscillation"><span aria-hidden="true">↔</span><p><strong>反复震荡是一种过程。</strong>如果每轮技术变化后，收入安排都迟迟跟不上，社会可能在缓解与再次承压之间来回移动。这些情景可以并存或转变。</p></div>'
    return out

EXTRA_FIGURES={'dividend':dividend,'tempo':tempo,'power':power,'contract':contract,'levers':levers,'futures':futures}
FIGURE_SUMMARIES={
 'dividend':'AI 成本降低 → 降价与新需求 → 购买力或新收入；同时可能经客户内制 → 旧服务承压 → 家庭收入与消费下降。净结果取决于收益归属、覆盖和接续时间。',
 'tempo':'分别观察能力、部署、旧收入与接续安排。接续滞后产生过渡缺口；提前准备可减轻缺口；部署受阻既可能延后冲击，也可能延后红利。图形无数值或时间预测含义。',
 'power':'制作和协调可能从旧服务企业迁向客户内部及小团队；上游工具与客户入口仍可能集中。责任、资产和线下交付需要有人承担。',
 'contract':'教育 → 职业 ⇢ 收入与生活 → 稳定预期。职业收入连接变弱后，生活接续、社会参与和长期安排需要分别处理。',
 'levers':'收入接续作用于家庭支出；债务调整作用于违约传导；必要供给作用于生活成本；迁移互操作作用于平台依赖；学习转岗需要可进入的新工作；限定权限作用于事故范围与恢复。',
 'futures':'二维比较关键行动能否约束，以及收益保障能否及时覆盖。约束失效时，政策可执行性受到挑战；反复震荡描述过程，不是互斥的终点。'}
