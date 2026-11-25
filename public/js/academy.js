"use strict";

const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const TM={"āēīōūǖĀĒĪŌŪ":1,"áéíóúǘÁÉÍÓÚ":2,"ǎěǐǒǔǚǍĚǏǑǓ":3,"àèìòùǜÀÈÌÒÙ":4};
function toneOf(ch){for(const k in TM)if(k.includes(ch))return TM[k];return 0}
function colorPy(p){return esc(p).replace(/[āēīōūǖáéíóúǘǎěǐǒǔǚàèìòùǜĀĒĪŌŪÁÉÍÓÚǍĚǏǑǓÀÈÌÒÙ]/g,c=>`<b class="t${toneOf(c)}">${c}</b>`)}
function stripTones(p){return p.normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/ü/g,"v").toLowerCase()}
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("on");clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove("on"),2600)}
const shuffle=a=>a.map(x=>[Math.random(),x]).sort((p,q)=>p[0]-q[0]).map(x=>x[1]);
function uniqW(list){const s=new Set(),o=[];list.forEach(w=>{if(!s.has(w[0])){s.add(w[0]);o.push(w)}});return o}

/* ---------- state + account sync ---------- */
const ACC=window.ACADEMY||{user:null,routes:{},audioBase:"audio/"};
const GUEST_KEY="academy-mandarin60-guest";
const KEY=ACC.user?"academy-mandarin60-u"+ACC.user.id:GUEST_KEY;
function blank(){return {xp:0,active:[],done:{},early:{},tone:{r:0,t:0},speak:[],fast:false}}
function readLocal(k){try{return JSON.parse(localStorage.getItem(k)||"null")}catch(e){return null}}
let S=Object.assign(blank(),readLocal(KEY)||{});
function mergeState(a,b){if(!b||typeof b!=="object")return a;const o=blank();
 o.xp=Math.max(a.xp||0,b.xp||0);
 o.active=[...new Set([...(a.active||[]),...(b.active||[])])];
 o.done=Object.assign({},b.done||{},a.done||{});
 o.early=Object.assign({},b.early||{},a.early||{});
 const ta=a.tone||{r:0,t:0},tb=b.tone||{r:0,t:0};o.tone=(ta.t||0)>=(tb.t||0)?ta:tb;
 o.speak=((a.speak||[]).length>=(b.speak||[]).length?a.speak:b.speak)||[];
 o.fast=!!(a.fast||b.fast);return o}
let syncT=null,syncStatus=ACC.user?"sync":"";
function dkey(d){return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate()}
function today(){return dkey(new Date())}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}renderXP();if(ACC.user){clearTimeout(syncT);syncT=setTimeout(pushProgress,1500)}}
function syncLabel(){return {saved:"✅ Saved to your account",saving:"⏳ Saving…",offline:"📴 Offline — will save when you're back online",error:"⚠️ Couldn't save — please sign in again",sync:"⏳ Syncing…"}[syncStatus]||""}
function setSync(s){syncStatus=s;const e=document.getElementById("syncst");if(e)e.textContent=syncLabel()}
function api(method,body,keepalive){return fetch(ACC.routes.progress,{method,credentials:"same-origin",keepalive:!!keepalive,headers:{"Accept":"application/json","Content-Type":"application/json","X-CSRF-TOKEN":ACC.csrf,"X-Requested-With":"XMLHttpRequest"},body:body?JSON.stringify(body):undefined})}
async function pushProgress(keepalive){if(!ACC.user)return;clearTimeout(syncT);syncT=null;setSync("saving");
 try{const r=await api("PUT",{state:S},keepalive);if(r.ok)setSync("saved");else{setSync("error");if(r.status===401||r.status===419)toast("Your session ended — please sign in again.")}}catch(e){setSync("offline")}}
async function pullProgress(){if(!ACC.user)return;
 try{const r=await api("GET");if(!r.ok){setSync("error");return}const j=await r.json();let m=mergeState(S,j.state);
  const g=readLocal(GUEST_KEY);if(g&&g.done&&Object.keys(g.done).length){m=mergeState(m,g);try{localStorage.removeItem(GUEST_KEY)}catch(e){}toast("🎉 Progress from this device was added to your account!")}
  S=m;try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}renderXP();await pushProgress();if(cur!=="day")render()}catch(e){setSync("offline")}}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden"&&syncT)pushProgress(true)});
window.addEventListener("online",()=>{if(ACC.user)pushProgress()});
async function logout(){if(ACC.user){await pushProgress();try{localStorage.removeItem(KEY)}catch(e){}}document.getElementById("logoutForm").submit()}
function addXP(n){S.xp+=n;const t=today();if(!S.active.includes(t))S.active.push(t);save()}
function streak(){let n=0;const d=new Date();if(!S.active.includes(dkey(d)))d.setDate(d.getDate()-1);while(S.active.includes(dkey(d))){n++;d.setDate(d.getDate()-1)}return n}
function renderXP(){$("#xp").textContent="⭐ "+S.xp;$("#streak").textContent="🔥 "+streak()}

/* ---------- audio: recorded clips in /audio, device voice only as a fallback ---------- */
let ZHV=null,DICT=null,slow=false;
function pickVoice(){try{const v=speechSynthesis.getVoices();ZHV=v.find(x=>/zh[-_]CN/i.test(x.lang))||v.find(x=>/^zh/i.test(x.lang)&&!/HK|yue/i.test(x.lang))||null}catch(e){}}
try{pickVoice();speechSynthesis.onvoiceschanged=pickVoice}catch(e){}
const AU=new Audio();AU.preload="auto";
const MAN=window.AUDIO_MAN||{};
function clipKey(text,voice){const ks=voice?[voice+"|"+text]:[];ks.push("48|"+text,"50|"+text);return ks.find(k=>MAN[k])}
let playTok=0;
function playUrl(url,onend){try{speechSynthesis.cancel()}catch(e){}AU.pause();AU.src=url;AU.playbackRate=slow?0.75:1;try{AU.preservesPitch=true;AU.webkitPreservesPitch=true}catch(e){}AU.onended=()=>onend&&onend();AU.onerror=()=>toast("Audio could not load — check your connection.");AU.play().catch(e=>{if(e&&e.name==="NotAllowedError")toast("Tap again to play 🔊")})}
function say(text,onend,voice){++playTok;const k=clipKey(text,voice);if(k){playUrl(ACC.audioBase+MAN[k]+".mp3",onend);return}deviceSay(text,onend)}
function stopAudio(){playTok++;try{AU.pause()}catch(e){}try{speechSynthesis.cancel()}catch(e){}}
function deviceSay(text,onend){
 if(window.speechSynthesis){try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);if(ZHV)u.voice=ZHV;u.lang=ZHV?ZHV.lang:"zh-CN";u.rate=slow?0.6:0.85;if(onend)u.onend=onend;speechSynthesis.speak(u);return}catch(e){}}
 toast("Audio is not available for this phrase.")}
