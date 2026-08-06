import {
auth,
db,
collection,
addDoc,
getDocs,
query,
orderBy,
serverTimestamp
} from "./firebase.js";

import {
GEMINI_API_KEY,
GEMINI_MODEL
} from "./config.js";

const chatContainer = document.getElementById("chatContainer");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

function addMessage(text, sender){

function formatMessage(text){

return text.replace(
/```(\w+)?\n([\s\S]*?)```/g,
(_,lang="",code)=>{

const id="code"+Math.random().toString(36).slice(2);

return `
<div class="code-block">

<div class="code-header">

<span>${lang||"Code"}</span>

<button class="copy-btn" onclick="copyCode('${id}')">
نسخ
</button>

</div>

<pre><code id="${id}">${escapeHtml(code)}</code></pre>

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

const code=document.getElementById(id).innerText;

navigator.clipboard.writeText(code);

};

const msg=document.createElement("div");
msg.className="message "+sender;

const bubble=document.createElement("div");
bubble.className="bubble";

bubble.innerHTML = formatMessage(text);

msg.appendChild(bubble);

chatContainer.appendChild(msg);

chatContainer.scrollTop=chatContainer.scrollHeight;

}

function typingEffect(){

    const msg = document.createElement("div");
    msg.className = "message ai";

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.id = "typingBubble";

    bubble.innerHTML = `
        <div class="ai-thinking">
            <canvas class="thinking-ai-canvas" width="42" height="42"></canvas>
            <span>يفكر...</span>
        </div>
    `;

    msg.appendChild(bubble);

    chatContainer.appendChild(msg);

    const thinkingCanvas = bubble.querySelector(".thinking-ai-canvas");

    if (thinkingCanvas && typeof window.createAILogo === "function") {
        window.createAILogo(thinkingCanvas);
    }

    return bubble;
}

async function sendMessage(){

const text = userInput.value.trim();

if(text==="") return;

addMessage(text,"user");
//await saveMessage("user",text);

const welcome=document.getElementById("welcomeScreen");

if(welcome){

welcome.style.display="none";

}

userInput.value="";

const typing = typingEffect();

const reply = await askGemini(text);

typing.parentElement.remove();

addMessage(reply,"ai");
//await saveMessage("ai",reply);

}

sendBtn.onclick=sendMessage;

userInput.addEventListener("keydown",e=>{

if(e.key==="Enter"){

sendMessage();

}

});

document.querySelectorAll(".chip").forEach(chip=>{

chip.onclick=()=>{

userInput.value=chip.innerText;

sendMessage();

};

});

async function askGemini(message){

try{

const response = await fetch(
`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({

contents:[
{
parts:[
{
text:`
أنت WallpaperHub AI.

اسمك WallpaperHub AI.

تجيب باللغة العربية.

إذا سألك المستخدم عن الخلفيات أو التصميم أو البرمجة فأعطه أفضل إجابة.

رسالة المستخدم:

${message}
`
}
]
}
]

})

});

const data = await response.json();

console.log("HTTP:", response.status);
console.log("GPT Response:", data);

if (!response.ok) {
    return "❌ HTTP " + response.status + "\n" + JSON.stringify(data, null, 2);
}

if (!data.candidates || !data.candidates.length) {
    return "❌ لا يوجد رد من GPT";
}

return data.candidates[0].content.parts[0].text;

}catch(e){

console.error("GPT Error:", e);

return "❌ " + e.message;

}

}