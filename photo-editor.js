(()=>{
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const c=$("#canvas"), x=c.getContext("2d",{willReadFrequently:true}), file=$("#file"), stage=$("#stage"), empty=$("#empty"), toast=$("#toast");
let img=null, zoom=1, ratio="free", drawMode=null, history=[], hi=-1, draggingText=null, pointerDown=false, activeStickerTab="emoji";
let state={brightness:0,contrast:0,saturation:0,temperature:0,tint:0,fade:0,sharpness:0,opacity:100,vignette:0,glow:0,grain:0,blur:0,edge:0,filter:"none",rot:0,fh:1,fv:1,draw:[],texts:[],stickers:[],frame:"none",frameSize:0,background:"none"};

const defaults=()=>({brightness:0,contrast:0,saturation:0,temperature:0,tint:0,fade:0,sharpness:0,opacity:100,vignette:0,glow:0,grain:0,blur:0,edge:0,filter:"none",rot:0,fh:1,fv:1,draw:[],texts:[],stickers:[],frame:"none",frameSize:0,background:"none"});
const defs=["brightness","contrast","saturation","temperature","tint","fade","sharpness","opacity"];
const effects=["vignette","glow","grain"];
const lightDefs=[["brightness","☀️ السطوع",-100,100],["contrast","◐ التباين",-100,100],["saturation","🎨 التشبع",-100,100],["temperature","🌡️ الحرارة",-100,100],["tint","🟣 الصبغة",-100,100],["fade","🌫️ الباهت",-100,100],["sharpness","🔍 الحدة",-100,100],["opacity","💧 العتامة",10,100]];
const effectDefs=[["vignette","🌑 تظليل الأطراف",0,100],["glow","🌟 توهج",0,100],["grain","📼 حبيبات",0,100]];
const extraLight=[["exposure","☀️ Exposure",-100,100],["highlights","✨ Highlights",-100,100],["shadows","🌘 Shadows",-100,100],["clarity","◆ Clarity",-100,100]];
state.exposure=0;state.highlights=0;state.shadows=0;state.clarity=0;

function note(m){toast.textContent=m;toast.classList.add("show");clearTimeout(note.t);note.t=setTimeout(()=>toast.classList.remove("show"),1800)}
function hasImage(){if(!img){note("ارفع صورة أولًا");return false}return true}
function snap(){return{state:JSON.parse(JSON.stringify(state)),src:c.toDataURL("image/png"),w:c.width,h:c.height}}
function save(){history=history.slice(0,hi+1);history.push(snap());if(history.length>35)history.shift();hi=history.length-1;buttons()}
function buttons(){$("#undo").disabled=hi<=0;$("#redo").disabled=hi>=history.length-1}
function restore(s){const q=new Image();q.onload=()=>{state=JSON.parse(JSON.stringify(s.state));c.width=s.w;c.height=s.h;x.clearRect(0,0,c.width,c.height);x.drawImage(q,0,0);sync();render();fit();};q.src=s.src}
function sync(){
  [...defs,...effects,...extraLight.map(a=>a[0])].forEach(k=>{const e=$("#"+k),v=$("#"+k+"V");if(e)e.value=state[k]??0;if(v)v.textContent=state[k]??0});
  $("#blur").value=state.blur;$("#blurV").textContent=state.blur;$("#edge").value=state.edge;$("#edgeV").textContent=state.edge;
  $("#frame").value=state.frameSize;$("#frameV").textContent=state.frameSize;
}
function fit(){if(!img)return;const r=stage.getBoundingClientRect();zoom=Math.min((r.width-40)/c.width,(r.height-40)/c.height,1);applyZoom()}
function applyZoom(){c.style.width=Math.max(1,c.width*zoom)+"px";c.style.height=Math.max(1,c.height*zoom)+"px";$("#zoom").textContent=Math.round(zoom*100)+"%"}
function load(f){if(!f?.type?.startsWith("image/"))return note("اختر صورة صالحة");const u=URL.createObjectURL(f),q=new Image();q.onload=()=>{img=q;c.width=q.naturalWidth;c.height=q.naturalHeight;state=defaults();state.exposure=state.highlights=state.shadows=state.clarity=0;empty.hidden=true;c.hidden=false;$("#info").textContent=`${q.naturalWidth} × ${q.naturalHeight}px`;$("#sizeInfo").textContent=`${q.naturalWidth} × ${q.naturalHeight}px`;history=[];hi=-1;x.clearRect(0,0,c.width,c.height);render();save();fit();sync();note("تم تحميل الصورة");URL.revokeObjectURL(u)};q.src=u}
$("#pick").onclick=$("#upload").onclick=()=>file.click();file.onchange=e=>load(e.target.files[0]);

const toolNames={adjust:"الضبط",filters:"الفلاتر",transform:"القص والتحويل",text:"النصوص والعناوين",stickers:"الملصقات والإيموجي",draw:"الرسم",effects:"التأثيرات",light:"الإضاءة واللون",blur:"التمويه والتركيز",frame:"الإطار",background:"الخلفية",resize:"المقاس والتصدير"};
function openTool(name){const sheet=$("#toolSheet"),current=sheet.dataset.tool;if(current===name&&sheet.classList.contains("open"))return closeTool();sheet.dataset.tool=name;$("#sheetTitle").textContent=toolNames[name]||"أدوات";$$(".panel").forEach(p=>p.classList.remove("active"));$("#p-"+name)?.classList.add("active");$$(".tool").forEach(b=>b.classList.toggle("active",b.dataset.tool===name));sheet.classList.add("open");$("#backdrop").classList.add("open");sheet.setAttribute("aria-hidden","false");if(name==="stickers")renderStickers(activeStickerTab)}
function closeTool(){$("#toolSheet").classList.remove("open");$("#backdrop").classList.remove("open");$("#toolSheet").setAttribute("aria-hidden","true");$$(".tool").forEach(b=>b.classList.remove("active"));drawMode=null;$$("[data-draw]").forEach(b=>b.classList.remove("active"))}
$$(".tool").forEach(b=>b.onclick=()=>openTool(b.dataset.tool));$("#closeSheet").onclick=closeTool;$("#backdrop").onclick=closeTool;
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeTool()});