function sayList(list){let i=0;const nx=()=>{if(i<list.length){const it=list[i++];Array.isArray(it)?say(it[0],()=>setTimeout(nx,500),it[1]):say(it,()=>setTimeout(nx,450))}};nx()}
document.addEventListener("click",e=>{const b=e.target.closest("[data-say]");if(b){e.stopPropagation();say(b.dataset.say,null,b.dataset.voice)}});

/* ---------- speech recognition ---------- */
let recBuf="",recCb=null,recPartial=null,recOn=false,webRec=null;
function wireDict(){DICT.onPartial(({text})=>{recPartial&&recPartial(recBuf+text)});DICT.onFinal(({text})=>{recBuf+=text;recPartial&&recPartial(recBuf)});DICT.onState(({state})=>{if(state==="idle"&&recOn){recOn=false;recCb&&recCb(recBuf)}})}
function canScore(){return !!(DICT||window.SpeechRecognition||window.webkitSpeechRecognition)}
function startRec(onPartial,onDone){
 recBuf="";recPartial=onPartial;recCb=onDone;recOn=true;
 if(DICT){DICT.start().catch(e=>{recOn=false;onDone(null,e&&e.code||String(e))});return true}
 const R=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(R){try{webRec=new R();webRec.lang="zh-CN";webRec.interimResults=true;
  webRec.onresult=ev=>{let t="";for(const r of ev.results)t+=r[0].transcript;recBuf=t;onPartial&&onPartial(t)};
  webRec.onerror=ev=>{recOn=false;onDone(null,ev.error)};webRec.onend=()=>{if(recOn){recOn=false;onDone(recBuf)}};webRec.start();return true}catch(e){recOn=false;onDone(null,"unsupported")}}
 return false}
function stopRec(){if(DICT){DICT.stop().catch(()=>{})}else if(webRec){try{webRec.stop()}catch(e){}}}
const PUNC=/[\s，。！？、：；,.!?:;"'“”‘’（）()…—\-]/g;
function lcs(a,b){const m=a.length,n=b.length,d=Array.from({length:m+1},()=>new Array(n+1).fill(0));for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=a[i-1]===b[j-1]?d[i-1][j-1]+1:Math.max(d[i-1][j],d[i][j-1]);
 const hit=new Array(m).fill(false);let i=m,j=n;while(i&&j){if(a[i-1]===b[j-1]){hit[i-1]=true;i--;j--}else if(d[i-1][j]>=d[i][j-1])i--;else j--}return {len:d[m][n],hit}}
function scoreSpeech(tzh,tpy,heard){
 const tz=[...tzh.replace(PUNC,"")],hz=[...(heard||"").replace(PUNC,"")];
 if(!hz.length)return {score:0,hit:tz.map(()=>false),mode:"none"};
 const han=hz.filter(c=>/[一-鿿]/.test(c)).length;
 if(han>=hz.length/2){const r=lcs(tz,hz);return {score:Math.round(200*r.len/(tz.length+hz.length)),hit:r.hit,mode:"zh"}}
 const tp=[...stripTones(tpy).replace(/[^a-z]/g,"")],hp=[...stripTones(heard).replace(/[^a-z]/g,"")];
 const r=lcs(tp,hp);return {score:Math.round(200*r.len/(tp.length+hp.length)),hit:tz.map(()=>true),mode:"py"}}
function band(s){return s>=90?["Amazing! 太棒了！","green"]:s>=70?["Great job! 很好！","green"]:s>=50?["Nice try — keep going!","sky"]:["Let's try again together","red"]}
function stars(s){return s>=90?"⭐⭐⭐":s>=70?"⭐⭐☆":s>=40?"⭐☆☆":"☆☆☆"}

/* ---------- friendly bits ---------- */
function panda(sz){sz=sz||64;return `<svg width="${sz}" height="${sz}" viewBox="0 0 100 100" aria-hidden="true"><circle cx="22" cy="24" r="14" fill="#2d2a32"/><circle cx="78" cy="24" r="14" fill="#2d2a32"/><circle cx="50" cy="55" r="40" fill="#fff" stroke="#2d2a32" stroke-width="3"/><ellipse cx="34" cy="52" rx="10" ry="13" fill="#2d2a32" transform="rotate(-20 34 52)"/><ellipse cx="66" cy="52" rx="10" ry="13" fill="#2d2a32" transform="rotate(20 66 52)"/><circle cx="36" cy="50" r="4" fill="#fff"/><circle cx="64" cy="50" r="4" fill="#fff"/><ellipse cx="50" cy="66" rx="6" ry="4" fill="#2d2a32"/><path d="M42 74 Q50 81 58 74" stroke="#2d2a32" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="25" cy="68" r="6" fill="#ffb3b3"/><circle cx="75" cy="68" r="6" fill="#ffb3b3"/></svg>`}
function bubble(msg,sz){return `<div class="bub">${panda(sz||58)}<div class="say">${msg}</div></div>`}
function confetti(){const em=["🎉","⭐","🧧","🎊","✨","🐼","💖"];for(let i=0;i<36;i++){const s=document.createElement("span");s.className="conf";s.textContent=em[i%em.length];s.style.left=Math.random()*100+"vw";s.style.animationDuration=(2+Math.random()*2)+"s";s.style.animationDelay=Math.random()*.6+"s";document.body.appendChild(s);setTimeout(()=>s.remove(),4800)}}
function audioToggle(){return `<label class="muted" style="font-size:14px;font-weight:700"><input type="checkbox" id="slow" ${slow?"checked":""}> 🐢 Slow audio</label>`}
document.addEventListener("change",e=>{if(e.target.id==="slow")slow=e.target.checked});

/* ---------- router ---------- */
let cur="home";const VIEWS={};
function go(v,arg){stopAudio();cur=v;if(v==="day")openDay(arg);document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("on",b.dataset.v===(v==="day"?"home":v)));try{if(v!=="day")history.replaceState(null,"","#"+v)}catch(e){}render();window.scrollTo(0,0)}
function render(){$("#main").innerHTML=VIEWS[cur]()}
$("#nav").addEventListener("click",e=>{const b=e.target.closest("button");if(b)go(b.dataset.v)});



/* ---------- plan helpers ---------- */
function dayWords(n){const p=PLAN[n-1];if(!p)return [];
 if(p.kind==="review"){let w=[];for(let d=n-6;d<n;d++)w=w.concat(PLAN[d-1].words||[]);return uniqW(w)}
 if(p.kind==="final"){let w=[];PLAN.forEach(x=>{if(x.words)w=w.concat(x.words)});return uniqW(w)}
 return p.words||[]}
function daySents(n){const p=PLAN[n-1];let s=[];
 if(p.kind==="review"){for(let d=n-6;d<n;d++)s=s.concat(PLAN[d-1].sents||[])}
 else if(p.kind==="final"){PLAN.forEach(x=>{if(x.sents)s=s.concat(x.sents)})}
 else s=p.sents||[];
 return uniqW(s)}
