// =================================
// WallpaperHub Admin Notice Creator
// Connected To Server
// =================================


document.addEventListener(
"DOMContentLoaded",
()=>{


const form =
document.getElementById(
"create-ad-form"
);


const adsContainer =
document.getElementById(
"ads-container"
);


const statTotal =
document.getElementById(
"stat-total"
);


const fileInput =
document.getElementById(
"ad-file"
);


const fileNamePreview =
document.getElementById(
"file-preview-name"
);



let uploadedImageBase64 = "";

let editingAnnouncementId = null;





// ================================
// Image Upload
// ================================


if(fileInput){


fileInput.addEventListener(
"change",
(e)=>{


const file =
e.target.files[0];


if(file){


fileNamePreview.textContent =
"تم اختيار: " + file.name;



const reader =
new FileReader();



reader.onload =
(event)=>{


uploadedImageBase64 =
event.target.result;


};



reader.readAsDataURL(file);



}else{


uploadedImageBase64="";

fileNamePreview.textContent="";


}



});


}







// ================================
// Counter
// ================================


function updateCounter(){


const count =
adsContainer.querySelectorAll(
".ad-item"
).length;



if(statTotal){

statTotal.textContent =
count;

}


}









// ================================
// Load Ads
// ================================


function loadAds(){


fetch("/api/admin/announcements")

.then(res=>res.json())

.then(data=>{


adsContainer.innerHTML="";



data.forEach(ad=>{


createAdCard(ad);


});



updateCounter();


})

.catch(error=>{


console.log(
"LOAD ADS ERROR:",
error
);


});


}









// ================================
// Create Card
// ================================


function createAdCard(ad){


const adItem =
document.createElement(
"div"
);



adItem.className =
"ad-item";



adItem.innerHTML = `


<img
src="${ad.image || 'https://picsum.photos/600/300'}"
class="ad-thumb"
>


<div class="ad-details">


<h4>
${ad.title}
</h4>


<p>
${ad.content}
</p>


<span class="ad-date">
${ad.date || "الآن"}
</span>


</div>



<div class="ad-actions">


<button 
class="action-btn edit">
✏️
</button>



<button 
class="action-btn delete">
🗑️
</button>


</div>

`;




const editBtn =
adItem.querySelector(
".edit"
);



editBtn.onclick =
()=>{

editAdvertisement(ad);

};




const deleteBtn =
adItem.querySelector(
".delete"
);



deleteBtn.onclick =
()=>{


deleteAdvertisement(
ad.id,
adItem
);


};




adsContainer.prepend(
adItem
);


}









// ================================
// Delete Advertisement
// ================================


function deleteAdvertisement(id,card){


if(!confirm(
"هل تريد حذف الإعلان؟"
)) return;



fetch(
`/api/admin/announcements/${id}`,
{

method:"DELETE"

}

)


.then(res=>res.json())


.then(data=>{


if(data.success){


card.remove();


updateCounter();


}else{


alert(
"فشل الحذف"
);


}


})


.catch(error=>{


console.log(
error
);


});


}









// ================================
// Submit Create / Update
// ================================


if(form){


form.addEventListener(
"submit",
(e)=>{


e.preventDefault();



const title =
document.getElementById(
"ad-title"
).value;



const category =
document.getElementById(
"ad-category"
).value;



const content =
document.getElementById(
"ad-content"
).value;



const urlImage =
document.getElementById(
"ad-image"
).value;



const image =
uploadedImageBase64 ||
urlImage ||
"https://picsum.photos/600/300";





let url =
"/api/admin/announcements";



let method =
"POST";





if(editingAnnouncementId){


url =
"/api/admin/announcements/"
+
editingAnnouncementId;



method =
"PUT";


}




fetch(
url,
{


method:method,


headers:{

"Content-Type":
"application/json"

},


body:JSON.stringify({

title,

category,

content,

image

})


}

)



.then(res=>res.json())


.then(data=>{


if(data.success){



alert(
editingAnnouncementId
?
"تم تعديل الإعلان"
:
"تم نشر الإعلان"
);



editingAnnouncementId=null;



document.querySelector(
".btn-submit"
).textContent =
"🚀 نشر الإعلان الآن";



form.reset();


uploadedImageBase64="";


fileNamePreview.textContent="";


loadAds();



}else{


alert(
"حدث خطأ"
);


}


})



.catch(error=>{


console.log(
"CREATE ERROR:",
error
);


});



});


}

// ================================
// Edit Advertisement
// ================================


function editAdvertisement(ad){


document.getElementById(
"ad-title"
).value =
ad.title;



document.getElementById(
"ad-category"
).value =
ad.type;



document.getElementById(
"ad-content"
).value =
ad.content;



document.getElementById(
"ad-image"
).value =
ad.image || "";

editingAnnouncementId =
ad.id;



document.querySelector(
".btn-submit"
).textContent =
"💾 حفظ التعديل";


}

// Start

loadAds();



});