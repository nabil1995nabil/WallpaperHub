import { supabase } from "./supabase.js";
document.addEventListener("DOMContentLoaded",()=>{
 const $=s=>document.querySelector(s), feed=$("#appeal-messages"), form=$("#appeal-form"), input=$("#appeal-message"), send=$("#appeal-send");
 let session=null,isOwner=false,channel=null,timer=null,items=[],allItems=[],activeConversation="";
 const ownerSelect=$("#owner-conversation");
 function toast(text){const el=$("#appeal-toast");el.textContent=text;el.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove("show"),2400)}
 function escapeText(v){return String(v??"")}
 async function authHeaders(){if(!session){const r=await supabase.auth.getSession();session=r.data?.session||null}return session?.access_token?{Authorization:`Bearer ${session.access_token}`} : {}}
 async function api(url,options={}){const headers={...(await authHeaders()),...(options.headers||{})};const r=await fetch(url,{...options,headers,cache:"no-store"});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.message||"تعذر الاتصال بالخادم");return data}
 function render(){feed.innerHTML="";if(!items.length){const empty=document.createElement("div");empty.className="empty-conversation";empty.textContent="ابدأ المحادثة واشرح للإدارة سبب طلب المراجعة.";feed.appendChild(empty);return}
  items.forEach(m=>{const mine=String(m.sender_id)===String(session?.user?.id);const wrap=document.createElement("div");wrap.className="appeal-message"+(mine?" mine":"");const name=document.createElement("span");name.className="sender";name.textContent=mine?"أنت":(m.sender_role==="owner"?"مالك الموقع":"عضو");const bubble=document.createElement("div");bubble.className="bubble";bubble.textContent=escapeText(m.message);const time=document.createElement("span");time.className="time";time.textContent=m.created_at?new Date(m.created_at).toLocaleString("ar"): "الآن";wrap.append(name,bubble,time);feed.appendChild(wrap)});feed.scrollTop=feed.scrollHeight
 }
 async function load(){try{
  const data=await api("/api/community/appeals"+(activeConversation?"?user="+encodeURIComponent(activeConversation):""));
  isOwner=Boolean(data.isOwner);allItems=data.messages||[];
  if(isOwner){
    const conversations=[...new Map(allItems.map(m=>[String(m.conversation_user_id),m])).keys()];
    ownerSelect.hidden=false;ownerSelect.innerHTML="";
    const urlUser=new URL(location.href).searchParams.get("user")||"";
    activeConversation=activeConversation||urlUser||conversations[0]||"";
    conversations.forEach(uid=>{const opt=document.createElement("option");opt.value=uid;opt.textContent="عضو "+uid.slice(0,8);ownerSelect.appendChild(opt)});
    if(activeConversation && !conversations.includes(activeConversation)){const opt=document.createElement("option");opt.value=activeConversation;opt.textContent="المحادثة المحددة";ownerSelect.appendChild(opt)}
    ownerSelect.value=activeConversation;
    items=allItems.filter(m=>String(m.conversation_user_id)===String(activeConversation));
    $("#conversation-status").textContent=activeConversation?"مراجعة محادثة عضو":"لا توجد محادثات بعد";
  }else{ownerSelect.hidden=true;items=allItems;$("#conversation-status").textContent="محادثة خاصة مع الإدارة"}
  render()
 }catch(e){$("#conversation-status").textContent="تعذر الاتصال";if(!items.length){feed.innerHTML="";const empty=document.createElement("div");empty.className="empty-conversation";empty.textContent=e.message;feed.appendChild(empty)}}}
 async function submit(e){e.preventDefault();const message=input.value.trim();if(!message)return;send.disabled=true;try{const payload={message};const url=new URL(location.href);const target=url.searchParams.get("user");if(isOwner){payload.conversationUserId=activeConversation||target;if(!payload.conversationUserId)throw new Error("اختر محادثة عضو أولاً")}const data=await api("/api/community/appeals",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});items.push(data.message);input.value="";render();toast("تم إرسال رسالتك")}catch(e){toast(e.message)}finally{send.disabled=false}}
 form.addEventListener("submit",submit);$("#refresh-appeal").addEventListener("click",load);
 ownerSelect.addEventListener("change",()=>{activeConversation=ownerSelect.value;const url=new URL(location.href);if(activeConversation)url.searchParams.set("user",activeConversation);history.replaceState({}, "", url);load()});
 supabase.auth.getSession().then(async r=>{session=r.data?.session||null;if(!session){$("#conversation-status").textContent="يرجى تسجيل الدخول";feed.innerHTML='<div class="empty-conversation">سجّل الدخول أولاً ثم أعد فتح صفحة المراجعة.</div>';form.hidden=true;return}await load();const user=session.user.id;channel=supabase.channel("community-appeal-"+user).on("postgres_changes",{event:"INSERT",schema:"public",table:"community_appeal_messages",filter:`conversation_user_id=eq.${user}`},()=>load()).subscribe();timer=setInterval(()=>{if(document.visibilityState==="visible")load()},12000)}).catch(()=>toast("تعذر التحقق من الجلسة"));
 window.addEventListener("beforeunload",()=>{clearInterval(timer);if(channel)supabase.removeChannel(channel)})
});