function learnedUpTo(n){let w=[];for(let d=1;d<=n;d++)w=w.concat(PLAN[d-1].words||[]);return uniqW(w)}
const ALLW=learnedUpTo(60);
function status(n){if(S.done[n])return "done";if(n===1)return "open";const pd=S.done[n-1];if(!pd)return "locked";if(S.fast||S.early[n]||pd.date!==today())return "open";return "tomorrow"}
function currentDay(){for(let n=1;n<=60;n++)if(!S.done[n])return n;return 60}
function weekOf(n){return Math.min(8,Math.floor((n-1)/7))}
function newCount(n){const p=PLAN[n-1];return (p.kind==="C"||p.kind==="review"||p.kind==="final")?0:(p.words||[]).length}

/* ---------- JOURNEY (home) ---------- */
function accountNudge(done){if(ACC.user||!done)return "";return `<div class="card" style="background:var(--sky2);border-color:#c9dcff"><div class="row between"><div style="flex:1;min-width:200px"><b>💾 Save your progress</b><div class="muted" style="font-weight:700;font-size:14px">Create a free account to keep your ${done} day${done>1?"s":""} safe and continue on any device.</div></div><a class="btn sky" href="${ACC.routes.register}">Create account</a></div></div>`}
const OFF=[0,55,85,55,0,-55,-85,-55];
VIEWS.home=()=>{
 const cd=currentDay(),p=PLAN[cd-1],st=status(cd),done=Object.keys(S.done).length;
 const hi=["你好! Ready for today?","加油! (jiāyóu — you can do it!)","Welcome back, superstar!","A little every day = fluent one day."][done%4];
 let h=`<div class="card hero">${bubble(`<span class="zh">${hi}</span>`)}
 <div class="row between"><div><span class="tag">${done===60?"Journey complete!":"Day "+cd+" of 60"}</span><div style="font-size:21px;font-weight:900;margin-top:4px">${p.emoji} ${esc(p.title)}</div><div class="muted" style="font-weight:700">${esc(p.goal)}</div>
 <div class="row" style="margin-top:6px">${cd>1&&p.kind!=="review"&&p.kind!=="final"?'<span class="tag sky">🔁 Recap of Day '+(cd-1)+'</span>':""}${newCount(cd)?'<span class="tag green">🆕 '+newCount(cd)+' new words</span>':""}${p.kind==="review"||p.kind==="final"?'<span class="tag grape">📝 Test day</span>':""}</div></div></div>
 <div style="margin-top:12px">${st==="tomorrow"?`<button class="btn sky big" onclick="go('day',${cd})">🌙 Unlocks tomorrow — tap to see</button>`:`<button class="btn pri big" onclick="go('day',${cd})">${S.done[cd]?"Review Day "+cd:"Start Day "+cd} →</button>`}</div>
 <div class="row between" style="margin-top:14px;font-weight:800;font-size:14px"><span>Journey progress</span><span>${done} / 60 days</span></div><div class="prog" style="margin-top:4px"><i style="width:${done/60*100}%"></i></div></div>
 ${accountNudge(done)}<div class="card"><b>🗓️ How each day works</b><table class="t" style="margin-top:6px"><tr><td>🔁</td><td><b>Recap test</b> of yesterday's words (5 questions)</td></tr><tr><td>🆕</td><td><b>New words</b> to remember, with audio</td></tr><tr><td>💬</td><td><b>Sentences</b>, grammar or a dialogue</td></tr><tr><td>🎙️</td><td><b>Speak & score</b> your pronunciation</td></tr><tr><td>✅</td><td><b>Quiz</b> on today's lesson</td></tr><tr><td>🏆</td><td>Every 7th day: <b>week test</b>. Day 60: <b>final exam</b></td></tr></table>
 <div class="muted" style="font-size:13px;margin-top:6px;font-weight:700">About 20 minutes a day. The next day unlocks tomorrow, so your brain gets a night to remember.</div></div>`;
 for(let w=0;w<9;w++){const W=WEEKS[w],a=w*7+1,b=Math.min(60,a+6);
  h+=`<div class="week" style="background:${W[2]}"><b>${W[1]} Week ${w+1}: ${W[0]}</b><small>Days ${a}–${b}</small></div><div class="path">`;
  for(let n=a;n<=b;n++){const q=PLAN[n-1],s=status(n),isCur=n===cd&&!S.done[n],sp=q.kind==="review"||q.kind==="final";
   const ic=s==="done"?"✓":s==="locked"?"🔒":s==="tomorrow"?"🌙":q.emoji;
   const bg=s==="done"?`background:var(--green);box-shadow:0 6px 0 #17915b`:(s==="open"?`background:${sp?"var(--sun)":W[2]};box-shadow:0 6px 0 rgba(0,0,0,.18)`:"");
   h+=`<div class="node" style="transform:translateX(${OFF[(n-1)%8]}px)" onclick="tapNode(${n})"><div class="dot ${s==="locked"?"locked":s==="tomorrow"?"tomorrow":""} ${isCur?"cur":""}" style="${bg}${sp?";border-radius:24px":""}">${ic}</div><div class="lb">Day ${n}<small>${esc(q.title)}</small></div></div>`}
  h+=`</div>`}
 return h};
function tapNode(n){const s=status(n);if(s==="locked"){toast("🐼 Finish Day "+(n-1)+" first!");return}go("day",n)}

/* ---------- DAY FLOW ---------- */
let D=null,spk=null;
const STEPN={recap:"🔁 Yesterday's recap",learn:"🔤 Learn the sounds",words:"🆕 New words",sents:"💬 Sentences",grammar:"💡 Grammar tip",dialog:"🗣️ Conversation",drill:"🎯 Tone game",speak:"🎙️ Speak & score",quiz:"✅ Today's quiz",done:"🎉 Done!"};
function openDay(n){const p=PLAN[n-1],st=[];
 if(n>1&&p.kind!=="review"&&p.kind!=="final")st.push("recap");
 if(p.kind==="pinyin")st.push("learn","words","drill","speak","quiz");
 if(p.kind==="A")st.push("words","sents","speak","quiz");
 if(p.kind==="B")st.push("words","sents","grammar","speak","quiz");
 if(p.kind==="C")st.push("dialog","speak","quiz");
 if(p.kind==="review"||p.kind==="final")st.push("quiz","speak");
 st.push("done");D={n,p,steps:st,i:0,res:{},q:null,dr:null};spk=null}
function nextStep(){D.i++;D.q=null;spk=null;render();window.scrollTo(0,0)}
function stepName(s){if(s==="quiz"&&D.p.kind==="review")return "🏆 Week test";if(s==="quiz"&&D.p.kind==="final")return "🎓 Final exam";if(s==="words"&&D.p.kind==="pinyin")return "🆕 Words to remember";return STEPN[s]}
VIEWS.day=()=>{const n=D.n,p=D.p,s=status(n);
 if(s==="locked")return `<button class="btn sm" onclick="go('home')">← Journey</button>${bubble("Finish Day "+(n-1)+" first, then come back! 🐼")}`;
 if(s==="tomorrow")return `<button class="btn sm" onclick="go('home')">← Journey</button><div class="card" style="text-align:center;margin-top:12px">${panda(90)}<h2>Day ${n} unlocks tomorrow 🌙</h2><p class="sub">Sleep helps your brain store today's words. Tomorrow starts with a recap test of Day ${n-1}.</p><div class="note" style="text-align:left"><b>Tonight:</b> say yesterday's words out loud once before bed.</div><div class="row center" style="margin-top:10px"><button class="btn" onclick="go('home')">See you tomorrow!</button><button class="btn sky" onclick="S.early[${n}]=1;save();render()">I'm keen — start now</button></div></div>`;
 const step=D.steps[D.i],W=WEEKS[weekOf(n)];
 let h=`<div class="row between"><button class="btn sm" onclick="go('home')">← Journey</button><span class="tag" style="background:${W[2]};color:#fff">Week ${weekOf(n)+1}</span></div>
 <h2 style="margin-top:10px">Day ${n} · ${p.emoji} ${esc(p.title)}</h2>
 <div class="steps">${D.steps.map((x,i)=>`<i class="${i<D.i?"ok":i===D.i?"on":""}"></i>`).join("")}</div>
 <div class="row between" style="margin-bottom:8px"><b style="font-size:18px">${stepName(step)}</b>${audioToggle()}</div>`;
 h+=STEP[step]();return h};
