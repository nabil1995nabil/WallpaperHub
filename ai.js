

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

function addMessage(text, sender){



function formatMessage(text){

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

<span>${lang||"Code"}</span>


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




function escapeHtml(text){

return text

.replace(/&/g,"&amp;")

.replace(/</g,"&lt;")

.replace(/>/g,"&gt;");

}




window.copyCode=function(id){


const code =
document.getElementById(id)
.innerText;


navigator.clipboard.writeText(code);


};





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



chatContainer.scrollTop =
chatContainer.scrollHeight;



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


<span>
يفكر...
</span>


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





if(typing.parentElement){

typing.parentElement.remove();

}





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