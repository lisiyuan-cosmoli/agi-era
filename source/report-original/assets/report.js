(()=>{'use strict';
const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
const explanations={all:'连线均为条件关系。新需求、降价和收入安排，也可能缓冲这些压力。',firm:'订单减少，旧成本与债务仍然到期。组织退出的损失可能传到信贷，融资收紧又影响企业。',home:'家庭收入下降后，消费可能减少，其他行业也会受到影响。降价与新的收入来源可以抵消部分压力。',public:'家庭保障需求增加，公共制度若缺少及时响应的资源，缓冲能力可能不足；税基与服务成本也可能改变。'};
$$('[data-path]').forEach(button=>button.addEventListener('click',()=>{const path=button.dataset.path;$$('[data-path]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));$$('.cascade [data-group]').forEach(node=>{const match=path==='all'||node.dataset.group===path||node.dataset.group==='all';node.classList.toggle('dimmed',!match);node.classList.toggle('highlighted',path!=='all'&&node.dataset.group===path)});$('#path-explanation').textContent=explanations[path]}));
$('#toc-toggle').addEventListener('click',()=>{const open=$('#sidebar').classList.toggle('open');$('#toc-toggle').setAttribute('aria-expanded',String(open))});
$$('.sidebar nav a').forEach(a=>a.addEventListener('click',()=>{$('#sidebar').classList.remove('open');$('#toc-toggle').setAttribute('aria-expanded','false')}));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('#sidebar').classList.remove('open');$('#toc-toggle').setAttribute('aria-expanded','false')}});
$('#font-toggle').addEventListener('click',()=>{const on=document.documentElement.classList.toggle('large-text');$('#font-toggle').setAttribute('aria-pressed',String(on));$('#font-toggle').textContent=on?'标准字号':'大字阅读'});
$('#focus-toggle').addEventListener('click',()=>{const on=document.body.classList.toggle('focused');$('#focus-toggle').setAttribute('aria-pressed',String(on));$('#focus-toggle').textContent=on?'完整布局':'专注阅读'});
$('#print').addEventListener('click',()=>window.print());let printDetails=[];
window.addEventListener('beforeprint',()=>{printDetails=$$('details').map(d=>({element:d,open:d.open}));printDetails.forEach(x=>x.element.open=true)});
window.addEventListener('afterprint',()=>printDetails.forEach(x=>x.element.open=x.open));
const tempoCopy={late:['旧收入已减少，接续仍未覆盖','接续滞后：生活支出与债务继续到期，损失可能传到消费、企业和信贷。条带不代表所有人同时受到影响。'],ready:['提前准备，缩短生活中断的时间','提前准备：新的收入与保障在冲击扩大前开始覆盖。仍需检查资金来源、覆盖人群和必要供给，不能只看响应快慢。'],blocked:['替代延后，红利也可能推迟','部署受阻：工程、组织或责任条件使采用落后于能力。短期冲击可能延后，但这不等于未来无需调整。']};
$$('[data-tempo]').forEach(button=>button.addEventListener('click',()=>{const state=button.dataset.tempo;$('.tempo-chart').dataset.state=state;$$('[data-tempo]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));$('#tempo-gap-label').textContent=tempoCopy[state][0];$('#tempo-note').textContent=tempoCopy[state][1]}));
$$('[data-lever]').forEach(button=>button.addEventListener('click',()=>{const key=button.dataset.lever;$$('[data-lever]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));$$('[data-lever-panel]').forEach(p=>p.hidden=p.dataset.leverPanel!==key)}));
const sections=$$('.report-section'),nav=$$('.sidebar nav a');let scheduled=false;
function position(){const max=document.documentElement.scrollHeight-innerHeight;$('#read-progress').style.width=(max>0?Math.min(100,scrollY/max*100):0)+'%';let id=null;for(const s of sections){if(s.getBoundingClientRect().top<180)id=s.id;else break}nav.forEach(a=>{const active=a.hash==='#'+id;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')});scheduled=false}
addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(position)}},{passive:true});addEventListener('resize',position);position();
})();
