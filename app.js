// League Management 2026-2027 — static GitHub Pages data + Apps Script admin publishing
// After deploying the NEW multi-league Apps Script as a Web App, paste its /exec URL here.
const API_URL = 'https://script.google.com/macros/s/AKfycbzypgyDutIs7dKeS3J0wKA2RTAGVGfjU5MDq3AbahRvvMjfongc841AqGOlSnwxPMqD/exec';
const DATA_ROOT = 'https://raw.githubusercontent.com/Elwageh27/league-management-2027/main/data';
const $ = id => document.getElementById(id);
const state = { leagues:[], common:{news:[],siteSettings:{}}, league:null, selectedId:'FOURTH', isAdmin:false, pin:'', data:null };
const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = v => Number(v || 0);
const weekName = n => ({0:'لم يبدأ',1:'الأول',2:'الثاني',3:'الثالث',4:'الرابع',5:'الخامس',6:'السادس',7:'السابع',8:'الثامن',9:'التاسع',10:'العاشر',11:'الحادي عشر',12:'الثاني عشر'}[n] || String(n));
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),3300);}
async function getJSON(path){
  const res=await fetch(path+(path.includes('?')?'&':'?')+'v='+Date.now(),{cache:'no-store'});
  if(!res.ok)throw new Error('تعذر تحميل '+path+' ('+res.status+')');
  return await res.json();
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
    const c=await getJSON(DATA_ROOT+'/common.json');
    state.common={news:(c.news||[]).filter(n=>String(n.Is_Active).toLowerCase()==='true'||n.Is_Active===true).map(n=>({id:String(n.News_ID),title:String(n.Title||''),content:String(n.Content||''),date:n.Created_At||''})),siteSettings:c.siteSettings||{}};
  }catch(e){state.common={news:[],siteSettings:{}};console.warn(e);}
  renderNews();
}
async function loadLeague(id){
  const raw=await getJSON(DATA_ROOT+'/leagues/'+encodeURIComponent(id)+'.json');
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
 // The POST response is opaque in the browser; wait for the Apps Script publish to GitHub.
 await new Promise(r=>setTimeout(r,3500));
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
async function downloadImage(){
 const d=state.data;if(!d?.standings?.length){toast('لا يوجد جدول لتحويله إلى صورة');return;}
 const btn=$('downloadStandingsImage');btn.disabled=true;btn.textContent='جارٍ تجهيز الصورة...';
 try{
  await document.fonts.ready;
  const rows=d.standings, W=1800, head=330, th=88, rh=88, foot=170, H=head+th+rows.length*rh+foot, scale=2;
  const c=document.createElement('canvas');c.width=W*scale;c.height=H*scale;
  const x=c.getContext('2d');x.scale(scale,scale);x.direction='rtl';
  const bg=x.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#f7f9fc');bg.addColorStop(1,'#e9eff6');x.fillStyle=bg;x.fillRect(0,0,W,H);
  const hg=x.createLinearGradient(0,0,W,head);hg.addColorStop(0,'#07182b');hg.addColorStop(1,'#17466b');x.fillStyle=hg;x.fillRect(0,0,W,head);
  x.fillStyle='#ffffff0c';x.beginPath();x.arc(100,50,240,0,Math.PI*2);x.fill();x.beginPath();x.arc(1700,290,220,0,Math.PI*2);x.fill();
  x.fillStyle='#e8b94f';x.beginPath();x.arc(W/2,55,32,0,Math.PI*2);x.fill();x.font='27px Arial';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#0a2038';x.fillText('⚽',W/2,56);
  x.fillStyle='#fff';x.font='900 48px Cairo';x.fillText('جدول ترتيب '+d.league.name,W/2,132);
  x.fillStyle='#d4e0ec';x.font='600 27px Cairo';x.fillText(d.league.region||'منطقة المنيا وبني سويف',W/2,184);
  x.fillStyle='#f2c963';x.font='800 27px Cairo';x.fillText(d.league.week?'بعد الأسبوع '+weekName(d.league.week):'بداية المسابقة',W/2,238);
  x.fillStyle='#d8e4ef';x.font='500 20px Cairo';x.fillText('موسم '+(d.league.season||'2026 / 2027'),W/2,285);
  const top=head, cols=[['rank','#',1705],['name','الفريق',1435],['played','لعب',1160],['won','فاز',1010],['drawn','تعادل',860],['lost','خسر',710],['gf','له',560],['ga','عليه',410],['diff','الفارق',250],['points','النقاط',95]];
  x.fillStyle='#e8eef5';x.fillRect(45,top,W-90,th);x.fillStyle='#1a3858';x.font='800 24px Cairo';x.textBaseline='middle';
  cols.forEach(([k,l,px])=>{x.textAlign=k==='name'?'right':'center';x.fillText(l,px,top+th/2);});
  rows.forEach((t,i)=>{
   const y=top+th+i*rh;x.fillStyle=i%2?'#f8fafc':'#fff';x.fillRect(45,y,W-90,rh);x.strokeStyle='#e2e9f0';x.lineWidth=1;x.beginPath();x.moveTo(45,y+rh);x.lineTo(W-45,y+rh);x.stroke();
   x.beginPath();x.arc(1705,y+rh/2,25,0,Math.PI*2);x.fillStyle=i===0?'#e9bd55':i<3?'#d9eadd':'#e9eef4';x.fill();
   x.fillStyle='#15314f';x.font='900 23px Cairo';x.textAlign='center';x.fillText(String(i+1),1705,y+rh/2);
   x.textAlign='right';x.font='800 25px Cairo';x.fillStyle='#102944';x.fillText(t.name,1500,y+rh/2,390);
   const values={played:t.played,won:t.won,drawn:t.drawn,lost:t.lost,gf:t.gf,ga:t.ga,diff:(t.diff>0?'+':'')+t.diff,points:t.points};
   cols.filter(q=>!['rank','name'].includes(q[0])).forEach(([k,,px])=>{x.textAlign='center';x.font=k==='points'?'900 27px Cairo':'700 24px Cairo';x.fillStyle=k==='points'?'#0c2948':k==='won'?'#168b61':k==='diff'?(t.diff>0?'#168b61':t.diff<0?'#c33e3e':'#53677d'):'#263e56';x.fillText(String(values[k]??0),px,y+rh/2);});
  });
  const fy=top+th+rows.length*rh;x.fillStyle='#07182b';x.fillRect(0,fy,W,foot);
  const img=new Image();img.src='assets/coach-ragab.jpg';
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=resolve;});
  const cx=W/2+300,cy=fy+75,r=48;
  if(img.complete&&img.naturalWidth){x.save();x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);x.clip();x.drawImage(img,cx-r,cy-r,r*2,r*2);x.restore();x.beginPath();x.arc(cx,cy,r+4,0,Math.PI*2);x.strokeStyle='#e8b94f';x.lineWidth=5;x.stroke();}
  x.fillStyle='#f1c65e';x.font='900 32px Cairo';x.textAlign='center';x.fillText('إعداد كابتن رجب الوجيه',W/2-85,fy+68);
  x.fillStyle='#d7e2ed';x.font='500 21px Cairo';x.fillText('منطقة المنيا وبني سويف · '+d.league.name+' · موسم '+d.league.season,W/2,fy+123);
  const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));
  if(!blob)throw new Error('تعذر إنشاء الصورة');
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ترتيب-'+d.league.id+'-الأسبوع-'+(d.league.week||0)+'.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);toast('تم تنزيل صورة جدول الترتيب');
 }catch(e){console.error(e);toast('تعذر تجهيز الصورة على هذا الجهاز');}
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
  const list=await getJSON(DATA_ROOT+'/../data/common.json');
  state.leagues=list.leagues||[];
  // Common file contains news/settings only; league list is fetched from Apps Script once only by administrator publishing.
 }catch(_){}
 // League IDs are fixed by the configured workbook; names are read from the matching published JSON files.
 const ids=['SECOND','THIRD','FOURTH','Y2007','Y2009','Y2010','Y2011','Y2012','Y2013'];
 const fallbackNames={'SECOND':'القسم الثاني','THIRD':'القسم الثالث','FOURTH':'القسم الرابع','Y2007':'مواليد 2007','Y2009':'مواليد 2009','Y2010':'مواليد 2010','Y2011':'مواليد 2011','Y2012':'مواليد 2012','Y2013':'مواليد 2013'};
 const found=[];
 for(const id of ids){try{const r=await getJSON(DATA_ROOT+'/leagues/'+id+'.json');found.push(r.league||{League_ID:id,League_Name:fallbackNames[id],Season:'2026/2027',Region:'منطقة المنيا وبني سويف'});}catch(e){found.push({League_ID:id,League_Name:fallbackNames[id],Season:'2026/2027',Region:'منطقة المنيا وبني سويف'});}}
 state.leagues=found;
 renderLeagueCards();
 await loadCommon();
 const initial=state.leagues.find(x=>x.League_ID==='FOURTH')||state.leagues[0];
 if(initial)await selectLeague(initial.League_ID,false);
}
boot().catch(e=>{console.error(e);toast('تعذر تحميل الموقع: '+e.message);});