function makeRange(target,arr){target.innerHTML=arr.map(([k,label,min,max])=>`<label class="range-row">${label}<b id="${k}V">${state[k]??0}</b><input id="${k}" type="range" min="${min}" max="${max}" value="${state[k]??0}"></label>`).join("")}
makeRange($("#adjusts"),lightDefs);makeRange($("#effects"),effectDefs);makeRange($("#lightControls"),extraLight);
[...defs,...effects,...extraLight.map(a=>a[0])].forEach(k=>{const e=$("#"+k);if(!e)return;e.oninput=()=>{state[k]=+e.value;$("#"+k+"V").textContent=e.value;render()};e.onchange=save});

const filterList=[["none","أصلي","none"],["mono","Mono","grayscale(1)"],["warm","Warm","sepia(.35) saturate(1.3)"],["cool","Cool","hue-rotate(35deg) saturate(1.1)"],["vintage","Vintage","sepia(.45) contrast(.9)"],["dramatic","Dramatic","contrast(1.35) saturate(1.15)"],["fade","Fade","contrast(.82) saturate(.75)"],["invert","Invert","invert(1)"],["noir","Noir","grayscale(1) contrast(1.5)"],["dream","Dream","brightness(1.08) saturate(.78)"],["neon","Neon","saturate(1.7) contrast(1.15)"],["gold","Gold","sepia(.28) saturate(1.35)"],["ice","Ice","hue-rotate(160deg) saturate(.85)"],["matte","Matte","contrast(.9) saturate(.82)"],["pop","Pop","contrast(1.18) saturate(1.3)"],["film","Film","contrast(1.05) sepia(.12)"]];
$("#filters").innerHTML=filterList.map(a=>`<button data-filter="${a[0]}"><i style="filter:${a[2]}"></i><span>${a[1]}</span></button>`).join("");
$$("[data-filter]").forEach(b=>b.onclick=()=>{if(!hasImage())return;state.filter=b.dataset.filter;$$("[data-filter]").forEach(z=>z.classList.remove("active"));b.classList.add("active");render();save();note("تم تطبيق الفلتر")});

const ratios=["free","1:1","4:5","3:4","9:16","16:9","3:2","2:3"];
$("#ratios").innerHTML=ratios.map(r=>`<button data-ratio="${r}" class="${r==="free"?"active":""}">${r==="free"?"حر":r}</button>`).join("");
$$("[data-ratio]").forEach(b=>b.onclick=()=>{$$("[data-ratio]").forEach(z=>z.classList.remove("active"));b.classList.add("active");ratio=b.dataset.ratio});

