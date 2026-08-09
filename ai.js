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



// فتح القائمة

if(menuBtn && sidebar){

menuBtn.onclick = ()=>{

sidebar.classList.add("active");

};

}



// إغلاق القائمة

if(closeSidebar && sidebar){

closeSidebar.onclick = ()=>{

sidebar.classList.remove("active");

};

}




// ===============================
// Save Chats
// ===============================


let chats =
JSON.parse(
localStorage.getItem("wallpaperChats")
) || [];



let currentChat = null;



function saveChats(){

localStorage.setItem(
"wallpaperChats",
JSON.stringify(chats)
);

}




// إنشاء محادثة جديدة

function createNewChat(){


currentChat = {

id:Date.now(),

title:"محادثة جديدة",

messages:[]

};



chats.unshift(currentChat);


saveChats();


renderHistory();


chatContainer.innerHTML="";


sidebar.classList.remove("active");


}




if(newChat){

newChat.onclick =
createNewChat;

}





// ===============================
// عرض القائمة
// ===============================


function renderHistory(){


if(!chatHistory)
return;



chatHistory.innerHTML="";



chats.forEach(chat=>{


const item =
document.createElement("div");



item.className="history-item";


item.innerHTML=`

<span>
${chat.title}
</span>

`;



item.onclick=()=>{


loadChat(chat.id);


};



chatHistory.appendChild(item);



});


}




// ===============================
// تحميل محادثة
// ===============================


function loadChat(id){


const chat =
chats.find(
c=>c.id===id
);



if(!chat)
return;



currentChat = chat;



chatContainer.innerHTML="";



chat.messages.forEach(msg=>{


addMessage(
msg.text,
msg.sender,
false
);


});



sidebar.classList.remove("active");

}




// ===============================
// حفظ الرسائل
// ===============================


function saveMessage(text,sender){


if(!currentChat){


createNewChat();


}



currentChat.messages.push({

text:text,

sender:sender

});



if(
currentChat.title==="محادثة جديدة"
&& sender==="user"
){


currentChat.title =
text.substring(0,25);


}



saveChats();


renderHistory();


}




// تشغيل أول مرة

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

alert("اختر صورة فقط");

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

function addMessage(text,sender,save=true){



function formatMessage(text){



// ===============================
// Image Detection
// ===============================

const imageRegex =
/(https?:\/\/[^\s]+)/i;



if(imageRegex.test(text)){


const imageUrl =
text.match(imageRegex)[0];



text =
text.replace(imageUrl,"");



return `


<div class="ai-text">

${text}

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





// ===============================
// Escape HTML
// ===============================


function escapeHtml(text){


return text

.replace(/&/g,"&amp;")

.replace(/</g,"&lt;")

.replace(/>/g,"&gt;");


}





// ===============================
// Copy Code
// ===============================


window.copyCode=function(id){


const code =
document.getElementById(id)
.innerText;



navigator.clipboard.writeText(code);


};

// ===============================
// Image Viewer
// ===============================


window.openImage=function(src){


const viewer =
document.createElement("div");



viewer.className =
"image-viewer";



viewer.innerHTML = `

<img src="${src}">

`;



viewer.onclick=()=>{

viewer.remove();

};



document.body.appendChild(viewer);


};





// ===============================
// Create Message
// ===============================


const msg =
document.createElement("div");



msg.className =
"message "+sender;




const bubble =
document.createElement("div");



bubble.className =
"bubble";



bubble.innerHTML =
formatMessage(text);




msg.appendChild(bubble);



chatContainer.appendChild(msg);




// ===============================
// Save
// ===============================


if(save){

saveMessage(text,sender);

}





// ===============================
// Auto Scroll
// ===============================


setTimeout(()=>{


chatContainer.scrollTop =
chatContainer.scrollHeight;



},100);



}

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

<canvas 
class="thinking-ai-canvas"
width="42"
height="42">
</canvas>


<div class="thinking-dots">
    <span></span>
    <span></span>
    <span></span>
</div>


</div>

`;



msg.appendChild(bubble);


chatContainer.appendChild(msg);



const canvas =
bubble.querySelector(
".thinking-ai-canvas"
);



if(canvas &&
typeof window.createAILogo==="function"){

window.createAILogo(canvas);

}



return bubble;


}





// ===============================
// Send Message
// ===============================

async function sendMessage(){



const text =
userInput.value.trim();



if(text==="" && !selectedImage)
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

welcome.style.display="none";

}



userInput.value="";



const typing =
typingEffect();

// ===============================
// AI Image Generation
// ===============================

if(
text.includes("خلفية") ||
text.includes("صورة") ||
text.includes("wallpaper")
){


const response =
await fetch("/api/generate-image",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

prompt:text

})

});


const data =
await response.json();


if(data.image){


const thinkingMessage =
typing.closest(".message");


if(thinkingMessage){

thinkingMessage.remove();

}


addMessage(
`![image](${data.image})`,
"ai"
);


return;

}

}

let imageData = null;



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





if(typing){

const thinkingMessage = typing.closest(".message");

if(thinkingMessage){

thinkingMessage.remove();

}

}





addMessage(
reply,
"ai"
);





selectedImage=null;

if(imageInput){
imageInput.value="";
}

return;

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


return new Promise((resolve,reject)=>{


const reader =
new FileReader();



reader.onload=()=>{


resolve(
reader.result.split(",")[1]
);


};



reader.onerror =
reject;



reader.readAsDataURL(file);



});


}







// ===============================
// WallpaperHub AI
// Text + Image
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


});





const data =
await response.json();



console.log(
"AI Server Response:",
data
);





if(!response.ok){


return "⚠️ وقع مشكل في الاتصال بالسيرفر";


}




return data.reply ||

"⚠️ ماقدرتش نجيب جواب دابا";





}catch(e){


console.error(
"AI Error:",
e
);



return "⚠️ وقع مشكل مؤقت، حاول مرة أخرى.";


}


}


// ===============================
// Welcome Time
// ===============================


function updateWelcome(){


const hour =
new Date().getHours();



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
// Start
// ===============================

document.addEventListener(
"DOMContentLoaded",
()=>{

updateWelcome();

});