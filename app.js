const $=id=>document.getElementById(id);
const pad=n=>String(n).padStart(2,"0");
const fmt=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const jpDate=d=>`${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
let events=JSON.parse(localStorage.getItem("easyCalendarEvents")||"[]");
let view=new Date(); view.setDate(1);
let selected=new Date(); selected.setHours(0,0,0,0);

function save(){localStorage.setItem("easyCalendarEvents",JSON.stringify(events));}
function render(){
  const now=new Date();
  $("todayText").textContent=`今日は ${jpDate(now)}（${"日月火水木金土"[now.getDay()]}）`;
  $("monthTitle").textContent=`${view.getFullYear()}年${view.getMonth()+1}月`;
  const first=new Date(view.getFullYear(),view.getMonth(),1), start=first.getDay();
  const last=new Date(view.getFullYear(),view.getMonth()+1,0).getDate();
  const prevLast=new Date(view.getFullYear(),view.getMonth(),0).getDate();
  const cal=$("calendar"); cal.innerHTML="";
  for(let i=0;i<42;i++){
    let day=i-start+1, d, muted=false;
    if(day<1){d=new Date(view.getFullYear(),view.getMonth()-1,prevLast+day);muted=true}
    else if(day>last){d=new Date(view.getFullYear(),view.getMonth()+1,day-last);muted=true}
    else d=new Date(view.getFullYear(),view.getMonth(),day);
    const ds=fmt(d), el=document.createElement("button");
    el.className=`day ${muted?"muted":""} ${ds===fmt(selected)?"selected":""} ${ds===fmt(now)?"today":""}`;
    const count=events.filter(e=>e.date===ds).length;
    el.innerHTML=`<span class="num">${d.getDate()}</span>${count?`<span class="dot"></span>`:""}`;
    el.onclick=()=>{selected=new Date(d);render();};
    cal.appendChild(el);
  }
  renderEvents();
}
function renderEvents(){
  $("selectedTitle").textContent=jpDate(selected)+"（"+ "日月火水木金土"[selected.getDay()] +"）";
  const list=$("eventList"), ds=fmt(selected);
  const es=events.filter(e=>e.date===ds).sort((a,b)=>(a.time||"99:99").localeCompare(b.time||"99:99"));
  if(!es.length){list.innerHTML='<div class="empty">この日の予定はありません</div>';return}
  list.innerHTML=es.map(e=>`<div class="event"><div><strong>${escapeHtml(e.title)}</strong><small>${e.time||"時間未設定"}${e.note?"　・ "+escapeHtml(e.note):""}</small></div><button onclick="editEvent('${e.id}')">編集</button></div>`).join("");
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function openDialog(e=null){
  $("dialogTitle").textContent=e?"予定を編集":"予定を追加";
  $("eventId").value=e?.id||"";
  $("eventDate").value=e?.date||fmt(selected);
  $("eventTime").value=e?.time||"";
  $("eventTitle").value=e?.title||"";
  $("eventNote").value=e?.note||"";
  $("deleteEvent").style.display=e?"block":"none";
  $("eventDialog").showModal();
}
window.editEvent=id=>openDialog(events.find(e=>e.id===id));
$("addBtn").onclick=()=>openDialog();
$("eventForm").onsubmit=ev=>{
 ev.preventDefault();
 const id=$("eventId").value;
 const data={id:id||crypto.randomUUID(),date:$("eventDate").value,time:$("eventTime").value,title:$("eventTitle").value.trim(),note:$("eventNote").value.trim()};
 if(!data.title)return;
 if(id)events=events.map(e=>e.id===id?data:e);else events.push(data);
 selected=new Date(data.date+"T00:00:00"); view=new Date(selected.getFullYear(),selected.getMonth(),1);
 save(); $("eventDialog").close(); render();
};
$("deleteEvent").onclick=()=>{
 const id=$("eventId").value;if(id&&confirm("この予定を削除しますか？")){events=events.filter(e=>e.id!==id);save();$("eventDialog").close();render();}
};
$("prevMonth").onclick=()=>{view.setMonth(view.getMonth()-1);render()};
$("nextMonth").onclick=()=>{view.setMonth(view.getMonth()+1);render()};
$("todayBtn").onclick=()=>{const n=new Date();selected=new Date(n.getFullYear(),n.getMonth(),n.getDate());view=new Date(n.getFullYear(),n.getMonth(),1);render()};
$("clearBtn").onclick=()=>{if(confirm("保存した予定をすべて削除しますか？")){events=[];save();render()}};

function parseQuick(text){
 text=text.trim(); if(!text)return null;
 const now=new Date(); let d=new Date(selected);
 let dateMatch=text.match(/(\d{1,2})月(\d{1,2})日/);
 if(dateMatch){d=new Date(now.getFullYear(),+dateMatch[1]-1,+dateMatch[2])}
 else if(/明後日/.test(text)){d=new Date(now);d.setDate(d.getDate()+2)}
 else if(/明日/.test(text)){d=new Date(now);d.setDate(d.getDate()+1)}
 else if(/今日/.test(text)){d=new Date(now)}
 const time=text.match(/(?:午前|午後)?\s*(\d{1,2})(?:時|:)(?:(\d{1,2})分)?/);
 let hour=time?+time[1]:null, min=time&&time[2]?+time[2]:0;
 if(time && /午後/.test(time[0]) && hour<12)hour+=12;
 const cleaned=text
   .replace(/(明後日|明日|今日)/g,"")
   .replace(/\d{1,2}月\d{1,2}日/g,"")
   .replace(/(?:午前|午後)?\s*\d{1,2}(?:時|:)(?:(?:\d{1,2})分)?/g,"")
   .replace(/(に|の|へ|を|予定|追加)/g," ")
   .trim();
 if(!cleaned)return null;
 return {date:fmt(d),time:hour==null?"":`${pad(hour)}:${pad(min)}`,title:cleaned};
}
$("quickAdd").onclick=()=>quickAdd();
$("quickInput").addEventListener("keydown",e=>{if(e.key==="Enter")quickAdd()});
function quickAdd(){
 const p=parseQuick($("quickInput").value);
 if(!p){$("voiceStatus").textContent="「明日の15時に数学」のように入力してください";return}
 events.push({id:crypto.randomUUID(),...p,note:""});save();
 selected=new Date(p.date+"T00:00:00");view=new Date(selected.getFullYear(),selected.getMonth(),1);
 $("quickInput").value="";$("voiceStatus").textContent="予定を追加しました。";render();
}
const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
let rec=null;
if(SpeechRecognition){
 rec=new SpeechRecognition();rec.lang="ja-JP";rec.interimResults=false;
 rec.onstart=()=>{$("voiceStatus").textContent="聞いています…話してください。";$("micBtn").textContent="🔴"};
 rec.onresult=e=>{$("quickInput").value=e.results[0][0].transcript;quickAdd()};
 rec.onerror=()=>{$("voiceStatus").textContent="音声入力を開始できませんでした。マイクの許可を確認してください。"};
 rec.onend=()=>{$("micBtn").textContent="🎤"};
}
function startVoice(){if(!rec){$("voiceStatus").textContent="このブラウザは音声入力に対応していません。キーボード入力を使ってください。";return}rec.start()}
$("micBtn").onclick=startVoice;$("voiceHelp").onclick=()=>alert("「明日の15時に数学」「9月20日 10時 部活」のように話すと予定を追加できます。音声入力は対応ブラウザでマイク許可が必要です。");
if("serviceWorker" in navigator && location.protocol!=="file:") navigator.serviceWorker.register("sw.js").catch(()=>{});
render();