$$("[data-act]").forEach(b=>b.onclick=()=>{if(!hasImage())return;const a=b.dataset.act;if(a==="rl")state.rot-=90;if(a==="rr")state.rot+=90;if(a==="fh")state.fh*=-1;if(a==="fv")state.fv*=-1;render();save();fit()});

function canvasImage(src,w,h){return new Promise(resolve=>{const q=new Image();q.onload=()=>resolve(q);q.src=src})}
async function replaceFromCanvas(t){const src=t.toDataURL("image/png"),q=await canvasImage(src,t.width,t.height);img=q;c.width=t.width;c.height=t.height;x.clearRect(0,0,c.width,c.height);x.drawImage(q,0,0);state.rot=0;render();save();fit()}
$("#crop").onclick=async()=>{if(!hasImage()||ratio==="free")return note("اختر نسبة قص أولًا");let [rw,rh]=ratio.split(":").map(Number),cur=c.width/c.height,target=rw/rh,sw=c.width,sh=c.height;if(cur>target)sw=Math.round(c.height*target);else sh=Math.round(c.width/target);const sx=Math.round((c.width-sw)/2),sy=Math.round((c.height-sh)/2),t=document.createElement("canvas");t.width=sw;t.height=sh;t.getContext("2d").drawImage(c,sx,sy,sw,sh,0,0,sw,sh);await replaceFromCanvas(t);note("تم القص")};
$("#resize").onclick=async()=>{if(!hasImage())return;let w=+$("#width").value,h=+$("#height").value;if(!w||!h)return note("أدخل العرض والارتفاع");const t=document.createElement("canvas");t.width=w;t.height=h;t.getContext("2d").drawImage(c,0,0,w,h);await replaceFromCanvas(t);note("تم تغيير الحجم")};
$$("[data-size]").forEach(b=>b.onclick=()=>{const [w,h]=b.dataset.size.split("x");$("#width").value=w;$("#height").value=h;note(`تم اختيار ${w} × ${h}`)});