const cont=(label)=>`<button class="btn go big" style="margin-top:6px" onclick="nextStep()">${label||"Continue"} →</button>`;
const STEP={};
STEP.recap=()=>quizStep("recap");
STEP.quiz=()=>quizStep("quiz");
STEP.learn=()=>`${bubble(esc(D.p.goal))}${learnBlock(D.p.learn)}${cont("Got it")}`;
STEP.words=()=>{const w=D.p.words;return `${bubble(D.p.kind==="pinyin"?"Your first words! Tap each card to hear it, then say it out loud 3 times.":"Remember these <b>"+w.length+" words</b> today. Tap 🔊, then say each one aloud 3 times.")}
 <div class="row" style="margin-bottom:10px"><button class="btn sm" onclick='sayList(${JSON.stringify(w.map(x=>x[0])).replace(/'/g,"&#39;")})'>▶ Play all</button></div>
 <div class="grid g3">${w.map(v=>`<div class="wcard"><button class="icon" data-say="${v[0]}">🔊</button><div class="h">${v[0]}</div><div class="p">${colorPy(v[1])}</div><div class="m">${esc(v[2])}</div></div>`).join("")}</div>${cont("I've got these words")}`};
function sRow(s){return `<div class="sent"><div style="flex:1"><div class="zh">${s[0]}</div><div style="font-weight:700">${colorPy(s[1])}</div><div class="muted" style="font-size:14px;font-weight:600">${esc(s[2])}</div></div><button class="icon" data-say="${s[0]}">🔊</button></div>`}
STEP.sents=()=>`${bubble("Now use your words in real sentences. Listen, then read along.")}<div class="card">${D.p.sents.map(sRow).join("")}</div>${cont()}`;
STEP.grammar=()=>`${bubble("Here's today's grammar trick — it's simpler than it looks!")}<div class="note"><b style="font-size:17px">💡 ${esc(D.p.grammar.t)}</b><div style="margin-top:6px">${esc(D.p.grammar.b)}</div></div>${cont()}`;
STEP.dialog=()=>{const d=D.p.dialog;return `${bubble("Listen to the whole conversation, then read each line out loud.")}<div class="card"><button class="btn sm" onclick='sayList(${JSON.stringify(d.map(x=>[x[1],x[0]==="A"?"50":"48"])).replace(/'/g,"&#39;")})'>▶ Play conversation</button>
 ${d.map(x=>`<div class="dlg ${x[0]==="B"?"b":""}"><div class="who">${x[0]}</div><div class="bx"><div class="row between" style="flex-wrap:nowrap"><span class="zh" style="font-size:19px">${x[1]}</span><button class="icon" style="width:30px;height:30px;font-size:12px;flex:0 0 30px" data-say="${x[1]}" data-voice="${x[0]==="A"?"50":"48"}">🔊</button></div><div style="font-weight:700;font-size:14px">${colorPy(x[2])}</div><div class="muted" style="font-size:13px;font-weight:600">${esc(x[3])}</div></div></div>`).join("")}</div>
 <div class="card"><b>Chapter words</b><div class="row" style="margin-top:6px">${D.p.words.map(v=>`<button class="btn sm zh" data-say="${v[0]}">${v[0]}</button>`).join("")}</div></div>${cont()}`};

/* tone drill */
function drillPool(){const p=[];ALLW.forEach(v=>{if([...v[0]].length===1){const t=[...v[1]].map(toneOf).find(x=>x)||0;if(t)p.push({h:v[0],p:v[1],en:v[2],t})}});return uniqW(p.map(x=>[x.h,x])).map(x=>x[1])}
function makeDrill(seed){const own=(seed||[]).filter(v=>[...v[0]].length===1).map(v=>({h:v[0],p:v[1],en:v[2],t:[...v[1]].map(toneOf).find(x=>x)||0})).filter(x=>x.t);
 const pool=shuffle(drillPool());return [...shuffle(own),...pool.filter(x=>!own.some(o=>o.h===x.h))].slice(0,5)}
function drillBox(dr,onNext){const d=dr.qs[dr.i];
 if(!d){const sc=Math.round(100*dr.right/dr.qs.length);return `<div class="card" style="text-align:center"><div class="stars">${stars(sc)}</div><div class="score">${dr.right}/${dr.qs.length}</div><div class="tag ${band(sc)[1]}">${band(sc)[0]}</div><div style="margin-top:12px">${onNext}</div></div>`}
 return `<div class="card" style="text-align:center"><div class="muted" style="font-weight:800">Sound ${dr.i+1} of ${dr.qs.length} · listen and pick the tone</div><button class="btn pri" style="margin:14px auto;font-size:20px;padding:14px 26px" data-say="${d.h}">🔊 Play</button>
 <div class="row center">${[1,2,3,4].map(n=>`<button class="btn opt ${dr.ans?(n===d.t?"ok":(n===dr.ans?"no":"")):""}" style="width:auto;margin:4px;font-size:20px" ${dr.ans?"disabled":""} onclick="drillAns(${n})"><b class="t${n}">${TONES[n-1].mark}</b>&nbsp;${n}</button>`).join("")}</div>
 ${dr.ans?`<div style="margin-top:12px"><span class="zh" style="font-size:44px">${d.h}</span><div style="font-weight:800">${colorPy(d.p)} — ${esc(d.en)}</div><div class="tag ${dr.ans===d.t?"green":"red"}" style="margin-top:6px">${dr.ans===d.t?"Correct! 对了！":"It was tone "+d.t}</div><div style="margin-top:10px"><button class="btn go" onclick="drillNext()">Next →</button></div></div>`:""}</div>`}
let DR=null;
function curDrill(){return cur==="day"?D.dr:DR}
function drillAns(n){const dr=curDrill();dr.ans=n;S.tone.t++;if(n===dr.qs[dr.i].t){dr.right++;S.tone.r++;addXP(2)}else save();render()}
function drillNext(){const dr=curDrill();dr.i++;dr.ans=null;render();const q=dr.qs[dr.i];if(q)setTimeout(()=>say(q.h),200)}
STEP.drill=()=>{if(!D.dr)D.dr={qs:makeDrill(D.p.words),i:0,right:0,ans:null};return bubble("Tone game! Listen carefully and tap the tone you hear.")+drillBox(D.dr,`<button class="btn go big" onclick="nextStep()">Continue →</button>`)};



