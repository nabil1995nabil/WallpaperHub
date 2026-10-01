// ===============================
// Elements
// ===============================

const chatContainer =
document.getElementById("chatContainer");


const userInput =
document.getElementById("userInput");


const sendBtn =
document.getElementById("sendBtn");


const imageBtn =
document.getElementById("imageBtn");


const imageInput =
document.getElementById("imageInput");



let selectedImage = null;


// ===============================
// Sidebar + Chat History
// ===============================


const menuBtn =
document.getElementById("menuBtn");


const sidebar =
document.getElementById("sidebar");


const closeSidebar =
document.getElementById("closeSidebar");


const newChat =
document.getElementById("newChat");


const chatHistory =
document.getElementById("chatHistory");


// ===============================
// Sidebar Open / Close
// ===============================

if(menuBtn){
    menuBtn.onclick = () => {
        sidebar.classList.add("active");
    };
}

if(closeSidebar){
    closeSidebar.onclick = () => {
        sidebar.classList.remove("active");
    };
}

// إغلاق السايدبار عند الضغط خارجه
document.addEventListener("click", (e) => {
    if(
        sidebar &&
        sidebar.classList.contains("active") &&
        !sidebar.contains(e.target) &&
        e.target !== menuBtn &&
        !menuBtn.contains(e.target)
    ){
        sidebar.classList.remove("active");
    }
});



// ===============================
// AI Engine
// ===============================
// The visible UI intentionally has no provider/model branding.
// Text conversations continue through the existing /api/chat endpoint.
// ===============================

const currentModel = "gemini";

// ===============================
// Save Chats
// ===============================


let chats = [];



try{


    chats =
    JSON.parse(
        localStorage.getItem(
            "wallpaperChats"
        )
    ) || [];



}catch(error){


    chats=[];


    console.error(
        "Chat Load Error:",
        error
    );


}






let currentChat = null;






function saveChats(){


    localStorage.setItem(

        "wallpaperChats",

        JSON.stringify(chats)

    );


}








// ===============================
// Create New Chat
// ===============================


function createNewChat(){



    currentChat = {


        id:Date.now(),


        title:"محادثة جديدة",


        messages:[]


    };




    chats.unshift(
        currentChat
    );



    saveChats();


    renderHistory();




    if(chatContainer){


        chatContainer.innerHTML="";


    }





    if(sidebar){


        sidebar.classList.remove(
            "active"
        );


    }



}








if(newChat){


    newChat.onclick =
    createNewChat;


}









// ===============================
// Render History
// ===============================

function renderHistory(){
    if(!chatHistory) return;
    chatHistory.innerHTML="";

    chats.forEach(chat=>{
        const item = document.createElement("div");
        item.className = "history-item";
        item.innerHTML = `<span>${chat.title}</span>`;

        item.onclick = (e)=>{
            // إذا كان الضغط على الفقاعة أو أزرارها، يتم التجاهل كي لا تفتح المحادثة أثناء الحذف
            if (e.target.closest('.delete-popover')) return;
            loadChat(chat.id);
        };

        // ربط الضغط المطول بالـ Item
        bindLongPressDelete(item, chat.id);

        chatHistory.appendChild(item);
    });
}

// ===============================
// Load Chat
// ===============================


function loadChat(id){



    const chat =
    chats.find(
        c=>c.id===id
    );



    if(!chat)
    return;




    currentChat =
    chat;




    if(chatContainer){


        chatContainer.innerHTML="";


    }





    chat.messages.forEach(msg=>{



        addMessage(

            msg.text,

            msg.sender,

            false

        );



    });





    if(sidebar){


        sidebar.classList.remove(
            "active"
        );


    }



}







// ===============================
// Save Message
// ===============================


function saveMessage(
text,
sender
){



    if(!currentChat){


        createNewChat();


    }





    currentChat.messages.push({


        text:text,


        sender:sender



    });







    if(
        currentChat.title==="محادثة جديدة"
        &&
        sender==="user"
    ){



        currentChat.title =
        text.substring(
            0,
            25
        );



    }






    saveChats();


    renderHistory();



}






// تشغيل التاريخ

renderHistory();

// ===============================
// Image Picker
// ===============================


if(imageBtn && imageInput){


    imageBtn.onclick = ()=>{


        imageInput.click();


    };




    imageInput.onchange = ()=>{



        const file =
        imageInput.files[0];



        if(!file)
        return;




        if(!file.type.startsWith("image/")){


            alert(
                "اختر صورة فقط"
            );


            return;


        }





        selectedImage = file;



        console.log(
            "Image selected:",
            file.name
        );



    };



}