function baseFilter(){let b=100+(state.brightness+state.exposure*.55+state.shadows*.18),co=100+(state.contrast+state.clarity*.45+state.highlights*.15),sa=100+state.saturation;let e="";switch(state.filter){case"mono":e+=" grayscale(1)";break;case"warm":e+=" sepia(.35) saturate(1.3)";break;case"cool":e+=" hue-rotate(35deg) saturate(1.1)";break;case"vintage":e+=" sepia(.45) contrast(.9)";break;case"dramatic":e+=" contrast(1.35) saturate(1.15)";break;case"fade":e+=" contrast(.82) saturate(.75)";break;case"invert":e+=" invert(1)";break;case"noir":e+=" grayscale(1) contrast(1.5)";break;case"dream":e+=" brightness(1.08) saturate(.78)";break;case"neon":e+=" saturate(1.7) contrast(1.15)";break;case"gold":e+=" sepia(.28) saturate(1.35)";break;case"ice":e+=" hue-rotate(160deg) saturate(.85)";break;case"matte":e+=" contrast(.9) saturate(.82)";break;case"pop":e+=" contrast(1.18) saturate(1.3)";break;case"film":e+=" contrast(1.05) sepia(.12)";break}return`brightness(${Math.max(0,b)}%) contrast(${Math.max(0,co)}%) saturate(${Math.max(0,sa)}%) hue-rotate(${state.tint/5}deg) opacity(${state.opacity}%)${e} blur(${state.blur/2}px)`}
function drawLayer(){state.draw.forEach(p=>{x.save();x.globalAlpha=p.o;x.globalCompositeOperation=p.m==="eraser"?"destination-out":"source-over";x.strokeStyle=p.c;x.lineWidth=p.s;x.lineCap="round";x.lineJoin="round";if(p.m==="marker")x.globalAlpha*=.25;x.beginPath();p.a.forEach((q,i)=>i?x.lineTo(q.x,q.y):x.moveTo(q.x,q.y));x.stroke();x.restore()})}
function textLayer(){state.texts.forEach(t=>{x.save();x.translate(t.x,t.y);x.rotate((t.r||0)*Math.PI/180);x.textAlign="center";x.textBaseline="middle";x.font=`${t.i?"italic ":""}${t.b?"bold ":""}${t.s}px ${t.f}`;if(t.shadow){x.shadowColor="#000b";x.shadowBlur=t.shadowBlur||10;x.shadowOffsetY=3}if(t.stroke>0){x.lineWidth=t.stroke;x.strokeStyle=t.sc||"#000";x.strokeText(t.t,0,0)}x.fillStyle=t.c;x.fillText(t.t,0,0);x.restore()})}
function stickerLayer(){state.stickers.forEach(s=>{x.save();x.translate(s.x,s.y);x.rotate((s.r||0)*Math.PI/180);x.globalAlpha=s.o??1;x.font=`${s.s}px Arial`;x.textAlign="center";x.textBaseline="middle";x.fillText(s.t,0,0);x.restore()})}
function render(){
 if(!img)return;x.clearRect(0,0,c.width,c.height);
 if(state.background!=="none"){x.save();if(state.background==="black")x.fillStyle="#050505";else if(state.background==="white")x.fillStyle="#fff";else if(state.background==="gradient"){let g=x.createLinearGradient(0,0,c.width,c.height);g.addColorStop(0,"#6d5dfc");g.addColorStop(1,"#e85cf7");x.fillStyle=g}else if(state.background==="grid"){x.fillStyle="#151822";x.fillRect(0,0,c.width,c.height);x.strokeStyle="#ffffff18";for(let i=0;i<c.width;i+=50){x.beginPath();x.moveTo(i,0);x.lineTo(i,c.height);x.stroke()}for(let j=0;j<c.height;j+=50){x.beginPath();x.moveTo(0,j);x.lineTo(c.width,j);x.stroke()}}else if(state.background==="dots"){x.fillStyle="#12151c";x.fillRect(0,0,c.width,c.height);x.fillStyle="#ffffff20";for(let i=10;i<c.width;i+=28)for(let j=10;j<c.height;j+=28)x.fillRect(i,j,2,2)}x.restore()}
 x.save();x.translate(c.width/2,c.height/2);x.scale(state.fh,state.fv);x.rotate(state.rot*Math.PI/180);x.filter=baseFilter();x.drawImage(img,-img.naturalWidth/2,-img.naturalHeight/2);x.restore();
 if(state.temperature){x.save();x.globalAlpha=Math.abs(state.temperature)/800;x.fillStyle=state.temperature>0?"#ff8a45":"#48aaff";x.fillRect(0,0,c.width,c.height);x.restore()}
 if(state.vignette){let g=x.createRadialGradient(c.width/2,c.height/2,Math.min(c.width,c.height)*.15,c.width/2,c.height/2,Math.max(c.width,c.height)*.72);g.addColorStop(0,"transparent");g.addColorStop(1,`rgba(0,0,0,${state.vignette/110})`);x.fillStyle=g;x.fillRect(0,0,c.width,c.height)}
 if(state.glow){x.save();x.globalAlpha=state.glow/280;x.filter=`blur(${state.glow/9}px)`;x.drawImage(c,0,0);x.restore()}
 if(state.edge){x.save();x.globalAlpha=state.edge/500;x.strokeStyle="#fff";x.lineWidth=state.edge/5;x.strokeRect(0,0,c.width,c.height);x.restore()}
 if(state.grain){x.save();x.globalAlpha=state.grain/650;for(let i=0;i<Math.min(9000,c.width*c.height/2);i++){x.fillStyle=Math.random()>.5?"#fff":"#000";x.fillRect(Math.random()*c.width,Math.random()*c.height,1,1)}x.restore()}
 drawLayer();textLayer();stickerLayer();renderFrame();
}
function renderFrame(){if(state.frame==="none"||state.frameSize<=0)return;const s=state.frameSize;x.save();x.lineWidth=s;if(state.frame==="white")x.strokeStyle="#fff";else if(state.frame==="black")x.strokeStyle="#000";else if(state.frame==="neon")x.strokeStyle="#a855f7";else if(state.frame==="gradient"){let g=x.createLinearGradient(0,0,c.width,c.height);g.addColorStop(0,"#7658ff");g.addColorStop(1,"#f35cf5");x.strokeStyle=g}else x.strokeStyle="#f7f3e8";x.strokeRect(s/2,s/2,c.width-s,c.height-s);if(state.frame==="polaroid"){x.fillStyle="#fff";x.fillRect(0,c.height-s*2,c.width,s*2)}x.restore()}

