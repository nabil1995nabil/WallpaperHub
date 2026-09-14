// =================================
// WallpaperHub AI Control JS
// =================================


const scanWebsite =
document.getElementById(
    "scanWebsite"
);


const aiReport =
document.getElementById(
    "aiReport"
);



const siteStatus =
document.getElementById(
    "siteStatus"
);





if(scanWebsite){



scanWebsite.onclick = async()=>{


aiReport.innerHTML =
`
⏳ جاري تحليل الموقع...
`;



let report = [];



try{


const response =
await fetch(
"/api/wallpapers"
);



if(response.ok){


const data =
await response.json();



report.push(
`
✅ API يعمل

📸 عدد الخلفيات:
${data.length}
`
);



siteStatus.innerHTML =
`
🟢 الموقع يعمل بشكل طبيعي
`;



}else{


report.push(
"⚠️ API لا يستجيب"
);



siteStatus.innerHTML =
`
🔴 يوجد خلل في API
`;

}


}



catch(error){


report.push(
`
❌ فشل الاتصال بالسيرفر
<br>
${error.message}
`
);



siteStatus.innerHTML =
`
🔴 خطأ في الاتصال
`;



}




aiReport.innerHTML =

`
<h3>
نتيجة التحليل 🤖
</h3>

${report.map(
item=>
`
<div>
${item}
</div>
`
).join("")}

`;



};



}