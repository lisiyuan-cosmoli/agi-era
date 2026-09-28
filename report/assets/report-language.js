(()=>{'use strict';
document.querySelectorAll('[data-language-link]').forEach(a=>a.addEventListener('click',()=>{a.href=a.dataset.languageLink+location.hash}));
if(document.documentElement.lang!=='en')return;
// Wrap actual English diagram labels inside their existing node geometry.
const NS='http://www.w3.org/2000/svg';
function wrap(text,width,startY,step,maxLines){if(!text)return;const words=text.textContent.trim().split(/\s+/);const x=text.getAttribute('x');text.textContent='';let line='';const lines=[];const probe=document.createElementNS(NS,'tspan');text.append(probe);for(const word of words){const next=line?line+' '+word:word;probe.textContent=next;if(probe.getComputedTextLength()>width&&line){lines.push(line);line=word}else line=next}if(line)lines.push(line);probe.remove();if(lines.length>maxLines){text.textContent=words.join(' ');text.setAttribute('textLength',width);text.setAttribute('lengthAdjust','spacingAndGlyphs');text.setAttribute('y',startY+step/2);return}lines.forEach((line,i)=>{const s=document.createElementNS(NS,'tspan');s.setAttribute('x',x);s.setAttribute('y',startY+i*step);s.textContent=line;text.append(s)})}
document.querySelectorAll('.v-node').forEach(g=>{const r=g.querySelector('rect');let y=Number(r.getAttribute('y')),w=Number(r.getAttribute('width'));wrap(g.querySelector('.v-title'),w-20,y+23,15,2);wrap(g.querySelector('.v-sub'),w-18,y+51,12,2)});
document.querySelectorAll('.diagram-node').forEach(g=>{const r=g.querySelector('rect');let y=Number(r.getAttribute('y')),w=Number(r.getAttribute('width'));wrap(g.querySelector('.node-title'),w-18,y+24,16,2);wrap(g.querySelector('.node-sub'),w-18,y+57,12,2)});
})();