/* ---------- quiz engine ---------- */
function makeQuiz(pool,count,n){
 let dis=uniqW([...pool,...learnedUpTo(n)]);if(dis.length<6)dis=uniqW([...dis,...ALLW]);
 let picks=[];while(picks.length<count&&pool.length)picks=picks.concat(shuffle(pool));picks=picks.slice(0,count);
 return picks.map((v,k)=>{const wrong=shuffle(dis.filter(w=>w[0]!==v[0]&&w[2]!==v[2]&&w[1]!==v[1])).slice(0,3),opts=shuffle([v,...wrong]),a=opts.indexOf(v),type=k%4;
  const zhO=opts.map(o=>`<span class="zh" style="font-size:22px">${o[0]}</span>`);
  if(type===0)return {q:`What does <span class="zh" style="font-size:34px">${v[0]}</span> mean?`,opts:opts.map(o=>esc(o[2])),a,w:v};
  if(type===1)return {q:`Which one means <b>“${esc(v[2])}”</b>?`,opts:zhO,a,w:v};
  if(type===2)return {q:`🎧 Listen and pick the word <button class="icon" data-say="${v[0]}">🔊</button>`,opts:zhO,a,w:v};
  return {q:`Which characters are <b style="font-size:20px">${colorPy(v[1])}</b>?`,opts:zhO,a,w:v}})}
function qCount(kind){if(kind==="recap")return 5;const k=D.p.kind;return k==="final"?20:k==="review"?10:k==="C"?8:6}
function quizStep(kind){
 if(!D.q){const pool=kind==="recap"?dayWords(D.n-1):dayWords(D.n);D.q={qs:makeQuiz(pool,qCount(kind),D.n),i:0,right:0,pick:null,missed:[],kind}}
 const Q=D.q;
 if(Q.i>=Q.qs.length){const sc=Math.round(100*Q.right/Q.qs.length);
  if(!Q.awarded){Q.awarded=1;D.res[kind]=Math.max(D.res[kind]||0,sc);addXP(Math.round(sc/10)+2);if(sc>=70)setTimeout(confetti,50)}
  const miss=uniqW(Q.missed);
  return `<div class="card" style="text-align:center">${panda(70)}<div class="stars">${stars(sc)}</div><div class="score">${sc}%</div><div class="tag ${band(sc)[1]}">${band(sc)[0]}</div><div class="muted" style="font-weight:700;margin-top:6px">${Q.right} of ${Q.qs.length} correct</div></div>
  ${miss.length?`<div class="card"><b>📌 Words to look at again</b>${miss.map(v=>`<div class="sent"><div style="flex:1"><span class="zh" style="font-size:22px">${v[0]}</span> &nbsp;<b>${colorPy(v[1])}</b><div class="muted" style="font-weight:600">${esc(v[2])}</div></div><button class="icon" data-say="${v[0]}">🔊</button></div>`).join("")}</div>`:""}
  <div class="row"><button class="btn" style="flex:1" onclick="D.q=null;render()">🔄 Try again</button><button class="btn go" style="flex:2" onclick="nextStep()">Continue →</button></div>`}
 const q=Q.qs[Q.i],intro=Q.i===0?(kind==="recap"?bubble("Quick recap of <b>Day "+(D.n-1)+"</b>! Let's see what you remember 🧠"):D.p.kind==="final"?bubble("Final exam — 20 questions from all 60 days. You've got this! 💪"):D.p.kind==="review"?bubble("Week test — 10 questions on everything this week."):bubble("Quiz time! Show what you learned today.")):"";
 return `${intro}<div class="row between" style="font-weight:800;font-size:14px"><span>Question ${Q.i+1} / ${Q.qs.length}</span><span class="t3">✓ ${Q.right}</span></div><div class="prog" style="margin:6px 0 12px"><i style="width:${Q.i/Q.qs.length*100}%;background:var(--sun)"></i></div>
 <div class="card"><div style="font-size:18px;font-weight:800;margin-bottom:8px">${q.q}</div>${q.opts.map((o,i)=>`<button class="btn opt ${Q.pick!==null?(i===q.a?"ok":(i===Q.pick?"no":"")):""}" ${Q.pick!==null?"disabled":""} onclick="pickA(${i})">${o}</button>`).join("")}
 ${Q.pick!==null?`<div class="row between" style="margin-top:10px"><span style="font-weight:800" class="${Q.pick===q.a?"t3":"t1"}">${Q.pick===q.a?"🎉 Correct!":"💡 "+q.w[0]+" = "+esc(q.w[2])}</span><button class="btn go" onclick="D.q.i++;D.q.pick=null;render()">Next →</button></div>`:""}</div>`}
function pickA(i){const Q=D.q,q=Q.qs[Q.i];Q.pick=i;if(i===q.a){Q.right++;}else Q.missed.push(q.w);say(q.w[0]);render()}

/* ---------- speaking ---------- */
function daySpeakItems(){const n=D.n,p=D.p;
 if(p.kind==="pinyin")return p.words;
 if(p.kind==="C")return [...p.sents.slice(0,3),...p.dialog.map(x=>x.slice(1))].slice(0,6);
 if(p.kind==="review")return shuffle(daySents(n)).slice(0,5);
 if(p.kind==="final")return shuffle(daySents(n)).slice(0,6);
 return [...p.sents,...p.words.filter(v=>[...v[0]].length>1).slice(0,3)]}
