"use strict";
(function(){
    const STORAGE_KEY="wallpaperChats";
    const MAX_CHATS=25,MAX_MESSAGES=70,MAX_HISTORY_TURNS=14,MAX_IMAGE_BYTES=12*1024*1024;
    const $=id=>document.getElementById(id);
    const app=$("aiApp"),sidebar=$("sidebar"),backdrop=$("sidebarBackdrop");
    const chatContainer=$("chatContainer"),chatHistory=$("chatHistory"),chatForm=$("chatForm");
    const userInput=$("userInput"),sendBtn=$("sendBtn"),imageInput=$("imageInput");
    const attachImageButton=$("attachImageButton"),selectedImagePreview=$("selectedImagePreview");
    const chatModeBtn=$("chatModeBtn"),imageModeBtn=$("imageModeBtn"),imageControls=$("imageControls");
    const imageSize=$("imageSize"),imageAspectRatio=$("imageAspectRatio");
    const composerHint=$("composerHint"),imageCostNote=$("imageCostNote");

    let chats=loadChats(),currentChat=chats[0]||null,selectedImage=null,selectedImagePreviewData="";
    let mode="chat",busy=false,toastTimer=0;

    function createId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,9)}
    function safeImageUrl(value){
        try{
            const url=new URL(String(value||""),location.origin);
            return url.protocol==="https:"||url.origin===location.origin?url.href:"";
        }catch(_error){return ""}
    }
    function safePreview(value){
        const preview=String(value||"");
        return preview.startsWith("data:image/")&&preview.length<450000?preview:"";
    }
    function loadChats(){
        try{
            const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
            if(!Array.isArray(saved))return [];
            return saved.slice(0,MAX_CHATS).map(chat=>({
                id:String(chat.id||createId()),
                title:String(chat.title||"محادثة جديدة").slice(0,70),
                updatedAt:String(chat.updatedAt||chat.createdAt||""),
                messages:(Array.isArray(chat.messages)?chat.messages:[]).slice(-MAX_MESSAGES).map(message=>({
                    id:String(message.id||createId()),
                    sender:message.sender==="user"?"user":"ai",
                    text:String(message.text||"").slice(0,12000),
                    imageUrl:safeImageUrl(message.imageUrl||""),
                    imagePreview:safePreview(message.imagePreview||""),
                    resolution:String(message.resolution||""),
                    aspectRatio:String(message.aspectRatio||""),
                    createdAt:String(message.createdAt||"")
                }))
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
    function ensureChat(firstMessage){
        if(!currentChat){
            currentChat={id:createId(),title:String(firstMessage||"محادثة جديدة").trim().slice(0,42)||"محادثة جديدة",updatedAt:new Date().toISOString(),messages:[]};
            chats.unshift(currentChat);
        }
        return currentChat;
    }
    function updateChatTitle(chat,message){
        if(chat.title==="محادثة جديدة"&&message)chat.title=String(message).replace(/\s+/g," ").trim().slice(0,42)||"محادثة جديدة";
        chat.updatedAt=new Date().toISOString();
    }
    function escapeHtml(value){
        return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
    }
    function renderMarkdown(value){
        const blocks=[];
        let html=escapeHtml(value);
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
            return '<a href="'+clean+'" target="_blank" rel="noopener noreferrer">'+clean+"</a>"+url.slice(clean.length);
        });
        html=html.replace(/\n/g,"<br>");
        blocks.forEach(block=>{
            const htmlBlock='<div class="code-block"><div class="code-toolbar"><span>'+
                escapeHtml(block.language)+
                '</span><button class="code-copy" type="button" data-copy-code="'+escapeHtml(block.code)+
                '">نسخ الكود</button></div><pre><code>'+escapeHtml(block.code)+"</code></pre></div>";
            html=html.replace(block.token,htmlBlock);
        });
        return html;
    }
    function appendMessage(message){
        const chat=ensureChat(message.sender==="user"?message.text:"");
        const item={
            id:createId(),sender:message.sender==="user"?"user":"ai",
            text:String(message.text||"").slice(0,12000),
            imageUrl:safeImageUrl(message.imageUrl||""),
            imagePreview:safePreview(message.imagePreview||""),
            resolution:String(message.resolution||""),aspectRatio:String(message.aspectRatio||""),
            createdAt:new Date().toISOString()
        };
        chat.messages.push(item);
        chat.messages=chat.messages.slice(-MAX_MESSAGES);
        updateChatTitle(chat,item.sender==="user"?item.text:"");
        saveChats();
        const welcome=chatContainer.querySelector(".welcome-screen");
        if(welcome)welcome.remove();
        chatContainer.appendChild(renderMessage(item));
        renderHistory();
        scrollToBottom();
        return item;
    }
    function textActionButton(icon,label,action){
        const button=document.createElement("button");
        button.type="button";button.className="message-action";button.dataset.action=action;
        button.setAttribute("aria-label",label);button.title=label;
        const symbol=document.createElement("span");symbol.className="material-icons";symbol.textContent=icon;
        const text=document.createElement("span");text.textContent=label;
        button.append(symbol,text);return button;
    }
    function imageActionButton(icon,label,action){
        const button=document.createElement("button");
        button.type="button";button.dataset.action=action;button.setAttribute("aria-label",label);button.title=label;
        const symbol=document.createElement("span");symbol.className="material-icons";symbol.textContent=icon;
        button.appendChild(symbol);return button;
    }
    function renderMessage(message){
        const row=document.createElement("article");
        row.className="message "+(message.sender==="user"?"user":"ai");
        row.dataset.messageId=message.id;
        const avatar=document.createElement("div");avatar.className="message-avatar";
        const avatarIcon=document.createElement("span");avatarIcon.className="material-icons";
        avatarIcon.textContent=message.sender==="user"?"person":"auto_awesome";avatar.appendChild(avatarIcon);
        const content=document.createElement("div");content.className="message-content";
        const meta=document.createElement("div");meta.className="message-meta";
        const author=document.createElement("span");author.textContent=message.sender==="user"?"أنت":"WallpaperHub AI";
        meta.appendChild(author);content.appendChild(meta);

        if(message.text){
            const bubble=document.createElement("div");bubble.className="message-bubble";
            const text=document.createElement("div");text.className="message-text";
            text.innerHTML=renderMarkdown(message.text);bubble.appendChild(text);content.appendChild(bubble);
        }
        if(message.imagePreview){
            const attachment=document.createElement("div");attachment.className="message-attachment";
            const image=document.createElement("img");image.src=message.imagePreview;image.alt="الصورة التي أرفقتها";image.loading="lazy";
            attachment.appendChild(image);content.appendChild(attachment);
        }
        if(message.imageUrl){
            const card=document.createElement("div");card.className="generated-image-card";
            const frame=document.createElement("div");frame.className="generated-image-frame";
            const image=document.createElement("img");image.src=message.imageUrl;image.alt="صورة مولدة من وصفك";
            image.loading="lazy";image.decoding="async";image.addEventListener("click",()=>openImage(message.imageUrl));
            frame.appendChild(image);card.appendChild(frame);
            const info=document.createElement("div");info.className="generated-image-info";
            const details=document.createElement("div");
            const quality=document.createElement("strong");quality.textContent="جودة "+(message.resolution||"عالية");
            const ratio=document.createElement("span");ratio.textContent=" · "+(message.aspectRatio||"9:16");
            details.append(quality,ratio);
            const actions=document.createElement("div");actions.className="generated-image-actions";
            actions.append(imageActionButton("fullscreen","عرض الصورة","open-image"),
                imageActionButton("download","تحميل","download-image"),imageActionButton("share","مشاركة","share-image"));
            info.append(details,actions);card.appendChild(info);content.appendChild(card);
            image.addEventListener("error",()=>{image.alt="تعذر تحميل الصورة؛ جرّب فتحها أو إعادة التوليد."});
        }
        if(message.sender!=="user"&&message.text){
            const actions=document.createElement("div");actions.className="message-actions";
            const copy=textActionButton("content_copy","نسخ","copy-message");
            copy.dataset.copyText=message.text;actions.appendChild(copy);content.appendChild(actions);
        }
        row.append(avatar,content);return row;
    }
    function renderWelcome(){
        const template=$("welcomeTemplate");
        if(template)chatContainer.appendChild(template.content.cloneNode(true));
    }
    function renderChat(){
        chatContainer.replaceChildren();
        if(!currentChat||!currentChat.messages.length){renderWelcome();return}
        currentChat.messages.forEach(message=>chatContainer.appendChild(renderMessage(message)));
        scrollToBottom();
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
    function startNewChat(){
        currentChat=null;renderChat();renderHistory();closeSidebar();userInput.focus();
    }
    function deleteChat(id){
        chats=chats.filter(chat=>String(chat.id)!==String(id));
        if(currentChat&&String(currentChat.id)===String(id)){
            currentChat=chats.slice().sort((a,b)=>new Date(b.updatedAt||0)-new Date(a.updatedAt||0))[0]||null;
        }
        saveChats();renderHistory();renderChat();showToast("تم حذف المحادثة.");
    }
    function openSidebar(){
        app.classList.add("sidebar-open");backdrop.hidden=false;$("menuBtn").setAttribute("aria-expanded","true");
    }
    function closeSidebar(){
        app.classList.remove("sidebar-open");backdrop.hidden=true;$("menuBtn").setAttribute("aria-expanded","false");
    }
    function scrollToBottom(){requestAnimationFrame(()=>{chatContainer.scrollTop=chatContainer.scrollHeight})}
    function showToast(message){
        let toast=$("aiToast");
        if(!toast){
            toast=document.createElement("div");toast.id="aiToast";toast.className="ai-toast";
            toast.setAttribute("role","status");document.body.appendChild(toast);
        }
        toast.textContent=message;toast.classList.add("show");
        clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove("show"),3200);
    }
    function setMode(nextMode){
        mode=nextMode==="image"?"image":"chat";
        const imageMode=mode==="image";
        chatModeBtn.classList.toggle("active",!imageMode);imageModeBtn.classList.toggle("active",imageMode);
        chatModeBtn.setAttribute("aria-pressed",String(!imageMode));imageModeBtn.setAttribute("aria-pressed",String(imageMode));
        imageControls.hidden=!imageMode;imageCostNote.hidden=!imageMode;attachImageButton.hidden=imageMode;
        composerHint.textContent=imageMode?"اختر الدقة والأبعاد، ثم اكتب وصف الصورة التي تريدها.":"لا تشارك كلمات المرور أو مفاتيح API داخل المحادثة.";
        userInput.placeholder=imageMode?"صف الصورة التي تريد إنشاءها...":"اكتب سؤالك هنا...";
        sendBtn.querySelector(".material-icons").textContent=imageMode?"auto_awesome":"arrow_upward";
        sendBtn.setAttribute("aria-label",imageMode?"إنشاء الصورة":"إرسال");
        if(imageMode&&selectedImage)clearSelectedImage();
        userInput.focus();
    }
    function setBusy(value){
        busy=Boolean(value);sendBtn.disabled=busy;
        sendBtn.querySelector(".material-icons").textContent=busy?"hourglass_top":(mode==="image"?"auto_awesome":"arrow_upward");
        userInput.disabled=busy;attachImageButton.disabled=busy;chatModeBtn.disabled=busy;imageModeBtn.disabled=busy;
        imageSize.disabled=busy;imageAspectRatio.disabled=busy;sendBtn.setAttribute("aria-busy",String(busy));
    }
    function addTyping(){
        const row=document.createElement("div");row.className="typing-message";row.id="aiTyping";
        const dots=document.createElement("div");dots.className="typing-dots";
        for(let i=0;i<3;i++)dots.appendChild(document.createElement("i"));
        const label=document.createElement("span");
        label.textContent=mode==="image"?"يتم إنشاء الصورة بدقة "+imageSize.value+"...":"أفكر في إجابة مناسبة...";
        row.append(dots,label);chatContainer.appendChild(row);scrollToBottom();
    }
    function removeTyping(){$("aiTyping")?.remove()}
    function readFileAsDataUrl(file){
        return new Promise((resolve,reject)=>{
            const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||""));
            reader.onerror=()=>reject(new Error("تعذرت قراءة الصورة."));reader.readAsDataURL(file);
        });
    }
    async function createImagePreview(file){
        const objectUrl=URL.createObjectURL(file);
        try{
            const image=new Image();image.src=objectUrl;
            await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject});
            const scale=Math.min(1,520/Math.max(image.naturalWidth,image.naturalHeight));
            const canvas=document.createElement("canvas");
            canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
            canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
            canvas.getContext("2d").drawImage(image,0,0,canvas.width,canvas.height);
            return canvas.toDataURL("image/jpeg",0.68);
        }catch(_error){return ""}finally{URL.revokeObjectURL(objectUrl)}
    }
    function imageToBase64(file){return readFileAsDataUrl(file).then(dataUrl=>dataUrl.split(",")[1]||"")}
    function showSelectedImage(file,preview){
        selectedImage=file;selectedImagePreviewData=preview||"";selectedImagePreview.replaceChildren();
        const image=document.createElement("img");
        const objectUrl=selectedImagePreviewData?"":URL.createObjectURL(file);
        image.src=selectedImagePreviewData||objectUrl;image.alt="معاينة الصورة المرفقة";
        if(objectUrl)image.addEventListener("load",()=>URL.revokeObjectURL(objectUrl),{once:true});
        const name=document.createElement("span");name.className="selected-image-name";name.textContent=file.name;
        const remove=document.createElement("button");remove.type="button";remove.className="remove-selected-image";
        remove.setAttribute("aria-label","إزالة الصورة المرفقة");
        const icon=document.createElement("span");icon.className="material-icons";icon.textContent="close";
        remove.appendChild(icon);remove.addEventListener("click",clearSelectedImage);
        selectedImagePreview.append(image,name,remove);selectedImagePreview.hidden=false;
    }
    function clearSelectedImage(){
        selectedImage=null;selectedImagePreviewData="";imageInput.value="";
        selectedImagePreview.replaceChildren();selectedImagePreview.hidden=true;
    }
    function getConversationHistory(){
        if(!currentChat)return [];
        return currentChat.messages.slice(0,-1).slice(-MAX_HISTORY_TURNS).map(message=>({
            role:message.sender==="user"?"user":"model",
            text:message.text||(message.imagePreview?"أرفقت صورة في هذه الرسالة السابقة.":"")
        })).filter(message=>message.text);
    }
    async function askAssistant(text,imageData,imageFile){
        const response=await fetch("/api/chat",{
            method:"POST",cache:"no-store",headers:{"Content-Type":"application/json","Accept":"application/json"},
            body:JSON.stringify({
                message:text,history:getConversationHistory(),imageData:imageData||null,
                mimeType:imageFile?imageFile.type:null,locale:navigator.language||"ar",
                timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||""
            })
        });
        const data=await response.json().catch(()=>({}));
        if(!response.ok||data.success===false)throw new Error(data.message||"تعذر الوصول إلى المساعد الآن.");
        return String(data.reply||"").trim()||"لم يصل رد واضح. حاول صياغة السؤال بطريقة أخرى.";
    }
    async function generateImage(prompt){
        const size=imageSize.value,ratio=imageAspectRatio.value;
        const response=await fetch("/api/ai/generate-preview",{
            method:"POST",cache:"no-store",headers:{"Content-Type":"application/json","Accept":"application/json"},
            body:JSON.stringify({prompt,aspectRatio:ratio,imageSize:size})
        });
        const data=await response.json().catch(()=>({}));
        if(!response.ok||!data.success||!data.imageUrl)throw new Error(data.message||"تعذر إنشاء الصورة. تحقق من إعداد خدمة توليد الصور.");
        return data;
    }
    async function sendMessage(){
        if(busy)return;
        const prompt=userInput.value.trim();
        if(mode==="image"&&!prompt){showToast("اكتب وصف الصورة أولاً.");userInput.focus();return}
        if(mode==="chat"&&!prompt&&!selectedImage)return;

        const file=mode==="chat"?selectedImage:null;
        const preview=file?selectedImagePreviewData:"";
        const visibleText=prompt||"حلّل الصورة المرفقة واشرح ما يظهر فيها.";
        userInput.value="";userInput.style.height="42px";clearSelectedImage();
        appendMessage({sender:"user",text:visibleText,imagePreview:preview});
        setBusy(true);addTyping();

        try{
            if(mode==="image"){
                const result=await generateImage(prompt);removeTyping();
                appendMessage({
                    sender:"ai",text:"تم إنشاء الصورة بنجاح. يمكنك فتحها بالحجم الكامل أو تحميلها.",
                    imageUrl:result.imageUrl,resolution:result.resolution||imageSize.value,
                    aspectRatio:result.aspectRatio||imageAspectRatio.value
                });
            }else{
                const imageData=file?await imageToBase64(file):null;
                const reply=await askAssistant(visibleText,imageData,file);
                removeTyping();appendMessage({sender:"ai",text:reply});
            }
        }catch(error){
            console.error("WALLPAPERHUB AI REQUEST:",error);removeTyping();
            appendMessage({sender:"ai",text:"تعذر إكمال الطلب الآن.\n"+String(error?.message||"حدث خطأ مؤقت. حاول مرة أخرى.")});
        }finally{setBusy(false);userInput.focus()}
    }
    async function downloadImage(url){
        try{
            const response=await fetch(url,{mode:"cors"});
            if(!response.ok)throw new Error("Image download failed");
            const blob=await response.blob(),objectUrl=URL.createObjectURL(blob);
            const anchor=document.createElement("a");anchor.href=objectUrl;
            anchor.download="WallpaperHub-AI-"+Date.now()+".jpg";
            document.body.appendChild(anchor);anchor.click();anchor.remove();
            setTimeout(()=>URL.revokeObjectURL(objectUrl),1500);
        }catch(_error){window.open(url,"_blank","noopener,noreferrer")}
    }
    async function shareImage(url){
        try{
            if(navigator.share)await navigator.share({title:"WallpaperHub AI",text:"صورة أنشأتها باستخدام WallpaperHub",url});
            else if(navigator.clipboard){await navigator.clipboard.writeText(url);showToast("تم نسخ رابط الصورة.")}
        }catch(_error){}
    }
    function openImage(url){
        const safeUrl=safeImageUrl(url);if(!safeUrl)return;
        const viewer=document.createElement("div");viewer.className="image-viewer";
        viewer.setAttribute("role","dialog");viewer.setAttribute("aria-modal","true");viewer.setAttribute("aria-label","عرض الصورة بالحجم الكامل");
        const image=document.createElement("img");image.src=safeUrl;image.alt="صورة مولدة من WallpaperHub AI";
        const close=document.createElement("button");close.type="button";close.className="viewer-close";
        close.setAttribute("aria-label","إغلاق الصورة");
        const icon=document.createElement("span");icon.className="material-icons";icon.textContent="close";
        close.appendChild(icon);
        const finish=()=>viewer.remove();close.addEventListener("click",finish);
        viewer.addEventListener("click",event=>{if(event.target===viewer)finish()});
        viewer.append(image,close);document.body.appendChild(viewer);close.focus();
    }
    function findMessage(id){return currentChat?.messages.find(message=>String(message.id)===String(id))||null}
    async function copyText(text){
        try{await navigator.clipboard.writeText(String(text||""))}
        catch(_error){
            const field=document.createElement("textarea");field.value=String(text||"");
            document.body.appendChild(field);field.select();document.execCommand("copy");field.remove();
        }
    }
    function handleChatAction(event){
        const target=event.target.closest("button");if(!target)return;
        if(target.dataset.openChat){openChat(target.dataset.openChat);return}
        if(target.dataset.deleteChat){
            const id=target.dataset.deleteChat;
            if(window.confirm("هل تريد حذف هذه المحادثة من هذا الجهاز؟"))deleteChat(id);
            return;
        }
        if(target.dataset.copyCode!==undefined){copyText(target.dataset.copyCode);showToast("تم نسخ الكود.");return}
        const action=target.dataset.action,message=target.closest(".message");
        if(action==="copy-message"){copyText(target.dataset.copyText||"");showToast("تم نسخ الرد.")}
        else if(action==="open-image"&&message){const item=findMessage(message.dataset.messageId);if(item?.imageUrl)openImage(item.imageUrl)}
        else if(action==="download-image"&&message){const item=findMessage(message.dataset.messageId);if(item?.imageUrl)void downloadImage(item.imageUrl)}
        else if(action==="share-image"&&message){const item=findMessage(message.dataset.messageId);if(item?.imageUrl)void shareImage(item.imageUrl)}
    }
    function handleWelcomeAction(event){
        const button=event.target.closest("[data-suggestion-mode]");if(!button)return;
        setMode(button.dataset.suggestionMode);
        if(button.dataset.action==="attach"){imageInput.click();return}
        userInput.value=button.dataset.suggestion||"";
        userInput.dispatchEvent(new Event("input",{bubbles:true}));userInput.focus();
    }

    $("menuBtn").addEventListener("click",openSidebar);
    $("closeSidebar").addEventListener("click",closeSidebar);
    backdrop.addEventListener("click",closeSidebar);
    $("newChatHeader").addEventListener("click",startNewChat);
    $("newChatSidebar").addEventListener("click",startNewChat);
    chatModeBtn.addEventListener("click",()=>setMode("chat"));
    imageModeBtn.addEventListener("click",()=>setMode("image"));
    chatForm.addEventListener("submit",event=>{event.preventDefault();void sendMessage()});
    chatContainer.addEventListener("click",handleChatAction);
    chatContainer.addEventListener("click",handleWelcomeAction);
    chatHistory.addEventListener("click",handleChatAction);
    attachImageButton.addEventListener("click",()=>imageInput.click());
    imageInput.addEventListener("change",async()=>{
        const file=imageInput.files?.[0];if(!file)return;
        const supported=["image/jpeg","image/png","image/webp"].includes(file.type);
        if(!supported){clearSelectedImage();showToast("استخدم صورة بصيغة JPG أو PNG أو WEBP.");return}
        if(file.size>MAX_IMAGE_BYTES){clearSelectedImage();showToast("حجم الصورة يتجاوز 12 ميغابايت.");return}
        const preview=await createImagePreview(file);showSelectedImage(file,preview);
    });
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
    renderHistory();renderChat();setMode("chat");
})();