const templates=[["BIG TITLE","BIG TITLE"],["NEW DROP","NEW DROP"],["GOOD VIBES","GOOD VIBES"],["DREAM","DREAM"],["EXPLORE","EXPLORE"],["MOMENTS","MOMENTS"],["NO SIGNAL","NO SIGNAL"],["HELLO WORLD","HELLO WORLD"]];
function templateButton(t){const b=document.createElement("button");b.innerHTML=`${t[0]}<small>إضافة</small>`;b.onclick=()=>addText(t[1]);return b}
$("#textTemplates").append(...templates.slice(0,4).map(templateButton));$("#textTemplates2").append(...templates.slice(4).map(templateButton));
function addText(value){if(!hasImage())return;const t={t:value||$("#text").value.trim()||"نص جديد",x:c.width/2,y:c.height/2,s:+$("#fontSize").value||56,f:$("#font").value,c:$("#textColor").value,b:boldState,i:italicState,shadow:shadowState,shadowBlur:+$("#shadowBlur").value,stroke:+$("#strokeWidth").value,sc:"#000",r:0};state.texts.push(t);render();save();note("تمت إضافة النص");}
let boldState=false,italicState=false,shadowState=true;
$("#bold").onclick=()=>{$("#bold").classList.toggle("active");boldState=!boldState};$("#italic").onclick=()=>{$("#italic").classList.toggle("active");italicState=!italicState};$("#textShadow").onclick=()=>{$("#textShadow").classList.toggle("active");shadowState=!shadowState};$("#textStroke").onclick=()=>{$("#textStroke").classList.toggle("active");$("#strokeWidth").value=$("#strokeWidth").value==="0"?"6":"0"};
$("#addText").onclick=()=>addText();

const emoji="😀 😃 😄 😁 😆 😅 😂 🤣 😊 😍 🥰 😎 🤩 🥳 😇 🙂 🙃 😉 😌 🤍 🖤 ❤️ 🩷 💜 💙 💚 💛 🧡 💥 🔥 ⭐ ✨ 🌟 💫 ⚡ 🌈 ☀️ 🌙 ☁️ ❄️ 🌸 🌺 🌴 🌊 🎯 🎵 🎧 🎮 👑 💎 🚀 🦋 🐼 🐯 🐸 🦄 🍕 🍔 ☕ 🎂 🎁 📸".split(" ");
const shapes=["◆","◇","●","○","■","□","▲","△","★","☆","✦","✧","✚","✕","♡","♥","☾","☀","☁","☂","✓","✕","➜","➤","∞","@","#"];
const badges=["SALE","NEW","HOT","VIP","LIVE","PRO","2026","WOW","LIMITED","FREE","TOP","EDIT","MOOD","LOVE","URBAN","DREAM"];
function renderStickers(tab){const arr=tab==="emoji"?emoji:tab==="shapes"?shapes:badges;$("#stickers").innerHTML=arr.map(v=>`<button data-sticker="${v}">${v}</button>`).join("");$$("[data-sticker]").forEach(b=>b.onclick=()=>addSticker(b.dataset.sticker))}
$$("[data-sticker-tab]").forEach(b=>b.onclick=()=>{$$("[data-sticker-tab]").forEach(z=>z.classList.remove("active"));b.classList.add("active");activeStickerTab=b.dataset.stickerTab;renderStickers(activeStickerTab)});
renderStickers("emoji");
function addSticker(t){if(!hasImage())return;state.stickers.push({t,x:c.width/2,y:c.height/2,s:t.length>2?100:110,o:1,r:0});render();save();note("تمت إضافة العنصر")}

const sw=["#ffffff","#000000","#ff375f","#ff9f0a","#ffd60a","#30d158","#64d2ff","#0a84ff","#5e5ce6","#bf5af2","#ff2d55","#8e8e93"];$("#swatches").innerHTML=sw.map(v=>`<button style="background:${v}" data-color="${v}"></button>`).join("");$$("[data-color]").forEach(b=>b.onclick=()=>$("#drawColor").value=b.dataset.color);
$$("[data-draw]").forEach(b=>b.onclick=()=>{$$("[data-draw]").forEach(z=>z.classList.remove("active"));if(drawMode===b.dataset.draw){drawMode=null;return}drawMode=b.dataset.draw;b.classList.add("active")});
$("#brush").oninput=()=>$("#brushV").textContent=$("#brush").value;$("#brushOpacity").oninput=()=>$("#brushOpacityV").textContent=$("#brushOpacity").value;