function speakBox(items,ctx){
 if(!spk)spk={items,i:0,res:null,heard:"",live:false,err:null,scores:[]};
 const it=spk.items[spk.i],ok=canScore();
 if(!it){const sc=spk.scores.filter(x=>x!=null),avg=sc.length?Math.round(sc.reduce((a,b)=>a+b,0)/sc.length):0;
  if(ctx==="day"&&!spk.awarded){spk.awarded=1;D.res.speak=avg;addXP(Math.round(avg/10)+2)}
  return `<div class="card" style="text-align:center">${panda(70)}<div class="muted" style="font-weight:800">Speaking average</div><div class="stars">${stars(avg)}</div><div class="score">${avg}</div><div class="tag ${band(avg)[1]}">${band(avg)[0]}</div></div>
  <div class="row"><button class="btn" style="flex:1" onclick="spk=null;render()">🔄 Again</button>${ctx==="day"?`<button class="btn go" style="flex:2" onclick="nextStep()">Continue →</button>`:""}</div>`}
 const chars=[...it[0].replace(PUNC,"")];
 let h=`<div class="row between" style="font-weight:800;font-size:14px"><span>Phrase ${spk.i+1} / ${spk.items.length}</span></div><div class="card" style="text-align:center;margin-top:6px">
 <div class="zh" style="font-size:34px;line-height:1.3">${spk.res?spk.res.hit.map((x,i)=>`<span class="${x?"ch-ok":"ch-no"}">${esc(chars[i])}</span>`).join(""):it[0]}</div>
 <div style="font-size:19px;font-weight:800">${colorPy(it[1])}</div><div class="muted" style="font-weight:700">${esc(it[2])}</div>
 <div class="row center" style="margin-top:14px"><button class="btn sky" data-say="${it[0]}">🔊 1. Listen</button>${ok?`<button class="btn pri" onclick="toggleRec()">${spk.live?"⏹ Stop & score":"🎙️ 2. Speak"}</button>`:""}</div>`;
 if(spk.live)h+=`<div class="heard">🎙️ Listening… say it, then tap Stop.<div class="zh" id="livetxt" style="margin-top:6px">${esc(spk.heard)}</div></div>`;
 if(spk.err)h+=`<div class="note">Microphone not available (${esc(spk.err)}). Use the self-check below.</div>`;
 if(spk.res){const b=band(spk.res.score);h+=`<div style="margin-top:14px"><div class="stars">${stars(spk.res.score)}</div><div class="score" style="color:var(--${b[1]==="red"?"coral":b[1]==="sky"?"sky":"green"})">${spk.res.score}</div><div class="tag ${b[1]}">${b[0]}</div><div class="heard"><span class="muted" style="font-size:13px;font-weight:700">We heard:</span><div class="zh">${esc(spk.heard)||"—"}</div></div>${spk.res.mode==="py"?'<div class="muted" style="font-size:12px;margin-top:6px">The recogniser returned Latin letters, so tones were not checked.</div>':""}</div>`}
 if(!ok||spk.err)h+=`<div style="margin-top:14px"><div class="muted" style="font-size:13px;font-weight:700;margin-bottom:6px">Self-check: say it aloud 3 times, compare with the audio, then rate yourself.</div><div class="row center"><button class="btn" onclick="selfRate(40)">😕 Hard</button><button class="btn" onclick="selfRate(70)">🙂 Close</button><button class="btn" onclick="selfRate(95)">😃 Nailed it</button></div></div>`;
 h+=`<div class="row between" style="margin-top:16px"><button class="btn sm" ${spk.i?"":"disabled"} onclick="spk.i--;spk.res=null;spk.heard='';render()">← Back</button><button class="btn sm" onclick="nextSpk()">${spk.res?"Next →":"Skip →"}</button></div></div>`;
 if(ok&&!spk.res)h+=`<div class="muted" style="font-size:12px;font-weight:600">Your score is how many characters a Mandarin speech recogniser understood. Clear tones mean more correct characters and a higher score.</div>`;
 return h}
function toggleRec(){if(spk.live){stopRec();return}
 spk.live=true;spk.heard="";spk.res=null;spk.err=null;const it=spk.items[spk.i];
 const started=startRec(t=>{spk.heard=t;const el=$("#livetxt");if(el)el.textContent=t},(t,err)=>{spk.live=false;if(err){spk.err=err;render();return}spk.heard=t||"";spk.res=scoreSpeech(it[0],it[1],spk.heard);spk.scores[spk.i]=spk.res.score;S.speak.push({d:today(),s:spk.res.score});if(S.speak.length>300)S.speak.shift();addXP(spk.res.score>=70?3:1);render()});
 if(!started){spk.live=false;spk.err="unsupported"}render()}
function selfRate(n){spk.scores[spk.i]=n;S.speak.push({d:today(),s:n,self:1});addXP(1);nextSpk()}
function nextSpk(){spk.i++;spk.res=null;spk.heard="";spk.err=null;render()}
STEP.speak=()=>bubble("Listen first, then say it yourself. I'll score your pronunciation!")+speakBox(daySpeakItems(),"day");

/* ---------- done ---------- */
STEP.done=()=>{const n=D.n,first=!S.done[n];
 if(first){S.done[n]={date:today(),recap:D.res.recap,quiz:D.res.quiz,speak:D.res.speak};addXP(20);setTimeout(confetti,80)}
 const r=S.done[n],nx=PLAN[n],learned=learnedUpTo(n).length;
 const chip=(k,v)=>v==null?"":`<div class="card stat" style="margin:0"><div class="v">${v}${k==="Speaking"?"":"%"}</div><div class="k">${k}</div></div>`;
 let h=`<div class="card" style="text-align:center">${panda(100)}<h2>Day ${n} complete! 🎉</h2><p class="sub">${first?"+20 XP bonus. ":""}You now know <b>${learned}</b> Mandarin words.</p>
 <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(90px,1fr))">${chip("Recap",r.recap)}${chip("Quiz",r.quiz)}${chip("Speaking",r.speak)}</div></div>`;
 if(n===60)h+=`<div class="card cert">${panda(80)}<div class="muted" style="font-weight:800;letter-spacing:2px">CERTIFICATE OF COMPLETION</div><h2 class="zh">恭喜你！Congratulations!</h2><p style="font-weight:700">You completed the <b>60-Day Mandarin Path</b><br>${learned} words · 15 chapters · ${today()}</p><p class="muted" style="font-weight:700">Next step: HSK 2–3 practice, graded readers, and a weekly language partner.</p></div>`;
 else h+=`<div class="card"><b>🌙 Tomorrow: Day ${n+1}</b><div style="font-size:18px;font-weight:900;margin-top:4px">${nx.emoji} ${esc(nx.title)}</div><div class="muted" style="font-weight:700">${nx.kind==="review"?"A week test on Days "+(n-5)+"–"+n+".":nx.kind==="final"?"The final exam!":"Starts with a recap test of today's words."}${newCount(n+1)?" Then "+newCount(n+1)+" new words.":""}</div>
 <div class="note" style="margin-bottom:0"><b>Before bed:</b> say today's words out loud once. ${(D.p.words||[]).slice(0,6).map(v=>`<span class="zh" data-say="${v[0]}" style="cursor:pointer;text-decoration:underline dotted">${v[0]}</span>`).join(" · ")}</div></div>`;
 h+=`<div class="row"><button class="btn" style="flex:1" onclick="go('home')">🗺️ Journey</button>${n<60&&status(n+1)==="open"?`<button class="btn pri" style="flex:1" onclick="go('day',${n+1})">Day ${n+1} →</button>`:""}</div>`;
 return h};

