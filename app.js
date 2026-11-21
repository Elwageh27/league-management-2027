// League Management 2026-2027 — static GitHub Pages data + Apps Script admin publishing
// After deploying the NEW multi-league Apps Script as a Web App, paste its /exec URL here.
const API_URL = 'https://script.google.com/macros/s/AKfycbzypgyDutIs7dKeS3J0wKA2RTAGVGfjU5MDq3AbahRvvMjfongc841AqGOlSnwxPMqD/exec';
const $ = id => document.getElementById(id);
const state = { leagues:[], common:{news:[],siteSettings:{}}, league:null, selectedId:'FOURTH', isAdmin:false, pin:'', data:null };
const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = v => Number(v || 0);
const weekName = n => ({0:'لم يبدأ',1:'الأول',2:'الثاني',3:'الثالث',4:'الرابع',5:'الخامس',6:'السادس',7:'السابع',8:'الثامن',9:'التاسع',10:'العاشر',11:'الحادي عشر',12:'الثاني عشر'}[n] || String(n));
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),3300);}
function jsonpData(params){
  return new Promise((resolve,reject)=>{
    const cb='leagueData_'+Date.now()+'_'+Math.random().toString(36).slice(2,9);
    const script=document.createElement('script');
    const timer=setTimeout(()=>{delete window[cb];script.remove();reject(new Error('انتهت مهلة تحميل البيانات'));},20000);
    window[cb]=data=>{clearTimeout(timer);delete window[cb];script.remove();if(data&&data.success===false)reject(new Error(data.error||'تعذر تحميل البيانات'));else resolve(data);};
    script.onerror=()=>{clearTimeout(timer);delete window[cb];script.remove();reject(new Error('تعذر الاتصال بمصدر البيانات'));};
    script.src=API_URL+'?'+new URLSearchParams({...params,callback:cb,_:Date.now()}).toString();
    document.head.appendChild(script);
  });
}
function normalizeLeague(raw){
  const l=raw.league||{};
  const teams=(raw.teams||[]).map(t=>({id:String(t.Team_ID),name:String(t.Team_Name||'فريق'),logo:t.Logo_URL||''}));
  const matches=(raw.matches||[]).map(m=>({id:String(m.Match_ID),week:num(m.Week),date:m.Match_Date||'',homeId:String(m.Home_Team_ID),awayId:String(m.Away_Team_ID),homeGoals:m.Home_Score===''?'':num(m.Home_Score),awayGoals:m.Away_Score===''?'':num(m.Away_Score),status:String(m.Status||'played')}));
  const standings=(raw.standings||[]).map(t=>({id:String(t.Team_ID),name:String(t.Team_Name||''),played:num(t.Played),won:num(t.Won),drawn:num(t.Drawn),lost:num(t.Lost),gf:num(t.Goals_For),ga:num(t.Goals_Against),diff:num(t.Goal_Difference),points:num(t.Points),position:num(t.Position)}));
  const settings={};(raw.settings||[]).forEach(s=>settings[String(s.Setting_Key)]=s.Setting_Value);
  return {league:{id:String(l.League_ID),name:String(l.League_Name||'مسابقة'),category:String(l.Category||''),season:String(l.Season||'2026/2027'),region:String(l.Region||''),week:num(l.Current_Week)},teams,matches,standings,settings};
}
async function loadCommon(){
  try{
    const c=await jsonpData({action:'getNews'});
    state.common={news:(c.news||[]).filter(n=>String(n.Is_Active).toLowerCase()==='true'||n.Is_Active===true).map(n=>({id:String(n.News_ID),title:String(n.Title||''),content:String(n.Content||''),date:n.Created_At||'',image:String(n.Image_URL||''),video:String(n.Video_URL||'')})),siteSettings:c.siteSettings||{}};
  }catch(e){state.common={news:[],siteSettings:{}};console.warn(e);}
  renderNews();
}
async function loadLeague(id){
  const raw=await jsonpData({action:'getLeague',leagueId:id});
  state.data=normalizeLeague(raw);state.selectedId=id;state.league=state.data.league;
  renderLeague();return state.data;
}
function renderLeagueCards(){
  $('leagueGrid').innerHTML=state.leagues.map((l,i)=>`<button class="league-card ${l.League_ID===state.selectedId?'active':''}" data-league="${esc(l.League_ID)}"><div class="league-card-top"><span class="league-icon">${String(l.Category||'').includes('مواليد')?'👟':'🏆'}</span><span class="league-arrow">←</span></div><h3>${esc(l.League_Name)}</h3><p>${esc(l.Season||'2026/2027')}${(l.Region||l.Category)?' · '+esc(l.Region||l.Category):''}</p></button>`).join('');
  $('adminLeagueSelect').innerHTML=state.leagues.map(l=>`<option value="${esc(l.League_ID)}">${esc(l.League_Name)}</option>`).join('');
  $('leagueGrid').querySelectorAll('[data-league]').forEach(b=>b.addEventListener('click',()=>selectLeague(b.dataset.league,true)));
}
async function selectLeague(id,scroll){
  try{
    await loadLeague(id);$('adminLeagueSelect').value=id;try{history.replaceState(null,'','#league='+encodeURIComponent(id));}catch(_){}
    $('leagues').classList.add('hidden');
    $('competitionPanel').classList.remove('hidden');$('standingsSection').classList.remove('hidden');$('matches').classList.remove('hidden');renderNewsFeed();
    if(scroll)$('competitionPanel').scrollIntoView({behavior:'smooth',block:'start'});
  }catch(e){toast('تعذر تحميل المسابقة: '+e.message);console.error(e);}
}
function renderLeague(){
  const d=state.data,l=d.league,s=d.standings;
  $('competitionTitle').textContent=l.name;$('competitionRegion').textContent=l.region||('موسم '+l.season);
  $('selectedWeek').textContent=l.week?'الأسبوع الحالي: '+weekName(l.week):'لم تبدأ المباريات';
  $('tableLeagueName').textContent=l.name;$('tableRegion').textContent=l.region||('موسم '+l.season);$('tableWeek').textContent=l.week?'بعد الأسبوع '+weekName(l.week):'لم تبدأ المباريات';
  $('standingsBody').innerHTML=s.map((t,i)=>`<tr><td class="rank ${i<3?'top':''}">${i+1}</td><td class="team-cell"><button class="team-link" type="button" data-team="${esc(t.id)}">${esc(t.name)}</button>${formDots(t.id)}</td><td>${t.played}</td><td class="positive">${t.won}</td><td>${t.drawn}</td><td>${t.lost}</td><td>${t.gf}</td><td>${t.ga}</td><td class="${t.diff>0?'positive':t.diff<0?'negative':''}">${t.diff>0?'+':''}${t.diff}</td><td class="points">${t.points}</td></tr>`).join('')||'<tr><td colspan="10">لا توجد فرق في هذه المسابقة.</td></tr>';
  const played=d.matches.filter(m=>m.homeGoals!==''&&m.awayGoals!=='').sort((a,b)=>b.week-a.week);
  $('matchesCount').textContent=played.length+' مباراة';
  $('matchesList').innerHTML=played.length?played.map(matchHTML).join(''):'<div class="empty-state">لا توجد نتائج مسجلة حتى الآن.</div>';
  Object.keys(imgCache).forEach(k=>delete imgCache[k]);
  renderResultsPicker(played);renderStats(d,played);renderHeroCounters(d);
  if(state.isAdmin)renderAdmin();
}
function renderResultsPicker(played){
 const weeks=[...new Set(played.map(m=>m.week))].sort((a,b)=>b-a),sel=$('resultsWeek'),bar=$('resultsShare');
 bar.classList.toggle('hidden',!weeks.length);
 sel.innerHTML=weeks.map(w=>`<option value="${esc(w)}">${esc(weekName(Number(w)))}</option>`).join('');
 if(weeks.length)sel.value=String(weeks[0]);
}
function statCells(d){
 const played=d.matches.filter(m=>m.homeGoals!==''&&m.awayGoals!==''),teams=d.standings.filter(t=>t.played>0);
 if(!teams.length||!played.length)return [];
 const pick=(fn,max)=>{const v=teams.map(fn),t=max?Math.max(...v):Math.min(...v);return {ts:teams.filter(x=>fn(x)===t),v:t};};
 const names=ts=>ts.length>3?'عدة فرق ('+ts.length+')':ts.map(t=>t.name).join(' • ');
 const best=(arr,fn)=>arr.reduce((x,y)=>fn(y)>fn(x)?y:x);
 const line=m=>teamName(m.homeId)+' '+m.homeGoals+' - '+m.awayGoals+' '+teamName(m.awayId);
 const A=pick(t=>t.gf,1),WA=pick(t=>t.gf,0),D=pick(t=>t.ga,0),WD=pick(t=>t.ga,1),W=pick(t=>t.won,1),LW=pick(t=>t.won,0);
 const big=best(played,m=>Math.abs(m.homeGoals-m.awayGoals)),bd=Math.abs(big.homeGoals-big.awayGoals),gm=best(played,m=>m.homeGoals+m.awayGoals),gs=gm.homeGoals+gm.awayGoals;
 return [['أقوى هجوم',names(A.ts),A.v+' هدف'],['أضعف هجوم',names(WA.ts),WA.v+' هدف'],['أقوى دفاع',names(D.ts),D.v+' هدف مستقبل'],['أضعف دفاع',names(WD.ts),WD.v+' هدف مستقبل'],['الأكثر فوزًا',names(W.ts),W.v+' فوز'],['الأقل فوزًا',names(LW.ts),LW.v+' فوز'],['أكبر فوز',bd>0?line(big):'كل المباريات تعادل',bd>0?'فارق '+bd+' أهداف':'—'],['أغزر مباراة أهدافًا',gs>0?line(gm):'لا أهداف بعد',gs>0?gs+' أهداف':'—']];
}
function renderStats(d,played){
 const box=$('statsStrip'),sh=$('statsShare'),cells=statCells(d);
 box.classList.toggle('hidden',!cells.length);sh.classList.toggle('hidden',!cells.length);
 box.innerHTML=cells.map((c,i)=>`<div class="stat ${[1,3,5].includes(i)?'weak':''}"><span>${c[0]}</span><b>${esc(c[1])}</b><em>${esc(c[2])}</em></div>`).join('');
}
function countUp(el,to,dec){
 const t0=performance.now(),dur=1100;(function f(t){const p=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-p,3);el.textContent=(to*e).toFixed(dec);if(p<1)requestAnimationFrame(f);})(t0);
}
function renderHeroCounters(d){
 const box=$('heroCounters');if(!box)return;
 const mt=Math.round(d.standings.reduce((s,t)=>s+t.played,0)/2),g=d.standings.reduce((s,t)=>s+t.gf,0);
 const items=[[mt,0,'مباراة'],[g,0,'هدف'],[mt?g/mt:0,1,'هدف / مباراة'],[d.teams.length,0,'فريق']];
 box.innerHTML=items.map(x=>`<div><b>0</b><span>${x[2]}</span></div>`).join('');
 box.querySelectorAll('b').forEach((b,i)=>countUp(b,items[i][0],items[i][1]));
}
function teamResults(id){
 // every played match of this team in order (oldest first): {m, gf, ga, r:'W'|'D'|'L'}
 return state.data.matches.map((m,i)=>({m,i})).filter(x=>x.m.homeGoals!==''&&x.m.awayGoals!==''&&(x.m.homeId===id||x.m.awayId===id))
  .sort((a,b)=>a.m.week-b.m.week||a.i-b.i).map(({m})=>{const home=m.homeId===id,gf=home?m.homeGoals:m.awayGoals,ga=home?m.awayGoals:m.homeGoals;return {m,home,gf,ga,r:gf>ga?'W':gf<ga?'L':'D'};});
}
const FORM_TXT={W:'فوز',D:'تعادل',L:'خسارة'};
function formDots(id){
 const last=teamResults(id).slice(-5).reverse();
 return last.length?'<span class="form" aria-label="آخر المباريات">'+last.map(x=>`<i class="f-${x.r}" title="${FORM_TXT[x.r]}"></i>`).join('')+'</span>':'';
}
function openTeam(id){
 const d=state.data,t=d.standings.find(x=>x.id===id);if(!t)return;
 const pos=d.standings.indexOf(t)+1,res=teamResults(id);
 $('teamModalKicker').textContent='المركز '+pos+' · '+d.league.name;
 $('teamModalTitle').textContent=t.name;
 const cells=[['النقاط',t.points],['لعب',t.played],['فاز',t.won],['تعادل',t.drawn],['خسر',t.lost],['له',t.gf],['عليه',t.ga],['الفارق',(t.diff>0?'+':'')+t.diff]];
 $('teamModalStats').innerHTML=cells.map(c=>`<div><b>${esc(c[1])}</b><span>${c[0]}</span></div>`).join('');
 $('teamModalForm').innerHTML=res.length?'<span>آخر المباريات</span><div class="form form-lg">'+res.slice(-5).reverse().map(x=>`<i class="f-${x.r}">${x.r==='W'?'ف':x.r==='D'?'ت':'خ'}</i>`).join('')+'</div>':'';
 $('teamModalMatches').innerHTML=res.length?res.slice().reverse().map(x=>`<div class="tm-row"><span class="tm-week">${esc(weekName(x.m.week))}</span><span class="tm-opp">${x.home?'ضد':'ضد'} ${esc(teamName(x.home?x.m.awayId:x.m.homeId))}</span><b class="tm-score f-${x.r}">${x.gf} - ${x.ga}</b></div>`).join(''):'<div class="empty-state">لا توجد مباريات مسجلة لهذا الفريق.</div>';
 $('teamModal').classList.remove('hidden');
}
function teamName(id){return state.data?.teams.find(t=>t.id===String(id))?.name||'فريق غير معروف';}
function matchHTML(m){return `<div class="match-row"><span class="match-week">الأسبوع ${m.week}</span><div class="match-teams"><span>${esc(teamName(m.homeId))}</span><b class="score">${m.homeGoals} - ${m.awayGoals}</b><span>${esc(teamName(m.awayId))}</span></div><span class="match-date">${esc(m.date||'')}</span></div>`;}
const driveId=u=>((String(u||'').match(/[?&]id=([^&]+)/)||[])[1]||'');
const drivePreview=u=>'https://drive.google.com/file/d/'+driveId(u)+'/preview';
function mediaHTML(n){
 if(n.video)return `<div class="news-media" data-vid="${esc(n.video)}"><video class="news-vid" src="${esc(n.video)}#t=0.1" preload="metadata" playsinline controls controlsList="nodownload"${n.image?` poster="${esc(n.image)}"`:''}></video><span class="vid-badge">▶ فيديو</span></div>`;
 return n.image?`<img class="news-card-img" src="${esc(n.image)}" alt="${esc(n.title)}" loading="lazy" decoding="async">`:'';
}
function renderNewsFeed(){
 const items=state.common.news||[],box=$('newsFeed'),sec=$('newsSection');
 box.innerHTML=items.map(n=>`<article class="news-card ${n.video?'has-video':''}" data-news="${esc(n.id)}">${mediaHTML(n)}<div class="news-card-body"><h3>${esc(n.title)}</h3><p>${esc(n.content)}</p>${n.date?`<time>${esc(new Date(n.date).toLocaleDateString('ar-EG'))}</time>`:''}</div></article>`).join('');
 sec.classList.toggle('hidden',!items.length||$('standingsSection').classList.contains('hidden'));
 $('newsNav').classList.toggle('hidden',items.length<2);
}
function renderNews(){
 const track=$('newsTrack'),items=state.common.news||[];
 renderNewsFeed();
 if(!items.length){track.innerHTML='<span class="news-empty">تابعوا آخر أخبار الوجيه سبورتس</span>';return;}
 const one=items.map(n=>`<button class="news-item" type="button" data-news-id="${esc(n.id)}">${n.video?'🎬 ':''}${esc(n.title||n.content)}</button><span class="news-separator">✦</span>`).join('');
 track.innerHTML=one+one;
 track.style.animationDuration=Math.max(22,items.reduce((a,n)=>a+(n.title+n.content).length,0)*.17)+'s';
 track.querySelectorAll('[data-news-id]').forEach(b=>b.addEventListener('click',()=>openNews(b.dataset.newsId)));
}
function closeNews(){const mv=$('newsModalVid');try{mv.pause();}catch(_){}$('newsModalFrame').removeAttribute('src');$('newsModal').classList.add('hidden');}
function openNews(id){const n=state.common.news.find(x=>x.id===id);if(!n)return;$('newsModalTitle').textContent=n.title||'خبر البطولة';$('newsModalBody').textContent=n.content;const mv=$('newsModalVid'),mf=$('newsModalFrame'),mi=$('newsModalImg');mv.pause();mv.classList.add('hidden');mv.removeAttribute('src');mf.classList.add('hidden');mf.removeAttribute('src');if(n.video){mv.src=n.video;mv.classList.remove('hidden');mv.onerror=()=>{if(!driveId(n.video))return;mv.classList.add('hidden');mf.src=drivePreview(n.video);mf.classList.remove('hidden');};}if(n.image&&!n.video){mi.src=n.image;mi.classList.remove('hidden');}else{mi.removeAttribute('src');mi.classList.add('hidden');}$('newsModalDate').textContent=n.date?new Date(n.date).toLocaleDateString('ar-EG'):'';$('newsModal').classList.remove('hidden');}
function jsonpAuth(nonce){
 return new Promise((resolve,reject)=>{
  const cb='leagueAuth_'+Date.now()+'_'+Math.random().toString(36).slice(2);
  const s=document.createElement('script');const timer=setTimeout(()=>{delete window[cb];s.remove();reject(new Error('انتهت مهلة التحقق من الرمز'));},12000);
  window[cb]=v=>{clearTimeout(timer);delete window[cb];s.remove();resolve(v);};
  s.onerror=()=>{clearTimeout(timer);delete window[cb];s.remove();reject(new Error('تعذر التحقق من رمز الإدارة'));};
  s.src=API_URL+'?authCheck='+encodeURIComponent(nonce)+'&callback='+cb+'&_='+Date.now();document.head.appendChild(s);
 });
}
async function verifyPin(pin){
 const nonce='n'+Date.now().toString(36)+Math.random().toString(36).slice(2,10);
 await fetch(API_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({action:'verifyPin',pin,nonce})});
 await new Promise(r=>setTimeout(r,450));
 const result=await jsonpAuth(nonce);
 if(!result?.authVerified)throw new Error('رمز الإدارة غير صحيح.');
}
async function postAdmin(action,fields={}){
 if(!state.pin)throw new Error('سجل دخول الإدارة أولًا');
 await fetch(API_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({action,pin:state.pin,leagueId:state.selectedId,...fields})});
 // Apps Script returns after the Sheets update; public reads now come directly from Apps Script.
 const id=state.selectedId;
 await Promise.all([loadCommon(),loadLeague(id)]);
 renderLeagueCards();
}
function fillTeamSelect(id,selected){
 const el=$(id);if(!el)return;const old=selected||el.value;
 el.innerHTML=state.data.teams.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('');
 if([...el.options].some(o=>o.value===old))el.value=old;
}
function renderAdmin(){
 const d=state.data;
 fillTeamSelect('homeTeam');fillTeamSelect('awayTeam');fillTeamSelect('manualTeam');
 $('matchWeek').value=d.league.week||1;
 $('adminMatches').innerHTML=d.matches.slice().sort((a,b)=>b.week-a.week).map(m=>`<div class="admin-item"><span>${esc(teamName(m.homeId))} ${m.homeGoals} - ${m.awayGoals} ${esc(teamName(m.awayId))} <small>الأسبوع ${m.week}</small></span><div class="mini-actions"><button class="mini-btn" data-edit-match="${esc(m.id)}">تعديل</button><button class="mini-btn delete" data-delete-match="${esc(m.id)}">حذف</button></div></div>`).join('')||'<div class="empty-state">لا توجد مباريات.</div>';
 $('adminTeams').innerHTML=d.teams.map(t=>`<div class="admin-item"><span>${esc(t.name)}</span><div class="mini-actions"><button class="mini-btn" data-rename-team="${esc(t.id)}">تعديل</button><button class="mini-btn delete" data-delete-team="${esc(t.id)}">حذف</button></div></div>`).join('');
 const stat=d.standings.find(t=>t.id===$('manualTeam').value)||d.standings[0];
 if(stat){$('manualTeam').value=stat.id;[['manualPlayed','played'],['manualWon','won'],['manualDrawn','drawn'],['manualLost','lost'],['manualGF','gf'],['manualGA','ga'],['manualPoints','points']].forEach(([id,k])=>$(id).value=stat[k]);}
 $('settingTitle').value=d.league.name;$('settingRegion').value=d.league.region;$('settingSeason').value=d.league.season;$('settingWeek').value=d.league.week;
 $('adminNews').innerHTML=state.common.news.map(n=>`<div class="admin-item"><span>${n.video?'🎬 ':n.image?'🖼 ':''}${esc(n.title||n.content)}</span><button class="mini-btn delete" data-delete-news="${esc(n.id)}">حذف</button></div>`).join('')||'<div class="empty-state">لا توجد أخبار منشورة.</div>';
}
function setAdmin(on){state.isAdmin=on;$('loginCard').classList.toggle('hidden',on);$('dashboard').classList.toggle('hidden',!on);if(on)renderAdmin();}
async function loadExportAsset(relativePath){
 return new Promise(resolve=>{
  const image=new Image();
  image.onload=()=>resolve(image);
  image.onerror=()=>resolve(null);
  image.src=new URL(relativePath,document.baseURI).href;
 });
}
function rrect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
const IN_APP=/FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Messenger|MicroMessenger|Line\/|TikTok|; wv\)/i;
const imgCache={};
function shareLink(){return location.origin+location.pathname+'#league='+encodeURIComponent(state.selectedId);}
function triggerDownload(blob,fileName){
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=fileName;
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);
}
// Facebook / WhatsApp in-app browsers can't save or share files: ask to open the site in the real browser.
function showOpenInBrowser(blob){
 const ua=navigator.userAgent||'',m=$('imgModal'),pic=$('imgModalPic'),link=$('imgCopyLink'),openB=$('imgOpenBrowser'),android=/Android/i.test(ua);
 const reader=new FileReader();reader.onload=()=>{pic.src=reader.result;};reader.readAsDataURL(blob);
 $('imgModalHint').textContent='لازم تفتح الموقع في المتصفح علشان تنزّل الصورة أو تشاركها. اضغط «فتح في المتصفح» وبعدها اضغط نفس الزرار تاني.';
 openB.onclick=async()=>{
  if(android){location.href='intent://'+location.host+location.pathname+location.search+location.hash+'#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url='+encodeURIComponent(location.href)+';end';return;}
  try{await navigator.clipboard.writeText(shareLink());}catch(_){}
  toast('اضغط ⋯ أو أيقونة المشاركة أعلى الشاشة ثم «فتح في المتصفح / Safari»');
 };
 link.onclick=async()=>{try{await navigator.clipboard.writeText(shareLink());toast('تم نسخ الرابط — الصقه في متصفح الموبايل');}catch(_){toast('انسخ الرابط يدويًا وافتحه في المتصفح');}};
 const close=()=>{m.classList.add('hidden');pic.removeAttribute('src');};
 $('imgModalClose').onclick=close;m.onclick=e=>{if(e.target===m)close();};
 m.classList.remove('hidden');
}
// target: 'download' | 'whatsapp' | 'facebook'
async function deliverImage(blob,fileName,target,title){
 if(IN_APP.test(navigator.userAgent||'')){showOpenInBrowser(blob);return;}
 if(target==='download'){triggerDownload(blob,fileName);toast('تم تنزيل الصورة');return;}
 const file=new File([blob],fileName,{type:'image/png'}),url=shareLink();
 if(navigator.canShare&&navigator.canShare({files:[file]})){
  try{await navigator.share({files:[file],title,text:title+'\n'+url});return;}
  catch(e){
   if(e&&e.name==='AbortError')return;
   if(e&&e.name==='NotAllowedError'){toast('اضغط الزرار مرة تانية لإتمام المشاركة');return;}
  }
 }
 // Computers / browsers without file sharing: save the image, then open the app's web share.
 triggerDownload(blob,fileName);
 const text=encodeURIComponent(title+'\n'+url);
 window.open(target==='whatsapp'?'https://wa.me/?text='+text:'https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(url),'_blank','noopener');
 toast('اتحفظت الصورة — أرفقها في الرسالة أو البوست');
}
async function exportAssets(){
 try{await Promise.all([document.fonts.load('700 30px "IBM Plex Sans Arabic"'),document.fonts.load('600 30px "IBM Plex Sans Arabic"'),document.fonts.load('400 20px "IBM Plex Sans Arabic"')]);}catch(_){}
 await document.fonts.ready;
 const [stadium,coach,logo]=await Promise.all([loadExportAsset('assets/stadium-table.jpg'),loadExportAsset('assets/coach-ragab.jpg'),loadExportAsset('assets/logo-256.webp')]);
 return {stadium,coach,logo};
}
const EX={FONT:'"IBM Plex Sans Arabic", Tahoma, sans-serif',INK:'#15181b',PAPER:'#fbfaf6',LINE:'#d6d1c4',GREEN:'#1d6b3b',RED:'#d23a2c',GOLD:'#e2b24a',GOLD2:'#f6dc92'};
// Two looks for the downloadable images: 'gold' (navy + gold, the classic one) and 'paper' (white card, modern).
function imgStyle(){let v='';try{v=localStorage.getItem('imgStyle')||'';}catch(_){}return v==='paper'?'paper':'gold';}
function newCanvas(W,H){
 const scale=Math.min(2,Math.sqrt(13e6/(W*H))),canvas=document.createElement('canvas');
 canvas.width=Math.round(W*scale);canvas.height=Math.round(H*scale);
 const ctx=canvas.getContext('2d');ctx.scale(scale,scale);ctx.direction='rtl';return {canvas,ctx};
}
function goldGrad(ctx,W,H){const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,EX.GOLD2);g.addColorStop(.5,EX.GOLD);g.addColorStop(1,EX.GOLD2);return g;}
function paintBackdrop(ctx,W,H,stadium,st){
 if(stadium){const cx=118,cy=30,cw=1300,ch=658,ratio=Math.max(W/cw,H/ch),sw=W/ratio,sh=H/ratio;ctx.drawImage(stadium,cx+(cw-sw)/2,cy+(ch-sh)/2,sw,sh,0,0,W,H);}
 else{ctx.fillStyle='#10201a';ctx.fillRect(0,0,W,H);}
 if(st==='gold'){
  const t=ctx.createLinearGradient(0,0,0,H);t.addColorStop(0,'rgba(4,12,24,.18)');t.addColorStop(.22,'rgba(4,12,24,.55)');t.addColorStop(1,'rgba(3,9,18,.86)');
  ctx.fillStyle=t;ctx.fillRect(0,0,W,H);
  const g=goldGrad(ctx,W,H);
  rrect(ctx,26,26,W-52,H-52,38);ctx.strokeStyle=g;ctx.lineWidth=5;ctx.stroke();
  rrect(ctx,40,40,W-80,H-80,28);ctx.strokeStyle='rgba(246,220,146,.28)';ctx.lineWidth=2;ctx.stroke();
 }else{ctx.fillStyle='rgba(8,18,13,.50)';ctx.fillRect(0,0,W,H);}
}
// Returns the y where the table starts.
function paintHeading(ctx,W,H,d,assets,title,tag,st){
 const L=70,R=W-70,F=EX.FONT;ctx.textBaseline='middle';
 if(st==='gold'){
  const g=goldGrad(ctx,W,H),plW=520,plH=64,plX=(W-plW)/2;
  rrect(ctx,plX,14,plW,plH,22);ctx.fillStyle='#07182b';ctx.fill();ctx.strokeStyle=g;ctx.lineWidth=4;ctx.stroke();
  ctx.textAlign='center';ctx.fillStyle=EX.GOLD2;ctx.font='700 30px '+F;ctx.fillText('موسم '+(d.league.season||'2026/2027'),W/2,48);
  if(assets.logo)ctx.drawImage(assets.logo,W/2-52,92,104,104);
  ctx.save();ctx.shadowColor='rgba(0,0,0,.7)';ctx.shadowBlur=18;ctx.shadowOffsetY=4;
  ctx.fillStyle='#fff';ctx.font='700 88px '+F;ctx.fillText(title,W/2,252,W-220);ctx.restore();
  ctx.fillStyle='#dbe7f2';ctx.font='600 30px '+F;ctx.fillText(d.league.region||'الوجيه سبورتس',W/2,318);
  ctx.font='700 28px '+F;const tw=ctx.measureText(tag).width+72;
  rrect(ctx,(W-tw)/2,344,tw,46,23);ctx.fillStyle=g;ctx.fill();ctx.fillStyle='#14283d';ctx.fillText(tag,W/2,368);
  return 412;
 }
 ctx.textAlign='right';
 ctx.fillStyle=EX.RED;ctx.fillRect(R-6,72,6,40);
 ctx.fillStyle='#e8ecef';ctx.font='600 30px '+F;ctx.fillText('الوجيه سبورتس  ·  موسم '+(d.league.season||'2026/2027'),R-24,92);
 ctx.fillStyle='#fff';ctx.font='700 '+(W>1500?96:80)+'px '+F;ctx.fillText(title,R,200,R-L-(W>1500?300:230));
 if(assets.logo)ctx.drawImage(assets.logo,L,44,104,104);
 ctx.font='700 30px '+F;const tw=ctx.measureText(tag).width+56;
 rrect(ctx,L,176,tw,56,6);ctx.fillStyle=EX.RED;ctx.fill();
 ctx.fillStyle='#fff';ctx.textAlign='center';ctx.fillText(tag,L+tw/2,205);
 return 330;
}
function paintFooter(ctx,W,H,fy,foot,d,coach,st){
 const R=W-70,L=70,F=EX.FONT,pS=124,pX=R-pS,pY=fy+(foot-pS)/2;
 const size=coach?Math.min(coach.width,coach.height)*.62:0;
 if(st==='gold'){
  ctx.fillStyle='rgba(226,178,74,.5)';ctx.fillRect(W/2-120,fy+4,240,3);
  const cx=pX+pS/2,cy=pY+pS/2+6;
  if(coach){const sx=Math.max(0,Math.min(coach.width-size,coach.width*.49-size/2)),sy=Math.max(0,Math.min(coach.height-size,coach.height*.30-size/2));
   ctx.save();ctx.beginPath();ctx.arc(cx,cy,pS/2,0,Math.PI*2);ctx.clip();ctx.drawImage(coach,sx,sy,size,size,cx-pS/2,cy-pS/2,pS,pS);ctx.restore();
   ctx.beginPath();ctx.arc(cx,cy,pS/2+5,0,Math.PI*2);ctx.strokeStyle=goldGrad(ctx,W,H);ctx.lineWidth=6;ctx.stroke();}
  const tx=pX-30;ctx.textAlign='right';ctx.textBaseline='middle';
  ctx.fillStyle=EX.GOLD2;ctx.font='700 48px '+F;ctx.fillText('إعداد كابتن رجب الوجيه',tx,cy-32,tx-L);
  ctx.fillStyle='#e8f0f7';ctx.font='600 27px '+F;ctx.fillText('الموقع الرسمي لكابتن رجب الوجيه',tx,cy+16,tx-L);
  ctx.fillStyle='#a9bccd';ctx.font='400 22px '+F;ctx.fillText('الوجيه سبورتس · '+d.league.name+' · موسم '+d.league.season,tx,cy+54,tx-L);
  return;
 }
 if(coach){
  const sx=Math.max(0,Math.min(coach.width-size,coach.width*.49-size/2)),sy=Math.max(0,Math.min(coach.height-size,coach.height*.30-size/2));
  ctx.fillStyle='#fff';rrect(ctx,pX-5,pY-5,pS+10,pS+10,8);ctx.fill();
  ctx.save();rrect(ctx,pX,pY,pS,pS,5);ctx.clip();ctx.drawImage(coach,sx,sy,size,size,pX,pY,pS,pS);ctx.restore();
 }
 const tx=pX-28;ctx.textAlign='right';ctx.textBaseline='middle';
 ctx.fillStyle='#fff';ctx.font='700 46px '+F;ctx.fillText('إعداد كابتن رجب الوجيه',tx,pY+30,tx-L);
 ctx.fillStyle='#e8ecef';ctx.font='600 27px '+F;ctx.fillText('الموقع الرسمي لكابتن رجب الوجيه',tx,pY+76,tx-L);
 ctx.fillStyle='#b9c1c8';ctx.font='400 22px '+F;ctx.fillText(d.league.name+' · موسم '+d.league.season,tx,pY+110,tx-L);
}
async function buildStandingsImage(st){
 const d=state.data,assets=await exportAssets(),rows=d.standings,gold=st==='gold';
 const W=1600,th=gold?80:76,rh=gold?76:74,foot=gold?236:210,L=70,R=W-70,tw=R-L,F=EX.FONT,{INK,PAPER,LINE,GREEN}=EX;
 const head=gold?412:330,H=head+th+rows.length*rh+foot,top=head;
 const {canvas,ctx}=newCanvas(W,H);
 paintBackdrop(ctx,W,H,assets.stadium,st);
 paintHeading(ctx,W,H,d,assets,'جدول ترتيب '+d.league.name,d.league.week?'بعد الأسبوع '+weekName(d.league.week):'بداية المسابقة',st);
 const cols=[['rank','#',R-44],['name','الفريق',R-96],['played','لعب',984],['won','فاز',872],['drawn','تعادل',760],['lost','خسر',648],['gf','له',536],['ga','عليه',424],['diff','الفارق',303],['points','النقاط',L+80]];
 ctx.save();rrect(ctx,L,top,tw,th+rows.length*rh,gold?20:10);ctx.clip();
 if(gold){const hg=ctx.createLinearGradient(L,0,R,0);hg.addColorStop(0,'#0e4a38');hg.addColorStop(.5,'#0c3d44');hg.addColorStop(1,'#0d2b4a');ctx.fillStyle=hg;ctx.fillRect(L,top,tw,th);ctx.fillStyle=EX.GOLD2;}
 else{ctx.fillStyle=PAPER;ctx.fillRect(L,top,tw,th+rows.length*rh);ctx.fillStyle=INK;ctx.fillRect(L,top,tw,th);ctx.fillStyle='#ffffff';}
 ctx.font=(gold?'700 26px ':'600 26px ')+F;ctx.textBaseline='middle';
 cols.forEach(([key,label,px])=>{ctx.textAlign=key==='name'?'right':'center';ctx.fillText(label,px,top+th/2+1);});
 rows.forEach((t,i)=>{
  const y=top+th+i*rh,cy=y+rh/2+1;
  if(gold){
   ctx.fillStyle=i%2?'rgba(7,26,46,.84)':'rgba(11,38,64,.84)';ctx.fillRect(L,y,tw,rh);
   if(i===0){const lg=ctx.createLinearGradient(R,0,L,0);lg.addColorStop(0,'rgba(226,178,74,.30)');lg.addColorStop(.6,'rgba(226,178,74,0)');ctx.fillStyle=lg;ctx.fillRect(L,y,tw,rh);ctx.fillStyle=EX.GOLD;ctx.fillRect(R-6,y,6,rh);}
   ctx.fillStyle='rgba(255,255,255,.07)';ctx.fillRect(L,y+rh-1,tw,1);
   ctx.fillStyle='rgba(226,178,74,.14)';ctx.fillRect(L,y,160,rh);
   if(i<3){ctx.beginPath();ctx.arc(cols[0][2],y+rh/2,25,0,Math.PI*2);ctx.fillStyle=['#f2cb68','#d5dde6','#cf9255'][i];ctx.fill();}
   ctx.textAlign='center';ctx.font='700 28px '+F;ctx.fillStyle=i<3?'#17202e':'#9fb2c4';ctx.fillText(String(i+1),cols[0][2],cy);
   ctx.textAlign='right';ctx.font='700 31px '+F;ctx.fillStyle='#fff';ctx.fillText(t.name,cols[1][2],cy,372);
  }else{
   ctx.fillStyle='#ebe7da';ctx.fillRect(L,y,160,rh);
   if(i<rows.length-1){ctx.fillStyle=LINE;ctx.fillRect(L,y+rh-1,tw,1);}
   if(i===0){ctx.fillStyle=GREEN;ctx.fillRect(R-7,y,7,rh);}
   ctx.textAlign='center';ctx.font=(i<3?'700 30px ':'600 27px ')+F;ctx.fillStyle=i<3?GREEN:'#6b7075';ctx.fillText(String(i+1),cols[0][2],cy);
   ctx.textAlign='right';ctx.font='700 31px '+F;ctx.fillStyle=INK;ctx.fillText(t.name,cols[1][2],cy,372);
  }
  const values={played:t.played,won:t.won,drawn:t.drawn,lost:t.lost,gf:t.gf,ga:t.ga,diff:(t.diff>0?'+':'')+t.diff,points:t.points};
  const pos=gold?'#5fe0a0':GREEN,neg=gold?'#ff8080':'#c0372a',base=gold?'#f2f6fa':INK;
  ctx.direction='ltr';
  cols.filter(q=>!['rank','name'].includes(q[0])).forEach(([key,,px])=>{
   ctx.textAlign='center';ctx.font=(key==='points'?'700 36px ':'600 29px ')+F;
   ctx.fillStyle=key==='points'?(gold?EX.GOLD2:INK):key==='won'?pos:key==='diff'?(t.diff>0?pos:t.diff<0?neg:base):base;
   ctx.fillText('\u200E'+String(values[key]??0),px,cy);
  });
  ctx.direction='rtl';
 });
 ctx.restore();
 if(gold){rrect(ctx,L,top,tw,th+rows.length*rh,20);ctx.strokeStyle='rgba(226,178,74,.75)';ctx.lineWidth=2.5;ctx.stroke();}
 paintFooter(ctx,W,H,top+th+rows.length*rh+(gold?14:0),foot-(gold?14:0),d,assets.coach,st);
 return new Promise(res=>canvas.toBlob(res,'image/png'));
}
async function buildStatsImage(st){
 const d=state.data,assets=await exportAssets(),gold=st==='gold',cells=statCells(d);
 const W=1400,L=70,R=W-70,tw=R-L,F=EX.FONT,{INK,PAPER,GREEN}=EX,head=gold?412:330,foot=gold?236:210,gap=18,ch=150,pad=18,rows=Math.ceil(cells.length/2),bodyH=rows*ch+(rows-1)*gap+pad*2,H=head+bodyH+foot+(gold?14:0);
 const {canvas,ctx}=newCanvas(W,H);
 paintBackdrop(ctx,W,H,assets.stadium,st);
 paintHeading(ctx,W,H,d,assets,'إحصائيات '+d.league.name,d.league.week?'بعد الأسبوع '+weekName(d.league.week):'بداية المسابقة',st);
 const cw=(tw-gap-pad*2)/2;ctx.textBaseline='middle';
 cells.forEach((c,i)=>{
  const x=i%2===0?R-pad-cw:L+pad,y=head+pad+Math.floor(i/2)*(ch+gap),weak=[1,3,5].includes(i),tx=x+cw-28;
  rrect(ctx,x,y,cw,ch,gold?18:10);ctx.fillStyle=gold?'rgba(11,38,64,.88)':PAPER;ctx.fill();
  if(gold){ctx.strokeStyle='rgba(226,178,74,.6)';ctx.lineWidth=2;ctx.stroke();}
  else{ctx.fillStyle=weak?EX.RED:GREEN;ctx.fillRect(x+10,y,cw-20,6);}
  ctx.textAlign='right';
  ctx.font='600 26px '+F;ctx.fillStyle=gold?EX.GOLD2:'#6b7075';ctx.fillText(c[0],tx,y+34);
  ctx.font='700 38px '+F;ctx.fillStyle=gold?'#fff':INK;ctx.fillText(c[1],tx,y+82,cw-56);
  ctx.font='600 26px '+F;ctx.fillStyle=weak?(gold?'#ff8a80':'#c0372a'):(gold?'#5fe0a0':GREEN);ctx.fillText(c[2],tx,y+122,cw-56);
 });
 paintFooter(ctx,W,H,head+bodyH+(gold?14:0),foot,d,assets.coach,st);
 return new Promise(res=>canvas.toBlob(res,'image/png'));
}
// Results of one week: home team on the right, away team on the left, score box in the middle.
async function buildResultsImage(week,st){
 const d=state.data,assets=await exportAssets(),gold=st==='gold';
 const list=d.matches.filter(m=>String(m.week)===String(week)&&m.homeGoals!==''&&m.awayGoals!=='');
 const W=1400,rh=104,foot=gold?236:210,pad=18,L=70,R=W-70,tw=R-L,F=EX.FONT,{INK,PAPER,LINE}=EX,head=gold?412:330,bodyH=list.length*rh+pad*2,H=head+bodyH+foot+(gold?14:0);
 const {canvas,ctx}=newCanvas(W,H);
 paintBackdrop(ctx,W,H,assets.stadium,st);
 paintHeading(ctx,W,H,d,assets,'نتائج '+d.league.name,'الأسبوع '+weekName(Number(week)),st);
 const top=head;
 ctx.save();rrect(ctx,L,top,tw,bodyH,gold?20:10);ctx.clip();
 if(!gold){ctx.fillStyle=PAPER;ctx.fillRect(L,top,tw,bodyH);}
 ctx.textBaseline='middle';
 list.forEach((m,i)=>{
  const y=top+pad+i*rh,cy=y+rh/2+1,cx=W/2;
  if(gold){ctx.fillStyle=i%2?'rgba(7,26,46,.84)':'rgba(11,38,64,.84)';ctx.fillRect(L,y-(i===0?pad:0),tw,rh+(i===0?pad:0)+(i===list.length-1?pad:0));ctx.fillStyle='rgba(255,255,255,.07)';if(i<list.length-1)ctx.fillRect(L+24,y+rh-1,tw-48,1);}
  else if(i<list.length-1){ctx.fillStyle=LINE;ctx.fillRect(L+24,y+rh-1,tw-48,1);}
  ctx.fillStyle=gold?'#fff':INK;ctx.font='700 36px '+F;
  ctx.textAlign='right';ctx.fillText(teamName(m.homeId),R-24,cy,R-24-(cx+130));
  ctx.textAlign='left';ctx.fillText(teamName(m.awayId),L+24,cy,cx-130-(L+24));
  rrect(ctx,cx-110,cy-38,220,76,gold?38:8);ctx.fillStyle=gold?goldGrad(ctx,W,H):INK;ctx.fill();
  ctx.fillStyle=gold?'#10243b':'#fff';ctx.direction='ltr';ctx.textAlign='center';ctx.font='700 44px '+F;
  ctx.fillText(String(m.awayGoals),cx-58,cy+1);ctx.fillText('-',cx,cy);ctx.fillText(String(m.homeGoals),cx+58,cy+1);
  ctx.direction='rtl';
 });
 ctx.restore();
 if(gold){rrect(ctx,L,top,tw,bodyH,20);ctx.strokeStyle='rgba(226,178,74,.75)';ctx.lineWidth=2.5;ctx.stroke();}
 paintFooter(ctx,W,H,top+bodyH+(gold?14:0),foot,d,assets.coach,st);
 return new Promise(res=>canvas.toBlob(res,'image/png'));
}
// kind: 'standings' | 'results'; target: 'download' | 'whatsapp' | 'facebook'
async function exportImage(kind,target,btn){
 const d=state.data;
 if(!d){return;}
 const week=kind==='results'?$('resultsWeek').value:'';
 if(kind==='standings'&&!d.standings?.length){toast('لا يوجد جدول لتحويله إلى صورة');return;}
 if(kind==='results'&&!week){toast('لا توجد نتائج مسجلة');return;}
 const st=imgStyle(),key=kind+':'+week+':'+st;
 const title=kind==='stats'?'إحصائيات '+d.league.name+' — الوجيه سبورتس':kind==='results'?'نتائج '+d.league.name+' — الأسبوع '+weekName(Number(week))+' — الوجيه سبورتس':'جدول ترتيب '+d.league.name+' — الوجيه سبورتس';
 const fileName=(kind==='stats'?'إحصائيات-':kind==='results'?'نتائج-':'ترتيب-')+d.league.id+(week?'-الأسبوع-'+week:'-الأسبوع-'+(d.league.week||0))+'.png';
 const label=btn?btn.textContent:'';
 try{
  if(!imgCache[key]){
   if(btn){btn.disabled=true;btn.textContent='جارٍ التجهيز...';}
   imgCache[key]=await (kind==='results'?buildResultsImage(week,st):kind==='stats'?buildStatsImage(st):buildStandingsImage(st));
   if(!imgCache[key])throw new Error('تعذر إنشاء الصورة من المتصفح.');
  }
  await deliverImage(imgCache[key],fileName,target,title);
 }catch(e){console.error(e);toast('تعذر تجهيز الصورة. حاول مرة أخرى.');}
 finally{if(btn){btn.disabled=false;btn.textContent=label;}}
}
// Admin events — field names match the current Apps Script API.
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();const pin=$('password').value.trim();if(!pin)return;const b=e.submitter;b.disabled=true;$('loginNote').textContent='جارٍ التحقق...';try{await verifyPin(pin);state.pin=pin;setAdmin(true);$('password').value='';$('loginNote').textContent='';toast('تم فتح لوحة الإدارة');}catch(err){state.pin='';$('loginNote').textContent=err.message;toast(err.message);}finally{b.disabled=false;}});
$('logoutBtn').addEventListener('click',()=>{state.pin='';setAdmin(false);toast('تم تسجيل الخروج');});
$('adminReveal').addEventListener('click',()=>{$('admin').classList.remove('hidden');$('admin').scrollIntoView({behavior:'smooth'});});
$('closeAdmin').addEventListener('click',()=>$('admin').classList.add('hidden'));
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.tab-content').forEach(x=>x.classList.remove('active'));b.classList.add('active');$(b.dataset.tab).classList.add('active');}));
$('adminLeagueSelect').addEventListener('change',e=>selectLeague(e.target.value,false));
$('backToLeagues').addEventListener('click',()=>{
 $('competitionPanel').classList.add('hidden');$('standingsSection').classList.add('hidden');$('newsSection').classList.add('hidden');$('matches').classList.add('hidden');
 $('leagues').classList.remove('hidden');$('leagues').scrollIntoView({behavior:'smooth',block:'start'});
});
$('matchForm').addEventListener('submit',async e=>{e.preventDefault();const home=$('homeTeam').value,away=$('awayTeam').value;if(home===away){toast('اختار فريقين مختلفين');return;}const b=e.submitter;b.disabled=true;try{await postAdmin('addMatch',{week:num($('matchWeek').value),matchDate:$('matchDate').value,homeTeamId:home,awayTeamId:away,homeScore:num($('homeGoals').value),awayScore:num($('awayGoals').value),status:'played'});$('matchFeedback').textContent='تم إرسال النتيجة. يتم تحديث بيانات GitHub الآن.';toast('تم إرسال المباراة');}catch(err){toast(err.message);}finally{b.disabled=false;}});
$('adminMatches').addEventListener('click',async e=>{
 const edit=e.target.dataset.editMatch,del=e.target.dataset.deleteMatch;
 if(edit){const m=state.data.matches.find(x=>x.id===edit);if(!m)return;const w=prompt('رقم الأسبوع',m.week);if(w===null)return;const hs=prompt('أهداف الفريق الأول',m.homeGoals);if(hs===null)return;const as=prompt('أهداف الفريق الثاني',m.awayGoals);if(as===null)return;try{await postAdmin('editMatch',{matchId:edit,week:num(w),homeScore:num(hs),awayScore:num(as)});toast('تم إرسال تعديل المباراة');}catch(err){toast(err.message);}return;}
 if(del&&confirm('تأكيد حذف المباراة؟'))try{await postAdmin('deleteMatch',{matchId:del});toast('تم إرسال طلب الحذف');}catch(err){toast(err.message);}
});
$('teamForm').addEventListener('submit',async e=>{e.preventDefault();const name=$('newTeamName').value.trim();if(!name)return;try{await postAdmin('addTeam',{teamName:name});$('newTeamName').value='';toast('تم إرسال إضافة الفريق');}catch(err){toast(err.message);}});
$('adminTeams').addEventListener('click',async e=>{const rename=e.target.dataset.renameTeam,del=e.target.dataset.deleteTeam;if(rename){const t=state.data.teams.find(x=>x.id===rename),name=prompt('الاسم الجديد للفريق',t?.name);if(name?.trim())try{await postAdmin('renameTeam',{teamId:rename,teamName:name.trim()});toast('تم إرسال تعديل الاسم');}catch(err){toast(err.message);}}if(del){if(state.data.matches.some(m=>m.homeId===del||m.awayId===del)){toast('لا يمكن حذف فريق مرتبط بمباريات؛ احذف مبارياته أولًا.');return;}if(confirm('تأكيد حذف الفريق؟'))try{await postAdmin('deleteTeam',{teamId:del});toast('تم إرسال حذف الفريق');}catch(err){toast(err.message);}}});
$('manualTeam').addEventListener('change',()=>{const t=state.data.standings.find(x=>x.id===$('manualTeam').value);if(!t)return;[['manualPlayed','played'],['manualWon','won'],['manualDrawn','drawn'],['manualLost','lost'],['manualGF','gf'],['manualGA','ga'],['manualPoints','points']].forEach(([id,k])=>$(id).value=t[k]);});
$('manualStatsForm').addEventListener('submit',async e=>{e.preventDefault();const teamId=$('manualTeam').value;const vals={Played:num($('manualPlayed').value),Won:num($('manualWon').value),Drawn:num($('manualDrawn').value),Lost:num($('manualLost').value),Goals_For:num($('manualGF').value),Goals_Against:num($('manualGA').value),Points:num($('manualPoints').value)};if(vals.Won+vals.Drawn+vals.Lost!==vals.Played){toast('الفوز + التعادل + الخسارة يجب أن يساوي عدد المباريات');return;}try{await postAdmin('updateBaseStats',{teamId,...vals});toast('تم إرسال الرصيد الأساسي');}catch(err){toast(err.message);}});
$('settingsForm').addEventListener('submit',async e=>{e.preventDefault();try{await postAdmin('updateSettings',{settings:{League_Name:$('settingTitle').value,Region:$('settingRegion').value,Season:$('settingSeason').value},currentWeek:num($('settingWeek').value)});$('settingsFeedback').textContent='تم إرسال الإعدادات.';toast('تم إرسال إعدادات المسابقة');}catch(err){toast(err.message);}});
let newsImage=null;
async function compressImage(file){
 const img=await new Promise((ok,no)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);ok(im);};im.onerror=()=>no(new Error('تعذر قراءة الصورة، جرّب صورة JPG أو PNG'));im.src=u;});
 let max=1280,q=.8,out='';
 for(let k=0;k<6;k++){
  const r=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight)),c=document.createElement('canvas');
  c.width=Math.round(img.naturalWidth*r);c.height=Math.round(img.naturalHeight*r);
  const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);
  out=c.toDataURL('image/jpeg',q);
  if(out.length*.75<=300*1024)break;
  q=Math.max(.5,q-.1);max=Math.round(max*.85);
 }
 return {data:out.split(',')[1],type:'image/jpeg',url:out,kb:Math.round(out.length*.75/1024)};
}
function resetNewsImage(){newsImage=null;$('newsImage').value='';$('newsImagePreview').classList.add('hidden');$('newsImagePreviewImg').removeAttribute('src');$('newsImageNote').textContent='اختياري — الصورة بتتصغّر تلقائيًا قبل الرفع';}
$('newsImageBtn').addEventListener('click',()=>$('newsImage').click());
$('newsImage').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{newsImage=await compressImage(f);$('newsImagePreviewImg').src=newsImage.url;$('newsImagePreview').classList.remove('hidden');$('newsImageNote').textContent='تم تجهيز الصورة ('+newsImage.kb+' كيلوبايت)';}catch(err){resetNewsImage();toast(err.message);}});
$('newsImageRemove').addEventListener('click',resetNewsImage);
let newsVideo=null;
const VID_MAX_SEC=120,VID_MAX_BYTES=10*1024*1024;
function resetNewsVideo(){newsVideo=null;$('newsVideo').value='';$('newsVideoPreview').classList.add('hidden');$('newsVideoPreviewEl').removeAttribute('src');$('newsVideoNote').textContent='اختياري — لحد دقيقتين، بيتضغط تلقائيًا (سيب الصفحة مفتوحة أثناء الضغط)';}
async function compressVideo(file,onProg){
 const url=URL.createObjectURL(file),v=document.createElement('video');
 v.src=url;v.playsInline=true;v.preload='auto';
 try{
  await new Promise((ok,no)=>{v.onloadedmetadata=ok;v.onerror=()=>no(new Error('تعذر قراءة الفيديو'));});
  const dur=v.duration;
  if(!isFinite(dur)||dur<=0)throw new Error('تعذر قراءة مدة الفيديو');
  if(dur>VID_MAX_SEC+.5)throw new Error('الفيديو أطول من '+VID_MAX_SEC+' ثانية — قصّه الأول');
  if(file.type==='video/mp4'&&file.size<=VID_MAX_BYTES){
   const du=await new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>no(new Error('تعذر قراءة الفيديو'));r.readAsDataURL(file);});
   return {data:du.split(',')[1],type:'video/mp4',url:URL.createObjectURL(file),kb:Math.round(file.size/1024)};
  }
  if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream)throw new Error('المتصفح ده مش بيدعم ضغط الفيديو — جرّب Chrome');
  const sc=Math.min(1,480/Math.min(v.videoWidth,v.videoHeight)),w=Math.max(2,Math.round(v.videoWidth*sc/2)*2),h=Math.max(2,Math.round(v.videoHeight*sc/2)*2);
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;const cx=cv.getContext('2d'),stream=cv.captureStream(24);
  let ac=null;
  try{ac=new (window.AudioContext||window.webkitAudioContext)();const src=ac.createMediaElementSource(v),dest=ac.createMediaStreamDestination();src.connect(dest);dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));}catch(_){}
  const mime=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));
  if(!mime)throw new Error('المتصفح ده مش بيدعم تسجيل الفيديو');
  const vbps=Math.max(250e3,Math.min(1.1e6,VID_MAX_BYTES*8/dur-90e3)),rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:vbps,audioBitsPerSecond:64e3}),chunks=[];
  rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};
  const done=new Promise(res=>{rec.onstop=res;});
  let run=true;(function draw(){if(!run)return;cx.drawImage(v,0,0,w,h);onProg&&onProg(Math.min(1,v.currentTime/dur));requestAnimationFrame(draw);})();
  v.onended=()=>{run=false;setTimeout(()=>rec.stop(),150);};
  rec.start(500);
  try{await v.play();}catch(_){v.muted=true;await v.play();}
  await done;if(ac)try{ac.close();}catch(_){}
  const blob=new Blob(chunks,{type:mime.split(';')[0]});
  if(blob.size>11*1024*1024)throw new Error('الفيديو لسه كبير ('+Math.round(blob.size/1048576)+' ميجا) — قصّه أو اختار فيديو أخف');
  const dataUrl=await new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>no(new Error('تعذر تجهيز الفيديو'));r.readAsDataURL(blob);});
  return {data:dataUrl.split(',')[1],type:blob.type,url:URL.createObjectURL(blob),kb:Math.round(blob.size/1024)};
 }finally{URL.revokeObjectURL(url);}
}
$('newsVideoBtn').addEventListener('click',()=>$('newsVideo').click());
$('newsVideo').addEventListener('change',async e=>{
 const f=e.target.files[0];if(!f)return;const sb=$('newsSubmit'),note=$('newsVideoNote');sb.disabled=true;newsVideo=null;
 try{
  note.textContent='جارٍ ضغط الفيديو 0% — متقفلش الصفحة';
  newsVideo=await compressVideo(f,p=>{note.textContent='جارٍ ضغط الفيديو '+Math.round(p*100)+'% — متقفلش الصفحة';});
  $('newsVideoPreviewEl').src=newsVideo.url;$('newsVideoPreview').classList.remove('hidden');
  note.textContent='تم تجهيز الفيديو ('+(newsVideo.kb>1024?(newsVideo.kb/1024).toFixed(1)+' ميجا':newsVideo.kb+' كيلوبايت')+')';
 }catch(err){resetNewsVideo();toast(err.message);}finally{sb.disabled=false;}
});
$('newsVideoRemove').addEventListener('click',resetNewsVideo);
$('newsForm').addEventListener('submit',async e=>{e.preventDefault();const b=$('newsSubmit');b.disabled=true;toast(newsVideo?'جارٍ رفع الفيديو والخبر... ممكن ياخد دقيقة':newsImage?'جارٍ رفع الصورة والخبر...':'جارٍ نشر الخبر...');try{await postAdmin('addNews',{title:$('newsTitle').value.trim(),content:$('newsContent').value.trim(),imageData:newsImage?newsImage.data:'',imageType:newsImage?newsImage.type:'',videoData:newsVideo?newsVideo.data:'',videoType:newsVideo?newsVideo.type:''});$('newsTitle').value='';$('newsContent').value='';resetNewsImage();resetNewsVideo();toast('تم نشر الخبر');}catch(err){toast(err.message);}finally{b.disabled=false;}});
$('newsFeed').addEventListener('error',e=>{
 if(e.target.tagName==='IMG')e.target.remove();
 if(e.target.tagName==='VIDEO'){const v=e.target,box=v.closest('.news-media');if(!box)return;
  if(driveId(box.dataset.vid)){box.innerHTML='<iframe src="'+drivePreview(box.dataset.vid)+'" allow="autoplay; fullscreen" allowfullscreen loading="lazy"></iframe><span class="vid-badge">▶ فيديو</span>';return;}
  const n=+(v.dataset.try||0);
  if(n<12){v.dataset.try=n+1;if(!box.querySelector('.vid-wait')){const b=document.createElement('span');b.className='vid-badge vid-wait';b.textContent='⏳ جارٍ تجهيز الفيديو...';b.style.cssText='top:auto;bottom:10px';box.appendChild(b);}setTimeout(()=>v.load(),6000);}
  else{const w=box.querySelector('.vid-wait');if(w)w.textContent='تعذر تشغيل الفيديو';}
 }
},true);
document.addEventListener('loadedmetadata',e=>{const w=e.target.closest&&e.target.closest('.news-media');if(w){const b=w.querySelector('.vid-wait');if(b)b.remove();}},true);
document.addEventListener('play',e=>{document.querySelectorAll('video').forEach(v=>{if(v!==e.target)v.pause();});},true);
$('adminNews').addEventListener('click',async e=>{const id=e.target.dataset.deleteNews;if(id&&confirm('حذف الخبر من جميع المسابقات؟'))try{await postAdmin('deleteNews',{newsId:id});toast('تم إرسال حذف الخبر');}catch(err){toast(err.message);}});
$('newsPause').addEventListener('click',()=>{const t=$('newsTrack'),p=t.classList.toggle('paused');$('newsPause').textContent=p?'▶':'Ⅱ';});
$('newsModalClose').addEventListener('click',closeNews);
$('newsModal').addEventListener('click',e=>{if(e.target===$('newsModal'))closeNews();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('newsModal').classList.add('hidden');});
$('menuToggle').addEventListener('click',()=>$('mainNav').classList.toggle('open'));
[['downloadStandingsImage','standings','download'],['shareStandingsWA','standings','whatsapp'],['shareStandingsFB','standings','facebook'],['resultsDownload','results','download'],['resultsWA','results','whatsapp'],['resultsFB','results','facebook'],['statsDownload','stats','download'],['statsWA','stats','whatsapp'],['statsFB','stats','facebook']].forEach(([id,kind,target])=>$(id).addEventListener('click',e=>exportImage(kind,target,e.currentTarget)));
$('standingsBody').addEventListener('click',e=>{const b=e.target.closest('[data-team]');if(b)openTeam(b.dataset.team);});
$('teamModalClose').addEventListener('click',()=>$('teamModal').classList.add('hidden'));
$('teamModal').addEventListener('click',e=>{if(e.target===$('teamModal'))$('teamModal').classList.add('hidden');});
$('newsFeed').addEventListener('click',e=>{if(e.target.closest('video,iframe'))return;const a=e.target.closest('[data-news]');if(a)openNews(a.dataset.news);});
const newsStep=dir=>{const f=$('newsFeed'),card=f.querySelector('.news-card');f.scrollBy({left:dir*((card?card.offsetWidth:300)+16),behavior:'smooth'});};
$('newsNext').addEventListener('click',()=>newsStep(-1));$('newsPrev').addEventListener('click',()=>newsStep(1));
document.querySelectorAll('.img-style').forEach(sel=>{sel.value=imgStyle();sel.addEventListener('change',()=>{try{localStorage.setItem('imgStyle',sel.value);}catch(_){}document.querySelectorAll('.img-style').forEach(o=>o.value=sel.value);});});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){['teamModal','newsModal'].forEach(i=>$(i).classList.add('hidden'));closeNews();}});
(function(){
 const root=document.documentElement,btn=$('themeToggle');
 const apply=t=>{root.setAttribute('data-theme',t);btn.textContent=t==='dark'?'☀':'☾';btn.setAttribute('aria-label',t==='dark'?'الوضع الفاتح':'الوضع الداكن');const m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',t==='dark'?'#080b09':'#15181b');};
 apply(root.getAttribute('data-theme')==='dark'?'dark':'light');
 btn.addEventListener('click',()=>{const t=root.getAttribute('data-theme')==='dark'?'light':'dark';apply(t);try{localStorage.setItem('theme',t);}catch(_){}});
})();
$('yearNow').textContent=new Date().getFullYear();
async function boot(){
 try{
  const list=await jsonpData({});
  state.leagues=list.leagues||[];
 }catch(e){console.error(e);toast('تعذر تحميل قائمة المسابقات: '+e.message);return;}
 renderLeagueCards();
 await loadCommon();
 const wanted=decodeURIComponent((location.hash.match(/league=([^&]+)/)||[])[1]||'');
 const initial=state.leagues.find(x=>x.League_ID===wanted)||state.leagues.find(x=>x.League_ID==='FOURTH')||state.leagues[0];
 if(initial)await selectLeague(initial.League_ID,false);
}
boot().catch(e=>{console.error(e);toast('تعذر تحميل الموقع: '+e.message);});

(function(){
 const hero=document.querySelector('.hero'),top=$('toTop');let tick=false;
 addEventListener('scroll',()=>{if(tick)return;tick=true;requestAnimationFrame(()=>{tick=false;const y=scrollY;if(hero&&y<700)hero.style.setProperty('--py',Math.min(70,y*.18)+'px');top.classList.toggle('show',y>600);});},{passive:true});
 top.addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));
 if('IntersectionObserver' in window){const io=new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target);}}),{threshold:.08});document.querySelectorAll('.section').forEach(s=>{s.classList.add('rv');io.observe(s);});}
})();
