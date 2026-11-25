const root=document.getElementById("roadmapItems");
if(root){
  const categoryLabels={
    wallpapers:"عالم الخلفيات الذكي",
    rewards:"نظام النقاط والمكافآت",
    studio:"استوديو الإبداع الاحترافي",
    community:"مجتمع نابض بالحياة",
    identity:"هوية العضو والامتيازات",
    ai:"الذكاء الاصطناعي والتجارب الجديدة",
    performance:"الأداء والأمان والتجربة الشاملة",
    general:"فكرة من المستقبل"
  };
  const statusLabels={planned:"قيد التخطيط",in_progress:"قيد التطوير",released:"تم الإطلاق"};
  const photoFallback={wallpapers:"photo-1",rewards:"photo-2",studio:"photo-3",community:"photo-4",identity:"photo-5",ai:"photo-6",performance:"photo-7",general:"photo-8"};
  const footers={
    wallpapers:"كل شاشة تستحق خلفية تحكي عنها.",
    rewards:"كل مساهمة لها قيمة، وكل إنجاز يستحق التقدير.",
    studio:"اصنع عملاً يشبهك.",
    community:"المجتمع الجميل يبدأ بأعضائه.",
    identity:"لكل عضو بصمته الخاصة.",
    ai:"التقنية لخدمة خيالك.",
    performance:"التجربة الجيدة تبدأ من الثقة."
  };
  const escapeText=value=>String(value??"");

  function makeCard(item,index){
    const card=document.createElement("article");
    card.className="memory-card memory-"+(item.category||"general");
    const tape=document.createElement("span");
    tape.className="memory-tape";
    tape.setAttribute("aria-hidden","true");
    const top=document.createElement("div");
    top.className="memory-card-top";
    const number=document.createElement("span");
    number.className="memory-number";
    number.textContent=String(index+1).padStart(2,"0");
    const status=document.createElement("span");
    status.className="memory-status roadmap-status-"+(item.status||"planned");
    status.textContent=statusLabels[item.status]||"قيد التخطيط";
    top.append(number,status);

    const body=document.createElement("div");
    body.className="memory-card-body";
    const figure=document.createElement("figure");
    figure.className="memory-figure";
    const visual=document.createElement("div");
    visual.className="roadmap-item-visual";
    if(item.image_url){
      const img=document.createElement("img");
      img.className="roadmap-uploaded-photo";
      img.src=item.image_url;
      img.alt="صورة مرتبطة بـ "+escapeText(item.title);
      img.loading="lazy";
      img.decoding="async";
      img.onerror=()=>{
        img.remove();
        const fallback=document.createElement("span");
        fallback.className="photo-sprite "+(photoFallback[item.category]||"photo-8");
        fallback.setAttribute("role","img");
        fallback.setAttribute("aria-label",categoryLabels[item.category]||"صورة الفكرة");
        visual.appendChild(fallback);
      };
      visual.appendChild(img);
    }else{
      const fallback=document.createElement("span");
      fallback.className="photo-sprite "+(photoFallback[item.category]||"photo-8");
      fallback.setAttribute("role","img");
      fallback.setAttribute("aria-label",categoryLabels[item.category]||"صورة الفكرة");
      visual.appendChild(fallback);
    }
    const caption=document.createElement("figcaption");
    caption.textContent=categoryLabels[item.category]||"صفحة من المستقبل";
    figure.append(visual,caption);

    const copy=document.createElement("div");
    copy.className="memory-copy";
    const kicker=document.createElement("span");
    kicker.className="memory-kicker";
    kicker.textContent=String(item.category||"FUTURE").toUpperCase().replace(/_/g," ");
    const title=document.createElement("h3");
    title.textContent=escapeText(item.title);
    const summary=document.createElement("p");
    summary.textContent=escapeText(item.summary||"");
    copy.append(kicker,title);
    if(item.summary) copy.appendChild(summary);
    if(item.content){
      const content=document.createElement("p");
      content.className="roadmap-card-content";
      content.textContent=escapeText(item.content);
      copy.appendChild(content);
    }
    const bullets=Array.isArray(item.bullets)?item.bullets:[];
    if(bullets.length){
      const list=document.createElement("ul");
      bullets.slice(0,12).forEach(value=>{
        const li=document.createElement("li");
        li.textContent=escapeText(value);
        list.appendChild(li);
      });
      copy.appendChild(list);
    }
    body.append(figure,copy);

    const footer=document.createElement("div");
    footer.className="memory-card-foot";
    const footerText=document.createElement("span");
    footerText.textContent=footers[item.category]||"فكرة جديدة نكتبها معاً.";
    const sparkle=document.createElement("span");
    sparkle.textContent="✧";
    footer.append(footerText,sparkle);
    card.append(tape,top,body,footer);
    return card;
  }

  async function loadRoadmap(){
    try{
      const response=await fetch("/api/roadmap",{cache:"no-store",headers:{Accept:"application/json"}});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.success) throw new Error(data.message||"تعذر تحميل خارطة الطريق.");
      const items=Array.isArray(data.items)?data.items:[];
      root.replaceChildren();
      if(!items.length){
        const empty=document.createElement("div");
        empty.className="roadmap-load-state";
        empty.textContent="لا توجد أفكار منشورة حالياً. ستظهر الصفحات الجديدة هنا عند نشرها.";
        root.appendChild(empty);
      }else{
        const fragment=document.createDocumentFragment();
        items.forEach((item,index)=>fragment.appendChild(makeCard(item,index)));
        root.appendChild(fragment);
      }
      const count=document.getElementById("roadmapTotal");
      if(count) count.textContent=String(items.length).padStart(2,"0");
    }catch(error){
      console.error("ROADMAP PUBLIC VIEW:",error);
      root.replaceChildren();
      const message=document.createElement("div");
      message.className="roadmap-load-state roadmap-load-error";
      message.textContent="تعذر تحديث صفحات المستقبل الآن. حاول تحديث الصفحة بعد قليل.";
      root.appendChild(message);
    }
  }

  loadRoadmap();
}