/* ---------- pinyin learning blocks (shared with Pinyin tab) ---------- */
function pyGrid(list){return `<div class="grid g4">${list.map(i=>`<div class="py" data-say="${i[1]}"><b>${i[0]}</b><span class="zh">${i[1]}</span> <span>${colorPy(i[2])}</span></div>`).join("")}</div>`}
function learnBlock(k){
 if(k==="tones")return `<div class="grid g2">${TONES.map(t=>`<div class="card" style="margin:0"><div class="row"><svg class="toneline" viewBox="0 0 60 44"><path d="${t.shape}" stroke="var(--t${t.n})" stroke-width="5" fill="none" stroke-linecap="round"/></svg><b class="t${t.n}" style="font-size:30px">${t.mark}</b><button class="icon" style="margin-left:auto" data-say="${t.ex[0]}">🔊</button></div><b>${t.name}</b><div class="muted" style="font-weight:600">${t.desc}</div><div style="margin-top:6px"><span class="zh" style="font-size:24px">${t.ex[0]}</span> ${colorPy(t.ex[1])} <span class="muted">${t.ex[2]}</span></div></div>`).join("")}</div>
  <div class="card" style="margin-top:12px"><b>Hear the difference — same sound, 4 meanings</b><div class="row" style="margin-top:8px">${TONES.map(t=>`<button class="btn" data-say="${t.ex[0]}"><span class="zh">${t.ex[0]}</span>&nbsp;<span class="t${t.n}">${t.ex[1]}</span></button>`).join("")}</div></div>`;
 if(k==="sandhi")return SANDHI.map(r=>`<div class="card"><b>${r.t}</b><div style="font-weight:600">${r.b}</div><div class="row" style="margin-top:8px"><span class="zh" style="font-size:24px">${r.ex[0]}</span> ${colorPy(r.ex[1])}<button class="icon" data-say="${r.ex[0]}">🔊</button></div></div>`).join("");
 const tips=keys=>`<div class="card" style="margin-top:12px">${keys.map(x=>`<div class="sent"><b style="color:var(--grape);font-size:18px;min-width:30px">${x}</b><span style="font-weight:600">${INIT_TIPS[x]}</span></div>`).join("")}</div>`;
 if(k==="init1"){const ks=["b","p","m","f","d","t","n","l","g","k","h"];return `<div class="note">💨 Hold a tissue in front of your mouth: <b>p, t, k</b> make it move; <b>b, d, g</b> don't.</div>${pyGrid(INITIALS.filter(i=>ks.includes(i[0])))}${tips(["b","p","d","t","g","k","h"])}`}
 if(k==="init2"){const ks=["j","q","x","zh","ch","sh","r","z","c","s"];return `<div class="note">👅 <b>zh ch sh r</b>: curl your tongue back. <b>j q x</b>: tongue flat, smile. <b>z c s</b>: tongue behind your teeth.</div>${pyGrid(INITIALS.filter(i=>ks.includes(i[0])))}${tips(ks)}`}
 if(k==="finals")return `<div class="note">😗 For <b>ü</b>: say “ee” and round your lips like a whistle.</div>${pyGrid(FINALS)}`;
 if(k==="rules")return `<div class="card"><b>✍️ Spelling rules</b><div class="sent" style="font-weight:600">After j, q, x and y, ü is written u: ju, qu, xu, yu.</div><div class="sent" style="font-weight:600">Syllables starting with i / u / ü use y / w: i→yi, u→wu, ü→yu, ian→yan, uo→wo.</div><div class="sent" style="font-weight:600">iou, uei, uen are shortened: liù (not liòu), duì, chūn.</div></div>
  <div class="card"><b>📍 Where the tone mark goes</b><div class="sent" style="font-weight:600">1. On <b>a</b> or <b>e</b> if there is one: hǎo, xiè.</div><div class="sent" style="font-weight:600">2. In <b>ou</b>, on the o: gǒu.</div><div class="sent" style="font-weight:600">3. Otherwise on the last vowel: duì, liù.</div></div>
  <div class="note">🎯 Read these: <span class="zh" data-say="中文" style="cursor:pointer">Zhōngwén</span> · <span data-say="老师" style="cursor:pointer">lǎoshī</span> · <span data-say="朋友" style="cursor:pointer">péngyou</span> — tap to check.</div>`;
 return ""}



/* ---------- PINYIN TAB ---------- */
let ptab="tones";
VIEWS.pinyin=()=>{const tabs=[["tones","🎵 Tones"],["init","🅱️ Consonants"],["fin","🅰️ Vowels"],["rules","🔀 Tone changes"],["spell","✍️ Spelling"],["drill","🎯 Tone game"]];
 let h=`<h2>Pinyin Lab 🔤</h2>${bubble("Pinyin is how Mandarin is written with Roman letters. Tap anything to hear it!")}<div class="row between">${audioToggle()}</div><div class="tabs2">${tabs.map(t=>`<button class="${ptab===t[0]?"on":""}" onclick="ptab='${t[0]}';DR=null;render()">${t[1]}</button>`).join("")}</div>`;
 if(ptab==="tones")h+=learnBlock("tones");
 if(ptab==="init")h+=learnBlock("init1")+learnBlock("init2");
 if(ptab==="fin")h+=learnBlock("finals");
 if(ptab==="rules")h+=learnBlock("sandhi");
 if(ptab==="spell")h+=learnBlock("rules");
 if(ptab==="drill"){if(!DR)DR={qs:makeDrill([]),i:0,right:0,ans:null};const acc=S.tone.t?Math.round(100*S.tone.r/S.tone.t):0;
  h+=drillBox(DR,`<button class="btn go" onclick="DR=null;render()">Play again 🎯</button>`)+`<div class="muted center" style="font-weight:700;text-align:center">All-time tone accuracy: <b>${acc}%</b> (${S.tone.r}/${S.tone.t})</div>`}
 return h};

/* ---------- SPEAK TAB ---------- */
let spkChap=1,spkKey=null;
VIEWS.speak=()=>{if(spkKey!==spkChap){spk=null;spkKey=spkChap}
 const c=CHAPTERS[spkChap-1],items=[...c.sents,...c.vocab.filter(v=>[...v[0]].length>1).slice(0,4)];
 return `<h2>Speak & Score 🎙️</h2>${bubble("Pick a chapter, listen, then speak. I'll give you a score out of 100!")}
 <div class="row" style="margin-bottom:12px"><select class="btn" onchange="spkChap=+this.value;render()">${CHAPTERS.map(x=>`<option value="${x.id}" ${x.id===spkChap?"selected":""}>${CH_EMOJI[x.id]} ${x.id}. ${x.title}</option>`).join("")}</select>${audioToggle()}</div>
 ${speakBox(items,"tab")}
 ${canScore()?"":`<div class="note"><b>Automatic scoring needs speech recognition.</b> Use Chrome, Edge or Safari to be scored from your voice. In other browsers you can still listen and rate yourself.</div>`}
 <div class="card"><b>🌟 Tips to sound natural</b><ul style="margin:6px 0 0;padding-left:20px;font-weight:600"><li>Exaggerate the tones at first — the 4th tone should feel almost bossy!</li><li>Shadow: play the audio and speak along at the same time.</li><li>Use slow audio first, then normal speed.</li><li>Record yourself on your phone and compare.</li></ul></div>`};