// ===============================
// Add Message
// ===============================


function addMessage(
text,
sender,
save=true
){





function formatMessage(text){

    const imageRegex = /(https?:\/\/[^\s<>"']+)/i;
    const match = String(text || "").match(imageRegex);

    if(match){

        const imageUrl = match[0].replace(/[),.]+$/,"");
        const cleanText = String(text || "").replace(match[0],"").trim();

        const safeUrl = encodeURI(imageUrl);

        return `
            ${cleanText ? `<div class="ai-text">${escapeHtml(cleanText)}</div>` : ""}

            <div class="ai-image-card" data-image-url="${escapeHtml(safeUrl)}">

                <div class="ai-image-media">
                    <img
                        src="${safeUrl}"
                        loading="lazy"
                        decoding="async"
                        alt="صورة مولدة"
                        onclick="openImage(this.src)"
                        onerror="this.closest('.ai-image-card').classList.add('image-error')"
                    >

                    <div class="ai-image-overlay">
                        <button
                            class="image-action"
                            type="button"
                            title="فتح الصورة"
                            onclick="event.stopPropagation();openImage(this.closest('.ai-image-card').dataset.imageUrl)">
                            <span class="material-icons">fullscreen</span>
                        </button>

                        <button
                            class="image-action"
                            type="button"
                            title="تحميل"
                            onclick="event.stopPropagation();downloadImage(this.closest('.ai-image-card').dataset.imageUrl)">
                            <span class="material-icons">download</span>
                        </button>

                        <button
                            class="image-action"
                            type="button"
                            title="مشاركة"
                            onclick="event.stopPropagation();shareImage(this.closest('.ai-image-card').dataset.imageUrl)">
                            <span class="material-icons">share</span>
                        </button>
                    </div>
                </div>

                <div class="ai-image-caption">
                    صورة جاهزة — اضغط عليها لعرضها بالحجم الكامل
                </div>

            </div>
        `;
    }

    return String(text || "").replace(
        /```(\w+)?\n([\s\S]*?)```/g,
        (_,lang="",code)=>{
            const id = "code" + Math.random().toString(36).slice(2);

            return `
                <div class="code-block">
                    <div class="code-header">
                        <span>${escapeHtml(lang || "Code")}</span>
                        <button class="copy-btn" onclick="copyCode('${id}')">نسخ</button>
                    </div>
                    <pre><code id="${id}">${escapeHtml(code)}</code></pre>
                </div>
            `;
        }
    ).replace(/\n/g,"<br>");
}



// إنشاء الرسالة


const msg =
document.createElement(
"div"
);




msg.className =
"message "+sender;





const bubble =
document.createElement(
"div"
);




bubble.className =
"bubble";




bubble.innerHTML =
formatMessage(text);





msg.appendChild(
bubble
);






if(chatContainer){


    chatContainer.appendChild(
        msg
    );


}







// حفظ


if(save){


    saveMessage(
        text,
        sender
    );


}








// Scroll


setTimeout(()=>{


if(chatContainer){


chatContainer.scrollTop =
chatContainer.scrollHeight;



}



},100);



}










// ===============================
// Escape HTML
// ===============================


function escapeHtml(text){


return text

.replace(
/&/g,
"&amp;"
)

.replace(
/</g,
"&lt;"
)

.replace(
/>/g,
"&gt;"
);


}










// ===============================
// Copy Code
// ===============================


window.copyCode=function(id){



const code =
document.getElementById(id);




if(code){



navigator.clipboard.writeText(
code.innerText
);



}



};










// ===============================
// Image Viewer - Pro
// ===============================

window.openImage = function(src){

    if(!src) return;

    const viewer = document.createElement("div");
    viewer.className = "image-viewer";

    viewer.innerHTML = `
        <button class="viewer-close" type="button" aria-label="إغلاق">
            <span class="material-icons">close</span>
        </button>

        <button class="viewer-download" type="button" aria-label="تحميل">
            <span class="material-icons">download</span>
        </button>

        <img src="${escapeHtml(src)}" alt="عرض الصورة">

    `;

    const close = () => viewer.remove();

    viewer.querySelector(".viewer-close").onclick = (e) => {
        e.stopPropagation();
        close();
    };

    viewer.querySelector(".viewer-download").onclick = (e) => {
        e.stopPropagation();
        downloadImage(src);
    };

    viewer.querySelector("img").onclick = (e) => e.stopPropagation();

    viewer.onclick = close;

    document.body.appendChild(viewer);
};

window.downloadImage = async function(src){

    try{
        const response = await fetch(src);
        const blob = await response.blob();

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.href = url;
        a.download = "WallpaperHub-image.jpg";
        document.body.appendChild(a);
        a.click();
        a.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);

    }catch(error){
        window.open(src,"_blank","noopener,noreferrer");
    }
};

