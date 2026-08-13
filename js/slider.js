// =======================================
// WallpaperHub Gaming 3D Slider
// Independent Component
// Image + Video Support
// =======================================


console.log("Gaming Slider Loaded");



let swiperInstance = null;



// =======================================
// Image URL Helper
// =======================================


function getImageUrl(url){


    if(!url){

        return "assets/logo/no-image.png";

    }



    if(
        url.startsWith("http://") ||
        url.startsWith("https://")
    ){

        return url;

    }



    if(url.startsWith("/")){

        return url;

    }



    if(url.startsWith("assets/")){

        return url;

    }



    return "assets/wallpapers/" + url;


}





// =======================================
// Detect Video
// =======================================


function isVideoMedia(wall){


    if(!wall)

        return false;



    if(wall.type === "video")

        return true;




    const url =

    String(wall.image || "")

    .toLowerCase();




    return [

        ".mp4",
        ".webm",
        ".mov",
        ".m3u8"

    ].some(ext =>

        url.includes(ext)

    );


}






// =======================================
// Open Wallpaper
// =======================================


function openWallpaper(id){


    if(!id)

        return;



    window.location.href =

    "wallpaper.html?id=" + id;


}








// =======================================
// Render Slider
// =======================================


function renderSlider(wallpapers){



const wrapper =

document.getElementById("sliderWrapper");




if(!wrapper)

return;




wrapper.innerHTML = "";





const sliderWallpapers =


wallpapers

.slice()

.reverse()

.slice(0,10);





if(!sliderWallpapers.length)

return;








sliderWallpapers.forEach(wall=>{


const slide =

document.createElement("div");





slide.className =

"swiper-slide slide";





slide.dataset.wallpaperId =

wall.id;






let mediaHTML = "";





// ======================
// Video
// ======================


if(isVideoMedia(wall)){



mediaHTML = `


<video

src="${getImageUrl(wall.image)}"

muted

loop

autoplay

playsinline

preload="metadata"

>

</video>


`;




}else{



// ======================
// Image
// ======================


mediaHTML = `


<img

src="${getImageUrl(

wall.thumbnail || wall.image

)}"


alt="${wall.title || "Wallpaper"}"


loading="lazy"


onerror="this.src='assets/logo/no-image.png'"

>


`;



}





slide.innerHTML = mediaHTML;





slide.onclick = ()=>{


openWallpaper(
wall.id
);


};





wrapper.appendChild(slide);



});








// حذف Swiper القديم


if(swiperInstance){


swiperInstance.destroy(
true,
true
);


}






// =======================================
// Gaming 3D Swiper
// =======================================


swiperInstance = new Swiper(

".mySwiper",

{


effect:"coverflow",



grabCursor:true,



centeredSlides:true,



slidesPerView:"auto",



loop:

sliderWallpapers.length > 2,





coverflowEffect:{


rotate:35,


stretch:0,


depth:220,


modifier:1.2,


slideShadows:true


},





autoplay:{


delay:3000,


disableOnInteraction:false


},





pagination:{


el:".swiper-pagination",


clickable:true


}



});



}








// =======================================
// Load Slider Data
// =======================================


async function loadSlider(){



try{



const response =

await fetch("/api/wallpapers");





if(!response.ok){

throw new Error(
"Wallpaper API Error"
);

}





const wallpapers =

await response.json();





renderSlider(
wallpapers
);





}catch(error){



console.error(

"Slider Error:",

error

);



}



}







// =======================================
// Start
// =======================================


document.addEventListener(

"DOMContentLoaded",

()=>{


loadSlider();



});







// Export

window.renderSlider =

renderSlider;