/* ---------- READ TAB ---------- */
let rtab="rad",showPy=true,rIdx=0;
VIEWS.read=()=>{const tabs=[["rad","🧩 Radicals"],["stroke","✍️ Strokes"],["pass","📖 Stories"]];
 let h=`<h2>Reading 📖</h2>${bubble("Characters are built from small parts called radicals. Learn the parts and new characters get easy to guess!")}<div class="tabs2">${tabs.map(t=>`<button class="${rtab===t[0]?"on":""}" onclick="rtab='${t[0]}';render()">${t[1]}</button>`).join("")}</div>`;
 if(rtab==="rad")h+=`<div class="grid g2">${RADICALS.map(r=>`<div class="card" style="margin:0"><div class="row"><div class="zh" style="font-size:42px;color:var(--coral);width:56px;text-align:center;font-weight:700">${r[0]}</div><div><b style="font-size:17px">${esc(r[2])}</b><div class="muted zh" style="font-size:13px">${r[1]}</div></div></div><div class="row" style="margin-top:8px">${r[3].map(ch=>`<button class="btn sm zh" style="font-size:19px" data-say="${ch}">${ch}</button>`).join("")}</div></div>`).join("")}</div>`;
 if(rtab==="stroke")h+=`<div class="card"><b>7 stroke-order rules</b>${STROKES.map((s,i)=>`<div class="sent" style="font-weight:600"><b style="color:var(--grape)">${i+1}</b> ${esc(s)}</div>`).join("")}</div><div class="note">✏️ Write each new word 5 times while saying it out loud. Handwriting helps memory!</div><div class="card"><b>⌨️ Typing Chinese</b><div style="font-weight:600">Add the “Chinese (Simplified) – Pinyin” keyboard on your phone. Type <b>nihao</b> and pick 你好.</div></div>`;
 if(rtab==="pass"){const r=READINGS[rIdx],toks=r.t.split(" ");
  h+=`<div class="row" style="margin-bottom:10px">${READINGS.map((x,i)=>`<button class="btn sm ${i===rIdx?"pri":""}" onclick="rIdx=${i};render()">${x.zh}</button>`).join("")}</div>
  <div class="card reading ${showPy?"":"hide-py"}"><div class="row between"><div><b style="font-size:18px">${r.title}</b> <span class="tag">${r.level.replace("Ch.","Ch")}</span></div><div class="row"><button class="btn sm" onclick="showPy=!showPy;render()">${showPy?"Hide":"Show"} pinyin</button><button class="btn sm" data-say="${toks.map(t=>t.split(":")[0]).join("")}">🔊 Read aloud</button></div></div>
  <div class="zh" style="margin-top:10px">${toks.map(t=>{const [c,p]=t.split(":");return p?`<ruby>${c}<rt>${esc(p)}</rt></ruby>`:c}).join("")}</div>
  <details style="margin-top:10px"><summary class="muted" style="font-weight:800">Show English</summary><div style="margin-top:6px;font-weight:600">${esc(r.en)}</div></details></div>
  <div class="note">📚 Read it 3 times: with pinyin → without pinyin → out loud.</div>`}
 return h};

/* ---------- ME TAB ---------- */
let rstArm=false;
VIEWS.me=()=>{const done=Object.keys(S.done).length,words=learnedUpTo(Math.max(0,...Object.keys(S.done).map(Number),0)),wl=uniqW(Object.keys(S.done).flatMap(n=>PLAN[n-1].words||[]));
 const sp=S.speak.slice(-20),avg=sp.length?Math.round(sp.reduce((a,b)=>a+b.s,0)/sp.length):0,acc=S.tone.t?Math.round(100*S.tone.r/S.tone.t):0;
 const quizzes=Object.values(S.done).map(x=>x.quiz).filter(x=>x!=null),qa=quizzes.length?Math.round(quizzes.reduce((a,b)=>a+b,0)/quizzes.length):0;
 return `<h2>My Progress 🐼</h2>${bubble(done?`You've studied <b>${done}</b> days and learned <b>${wl.length}</b> words. 你真棒! (You're awesome!)`:"Your adventure starts with Day 1. Let's go!")}
 ${ACC.user?`<div class="card"><div class="row between"><div><b>👤 ${esc(ACC.user.name)}</b><div class="muted" style="font-weight:700;font-size:14px">${esc(ACC.user.email)}</div><div id="syncst" style="font-weight:700;font-size:13px;margin-top:4px">${syncLabel()}</div></div><button class="btn sm" onclick="logout()">Log out</button></div></div>`:`<div class="card" style="background:var(--sky2);border-color:#c9dcff"><b>💾 Keep your progress safe</b><div class="muted" style="font-weight:700;font-size:14px;margin:4px 0 10px">You're learning as a guest, so progress is saved on this device only. Create a free account to save it and continue on any device.</div><div class="row"><a class="btn sky" href="${ACC.routes.register}">Create free account</a><a class="btn" href="${ACC.routes.login}">Sign in</a></div></div>`}
 <div class="grid g3">${[["🔥","Day streak",streak()],["⭐","XP",S.xp],["🗓️","Days done",done+"/60"],["🆕","Words learned",wl.length],["✅","Quiz average",qa+"%"],["🎯","Tone accuracy",acc+"%"],["🎙️","Speaking (last 20)",avg]].map(x=>`<div class="card stat" style="margin:0"><div style="font-size:24px">${x[0]}</div><div class="v">${x[2]}</div><div class="k">${x[1]}</div></div>`).join("")}</div>
 <h3>📒 My word bank (${wl.length})</h3>
 <div class="card">${wl.length?`<div class="row">${wl.map(v=>`<button class="btn sm" data-say="${v[0]}" title="${esc(v[1]+" — "+v[2])}"><span class="zh" style="font-size:17px">${v[0]}</span>&nbsp;<span class="muted" style="font-size:12px">${esc(v[2])}</span></button>`).join("")}</div>`:`<div class="muted" style="font-weight:700">Words appear here after you finish each day.</div>`}</div>
 <h3>⚙️ Settings</h3>
 <div class="card"><label style="font-weight:700;display:flex;gap:10px;align-items:flex-start"><input type="checkbox" ${S.fast?"checked":""} onchange="S.fast=this.checked;save()" style="margin-top:5px"><span>Fast mode — unlock the next day right away instead of waiting until tomorrow<div class="muted" style="font-size:13px">Recommended off: one day at a time helps you remember.</div></span></label></div>
 <div class="card"><b>🎓 After the 60 days</b><ul style="margin:6px 0 0;padding-left:20px;font-weight:600"><li><b>HSK exams:</b> this journey covers HSK 1 and much of HSK 2.</li><li><b>Graded readers:</b> short books written for learners.</li><li><b>Shows with Chinese subtitles:</b> listen and read together.</li><li><b>A language partner:</b> speak with a native speaker every week.</li></ul></div>
 <button class="btn" onclick="resetAll()">Reset all progress</button><div class="muted" style="font-size:12px;font-weight:700;margin-top:6px">${ACC.user?"This also clears the progress saved to your account.":""}</div> <span id="rst" class="muted" style="font-size:13px;font-weight:700"></span>`};
function resetAll(){if(!rstArm){rstArm=true;$("#rst").textContent="Tap again to confirm";setTimeout(()=>{rstArm=false;const e=$("#rst");if(e)e.textContent=""},4000);return}rstArm=false;S=blank();save();render()}

/* ---------- init ---------- */
renderXP();
const h0=(location.hash||"").slice(1);go(VIEWS[h0]&&h0!=="day"?h0:"home");
if(ACC.user)pullProgress();
if(ACC.welcome)setTimeout(()=>{toast("🎉 Welcome, "+ACC.user.name+"! Your progress now saves to your account.");confetti()},400);
window.addEventListener("hashchange",()=>{const h=location.hash.slice(1);if(VIEWS[h]&&h!==cur&&h!=="day")go(h)});