window.shareImage = async function(src){

    try{
        if(navigator.share){
            await navigator.share({
                title:"WallpaperHub",
                text:"صورة من WallpaperHub",
                url:src
            });
        }else if(navigator.clipboard){
            await navigator.clipboard.writeText(src);
            alert("تم نسخ رابط الصورة");
        }
    }catch(error){
        console.log("Share cancelled");
    }
};

// ===============================
// Thinking Effect
// ===============================


function typingEffect(){


const msg =
document.createElement("div");



msg.className =
"message ai";



const bubble =
document.createElement("div");



bubble.className =
"bubble";



bubble.innerHTML = `


<div class="ai-thinking">


<div class="thinking-dots">

<span></span>

<span></span>

<span></span>


</div>


</div>


`;



msg.appendChild(
bubble
);




if(chatContainer){


chatContainer.appendChild(
msg
);


}




return bubble;



}






// ===============================
// Send Message
// ===============================


async function sendMessage(){



const text =
userInput.value.trim();





if(
text === "" &&
!selectedImage
)
return;





if(text){


addMessage(
text,
"user"
);


}





const welcome =
document.querySelector(
".welcome-screen"
);



if(welcome){


welcome.style.display =
"none";


}





userInput.value="";





const typing =
typingEffect();






// ===============================
// Image Request
// ===============================

const imageWords = [

    "خلفية",
    "صورة",
    "صور",
    "ارسم",
    "رسم",
    "اصنع",
    "انشئ",
    "أنشئ",
    "صمم",
    "تصميم",
    "ولد",
    "توليد",
    "generate",
    "create",
    "draw",
    "make",
    "wallpaper",
    "background"

];


const isImageRequest =
imageWords.some(word =>

    text
    .toLowerCase()
    .includes(
        word.toLowerCase()
    )

);


// ===============================
// توليد الصور — Pollinations فقط
// (Gemini مخصص للمحادثة النصية)
// ===============================

if(isImageRequest){

    try{

        let imageUrl = null;

        // 🌍 الخطوة 1: ترجمة الوصف للإنجليزية
        // (Pollinations يفهم الإنجليزية أفضل بكثير)
        let englishPrompt = text;

        try{
            const translateRes = await fetch(
                "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q="
                + encodeURIComponent(text)
            );
            const translateData = await translateRes.json();
            if(translateData && translateData[0] && translateData[0][0]){
                englishPrompt = translateData[0][0][0];
            }
        }catch(translateError){
            console.warn("Translate failed, using original text");
        }

        console.log("🌍 Translated prompt:", englishPrompt);

        // ✨ الخطوة 2: تحسين الوصف + توليد الصورة
        const enhanced =
            englishPrompt
            + ", wallpaper, highly detailed, 8k, masterpiece";

        imageUrl =
            "https://image.pollinations.ai/prompt/"
            + encodeURIComponent(enhanced)
            + "?width=1080&height=1920&nologo=true&seed="
            + Math.floor(Math.random() * 100000);

        removeTyping(typing);

        addMessage(
            "🖼️ تم إنشاء الصورة بنجاح",
            "ai"
        );

        addMessage(imageUrl, "ai");

        selectedImage = null;
        if(imageInput){
            imageInput.value = "";
        }
        return;

    }catch(error){
        console.error(
            "Image Generation Error:",
            error
        );
        removeTyping(typing);
        addMessage(
            "⚠️ حدث خطأ أثناء إنشاء الصورة",
            "ai"
        );
        return;
    }
}



// ===============================
// Gemini Chat
// ===============================



let imageData=null;




if(selectedImage){


imageData =
await imageToBase64(
selectedImage
);


}



const reply =
await askGemini(

text,

imageData,

selectedImage

);





removeTyping(
typing
);





addMessage(
reply,
"ai"
);





selectedImage=null;



if(imageInput){


imageInput.value="";


}



}







// ===============================
// Remove Thinking
// ===============================


function removeTyping(typing){



if(typing){



const message =
typing.closest(
".message"
);




if(message){


message.remove();


}



}



}

// ===============================
// Buttons
// ===============================


if(sendBtn){


sendBtn.onclick =
sendMessage;


}




if(userInput){


userInput.addEventListener(
"keydown",
(e)=>{


if(e.key==="Enter"){


sendMessage();


}



});


}








// ===============================
// Suggestions
// ===============================


