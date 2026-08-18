// =================================
// WallpaperHub API Developer
// =================================


import { auth } from "./firebase.js";

import {
onAuthStateChanged
}
from
"https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";



const form =
document.getElementById(
"createTokenForm"
);



const tokensList =
document.getElementById(
"tokensList"
);



let currentUser = null;





// ================================
// مراقبة تسجيل الدخول
// ================================


onAuthStateChanged(
auth,
(user)=>{


currentUser = user;



if(user){

loadTokens();


}else{


tokensList.innerHTML = `

<p>
يجب تسجيل الدخول لإنشاء API Token
</p>

`;

}


});






// ================================
// تحميل Tokens
// ================================


async function loadTokens(){


try{


const response =
await fetch(
"/api/tokens/" + currentUser.uid
);



const tokens =
await response.json();



renderTokens(tokens);



}catch(error){


console.log(
"Load Tokens Error",
error
);


}



}







// ================================
// إنشاء Token
// ================================


if(form){


form.addEventListener(
"submit",
async(e)=>{


e.preventDefault();



if(!currentUser){

alert(
"سجل الدخول أولاً"
);

return;

}




const appName =
document
.getElementById("appName")
.value
.trim();



const appDomain =
document
.getElementById("appDomain")
.value
.trim();






const response =
await fetch(
"/api/tokens/create",
{


method:"POST",


headers:{

"Content-Type":
"application/json"

},


body:JSON.stringify({

userId:
currentUser.uid,


appName,

domain:
appDomain


})


}

);




const data =
await response.json();



if(data.success){


form.reset();


loadTokens();


alert(
"تم إنشاء Token بنجاح"
);


}



});

}





// ================================
// عرض Tokens
// ================================


function renderTokens(tokens){


tokensList.innerHTML = "";



if(tokens.length===0){


tokensList.innerHTML = `

<p>
لا يوجد Token حاليا
</p>

`;

return;


}





tokens.forEach(token=>{



const item =
document.createElement(
"div"
);



item.className =
"token-item";



item.innerHTML = `


<div class="token-meta">


<div>


<div class="token-name">

${token.appName}

</div>


<div class="token-domain">

${token.domain}

•
${token.limit}
طلب / يوم

</div>


</div>


<span class="badge badge-active">

نشط

</span>


</div>




<div class="token-value-box">


<code>

${token.token}

</code>



<button class="btn-action copy">

نسخ

</button>



<button class="btn-action btn-delete delete">

حذف

</button>



</div>

`;





item
.querySelector(".copy")
.onclick = ()=>{


navigator.clipboard.writeText(
token.token
);


alert(
"تم نسخ Token"
);


};





item
.querySelector(".delete")
.onclick = async()=>{


if(!confirm("حذف Token؟"))
return;



await fetch(

"/api/tokens/" + token.id,

{

method:"DELETE"

}

);



loadTokens();


};





tokensList.appendChild(item);



});



}