function point(e){const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*(c.width/r.width),y:(e.clientY-r.top)*(c.height/r.height)}}
c.addEventListener("pointerdown",e=>{if(!img)return;if(drawMode){pointerDown=true;c.setPointerCapture(e.pointerId);const p=point(e),obj={m:drawMode,c:$("#drawColor").value,s:+$("#brush").value,o:+$("#brushOpacity").value/100,a:[p]};state.draw.push(obj);return}const p=point(e);for(let i=state.stickers.length-1;i>=0;i--){const s=state.stickers[i],d=Math.hypot(p.x-s.x,p.y-s.y);if(d<s.s*.55){draggingText={type:"sticker",index:i,dx:p.x-s.x,dy:p.y-s.y};c.setPointerCapture(e.pointerId);return}}for(let i=state.texts.length-1;i>=0;i--){const t=state.texts[i];if(Math.abs(p.x-t.x)<Math.max(80,t.s*3)&&Math.abs(p.y-t.y)<t.s*1.2){draggingText={type:"text",index:i,dx:p.x-t.x,dy:p.y-t.y};c.setPointerCapture(e.pointerId);return}}});
c.addEventListener("pointermove",e=>{const p=point(e);if(pointerDown&&drawMode){const a=state.draw[state.draw.length-1];a.a.push(p);render();return}if(draggingText){const o=state[draggingText.type==="text"?"texts":"stickers"][draggingText.index];o.x=p.x-draggingText.dx;o.y=p.y-draggingText.dy;render()}});
c.addEventListener("pointerup",()=>{if(pointerDown){pointerDown=false;save()}if(draggingText){draggingText=null;save()}});c.addEventListener("pointercancel",()=>{pointerDown=false;draggingText=null});

$$("[data-effect]").forEach(b=>b.onclick=()=>{if(!hasImage())return;const a=b.dataset.effect;if(a==="soft"){state.blur=4;state.glow=18;state.contrast=-5}else if(a==="duo"){state.saturation=-40;state.tint=45}else if(a==="noir"){state.filter="noir"}else if(a==="poster"){state.contrast=35;state.saturation=30;state.sharpness=35}else if(a==="film"){state.grain=28;state.fade=12;state.contrast=8}else if(a==="dream"){state.blur=3;state.glow=22;state.saturation=-10}sync();render();save();note("تم تطبيق التأثير")});
$("#blur").oninput=()=>{state.blur=+$("#blur").value;$("#blurV").textContent=state.blur;render()};$("#blur").onchange=save;$("#edge").oninput=()=>{state.edge=+$("#edge").value;$("#edgeV").textContent=state.edge;render()};$("#edge").onchange=save;
$$("[data-blur]").forEach(b=>b.onclick=()=>{const a=b.dataset.blur;if(a==="soft")state.blur=5;if(a==="focus")state.blur=1;if(a==="dream"){state.blur=3;state.glow=22}sync();render();save()});
$$("[data-frame]").forEach(b=>b.onclick=()=>{state.frame=b.dataset.frame;if(state.frame==="none")state.frameSize=0;else if(!state.frameSize)state.frameSize=28;sync();render();save()});$("#frame").oninput=()=>{state.frameSize=+$("#frame").value;render()};$("#frame").onchange=save;
$$("[data-bg]").forEach(b=>b.onclick=()=>{state.background=b.dataset.bg;render();save()});
$$("[data-preset]").forEach(b=>b.onclick=()=>{const p=b.dataset.preset;const sets={clean:{brightness:4,contrast:3,saturation:4,fade:2},cinema:{contrast:24,saturation:10,temperature:8,vignette:22},bright:{brightness:18,contrast:4,saturation:10},moody:{brightness:-12,contrast:22,saturation:-8,vignette:30},gold:{temperature:28,tint:-4,saturation:12},ice:{temperature:-28,tint:18,saturation:-4},neon:{contrast:18,saturation:45,glow:18}};Object.assign(state,sets[p]||{});sync();render();save();note("تم تطبيق الإعداد الجاهز")});

$("#undo").onclick=()=>{if(hi>0){hi--;restore(history[hi]);buttons()}};$("#redo").onclick=()=>{if(hi<history.length-1){hi++;restore(history[hi]);buttons()}};
$("#reset").onclick=()=>{if(!hasImage())return;state=defaults();state.exposure=state.highlights=state.shadows=state.clarity=0;render();save();sync();note("تمت إعادة ضبط الصورة")};
$("#minus").onclick=()=>{zoom=Math.max(.15,zoom-.1);applyZoom()};$("#plus").onclick=()=>{zoom=Math.min(3,zoom+.1);applyZoom()};$("#fit").onclick=fit;
$("#full").onclick=async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen()}catch{}};
$("#download").onclick=()=>{if(!hasImage())return;render();c.toBlob(blob=>{const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="wallpaperhub-edited.png";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}, "image/png");note("جاري تنزيل الصورة")};

renderStickers("emoji");buttons();
})();