document
.querySelectorAll(".chip")
.forEach(chip=>{


chip.onclick=()=>{


userInput.value =
chip.innerText;



sendMessage();



};



});









// ===============================
// Convert Image Base64
// ===============================


function imageToBase64(file){


return new Promise(
(resolve,reject)=>{


const reader =
new FileReader();




reader.onload=()=>{


resolve(

reader.result
.split(",")[1]

);


};





reader.onerror =
reject;




reader.readAsDataURL(
file
);



});


}









// ===============================
// Gemini AI
// ===============================


async function askGemini(
message,
imageData=null,
imageFile=null
){



try{



const userLocale =
navigator.language;



const userTimezone =
Intl.DateTimeFormat()
.resolvedOptions()
.timeZone;






const response =
await fetch(
"/api/chat",
{


method:"POST",


headers:{


"Content-Type":
"application/json"


},



body:JSON.stringify({


message:message,



imageData:imageData,



mimeType:

imageFile ?

imageFile.type :

null,



locale:userLocale,



timezone:userTimezone



})



}

);








const data =
await response.json();







if(!response.ok){



return (

data.message ||

"⚠️ وقع مشكل في السيرفر"

);



}






return (

data.reply ||

"⚠️ ماقدرتش نجيب جواب"

);



}catch(error){



console.error(
"Gemini Error:",
error
);



return "⚠️ وقع خطأ مؤقت";



}



}










// ===============================
// Welcome Time
// ===============================


function updateWelcome(){



const hour =
new Date()
.getHours();




let text;





if(hour >=5 && hour <12){


text =
"صباح الخير";


}

else if(hour >=12 && hour <18){


text =
"نهارك سعيد";


}

else{


text =
"مساء الخير";


}







const el =
document.getElementById(
"welcomeText"
);





if(el){


el.innerHTML =
text;


}





}

// ===============================
// Fixed Delete Chat Popover (Long-Press)
// ===============================

function bindLongPressDelete(itemElement, chatId) {
    let pressTimer = null;

    const startPress = (e) => {
        if (e.target.closest('.delete-popover')) return;

        clearTimeout(pressTimer);
        pressTimer = setTimeout(() => {
            showDeletePopover(itemElement, chatId);
        }, 400); 
    };

    const cancelPress = () => {
        clearTimeout(pressTimer);
    };

    itemElement.addEventListener("touchstart", startPress, { passive: true });
    itemElement.addEventListener("touchend", cancelPress);
    itemElement.addEventListener("touchmove", cancelPress);
    itemElement.addEventListener("mousedown", startPress);
    itemElement.addEventListener("mouseup", cancelPress);
    itemElement.addEventListener("mouseleave", cancelPress);
}

function showDeletePopover(itemElement, chatId) {
    document.querySelectorAll(".delete-popover").forEach(el => el.remove());

    const popover = document.createElement("div");
    popover.className = "delete-popover";
    popover.innerHTML = `
        <button class="delete-popover-btn" type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events: none;">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span style="pointer-events: none;">حذف</span>
        </button>
    `;

    itemElement.appendChild(popover);

    requestAnimationFrame(() => {
        popover.classList.add("active");
    });

    const deleteBtn = popover.querySelector(".delete-popover-btn");

    // منع تداخل الأحداث عند الضغط على زر الحذف
    const executeDelete = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        deleteChat(chatId, itemElement);
    };

    deleteBtn.addEventListener("click", executeDelete);
    deleteBtn.addEventListener("touchend", executeDelete);

    setTimeout(() => {
        const closeOnClickOutside = (e) => {
            if (!popover.contains(e.target)) {
                popover.remove();
                document.removeEventListener("click", closeOnClickOutside);
                document.removeEventListener("touchstart", closeOnClickOutside);
            }
        };
        document.addEventListener("click", closeOnClickOutside);
        document.addEventListener("touchstart", closeOnClickOutside);
    }, 100);
}

function deleteChat(chatId, itemElement) {
    itemElement.style.transition = "all 0.3s ease";
    itemElement.style.opacity = "0";
    itemElement.style.transform = "translateX(40px)";

    setTimeout(() => {
        // حذف مع مطابقة النصوص لضمان عدم حدوث خطأ في نوع البيانات
        chats = chats.filter(c => String(c.id) !== String(chatId));
        saveChats();

        if (currentChat && String(currentChat.id) === String(chatId)) {
            currentChat = null;
            if (chatContainer) chatContainer.innerHTML = "";
        }

        renderHistory();
    }, 300);
}


// ===============================
// Start
// ===============================


document.addEventListener(
"DOMContentLoaded",
()=>{


updateWelcome();


});