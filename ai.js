"use strict";
(function(){
    const STORAGE_KEY="wallpaperChats";
    const MAX_CHATS=30,MAX_MESSAGES=80,MAX_HISTORY=14;
    const $=id=>document.getElementById(id);
    const app=$("aiApp"),backdrop=$("sidebarBackdrop"),chatContainer=$("chatContainer");
    const chatHistory=$("chatHistory"),chatForm=$("chatForm"),userInput=$("userInput"),sendBtn=$("sendBtn");
    const pageNameNode=$("pageContextName");
    const PAGE_INFO={
        "home.html":"الرئيسية",
        "index.html":"الرئيسية",
        "all-wallpapers.html":"جميع الخلفيات",
        "categories.html":"الأقسام",
        "explore.html":"دفتر الاستكشاف",
        "wallpaper.html":"تفاصيل الخلفية",
        "publish.html":"نشر الخلفيات",
        "publish-telegram.html":"النشر عبر Telegram",
        "community.html":"المجتمع",
        "social.html":"المنشورات",
        "profile.html":"الملف الشخصي",
        "settings.html":"الإعدادات",
        "favorites.html":"المفضلة",
        "points.html":"النقاط والإنجازات",
        "points-earn.html":"مركز جمع النقاط",
        "notice.html":"الإشعارات",
        "notifications.html":"مركز التحديثات",
        "studio.html":"استوديو التخصيص",
        "photo-editor.html":"محرر الصور والفيديو",
        "artguru.html":"تحسين الصور بالذكاء الاصطناعي",
        "premium-user.html":"المستخدم المميز",
        "virtual-gallery.html":"المعرض الافتراضي",
        "monthly-book.html":"كتاب الإنجازات",
        "roadmap.html":"خارطة الطريق",
        "developers.html":"واجهة المطورين",
        "islamic.html":"الخلفيات الإسلامية",
        "support.html":"الدعم والمساعدة",
        "about.html":"حول WallpaperHub",
        "privacy.html":"الخصوصية",
        "community-appeal.html":"التواصل والدعم"
    };
    const params=new URLSearchParams(location.search);
    const rawRequestedPage=String(params.get("from")||"").split(/[?#]/)[0].split("/").pop().toLowerCase();
    const requestedPage=rawRequestedPage&&!rawRequestedPage.endsWith(".html")?rawRequestedPage+".html":rawRequestedPage;
    const page=Object.prototype.hasOwnProperty.call(PAGE_INFO,requestedPage)?requestedPage:"";
    const pageLabel=page?PAGE_INFO[page]:"الموقع بشكل عام";
    if(pageNameNode)pageNameNode.textContent=pageLabel;

    let chats=loadChats(),currentChat=chats[0]||null,busy=false,toastTimer=0;

    function createId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,9)}
    function loadChats(){
        try{
            const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
            if(!Array.isArray(saved))return [];
            return saved.slice(0,MAX_CHATS).map(chat=>({
                id:String(chat.id||createId()),
                title:String(chat.title||"محادثة جديدة").slice(0,70),
                updatedAt:String(chat.updatedAt||chat.createdAt||""),
                messages:(Array.isArray(chat.messages)?chat.messages:[]).slice(-MAX_MESSAGES)
                    .map(message=>({
                        id:String(message.id||createId()),
                        sender:message.sender==="user"?"user":"ai",
                        text:String(message.text||"").slice(0,12000),
                        createdAt:String(message.createdAt||"")
                    }))
                    .filter(message=>message.text.trim())
            }));
        }catch(error){console.warn("AI CHAT HISTORY LOAD:",error);return []}
    }
    function saveChats(){
        try{
            chats=chats.slice(0,MAX_CHATS).map(chat=>({
                id:chat.id,title:chat.title,updatedAt:chat.updatedAt,messages:chat.messages.slice(-MAX_MESSAGES)
            }));
            localStorage.setItem(STORAGE_KEY,JSON.stringify(chats));
        }catch(error){console.warn("AI CHAT HISTORY SAVE:",error);showToast("مساحة التخزين في المتصفح ممتلئة؛ احذف بعض المحادثات القديمة.")}
    }
    function escapeHtml(value){
        return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
    }
    function renderText(value){
        let html=escapeHtml(value);
        const blocks=[];
        const fence=new RegExp("\\x60\\x60\\x60([a-zA-Z0-9_+.-]*)\\n([\\s\\S]*?)\\x60\\x60\\x60","g");
        html=html.replace(fence,(_,language,code)=>{
            const token="__WH_CODE_"+blocks.length+"__";
            blocks.push({token,language:language||"Code",code});
            return token;
        });
        html=html.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>");
        const inlineCode=new RegExp("\\x60([^\\x60]+)\\x60","g");
        html=html.replace(inlineCode,"<code>$1</code>");
        html=html.replace(/(https?:\/\/[^\s<]+)/g,url=>{
            const clean=url.replace(/[),.]+$/,"");
            let valid=false;
            try{const parsed=new URL(clean);valid=parsed.protocol==="https:"||parsed.protocol==="http:"}catch(_error){}
            return valid?'<a href="'+clean+'" target="_blank" rel="noopener noreferrer">'+clean+"</a>"+url.slice(clean.length):url;
        });
        html=html.replace(/\n/g,"<br>");
        blocks.forEach(block=>{
            const codeButton='<button class="code-copy" type="button" data-copy-code="'+escapeHtml(block.code)+'">نسخ الكود</button>';
            const markup='<div class="code-block"><div class="code-toolbar"><span>'+escapeHtml(block.language)+'</span>'+codeButton+'</div><pre><code>'+escapeHtml(block.code)+"</code></pre></div>";
            html=html.replace(block.token,markup);
        });
        return html;
    }
    function addMessage(sender,text,scroll=true){
        if(!currentChat){
            currentChat={id:createId(),title:String(text||"محادثة جديدة").replace(/\s+/g," ").slice(0,42)||"محادثة جديدة",updatedAt:new Date().toISOString(),messages:[]};
            chats.unshift(currentChat);
        }
        const item={id:createId(),sender:sender==="user"?"user":"ai",text:String(text||"").slice(0,12000),createdAt:new Date().toISOString()};
        currentChat.messages.push(item);
        currentChat.messages=currentChat.messages.slice(-MAX_MESSAGES);
        if(sender==="user"&&currentChat.title==="محادثة جديدة")currentChat.title=item.text.replace(/\s+/g," ").slice(0,42);
        currentChat.updatedAt=item.createdAt;
        saveChats();
        const welcome=chatContainer.querySelector(".welcome-screen");if(welcome)welcome.remove();
        chatContainer.appendChild(renderMessage(item));
        renderHistory();
        if(scroll)scrollBottom();
        return item;
    }
    function actionButton(icon,label,action){
        const button=document.createElement("button");button.type="button";button.className="message-action";
        button.dataset.action=action;button.setAttribute("aria-label",label);button.title=label;
        const mark=document.createElement("span");mark.className="material-icons";mark.textContent=icon;
        const text=document.createElement("span");text.textContent=label;button.append(mark,text);return button;
    }
    function renderMessage(message){
        const row=document.createElement("article");row.className="message "+message.sender;row.dataset.messageId=message.id;
        const avatar=document.createElement("div");avatar.className="message-avatar";
        const glyph=document.createElement("span");glyph.className="material-icons";glyph.textContent=message.sender==="user"?"person":"support_agent";avatar.appendChild(glyph);
        const content=document.createElement("div");content.className="message-content";
        const meta=document.createElement("div");meta.className="message-meta";
        const who=document.createElement("span");who.textContent=message.sender==="user"?"أنت":"مساعد WallpaperHub";meta.appendChild(who);
        const bubble=document.createElement("div");bubble.className="message-bubble";
        const text=document.createElement("div");text.className="message-text";text.innerHTML=renderText(message.text);bubble.appendChild(text);
        content.append(meta,bubble);
        if(message.sender==="ai"){
            const actions=document.createElement("div");actions.className="message-actions";
            const copy=actionButton("content_copy","نسخ","copy-message");copy.dataset.copyText=message.text;
            actions.appendChild(copy);content.appendChild(actions);
        }
        row.append(avatar,content);return row;
    }
    function renderWelcome(){
        const template=$("welcomeTemplate");if(template)chatContainer.appendChild(template.content.cloneNode(true));
    }
    function renderChat(){
        chatContainer.replaceChildren();
        if(!currentChat||!currentChat.messages.length){renderWelcome();return}
        currentChat.messages.forEach(message=>chatContainer.appendChild(renderMessage(message)));
        scrollBottom();
    }
    function renderHistory(){
        chatHistory.replaceChildren();
        const ordered=chats.slice().sort((a,b)=>new Date(b.updatedAt||0)-new Date(a.updatedAt||0));
        $("chatCount").textContent=String(ordered.length);
        if(!ordered.length){
            const empty=document.createElement("div");empty.className="history-empty";
            empty.textContent="ستظهر محادثاتك هنا بعد أول سؤال.";chatHistory.appendChild(empty);return;
        }
        ordered.forEach(chat=>{
            const row=document.createElement("div");
            row.className="history-row"+(currentChat&&String(currentChat.id)===String(chat.id)?" active":"");
            const open=document.createElement("button");open.type="button";open.className="history-open";open.dataset.openChat=chat.id;
            const icon=document.createElement("span");icon.className="material-icons";icon.textContent="chat_bubble_outline";
            const title=document.createElement("span");title.textContent=chat.title||"محادثة جديدة";open.append(icon,title);
            const remove=document.createElement("button");remove.type="button";remove.className="delete-chat-button";
            remove.dataset.deleteChat=chat.id;remove.setAttribute("aria-label","حذف المحادثة");remove.title="حذف";
            const removeIcon=document.createElement("span");removeIcon.className="material-icons";removeIcon.textContent="delete_outline";
            remove.appendChild(removeIcon);row.append(open,remove);chatHistory.appendChild(row);
        });
    }
    function openChat(id){
        currentChat=chats.find(chat=>String(chat.id)===String(id))||null;
        renderHistory();renderChat();closeSidebar();
    }
    function newChat(){
        currentChat=null;renderHistory();renderChat();closeSidebar();userInput.focus();
    }
    function deleteChat(id){
        chats=chats.filter(chat=>String(chat.id)!==String(id));
        if(currentChat&&String(currentChat.id)===String(id)){
            currentChat=chats.slice().sort((a,b)=>new Date(b.updatedAt||0)-new Date(a.updatedAt||0))[0]||null;
        }
        saveChats();renderHistory();renderChat();showToast("تم حذف المحادثة من هذا الجهاز.");
    }
    function openSidebar(){
        app.classList.add("sidebar-open");backdrop.hidden=false;$("menuBtn").setAttribute("aria-expanded","true");
    }
    function closeSidebar(){
        app.classList.remove("sidebar-open");backdrop.hidden=true;$("menuBtn").setAttribute("aria-expanded","false");
    }
    function scrollBottom(){requestAnimationFrame(()=>{chatContainer.scrollTop=chatContainer.scrollHeight})}
    function showToast(message){
        let toast=$("aiToast");
        if(!toast){toast=document.createElement("div");toast.id="aiToast";toast.className="ai-toast";toast.setAttribute("role","status");document.body.appendChild(toast)}
        toast.textContent=message;toast.classList.add("show");
        clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove("show"),3000);
    }
    function setBusy(value){
        busy=Boolean(value);sendBtn.disabled=busy;userInput.disabled=busy;
        sendBtn.querySelector(".material-icons").textContent=busy?"hourglass_top":"arrow_upward";
        sendBtn.setAttribute("aria-busy",String(busy));
    }
    function typing(show){
        $("aiTyping")?.remove();
        if(!show)return;
        const row=document.createElement("div");row.className="typing-message";row.id="aiTyping";
        const dots=document.createElement("div");dots.className="typing-dots";
        for(let i=0;i<3;i++)dots.appendChild(document.createElement("i"));
        const label=document.createElement("span");label.textContent="أراجع سؤالك وأجهز شرحًا واضحًا...";
        row.append(dots,label);chatContainer.appendChild(row);scrollBottom();
    }
    function conversationHistory(){
        if(!currentChat)return [];
        return currentChat.messages.slice(0,-1).slice(-MAX_HISTORY).map(item=>({
            role:item.sender==="user"?"user":"model",text:item.text
        })).filter(item=>item.text);
    }
    async function askAssistant(message){
        const response=await fetch("/api/chat",{
            method:"POST",cache:"no-store",
            headers:{"Content-Type":"application/json","Accept":"application/json"},
            body:JSON.stringify({
                message,
                history:conversationHistory(),
                page,
                locale:navigator.language||"ar",
                timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||""
            })
        });
        const data=await response.json().catch(()=>({}));
        if(!response.ok||data.success===false)throw new Error(data.message||"تعذر الوصول إلى المساعد الآن.");
        const reply=String(data.reply||"").trim();
        if(!reply)throw new Error("لم يصل رد نصي واضح. حاول مرة أخرى.");
        return reply;
    }
    async function sendMessage(){
        if(busy)return;
        const message=userInput.value.trim();
        if(!message)return;
        userInput.value="";userInput.style.height="42px";
        addMessage("user",message);
        setBusy(true);typing(true);
        try{
            const reply=await askAssistant(message);
            typing(false);addMessage("ai",reply);
        }catch(error){
            console.error("WALLPAPERHUB TEXT HELP:",error);typing(false);
            addMessage("ai","تعذر إكمال الرد الآن.\n"+String(error?.message||"حاول مرة أخرى بعد قليل."));
        }finally{setBusy(false);userInput.focus()}
    }
    async function copyText(value){
        try{await navigator.clipboard.writeText(String(value||""))}
        catch(_error){
            const field=document.createElement("textarea");field.value=String(value||"");
            document.body.appendChild(field);field.select();document.execCommand("copy");field.remove();
        }
    }
    function handleActions(event){
        const target=event.target.closest("button");if(!target)return;
        if(target.dataset.openChat){openChat(target.dataset.openChat);return}
        if(target.dataset.deleteChat){
            const id=target.dataset.deleteChat;
            if(window.confirm("هل تريد حذف هذه المحادثة من هذا الجهاز؟"))deleteChat(id);
            return;
        }
        if(target.dataset.copyCode!==undefined){copyText(target.dataset.copyCode);showToast("تم نسخ الكود.");return}
        if(target.dataset.action==="copy-message"){copyText(target.dataset.copyText||"");showToast("تم نسخ الرد.")}
    }
    function handleSuggestion(event){
        const button=event.target.closest("[data-suggestion]");if(!button)return;
        userInput.value=button.dataset.suggestion||"";
        userInput.dispatchEvent(new Event("input",{bubbles:true}));userInput.focus();
    }

    $("menuBtn").addEventListener("click",openSidebar);
    $("closeSidebar").addEventListener("click",closeSidebar);
    backdrop.addEventListener("click",closeSidebar);
    $("newChatHeader").addEventListener("click",newChat);
    $("newChatSidebar").addEventListener("click",newChat);
    chatForm.addEventListener("submit",event=>{event.preventDefault();void sendMessage()});
    chatContainer.addEventListener("click",handleActions);
    chatContainer.addEventListener("click",handleSuggestion);
    chatHistory.addEventListener("click",handleActions);
    userInput.addEventListener("input",()=>{
        userInput.style.height="auto";userInput.style.height=Math.min(userInput.scrollHeight,136)+"px";
    });
    userInput.addEventListener("keydown",event=>{
        if(event.key==="Enter"&&!event.shiftKey&&!event.isComposing){event.preventDefault();void sendMessage()}
    });
    document.addEventListener("keydown",event=>{if(event.key==="Escape")closeSidebar()});
    window.addEventListener("storage",event=>{
        if(event.key===STORAGE_KEY){
            chats=loadChats();
            currentChat=chats.find(chat=>currentChat&&String(chat.id)===String(currentChat.id))||chats[0]||null;
            renderHistory();renderChat();
        }
    });
    renderHistory();renderChat();
})();