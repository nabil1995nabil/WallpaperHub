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
// AI Model Selector
// ===============================


let selectedModel =
localStorage.getItem("selectedModel")
|| "gemini";



const modelBtn =
document.getElementById("modelBtn");


const modelMenu =
document.getElementById("modelMenu");



function updateModelButton(){


if(!modelBtn)
return;


let name;


if(selectedModel==="gemini"){

name="🧠 Gemini";

}

else if(selectedModel==="stable"){

name="🎨 Stable Diffusion";

}

else if(selectedModel==="unsplash"){

name="🖼️ Unsplash";

}



modelBtn.innerHTML =
name+" ▼";


}




updateModelButton();




if(modelBtn && modelMenu){


modelBtn.onclick=()=>{


modelMenu.classList.toggle(
"active"
);


};




modelMenu
.querySelectorAll("div")
.forEach(item=>{



item.onclick=()=>{


selectedModel =
item.dataset.model;



localStorage.setItem(
"selectedModel",
selectedModel
);



updateModelButton();



modelMenu.classList.remove(
"active"
);



};



});


}

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





// فتح القائمة

if(menuBtn && sidebar){


    menuBtn.onclick = ()=>{


        sidebar.classList.add(
            "active"
        );


    };


}




// إغلاق القائمة

if(closeSidebar && sidebar){


    closeSidebar.onclick = ()=>{


        sidebar.classList.remove(
            "active"
        );


    };


}





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



    if(!chatHistory)
    return;



    chatHistory.innerHTML="";





    chats.forEach(chat=>{



        const item =
        document.createElement(
            "div"
        );



        item.className =
        "history-item";



        item.innerHTML = `

        <span>

        ${chat.title}

        </span>

        `;



        item.onclick=()=>{


            loadChat(
                chat.id
            );


        };



        // ربط الضغط المطول بالحذف التكتيكي
        bindLongPressDelete(item, chat.id);



        chatHistory.appendChild(
            item
        );



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





// ===============================
// Image Detection
// ===============================


const imageRegex =
/(https?:\/\/[^\s]+)/i;




if(imageRegex.test(text)){



    const imageUrl =
    text.match(imageRegex)[0];



    const cleanText =
    text.replace(
        imageUrl,
        ""
    );



    return `


    <div class="ai-text">

        ${cleanText}

    </div>



    <div class="ai-image-card">


        <img

        src="${imageUrl}"

        loading="lazy"

        onclick="openImage(this.src)"

        >



    </div>



    `;


}








// ===============================
// Code Block
// ===============================


return text.replace(


/```(\w+)?\n([\s\S]*?)```/g,


(_,lang="",code)=>{



const id =
"code"+Math.random()
.toString(36)
.slice(2);





return `


<div class="code-block">



<div class="code-header">


<span>

${lang || "Code"}

</span>




<button class="copy-btn"

onclick="copyCode('${id}')">


نسخ


</button>



</div>





<pre>


<code id="${id}">


${escapeHtml(code)}


</code>


</pre>



</div>


`;



}



);



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
// Image Viewer
// ===============================


window.openImage=function(src){



const viewer =
document.createElement(
"div"
);




viewer.className =
"image-viewer";





viewer.innerHTML = `


<img src="${src}">


`;





viewer.onclick=()=>{


viewer.remove();



};





document.body.appendChild(
viewer
);



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

"ولد",

"اصنع",

"انشئ",

"صمم",

"generate",

"wallpaper"

];





const isImageRequest =
imageWords.some(word=>

text.toLowerCase()
.includes(
word.toLowerCase()
)

);









// ===============================
// Stable Diffusion
// ===============================


if(
isImageRequest &&
selectedModel==="stable"
){


try{


const response =
await fetch(
"/api/generate-image",
{


method:"POST",


headers:{


"Content-Type":
"application/json"


},



body:JSON.stringify({


prompt:text,


model:"stable"


})



});


const data =
await response.json();




removeTyping(
typing
);





if(data.image){


addMessage(
data.image,
"ai"
);



}else{


addMessage(
"⚠️ لم يتم إنشاء الصورة",
"ai"
);


}



return;



}catch(error){


console.error(error);



removeTyping(
typing
);



addMessage(
"⚠️ خطأ أثناء توليد الصورة",
"ai"
);



return;


}


}







// ===============================
// Unsplash / Ready Wallpapers
// ===============================


if(
isImageRequest &&
selectedModel==="unsplash"
){


try{


const response =
await fetch(
"/api/generate-image",
{


method:"POST",


headers:{


"Content-Type":
"application/json"


},


body:JSON.stringify({

prompt:text,

model:"unsplash"

})


});


const data =
await response.json();



removeTyping(
typing
);



if(data.image){


addMessage(
data.image,
"ai"
);


}else{


addMessage(
"⚠️ لم أجد خلفية",
"ai"
);


}



return;



}catch(error){


console.log(error);



removeTyping(
typing
);



addMessage(
"⚠️ خطأ في البحث عن الخلفية",
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
// Delete Chat Popover (Long-Press)
// ===============================

// دالة ربط الضغط المطول بالـ History Item
function bindLongPressDelete(itemElement, chatId) {
    let pressTimer;

    const startPress = () => {
        // إزالة أي فقاعة مفتوحة سابقاً
        document.querySelectorAll(".delete-popover").forEach(el => el.remove());

        pressTimer = setTimeout(() => {
            showDeletePopover(itemElement, chatId);
        }, 500); // إظهار الفقاعة بعد نصف ثانية ضغط
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

// إنشاء وإظهار فقاعة الحذف
function showDeletePopover(itemElement, chatId) {
    document.querySelectorAll(".delete-popover").forEach(el => el.remove());

    const popover = document.createElement("div");
    popover.className = "delete-popover";
    popover.innerHTML = `
        <button class="delete-popover-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            حذف
        </button>
    `;

    itemElement.appendChild(popover);

    requestAnimationFrame(() => {
        popover.classList.add("active");
    });

    // عند النقر على زر "حذف"
    popover.querySelector(".delete-popover-btn").onclick = (e) => {
        e.stopPropagation(); // منع فتح المحادثة أثناء الضغط على الحذف
        deleteChat(chatId, itemElement);
    };

    // إغلاق الفقاعة عند النقر في أي مكان آخر
    setTimeout(() => {
        const closeOnClickOutside = (e) => {
            if (!popover.contains(e.target)) {
                popover.remove();
                document.removeEventListener("click", closeOnClickOutside);
            }
        };
        document.addEventListener("click", closeOnClickOutside);
    }, 100);
}

// تنفيذ الحذف وتحديث القائمة
function deleteChat(chatId, itemElement) {
    // أنيميشن الاختفاء
    itemElement.style.transition = "all 0.3s ease";
    itemElement.style.opacity = "0";
    itemElement.style.transform = "translateX(40px)";

    setTimeout(() => {
        // حذف المحادثة من المصفوفة
        chats = chats.filter(c => c.id !== chatId);
        saveChats();

        // إذا كانت المحادثة المحذوفة هي المفتوحة حالياً، قم بتفريغ الشاشة
        if (currentChat && currentChat.id === chatId) {
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