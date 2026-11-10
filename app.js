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
  return {league:{id:String(l.League_ID),name:String(l.League_Name||'مسابقة'),category:String(l.Category||''),season:String(l.Season||'2026/2027'),region:String(l.Region||'منطقة المنيا وبني سويف'),week:num(l.Current_Week)},teams,matches,standings,settings};
}
async function loadCommon(){
  try{
    const c=await jsonpData({action:'getNews'});
    state.common={news:(c.news||[]).filter(n=>String(n.Is_Active).toLowerCase()==='true'||n.Is_Active===true).map(n=>({id:String(n.News_ID),title:String(n.Title||''),content:String(n.Content||''),date:n.Created_At||''})),siteSettings:c.siteSettings||{}};
  }catch(e){state.common={news:[],siteSettings:{}};console.warn(e);}
  renderNews();
}
async function loadLeague(id){
  const raw=await jsonpData({action:'getLeague',leagueId:id});
  state.data=normalizeLeague(raw);state.selectedId=id;state.league=state.data.league;
  renderLeague();return state.data;
}
function renderLeagueCards(){
  $('leagueGrid').innerHTML=state.leagues.map((l,i)=>`<button class="league-card ${l.League_ID===state.selectedId?'active':''}" data-league="${esc(l.League_ID)}"><div class="league-card-top"><span class="league-icon">${String(l.Category||'').includes('مواليد')?'👟':'🏆'}</span><span class="league-arrow">←</span></div><h3>${esc(l.League_Name)}</h3><p>${esc(l.Season||'2026/2027')} · ${esc(l.Region||'منطقة المنيا وبني سويف')}</p></button>`).join('');
  $('adminLeagueSelect').innerHTML=state.leagues.map(l=>`<option value="${esc(l.League_ID)}">${esc(l.League_Name)}</option>`).join('');
  $('leagueGrid').querySelectorAll('[data-league]').forEach(b=>b.addEventListener('click',()=>selectLeague(b.dataset.league,true)));
}
async function selectLeague(id,scroll){
  try{
    await loadLeague(id);$('adminLeagueSelect').value=id;
    $('leagues').classList.add('hidden');
    $('competitionPanel').classList.remove('hidden');$('standingsSection').classList.remove('hidden');$('matches').classList.remove('hidden');
    if(scroll)$('competitionPanel').scrollIntoView({behavior:'smooth',block:'start'});
  }catch(e){toast('تعذر تحميل المسابقة: '+e.message);console.error(e);}
}
function renderLeague(){
  const d=state.data,l=d.league,s=d.standings;
  $('competitionTitle').textContent=l.name;$('competitionRegion').textContent=l.region||'منطقة المنيا وبني سويف';
  $('selectedWeek').textContent=l.week?'الأسبوع الحالي: '+weekName(l.week):'لم تبدأ المباريات';
  $('tableLeagueName').textContent=l.name;$('tableRegion').textContent=l.region||'منطقة المنيا وبني سويف';$('tableWeek').textContent=l.week?'بعد الأسبوع '+weekName(l.week):'لم تبدأ المباريات';
  $('standingsBody').innerHTML=s.map((t,i)=>`<tr><td class="rank ${i<3?'top':''}">${i+1}</td><td class="team-cell"><span class="team-badge">⚽</span>${esc(t.name)}</td><td>${t.played}</td><td class="positive">${t.won}</td><td>${t.drawn}</td><td>${t.lost}</td><td>${t.gf}</td><td>${t.ga}</td><td class="${t.diff>0?'positive':t.diff<0?'negative':''}">${t.diff>0?'+':''}${t.diff}</td><td class="points">${t.points}</td></tr>`).join('')||'<tr><td colspan="10">لا توجد فرق في هذه المسابقة.</td></tr>';
  const played=d.matches.filter(m=>m.homeGoals!==''&&m.awayGoals!=='').sort((a,b)=>b.week-a.week);
  $('matchesCount').textContent=played.length+' مباراة';
  $('matchesList').innerHTML=played.length?played.map(matchHTML).join(''):'<div class="empty-state">لا توجد نتائج مسجلة حتى الآن.</div>';
  if(state.isAdmin)renderAdmin();
}
function teamName(id){return state.data?.teams.find(t=>t.id===String(id))?.name||'فريق غير معروف';}
function matchHTML(m){return `<div class="match-row"><span class="match-week">الأسبوع ${m.week}</span><div class="match-teams"><span>${esc(teamName(m.homeId))}</span><b class="score">${m.homeGoals} - ${m.awayGoals}</b><span>${esc(teamName(m.awayId))}</span></div><span class="match-date">${esc(m.date||'')}</span></div>`;}
function renderNews(){
 const track=$('newsTrack'),items=state.common.news||[];
 if(!items.length){track.innerHTML='<span class="news-empty">تابعوا آخر أخبار مسابقات المنطقة</span>';return;}
 const one=items.map(n=>`<button class="news-item" type="button" data-news-id="${esc(n.id)}">${esc(n.title||n.content)}</button><span class="news-separator">✦</span>`).join('');
 track.innerHTML=one+one;
 track.style.animationDuration=Math.max(22,items.reduce((a,n)=>a+(n.title+n.content).length,0)*.17)+'s';
 track.querySelectorAll('[data-news-id]').forEach(b=>b.addEventListener('click',()=>openNews(b.dataset.newsId)));
}
function openNews(id){const n=state.common.news.find(x=>x.id===id);if(!n)return;$('newsModalTitle').textContent=n.title||'خبر البطولة';$('newsModalBody').textContent=n.content;$('newsModalDate').textContent=n.date?new Date(n.date).toLocaleDateString('ar-EG'):'خبر من أخبار المنطقة';$('newsModal').classList.remove('hidden');}
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
 $('adminNews').innerHTML=state.common.news.map(n=>`<div class="admin-item"><span>${esc(n.title||n.content)}</span><button class="mini-btn delete" data-delete-news="${esc(n.id)}">حذف</button></div>`).join('')||'<div class="empty-state">لا توجد أخبار منشورة.</div>';
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
function drawBall(ctx,cx,cy,r){
 ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fillStyle='#f4f7fa';ctx.fill();ctx.clip();
 ctx.fillStyle='#14243a';ctx.strokeStyle='#14243a';ctx.lineWidth=Math.max(1.5,r*.07);
 const pent=(x,y,s)=>{ctx.beginPath();for(let i=0;i<5;i++){const a=-Math.PI/2+i*2*Math.PI/5;ctx[i?'lineTo':'moveTo'](x+Math.cos(a)*s,y+Math.sin(a)*s);}ctx.closePath();ctx.fill();};
 pent(cx,cy,r*.36);
 for(let i=0;i<5;i++){const a=-Math.PI/2+i*2*Math.PI/5;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*r*.36,cy+Math.sin(a)*r*.36);ctx.lineTo(cx+Math.cos(a)*r*.7,cy+Math.sin(a)*r*.7);ctx.stroke();pent(cx+Math.cos(a)*r*1.02,cy+Math.sin(a)*r*1.02,r*.3);}
 ctx.restore();
 ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.strokeStyle='rgba(0,0,0,.25)';ctx.lineWidth=2;ctx.stroke();
}
async function downloadImage(){
 const d=state.data;
 if(!d?.standings?.length){toast('لا يوجد جدول لتحويله إلى صورة');return;}
 const btn=$('downloadStandingsImage');
 btn.disabled=true;btn.textContent='جارٍ تجهيز الصورة...';
 try{
  try{await Promise.all([document.fonts.load('400 60px Lalezar'),document.fonts.load('900 30px Cairo'),document.fonts.load('700 30px Cairo'),document.fonts.load('500 20px Cairo')]);}catch(_){}
  await document.fonts.ready;
  const [stadium,coach]=await Promise.all([
   loadExportAsset('assets/stadium-table.jpg'),
   loadExportAsset('assets/coach-ragab.jpg')
  ]);
  const DISP='Lalezar, Cairo, sans-serif',TXT='Cairo, sans-serif';
  const rows=d.standings,W=1600,head=372,th=80,rh=76,foot=214,H=head+th+rows.length*rh+foot;
  const scale=Math.min(2,Math.sqrt(13e6/(W*H)));
  const canvas=document.createElement('canvas');canvas.width=Math.round(W*scale);canvas.height=Math.round(H*scale);
  const ctx=canvas.getContext('2d');ctx.scale(scale,scale);ctx.direction='rtl';
  // 1) Stadium background (clean area inside the photo's own frame), cover-fitted.
  if(stadium){
   const cx=118,cy=30,cw=1300,ch=658,ratio=Math.max(W/cw,H/ch),sw=W/ratio,sh=H/ratio;
   ctx.drawImage(stadium,cx+(cw-sw)/2,cy+(ch-sh)/2,sw,sh,0,0,W,H);
  }else{
   const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#08233d');bg.addColorStop(1,'#06111f');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  }
  // 2) Night tint: lighter at the top so the floodlights show, darker behind the table so numbers stay readable.
  const tint=ctx.createLinearGradient(0,0,0,H);
  tint.addColorStop(0,'rgba(4,12,24,.12)');tint.addColorStop(.22,'rgba(4,12,24,.48)');tint.addColorStop(1,'rgba(3,9,18,.82)');
  ctx.fillStyle=tint;ctx.fillRect(0,0,W,H);
  // 3) Gold frame (echoes the frame in the stadium photo).
  const gold=ctx.createLinearGradient(0,0,W,H);gold.addColorStop(0,'#f6dc92');gold.addColorStop(.5,'#e2b24a');gold.addColorStop(1,'#f6dc92');
  rrect(ctx,26,26,W-52,H-52,38);ctx.strokeStyle=gold;ctx.lineWidth=5;ctx.stroke();
  rrect(ctx,40,40,W-80,H-80,28);ctx.strokeStyle='rgba(246,220,146,.28)';ctx.lineWidth=2;ctx.stroke();
  // 4) Title plate sitting on the top edge of the frame.
  const plW=520,plH=64,plX=(W-plW)/2,plY=14;
  rrect(ctx,plX,plY,plW,plH,22);ctx.fillStyle='#07182b';ctx.fill();ctx.strokeStyle=gold;ctx.lineWidth=4;ctx.stroke();
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='#f6dc92';ctx.font='900 30px '+TXT;ctx.fillText('موسم '+(d.league.season||'2026/2027'),W/2,plY+plH/2+2);
  // 5) Heading block.
  drawBall(ctx,W/2,138,34);
  ctx.save();ctx.shadowColor='rgba(0,0,0,.7)';ctx.shadowBlur=18;ctx.shadowOffsetY=4;
  ctx.fillStyle='#ffffff';ctx.font='400 96px '+DISP;ctx.fillText('جدول ترتيب '+d.league.name,W/2,232,W-220);
  ctx.restore();
  ctx.fillStyle='#dbe7f2';ctx.font='700 30px '+TXT;ctx.fillText(d.league.region||'منطقة المنيا وبني سويف',W/2,300);
  const wk=d.league.week?'بعد الأسبوع '+weekName(d.league.week):'بداية المسابقة';
  ctx.font='900 28px '+TXT;const wkW=ctx.measureText(wk).width+72;
  rrect(ctx,(W-wkW)/2,324,wkW,46,23);ctx.fillStyle=gold;ctx.fill();
  ctx.fillStyle='#14283d';ctx.fillText(wk,W/2,348);
  // 6) Table.
  const L=78,R=W-78,tw=R-L,top=head;
  const cols=[['rank','#',R-44],['name','الفريق',R-96],['played','لعب',984],['won','فاز',872],['drawn','تعادل',760],['lost','خسر',648],['gf','له',536],['ga','عليه',424],['diff','الفارق',303],['points','النقاط',L+80]];
  ctx.save();rrect(ctx,L,top,tw,th+rows.length*rh,20);ctx.clip();
  const hg=ctx.createLinearGradient(L,0,R,0);hg.addColorStop(0,'#0e4a38');hg.addColorStop(.5,'#0c3d44');hg.addColorStop(1,'#0d2b4a');
  ctx.fillStyle=hg;ctx.fillRect(L,top,tw,th);
  ctx.fillStyle='#f6dc92';ctx.font='900 26px '+TXT;ctx.textBaseline='middle';
  cols.forEach(([key,label,px])=>{ctx.textAlign=key==='name'?'right':'center';ctx.fillText(label,px,top+th/2+1);});
  rows.forEach((t,i)=>{
   const y=top+th+i*rh;
   ctx.fillStyle=i%2?'rgba(7,26,46,.84)':'rgba(11,38,64,.84)';ctx.fillRect(L,y,tw,rh);
   if(i===0){const lg=ctx.createLinearGradient(R,0,L,0);lg.addColorStop(0,'rgba(226,178,74,.30)');lg.addColorStop(.6,'rgba(226,178,74,0)');ctx.fillStyle=lg;ctx.fillRect(L,y,tw,rh);ctx.fillStyle=gold;ctx.fillRect(R-6,y,6,rh);}
   ctx.fillStyle='rgba(255,255,255,.07)';ctx.fillRect(L,y+rh-1,tw,1);
   const pcx=cols[9][2];ctx.fillStyle='rgba(226,178,74,.14)';ctx.fillRect(L,y,160,rh);
   const rcx=cols[0][2];
   if(i<3){ctx.beginPath();ctx.arc(rcx,y+rh/2,25,0,Math.PI*2);ctx.fillStyle=['#f2cb68','#d5dde6','#cf9255'][i];ctx.fill();}
   ctx.textAlign='center';ctx.font='900 28px '+TXT;ctx.fillStyle=i<3?'#17202e':'#9fb2c4';ctx.fillText(String(i+1),rcx,y+rh/2+1);
   ctx.textAlign='right';ctx.font='900 31px '+TXT;ctx.fillStyle='#fff';ctx.fillText(t.name,cols[1][2],y+rh/2+1,372);
   const values={played:t.played,won:t.won,drawn:t.drawn,lost:t.lost,gf:t.gf,ga:t.ga,diff:(t.diff>0?'+':'')+t.diff,points:t.points};
   ctx.direction='ltr';
   cols.filter(q=>!['rank','name'].includes(q[0])).forEach(([key,,px])=>{
    ctx.textAlign='center';ctx.font=key==='points'?'900 36px '+TXT:'700 29px '+TXT;
    ctx.fillStyle=key==='points'?'#f6dc92':key==='won'?'#5fe0a0':key==='diff'?(t.diff>0?'#5fe0a0':t.diff<0?'#ff8080':'#dce6ef'):'#f2f6fa';
    ctx.fillText('\u200E'+String(values[key]??0),px,y+rh/2+1);
   });
   ctx.direction='rtl';
  });
  ctx.restore();
  rrect(ctx,L,top,tw,th+rows.length*rh,20);ctx.strokeStyle='rgba(226,178,74,.75)';ctx.lineWidth=2.5;ctx.stroke();
  // 7) Footer: coach portrait + official-site label.
  const fy=top+th+rows.length*rh+22,fc=fy+(foot-22-40)/2;
  ctx.fillStyle='rgba(226,178,74,.45)';ctx.fillRect(W/2-120,fy+2,240,3);
  const photoX=R-86,photoY=fc+8,photoR=70;
  if(coach){
   const size=Math.min(coach.width,coach.height)*.62,sx=Math.max(0,Math.min(coach.width-size,coach.width*.49-size/2)),sy=Math.max(0,Math.min(coach.height-size,coach.height*.30-size/2));
   ctx.save();ctx.beginPath();ctx.arc(photoX,photoY,photoR,0,Math.PI*2);ctx.clip();ctx.drawImage(coach,sx,sy,size,size,photoX-photoR,photoY-photoR,photoR*2,photoR*2);ctx.restore();
   ctx.beginPath();ctx.arc(photoX,photoY,photoR+5,0,Math.PI*2);ctx.strokeStyle=gold;ctx.lineWidth=6;ctx.stroke();
  }else{
   drawBall(ctx,photoX,photoY,photoR);
  }
  const tx=photoX-photoR-30;
  ctx.textAlign='right';ctx.textBaseline='middle';
  ctx.fillStyle='#f6dc92';ctx.font='400 50px '+DISP;ctx.fillText('إعداد كابتن رجب الوجيه',tx,photoY-34);
  ctx.fillStyle='#e8f0f7';ctx.font='700 26px '+TXT;ctx.fillText('الموقع الرسمي لكابتن رجب الوجيه',tx,photoY+14);
  ctx.fillStyle='#a9bccd';ctx.font='500 21px '+TXT;ctx.fillText('منطقة المنيا وبني سويف · '+d.league.name+' · موسم '+d.league.season,tx,photoY+52,tx-(L+130));
  drawBall(ctx,L+60,photoY,44);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  if(!blob)throw new Error('تعذر إنشاء الصورة من المتصفح.');
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='ترتيب-'+d.league.id+'-الأسبوع-'+(d.league.week||0)+'.png';
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
  toast('تم تنزيل صورة الجدول بالخلفية وصورة الكابتن');
 }catch(e){console.error(e);toast('تعذر تجهيز الصورة. افتح الموقع من رابط GitHub Pages وحاول مرة أخرى.');}
 finally{btn.disabled=false;btn.textContent='▧ تحميل جدول الترتيب كصورة';}
}

// Admin events — field names match the current Apps Script API.
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();const pin=$('password').value.trim();if(!pin)return;const b=e.submitter;b.disabled=true;$('loginNote').textContent='جارٍ التحقق...';try{await verifyPin(pin);state.pin=pin;setAdmin(true);$('password').value='';$('loginNote').textContent='';toast('تم فتح لوحة الإدارة');}catch(err){state.pin='';$('loginNote').textContent=err.message;toast(err.message);}finally{b.disabled=false;}});
$('logoutBtn').addEventListener('click',()=>{state.pin='';setAdmin(false);toast('تم تسجيل الخروج');});
$('adminReveal').addEventListener('click',()=>{$('admin').classList.remove('hidden');$('admin').scrollIntoView({behavior:'smooth'});});
$('closeAdmin').addEventListener('click',()=>$('admin').classList.add('hidden'));
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.tab-content').forEach(x=>x.classList.remove('active'));b.classList.add('active');$(b.dataset.tab).classList.add('active');}));
$('adminLeagueSelect').addEventListener('change',e=>selectLeague(e.target.value,false));
$('backToLeagues').addEventListener('click',()=>{
 $('competitionPanel').classList.add('hidden');$('standingsSection').classList.add('hidden');$('matches').classList.add('hidden');
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
$('newsForm').addEventListener('submit',async e=>{e.preventDefault();try{await postAdmin('addNews',{title:$('newsTitle').value.trim(),content:$('newsContent').value.trim()});$('newsTitle').value='';$('newsContent').value='';toast('تم إرسال الخبر المشترك');}catch(err){toast(err.message);}});
$('adminNews').addEventListener('click',async e=>{const id=e.target.dataset.deleteNews;if(id&&confirm('حذف الخبر من جميع المسابقات؟'))try{await postAdmin('deleteNews',{newsId:id});toast('تم إرسال حذف الخبر');}catch(err){toast(err.message);}});
$('newsPause').addEventListener('click',()=>{const t=$('newsTrack'),p=t.classList.toggle('paused');$('newsPause').textContent=p?'▶':'Ⅱ';});
$('newsModalClose').addEventListener('click',()=>$('newsModal').classList.add('hidden'));
$('newsModal').addEventListener('click',e=>{if(e.target===$('newsModal'))$('newsModal').classList.add('hidden');});
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('newsModal').classList.add('hidden');});
$('menuToggle').addEventListener('click',()=>$('mainNav').classList.toggle('open'));
$('downloadStandingsImage').addEventListener('click',downloadImage);
$('yearNow').textContent=new Date().getFullYear();
async function boot(){
 try{
  const list=await jsonpData({});
  state.leagues=list.leagues||[];
 }catch(e){console.error(e);toast('تعذر تحميل قائمة المسابقات: '+e.message);return;}
 renderLeagueCards();
 await loadCommon();
 const initial=state.leagues.find(x=>x.League_ID==='FOURTH')||state.leagues[0];
 if(initial)await selectLeague(initial.League_ID,false);
}
boot().catch(e=>{console.error(e);toast('تعذر تحميل الموقع: '+e.message);});
