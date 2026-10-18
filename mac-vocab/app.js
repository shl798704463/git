'use strict';
const KEY='lexicon-mac-v1', DAY=86400000;
function schedule(previous,grade,now=Date.now()){
 const p=previous||{interval:0,reviews:0,lapses:0};
 const interval=grade==='again'?10/1440:grade==='hard'?Math.max(1,p.interval*1.2):grade==='good'?Math.max(1,p.interval*2.5):Math.max(4,p.interval*3.5);
 return {interval,due:now+interval*DAY,reviews:p.reviews+1,lapses:p.lapses+(grade==='again'?1:0),last:now};
}
function validate(s){
 if(!s||s.version!==1||!s.cards||typeof s.cards!=='object'||Array.isArray(s.cards)||!s.days||typeof s.days!=='object'||Array.isArray(s.days))throw Error('备份格式不正确');
 for(const [id,c] of Object.entries(s.cards)){
  if(!window.WORDS.some(w=>w.id===id)||!c||!['interval','due','reviews','lapses','last'].every(k=>Number.isFinite(c[k])&&c[k]>=0)||!Number.isInteger(c.reviews)||!Number.isInteger(c.lapses)||c.lapses>c.reviews||c.interval>100000)throw Error('词卡数据不正确');
 }
 for(const [d,n] of Object.entries(s.days))if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isSafeInteger(n)||n<0)throw Error('学习记录不正确');
 return s;
}
const $=id=>document.getElementById(id), fresh=()=>({version:1,cards:{},days:{}});
let state=fresh(),blocked=false,current=null,view='study',revealed=false;
function notice(t){$('notice').textContent=t;}
try{const raw=localStorage.getItem(KEY);if(raw)state=validate(JSON.parse(raw));}catch(e){blocked=true;notice('无法读取本地进度。为保护原记录，已暂停保存；请导入有效备份，或检查浏览器存储权限。');}
function save(next){try{localStorage.setItem(KEY,JSON.stringify(next));state=next;blocked=false;return true;}catch(e){notice('保存失败，尚未记录此次评分。请检查存储权限或空间，并导出备份。');return false;}}
function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function filtered(){return window.WORDS.filter(w=>$('category').value==='all'||w.category===$('category').value);}
function dueWords(){const now=Date.now();return filtered().filter(w=>!state.cards[w.id]||state.cards[w.id].due<=now).sort((a,b)=>{const pa=state.cards[a.id],pb=state.cards[b.id];return (pa?0:1)-(pb?0:1)||(pa?.due||0)-(pb?.due||0);});}
function el(tag,text){const e=document.createElement(tag);e.textContent=text;return e;}
function labelTime(grade){const n=schedule(state.cards[current.id],grade).interval;return n<1?'10 分钟':`${Math.round(n*10)/10} 天`;}
function render(){
 const words=filtered(),learned=words.filter(w=>state.cards[w.id]).length;
 $('stats').replaceChildren(...[[dueWords().length,'待学 / 待复习'],[state.days[today()]||0,'今日完成次数'],[`${learned} / ${words.length}`,'已学习词条']].map(([n,t])=>{const d=el('div','');d.className='stat';d.append(el('strong',n),el('span',t));return d;}));
 ['study','library','progress'].forEach(v=>$(v).hidden=v!==view);$('heading').textContent={study:'今日学习',library:'全部词库',progress:'学习进度'}[view];
 document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('selected',b.dataset.view===view));
 if(view==='study')renderCard();if(view==='library')renderLibrary();if(view==='progress')renderProgress();
}
function renderCard(){
 current=dueWords()[0]||null;revealed=false;$('answer').hidden=true;$('ratings').hidden=true;$('recall').value='';$('reveal').hidden=!current;document.querySelector('.recall-label').hidden=!current;document.querySelector('.hint').hidden=!current;
 if(!current){$('tag').textContent='已完成';$('question').textContent='这一轮完成了 ☀';const upcoming=filtered().map(w=>state.cards[w.id]?.due).filter(Boolean).sort((a,b)=>a-b)[0];$('queue').textContent=upcoming?'下次复习：'+new Date(upcoming).toLocaleString('zh-CN'):'';return;}
 $('tag').textContent=current.category;$('queue').textContent=state.cards[current.id]?'到期复习':'初次学习';$('question').textContent=$('direction').value==='en'?current.term:current.zh;
}
function reveal(){if(!current||revealed||view!=='study')return;revealed=true;$('reveal').hidden=true;$('answer').hidden=false;$('ratings').hidden=false;const a=$('answer');a.replaceChildren(el('h2',$('direction').value==='en'?current.zh:current.term),el('p',current.en));const q=el('blockquote','');q.append(el('div',current.example),el('div',current.exampleZh));a.append(q);for(const g of ['hard','good','easy'])$(g+'-time').textContent=labelTime(g);}
function rate(grade){if(!current||!revealed||blocked){if(blocked)notice('本地记录读取异常，请先导入有效备份。');return;}const next=JSON.parse(JSON.stringify(state));next.cards[current.id]=schedule(state.cards[current.id],grade);next.days[today()]=(next.days[today()]||0)+1;if(save(next))render();}
function renderLibrary(){const q=$('search').value.trim().toLowerCase();const list=filtered().filter(w=>Object.values(w).join(' ').toLowerCase().includes(q));$('word-list').replaceChildren(...list.map(w=>{const d=el('article','');d.className='word-row';d.append(el('small',w.category+' · '+(state.cards[w.id]?'已学习':'未学习')),el('div',w.term+' — '+w.zh),el('p',w.en),el('p',w.example),el('small',w.exampleZh));return d;}));if(!list.length)$('word-list').append(el('p','没有匹配的词条。'));}
function renderProgress(){const box=$('progress');box.replaceChildren(el('p','熟悉词：复习间隔达到 21 天。此指标表示排程阶段，不代表实际掌握保证。'));for(const c of ['商务英语','AIDC','电力电子']){const ws=window.WORDS.filter(w=>w.category===c),n=ws.filter(w=>state.cards[w.id]).length,m=ws.filter(w=>(state.cards[w.id]?.interval||0)>=21).length;const d=el('div',`${c} · 已学 ${n}/${ws.length} · 熟悉 ${m}`);d.className='progress-row';const bar=document.createElement('progress');bar.max=ws.length;bar.value=n;bar.setAttribute('aria-label',c+'学习进度');d.append(bar);box.append(d);}box.append(el('h2','最近学习记录'));const days=Object.entries(state.days).sort(([a],[b])=>b.localeCompare(a)).slice(0,14);box.append(el('p',days.length?days.map(([d,n])=>`${d}：${n} 次`).join(' ｜ '):'完成第一张词卡后，这里会显示学习记录。'));}
$('reveal').onclick=reveal;document.querySelectorAll('[data-grade]').forEach(b=>b.onclick=()=>rate(b.dataset.grade));document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;render();});$('category').onchange=render;$('direction').onchange=render;$('search').oninput=renderLibrary;
$('export').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`lexicon-backup-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('import').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>2000000)throw Error('文件超过 2 MB');const incoming=validate(JSON.parse(await f.text()));if(!confirm('导入将替换此浏览器的现有进度。建议先导出备份。继续吗？'))return;if(save(incoming)){notice('备份已导入。');render();}}catch(error){notice('导入失败：'+error.message+'。现有进度未更改。');}finally{e.target.value='';}};
document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT','BUTTON'].includes(document.activeElement.tagName)||e.metaKey||e.ctrlKey||e.altKey)return;if(e.code==='Space'&&view==='study'){e.preventDefault();reveal();}});
$('date').textContent=new Date().toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'long'});render();
setInterval(()=>{if(view==='study'&&!revealed&&!$('recall').value)render();},60000);
