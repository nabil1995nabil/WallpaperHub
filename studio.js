(() => {
  'use strict';
  const $ = (selector, root=document) => root.querySelector(selector);
  const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
  const palettes = {
    violet:{a:'#17113f',b:'#5d35b6',c:'#d86bb0',accent:'#cbb4ff',light:'#fff2ff'},
    ocean:{a:'#052c43',b:'#126a9f',c:'#77d4dc',accent:'#a6f4fa',light:'#e9ffff'},
    sunset:{a:'#4b1e56',b:'#bb477c',c:'#ffb66f',accent:'#ffe0a7',light:'#fff4df'},
    forest:{a:'#082d35',b:'#1d806d',c:'#b6d989',accent:'#c6f6d7',light:'#f0ffe8'},
    mono:{a:'#1d2442',b:'#56658c',c:'#b7c0dc',accent:'#e1e8ff',light:'#f5f7ff'},
    rose:{a:'#50132f',b:'#c13e78',c:'#ffc0b8',accent:'#ffe0e7',light:'#fff2f6'},
    amber:{a:'#482509',b:'#bd6f18',c:'#ffd98a',accent:'#fff0bd',light:'#fff8e7'},
    ice:{a:'#132f55',b:'#5798c9',c:'#d8f1ff',accent:'#e1f8ff',light:'#f1fbff'},
    emerald:{a:'#06372f',b:'#118c75',c:'#b9e8a8',accent:'#d2ffe0',light:'#effff4'}
  };
  const toolLabels={wallpaper:'تصميم الخلفيات',theme:'ثيمات الهاتف',icons:'حزم الأيقونات',widget:'الودجات',lock:'شاشة القفل'};
  const presets=['aurora','mountain','waves','minimal','geometry','dots','stripes'];
  const appIcons=[['☎','phone','الهاتف'],['▧','photos','الصور'],['◉','camera','الكاميرا'],['♫','music','الموسيقى'],['✉','messages','الرسائل'],['◎','browser','المتصفح'],['⚙','settings','الإعدادات'],['◈','files','الملفات'],['✦','store','المتجر']];
const widgetCatalog=[{id:'chrome',name:'بحث Google',hint:'شريط بحث',wide:true},{id:'weather',name:'الطقس',hint:'الحرارة والجو'},{id:'clock',name:'الساعة',hint:'الوقت الحالي'},{id:'calendar',name:'التقويم',hint:'اليوم والتاريخ'},{id:'phone',name:'المكالمات',hint:'اختصار الاتصال'},{id:'messages',name:'الرسائل',hint:'فتح الرسائل'},{id:'photos',name:'الصور',hint:'معرض الصور'},{id:'music',name:'الموسيقى',hint:'مشغل الموسيقى'},{id:'maps',name:'الخرائط',hint:'خرائط Google'},{id:'gmail',name:'Gmail',hint:'البريد الإلكتروني'},{id:'youtube',name:'YouTube',hint:'الفيديوهات'},{id:'battery',name:'البطارية',hint:'مستوى الشحن'},{id:'notes',name:'ملاحظاتي',hint:'ملاحظة شخصية'}];
const widgetIds=new Set(widgetCatalog.map(function(item){return item.id}));
const widgetCities={casablanca:{name:'الدار البيضاء',lat:33.5731,lon:-7.5898},rabat:{name:'الرباط',lat:34.0209,lon:-6.8416},marrakech:{name:'مراكش',lat:31.6295,lon:-7.9811},fes:{name:'فاس',lat:34.0331,lon:-5.0003},tangier:{name:'طنجة',lat:35.7595,lon:-5.834},agadir:{name:'أكادير',lat:30.4278,lon:-9.5981},'beni-mellal':{name:'بني ملال',lat:32.3373,lon:-6.3498},oujda:{name:'وجدة',lat:34.6814,lon:-1.9086}};
  const state={tool:'wallpaper',palette:'violet',preset:'aurora',title:'لمسة بنفسجية',subtitle:'اصنع لحظتك الخاصة',glow:65,clock:true,clockStyle:'digital',clockFormat:'24',clockSize:100,clockColor:'auto',showDate:true,showStatusBar:true,screenMode:'lock',iconShape:'rounded',iconScale:100,showIconLabels:true,widgets:['chrome','weather','calendar'],widgetShape:'rounded',widgetScale:100,widgetCity:'casablanca',widgetNote:'ملاحظة جميلة لهذا اليوم',weather:{temperature:null,code:null,description:'اضغط لتحديث الطقس',city:'الدار البيضاء'},batteryLevel:null,widgetHitAreas:[],clockX:540,clockY:400,appsX:540,appsY:1050,subtitleX:540,subtitleY:1740,dragTarget:null,client:null,user:null,savedId:null,backgroundUrl:'',backgroundImage:null,forums:[],publishing:false,shareImageUrl:null,shareSaved:false,successfulDestinations:new Set(),shareThemeUrl:null,shareConfigKey:null,galleryItems:[],galleryFilter:'all'};
  const canvas=$('#designCanvas');
  const ctx=canvas?.getContext('2d');
  const toastNode=$('#studioToast');

  function toast(message){if(!toastNode)return;toastNode.textContent=message;toastNode.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>toastNode.classList.remove('show'),3200)}
  function syncChoice(selector,key,value,className){
    $$(selector).forEach(button=>{
      const selected=button.dataset[key]===String(value);
      button.classList.toggle(className,selected);
      button.setAttribute('aria-pressed',String(selected));
    });
  }
  function roundedRect(x,y,w,h,r,fill,stroke){const radius=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+radius,y);ctx.arcTo(x+w,y,x+w,y+h,radius);ctx.arcTo(x+w,y+h,x,y+h,radius);ctx.arcTo(x,y+h,x,y,radius);ctx.arcTo(x,y,x+w,y,radius);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
  function drawGlow(x,y,r,color,alpha){const gradient=ctx.createRadialGradient(x,y,0,x,y,r);gradient.addColorStop(0,color);gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.globalAlpha=alpha;ctx.fillStyle=gradient;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.globalAlpha=1}
  function drawStars(p){let seed=71;const rand=()=>{seed=(seed*9301+49297)%233280;return seed/233280};for(let i=0;i<75;i++){const x=rand()*1080,y=rand()*1100,r=rand()*3+1;ctx.globalAlpha=rand()*.5+.15;ctx.fillStyle=p.light;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1}
  function drawMountains(p){const layers=[{c:p.a,points:[[0,1430],[190,1080],[360,1320],[560,930],[760,1260],[930,1040],[1080,1370]]},{c:'#111638',points:[[0,1510],[190,1280],[390,1510],[620,1200],[840,1480],[1000,1280],[1080,1390]]}];for(const layer of layers){ctx.beginPath();ctx.moveTo(0,1920);ctx.lineTo(...layer.points[0]);layer.points.slice(1).forEach(pt=>ctx.lineTo(...pt));ctx.lineTo(1080,1920);ctx.closePath();ctx.fillStyle=layer.c;ctx.globalAlpha=.78;ctx.fill();ctx.globalAlpha=1}const floor=ctx.createLinearGradient(0,1450,0,1920);floor.addColorStop(0,'rgba(17,17,58,.1)');floor.addColorStop(1,'rgba(5,9,32,.85)');ctx.fillStyle=floor;ctx.fillRect(0,1450,1080,470)}
  function drawWaves(p){for(let j=0;j<7;j++){ctx.beginPath();for(let x=0;x<=1080;x+=12){const y=1160+j*90+Math.sin(x/100+j*.65)*32+Math.cos(x/180+j)*22;if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.strokeStyle=j%2?p.accent:p.c;ctx.globalAlpha=.12+j*.025;ctx.lineWidth=18-j;ctx.stroke()}ctx.globalAlpha=1}
  function drawIcons(p){
    const items=appIcons.map(([symbol,key,label])=>[symbol,label]);
    const scale=state.iconScale/100,size=176*scale,gap=42*scale,cols=3;
    const startX=state.appsX-(cols*size+(cols-1)*gap)/2,startY=state.appsY;
    items.forEach(([symbol,label],i)=>{
      const x=startX+(i%cols)*(size+gap),y=startY+Math.floor(i/cols)*(size+gap+42*scale),radius=state.iconShape==='circle'?size/2:state.iconShape==='square'?18*scale:42*scale;
      roundedRect(x,y,size,size,radius,`rgba(255,255,255,${.15+(i%3)*.035})`,'rgba(255,255,255,.38)');
      ctx.save();ctx.shadowColor=p.c;ctx.shadowBlur=22;ctx.fillStyle=p.light;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`bold ${78*scale}px Arial`;ctx.fillText(symbol,x+size/2,y+size/2+3);ctx.restore();
      if(state.showIconLabels){ctx.fillStyle='rgba(255,255,255,.96)';ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.font=`600 ${25*scale}px Cairo, sans-serif`;ctx.fillText(label,x+size/2,y+size+30*scale)}
    });
  }
  function drawWidget(p){
  var now=new Date(),rects=[],y=235,col=0,left=100,right=550;
  for(var i=0;i<state.widgets.length;i++){var id=state.widgets[i],entry=widgetCatalog.find(function(v){return v.id===id});if(!entry)continue;if(entry.wide){if(col){y+=190;col=0;}rects.push({id:id,x:100,y:y,w:880,h:140});y+=160;}else{rects.push({id:id,x:col?right:left,y:y,w:430,h:180});if(col){col=0;y+=190;}else col=1;}}
  state.widgetHitAreas=rects;
  for(var k=0;k<rects.length;k++){var r=rects[k];roundedRect(r.x,r.y,r.w,r.h,28,'rgba(255,255,255,.18)','rgba(255,255,255,.34)');ctx.save();ctx.fillStyle=p.light;ctx.textAlign='right';ctx.font='700 28px Cairo, sans-serif';ctx.fillText(r.id,r.x+r.w-24,r.y+40);ctx.font='50px Cairo, sans-serif';var value=r.id==='weather'?(state.weather.temperature===null?'--°':Math.round(state.weather.temperature)+'°'):r.id==='clock'?formatLiveTime(now):r.id==='calendar'?formatLiveDate(now):r.id==='chrome'?'Google':r.id==='phone'?'☎':r.id==='messages'?'✉':r.id==='photos'?'▧':r.id==='music'?'♫':r.id==='maps'?'⌖':r.id==='gmail'?'M':r.id==='youtube'?'▶':r.id==='battery'?'--%':String(state.widgetNote||'ملاحظة');ctx.fillText(value,r.x+r.w-24,r.y+112);ctx.restore();}
}
function renderWidgetCatalog(){
  var target=$('#widgetCatalog');if(!target)return;target.replaceChildren();
  for(var i=0;i<widgetCatalog.length;i++){var item=widgetCatalog[i],button=document.createElement('button');button.type='button';button.className='widget-choice';button.dataset.widget=item.id;button.setAttribute('aria-pressed',String(state.widgets.indexOf(item.id)>=0));var copy=document.createElement('span');copy.className='widget-choice-copy';var name=document.createElement('b');name.textContent=item.name;copy.append(name);var mark=document.createElement('span');mark.className='widget-choice-mark material-icons-round';mark.textContent=state.widgets.indexOf(item.id)>=0?'check_circle':'add_circle_outline';button.append(copy,mark);target.appendChild(button);}syncWidgetUI();
}
function syncWidgetUI(){
  $$('.widget-choice').forEach(function(b){var active=state.widgets.indexOf(b.dataset.widget)>=0;b.classList.toggle('is-selected',active);var mark=$('.widget-choice-mark',b);if(mark)mark.textContent=active?'check_circle':'add_circle_outline';});
  var count=$('#widgetCount');if(count)count.textContent=state.widgets.length+' / 6';var scale=$('#widgetScaleValue');if(scale)scale.textContent=state.widgetScale+'%';
}
function toggleWidget(id){if(!widgetIds.has(id))return;var index=state.widgets.indexOf(id);if(index>=0)state.widgets.splice(index,1);else if(state.widgets.length<6)state.widgets.push(id);else{toast('يمكنك اختيار ستة ودجات كحد أقصى');return;}syncWidgetUI();render();if(id==='weather'&&state.widgets.indexOf(id)>=0)refreshWeather();}
async function refreshWeather(){
  if(state.widgets.indexOf('weather')<0)return;var button=$('#refreshWeather');if(button)button.disabled=true;
  try{var city=widgetCities[$('#widgetCity')?.value||state.widgetCity]||widgetCities.casablanca;var params=new URLSearchParams({latitude:String(city.lat),longitude:String(city.lon),current:'temperature_2m,weather_code',timezone:'auto'});var response=await fetch('https://api.open-meteo.com/v1/forecast?'+params.toString());if(!response.ok)throw new Error('weather');var data=await response.json();state.weather={city:city.name,temperature:data.current.temperature_2m,code:data.current.weather_code,description:'حالة الطقس'};render();}
  catch(error){toast('تعذر تحديث الطقس حالياً');}
  finally{if(button)button.disabled=false;}
}
function onWidgetCanvasClick(event){
  if(state.screenMode!=='home')return;var box=canvas.getBoundingClientRect(),x=(event.clientX-box.left)*canvas.width/box.width,y=(event.clientY-box.top)*canvas.height/box.height;
  var hit=state.widgetHitAreas.find(function(v){return x>=v.x&&x<=v.x+v.w&&y>=v.y&&y<=v.y+v.h;});if(!hit)return;
  if(hit.id==='weather'){refreshWeather();return;}if(hit.id==='notes'){var note=prompt('اكتب ملاحظتك',state.widgetNote);if(note!==null){state.widgetNote=note;render();}return;}
  if(hit.id==='phone'||hit.id==='messages'){var number=prompt('رقم الهاتف');if(number)location.href=(hit.id==='phone'?'tel:':'sms:')+number;return;}
  var urls={chrome:'https://www.google.com',calendar:'https://calendar.google.com',photos:'https://photos.google.com',music:'https://music.youtube.com',maps:'https://maps.google.com',gmail:'https://mail.google.com',youtube:'https://youtube.com'};if(urls[hit.id])window.open(urls[hit.id],'_blank','noopener,noreferrer');
}
  function drawGeometry(p){ctx.save();ctx.globalAlpha=.22;for(let i=0;i<7;i++){ctx.strokeStyle=i%2?p.light:p.accent;ctx.lineWidth=12-i;ctx.beginPath();ctx.moveTo(-100+i*180,1250);ctx.lineTo(260+i*180,880);ctx.lineTo(620+i*180,1250);ctx.stroke()}ctx.restore()}
  function drawDots(p){ctx.save();ctx.fillStyle=p.light;for(let y=150;y<1500;y+=70)for(let x=45+(Math.floor(y/70)%2)*35;x<1080;x+=70){ctx.globalAlpha=.14+((x+y)%5)*.035;ctx.beginPath();ctx.arc(x,y,3+((x+y)%3),0,Math.PI*2);ctx.fill()}ctx.restore()}
  function drawStripes(p){ctx.save();ctx.globalAlpha=.16;ctx.strokeStyle=p.accent;ctx.lineWidth=22;for(let x=-1200;x<1800;x+=105){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+1920,1920);ctx.stroke()}ctx.restore()}
  function drawCoverImage(image){const scale=Math.max(canvas.width/image.width,canvas.height/image.height);const w=image.width*scale,h=image.height*scale;ctx.drawImage(image,(canvas.width-w)/2,(canvas.height-h)/2,w,h)}
  function formatLiveTime(date=new Date()){
    return new Intl.DateTimeFormat('ar-MA',{hour:'2-digit',minute:'2-digit',hourCycle:state.clockFormat==='12'?'h12':'h23'}).format(date);
  }
  function formatLiveDate(date=new Date()){
    return new Intl.DateTimeFormat('ar-MA',{weekday:'long',day:'numeric',month:'long'}).format(date);
  }
  function clockInk(p){
    return state.clockColor==='white'?'#ffffff':state.clockColor==='dark'?'#15152b':state.clockColor==='gold'?'#ffe6a4':p.light;
  }
  function drawLiveClock(p,now=new Date()){
    const color=clockInk(p);ctx.save();ctx.fillStyle=color;ctx.strokeStyle=color;ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.shadowColor='rgba(0,0,0,.22)';ctx.shadowBlur=18;
    if(state.clockStyle==='analog'){
      const sizeScale=state.clockSize/100,radius=Math.max(42,60*sizeScale),cx=state.clockX,cy=state.clockY;
      ctx.lineWidth=7;ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.stroke();
      for(let i=0;i<12;i++){const a=i*Math.PI/6-Math.PI/2;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*(radius-10),cy+Math.sin(a)*(radius-10));ctx.lineTo(cx+Math.cos(a)*(radius-20),cy+Math.sin(a)*(radius-20));ctx.lineWidth=i%3===0?6:3;ctx.stroke()}
      const minute=now.getMinutes()+now.getSeconds()/60,hour=(now.getHours()%12)+minute/60;
      const hands=[[hour/12*Math.PI*2-Math.PI/2,radius*.48,7],[minute/60*Math.PI*2-Math.PI/2,radius*.7,5],[now.getSeconds()/60*Math.PI*2-Math.PI/2,radius*.78,2]];
      hands.forEach(([angle,length,width],i)=>{ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(angle)*length,cy+Math.sin(angle)*length);ctx.lineWidth=width;ctx.strokeStyle=i===2?'#ff7b9a':color;ctx.stroke()});
      ctx.beginPath();ctx.arc(cx,cy,8,0,Math.PI*2);ctx.fill();
      if(state.showDate){ctx.shadowBlur=8;ctx.font=`${34*sizeScale}px Cairo, sans-serif`;ctx.fillText(formatLiveDate(now),cx,cy+radius+62*sizeScale)}
    }else{
      ctx.font=`500 ${112*(state.clockSize/100)}px Cairo, sans-serif`;ctx.fillText(formatLiveTime(now),state.clockX,state.clockY);
      if(state.showDate){ctx.shadowBlur=8;ctx.font=`${34*(state.clockSize/100)}px Cairo, sans-serif`;ctx.fillText(formatLiveDate(now),state.clockX,state.clockY+62*(state.clockSize/100))}
    }
    ctx.restore();
  }
  function drawStatusBar(p,now=new Date()){
    if(!state.showStatusBar)return;
    ctx.save();ctx.fillStyle=clockInk(p);ctx.globalAlpha=.94;ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.font='600 34px Cairo, sans-serif';ctx.fillText(formatLiveTime(now),120,88);ctx.restore();
  }
  function render(){
    if(!ctx||!canvas)return;
    const p=palettes[state.palette]||palettes.violet,now=new Date();
    if(state.backgroundImage?.complete&&state.backgroundImage.naturalWidth){drawCoverImage(state.backgroundImage);const overlay=ctx.createLinearGradient(0,0,canvas.width,canvas.height);overlay.addColorStop(0,p.a+'55');overlay.addColorStop(.55,p.b+'44');overlay.addColorStop(1,p.c+'66');ctx.fillStyle=overlay;ctx.fillRect(0,0,canvas.width,canvas.height)}
    else{const g=ctx.createLinearGradient(0,0,canvas.width,canvas.height);g.addColorStop(0,p.a);g.addColorStop(.56,p.b);g.addColorStop(1,p.c);ctx.fillStyle=g;ctx.fillRect(0,0,canvas.width,canvas.height)}
    drawGlow(780,420,530,p.c,state.glow/145);drawGlow(190,1000,470,p.accent,state.glow/230);
    if(state.preset==='aurora'){drawStars(p);ctx.globalAlpha=.2;for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse(540,1080,650-i*74,160+i*22,-.22,0,Math.PI*2);ctx.strokeStyle=p.accent;ctx.lineWidth=12-i;ctx.stroke()}ctx.globalAlpha=1}
    if(state.preset==='mountain')drawMountains(p);
    if(state.preset==='waves')drawWaves(p);
    if(state.preset==='minimal'){drawGlow(540,850,630,p.accent,.18);roundedRect(92,980,896,8,4,'rgba(255,255,255,.28)')}
    if(state.preset==='geometry')drawGeometry(p);
    if(state.preset==='dots')drawDots(p);
    if(state.preset==='stripes')drawStripes(p);
    if(state.screenMode==='home'){
      drawWidget(p);
      drawIcons(p);
    }else if(state.screenMode==='lock'){
      if(state.tool==='icons'||state.tool==='theme')drawIcons(p);
    }
    if(state.screenMode==='lock'&&state.clock)drawLiveClock(p,now);
    if(state.screenMode!=='wallpaper')drawStatusBar(p,now);
    if(state.screenMode!=='wallpaper'&&state.subtitle){ctx.save();ctx.fillStyle='rgba(255,255,255,.94)';ctx.textAlign='center';ctx.font='500 34px Cairo, sans-serif';ctx.fillText(state.subtitle.slice(0,48),state.subtitleX,state.subtitleY);ctx.restore()}
    if(state.screenMode!=='wallpaper'){ctx.textAlign='center';ctx.fillStyle='rgba(255,255,255,.48)';ctx.font='600 22px Cairo, sans-serif';ctx.fillText('WALLPAPERHUB',540,1850)}
  }
  function updateTool(tool){
    if(!toolLabels[tool])return;
    state.tool=tool;
    state.screenMode=tool==='lock'||tool==='wallpaper'?'lock':'home';
    syncChoice('.tool-card','tool',state.tool,'is-active');
    syncChoice('.screen-mode-button','screenMode',state.screenMode,'is-active');
    $('#activeToolLabel').textContent=toolLabels[tool];
    render();
  }
  function readControls(){
 state.title=$('#designTitle').value.trim()||'تصميم جديد';state.subtitle=$('#designSubtitle').value.trim();state.glow=Number($('#glowStrength').value)||0;state.clock=$('#showClock').checked;state.clockStyle=$('#clockStyle').value;state.clockFormat=$('#clockFormat').value;state.clockSize=Number($('#clockSize').value)||100;state.clockColor=$('#clockColor').value;state.showDate=$('#showDate').checked;state.showStatusBar=$('#showStatusBar').checked;state.iconShape=$('#iconShape').value;state.iconScale=Number($('#iconScale').value)||100;state.showIconLabels=$('#showIconLabels').checked;state.widgetShape=$('#widgetShape').value;state.widgetScale=Number($('#widgetScale').value)||100;state.widgetCity=$('#widgetCity').value;$('#glowValue').textContent=state.glow+'%';$('#clockSizeValue').textContent=state.clockSize+'%';$('#iconScaleValue').textContent=state.iconScale+'%';syncWidgetUI();render();
}
  function designConfig(){return {format:'wallpaperhub-theme',version:3,tool:state.tool,palette:state.palette,preset:state.preset,title:state.title,subtitle:state.subtitle,glow:state.glow,clock:state.clock,clockStyle:state.clockStyle,clockFormat:state.clockFormat,clockSize:state.clockSize,clockColor:state.clockColor,showDate:state.showDate,showStatusBar:state.showStatusBar,screenMode:state.screenMode,iconShape:state.iconShape,iconScale:state.iconScale,showIconLabels:state.showIconLabels,widgets:state.widgets.slice(0,6),widgetShape:state.widgetShape,widgetScale:state.widgetScale,widgetCity:state.widgetCity,widgetNote:state.widgetNote,clockX:state.clockX,clockY:state.clockY,appsX:state.appsX,appsY:state.appsY,subtitleX:state.subtitleX,subtitleY:state.subtitleY,backgroundUrl:state.backgroundUrl||null};}
  function dataForSave(visibility,imageUrl=null,themeUrl=null){return {user_id:state.user.id,title:state.title,category:state.tool,visibility,config:{...designConfig(),themeUrl:themeUrl||null},image_url:imageUrl,updated_at:new Date().toISOString()}}
  async function authToken(){const {data,error}=await state.client.auth.getSession();if(error)throw error;const token=data?.session?.access_token;if(!token)throw new Error('انتهت جلستك، سجّل الدخول من جديد');return token}
  async function uploadToImageKit(file,fileName){
    const token=await authToken();
    const signatureResponse=await fetch('/api/publish/media-signature',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({mimeType:file.type||'image/png'})});
    const signature=await signatureResponse.json().catch(()=>({}));
    if(!signatureResponse.ok||!signature.signature)throw new Error(signature.message||'تعذر تجهيز رفع ImageKit');
    const form=new FormData();form.append('file',file,fileName);form.append('fileName',fileName);form.append('publicKey',signature.publicKey);form.append('signature',signature.signature);form.append('expire',String(signature.expire));form.append('token',signature.token);form.append('folder',`wallpaperhub/studio/${String(state.user.id)}`);
    const response=await fetch('https://upload.imagekit.io/api/v1/files/upload',{method:'POST',body:form});
    const result=await response.json().catch(()=>({}));
    if(!response.ok||!result.url)throw new Error(result.message||result.help||'فشل رفع الصورة إلى ImageKit');
    return result.url;
  }
  function loadBackground(url){return new Promise((resolve,reject)=>{if(!url){state.backgroundImage=null;state.backgroundUrl='';render();resolve();return}const image=new Image();image.crossOrigin='anonymous';image.onload=()=>{state.backgroundImage=image;state.backgroundUrl=url;render();resolve()};image.onerror=()=>reject(new Error('تعذر تحميل الصورة المختارة من ImageKit'));image.src=url})}
  async function onChooseBackground(file){if(!file)return;if(!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type)){toast('اختر صورة JPG أو PNG أو WEBP أو AVIF');return}if(file.size>15*1024*1024){toast('حجم الصورة يجب ألا يتجاوز 15MB');return}if(!state.user||!state.client){toast('سجّل الدخول أولاً لاستخدام صورك');return}
    const button=$('#chooseBackgroundImage');const status=$('#backgroundImageStatus');button.disabled=true;status.textContent='جاري رفع صورتك بأمان إلى ImageKit...';
    try{const ext=(file.name.split('.').pop()||'jpg').replace(/[^a-z0-9]/gi,'').slice(0,8)||'jpg';const url=await uploadToImageKit(file,`studio-background-${Date.now()}.${ext}`);await loadBackground(url);$('#removeBackgroundImage').classList.remove('hidden');status.textContent='تم تحميل صورتك — يمكنك تغيير الألوان والأنماط فوقها';toast('تمت إضافة صورتك إلى التصميم')}
    catch(error){console.error('STUDIO BACKGROUND UPLOAD:',error);status.textContent='تعذر رفع الصورة. حاول مرة أخرى';toast(error.message||'تعذر رفع الصورة')}
    finally{button.disabled=false;$('#backgroundImageInput').value=''}
  }
  async function initSupabase(){
 updateProfile();
 try{
  var controller=new AbortController(),timer=setTimeout(function(){controller.abort();},9000),response;
  try{response=await fetch('/api/supabase/config',{cache:'no-store',signal:controller.signal});}finally{clearTimeout(timer);}
  if(!response.ok)throw new Error('تعذر تحميل إعدادات الاتصال');
  var cfg=await response.json();if(!cfg.url||!cfg.anonKey||!window.supabase||!window.supabase.createClient)throw new Error('إعدادات Supabase غير مكتملة');
  state.client=window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  try{var session=await state.client.auth.getSession();state.user=session&&session.data&&session.data.session?session.data.session.user:null;}catch(sessionError){console.warn('STUDIO SESSION:',sessionError);}
  updateProfile();state.client.auth.onAuthStateChange(function(_event,session){state.user=session?session.user:null;updateProfile();void loadDrafts();});
 }catch(error){console.warn('STUDIO SUPABASE INIT:',error);toast('تعذر الاتصال بالمكتبة الآن؛ يمكنك مواصلة التصميم دون اتصال');}
 var results=await Promise.allSettled([loadGallery(),loadDrafts()]);
 results.forEach(function(result,index){if(result.status==='rejected')console.warn(index?'STUDIO DRAFTS':'STUDIO GALLERY',result.reason);});
 var sharedId=new URLSearchParams(location.search).get('import');if(sharedId){if(state.client)await loadSharedTheme(sharedId);else toast('تعذر الاتصال لاستيراد الثيم؛ حاول تحديث الصفحة');}
}
  function updateProfile(){const node=$('#studioAvatar');if(!node)return;const meta=state.user?.user_metadata||{};const avatar=meta.avatar_url||meta.avatarUrl||meta.picture||'';if(avatar){node.innerHTML='';const img=document.createElement('img');img.src=avatar;img.alt='';node.appendChild(img)}else node.textContent=(meta.full_name||meta.name||state.user?.email||'U').trim().slice(0,1).toUpperCase()}
  async function saveDesign(visibility){if(!state.user||!state.client){toast('سجّل الدخول أولاً لحفظ تصميمك');return}const button=visibility==='published'?$('#publishDesign'):$('#saveDraft');button.disabled=true;try{const payload=dataForSave(visibility,null);let query;if(state.savedId){query=await state.client.from('studio_designs').update(payload).eq('id',state.savedId).eq('user_id',state.user.id).select('id').single()}else{query=await state.client.from('studio_designs').insert(payload).select('id').single()}if(query.error)throw query.error;state.savedId=query.data.id;toast('تم حفظ التصميم في مسوداتك');loadDrafts()}catch(error){console.error('STUDIO SAVE:',error);toast(error.message?.includes('studio_designs')?'تحقق من صلاحيات جدول studio_designs وإعدادات Data API في Supabase':'تعذر حفظ التصميم، تحقق من اتصالك ثم حاول مجدداً')}finally{button.disabled=false}}
  async function savePublishedDesign(imageUrl,themeUrl){const payload=dataForSave('published',imageUrl,themeUrl);let query;if(state.savedId){query=await state.client.from('studio_designs').update(payload).eq('id',state.savedId).eq('user_id',state.user.id).select('id').single()}else{query=await state.client.from('studio_designs').insert(payload).select('id').single()}if(query.error)throw query.error;state.savedId=query.data.id}
  function renderGallery(){
    const target=$('#creationGrid');
    if(!target)return;
    const term=String($('#gallerySearch')?.value||'').trim().toLowerCase();
    const filter=state.galleryFilter||'all';
    const filtered=state.galleryItems.filter(item=>{
      const c=item.config||{};
      const mode=c.screenMode||((c.tool==='lock')?'lock':(['theme','icons','widget'].includes(c.tool)?'home':'wallpaper'));
      const matchesFilter=filter==='all'||mode===filter;
      const haystack=[item.title,c.subtitle,c.palette,c.preset,c.tool].filter(Boolean).join(' ').toLowerCase();
      return matchesFilter&&(!term||haystack.includes(term));
    });
    target.replaceChildren();
    if(!state.galleryItems.length){
      target.innerHTML='<div class="gallery-loading"><span class="material-icons-round">auto_awesome</span><b>كن أول من يشارك ثيمه</b><small>صمّم ثيمك ثم انشره ليظهر هنا مع إعداداته الكاملة.</small></div>';
      return;
    }
    if(!filtered.length){
      target.innerHTML='<div class="gallery-empty">لا توجد نتائج مطابقة. جرّب كلمة بحث أخرى أو اختر تصنيفاً مختلفاً.</div>';
      return;
    }
    filtered.forEach(item=>{
      const p=palettes[item.config?.palette]||palettes.violet;
      const card=document.createElement('a');
      card.className='creation-card';
      card.href='/community-creation.html?id='+encodeURIComponent(item.id);
      card.setAttribute('aria-label','عرض '+(item.title||'إبداع المجتمع'));
      const art=document.createElement('div');
      art.className='creation-art';
      if(item.image_url){
        const image=document.createElement('img');
        image.src=item.image_url;
        image.alt=item.title||'تصميم من المجتمع';
        image.loading='lazy';
        image.decoding='async';
        image.referrerPolicy='no-referrer';
        art.appendChild(image);
      }else{
        art.style.setProperty('--art-bg','linear-gradient(145deg,'+p.a+','+p.b+','+p.c+')');
        const icon=document.createElement('span');
        icon.className='material-icons-round';
        icon.textContent=({wallpaper:'landscape',theme:'palette',icons:'apps',widget:'dashboard_customize',lock:'lock'})[item.category]||'auto_awesome';
        art.appendChild(icon);
      }
      const meta=document.createElement('div');
      meta.className='creation-meta';
      const title=document.createElement('b');
      title.textContent=item.title||'تصميم من المجتمع';
      const sub=document.createElement('small');
      const category=item.config?.screenMode==='lock'?'شاشة القفل':item.config?.screenMode==='home'?'الشاشة الرئيسية':toolLabels[item.config?.tool||item.category]||'تصميم';
      sub.textContent=category+' · '+new Date(item.created_at).toLocaleDateString('ar-MA');
      meta.append(title,sub);
      if(item.config?.themeUrl){
        const pack=document.createElement('small');
        pack.className='creation-pack-badge';
        pack.textContent='حزمة الهاتف متاحة';
        meta.appendChild(pack);
      }
      card.append(art,meta);
      target.appendChild(card);
    });
  }
  async function loadGallery(){
    const target=$('#creationGrid');
    if(!target)return;
    if(!state.client){
      target.innerHTML='<div class="gallery-loading"><span class="material-icons-round">cloud_off</span><b>المكتبة غير متاحة الآن</b><small>يمكنك استخدام المصمم وتصدير الثيم على جهازك.</small></div>';
      return;
    }
    try{
      const {data,error}=await state.client.from('studio_designs')
        .select('id,title,category,config,image_url,created_at')
        .eq('visibility','published')
        .order('created_at',{ascending:false})
        .limit(60);
      if(error)throw error;
      state.galleryItems=Array.isArray(data)?data:[];
      renderGallery();
    }catch(error){
      console.warn('STUDIO GALLERY:',error);
      target.innerHTML='<div class="gallery-loading"><span class="material-icons-round">info</span><b>المكتبة غير متاحة حالياً</b><small>تعذر قراءة الثيمات المنشورة من قاعدة البيانات.</small></div>';
    }
  }
  async function loadDraftIntoEditor(item,options={}){
    const c=item.config||{};state.savedId=options.asCopy?null:item.id;state.shareImageUrl=null;state.shareThemeUrl=null;state.shareSaved=false;state.shareConfigKey=null;state.successfulDestinations=new Set();
    state.tool=toolLabels[c.tool]?c.tool:'wallpaper';state.palette=palettes[c.palette]?c.palette:'violet';state.preset=presets.includes(c.preset)?c.preset:'aurora';
    state.title=String(item.title||c.title||'تصميم محفوظ');state.subtitle=String(c.subtitle||'');state.glow=Math.max(0,Math.min(100,Number(c.glow??65)));state.clock=c.clock!==false;
    state.clockStyle=c.clockStyle==='analog'?'analog':'digital';state.clockFormat=c.clockFormat==='12'?'12':'24';state.clockSize=Math.max(70,Math.min(150,Number(c.clockSize)||100));state.clockColor=['auto','white','dark','gold'].includes(c.clockColor)?c.clockColor:'auto';state.showDate=c.showDate!==false;state.showStatusBar=c.showStatusBar!==false;
    state.screenMode=['lock','home','wallpaper'].includes(c.screenMode)?c.screenMode:(['icons','theme','widget'].includes(state.tool)?'home':'lock');state.iconShape=['rounded','circle','square'].includes(c.iconShape)?c.iconShape:'rounded';state.iconScale=Math.max(75,Math.min(125,Number(c.iconScale)||100));state.showIconLabels=c.showIconLabels!==false;state.widgets=Array.isArray(c.widgets)?[...new Set(c.widgets.filter(function(id){return widgetIds.has(id);}))].slice(0,6):(state.tool==='widget'?['chrome','weather','calendar']:[]);state.widgetShape=['rounded','square','glass'].includes(c.widgetShape)?c.widgetShape:'rounded';state.widgetScale=Math.max(80,Math.min(120,Number(c.widgetScale)||100));state.widgetCity=widgetCities[c.widgetCity]?c.widgetCity:'casablanca';state.widgetNote=String(c.widgetNote||'').slice(0,80);
    state.clockX=Number(c.clockX)||540;state.clockY=Number(c.clockY)||400;state.appsX=Number(c.appsX)||540;state.appsY=Number(c.appsY)||1050;state.subtitleX=Number(c.subtitleX)||540;state.subtitleY=Number(c.subtitleY)||1740;
    $('#designTitle').value=state.title;$('#designSubtitle').value=state.subtitle;$('#glowStrength').value=String(state.glow);$('#showClock').checked=state.clock;
    $('#clockStyle').value=state.clockStyle;$('#clockFormat').value=state.clockFormat;$('#clockSize').value=String(state.clockSize);$('#clockColor').value=state.clockColor;$('#showDate').checked=state.showDate;$('#showStatusBar').checked=state.showStatusBar;
    $('#iconShape').value=state.iconShape;$('#iconScale').value=String(state.iconScale);$('#showIconLabels').checked=state.showIconLabels;$('#widgetShape').value=state.widgetShape;$('#widgetScale').value=String(state.widgetScale);$('#widgetCity').value=state.widgetCity;syncWidgetUI();
    syncChoice('.tool-card','tool',state.tool,'is-active');syncChoice('.screen-mode-button','screenMode',state.screenMode,'is-active');$('#activeToolLabel').textContent=toolLabels[state.tool];
    syncChoice('.palette-swatch','palette',state.palette,'selected');syncChoice('.preset-button','preset',state.preset,'selected');
    try{await loadBackground(c.backgroundUrl||'');$('#removeBackgroundImage').classList.toggle('hidden',!state.backgroundUrl);$('#backgroundImageStatus').textContent=state.backgroundUrl?'صورة التصميم المحفوظة جاهزة للتعديل':'JPG · PNG · WEBP · AVIF — حتى 15MB'}catch(error){toast(error.message)}
    readControls();$('#studioEditor').scrollIntoView({behavior:'smooth',block:'start'});toast(options.asCopy?'تم استيراد نسخة مستقلة من الثيم — احفظها أو انشرها باسمك':'تم فتح المسودة في مساحة التصميم');
  }
  async function loadDrafts(){const section=$('#draftSection'),target=$('#draftGrid');if(!section||!target)return;section.classList.toggle('hidden',!state.user);if(!state.user||!state.client){target.innerHTML='<div class="gallery-loading"><span class="material-icons-round">bookmark_border</span><b>سجّل الدخول لحفظ مسوداتك</b><small>يمكنك تنزيل التصميم الآن أو تسجيل الدخول لحفظه.</small></div>';return}try{const {data,error}=await state.client.from('studio_designs').select('id,title,category,config,created_at').eq('visibility','draft').order('updated_at',{ascending:false}).limit(8);if(error)throw error;target.replaceChildren();if(!data?.length){target.innerHTML='<div class="gallery-loading"><span class="material-icons-round">bookmark_add</span><b>لا توجد مسودات بعد</b><small>احفظ أول تصميم لتكمل العمل عليه لاحقاً.</small></div>';return}data.forEach(item=>{const p=palettes[item.config?.palette]||palettes.violet;const button=document.createElement('button');button.type='button';button.className='draft-card';const art=document.createElement('span');art.className='draft-art';if(item.config?.backgroundUrl){art.style.backgroundImage=`url("${String(item.config.backgroundUrl).replace(/["\\]/g,'')}")`;art.style.backgroundSize='cover';art.style.backgroundPosition='center'}else art.style.setProperty('--art-bg',`linear-gradient(145deg,${p.a},${p.b},${p.c})`);art.innerHTML='<span class="material-icons-round">edit</span>';const copy=document.createElement('span');copy.className='draft-copy';const title=document.createElement('b');title.textContent=item.title||'تصميم بدون اسم';const meta=document.createElement('small');meta.textContent=toolLabels[item.category]||'تصميم';copy.append(title,meta);const action=document.createElement('span');action.className='material-icons-round draft-open';action.textContent='arrow_back';button.append(art,copy,action);button.addEventListener('click',()=>loadDraftIntoEditor(item));target.appendChild(button)})}catch(error){console.warn('STUDIO DRAFTS:',error);target.innerHTML='<div class="gallery-loading"><span class="material-icons-round">info</span><b>تعذر تحميل المسودات</b><small>تحقق من صلاحيات الوصول إلى جدول الاستوديو في Supabase.</small></div>'}}
  function canvasBlob(){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('تعذر تجهيز صورة التصميم. جرّب إزالة الصورة وإضافتها مجدداً.')),'image/png',.95))}
  async function download(){try{readControls();const blob=await canvasBlob();const url=URL.createObjectURL(blob);const link=document.createElement('a');link.download=`wallpaperhub-${state.tool}-${Date.now()}.png`;link.href=url;link.click();setTimeout(()=>URL.revokeObjectURL(url),1500);toast('تم تجهيز التصميم للتنزيل بجودة 1080 × 1920')}catch(error){toast(error.message||'تعذر تنزيل التصميم')}}
  function crc32(bytes){
    let crc=0xffffffff;
    for(let i=0;i<bytes.length;i++){crc^=bytes[i];for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}
    return (crc^0xffffffff)>>>0;
  }
  function zipStored(files){
    const encoder=new TextEncoder(),locals=[],centrals=[];let offset=0,totalCentral=0;
    const now=new Date(),dosTime=(now.getHours()<<11)|(now.getMinutes()<<5)|(Math.floor(now.getSeconds()/2)),dosDate=((Math.max(1980,now.getFullYear())-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate();
    files.forEach(file=>{
      const name=encoder.encode(file.name),data=file.data instanceof Uint8Array?file.data:new Uint8Array(file.data),crc=crc32(data),local=new Uint8Array(30+name.length+data.length),lv=new DataView(local.buffer);
      lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(6,0x0800,true);lv.setUint16(8,0,true);lv.setUint16(10,dosTime,true);lv.setUint16(12,dosDate,true);lv.setUint32(14,crc,true);lv.setUint32(18,data.length,true);lv.setUint32(22,data.length,true);lv.setUint16(26,name.length,true);lv.setUint16(28,0,true);local.set(name,30);local.set(data,30+name.length);locals.push(local);
      const central=new Uint8Array(46+name.length),cv=new DataView(central.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x0800,true);cv.setUint16(10,0,true);cv.setUint16(12,dosTime,true);cv.setUint16(14,dosDate,true);cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,name.length,true);cv.setUint16(30,0,true);cv.setUint16(32,0,true);cv.setUint16(34,0,true);cv.setUint16(36,0,true);cv.setUint32(38,0,true);cv.setUint32(42,offset,true);central.set(name,46);centrals.push(central);offset+=local.length;totalCentral+=central.length;
    });
    const end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(4,0,true);ev.setUint16(6,0,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);ev.setUint32(12,totalCentral,true);ev.setUint32(16,offset,true);ev.setUint16(20,0,true);
    return new Blob([...locals,...centrals,end],{type:'application/zip'});
  }
  function makeIconBlob(symbol,p,index){
    return new Promise((resolve,reject)=>{
      const iconCanvas=document.createElement('canvas');iconCanvas.width=512;iconCanvas.height=512;const c=iconCanvas.getContext('2d');
      const gradient=c.createLinearGradient(30,30,482,482);gradient.addColorStop(0,p.a);gradient.addColorStop(.58,p.b);gradient.addColorStop(1,p.c);c.fillStyle=gradient;c.fillRect(0,0,512,512);
      c.save();c.fillStyle='rgba(255,255,255,.18)';c.strokeStyle='rgba(255,255,255,.42)';c.lineWidth=5;
      if(state.iconShape==='circle'){c.beginPath();c.arc(256,256,208,0,Math.PI*2);c.fill();c.stroke()}
      else if(state.iconShape==='square'){c.fillRect(48,48,416,416);c.strokeRect(48,48,416,416)}
      else{c.beginPath();c.roundRect(48,48,416,416,104);c.fill();c.stroke()}
      c.fillStyle='#fff';c.textAlign='center';c.textBaseline='middle';c.font='bold 220px Arial';c.shadowColor='rgba(0,0,0,.2)';c.shadowBlur=20;c.fillText(symbol,256,265);c.restore();
      iconCanvas.toBlob(blob=>blob?blob.arrayBuffer().then(buffer=>resolve(new Uint8Array(buffer))).catch(reject):reject(new Error('تعذر إنشاء إحدى صور الأيقونات')),'image/png');
    });
  }
  async function buildThemePackBlob(){
    readControls();
    const previousMode=state.screenMode;
    let wallpaper;
    try{
      state.screenMode='wallpaper';
      render();
      wallpaper=await canvasBlob();
    }finally{
      state.screenMode=previousMode;
      render();
    }
    const files=[{name:'wallpaper.png',data:new Uint8Array(await wallpaper.arrayBuffer())}];
    const p=palettes[state.palette]||palettes.violet;
    for(const [symbol,key] of appIcons){
      files.push({name:`icons/${key}.png`,data:await makeIconBlob(symbol,p)});
    }
    const completeConfig=designConfig();
    const packageData={format:'wallpaperhub-theme',version:2,name:state.title,createdAt:new Date().toISOString(),config:completeConfig};
    const manifest={
      format:'wallpaperhub-theme-package',
      version:2,
      name:state.title,
      createdAt:new Date().toISOString(),
      palette:state.palette,
      paletteColors:[p.a,p.b,p.c,p.accent,p.light],
      preset:state.preset,
      iconShape:state.iconShape,
      iconScale:state.iconScale,
      config:completeConfig,
      assets:{wallpaper:'wallpaper.png',icons:appIcons.map(item=>'icons/'+item[1]+'.png'),settings:'theme-config.json'},
      platform:'Portable wallpaper, icons and selected widget layouts. Native Android home-screen widgets require a companion Android app or compatible launcher.'
    };
    files.push({name:'theme-config.json',data:new TextEncoder().encode(JSON.stringify(packageData,null,2))});
    files.push({name:'manifest.json',data:new TextEncoder().encode(JSON.stringify(manifest,null,2))});
    files.push({name:'اقرأني.txt',data:new TextEncoder().encode('حزمة ثيم WallpaperHub\n\nالمحتويات:\n- wallpaper.png: خلفية الهاتف بدقة 1080 × 1920.\n- icons/: تسع صور أيقونات PNG منفصلة.\n- theme-config.json: جميع إعدادات المصمم، بما فيها الألوان والساعة والأيقونات والودجات المختارة وأحجامها وأشكالها ومدينة الطقس ومواضع العناصر ونوع الشاشة.\n- manifest.json: معلومات الحزمة والأصول.\n\nاستيراد الإعدادات إلى WallpaperHub: افتح استوديو التخصيص، اضغط استيراد ثيم، واختر ملف ZIP نفسه أو theme-config.json.\n\nتطبيق على الهاتف: احفظ wallpaper.png كخلفية، ثم استخدم Launcher يدعم الأيقونات المخصصة واختر صور icons واحدة تلو الأخرى.\n\nتنبيه: هذه حزمة إعدادات وصور وليست APK. تثبيت ودجات Android أصلية يحتاج تطبيقاً مرافقاً أو Launcher يدعمها؛ اختيارات الودجات تُحفظ مع الثيم وتظهر في معاينة WallpaperHub.')});
    return zipStored(files);
  }
  async function downloadThemePack(){
    const button=$('#downloadThemePack');if(button.disabled)return;
    button.disabled=true;
    const oldText=button.innerHTML;
    button.innerHTML='<span class="material-icons-round">sync</span> تجهيز الحزمة...';
    try{
      const zip=await buildThemePackBlob();
      const url=URL.createObjectURL(zip);
      const link=document.createElement('a');
      link.href=url;
      link.download=`wallpaperhub-theme-${Date.now()}.zip`;
      link.click();
      setTimeout(()=>URL.revokeObjectURL(url),2500);
      toast('تم تنزيل حزمة الهاتف مع الخلفية والأيقونات وجميع الإعدادات');
    }catch(error){
      console.error('STUDIO THEME EXPORT:',error);
      toast(error.message||'تعذر إنشاء حزمة الثيم');
    }finally{
      button.disabled=false;
      button.innerHTML=oldText;
    }
  }
    
  function downloadBlob(blob,fileName){
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;
    link.download=fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),3000);
  }
  function downloadThemeConfig(){
    try{
      readControls();
      const payload={
        format:'wallpaperhub-theme',
        version:2,
        name:state.title,
        createdAt:new Date().toISOString(),
        config:designConfig()
      };
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
      downloadBlob(blob,'wallpaperhub-theme-settings.json');
      toast('تم تصدير جميع إعدادات الثيم إلى ملف JSON');
    }catch(error){
      console.error('STUDIO CONFIG EXPORT:',error);
      toast(error.message||'تعذر تصدير الإعدادات');
    }
  }
  async function unzipThemeConfig(file){
    const buffer=await file.arrayBuffer();
    const view=new DataView(buffer);
    const bytes=new Uint8Array(buffer);
    const decoder=new TextDecoder();
    let offset=0;
    let manifestText='';
    let configText='';
    while(offset+30<=bytes.length&&view.getUint32(offset,true)===0x04034b50){
      const flags=view.getUint16(offset+6,true);
      const method=view.getUint16(offset+8,true);
      const compressedSize=view.getUint32(offset+18,true);
      const nameLength=view.getUint16(offset+26,true);
      const extraLength=view.getUint16(offset+28,true);
      const nameStart=offset+30;
      const name=decoder.decode(bytes.subarray(nameStart,nameStart+nameLength));
      const dataStart=nameStart+nameLength+extraLength;
      const dataEnd=dataStart+compressedSize;
      if(dataEnd>bytes.length)throw new Error('ملف ZIP غير مكتمل أو تالف');
      if(name==='theme-config.json'||name==='manifest.json'){
        let payload=bytes.subarray(dataStart,dataEnd);
        if(method===8){
          if(typeof DecompressionStream!=='function')throw new Error('متصفحك لا يدعم فك ضغط هذه الحزمة؛ نزّل ملف JSON بدلاً منها');
          const stream=new Blob([payload]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
          payload=new Uint8Array(await new Response(stream).arrayBuffer());
        }else if(method!==0){
          throw new Error('صيغة ضغط ZIP غير مدعومة. استخدم حزمة WallpaperHub الأصلية.');
        }
        const textValue=decoder.decode(payload);
        if(name==='theme-config.json')configText=textValue;
        else manifestText=textValue;
      }
      offset=dataEnd;
      if(flags&8)throw new Error('حزمة ZIP تستخدم تنسيقاً غير مدعوم. أعد تنزيلها من WallpaperHub.');
    }
    const raw=configText||manifestText;
    if(!raw)throw new Error('لم نعثر على إعدادات الثيم داخل ملف ZIP');
    return JSON.parse(raw);
  }
  function normalizeImportedTheme(data){
    if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('ملف الثيم غير صالح');
    const config=data.config||data.theme?.config||data.manifest?.config||data;
    if(!config||typeof config!=='object'||Array.isArray(config))throw new Error('لا يحتوي الملف على إعدادات قابلة للاستيراد');
    if(config.format==='wallpaperhub-theme'&&config.config) return normalizeImportedTheme(config);
    const allowedTools=['wallpaper','theme','icons','widget','lock'];
    const safe={
      ...config,
      tool:allowedTools.includes(config.tool)?config.tool:'wallpaper',
      title:String(data.name||data.title||config.title||'ثيم مستورد').slice(0,60),widgets:Array.isArray(config.widgets)?[...new Set(config.widgets.filter(function(id){return widgetIds.has(id);}))].slice(0,6):[],widgetShape:['rounded','square','glass'].includes(config.widgetShape)?config.widgetShape:'rounded',widgetScale:Math.max(80,Math.min(120,Number(config.widgetScale)||100)),widgetCity:widgetCities[config.widgetCity]?config.widgetCity:'casablanca',widgetNote:String(config.widgetNote||'').slice(0,80)
    };
    if(safe.backgroundUrl){
      try{
        const url=new URL(String(safe.backgroundUrl),location.origin);
        if(url.protocol!=='https:')safe.backgroundUrl=null;
        else safe.backgroundUrl=url.href;
      }catch(_error){safe.backgroundUrl=null}
    }
    return safe;
  }
  async function importThemeFile(file){
    if(!file)return;
    if(file.size>35*1024*1024){toast('حجم ملف الثيم كبير جداً؛ الحد الأقصى 35MB');return}
    const button=$('#importThemeButton');
    if(button)button.disabled=true;
    try{
      let parsed;
      const isZip=/\.zip$|\.whubtheme$/i.test(file.name)||file.type==='application/zip';
      if(isZip)parsed=await unzipThemeConfig(file);
      else{
        if(file.size>2*1024*1024)throw new Error('ملف إعدادات JSON أكبر من الحجم المتوقع');
        parsed=JSON.parse(await file.text());
      }
      const config=normalizeImportedTheme(parsed);
      await loadDraftIntoEditor({id:null,title:config.title||'ثيم مستورد',category:config.tool,config:config},{asCopy:true});
      toast('تم استيراد الثيم بكل إعداداته. هذه نسخة خاصة بك.');
      history.replaceState(null,'',location.pathname+location.hash);
    }catch(error){
      console.error('STUDIO THEME IMPORT:',error);
      toast(error.message||'تعذر استيراد ملف الثيم');
    }finally{
      if(button)button.disabled=false;
      $('#importThemeFile').value='';
    }
  }
  async function loadSharedTheme(themeId){
    const id=String(themeId||'').trim();
    if(!/^[0-9a-f-]{20,60}$/i.test(id)){toast('رابط الثيم غير صالح');return}
    if(!state.client){toast('تعذر الاتصال باستوديو الثيمات');return}
    try{
      toast('جاري تحميل إعدادات الثيم المشترك...');
      const {data,error}=await state.client.from('studio_designs')
        .select('id,title,category,config,image_url,created_at')
        .eq('id',id)
        .eq('visibility','published')
        .single();
      if(error||!data)throw error||new Error('لم نعثر على هذا الثيم أو لم يعد منشوراً');
      await loadDraftIntoEditor(data,{asCopy:true});
      history.replaceState(null,'',location.pathname+location.hash);
      toast('تم استيراد ثيم المجتمع كنسخة مستقلة. يمكنك تعديله وحفظه باسمك.');
    }catch(error){
      console.warn('STUDIO SHARED THEME IMPORT:',error);
      toast(error.message||'تعذر استيراد الثيم المشترك');
    }
  }

  function reset(){
    state.palette='violet';state.preset='aurora';state.title='لمسة بنفسجية';state.subtitle='اصنع لحظتك الخاصة';state.glow=65;state.clock=true;state.clockStyle='digital';state.clockFormat='24';state.clockSize=100;state.clockColor='auto';state.showDate=true;state.showStatusBar=true;state.screenMode=state.tool==='icons'||state.tool==='theme'||state.tool==='widget'?'home':'lock';state.iconShape='rounded';state.iconScale=100;state.showIconLabels=true;state.widgets=['chrome','weather','calendar'];state.widgetShape='rounded';state.widgetScale=100;state.widgetCity='casablanca';state.widgetNote='ملاحظة جميلة لهذا اليوم';state.clockX=540;state.clockY=400;state.appsX=540;state.appsY=1050;state.subtitleX=540;state.subtitleY=1740;state.savedId=null;state.shareImageUrl=null;state.shareThemeUrl=null;state.shareSaved=false;state.shareConfigKey=null;state.successfulDestinations=new Set();
    $('#designTitle').value=state.title;$('#designSubtitle').value=state.subtitle;$('#glowStrength').value='65';$('#showClock').checked=true;$('#clockStyle').value='digital';$('#clockFormat').value='24';$('#clockSize').value='100';$('#clockColor').value='auto';$('#showDate').checked=true;$('#showStatusBar').checked=true;$('#iconShape').value='rounded';$('#iconScale').value='100';$('#showIconLabels').checked=true;$('#widgetShape').value='rounded';$('#widgetScale').value='100';$('#widgetCity').value='casablanca';syncWidgetUI();
    syncChoice('.screen-mode-button','screenMode',state.screenMode,'is-active');syncChoice('.tool-card','tool',state.tool,'is-active');syncChoice('.palette-swatch','palette','violet','selected');syncChoice('.preset-button','preset','aurora','selected');
    loadBackground('').then(()=>{$('#removeBackgroundImage').classList.add('hidden');$('#backgroundImageStatus').textContent='JPG · PNG · WEBP · AVIF — حتى 15MB'});readControls();toast('تمت إعادة ضبط التصميم');
  }
  function openPublishModal(){
    if(!state.user||!state.client){toast('سجّل الدخول أولاً لمشاركة تصميمك');location.href='/login';return}
    readControls();
    const configKey=JSON.stringify(designConfig());
    if(state.shareConfigKey!==configKey){
      state.shareConfigKey=configKey;
      state.shareImageUrl=null;
      state.shareThemeUrl=null;
      state.shareSaved=false;
      state.successfulDestinations=new Set();
    }
    $('#publishCaption').value=state.subtitle||state.title;
    $('#publishDestinationsModal').classList.remove('hidden');
    $('#publishDestinationsModal').setAttribute('aria-hidden','false');
    requestAnimationFrame(()=>$('#publishDestinationsModal').classList.add('is-open'));
    $('#multiPublishStatus').classList.add('hidden');
    loadShareForums();
  }
  function closePublishModal(){const modal=$('#publishDestinationsModal');modal.classList.remove('is-open');modal.setAttribute('aria-hidden','true');setTimeout(()=>{if(!modal.classList.contains('is-open'))modal.classList.add('hidden')},200)}
  async function loadShareForums(){const target=$('#publishForumChoices'),all=$('#selectAllForums');target.innerHTML='<div class="forum-choice-empty">جاري تحميل منتدياتك...</div>';all.disabled=true;try{const {data:members,error:memberError}=await state.client.from('community_room_members').select('room_id,role,status').eq('user_id',state.user.id).eq('status','active');if(memberError)throw memberError;const ids=(members||[]).map(m=>m.room_id);if(!ids.length){state.forums=[];target.innerHTML='<div class="forum-choice-empty">لا تنتمي إلى أي منتدى بعد.<br><a href="/community.html">أنشئ منتدى أو انضم إلى منتدى من صفحة المجتمع</a></div>';return}const {data:rooms,error:roomError}=await state.client.from('community_rooms').select('id,name,is_private').in('id',ids).order('name');if(roomError)throw roomError;state.forums=rooms||[];target.replaceChildren();if(!state.forums.length){target.innerHTML='<div class="forum-choice-empty">لا توجد منتديات متاحة حالياً.</div>';return}state.forums.forEach(room=>{const label=document.createElement('label');label.className='publish-forum-choice';const input=document.createElement('input');input.type='checkbox';input.value=room.id;input.dataset.forumId=room.id;const name=document.createElement('span');name.textContent=`${room.is_private?'🔒 ':'🌐 '}${room.name}`;label.append(input,name);target.append(label)});all.disabled=false}catch(error){console.warn('STUDIO LOAD FORUMS:',error);state.forums=[];target.innerHTML='<div class="forum-choice-empty">تعذر تحميل المنتديات. تأكد أنك عضو في المنتدى وأن قاعدة بيانات المنتديات مفعّلة.</div>'}}
  function showPublishStatus(message,isError=false){const node=$('#multiPublishStatus');node.textContent=message;node.classList.toggle('is-error',isError);node.classList.remove('hidden')}
  async function publishToSelectedDestinations(){
    if(state.publishing)return;
    if(!state.user||!state.client){toast('سجّل الدخول أولاً');return}
    const selected=[];
    if($('#publishToPosts').checked)selected.push({key:'posts',label:'منشورات المجتمع'});
    if($('#publishToGeneral').checked)selected.push({key:'general',label:'دردشة المجتمع العامة'});
    $$('.publish-forum-choice input:checked').forEach(input=>{
      const room=state.forums.find(item=>String(item.id)===String(input.value));
      selected.push({key:`forum:${input.value}`,label:`منتدى ${room?.name||''}`,roomId:input.value,room});
    });
    if(!selected.length){showPublishStatus('اختر وجهة واحدة على الأقل قبل النشر.',true);return}
    const pending=selected.filter(item=>!state.successfulDestinations.has(item.key));
    if(!pending.length){
      showPublishStatus('تم النشر مسبقاً في جميع الوجهات المختارة.');
      toast('هذا التصميم منشور بالفعل في الوجهات المحددة');
      return;
    }
    state.publishing=true;
    const button=$('#confirmMultiPublish');
    button.disabled=true;
    button.innerHTML='<span class="material-icons-round">sync</span> جاري النشر...';
    showPublishStatus('يتم تجهيز التصميم ومشاركته في الوجهات التي لم يكتمل النشر فيها...');
    try{
      readControls();
      if(!state.shareImageUrl){
        const blob=await canvasBlob();
        state.shareImageUrl=await uploadToImageKit(blob,`studio-design-${Date.now()}.png`);
      }
      if(!state.shareThemeUrl){
        const themeBlob=await buildThemePackBlob();
        state.shareThemeUrl=await uploadToImageKit(themeBlob,`wallpaperhub-theme-${Date.now()}.zip`);
      }
      if(!state.shareSaved){
        await savePublishedDesign(state.shareImageUrl,state.shareThemeUrl);
        state.shareSaved=true;
      }
      const imageUrl=state.shareImageUrl;
      const themeUrl=state.shareThemeUrl;
      const caption=$('#publishCaption').value.trim().slice(0,1550)||state.title;
      const shareText=`${caption}\n\n📦 ملف الثيم ZIP: ${themeUrl}`;
      const jobs=pending.map(item=>({
        key:item.key,
        label:item.label,
        promise:(async()=>{
          if(item.key==='posts'){
            const {error}=await state.client.from('social_posts').insert({
              user_id:state.user.id,author_name:profileName(),author_avatar:profileAvatar(),
              body:shareText,media_url:imageUrl,media_type:'image/png'
            });
            if(error)throw error;
            return;
          }
          if(item.key==='general'){
            const token=await authToken();
            const response=await fetch('/api/community/messages',{
              method:'POST',
              headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
              body:JSON.stringify({content:shareText,imageUrl})
            });
            const result=await response.json().catch(()=>({}));
            if(!response.ok||result.success===false)throw new Error(result.message||'تعذر النشر في دردشة المجتمع');
            return;
          }
          const token=await authToken();
          const moderationResponse=await fetch('/api/community/moderation/me',{
            headers:{Authorization:`Bearer ${token}`},cache:'no-store'
          });
          const moderationResult=await moderationResponse.json().catch(()=>({}));
          if(!moderationResponse.ok||moderationResult?.moderation?.canWrite===false){
            throw new Error(moderationResult?.message||'الكتابة في المنتديات موقوفة لحسابك حالياً');
          }
          const {error}=await state.client.from('community_room_messages').insert({
            room_id:item.roomId,user_id:state.user.id,
            content:shareText,image_url:imageUrl
          });
          if(error)throw error;
        })()
      }));
      const settled=await Promise.allSettled(jobs.map(job=>job.promise));
      const ok=[];
      const failed=[];
      settled.forEach((result,index)=>{
        const job=jobs[index];
        if(result.status==='fulfilled'){
          state.successfulDestinations.add(job.key);
          ok.push(job.label);
        }else{
          failed.push(`${job.label}: ${result.reason?.message||'تعذر النشر'}`);
        }
      });
      await loadGallery();
      await loadDrafts();
      const summary=ok.length?`تم النشر بنجاح في: ${ok.join('، ')}.`:'لم تنجح أي وجهة في هذه المحاولة.';
      const suffix=failed.length?` تعذر النشر في ${failed.length} وجهة: ${failed.join('؛ ')}. يمكنك إعادة المحاولة دون تكرار الوجهات الناجحة.`:'';
      showPublishStatus(summary+suffix,failed.length>0);
      if(!failed.length){
        toast('تم نشر تصميمك في جميع الوجهات المختارة');
        setTimeout(closePublishModal,1200);
      }else if(ok.length){
        toast('تم النشر جزئياً؛ يمكنك إعادة محاولة الوجهات الفاشلة فقط');
      }else{
        toast('تعذر النشر في الوجهات المختارة؛ يمكنك إعادة المحاولة');
      }
    }catch(error){
      console.error('STUDIO MULTI PUBLISH:',error);
      showPublishStatus(error.message||'تعذر نشر التصميم. تحقق من إعداد ImageKit والاتصال.',true);
      toast(error.message||'تعذر نشر التصميم');
    }finally{
      state.publishing=false;
      button.disabled=false;
      button.innerHTML='<span class="material-icons-round">send</span> نشر في الاختيارات';
    }
  }
  function profileName(){const m=state.user?.user_metadata||{};return m.full_name||m.name||m.user_name||state.user?.email?.split('@')[0]||'عضو WallpaperHub'}
  function profileAvatar(){const m=state.user?.user_metadata||{};return m.avatar_url||m.picture||''}

  function canvasPoint(event){const rect=canvas.getBoundingClientRect();return {x:(event.clientX-rect.left)/rect.width*canvas.width,y:(event.clientY-rect.top)/rect.height*canvas.height}}
  function onCanvasPointerDown(event){
    const point=canvasPoint(event);let target=null;
    if(state.screenMode==='lock'&&state.clock&&Math.abs(point.x-state.clockX)<430&&Math.abs(point.y-state.clockY)<190)target='clock';
    else if((state.screenMode==='home'||state.tool==='icons'||state.tool==='theme')&&Math.abs(point.x-state.appsX)<490&&point.y>=state.appsY-35&&point.y<=state.appsY+790)target='apps';
    else if(state.subtitle&&Math.abs(point.x-state.subtitleX)<470&&Math.abs(point.y-state.subtitleY)<75)target='subtitle';
    if(!target)return;state.dragTarget={target,point};canvas.setPointerCapture?.(event.pointerId);canvas.style.cursor='grabbing';event.preventDefault();
  }
  function onCanvasPointerMove(event){
    if(!state.dragTarget)return;const point=canvasPoint(event),dx=point.x-state.dragTarget.point.x,dy=point.y-state.dragTarget.point.y;
    if(state.dragTarget.target==='clock'){state.clockX=Math.max(160,Math.min(920,state.clockX+dx));state.clockY=Math.max(180,Math.min(1180,state.clockY+dy))}
    if(state.dragTarget.target==='apps'){state.appsX=Math.max(250,Math.min(830,state.appsX+dx));state.appsY=Math.max(450,Math.min(1120,state.appsY+dy))}
    if(state.dragTarget.target==='subtitle'){state.subtitleX=Math.max(100,Math.min(980,state.subtitleX+dx));state.subtitleY=Math.max(1450,Math.min(1850,state.subtitleY+dy))}
    state.dragTarget.point=point;render();
  }
  function onCanvasPointerUp(){state.dragTarget=null;canvas.style.cursor='grab'}
  
    $$('.tool-card').forEach(button=>button.addEventListener('click',()=>updateTool(button.dataset.tool)));
  $$('.screen-mode-button').forEach(button=>button.addEventListener('click',()=>{state.screenMode=button.dataset.screenMode;syncChoice('.screen-mode-button','screenMode',state.screenMode,'is-active');render()}));
  canvas.addEventListener('pointerdown',onCanvasPointerDown);canvas.addEventListener('pointermove',onCanvasPointerMove);canvas.addEventListener('pointerup',onCanvasPointerUp);canvas.addEventListener('pointercancel',onCanvasPointerUp);canvas.addEventListener('click',onWidgetCanvasClick);
  $$('.palette-swatch').forEach(button=>button.addEventListener('click',()=>{state.palette=button.dataset.palette;syncChoice('.palette-swatch','palette',state.palette,'selected');render()}));
  $$('.preset-button').forEach(button=>button.addEventListener('click',()=>{state.preset=button.dataset.preset;syncChoice('.preset-button','preset',state.preset,'selected');render()}));
  ['#designTitle','#designSubtitle','#glowStrength','#showClock','#clockStyle','#clockFormat','#clockSize','#clockColor','#showDate','#showStatusBar','#iconShape','#iconScale','#showIconLabels'].forEach(selector=>{const node=$(selector);node.addEventListener('input',readControls);node.addEventListener('change',readControls)});
  $('#chooseBackgroundImage').addEventListener('click',()=>{if(!state.user){toast('سجّل الدخول أولاً');location.href='/login';return}$('#backgroundImageInput').click()});
  $('#backgroundImageInput').addEventListener('change',event=>onChooseBackground(event.target.files?.[0]));
  $('#removeBackgroundImage').addEventListener('click',()=>{loadBackground('').then(()=>{$('#removeBackgroundImage').classList.add('hidden');$('#backgroundImageStatus').textContent='JPG · PNG · WEBP · AVIF — حتى 15MB';toast('تمت إزالة الصورة من التصميم')})});
  $('#downloadDesign').addEventListener('click',download);
  $('#downloadThemePack').addEventListener('click',downloadThemePack);
  $('#downloadThemeConfig').addEventListener('click',downloadThemeConfig);
  $('#importThemeButton').addEventListener('click',()=>$('#importThemeFile').click());
  $('#importThemeFile').addEventListener('change',event=>importThemeFile(event.target.files?.[0]));
  $('#gallerySearch').addEventListener('input',renderGallery);
  $('#widgetCatalog').addEventListener('click',function(event){var button=event.target.closest('[data-widget]');if(button)toggleWidget(button.dataset.widget);});
  $('#widgetShape').addEventListener('change',readControls);$('#widgetScale').addEventListener('input',readControls);
  $('#widgetCity').addEventListener('change',function(){state.widgetCity=$('#widgetCity').value;refreshWeather();});$('#refreshWeather').addEventListener('click',refreshWeather);
  $$('.gallery-filter').forEach(button=>button.addEventListener('click',()=>{
    state.galleryFilter=button.dataset.galleryFilter||'all';
    syncChoice('.gallery-filter','galleryFilter',state.galleryFilter,'is-active');
    renderGallery();
  }));
  $('#saveDraft').addEventListener('click',()=>saveDesign('draft'));
  $('#publishDesign').addEventListener('click',openPublishModal);
  $('#resetDesign').addEventListener('click',reset);
  $('#studioProfile').addEventListener('click',()=>{location.href=state.user?'/profile':'/login'});
  $('#closePublishDestinations').addEventListener('click',closePublishModal);$('#publishDestinationsModal').addEventListener('click',event=>{if(event.target===$('#publishDestinationsModal'))closePublishModal()});$('#confirmMultiPublish').addEventListener('click',publishToSelectedDestinations);$('#selectAllForums').addEventListener('click',()=>{$$('#publishForumChoices input[type="checkbox"]').forEach(input=>input.checked=true)});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('#publishDestinationsModal').classList.contains('hidden'))closePublishModal()});
  syncChoice('.tool-card','tool',state.tool,'is-active');syncChoice('.screen-mode-button','screenMode',state.screenMode,'is-active');syncChoice('.palette-swatch','palette',state.palette,'selected');syncChoice('.preset-button','preset',state.preset,'selected');syncChoice('.gallery-filter','galleryFilter',state.galleryFilter,'is-active');
  renderWidgetCatalog();render();if(state.widgets.indexOf('weather')>=0)refreshWeather();if(document.fonts?.ready)document.fonts.ready.then(render).catch(()=>{});let lastLiveClockStamp='';setInterval(()=>{const now=new Date(),stamp=state.clockStyle==='analog'?`a-${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`:`d-${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;if(stamp!==lastLiveClockStamp){lastLiveClockStamp=stamp;render()}},1000);initSupabase();
})();
