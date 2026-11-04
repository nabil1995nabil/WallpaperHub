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
  const state={tool:'wallpaper',palette:'violet',preset:'aurora',title:'لمسة بنفسجية',subtitle:'اصنع لحظتك الخاصة',glow:65,clock:true,clockStyle:'digital',clockFormat:'24',clockSize:100,clockColor:'auto',showDate:true,showStatusBar:true,screenMode:'lock',iconShape:'rounded',iconScale:100,showIconLabels:true,clockX:540,clockY:400,appsX:540,appsY:1050,subtitleX:540,subtitleY:1740,dragTarget:null,client:null,user:null,savedId:null,backgroundUrl:'',backgroundImage:null,forums:[],publishing:false,shareImageUrl:null,shareSaved:false,successfulDestinations:new Set()};
  const canvas=$('#designCanvas');
  const ctx=canvas?.getContext('2d');
  const toastNode=$('#studioToast');

  function toast(message){if(!toastNode)return;toastNode.textContent=message;toastNode.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>toastNode.classList.remove('show'),3200)}
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
    const now=new Date(),time=formatLiveTime(now),date=formatLiveDate(now);
    roundedRect(105,250,870,330,45,'rgba(255,255,255,.16)','rgba(255,255,255,.36)');
    ctx.fillStyle=p.light;ctx.textAlign='right';ctx.textBaseline='alphabetic';ctx.font='700 40px Cairo, sans-serif';ctx.fillText('الوقت والتاريخ',900,335);
    ctx.font='700 104px Cairo, sans-serif';ctx.fillText(time,900,460);
    ctx.font='34px Cairo, sans-serif';ctx.globalAlpha=.9;ctx.fillText(date,900,520);ctx.globalAlpha=1;
    roundedRect(105,610,870,190,35,'rgba(255,255,255,.12)','rgba(255,255,255,.26)');
    ctx.fillStyle=p.light;ctx.textAlign='center';ctx.font='600 38px Cairo, sans-serif';ctx.fillText('تقويم اليوم',540,680);
    ctx.font='32px Cairo, sans-serif';ctx.fillText(new Intl.DateTimeFormat('ar-MA',{day:'numeric',month:'long',year:'numeric'}).format(now),540,745);
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
      drawIcons(p);
      if(state.tool==='widget')drawWidget(p);
    }else if(state.screenMode==='lock'){
      if(state.tool==='icons'||state.tool==='theme')drawIcons(p);
      else if(state.tool==='widget')drawWidget(p);
    }
    if(state.screenMode==='lock'&&state.clock)drawLiveClock(p,now);
    drawStatusBar(p,now);
    if(state.subtitle){ctx.save();ctx.fillStyle='rgba(255,255,255,.94)';ctx.textAlign='center';ctx.font='500 34px Cairo, sans-serif';ctx.fillText(state.subtitle.slice(0,48),state.subtitleX,state.subtitleY);ctx.restore()}
    ctx.textAlign='center';ctx.fillStyle='rgba(255,255,255,.48)';ctx.font='600 22px Cairo, sans-serif';ctx.fillText('WALLPAPERHUB',540,1850);
  }
  function updateTool(tool){if(!toolLabels[tool])return;state.tool=tool;if(tool==='lock')state.screenMode='lock';else if(['icons','theme','widget'].includes(tool))state.screenMode='home';else state.screenMode='lock';$$('.tool-card').forEach(b=>b.classList.toggle('is-active',b.dataset.tool===tool));$$('.screen-mode-button').forEach(b=>b.classList.toggle('is-active',b.dataset.screenMode===state.screenMode));$('#activeToolLabel').textContent=toolLabels[tool];render()}
  function readControls(){state.title=$('#designTitle').value.trim()||'تصميم جديد';state.subtitle=$('#designSubtitle').value.trim();state.glow=Number($('#glowStrength').value)||0;state.clock=$('#showClock').checked;state.clockStyle=$('#clockStyle').value;state.clockFormat=$('#clockFormat').value;state.clockSize=Number($('#clockSize').value)||112;state.clockColor=$('#clockColor').value;state.showDate=$('#showDate').checked;state.showStatusBar=$('#showStatusBar').checked;state.iconShape=$('#iconShape').value;state.iconScale=Number($('#iconScale').value)||100;state.showIconLabels=$('#showIconLabels').checked;$('#glowValue').textContent=`${state.glow}%`;$('#clockSizeValue').textContent=`${state.clockSize}%`;$('#iconScaleValue').textContent=`${state.iconScale}%`;render()}
  function designConfig(){return {tool:state.tool,palette:state.palette,preset:state.preset,title:state.title,subtitle:state.subtitle,glow:state.glow,clock:state.clock,clockStyle:state.clockStyle,clockFormat:state.clockFormat,clockSize:state.clockSize,clockColor:state.clockColor,showDate:state.showDate,showStatusBar:state.showStatusBar,screenMode:state.screenMode,iconShape:state.iconShape,iconScale:state.iconScale,showIconLabels:state.showIconLabels,clockX:state.clockX,clockY:state.clockY,appsX:state.appsX,appsY:state.appsY,subtitleX:state.subtitleX,subtitleY:state.subtitleY,backgroundUrl:state.backgroundUrl||null}}
  function dataForSave(visibility,imageUrl=null){return {user_id:state.user.id,title:state.title,category:state.tool,visibility,config:designConfig(),image_url:imageUrl,updated_at:new Date().toISOString()}}
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
  async function initSupabase(){try{const r=await fetch('/api/supabase/config',{cache:'no-store'});if(!r.ok)throw new Error('config');const cfg=await r.json();state.client=window.supabase.createClient(cfg.url,cfg.anonKey);const {data}=await state.client.auth.getSession();state.user=data?.session?.user||null;updateProfile();state.client.auth.onAuthStateChange((_event,session)=>{state.user=session?.user||null;updateProfile();loadDrafts()});loadGallery();loadDrafts()}catch(error){console.warn('STUDIO SUPABASE INIT:',error);updateProfile();loadGallery()}}
  function updateProfile(){const node=$('#studioAvatar');if(!node)return;const meta=state.user?.user_metadata||{};const avatar=meta.avatar_url||meta.avatarUrl||meta.picture||'';if(avatar){node.innerHTML='';const img=document.createElement('img');img.src=avatar;img.alt='';node.appendChild(img)}else node.textContent=(meta.full_name||meta.name||state.user?.email||'U').trim().slice(0,1).toUpperCase()}
  async function saveDesign(visibility){if(!state.user||!state.client){toast('سجّل الدخول أولاً لحفظ تصميمك');return}const button=visibility==='published'?$('#publishDesign'):$('#saveDraft');button.disabled=true;try{const payload=dataForSave(visibility,null);let query;if(state.savedId){query=await state.client.from('studio_designs').update(payload).eq('id',state.savedId).eq('user_id',state.user.id).select('id').single()}else{query=await state.client.from('studio_designs').insert(payload).select('id').single()}if(query.error)throw query.error;state.savedId=query.data.id;toast('تم حفظ التصميم في مسوداتك');loadDrafts()}catch(error){console.error('STUDIO SAVE:',error);toast(error.message?.includes('studio_designs')?'حدّث جدول الاستوديو بتشغيل ملف studio-designs.sql':'تعذر حفظ التصميم، تحقق من اتصالك ثم حاول مجدداً')}finally{button.disabled=false}}
  async function savePublishedDesign(imageUrl){const payload=dataForSave('published',imageUrl);let query;if(state.savedId){query=await state.client.from('studio_designs').update(payload).eq('id',state.savedId).eq('user_id',state.user.id).select('id').single()}else{query=await state.client.from('studio_designs').insert(payload).select('id').single()}if(query.error)throw query.error;state.savedId=query.data.id}
  async function loadGallery(){const target=$('#creationGrid');if(!target)return;if(!state.client){target.innerHTML='<div class="gallery-loading"><span class="material-icons-round">cloud_off</span><b>المعرض يحتاج اتصال قاعدة البيانات</b><small>يمكنك تجربة المصمم وتنزيل إبداعاتك الآن.</small></div>';return}try{const {data,error}=await state.client.from('studio_designs').select('id,title,category,config,image_url,created_at').eq('visibility','published').order('created_at',{ascending:false}).limit(12);if(error)throw error;target.replaceChildren();if(!data?.length){target.innerHTML='<div class="gallery-loading"><span class="material-icons-round">auto_awesome</span><b>كن أول من يشارك إبداعه</b><small>صمّم شيئاً جميلاً ثم انشره ليظهر هنا.</small></div>';return}data.forEach(item=>{const p=palettes[item.config?.palette]||palettes.violet;const card=document.createElement('article');card.className='creation-card';const art=document.createElement('div');art.className='creation-art';if(item.image_url){const image=document.createElement('img');image.src=item.image_url;image.alt=item.title||'تصميم من المجتمع';image.loading='lazy';art.appendChild(image)}else{art.style.setProperty('--art-bg',`linear-gradient(145deg,${p.a},${p.b},${p.c})`);const icon=document.createElement('span');icon.className='material-icons-round';icon.textContent=({wallpaper:'landscape',theme:'palette',icons:'apps',widget:'dashboard_customize',lock:'lock'})[item.category]||'auto_awesome';art.appendChild(icon)}const meta=document.createElement('div');meta.className='creation-meta';const title=document.createElement('b');title.textContent=item.title||'تصميم من المجتمع';const sub=document.createElement('small');sub.textContent=`${toolLabels[item.category]||'تصميم'} · ${new Date(item.created_at).toLocaleDateString('ar-MA')}`;meta.append(title,sub);card.append(art,meta);target.appendChild(card)})}catch(error){console.warn('STUDIO GALLERY:',error);target.innerHTML='<div class="gallery-loading"><span class="material-icons-round">info</span><b>المعرض غير متاح حالياً</b><small>تأكد من تشغيل studio-designs.sql المحدّث في Supabase.</small></div>'}}
  async function loadDraftIntoEditor(item){
    const c=item.config||{};state.savedId=item.id;
    state.tool=toolLabels[c.tool]?c.tool:'wallpaper';state.palette=palettes[c.palette]?c.palette:'violet';state.preset=presets.includes(c.preset)?c.preset:'aurora';
    state.title=String(item.title||c.title||'تصميم محفوظ');state.subtitle=String(c.subtitle||'');state.glow=Math.max(0,Math.min(100,Number(c.glow??65)));state.clock=c.clock!==false;
    state.clockStyle=c.clockStyle==='analog'?'analog':'digital';state.clockFormat=c.clockFormat==='12'?'12':'24';state.clockSize=Math.max(70,Math.min(150,Number(c.clockSize)||100));state.clockColor=['auto','white','dark','gold'].includes(c.clockColor)?c.clockColor:'auto';state.showDate=c.showDate!==false;state.showStatusBar=c.showStatusBar!==false;
    state.screenMode=['lock','home','wallpaper'].includes(c.screenMode)?c.screenMode:(['icons','theme','widget'].includes(state.tool)?'home':'lock');state.iconShape=['rounded','circle','square'].includes(c.iconShape)?c.iconShape:'rounded';state.iconScale=Math.max(75,Math.min(125,Number(c.iconScale)||100));state.showIconLabels=c.showIconLabels!==false;
    state.clockX=Number(c.clockX)||540;state.clockY=Number(c.clockY)||400;state.appsX=Number(c.appsX)||540;state.appsY=Number(c.appsY)||1050;state.subtitleX=Number(c.subtitleX)||540;state.subtitleY=Number(c.subtitleY)||1740;
    $('#designTitle').value=state.title;$('#designSubtitle').value=state.subtitle;$('#glowStrength').value=String(state.glow);$('#showClock').checked=state.clock;
    $('#clockStyle').value=state.clockStyle;$('#clockFormat').value=state.clockFormat;$('#clockSize').value=String(state.clockSize);$('#clockColor').value=state.clockColor;$('#showDate').checked=state.showDate;$('#showStatusBar').checked=state.showStatusBar;
    $('#iconShape').value=state.iconShape;$('#iconScale').value=String(state.iconScale);$('#showIconLabels').checked=state.showIconLabels;
    $$('.tool-card').forEach(b=>b.classList.toggle('is-active',b.dataset.tool===state.tool));$$('.screen-mode-button').forEach(b=>b.classList.toggle('is-active',b.dataset.screenMode===state.screenMode));$('#activeToolLabel').textContent=toolLabels[state.tool];
    $$('.palette-swatch').forEach(b=>b.classList.toggle('selected',b.dataset.palette===state.palette));$$('.preset-button').forEach(b=>b.classList.toggle('selected',b.dataset.preset===state.preset));
    try{await loadBackground(c.backgroundUrl||'');$('#removeBackgroundImage').classList.toggle('hidden',!state.backgroundUrl);$('#backgroundImageStatus').textContent=state.backgroundUrl?'صورة التصميم المحفوظة جاهزة للتعديل':'JPG · PNG · WEBP · AVIF — حتى 15MB'}catch(error){toast(error.message)}
    readControls();$('#studioEditor').scrollIntoView({behavior:'smooth',block:'start'});toast('تم فتح المسودة في مساحة التصميم');
  }
  async function loadDrafts(){const section=$('#draftSection'),target=$('#draftGrid');if(!section||!target)return;section.classList.toggle('hidden',!state.user);if(!state.user||!state.client){target.innerHTML='<div class="gallery-loading"><span class="material-icons-round">bookmark_border</span><b>سجّل الدخول لحفظ مسوداتك</b><small>يمكنك تنزيل التصميم الآن أو تسجيل الدخول لحفظه.</small></div>';return}try{const {data,error}=await state.client.from('studio_designs').select('id,title,category,config,created_at').eq('visibility','draft').order('updated_at',{ascending:false}).limit(8);if(error)throw error;target.replaceChildren();if(!data?.length){target.innerHTML='<div class="gallery-loading"><span class="material-icons-round">bookmark_add</span><b>لا توجد مسودات بعد</b><small>احفظ أول تصميم لتكمل العمل عليه لاحقاً.</small></div>';return}data.forEach(item=>{const p=palettes[item.config?.palette]||palettes.violet;const button=document.createElement('button');button.type='button';button.className='draft-card';const art=document.createElement('span');art.className='draft-art';if(item.config?.backgroundUrl){art.style.backgroundImage=`url("${String(item.config.backgroundUrl).replace(/["\\]/g,'')}")`;art.style.backgroundSize='cover';art.style.backgroundPosition='center'}else art.style.setProperty('--art-bg',`linear-gradient(145deg,${p.a},${p.b},${p.c})`);art.innerHTML='<span class="material-icons-round">edit</span>';const copy=document.createElement('span');copy.className='draft-copy';const title=document.createElement('b');title.textContent=item.title||'تصميم بدون اسم';const meta=document.createElement('small');meta.textContent=toolLabels[item.category]||'تصميم';copy.append(title,meta);const action=document.createElement('span');action.className='material-icons-round draft-open';action.textContent='arrow_back';button.append(art,copy,action);button.addEventListener('click',()=>loadDraftIntoEditor(item));target.appendChild(button)})}catch(error){console.warn('STUDIO DRAFTS:',error);target.innerHTML='<div class="gallery-loading"><span class="material-icons-round">info</span><b>تعذر تحميل المسودات</b><small>تأكد من تشغيل studio-designs.sql في Supabase.</small></div>'}}
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
  async function downloadThemePack(){
    const button=$('#downloadThemePack');if(button.disabled)return;button.disabled=true;const oldText=button.innerHTML;button.innerHTML='<span class="material-icons-round">sync</span> تجهيز الحزمة...';
    try{
      readControls();const previousMode=state.screenMode;let wallpaper;try{state.screenMode='wallpaper';render();wallpaper=await canvasBlob()}finally{state.screenMode=previousMode;render()}
      const files=[{name:'wallpaper.png',data:new Uint8Array(await wallpaper.arrayBuffer())}],p=palettes[state.palette]||palettes.violet;
      for(const [symbol,key] of appIcons)files.push({name:`icons/${key}.png`,data:await makeIconBlob(symbol,p)});
      const manifest={name:state.title,createdAt:new Date().toISOString(),palette:state.palette,iconShape:state.iconShape,iconScale:state.iconScale,assets:{wallpaper:'wallpaper.png',icons:appIcons.map(([,key])=>`icons/${key}.png`)},note:'PNG assets for manual setup with a launcher that supports custom icons.'};
      files.push({name:'manifest.json',data:new TextEncoder().encode(JSON.stringify(manifest,null,2))});
      files.push({name:'اقرأني.txt',data:new TextEncoder().encode('حزمة تخصيص WallpaperHub\n\n- wallpaper.png: خلفية الهاتف بجودة عالية.\n- مجلد icons: تسع صور أيقونات PNG منفصلة.\n- manifest.json: معلومات الحزمة.\n\nطريقة الاستخدام: عيّن wallpaper.png كخلفية، ثم استخدم تطبيق Launcher يدعم تغيير أيقونات التطبيقات واختر صور PNG من مجلد icons.\n\nتنبيه: هذه ملفات صور وليست تطبيق APK، لذلك لا تثبّت الثيم تلقائياً على نظام الهاتف.')});
      const zip=zipStored(files),url=URL.createObjectURL(zip),link=document.createElement('a');link.href=url;link.download=`wallpaperhub-theme-${Date.now()}.zip`;link.click();setTimeout(()=>URL.revokeObjectURL(url),2500);toast('تم تنزيل حزمة الخلفية و9 أيقونات منفصلة');
    }catch(error){state.screenMode=state.screenMode||'lock';render();console.error('STUDIO THEME EXPORT:',error);toast(error.message||'تعذر إنشاء حزمة الثيم')}
    finally{button.disabled=false;button.innerHTML=oldText}
  }
  
  function reset(){
    state.palette='violet';state.preset='aurora';state.title='لمسة بنفسجية';state.subtitle='اصنع لحظتك الخاصة';state.glow=65;state.clock=true;state.clockStyle='digital';state.clockFormat='24';state.clockSize=100;state.clockColor='auto';state.showDate=true;state.showStatusBar=true;state.screenMode=state.tool==='icons'||state.tool==='theme'||state.tool==='widget'?'home':'lock';state.iconShape='rounded';state.iconScale=100;state.showIconLabels=true;state.clockX=540;state.clockY=400;state.appsX=540;state.appsY=1050;state.subtitleX=540;state.subtitleY=1740;state.savedId=null;
    $('#designTitle').value=state.title;$('#designSubtitle').value=state.subtitle;$('#glowStrength').value='65';$('#showClock').checked=true;$('#clockStyle').value='digital';$('#clockFormat').value='24';$('#clockSize').value='112';$('#clockColor').value='auto';$('#showDate').checked=true;$('#showStatusBar').checked=true;$('#iconShape').value='rounded';$('#iconScale').value='100';$('#showIconLabels').checked=true;
    $$('.screen-mode-button').forEach(b=>b.classList.toggle('is-active',b.dataset.screenMode===state.screenMode));$('#paletteRow').querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b.dataset.palette==='violet'));$('#presetGrid').querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b.dataset.preset==='aurora'));
    loadBackground('').then(()=>{$('#removeBackgroundImage').classList.add('hidden');$('#backgroundImageStatus').textContent='JPG · PNG · WEBP · AVIF — حتى 15MB'});readControls();toast('تمت إعادة ضبط التصميم');
  }
  function openPublishModal(){if(!state.user||!state.client){toast('سجّل الدخول أولاً لمشاركة تصميمك');location.href='/login';return}state.shareImageUrl=null;state.shareSaved=false;state.successfulDestinations=new Set();readControls();$('#publishCaption').value=state.subtitle||state.title;$('#publishDestinationsModal').classList.remove('hidden');$('#publishDestinationsModal').setAttribute('aria-hidden','false');requestAnimationFrame(()=>$('#publishDestinationsModal').classList.add('is-open'));$('#multiPublishStatus').classList.add('hidden');loadShareForums()}
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
      if(!state.shareSaved){
        await savePublishedDesign(state.shareImageUrl);
        state.shareSaved=true;
      }
      const imageUrl=state.shareImageUrl;
      const caption=$('#publishCaption').value.trim().slice(0,1800)||state.title;
      const jobs=pending.map(item=>({
        key:item.key,
        label:item.label,
        promise:(async()=>{
          if(item.key==='posts'){
            const {error}=await state.client.from('social_posts').insert({
              user_id:state.user.id,author_name:profileName(),author_avatar:profileAvatar(),
              body:caption,media_url:imageUrl,media_type:'image/png'
            });
            if(error)throw error;
            return;
          }
          if(item.key==='general'){
            const token=await authToken();
            const response=await fetch('/api/community/messages',{
              method:'POST',
              headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
              body:JSON.stringify({content:caption,imageUrl})
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
            content:caption||`شارك ${state.title} من استوديو التخصيص`,image_url:imageUrl
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
  $$('.screen-mode-button').forEach(button=>button.addEventListener('click',()=>{state.screenMode=button.dataset.screenMode;$$('.screen-mode-button').forEach(b=>b.classList.toggle('is-active',b===button));render()}));
  canvas.addEventListener('pointerdown',onCanvasPointerDown);canvas.addEventListener('pointermove',onCanvasPointerMove);canvas.addEventListener('pointerup',onCanvasPointerUp);canvas.addEventListener('pointercancel',onCanvasPointerUp);
  $$('.palette-swatch').forEach(button=>button.addEventListener('click',()=>{state.palette=button.dataset.palette;$$('.palette-swatch').forEach(b=>b.classList.toggle('selected',b===button));render()}));
  $$('.preset-button').forEach(button=>button.addEventListener('click',()=>{state.preset=button.dataset.preset;$$('.preset-button').forEach(b=>b.classList.toggle('selected',b===button));render()}));
  ['#designTitle','#designSubtitle','#glowStrength','#showClock','#clockStyle','#clockFormat','#clockSize','#clockColor','#showDate','#showStatusBar','#iconShape','#iconScale','#showIconLabels'].forEach(selector=>{const node=$(selector);node.addEventListener('input',readControls);node.addEventListener('change',readControls)});
  $('#chooseBackgroundImage').addEventListener('click',()=>{if(!state.user){toast('سجّل الدخول أولاً');location.href='/login';return}$('#backgroundImageInput').click()});
  $('#backgroundImageInput').addEventListener('change',event=>onChooseBackground(event.target.files?.[0]));
  $('#removeBackgroundImage').addEventListener('click',()=>{loadBackground('').then(()=>{$('#removeBackgroundImage').classList.add('hidden');$('#backgroundImageStatus').textContent='JPG · PNG · WEBP · AVIF — حتى 15MB';toast('تمت إزالة الصورة من التصميم')})});
  $('#downloadDesign').addEventListener('click',download);$('#downloadThemePack').addEventListener('click',downloadThemePack);$('#saveDraft').addEventListener('click',()=>saveDesign('draft'));$('#publishDesign').addEventListener('click',openPublishModal);$('#resetDesign').addEventListener('click',reset);$('#studioProfile').addEventListener('click',()=>{location.href=state.user?'/profile':'/login'});
  $('#closePublishDestinations').addEventListener('click',closePublishModal);$('#publishDestinationsModal').addEventListener('click',event=>{if(event.target===$('#publishDestinationsModal'))closePublishModal()});$('#confirmMultiPublish').addEventListener('click',publishToSelectedDestinations);$('#selectAllForums').addEventListener('click',()=>{$$('#publishForumChoices input[type="checkbox"]').forEach(input=>input.checked=true)});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('#publishDestinationsModal').classList.contains('hidden'))closePublishModal()});
  render();setInterval(render,1000);initSupabase();
})();
