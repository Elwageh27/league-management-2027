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
    state.common={news:(c.news||[]).filter(n=>String(n.Is_Active).toLowerCase()==='true'||n.Is_Active===true).map(n=>({id:String(n.News_ID),title:String(n.Title||''),content:String(n.Content||''),date:n.Created_At||'',image:String(n.Image_URL||'')})),siteSettings:c.siteSettings||{}};
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
  $('standingsBody').innerHTML=s.map((t,i)=>`<tr><td class="rank ${i<3?'top':''}">${i+1}</td><td class="team-cell"><span class="team-badge">⚽</span>${esc(t.name)}</td><td>${t.played}</td><td class="positive">${t.won}</td><td>${t.drawn}</td><td>${t.lost}</td><td>${t.gf}</td><td>${t.ga}</td><td class="${t.diff>0?'positive':t.diff<0?'negative':''}">${t.diff>0?'+':''}${t.diff}</td><td class="points">${t.points}</td></tr>`).join('')||'<tr><td colspan="10">لا توجد فرق في هذه المسابقة.</td></tr>';
  const played=d.matches.filter(m=>m.homeGoals!==''&&m.awayGoals!=='').sort((a,b)=>b.week-a.week);
  $('matchesCount').textContent=played.length+' مباراة';
  $('matchesList').innerHTML=played.length?played.map(matchHTML).join(''):'<div class="empty-state">لا توجد نتائج مسجلة حتى الآن.</div>';
  Object.keys(imgCache).forEach(k=>delete imgCache[k]);
  renderResultsPicker(played);renderStats(d,played);
  if(state.isAdmin)renderAdmin();
}
function renderResultsPicker(played){
 const weeks=[...new Set(played.map(m=>m.week))].sort((a,b)=>b-a),sel=$('resultsWeek'),bar=$('resultsShare');
 bar.classList.toggle('hidden',!weeks.length);
 sel.innerHTML=weeks.map(w=>`<option value="${esc(w)}">${esc(weekName(Number(w)))}</option>`).join('');
 if(weeks.length)sel.value=String(weeks[0]);
}
function renderStats(d,played){
 const box=$('statsStrip'),teams=d.standings.filter(t=>t.played>0);
 if(!teams.length||!played.length){box.classList.add('hidden');box.innerHTML='';return;}
 const best=(arr,fn)=>arr.reduce((a,b)=>fn(b)>fn(a)?b:a);
 const attack=best(teams,t=>t.gf),defense=best(teams,t=>-t.ga);
 const big=best(played,m=>Math.abs(m.homeGoals-m.awayGoals)),goals=best(played,m=>Number(m.homeGoals)+Number(m.awayGoals));
 const line=m=>esc(teamName(m.homeId))+' '+m.homeGoals+' - '+m.awayGoals+' '+esc(teamName(m.awayId));
 const cells=[['أقوى هجوم',esc(attack.name),attack.gf+' هدف'],['أقوى دفاع',esc(defense.name),defense.ga+' هدف مستقبل']];
 if(Math.abs(big.homeGoals-big.awayGoals)>0)cells.push(['أكبر فوز',line(big),'فارق '+Math.abs(big.homeGoals-big.awayGoals)+' أهداف']);
 if(Number(goals.homeGoals)+Number(goals.awayGoals)>0)cells.push(['أغزر مباراة أهدافًا',line(goals),(Number(goals.homeGoals)+Number(goals.awayGoals))+' أهداف']);
 box.innerHTML=cells.map(c=>`<div class="stat"><span>${c[0]}</span><b>${c[1]}</b><em>${c[2]}</em></div>`).join('');
 box.classList.remove('hidden');
}
function teamName(id){return state.data?.teams.find(t=>t.id===String(id))?.name||'فريق غير معروف';}
function matchHTML(m){return `<div class="match-row"><span class="match-week">الأسبوع ${m.week}</span><div class="match-teams"><span>${esc(teamName(m.homeId))}</span><b class="score">${m.homeGoals} - ${m.awayGoals}</b><span>${esc(teamName(m.awayId))}</span></div><span class="match-date">${esc(m.date||'')}</span></div>`;}
function renderNewsFeed(){
 const items=state.common.news||[],box=$('newsFeed'),sec=$('newsSection');
 box.innerHTML=items.map(n=>`<article class="news-card">${n.image?`<img class="news-card-img" src="${esc(n.image)}" alt="${esc(n.title)}" loading="lazy" decoding="async">`:''}<div class="news-card-body"><h3>${esc(n.title)}</h3><p>${esc(n.content)}</p>${n.date?`<time>${esc(new Date(n.date).toLocaleDateString('ar-EG'))}</time>`:''}</div></article>`).join('');
 sec.classList.toggle('hidden',!items.length||$('standingsSection').classList.contains('hidden'));
}
function renderNews(){
 const track=$('newsTrack'),items=state.common.news||[];
 renderNewsFeed();
 if(!items.length){track.innerHTML='<span class="news-empty">تابعوا آخر أخبار الوجيه سبورتس</span>';return;}
 const one=items.map(n=>`<button class="news-item" type="button" data-news-id="${esc(n.id)}">${esc(n.title||n.content)}</button><span class="news-separator">✦</span>`).join('');
 track.innerHTML=one+one;
 track.style.animationDuration=Math.max(22,items.reduce((a,n)=>a+(n.title+n.content).length,0)*.17)+'s';
 track.querySelectorAll('[data-news-id]').forEach(b=>b.addEventListener('click',()=>openNews(b.dataset.newsId)));
}
function openNews(id){const n=state.common.news.find(x=>x.id===id);if(!n)return;$('newsModalTitle').textContent=n.title||'خبر البطولة';$('newsModalBody').textContent=n.content;const mi=$('newsModalImg');if(n.image){mi.src=n.image;mi.classList.remove('hidden');}else{mi.removeAttribute('src');mi.classList.add('hidden');}$('newsModalDate').textContent=n.date?new Date(n.date).toLocaleDateString('ar-EG'):'';$('newsModal').classList.remove('hidden');}
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
 $('adminNews').innerHTML=state.common.news.map(n=>`<div class="admin-item"><span>${n.image?'🖼 ':''}${esc(n.title||n.content)}</span><button class="mini-btn delete" data-delete-news="${esc(n.id)}">حذف</button></div>`).join('')||'<div class="empty-state">لا توجد أخبار منشورة.</div>';
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
const EX={FONT:'"IBM Plex Sans Arabic", Tahoma, sans-serif',INK:'#15181b',PAPER:'#fbfaf6',LINE:'#d6d1c4',GREEN:'#1d6b3b',RED:'#d23a2c'};
function newCanvas(W,H){
 const scale=Math.min(2,Math.sqrt(13e6/(W*H))),canvas=document.createElement('canvas');
 canvas.width=Math.round(W*scale);canvas.height=Math.round(H*scale);
 const ctx=canvas.getContext('2d');ctx.scale(scale,scale);ctx.direction='rtl';return {canvas,ctx};
}
function paintBackdrop(ctx,W,H,stadium){
 if(stadium){const cx=118,cy=30,cw=1300,ch=658,ratio=Math.max(W/cw,H/ch),sw=W/ratio,sh=H/ratio;ctx.drawImage(stadium,cx+(cw-sw)/2,cy+(ch-sh)/2,sw,sh,0,0,W,H);}
 else{ctx.fillStyle='#10201a';ctx.fillRect(0,0,W,H);}
 ctx.fillStyle='rgba(8,18,13,.50)';ctx.fillRect(0,0,W,H);
}
function paintHeading(ctx,W,d,assets,title,tag){
 const L=70,R=W-70,F=EX.FONT;
 ctx.textBaseline='middle';ctx.textAlign='right';
 ctx.fillStyle=EX.RED;ctx.fillRect(R-6,72,6,40);
 ctx.fillStyle='#e8ecef';ctx.font='600 30px '+F;ctx.fillText('الوجيه سبورتس  ·  موسم '+(d.league.season||'2026/2027'),R-24,92);
 ctx.fillStyle='#fff';ctx.font='700 '+(W>1500?96:80)+'px '+F;ctx.fillText(title,R,200,R-L-(W>1500?300:230));
 if(assets.logo)ctx.drawImage(assets.logo,L,44,104,104);
 ctx.font='700 30px '+F;const tw=ctx.measureText(tag).width+56;
 rrect(ctx,L,176,tw,56,6);ctx.fillStyle=EX.RED;ctx.fill();
 ctx.fillStyle='#fff';ctx.textAlign='center';ctx.fillText(tag,L+tw/2,205);
}
function paintFooter(ctx,W,fy,foot,d,coach){
 const R=W-70,L=70,F=EX.FONT,pS=124,pX=R-pS,pY=fy+(foot-pS)/2;
 if(coach){
  const size=Math.min(coach.width,coach.height)*.62,sx=Math.max(0,Math.min(coach.width-size,coach.width*.49-size/2)),sy=Math.max(0,Math.min(coach.height-size,coach.height*.30-size/2));
  ctx.fillStyle='#fff';rrect(ctx,pX-5,pY-5,pS+10,pS+10,8);ctx.fill();
  ctx.save();rrect(ctx,pX,pY,pS,pS,5);ctx.clip();ctx.drawImage(coach,sx,sy,size,size,pX,pY,pS,pS);ctx.restore();
 }
 const tx=pX-28;ctx.textAlign='right';ctx.textBaseline='middle';
 ctx.fillStyle='#fff';ctx.font='700 46px '+F;ctx.fillText('إعداد كابتن رجب الوجيه',tx,pY+30,tx-L);
 ctx.fillStyle='#e8ecef';ctx.font='600 27px '+F;ctx.fillText('الموقع الرسمي لكابتن رجب الوجيه',tx,pY+76,tx-L);
 ctx.fillStyle='#b9c1c8';ctx.font='400 22px '+F;ctx.fillText(d.league.name+' · موسم '+d.league.season,tx,pY+110,tx-L);
}
async function buildStandingsImage(){
 const d=state.data,assets=await exportAssets(),rows=d.standings;
 const W=1600,head=330,th=76,rh=74,foot=210,H=head+th+rows.length*rh+foot,L=70,R=W-70,tw=R-L,top=head,F=EX.FONT,{INK,PAPER,LINE,GREEN}=EX;
 const {canvas,ctx}=newCanvas(W,H);
 paintBackdrop(ctx,W,H,assets.stadium);
 paintHeading(ctx,W,d,assets,'جدول ترتيب '+d.league.name,d.league.week?'بعد الأسبوع '+weekName(d.league.week):'بداية المسابقة');
 const cols=[['rank','#',R-44],['name','الفريق',R-96],['played','لعب',984],['won','فاز',872],['drawn','تعادل',760],['lost','خسر',648],['gf','له',536],['ga','عليه',424],['diff','الفارق',303],['points','النقاط',L+80]];
 ctx.save();rrect(ctx,L,top,tw,th+rows.length*rh,10);ctx.clip();
 ctx.fillStyle=PAPER;ctx.fillRect(L,top,tw,th+rows.length*rh);
 ctx.fillStyle=INK;ctx.fillRect(L,top,tw,th);
 ctx.fillStyle='#ffffff';ctx.font='600 26px '+F;ctx.textBaseline='middle';
 cols.forEach(([key,label,px])=>{ctx.textAlign=key==='name'?'right':'center';ctx.fillText(label,px,top+th/2+1);});
 rows.forEach((t,i)=>{
  const y=top+th+i*rh,cy=y+rh/2+1;
  ctx.fillStyle='#ebe7da';ctx.fillRect(L,y,160,rh);
  if(i<rows.length-1){ctx.fillStyle=LINE;ctx.fillRect(L,y+rh-1,tw,1);}
  if(i===0){ctx.fillStyle=GREEN;ctx.fillRect(R-7,y,7,rh);}
  ctx.textAlign='center';ctx.font=(i<3?'700 30px ':'600 27px ')+F;ctx.fillStyle=i<3?GREEN:'#6b7075';ctx.fillText(String(i+1),cols[0][2],cy);
  ctx.textAlign='right';ctx.font='700 31px '+F;ctx.fillStyle=INK;ctx.fillText(t.name,cols[1][2],cy,372);
  const values={played:t.played,won:t.won,drawn:t.drawn,lost:t.lost,gf:t.gf,ga:t.ga,diff:(t.diff>0?'+':'')+t.diff,points:t.points};
  ctx.direction='ltr';
  cols.filter(q=>!['rank','name'].includes(q[0])).forEach(([key,,px])=>{
   ctx.textAlign='center';ctx.font=(key==='points'?'700 36px ':'600 29px ')+F;
   ctx.fillStyle=key==='won'?GREEN:key==='diff'?(t.diff>0?GREEN:t.diff<0?'#c0372a':INK):INK;
   ctx.fillText('\u200E'+String(values[key]??0),px,cy);
  });
  ctx.direction='rtl';
 });
 ctx.restore();
 paintFooter(ctx,W,top+th+rows.length*rh,foot,d,assets.coach);
 return new Promise(res=>canvas.toBlob(res,'image/png'));
}
// Results of one week: home team on the right, away team on the left, score box in the middle.
async function buildResultsImage(week){
 const d=state.data,assets=await exportAssets();
 const list=d.matches.filter(m=>String(m.week)===String(week)&&m.homeGoals!==''&&m.awayGoals!=='');
 const W=1400,head=330,rh=104,foot=210,pad=18,H=head+list.length*rh+pad*2+foot,L=70,R=W-70,tw=R-L,F=EX.FONT,{INK,PAPER,LINE}=EX;
 const {canvas,ctx}=newCanvas(W,H);
 paintBackdrop(ctx,W,H,assets.stadium);
 paintHeading(ctx,W,d,assets,'نتائج '+d.league.name,'الأسبوع '+weekName(Number(week)));
 const top=head,bodyH=list.length*rh+pad*2;
 ctx.save();rrect(ctx,L,top,tw,bodyH,10);ctx.clip();ctx.fillStyle=PAPER;ctx.fillRect(L,top,tw,bodyH);
 ctx.textBaseline='middle';
 list.forEach((m,i)=>{
  const y=top+pad+i*rh,cy=y+rh/2+1,cx=W/2;
  if(i<list.length-1){ctx.fillStyle=LINE;ctx.fillRect(L+24,y+rh-1,tw-48,1);}
  ctx.fillStyle=INK;ctx.font='700 36px '+F;
  ctx.textAlign='right';ctx.fillText(teamName(m.homeId),R-24,cy,R-24-(cx+130));
  ctx.textAlign='left';ctx.fillText(teamName(m.awayId),L+24,cy,cx-130-(L+24));
  rrect(ctx,cx-110,cy-38,220,76,8);ctx.fillStyle=INK;ctx.fill();
  ctx.fillStyle='#fff';ctx.direction='ltr';ctx.textAlign='center';ctx.font='700 44px '+F;
  ctx.fillText(String(m.awayGoals),cx-58,cy+1);ctx.fillText('-',cx,cy);ctx.fillText(String(m.homeGoals),cx+58,cy+1);
  ctx.direction='rtl';
 });
 ctx.restore();
 paintFooter(ctx,W,top+bodyH,foot,d,assets.coach);
 return new Promise(res=>canvas.toBlob(res,'image/png'));
}
// kind: 'standings' | 'results'; target: 'download' | 'whatsapp' | 'facebook'
async function exportImage(kind,target,btn){
 const d=state.data;
 if(!d){return;}
 const week=kind==='results'?$('resultsWeek').value:'';
 if(kind==='standings'&&!d.standings?.length){toast('لا يوجد جدول لتحويله إلى صورة');return;}
 if(kind==='results'&&!week){toast('لا توجد نتائج مسجلة');return;}
 const key=kind+':'+week;
 const title=kind==='results'?'نتائج '+d.league.name+' — الأسبوع '+weekName(Number(week))+' — الوجيه سبورتس':'جدول ترتيب '+d.league.name+' — الوجيه سبورتس';
 const fileName=(kind==='results'?'نتائج-':'ترتيب-')+d.league.id+(week?'-الأسبوع-'+week:'-الأسبوع-'+(d.league.week||0))+'.png';
 const label=btn?btn.textContent:'';
 try{
  if(!imgCache[key]){
   if(btn){btn.disabled=true;btn.textContent='جارٍ التجهيز...';}
   imgCache[key]=await (kind==='results'?buildResultsImage(week):buildStandingsImage());
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
$('newsForm').addEventListener('submit',async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;toast(newsImage?'جارٍ رفع الصورة والخبر...':'جارٍ نشر الخبر...');try{await postAdmin('addNews',{title:$('newsTitle').value.trim(),content:$('newsContent').value.trim(),imageData:newsImage?newsImage.data:'',imageType:newsImage?newsImage.type:''});$('newsTitle').value='';$('newsContent').value='';resetNewsImage();toast('تم نشر الخبر');}catch(err){toast(err.message);}finally{b.disabled=false;}});
$('newsFeed').addEventListener('error',e=>{if(e.target.tagName==='IMG')e.target.remove();},true);
$('adminNews').addEventListener('click',async e=>{const id=e.target.dataset.deleteNews;if(id&&confirm('حذف الخبر من جميع المسابقات؟'))try{await postAdmin('deleteNews',{newsId:id});toast('تم إرسال حذف الخبر');}catch(err){toast(err.message);}});
$('newsPause').addEventListener('click',()=>{const t=$('newsTrack'),p=t.classList.toggle('paused');$('newsPause').textContent=p?'▶':'Ⅱ';});
$('newsModalClose').addEventListener('click',()=>$('newsModal').classList.add('hidden'));
$('newsModal').addEventListener('click',e=>{if(e.target===$('newsModal'))$('newsModal').classList.add('hidden');});
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('newsModal').classList.add('hidden');});
$('menuToggle').addEventListener('click',()=>$('mainNav').classList.toggle('open'));
[['downloadStandingsImage','standings','download'],['shareStandingsWA','standings','whatsapp'],['shareStandingsFB','standings','facebook'],['resultsDownload','results','download'],['resultsWA','results','whatsapp'],['resultsFB','results','facebook']].forEach(([id,kind,target])=>$(id).addEventListener('click',e=>exportImage(kind,target,e.currentTarget)));
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
