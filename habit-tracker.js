/* Habit Tracker — Application Logic */
/* Requires Chart.js: https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js */

const CAT_COLORS={health:'#5CA87C',fitness:'#E07B39',learning:'#5C8AC4',mindfulness:'#8C5CC4',productivity:'#C4A85C',other:'#7C8CA8'};
const CAT_EMOJI={health:'🌿',fitness:'💪',learning:'📚',mindfulness:'🧘',productivity:'⚡',other:'✦'};
const PALETTE=['#D4A847','#E07B39','#C45C5C','#5CA87C','#5C8AC4','#8C5CC4','#C45C8C','#7C8CA8'];
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SHORT=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

let state={habits:[],completions:{},selectedDate:todayStr(),currentMonth:new Date(),activeView:'calendar',editingId:null,categoryFilter:'all',selectedColor:PALETTE[0],reportType:'weekly',reportOffset:0};

function todayStr(){const d=new Date();return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function dateStr(date){return`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`}
function pad(n){return String(n).padStart(2,'0')}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function pct(done,total){return total===0?0:Math.round((done/total)*100)}
function formatDate(str){if(!str)return'';const[y,m,d]=str.split('-').map(Number);const dt=new Date(y,m-1,d);return dt.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}
function addDays(date,n){const d=new Date(date);d.setDate(d.getDate()+n);return d}
function escHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

function save(){try{localStorage.setItem('ritual_habits',JSON.stringify(state.habits));localStorage.setItem('ritual_completions',JSON.stringify(state.completions));}catch(e){}}
function load(){
  try{const h=localStorage.getItem('ritual_habits');const c=localStorage.getItem('ritual_completions');if(h)state.habits=JSON.parse(h);if(c)state.completions=JSON.parse(c);}catch(e){}
  if(!state.habits.length)seedDefaults();
}
function seedDefaults(){
  [{title:'Morning Meditation',desc:'10 minutes of mindful breathing',category:'mindfulness',color:'#8C5CC4'},{title:'Read 30 mins',desc:'Read books or articles',category:'learning',color:'#5C8AC4'},{title:'Exercise',desc:'Any form of physical activity',category:'fitness',color:'#E07B39'},{title:'Drink 8 glasses of water',desc:'Stay hydrated throughout the day',category:'health',color:'#5CA87C'}].forEach(d=>addHabit(d,false));
  const today=new Date();
  for(let i=0;i<14;i++){const dt=addDays(today,-i);const ds=dateStr(dt);state.completions[ds]=[];const n=Math.floor(Math.random()*state.habits.length+1);for(let j=0;j<n&&j<state.habits.length;j++)state.completions[ds].push(state.habits[j].id);}
  save();
}

function addHabit(data,doSave=true){const h={id:uid(),title:data.title,desc:data.desc||'',category:data.category||'other',color:data.color||PALETTE[0],createdAt:dateStr(new Date())};state.habits.push(h);if(doSave){save();renderAll();}return h;}
function updateHabit(id,data){const h=state.habits.find(x=>x.id===id);if(!h)return;Object.assign(h,data);save();renderAll();}
function deleteHabit(id){state.habits=state.habits.filter(x=>x.id!==id);Object.keys(state.completions).forEach(k=>{state.completions[k]=state.completions[k].filter(x=>x!==id)});save();renderAll();}

function getCompleted(ds){return state.completions[ds]||[]}
function isCompleted(ds,hid){return getCompleted(ds).includes(hid)}
function toggleCompletion(ds,hid){
  if(!state.completions[ds])state.completions[ds]=[];
  const idx=state.completions[ds].indexOf(hid);
  if(idx>=0)state.completions[ds].splice(idx,1);else state.completions[ds].push(hid);
  save();renderCalendarGrid();renderDayDetail();renderSidebarFooter();renderCalBadges();
}
function getDayRate(ds){const habits=filteredHabits();if(!habits.length)return 0;const done=getCompleted(ds).filter(id=>habits.some(h=>h.id===id)).length;return pct(done,habits.length)}
function getWeekRate(){let total=0,done=0;for(let i=6;i>=0;i--){const ds=dateStr(addDays(new Date(),-i));if(!state.habits.length)continue;done+=getCompleted(ds).filter(id=>state.habits.some(h=>h.id===id)).length;total+=state.habits.length;}return pct(done,total)}
function getMonthRate(){const now=new Date();let total=0,done=0;for(let d=1;d<=now.getDate();d++){const ds=`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(d)}`;if(!state.habits.length)continue;done+=getCompleted(ds).filter(id=>state.habits.some(h=>h.id===id)).length;total+=state.habits.length;}return pct(done,total)}
function getHabitMonthRate(hid){const now=new Date();let done=0,total=0;for(let d=1;d<=now.getDate();d++){const ds=`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(d)}`;total++;if((state.completions[ds]||[]).includes(hid))done++;}return pct(done,total)}
function getCurrentStreak(hid){let streak=0;let d=new Date();while(true){if((state.completions[dateStr(d)]||[]).includes(hid)){streak++;d=addDays(d,-1);}else break;if(streak>365)break;}return streak}
function getBestOverallStreak(){let best=0,cur=0,d=new Date();for(let i=0;i<365;i++){const r=getDayRate(dateStr(d));if(r===100&&state.habits.length){cur++;best=Math.max(best,cur);}else cur=0;d=addDays(d,-1);}return best}
function getCurrentOverallStreak(){let streak=0;let d=new Date();while(true){if(getDayRate(dateStr(d))===100&&state.habits.length){streak++;d=addDays(d,-1);}else break;if(streak>365)break;}return streak}
function countPerfectDays(n){let count=0;let d=new Date();for(let i=0;i<n;i++){if(getDayRate(dateStr(d))===100&&state.habits.length)count++;d=addDays(d,-1);}return count}
function filteredHabits(){return state.categoryFilter==='all'?state.habits:state.habits.filter(h=>h.category===state.categoryFilter)}

// SIDEBAR
function renderSidebar(){
  const list=document.getElementById('habit-list');const habits=filteredHabits();
  if(!habits.length){list.innerHTML=`<div style="padding:16px 20px;font-size:0.8rem;color:var(--cream-dim);line-height:1.7">${state.habits.length?'No habits in this category.':'Click <strong style="color:var(--gold)">＋</strong> to add your first habit!'}</div>`;return;}
  list.innerHTML=habits.map(h=>{const streak=getCurrentStreak(h.id);return`<div class="habit-item" data-id="${h.id}">
    <div class="habit-dot" style="background:${h.color};color:${h.color}"></div>
    <div class="habit-info"><div class="habit-name">${escHtml(h.title)}</div><div class="habit-cat-badge">${CAT_EMOJI[h.category]||''} ${h.category}</div></div>
    ${streak>0?`<div class="habit-streak-badge">🔥 ${streak}</div>`:''}
    <div class="habit-actions">
      <button class="habit-action-btn" onclick="event.stopPropagation();openModal('${h.id}')" title="Edit">✎</button>
      <button class="habit-action-btn del" onclick="event.stopPropagation();if(confirm('Delete this habit?'))deleteHabit('${h.id}')" title="Delete">✕</button>
    </div>
  </div>`;}).join('');
  renderSidebarFooter();
}
function renderSidebarFooter(){
  document.getElementById('sb-streak').textContent=getBestOverallStreak();
  document.getElementById('sb-today').textContent=getDayRate(todayStr())+'%';
  document.getElementById('sb-month').textContent=getMonthRate()+'%';
}

function renderCalBadges(){
  const bestStreak=getBestOverallStreak(),weekRate=getWeekRate(),monthRate=getMonthRate(),perfectDays=countPerfectDays(30);
  const all=[
    {icon:'🔥',name:'7-Day Streak',earned:bestStreak>=7},
    {icon:'🏆',name:'30-Day Champion',earned:monthRate>=80},
    {icon:'⭐',name:'Perfect Week',earned:weekRate===100},
    {icon:'💎',name:'Consistency',earned:perfectDays>=5},
    {icon:'🌅',name:'Good Habits',earned:state.habits.length>=3},
    {icon:'👑',name:'Ritual Master',earned:bestStreak>=14},
  ];
  const earned=all.filter(b=>b.earned);
  const strip=document.getElementById('cal-badges-strip');
  const row=document.getElementById('cal-badges-row');
  if(!earned.length){strip.style.display='none';return;}
  strip.style.display='flex';
  row.innerHTML=earned.map(b=>`<div class="cal-badge"><span class="cal-badge-icon">${b.icon}</span><span class="cal-badge-name">${b.name}</span></div>`).join('');
}

// CALENDAR
function renderCalendar(){
  document.getElementById('cal-month-label').textContent=MONTHS[state.currentMonth.getMonth()]+' '+state.currentMonth.getFullYear();
  renderCalendarGrid();
  renderCalBadges();
}
function renderCalendarGrid(){
  const grid=document.getElementById('cal-grid');
  const d=state.currentMonth;const year=d.getFullYear(),month=d.getMonth();
  const firstDay=new Date(year,month,1);const lastDay=new Date(year,month+1,0);
  const todayS=todayStr();let startDow=(firstDay.getDay()+6)%7;
  const cells=[];
  for(let i=0;i<startDow;i++){const dt=new Date(year,month,1-startDow+i);cells.push({date:dateStr(dt),day:dt.getDate(),other:true});}
  for(let i=1;i<=lastDay.getDate();i++){cells.push({date:dateStr(new Date(year,month,i)),day:i,other:false});}
  while(cells.length%7!==0){const dt=new Date(year,month+1,cells.length-startDow-lastDay.getDate()+1);cells.push({date:dateStr(dt),day:dt.getDate(),other:true});}
  const habits=filteredHabits();
  grid.innerHTML=cells.map(c=>{
    const rate=c.other?0:getDayRate(c.date);
    const isToday=c.date===todayS,isSelected=c.date===state.selectedDate;

    // Color fill by completion band
    let fillBg='transparent';
    let greenClass='';
    if(!c.other && rate>0){
      if(rate>=90){
        fillBg='#1e7a32';                  // solid dark green 90-100%
        greenClass=' green-full';
      } else if(rate>=60){
        fillBg='hsla(128,52%,48%,0.82)';   // light green 60-89%
        greenClass=' green-high';
      } else if(rate>=31){
        fillBg='hsla(33,90%,48%,0.85)';    // amber/orange 31-59%
        greenClass=' amber-mid';
      } else {
        fillBg='hsla(0,70%,50%,0.72)';     // red 1-30%
        greenClass=' red-low';
      }
    }

    const comp=getCompleted(c.date).filter(id=>habits.some(h=>h.id===id));
    // White bottom strip — dots on left, pct on right
    const bottomStrip=!c.other&&habits.length
      ?`<div class="cal-bottom">
          <div class="cal-dots">${habits.filter(h=>comp.includes(h.id)).slice(0,6).map(h=>`<div class="cal-dot" style="background:${h.color}"></div>`).join('')}</div>
          ${rate>0?`<span class="cal-pct">${rate}%</span>`:''}
        </div>`
      :'';
    return`<div class="cal-cell${c.other?' other-month':''}${isToday?' today':''}${isSelected?' selected':''}${greenClass}"${!c.other?` onclick="selectDate('${c.date}')"`:''}>
      <div class="cal-fill" style="background:${fillBg}"></div>
      <div class="cal-day-num">${c.day}</div>
      ${bottomStrip}
    </div>`;
  }).join('');
}

// DAY DETAIL
function renderDayDetail(){
  const ds=state.selectedDate;
  document.getElementById('detail-date-label').textContent=formatDate(ds);
  document.getElementById('detail-date-sub').textContent=ds===todayStr()?'Today':'';
  const habits=filteredHabits();const completed=getCompleted(ds).filter(id=>habits.some(h=>h.id===id));
  const rate=pct(completed.length,habits.length);
  const circumference=138.23;
  const ring=document.getElementById('ring-fg');
  ring.style.strokeDashoffset=circumference-(circumference*rate/100);
  ring.style.stroke=rate>=80?'#D4A847':rate>=40?'#E07B39':'#C45C5C';
  document.getElementById('ring-pct').textContent=rate+'%';
  document.getElementById('ring-title').textContent=habits.length?`${completed.length}/${habits.length} done`:'No habits';
  document.getElementById('ring-sub').textContent=rate===100?'Perfect day! 🎉':rate>0?`${habits.length-completed.length} remaining`:'';
  const list=document.getElementById('day-habits-list');
  if(!habits.length){list.innerHTML=`<div class="no-habits-msg"><span class="icon">🌱</span>Add habits to track your rituals.</div>`;return;}
  list.innerHTML=habits.map(h=>{const done=completed.includes(h.id);return`<div class="day-habit-item" onclick="toggleCompletion('${ds}','${h.id}')">
    <div class="habit-check${done?' checked':''}" style="${done?'':'border-color:'+h.color+'44'}"></div>
    <div class="day-habit-cat" style="background:${h.color}"></div>
    <div class="day-habit-name${done?' done':''}">${escHtml(h.title)}</div>
  </div>`;}).join('');
}

// PROGRESS
let chartTrend=null,chartCat=null;
function renderProgress(){
  const todayRate=getDayRate(todayStr()),weekRate=getWeekRate(),monthRate=getMonthRate(),bestStreak=getBestOverallStreak(),curStreak=getCurrentOverallStreak();
  document.getElementById('prog-today').textContent=todayRate+'%';document.getElementById('prog-week').textContent=weekRate+'%';
  document.getElementById('prog-month').textContent=monthRate+'%';document.getElementById('prog-streak').textContent=bestStreak;
  document.getElementById('prog-today-sub').textContent=`${getCompleted(todayStr()).filter(id=>state.habits.some(h=>h.id===id)).length}/${state.habits.length} habits`;
  document.getElementById('prog-streak-sub').textContent=curStreak>0?`Current: ${curStreak} days`:'Start today!';
  renderTrendChart();renderCategoryChart();renderHabitBars();renderAchievements();
}
function renderTrendChart(){
  const ctx=document.getElementById('chart-trend').getContext('2d');
  const labels=[],data=[];const today=new Date();
  for(let i=6;i>=0;i--){const dt=addDays(today,-i);labels.push(DAYS_SHORT[(dt.getDay()+6)%7]);data.push(getDayRate(dateStr(dt)));}
  if(chartTrend){chartTrend.destroy();chartTrend=null;}
  chartTrend=new Chart(ctx,{type:'line',data:{labels,datasets:[{label:'Completion %',data,fill:true,borderColor:'#D4A847',backgroundColor:'rgba(212,168,71,0.1)',pointBackgroundColor:'#D4A847',pointRadius:5,pointHoverRadius:7,tension:0.4}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'#1C1914',borderColor:'#2A2620',borderWidth:1,titleColor:'#F0EAD6',bodyColor:'#B5A98A',callbacks:{label:c=>`${c.raw}% completed`}}},
    scales:{x:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#7A7060',font:{size:11}}},y:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#7A7060',font:{size:11},callback:v=>v+'%'},min:0,max:100}}}});
}
function renderCategoryChart(){
  const ctx=document.getElementById('chart-category').getContext('2d');
  const cats={};state.habits.forEach(h=>{if(!cats[h.category])cats[h.category]={count:0,color:CAT_COLORS[h.category]||'#7C8CA8'};cats[h.category].count++;});
  if(chartCat){chartCat.destroy();chartCat=null;}
  const labels=Object.keys(cats).map(k=>k.charAt(0).toUpperCase()+k.slice(1));const data=Object.values(cats).map(v=>v.count);const colors=Object.values(cats).map(v=>v.color);
  if(!labels.length)return;
  chartCat=new Chart(ctx,{type:'doughnut',data:{labels,datasets:[{data,backgroundColor:colors,borderColor:'#141209',borderWidth:3,hoverOffset:8}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#B5A98A',font:{size:11},padding:12,boxWidth:10,borderRadius:5}},tooltip:{backgroundColor:'#1C1914',borderColor:'#2A2620',borderWidth:1,titleColor:'#F0EAD6',bodyColor:'#B5A98A'}}}});
}
function renderHabitBars(){
  const container=document.getElementById('habit-bars');
  if(!state.habits.length){container.innerHTML='<div style="color:var(--cream-dim);font-size:0.8rem;padding:20px 0">No habits added yet.</div>';return;}
  container.innerHTML=state.habits.map(h=>{const rate=getHabitMonthRate(h.id);return`<div class="habit-bar-row">
    <div class="habit-bar-label" title="${escHtml(h.title)}">${escHtml(h.title)}</div>
    <div class="habit-bar-track"><div class="habit-bar-fill" style="width:${rate}%;background:${h.color}"></div></div>
    <div class="habit-bar-pct">${rate}%</div>
  </div>`;}).join('');
}
function renderAchievements(){
  const bestStreak=getBestOverallStreak(),weekRate=getWeekRate(),monthRate=getMonthRate(),perfectDays=countPerfectDays(30);
  const badges=[
    {icon:'🔥',name:'7-Day Streak',desc:'Complete all habits 7 days in a row',earned:bestStreak>=7},
    {icon:'🏆',name:'30-Day Champion',desc:'Maintain 80%+ for a full month',earned:monthRate>=80},
    {icon:'⭐',name:'Perfect Week',desc:'100% completion for 7 days',earned:weekRate===100},
    {icon:'💎',name:'Consistency',desc:'5 perfect days this month',earned:perfectDays>=5},
    {icon:'🌅',name:'Good Habits',desc:'Track 3+ habits at once',earned:state.habits.length>=3},
    {icon:'👑',name:'Ritual Master',desc:'100% completion streak of 14 days',earned:bestStreak>=14},
  ];
  document.getElementById('achievements').innerHTML=badges.map(b=>`<div class="badge${b.earned?' earned':' locked'}">
    <div class="badge-icon">${b.icon}</div>
    <div class="badge-info"><div class="badge-name">${b.name}</div><div class="badge-desc">${b.desc}</div></div>
  </div>`).join('');
}

// REPORTS
function renderReports(){
  updatePeriodLabel();const{start,end}=getPeriodRange();const habits=state.habits;
  let totalDone=0,totalPossible=0;const habitRates={};habits.forEach(h=>habitRates[h.id]={done:0,total:0});
  let d=new Date(start);const endD=new Date(end);const today=new Date();today.setHours(23,59,59,999);
  while(d<=endD&&d<=today){const ds=dateStr(d);habits.forEach(h=>{if(!habitRates[h.id])habitRates[h.id]={done:0,total:0};habitRates[h.id].total++;totalPossible++;if((state.completions[ds]||[]).includes(h.id)){habitRates[h.id].done++;totalDone++;}});d=addDays(d,1);}
  const overall=pct(totalDone,totalPossible);document.getElementById('rep-overall').textContent=overall+'%';
  const rates=habits.map(h=>({h,r:pct(habitRates[h.id]?.done||0,habitRates[h.id]?.total||0)})).sort((a,b)=>b.r-a.r);
  if(rates.length){document.getElementById('rep-best').textContent=rates[0].h.title;document.getElementById('rep-best-pct').textContent=rates[0].r+'% completion';document.getElementById('rep-worst').textContent=rates[rates.length-1].h.title;document.getElementById('rep-worst-pct').textContent=rates[rates.length-1].r+'% completion';}
  state.reportType==='weekly'?renderWeeklyTable(start,end,habitRates):renderMonthlyTable(start,end,habitRates);
}
function getPeriodRange(){
  const today=new Date();today.setHours(0,0,0,0);
  if(state.reportType==='weekly'){const dow=(today.getDay()+6)%7;const ws=addDays(today,-dow+state.reportOffset*7);return{start:ws,end:addDays(ws,6)};}
  else{const m=new Date(today.getFullYear(),today.getMonth()+state.reportOffset,1);return{start:m,end:new Date(m.getFullYear(),m.getMonth()+1,0)};}
}
function updatePeriodLabel(){
  const{start,end}=getPeriodRange();const opts={month:'short',day:'numeric'};
  document.getElementById('period-label').textContent=state.reportType==='weekly'?start.toLocaleDateString('en-US',opts)+' – '+end.toLocaleDateString('en-US',opts):MONTHS[start.getMonth()]+' '+start.getFullYear();
}
function renderWeeklyTable(start,end,habitRates){
  const table=document.getElementById('report-table');const habits=state.habits;
  const days=[];let d=new Date(start);while(d<=end){days.push(new Date(d));d=addDays(d,1);}
  const today=new Date();today.setHours(23,59,59,999);
  let html=`<thead><tr><th>Habit</th>${days.map(d=>`<th>${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][(d.getDay()+6)%7]}<br><span style="font-weight:400;opacity:0.6;font-size:0.65rem">${d.getDate()}</span></th>`).join('')}<th>Total</th></tr></thead><tbody>`;
  if(!habits.length)html+=`<tr><td colspan="${days.length+2}" style="text-align:center;padding:30px;color:var(--cream-dim)">No habits added yet.</td></tr>`;
  else{
    habits.forEach(h=>{
      const cells=days.map(day=>{if(day>today)return`<td style="color:var(--cream-dim);text-align:center">—</td>`;const done=(state.completions[dateStr(day)]||[]).includes(h.id);return`<td style="text-align:center"><span style="color:${done?'var(--green)':'var(--red)'};font-size:1rem">${done?'✓':'·'}</span></td>`;}).join('');
      const r=pct(habitRates[h.id]?.done||0,habitRates[h.id]?.total||0);
      html+=`<tr><td><div style="display:flex;align-items:center;gap:8px"><div style="width:8px;height:8px;border-radius:50%;background:${h.color};flex-shrink:0"></div>${escHtml(h.title)}</div></td>${cells}<td class="pct-cell"><div class="pct-bg" style="width:${r}%;background:${h.color}"></div><span class="pct-val" style="color:${r>=70?'var(--green)':r>=40?'var(--gold)':'var(--red)'}">${r}%</span></td></tr>`;
    });
    const tp=Object.values(habitRates).reduce((a,v)=>a+v.total,0),td=Object.values(habitRates).reduce((a,v)=>a+v.done,0),tr=pct(td,tp);
    const totalCells=days.map(day=>{if(day>today)return`<td></td>`;const r=getDayRateForHabits(dateStr(day),habits);return`<td style="text-align:center;font-family:'JetBrains Mono','SF Mono','Courier New',monospace;font-size:0.72rem;color:var(--gold)">${r}%</td>`;}).join('');
    html+=`<tr class="total-row"><td><strong>Overall</strong></td>${totalCells}<td>${tr}%</td></tr>`;
  }
  table.innerHTML=html+'</tbody>';
}
function renderMonthlyTable(start,end,habitRates){
  const table=document.getElementById('report-table');const habits=state.habits;
  let html=`<thead><tr><th>Habit</th><th>Completed</th><th>Total Days</th><th>Rate</th></tr></thead><tbody>`;
  if(!habits.length)html+=`<tr><td colspan="4" style="text-align:center;padding:30px;color:var(--cream-dim)">No habits added yet.</td></tr>`;
  else{
    habits.forEach(h=>{const done=habitRates[h.id]?.done||0,total=habitRates[h.id]?.total||0,r=pct(done,total);
      html+=`<tr><td><div style="display:flex;align-items:center;gap:8px"><div style="width:8px;height:8px;border-radius:50%;background:${h.color};flex-shrink:0"></div>${escHtml(h.title)}</div></td><td>${done}</td><td>${total}</td><td class="pct-cell"><div class="pct-bg" style="width:${r}%;background:${h.color}"></div><span class="pct-val" style="color:${r>=70?'var(--green)':r>=40?'var(--gold)':'var(--red)'}">${r}%</span></td></tr>`;});
    const tp=Object.values(habitRates).reduce((a,v)=>a+v.total,0),td=Object.values(habitRates).reduce((a,v)=>a+v.done,0),tr=pct(td,tp);
    html+=`<tr class="total-row"><td><strong>Overall</strong></td><td>${td}</td><td>${tp}</td><td>${tr}%</td></tr>`;
  }
  table.innerHTML=html+'</tbody>';
}
function getDayRateForHabits(ds,habits){if(!habits.length)return 0;return pct(habits.filter(h=>(state.completions[ds]||[]).includes(h.id)).length,habits.length)}

// MODAL
function buildColorRow(){document.getElementById('color-row').innerHTML=PALETTE.map(c=>`<div class="color-opt${state.selectedColor===c?' selected':''}" style="background:${c}" onclick="selectColor('${c}')"></div>`).join('');}
function selectColor(c){state.selectedColor=c;document.querySelectorAll('.color-opt').forEach(el=>el.classList.toggle('selected',el.style.background===c||el.style.backgroundColor===c));}
function openModal(habitId=null){
  state.editingId=habitId;const del=document.getElementById('btn-delete-habit');
  if(habitId){const h=state.habits.find(x=>x.id===habitId);if(!h)return;
    document.getElementById('f-title').value=h.title;document.getElementById('f-desc').value=h.desc||'';document.getElementById('f-cat').value=h.category;state.selectedColor=h.color;
    document.getElementById('modal-title-text').textContent='Edit Habit';document.getElementById('modal-icon').textContent='✎';del.style.display='block';
  }else{
    document.getElementById('f-title').value='';document.getElementById('f-desc').value='';document.getElementById('f-cat').value='health';state.selectedColor=PALETTE[state.habits.length%PALETTE.length];
    document.getElementById('modal-title-text').textContent='New Habit';document.getElementById('modal-icon').textContent='✦';del.style.display='none';
  }
  buildColorRow();document.getElementById('modal-overlay').classList.add('open');setTimeout(()=>document.getElementById('f-title').focus(),100);
}
function closeModal(){document.getElementById('modal-overlay').classList.remove('open');state.editingId=null;}
function closeModalOutside(e){if(e.target===document.getElementById('modal-overlay'))closeModal();}
function saveHabit(){
  const title=document.getElementById('f-title').value.trim();if(!title){showToast('Please enter a habit title','error');return;}
  const data={title,desc:document.getElementById('f-desc').value.trim(),category:document.getElementById('f-cat').value,color:state.selectedColor};
  if(state.editingId){updateHabit(state.editingId,data);showToast('Habit updated ✓','success');}else{addHabit(data);showToast('Habit added ✓','success');}
  closeModal();
}
function deleteCurrentHabit(){if(state.editingId&&confirm('Delete this habit? All completion data will be lost.')){deleteHabit(state.editingId);closeModal();showToast('Habit deleted');}}

// NAV
function switchView(view,btn){
  state.activeView=view;
  document.querySelectorAll('.nav-tab').forEach(el=>el.classList.toggle('active',el.dataset.view===view));
  document.querySelectorAll('.view').forEach(el=>el.classList.toggle('active',el.id==='view-'+view));
  if(view==='progress')renderProgress();if(view==='reports')renderReports();
}
function switchReport(type,btn){state.reportType=type;state.reportOffset=0;document.querySelectorAll('.report-tab').forEach(el=>el.classList.toggle('active',el.dataset.rtype===type));renderReports();}
function changePeriod(dir){state.reportOffset+=dir;renderReports();}
function changeMonth(dir){state.currentMonth=new Date(state.currentMonth.getFullYear(),state.currentMonth.getMonth()+dir,1);renderCalendar();}
function goToday(){state.currentMonth=new Date();state.selectedDate=todayStr();renderCalendar();renderDayDetail();}
function selectDate(ds){
  state.selectedDate=ds;
  renderCalendarGrid();
  renderDayDetail();
  // open bottom sheet on mobile
  const dd=document.getElementById('view-calendar').querySelector('.day-detail');
  if(window.innerWidth<=900) dd.classList.add('open');
}
function toggleSidebar(){
  const sb=document.getElementById('sidebar');
  const ov=document.getElementById('sb-overlay');
  const btn=document.getElementById('burger-btn');
  sb.classList.toggle('open');
  ov.classList.toggle('open');
  if(btn) btn.classList.toggle('open', sb.classList.contains('open'));
}
function closeDayDetail(){
  document.getElementById('view-calendar').querySelector('.day-detail').classList.remove('open');
}

document.getElementById('cat-chips').addEventListener('click',e=>{
  const chip=e.target.closest('.cat-chip');if(!chip)return;
  document.querySelectorAll('.cat-chip').forEach(c=>c.classList.remove('active'));chip.classList.add('active');
  state.categoryFilter=chip.dataset.cat;renderSidebar();renderCalendarGrid();renderDayDetail();
});

function exportCSV(){
  const{start,end}=getPeriodRange();const habits=state.habits;
  if(!habits.length){showToast('No habits to export','error');return;}
  const rows=[['Date',...habits.map(h=>h.title),'Total %']];
  let d=new Date(start);const today=new Date();today.setHours(23,59,59,999);
  while(d<=end&&d<=today){
    const ds=dateStr(d);
    const comp=state.completions[ds]||[];
    const done=habits.map(h=>comp.includes(h.id)?1:0);
    rows.push([ds,...done,pct(done.reduce((a,b)=>a+b,0),habits.length)+'%']);
    d=addDays(d,1);
  }
  const csv='\uFEFF'+rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');
  try{
    // Try Blob download first
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=`ritual-${dateStr(start)}.csv`;
    document.body.appendChild(a);a.click();
    setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(url);},200);
    showToast('CSV downloaded ✓','success');
  } catch(e){
    // Fallback: open in new tab as data URI
    const dataUri='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
    const w=window.open(dataUri,'_blank');
    if(!w){
      // Last resort: show in a modal the user can copy
      showCSVModal(csv);
    } else {
      showToast('CSV opened in new tab — save with Ctrl+S','success');
    }
  }
}
function showCSVModal(csv){
  const existing=document.getElementById('csv-modal');
  if(existing)existing.remove();
  const div=document.createElement('div');
  div.id='csv-modal';
  div.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px';
  div.innerHTML=`<div style="background:#1C1914;border:1px solid #333028;border-radius:14px;padding:24px;width:100%;max-width:600px;max-height:80vh;display:flex;flex-direction:column;gap:14px">
    <div style="display:flex;align-items:center;justify-content:space-between">
      <span style="font-weight:600;color:#F0EAD6;font-size:0.95rem">📄 CSV Data — Select All &amp; Copy</span>
      <button onclick="document.getElementById('csv-modal').remove()" style="color:#7A7060;font-size:18px;cursor:pointer;background:none;border:none">✕</button>
    </div>
    <textarea readonly style="flex:1;min-height:300px;background:#0D0C09;border:1px solid #2A2620;border-radius:8px;padding:12px;color:#B5A98A;font-family:monospace;font-size:0.75rem;resize:none;outline:none" onclick="this.select()">${csv.replace(/</g,'&lt;')}</textarea>
    <button onclick="navigator.clipboard&&navigator.clipboard.writeText(document.querySelector('#csv-modal textarea').value).then(()=>showToast('Copied!','success'))" style="padding:10px;border-radius:8px;background:linear-gradient(135deg,#D4A847,#E07B39);color:#0D0C09;font-weight:600;cursor:pointer;border:none;font-size:0.85rem">Copy to Clipboard</button>
  </div>`;
  document.body.appendChild(div);
}

let toastTimer=null;
function showToast(msg,type=''){
  const el=document.getElementById('toast');el.textContent=msg;el.className='toast'+(type?' '+type:'');
  requestAnimationFrame(()=>el.classList.add('show'));clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2500);
}

function renderAll(){renderSidebar();renderCalendar();renderDayDetail();if(state.activeView==='progress')renderProgress();if(state.activeView==='reports')renderReports();}
function updateTopDate(){document.getElementById('top-date').textContent=new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});}
document.addEventListener('keydown',e=>{
  if(e.key==='Escape')closeModal();
  if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();openModal();}
  if(e.key==='Enter'&&document.getElementById('modal-overlay').classList.contains('open')&&e.target.tagName!=='TEXTAREA')saveHabit();
});
load();updateTopDate();renderAll();setInterval(updateTopDate,60000);
